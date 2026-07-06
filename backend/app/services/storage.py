import boto3
from botocore.client import Config

from app.core.config import settings

_client = None
_public_client = None


def _make_client(endpoint: str):
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


def client():
    global _client
    if _client is None:
        _client = _make_client(settings.S3_ENDPOINT_URL)
    return _client


def public_client():
    """Client whose presigned URLs are reachable from the user's browser."""
    global _public_client
    if _public_client is None:
        _public_client = _make_client(settings.S3_PUBLIC_ENDPOINT_URL)
    return _public_client


def ensure_bucket() -> None:
    try:
        client().head_bucket(Bucket=settings.S3_BUCKET)
    except Exception:
        client().create_bucket(Bucket=settings.S3_BUCKET)


def media_key(org_id: str, project_id: str, asset_id: str, filename: str) -> str:
    safe = filename.replace("/", "_").replace("\\", "_")
    return f"media/{org_id}/{project_id}/{asset_id}/{safe}"


def artifact_key(org_id: str, run_id: str, stage: str, name: str) -> str:
    return f"artifacts/{org_id}/{run_id}/{stage}/{name}"


def presign_put(key: str, content_type: str, expires: int = 3600) -> str:
    return public_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )


def presign_get(key: str, expires: int = 3600, filename: str | None = None) -> str:
    params: dict = {"Bucket": settings.S3_BUCKET, "Key": key}
    if filename:
        params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
    return public_client().generate_presigned_url("get_object", Params=params, ExpiresIn=expires)


def delete_prefix(prefix: str) -> None:
    paginator = client().get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=settings.S3_BUCKET, Prefix=prefix):
        objs = [{"Key": o["Key"]} for o in page.get("Contents", [])]
        if objs:
            client().delete_objects(Bucket=settings.S3_BUCKET, Delete={"Objects": objs})
