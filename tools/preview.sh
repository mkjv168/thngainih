#!/usr/bin/env bash
# Local private preview at http://127.0.0.1:8765/thngainih/ (mirrors the GitHub Pages base path).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; SLUG="$(python3 -c "import json;print(json.load(open('$ROOT/tools/site.json'))['slug'])")"
DIR="$(mktemp -d)"; ln -s "$ROOT/site" "$DIR/$SLUG"
echo "Serving http://127.0.0.1:${PORT:-8765}/$SLUG/"; cd "$DIR" && exec python3 -m http.server "${PORT:-8765}" --bind 127.0.0.1
