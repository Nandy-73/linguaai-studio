import importlib.util
import json
import shutil
import subprocess
import tempfile
from functools import lru_cache
from pathlib import Path

import boto3
import httpx
import redis as redis_lib
from botocore.client import Config
from pymongo import MongoClient

from worker import config


# ── storage ───────────────────────────────────────────────────────────────────
@lru_cache
def s3():
    return boto3.client(
        "s3", endpoint_url=config.S3_ENDPOINT_URL,
        aws_access_key_id=config.S3_ACCESS_KEY,
        aws_secret_access_key=config.S3_SECRET_KEY,
        region_name=config.S3_REGION, config=Config(signature_version="s3v4"),
    )


def download(key: str, suffix: str = "") -> str:
    path = tempfile.mktemp(suffix=suffix or Path(key).suffix)
    s3().download_file(config.S3_BUCKET, key, path)
    return path


def upload_file(path: str, key: str, content_type: str = "application/octet-stream") -> str:
    s3().upload_file(path, config.S3_BUCKET, key,
                     ExtraArgs={"ContentType": content_type})
    return key


def upload_text(text: str, key: str, content_type: str = "text/plain") -> str:
    s3().put_object(Bucket=config.S3_BUCKET, Key=key,
                    Body=text.encode("utf-8"), ContentType=content_type)
    return key


def artifact_key(payload: dict, name: str) -> str:
    return f"artifacts/{payload['org_id']}/{payload['run_id']}/{payload['stage']}/{name}"


# ── data stores ───────────────────────────────────────────────────────────────
@lru_cache
def mongo():
    return MongoClient(config.MONGO_URL)[config.MONGO_DB]


@lru_cache
def redis():
    return redis_lib.from_url(config.REDIS_URL)


def progress(payload: dict, pct: int, note: str = "") -> None:
    redis().publish(
        f"run.{payload['run_id']}",
        json.dumps({"type": "stage.progress", "runId": payload["run_id"],
                    "data": {"stage": payload["stage"], "progress": pct, "note": note}}),
    )


# ── backend callbacks ─────────────────────────────────────────────────────────
def notify_started(payload: dict) -> None:
    url = payload["callback_url"].replace("/complete", "/started")
    httpx.post(url, headers={"X-Internal-Token": payload["internal_token"]}, timeout=15)


def complete(payload: dict, status: str, artifact: str | None = None,
             meta: dict | None = None, error: str | None = None) -> None:
    httpx.post(
        payload["callback_url"],
        headers={"X-Internal-Token": payload["internal_token"]},
        json={"status": status, "artifact_key": artifact, "meta": meta or {}, "error": error},
        timeout=30,
    )


def backend_get(path: str) -> dict:
    resp = httpx.get(f"{config.BACKEND_URL}{path}", timeout=15)
    resp.raise_for_status()
    return resp.json()


def backend_internal_post(path: str, body: dict) -> None:
    httpx.post(f"{config.BACKEND_URL}{path}",
               headers={"X-Internal-Token": config.INTERNAL_TOKEN}, json=body, timeout=30)


# ── media helpers ─────────────────────────────────────────────────────────────
def run_ffmpeg(args: list[str]) -> None:
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args]
    subprocess.run(cmd, check=True, capture_output=True)


def ffprobe(path: str) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", "-show_streams", path],
        check=True, capture_output=True,
    )
    return json.loads(out.stdout)


def media_duration(path: str) -> float:
    info = ffprobe(path)
    return float(info.get("format", {}).get("duration", 0.0))


def cleanup(*paths: str) -> None:
    for p in paths:
        try:
            Path(p).unlink(missing_ok=True)
        except OSError:
            shutil.rmtree(p, ignore_errors=True)


# ── mock-mode detection ───────────────────────────────────────────────────────
def module_available(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except ModuleNotFoundError:
        # find_spec("pkg.sub") imports the parent package first and raises
        # (rather than returning None) when even the parent is absent.
        return False


def use_mock(required_module: str) -> bool:
    if config.AI_MOCK_MODE == "always":
        return True
    if config.AI_MOCK_MODE == "never":
        return False
    return not module_available(required_module)


# ── task wrapper ──────────────────────────────────────────────────────────────
def stage_task(stage_name: str):
    """Decorator: wraps a stage impl with start/complete callbacks + error handling."""
    def decorator(fn):
        def wrapper(payload: dict):
            payload = {**payload, "stage": stage_name}
            try:
                notify_started(payload)
                progress(payload, 0, "started")
                artifact, meta = fn(payload) or (None, {})
                progress(payload, 100, "done")
                complete(payload, "succeeded", artifact, meta)
            except Exception as exc:  # noqa: BLE001 — report any failure upstream
                complete(payload, "failed", error=f"{type(exc).__name__}: {exc}")
                raise
        wrapper.__name__ = f"stage_{stage_name}"
        return wrapper
    return decorator
