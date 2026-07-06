# Event contract — run channel

Published on Redis channel `run.{runId}`, delivered to clients over
`WS /api/v1/ws/runs/{runId}` and (later) webhooks. One schema, all consumers.

```json
{ "type": "stage.started",   "runId": "…", "data": { "stage": "asr", "position": 3 } }
{ "type": "stage.progress",  "runId": "…", "data": { "stage": "asr", "progress": 42, "note": "" } }
{ "type": "stage.completed", "runId": "…", "data": { "stage": "asr", "meta": { } } }
{ "type": "stage.retrying",  "runId": "…", "data": { "stage": "asr", "attempt": 2 } }
{ "type": "run.completed",   "runId": "…", "data": { "status": "succeeded" } }
{ "type": "run.failed",      "runId": "…", "data": { "stage": "…", "error": "…" } }
{ "type": "run.canceled",    "runId": "…", "data": { } }
{ "type": "ping" }
```

Stage names per template are defined in `backend/app/services/pipelines.py`
(`TEMPLATES`); gRPC protos for internal service calls will live in this package
when service extraction begins (see docs/SAD.md §8).
