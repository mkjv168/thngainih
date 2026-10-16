#!/usr/bin/env bash
# Publish Thngai Nih to GitHub Pages: https://mkjv168.github.io/thngainih/
# DO NOT run without the owner's go-ahead. Needs: gh logged in as mkjv168 (repo + workflow scopes).
# Usage: bash tools/deploy.sh            (from anywhere inside the repo)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
OWNER=mkjv168; REPO=thngainih; FULL="$OWNER/$REPO"
BASE="https://$OWNER.github.io/$REPO"
TODAY="$(TZ=Asia/Phnom_Penh date +%F)"

echo "== preflight"
gh auth status
[ "$(gh api user -q .login)" = "$OWNER" ] || { echo "gh is not logged in as $OWNER"; exit 1; }
[ "$(git branch --show-current)" = main ] || git branch -M main
git diff --quiet && git diff --cached --quiet || { echo "Uncommitted changes; commit first"; exit 1; }
python3 tools/build.py && python3 tools/build_daily.py && bash tests/run.sh
git diff --quiet || { echo "Build changed tracked files; commit them first"; exit 1; }
! rg -q 'example\.github\.io' site || { echo "placeholder origin still in site/"; exit 1; }

echo "== repo"
if gh repo view "$FULL" >/dev/null 2>&1; then
  echo "$FULL exists"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$FULL.git"
  git push -u origin main
else
  gh repo create "$FULL" --public --source . --remote origin --push \
    --description "Thngai Nih / ថ្ងៃនេះ: today's Khmer date, holy days, holidays + Which Khmer dish are you?"
fi

echo "== pages (build_type=workflow)"
if gh api "repos/$FULL/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/$FULL/pages" -f build_type=workflow
else
  gh api -X POST "repos/$FULL/pages" -f build_type=workflow
fi

echo "== variables"
gh variable set UPTIME_URLS --repo "$FULL" --body "$BASE/,$BASE/quiz/,$BASE/r/amok/,$BASE/r/amok/og.png"

echo "== deploy"
# The push may already have started a deploy run (push trigger on site/** and tools/**). Dispatch one explicitly as well; concurrency group 'pages' queues them.
gh workflow run deploy-pages.yml --repo "$FULL" --ref main
sleep 8
RUN_ID="$(gh run list --repo "$FULL" --workflow deploy-pages.yml --limit 1 --json databaseId -q '.[0].databaseId')"
gh run watch "$RUN_ID" --repo "$FULL" --exit-status

echo "== verify"
fail=0
for path in "/" "/quiz/" "/r/amok/" "/r/amok/og.png" "/d/$TODAY/" "/d/$TODAY/og.png" "/og-today.png" "/manifest.webmanifest" "/sw.js" "/privacy/"; do
  for i in 1 2 3 4 5 6; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path")"; [ "$code" = 200 ] && break; sleep 10
  done
  echo "$code $BASE$path"; [ "$code" = 200 ] || fail=1
done
[ "$fail" = 0 ] && echo "LIVE OK: $BASE/" || { echo "Some URLs not 200 (Pages can take a few minutes on first deploy; re-run tools/verify-live.sh)"; exit 1; }
