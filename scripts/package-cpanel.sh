#!/usr/bin/env bash
# Build a zip you can upload to cPanel shared hosting (no Node or Composer
# needed on the server). Output: dist/together-cpanel-<date>.zip
#
#   ./scripts/package-cpanel.sh
#
# Requires PHP 8.3+, Composer, Node 20+ and python3 on this machine.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M)"
WORK="$(mktemp -d)"
APP="$WORK/together"
trap 'rm -rf "$WORK"' EXIT

echo "→ Building the React app"
cd "$ROOT/frontend"
npm ci --no-audit --no-fund
# A clean build that calls /api/v1 on its own domain, whatever local .env files say.
env -u VITE_API_URL VITE_API_URL=/api/v1 npm run build

echo "→ Copying the Laravel app"
mkdir -p "$APP"
cd "$ROOT/backend"
tar --exclude='.env' --exclude='.env.backup' --exclude='.env.production' --exclude='*.sqlite*' \
    --exclude='./vendor' --exclude='./node_modules' --exclude='./tests' --exclude='./.phpunit.cache' \
    --exclude='*.log' --exclude='./storage/framework/cache/data/*' --exclude='./storage/framework/views/*.php' \
    --exclude='./public/uploads/alumni' -cf - . | tar -xf - -C "$APP"

echo "→ Installing production PHP dependencies"
cd "$APP"
composer install --no-dev --optimize-autoloader --no-interaction --no-progress --quiet
rm -f phpunit.xml

# Never ship secrets, databases, logs or uploads.
LEAKS="$(cd "$APP" && find . \( -name '.env' -o -name '.env.*' ! -name '.env.example' -o -name '*.sqlite*' -o -name '*.log' \) -print; find "$APP/public/uploads" -type f ! -name '.htaccess' ! -name '.gitignore')"
if [ -n "$LEAKS" ]; then
    echo "✗ Refusing to package: these files must not be uploaded:" >&2
    echo "$LEAKS" >&2
    exit 1
fi

echo "→ Zipping"
mkdir -p "$ROOT/dist"
OUT="$ROOT/dist/together-cpanel-$STAMP.zip"
python3 - "$WORK" "$OUT" <<'PY'
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, dirs, files in os.walk(src):
        for name in files:
            path = os.path.join(base, name)
            z.write(path, os.path.relpath(path, src))
PY
echo "✓ $OUT ($(du -h "$OUT" | cut -f1))"
echo "  Upload it to your home folder in cPanel, extract it, then follow README → Deploying to cPanel."
