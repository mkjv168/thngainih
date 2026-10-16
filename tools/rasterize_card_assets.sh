#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p tools/card-assets
for h in 30 44; do
  w=$((h * 4 / 3))
  rsvg-convert -w "$w" -h "$h" site/assets/orn/kbach-border.svg -o "tools/card-assets/border-$h.png"
done
for w in 168 252; do
  rsvg-convert -w "$w" -h "$w" site/assets/orn/kbach-frame.svg -o "tools/card-assets/frame-$w.png"
done
for w in 300 360; do
  rsvg-convert -w "$w" -h "$((w / 10))" site/assets/orn/kbach-divider.svg -o "tools/card-assets/divider-$w.png"
done
for svg in site/assets/dish/*.svg; do
  rsvg-convert -w 360 -h 360 "$svg" -o "tools/card-assets/$(basename "${svg%.svg}").png"
done
