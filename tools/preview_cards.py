#!/usr/bin/env python3
"""Offline contact sheets for OG and story cards."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
root = Path(__file__).resolve().parent.parent


def sheet(paths, cell, out):
    w, h = cell
    preview = Image.new('RGB', (w * 2, (h + 30) * ((len(paths)+1)//2)), '#ddd')
    for i, path in enumerate(paths):
        x, y = (i % 2) * w, (i // 2) * (h + 30)
        with Image.open(path) as card:
            preview.paste(ImageOps.contain(card, cell), (x, y))
        ImageDraw.Draw(preview).text((x+10, y+h+4), str(path.relative_to(root)), fill='black')
    preview.save(out)
    print('Preview: ' + out)


sheet([root/'site/og-image.png', *sorted((root/'site/r').glob('*/og.png'))],
      (600, 315), '/tmp/cards-preview.png')
sheet(sorted((root/'site/r').glob('*/story.png')), (432, 540), '/tmp/stories-preview.png')
