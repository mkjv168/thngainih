#!/usr/bin/env python3
"""Generate share art and install icons. Requires Pillow only at authoring time."""
import argparse
import json
from siteconfig import local
from pathlib import Path
KM = json.loads((Path(__file__).resolve().parent.parent / "site/i18n/km.json").read_text())
from PIL import Image, ImageDraw, ImageFont, features

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--name', default=local('name'))
    parser.add_argument('--tagline', default=local('daily.features'))
    parser.add_argument('--tagline-km', default=local('name','km'))
    parser.add_argument('--color', default='#123d35')
    parser.add_argument('--font-en', default='/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf')
    parser.add_argument('--font-km', default='/home/box/.local/share/fonts/KantumruyPro[wght].ttf')
    args = parser.parse_args()
    raqm = features.check('raqm')
    if not raqm:
        print('Warning: RAQM unavailable; BASIC layout may not shape Khmer correctly.')
    layout = ImageFont.Layout.RAQM if raqm else ImageFont.Layout.BASIC
    def fit(text, path, size, width):
        if not Path(path).is_file():
            parser.error(f'Font missing: {path}; supply --font-en / --font-km with TTF or OTF files')
        while size > 10:
            font = ImageFont.truetype(path, size, layout_engine=layout)
            if font.getlength(text) <= width:
                return font
            size -= 1
        return font
    output = ROOT / 'site'
    image = Image.new('RGB', (1200, 630), args.color)
    draw = ImageDraw.Draw(image)
    draw.ellipse((900, -160, 1370, 310), fill='#d8ed9c')
    for text, y, size, path in [(args.name, 80, 100, args.font_en), (args.tagline, 270, 54, args.font_en), (args.tagline_km, 380, 48, args.font_km)]:
        draw.text((80, y), text, font=fit(text, path, size, 1020), fill='#f5f4ed')
    image.save(output / 'og-image.png', optimize=True)
    for filename, size, maskable in [('icon-192.png', 192, False), ('icon-512.png', 512, False), ('icon-maskable-512.png', 512, True), ('apple-touch-icon.png', 180, False)]:
        icon = Image.new('RGB', (size, size), args.color)
        pen = ImageDraw.Draw(icon)
        lo, hi = size * .32, size * .68
        pen.line([(lo, hi), (hi, lo)], fill='#d8ed9c', width=max(1, round(size * .065)))
        pen.line([(lo, lo), (hi, lo), (hi, hi)], fill='#d8ed9c', width=max(1, round(size * .065)))
        icon.save(output / filename, optimize=True)
    print('Generated OG image and four icons in site/')

if __name__ == '__main__':
    main()
