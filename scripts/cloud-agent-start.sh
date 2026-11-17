#!/usr/bin/env bash
# Cloud Agent boot: local Supabase (native runtime) and the Next.js dev server.
set -euo pipefail
cd "$(dirname "$0")/.."

export SUPABASE_TELEMETRY_DISABLED=1
export DO_NOT_TRACK=1
export SUPABASE_EXPERIMENTAL_STACK=1

PORT="${PORT:-3456}"

write_env_local() {
  local env_file
  env_file="$(supabase status --env)"
  python3 - "$env_file" <<'PY'
import json, sys
raw = sys.argv[1].strip()
if raw.startswith("{"):
    vals = json.loads(raw)
else:
    vals = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        vals[key] = value.strip().strip('"').strip("'")

def pick(*names):
    for name in names:
        if vals.get(name):
            return vals[name]
    return ""

url = pick("API_URL", "SUPABASE_URL")
anon = pick("ANON_KEY", "PUBLISHABLE_KEY", "SUPABASE_ANON_KEY")
service = pick("SERVICE_ROLE_KEY", "SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY")
db = pick("DB_URL", "DATABASE_URL")
missing = [name for name, value in (("url", url), ("anon", anon), ("service", service)) if not value]
if missing:
    sys.stderr.write("supabase status --env missing: " + ", ".join(missing) + "\n")
    sys.stderr.write(raw + "\n")
    sys.exit(1)

lines = [
    f"NEXT_PUBLIC_SUPABASE_URL={url}",
    f"NEXT_PUBLIC_SUPABASE_ANON_KEY={anon}",
    f"SUPABASE_URL={url}",
    f"SUPABASE_ANON_KEY={anon}",
    f"SUPABASE_SERVICE_ROLE_KEY={service}",
]
if db:
    lines.append(f"DATABASE_URL={db}")
with open(".env.local", "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines) + "\n")
print("Wrote .env.local from local Supabase status")
PY
}

if [[ -f supabase/config.toml ]]; then
  if ! supabase status >/dev/null 2>&1; then
    supabase start --runtime native --eager
  fi
  write_env_local
fi

if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  echo "Systemic already responding on :${PORT}"
  exit 0
fi

if [[ ! -d node_modules ]]; then
  npm ci
fi

exec npm run dev
