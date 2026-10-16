#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 -m http.server -d site 8080
