#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
status=0
for file in tests/*.test.mjs; do node "$file" || status=1; done
python3 tools/validate.py || status=1
exit "$status"
