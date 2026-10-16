#!/usr/bin/env python3
"""Offline generated-card sheets and optional designer reference comparisons."""
import argparse
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
root = Path(__file__).resolve().parent.parent


def sheet(paths, cell, out):
    w, h = cell
    preview = Image.new('RGB', (w * 2, (h + 30) * ((len(paths)+1)//2)), '#ddd')
    for i, path in enumerate(paths):
        x, y = (i % 2) * w, (i // 2) * (h + 30)
        with Image.open(path) as card:
            preview.paste(ImageOps.contain(card.convert('RGB'), cell), (x, y))
        ImageDraw.Draw(preview).text((x+10, y+h+4), path.parent.name+'/'+path.name, fill='black')
    preview.save(out)
    print('Preview: ' + out)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--references', type=Path)
    args=parser.parse_args()
    sheet([root/'site/og-image.png', *sorted((root/'site/r').glob('*/og.png'))],
          (600, 315), '/tmp/cards-preview.png')
    sheet(sorted((root/'site/r').glob('*/story.png')), (432, 540), '/tmp/stories-preview.png')
    sheet(sorted((root/'site/d').glob('*/og.png')), (600,315), '/tmp/daily-cards-preview.png')
    if args.references:
        for kind,cell in [('og',(600,315)),('story',(432,540))]:
            pairs=[]
            for path in sorted((root/'site/r').glob('*/'+kind+'.png')):
                reference=args.references/(kind+'-'+path.parent.name+'.png')
                if reference.exists():pairs.extend([reference,path])
            sheet(pairs,cell,'/tmp/'+kind+'-comparisons.png')


if __name__=='__main__':main()
