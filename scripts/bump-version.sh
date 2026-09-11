#!/usr/bin/env bash
set -euo pipefail

next="${1:?Uso: scripts/bump-version.sh X.Y.Z}"
if [[ ! "$next" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  printf 'Versão inválida: %s (use X.Y.Z)\n' "$next" >&2
  exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
current="$(node -p "require('$root/package.json').version")"
date_utc="$(date -u +%F)"

python3 - "$root" "$current" "$next" "$date_utc" <<'PY'
from pathlib import Path
import sys
root, current, next_version, date_utc = map(str, sys.argv[1:])
for relative in ('package.json', 'package-lock.json'):
    path = Path(root) / relative
    content = path.read_text()
    content = content.replace(f'"version": "{current}"', f'"version": "{next_version}"')
    path.write_text(content)
path = Path(root) / 'src/lib/version.ts'
content = path.read_text()
content = content.replace(f"VERSION          = 'V{current}'", f"VERSION          = 'V{next_version}'")
content = content.replace(f"APP_VERSION      = '{current}'", f"APP_VERSION      = '{next_version}'")
content = content.replace("APP_VERSION_DATE = '" + content.split("APP_VERSION_DATE = '",1)[1].split("'",1)[0] + "'", f"APP_VERSION_DATE = '{date_utc}'")
path.write_text(content)
PY

printf 'Versão alterada: V%s → V%s\n' "$current" "$next"
