#!/usr/bin/env python3
"""Render the rolling ICT daily window; no repository writes outside site/."""
import argparse
import html
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo
from pathlib import Path
from string import Template
from urllib.parse import urlsplit
from PIL import Image, ImageDraw, features
from cardlib import fitted
ROOT=Path(__file__).resolve().parent.parent
SITE=ROOT/'site'

def holiday_line(record):
    item=record['nextHoliday']
    if not item: return 'No upcoming holidays in the current data.'
    h=item['holiday']; n=item['daysAway']
    return (f"Today is {h['name']['en']}" if n==0 else f"Next public holiday: {h['name']['en']} in {n} days ({h['date']})") + ('' if h['verified'] else ' (unverified date)')

def render(path, record, base):
    im=Image.new('RGB',(1200,630),'#f5f4ed');draw=ImageDraw.Draw(im)
    draw.rectangle((0,0,1200,24),fill=record['colour']['hex'] if record else '#123d35')
    def line(text,y,size=32,lang='km',bold=False):
        face,lines,actual=fitted(draw,text,size,1080,lang,bold,max_lines=1)
        draw.text((60,y),lines[0],font=face,fill='#123d35',language=lang,anchor='lt')
    line('Today in Khmer / ប្រតិទិនខ្មែរថ្ងៃនេះ',52,36,bold=True)
    if record:
        line(record['formattedKm'],136,54,bold=True)
        line(record['gregorianEn'],235,36,'en')
        line(record['gregorianKm'],293,32)
        if record['isSil']:
            draw.rounded_rectangle((60,351,700,404),radius=12,fill='#e1d5a1')
            line('Thngai Sil · ថ្ងៃនេះជាថ្ងៃសីល',358,26,bold=True)
        line(f"Lucky colour: {record['colour']['color']['en']} / {record['colour']['color']['km']}",425,30)
        line(holiday_line(record),480,25,'en')
    else:
        line('ប្រតិទិនខ្មែរថ្ងៃនេះ',165,76,bold=True)
        line('Lunar date · Holy days · Your weekday colour',310,36,'en')
        line('ថ្ងៃចន្ទគតិ · ថ្ងៃសីល · ពណ៌ប្រចាំថ្ងៃ',390,36)
    line(urlsplit(base).netloc+urlsplit(base).path.rstrip('/')+' · Today in Khmer · ថ្ងៃនេះជាភាសាខ្មែរ',570,23)
    im.save(path,optimize=True)

def build():
    if not features.check('raqm'): raise SystemExit('Pillow RAQM is required for Khmer shaping')
    today=datetime.now(ZoneInfo('Asia/Phnom_Penh')).date()
    parser=argparse.ArgumentParser();parser.add_argument('--start',default=str(today-timedelta(days=1)));parser.add_argument('--days',type=int,default=9);args=parser.parse_args()
    records=json.loads(subprocess.check_output(['node',str(ROOT/'tools/daily_data.mjs'),args.start,str(args.days)],text=True))
    base=os.environ.get('SITE_URL',json.loads((ROOT/'tools/site.json').read_text())['siteUrl']).rstrip('/')+'/'
    parsed=urlsplit(base)
    if parsed.scheme not in ('http','https') or not parsed.netloc or parsed.query or parsed.fragment: raise SystemExit('Invalid SITE_URL')
    template=Template((ROOT/'tools/templates/day.html').read_text())
    for r in records:
        folder=SITE/'d'/r['date'];folder.mkdir(parents=True,exist_ok=True)
        url=base+'d/'+r['date']+'/'
        fields=dict(title=r['gregorianEn']+' — '+r['formattedKm'],url=url,image=url+'og.png',gregorian_en=r['gregorianEn'],gregorian_km=r['gregorianKm'],lunar_km=r['formattedKm'],lunar_en=r['lunarEn'],sil='Today is Thngai Sil / ថ្ងៃនេះជាថ្ងៃសីល' if r['isSil'] else '',colour='Lucky colour: '+r['colour']['color']['en']+' / '+r['colour']['color']['km'],holiday=holiday_line(r))
        (folder/'index.html').write_text(template.substitute({k:html.escape(v,quote=True) for k,v in fields.items()}))
        render(folder/'og.png',r,base)
    daily=SITE/'d';daily.mkdir(exist_ok=True)
    current=next((r for r in records if r['date']==str(today)),None)
    if current:
        shutil.copyfile(daily/str(today)/'og.png',SITE/'og-today.png')
        (daily/'latest.json').write_text(json.dumps({'date':str(today),'path':f'd/{today}/'})+'\n')
    render(SITE/'og-image.png',None,base)
    p=SITE/'index.html';s=p.read_text();tags=f'''<!-- og:start -->
<link rel="canonical" href="{html.escape(base)}">
<meta property="og:title" content="Today in Khmer / ប្រតិទិនខ្មែរថ្ងៃនេះ"><meta property="og:description" content="Your lunar date, holy day and weekday colour.">
<meta property="og:url" content="{html.escape(base)}"><meta property="og:type" content="website">
<meta property="og:image" content="{html.escape(base)}og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta name="twitter:card" content="summary_large_image">
<!-- og:end -->''';p.write_text(re.sub(r'<!-- og:start -->.*?<!-- og:end -->',lambda _:tags,s,flags=re.S))
    for folder in daily.iterdir():
        if folder.is_dir() and re.fullmatch(r'\d{4}-\d{2}-\d{2}',folder.name) and date.fromisoformat(folder.name)<today-timedelta(days=14):shutil.rmtree(folder)
    print(f'Built {len(records)} daily pages and shaped cards; base={base}')
if __name__=='__main__':build()
