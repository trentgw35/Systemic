#!/usr/bin/env bash
# Idempotent Cloud Agent install: Node deps, Supabase CLI, native stack artifacts.
set -euo pipefail
cd "$(dirname "$0")/.."

export SUPABASE_TELEMETRY_DISABLED=1
export DO_NOT_TRACK=1
export SUPABASE_EXPERIMENTAL_STACK=1

SUPABASE_VERSION="3.1.0"
if ! command -v supabase >/dev/null 2>&1 || [[ "$(supabase --version 2>/dev/null | tr -d '[:space:]')" != "$SUPABASE_VERSION" ]]; then
  tmp="$(mktemp)"
  curl -fsSL -o "$tmp" "https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_linux_amd64.tar.gz"
  sudo tar -xzf "$tmp" -C /usr/local/bin supabase
  rm -f "$tmp"
  sudo chmod 755 /usr/local/bin/supabase
fi

npm ci

if [[ -f supabase/config.toml ]]; then
  supabase stack install --runtime native --frozen
fi
