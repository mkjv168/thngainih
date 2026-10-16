#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Bind first so SITE_URL uses the actual port without a selection race.
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
  echo 'HTTP checks unavailable: local server could not bind a socket.' >&2
  exit 77
fi
export SITE_URL="http://127.0.0.1:$port/"
python3 tools/build.py
python3 tools/build_daily.py
python3 tools/validate.py
today=$(python3 -c 'from datetime import datetime; from zoneinfo import ZoneInfo; print(datetime.now(ZoneInfo("Asia/Phnom_Penh")).date())')
for resource in '' quiz/ "d/$today/" "d/$today/og.png" data/holidays.json js/vendor/momentkh.js quiz/quiz.json styles.css js/config.js js/app.js js/source.js js/modules/quiz.js js/modules/content.js js/result.js js/i18n.js js/analytics.js sw.js i18n/en.json i18n/km.json data/content.json assets/fonts/inter-latin-var.woff2 assets/fonts/kantumruy-khmer-var.woff2 manifest.webmanifest og-image.png favicon.svg icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png 404.html robots.txt r/index.json; do
  curl --silent --show-error --fail "$SITE_URL$resource" -o /dev/null
 done
while read -r id; do
  curl --silent --show-error --fail "${SITE_URL}r/$id/" -o /dev/null
  card_file=$(mktemp /tmp/quiz-card.XXXXXX)
  curl --silent --show-error --fail "${SITE_URL}r/$id/og.png" -o "$card_file"
  python3 - "$card_file" <<'PY'
import sys
from PIL import Image
with Image.open(sys.argv[1]) as im:
    assert im.format == 'PNG' and im.size == (1200,630)
PY
  rm "$card_file"
done < <(python3 -c 'import json; print("\n".join(r["id"] for r in json.load(open("site/quiz/quiz.json"))["results"]))')
echo 'PASS: HTTP resources and result cards'
