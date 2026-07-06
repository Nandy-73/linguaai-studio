#!/usr/bin/env bash
# LinguaAI Studio — one-command dev bootstrap
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit secrets before deploying anywhere."
fi

docker compose up --build "$@"
