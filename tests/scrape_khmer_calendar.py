#!/usr/bin/env python3
"""Fetch day pages from khmer-calendar.com and save parsed fixtures (offline-repeatable tests).
Usage: python3 tests/scrape_khmer_calendar.py 2026-10-16 60
Raw HTML is NOT stored (copyright); only the parsed facts per day are saved to
tests/fixtures/khmer-calendar-com/<start>_<days>.json"""
import sys, re, json, html, time, datetime, urllib.request, pathlib
UA = {'User-Agent': 'Mozilla/5.0 (startup24 calendar cross-check; low volume)'}
def text(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        s = r.read().decode('utf8', 'replace')
    s = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
    s = re.sub(r'<[^>]+>', ' ', s)
    return html.unescape(re.sub(r'\s+', ' ', s))
EN = re.compile(r'Weekday (\w+) Lunar (?:\S+ )?(\d+) (Koeut|Roach) (.+?) Year of (.+?) Lunar month (.+?) B\.E\. (\d+) Sak Era (\S+)')
SIL = re.compile(r'Thngai Sil \((\d+) (Waxing|Waning)\)')
COLOR_EN = re.compile(r'Lucky colou?r (.+?), face')
COLOR_KM = re.compile(r'ពណ៌នាំសំណាង(\S+?) ទិស')
def main():
    start = datetime.date.fromisoformat(sys.argv[1]); days = int(sys.argv[2])
    out = []
    for i in range(days):
        d = start + datetime.timedelta(days=i)
        url = f'https://khmer-calendar.com/en/{d.year}/{d.month}/{d.day}'
        t = text(url); m = EN.search(t)
        if not m:
            raise SystemExit(f'parse failed for {url}: {t[:400]}')
        rec = {'date': d.isoformat(), 'url': url, 'weekday': m[1], 'lunarDay': int(m[2]),
               'phase': 'waxing' if m[3] == 'Koeut' else 'waning', 'lunarMonth': m[6].strip(),
               'animalYear': m[5].strip(), 'beYear': int(m[7]), 'sak': m[8]}
        sm = SIL.search(t)  # event blocks may sit between 'Sak Era' and the Sil badge
        rec['thngaiSil'] = bool(sm) or 'This is a Thngai Sil holy day' in t
        rec['silLabel'] = f'{sm[1]} {sm[2]}' if sm else None
        c = COLOR_EN.search(t); rec['luckyColorEn'] = c[1] if c else None
        tk = text(f'https://khmer-calendar.com/km/{d.year}/{d.month}/{d.day}')
        c = COLOR_KM.search(tk); rec['luckyColorKm'] = c[1] if c else None
        out.append(rec); print(rec['date'], rec['lunarDay'], rec['phase'], rec['lunarMonth'], 'SIL' if rec['thngaiSil'] else '', rec['luckyColorEn'], flush=True)
        time.sleep(0.7)
    p = pathlib.Path(__file__).parent / 'fixtures' / 'khmer-calendar-com' / f'{start.isoformat()}_{days}.json'
    p.write_text(json.dumps({'source': 'https://khmer-calendar.com', 'fetched': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'days': out}, ensure_ascii=False, indent=1))
    print('saved', p)
main()
