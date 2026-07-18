import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "dev-internal-token")

S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://minio:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "linguaai")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "linguaai-secret")
S3_BUCKET = os.getenv("S3_BUCKET", "lingua")
S3_REGION = os.getenv("S3_REGION", "us-east-1")

MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
MONGO_DB = os.getenv("MONGO_DB", "lingua")

AI_MOCK_MODE = os.getenv("AI_MOCK_MODE", "auto")  # auto | always | never
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "large-v3")
HF_TOKEN = os.getenv("HF_TOKEN", "")

# Provider selection per capability. "auto" picks the best available:
# ASR: Groq-hosted Whisper (needs LLM_* creds) -> local WhisperX -> mock
# TTS: Edge neural voices (free, no key)      -> mock
ASR_PROVIDER = os.getenv("ASR_PROVIDER", "auto")  # auto | groq | local | mock
ASR_MODEL = os.getenv("ASR_MODEL", "whisper-large-v3-turbo")
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "auto")  # auto | edge | mock

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5-14b-instruct")
