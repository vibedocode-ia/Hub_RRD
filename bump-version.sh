#!/usr/bin/env bash
# RR Desentupidora — Site + Hub RRD · versionamento obrigatório VibeDoCode
# Uso: ./bump-version.sh patch|minor|major "Descrição da versão"

set -euo pipefail

TYPE="${1:-}"
DESCRIPTION="${2:-}"
PACKAGE_FILE="package.json"
LOCK_FILE="package-lock.json"
VERSION_FILE="src/lib/version.ts"
UPDATES_FILE="atualizaçoes do projeto.md"

if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]] || [[ -z "$DESCRIPTION" ]]; then
  echo 'Uso: ./bump-version.sh patch|minor|major "Descrição da versão"'
  exit 1
fi

for file in "$PACKAGE_FILE" "$VERSION_FILE" "$UPDATES_FILE"; do
  [[ -f "$file" ]] || { echo "Arquivo obrigatório ausente: $file"; exit 1; }
done

CURRENT="$(node -e "console.log(require('./package.json').version)")"
[[ "$CURRENT" =~ ^[0-9]+\.[0-9]{2}\.[0-9]{2}$ ]] || {
  echo "Versão atual inválida: $CURRENT"
  exit 1
}

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
MAJOR=$((10#$MAJOR)); MINOR=$((10#$MINOR)); PATCH=$((10#$PATCH))

case "$TYPE" in
  patch)
    (( PATCH < 99 )) || { echo 'PATCH chegou a 99; use minor.'; exit 1; }
    PATCH=$((PATCH + 1))
    ;;
  minor)
    (( MINOR < 99 )) || { echo 'MINOR chegou a 99; solicite major.'; exit 1; }
    MINOR=$((MINOR + 1)); PATCH=0
    ;;
  major)
    [[ "${ALLOW_MAJOR:-}" == "yes" ]] || {
      echo 'MAJOR exige autorização explícita: ALLOW_MAJOR=yes ./bump-version.sh major "Descrição"'
      exit 1
    }
    MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0
    ;;
esac

NEW_VERSION="$(printf '%d.%02d.%02d' "$MAJOR" "$MINOR" "$PATCH")"
NEW_LABEL="V$NEW_VERSION"
TODAY="$(date +%F)"

node - "$NEW_VERSION" "$PACKAGE_FILE" "$LOCK_FILE" <<'NODE'
const fs = require('fs')
const [version, packageFile, lockFile] = process.argv.slice(2)
const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
pkg.version = version
fs.writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n')
if (fs.existsSync(lockFile)) {
  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'))
  lock.version = version
  if (lock.packages && lock.packages['']) lock.packages[''].version = version
  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + '\n')
}
NODE

node - "$NEW_LABEL" "$NEW_VERSION" "$TODAY" "$VERSION_FILE" <<'NODE'
const fs = require('fs')
const [label, version, today, file] = process.argv.slice(2)
let source = fs.readFileSync(file, 'utf8')
source = source
  .replace(/export const VERSION\s+= '[^']*'/, `export const VERSION          = '${label}'`)
  .replace(/export const APP_VERSION\s+= '[^']*'/, `export const APP_VERSION      = '${version}'`)
  .replace(/export const APP_VERSION_DATE\s+= '[^']*'/, `export const APP_VERSION_DATE = '${today}'`)
fs.writeFileSync(file, source)
NODE

node - "$NEW_LABEL" "$TODAY" "$DESCRIPTION" "$UPDATES_FILE" <<'NODE'
const fs = require('fs')
const [label, today, description, file] = process.argv.slice(2)
const content = fs.readFileSync(file, 'utf8')
if (content.includes(`### ${label} `)) throw new Error(`${label} já consta no changelog`)
const entry = `### ${label} (${today}) - ${description}\n- **Release:** Site + Hub RRD.\n\n`
fs.writeFileSync(file, entry + content)
NODE

echo "Versão atualizada: V$CURRENT → $NEW_LABEL"
echo "Próximo commit obrigatório: release: Version $NEW_LABEL"
