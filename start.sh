#!/usr/bin/env bash
set -o errexit

PORT=${PORT:-8000}
echo ">>> Starting Flixpense AI Server on port $PORT..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "$PORT"
