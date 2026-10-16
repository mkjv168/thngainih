#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
from pathlib import Path
import json
root = Path('site')
initial = [root / 'index.html', root / 'styles.css', *sorted((root / 'js').glob('*.js')), root / 'assets/fonts/inter-latin-var.woff2']
total = sum(file.stat().st_size for file in initial)
js_size = sum(file.stat().st_size for file in (root / 'js').glob('*.js')) + (root / 'sw.js').stat().st_size
assert total <= 150_000, f'Initial transfer {total} exceeds 150KB'
assert js_size < 10_000, f'JavaScript {js_size} exceeds 10KB'
en, km = [json.loads((root / 'i18n' / f'{lang}.json').read_text()) for lang in ('en', 'km')]
assert en.keys() == km.keys(), 'Translation dictionaries differ'
print(f'PASS: initial transfer {total:,} / 150,000 bytes; all JS {js_size:,} / 10,000 bytes')
PY

for file in site/i18n/*.json site/data/*.json site/manifest.webmanifest; do
  python3 -m json.tool "$file" > /dev/null
done

# Let the OS choose and bind the port atomically, avoiding port-selection races.
coproc SERVER { exec python3 -u - <<'PY'
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
try:
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory='site'))
except OSError as error:
    raise SystemExit(f'Cannot start local HTTP server: {error}')
print(server.server_port, flush=True)
server.serve_forever()
PY
}
server_pid=$SERVER_PID
trap 'kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true' EXIT
if ! read -r port <&"${SERVER[0]}"; then
  echo "HTTP checks unavailable: local server could not bind a socket." >&2
  exit 77
fi
for resource in index.html styles.css js/config.js js/app.js js/i18n.js js/analytics.js sw.js i18n/en.json i18n/km.json data/content.json assets/fonts/inter-latin-var.woff2 assets/fonts/kantumruy-khmer-var.woff2 manifest.webmanifest og-image.png favicon.svg icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png 404.html robots.txt; do
  curl --silent --show-error --fail "http://127.0.0.1:$port/$resource" -o /dev/null
done
