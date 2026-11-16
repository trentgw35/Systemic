#!/usr/bin/env bash
# Cloud Agent boot start — long-running Next.js dev server.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3456}"
if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  echo "Systemic already responding on :${PORT}"
  exit 0
fi

# Prefer already-installed deps; install is a no-op if node_modules present.
if [[ ! -d node_modules ]]; then
  npm ci
fi

exec npm run dev
