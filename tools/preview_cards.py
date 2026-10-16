#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
root = Path(__file__).resolve().parent.parent
paths = [root / 'site/og-image.png', *sorted((root / 'site/r').glob('*/og.png'))]
preview = Image.new('RGB', (1200, 345 * ((len(paths)+1)//2)), '#ddd')
for i, path in enumerate(paths):
    with Image.open(path) as card:
        preview.paste(ImageOps.contain(card, (600,315)), ((i%2)*600, (i//2)*345))
    ImageDraw.Draw(preview).text(((i%2)*600+10, (i//2)*345+319), str(path.relative_to(root)), fill='black')
preview.save('/tmp/cards-preview.png')
print('Preview: /tmp/cards-preview.png')
