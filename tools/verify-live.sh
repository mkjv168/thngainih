#!/usr/bin/env bash
# Read-only checks on the live site + dispatch the uptime workflow once. Usage: bash tools/verify-live.sh [--no-dispatch]
set -uo pipefail
OWNER=mkjv168; REPO=thngainih; FULL="$OWNER/$REPO"; BASE="https://$OWNER.github.io/$REPO"
TODAY="$(TZ=Asia/Phnom_Penh date +%F)"; fail=0
check_og() { # url expected_og_url
  local html; html="$(curl -fsSL "$1")" || { echo "FAIL fetch $1"; fail=1; return; }
  for prop in og:title og:description og:image og:url; do
    grep -q "property=\"$prop\"" <<<"$html" || { echo "FAIL $1 missing $prop"; fail=1; }
  done
  local img; img="$(grep -o 'property="og:image" content="[^"]*"' <<<"$html" | sed 's/.*content="//;s/"$//')"
  grep -q "property=\"og:url\" content=\"$2\"" <<<"$html" || { echo "FAIL $1 og:url != $2"; fail=1; }
  grep -q 'twitter:card' <<<"$html" || echo "WARN $1 no twitter:card"
  local code type; read -r code type < <(curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "$img")
  [ "$code" = 200 ] && [[ "$type" == image/png* ]] && echo "OK   $1 -> $img" || { echo "FAIL $img $code $type"; fail=1; }
  grep -q 'example\.github\.io' <<<"$html" && { echo "FAIL $1 contains placeholder origin"; fail=1; }
}
check_og "$BASE/" "$BASE/"
for id in amok lok-lak num-banh-chok kuy-teav samlor-korko bai-sach-chrouk kralan prahok-ktis; do check_og "$BASE/r/$id/" "$BASE/r/$id/"; done
check_og "$BASE/d/$TODAY/" "$BASE/d/$TODAY/"
curl -fsS "$BASE/js/config.js" | grep -q '"goatcounterCode": "thngainih"' && echo "OK   analytics config (goatcounter thngainih)" || { echo "FAIL analytics config"; fail=1; }
curl -fsS "$BASE/manifest.webmanifest" | python3 -c 'import json,sys;m=json.load(sys.stdin);assert m["scope"]=="/thngainih/";print("OK   manifest scope",m["scope"])' || fail=1
if [ "${1:-}" != --no-dispatch ]; then
  gh workflow run uptime.yml --repo "$FULL" --ref main && sleep 8 &&
  rid="$(gh run list --repo "$FULL" --workflow uptime.yml --limit 1 --json databaseId -q '.[0].databaseId')" &&
  gh run watch "$rid" --repo "$FULL" --exit-status && echo "OK   uptime workflow dispatched and passed" || { echo "FAIL uptime workflow"; fail=1; }
fi
[ "$fail" = 0 ] && echo "ALL LIVE CHECKS PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
