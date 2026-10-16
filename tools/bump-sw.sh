#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json
from pathlib import Path
path = Path('tools/site.json')
config = json.loads(path.read_text())
old = config['sw_cache_version']
config['sw_cache_version'] = old + 1
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Service worker: {old} -> {old + 1}')
PY
python3 tools/build.py
