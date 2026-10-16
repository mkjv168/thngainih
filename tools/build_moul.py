#!/usr/bin/env python3
"""Build the fixed-string Moul display subset offline."""
import json
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parent.parent
EXTRA=' !()?dhis{}' + ''.join(chr(c) for c in range(0x17e0,0x17ea))
def display_strings():
    km=json.loads((ROOT/'site/i18n/km.json').read_text())
    keys=['name','card.iam','quiz.letters','static.khmercal.3']
    keys += [f'weekday.{kind}.{i}' for kind in ('day','colorShort') for i in range(7)]
    quiz=json.loads((ROOT/'site/quiz/quiz.json').read_text())
    keys += [f"quiz.r.{r['id']}.name" for r in quiz['results']]
    return [km[k] for k in keys]+[EXTRA]
def main():
    reference=Path('/workspace/startup24/design/fonts/moul-text.txt')
    text=''.join(sorted(set(''.join(display_strings())+reference.read_text())))
    path=ROOT/'tools/fonts/moul-text.txt';path.write_text(text)
    subprocess.run([sys.executable,'-m','fontTools.subset',str(ROOT/'tools/fonts/Moul-Regular.ttf'),'--text-file='+str(path),'--layout-features=*','--flavor=woff2','--output-file='+str(ROOT/'site/assets/fonts/moul-subset.woff2')],check=True)
if __name__=='__main__':main()
