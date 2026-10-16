#!/usr/bin/env python3
"""Deterministic static quiz pages and RAQM-shaped social cards."""
import html
import json
import os
import re
from pathlib import Path
from string import Template
from urllib.parse import quote, urlencode, urlsplit
from PIL import Image, ImageDraw, ImageFont, features

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
FONTS = ROOT / 'tools/fonts'

from cardlib import font, wrap, fitted

def card(path, result, quiz, base):
    color = result['color']
    rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
    def linear(x):
        x /= 255
        return x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4
    while (1.05 / (sum(w * linear(c) for w, c in zip((.2126, .7152, .0722), rgb)) + .05)) < 4.5:
        rgb = tuple(int(c * .94) for c in rgb)
    im = Image.new('RGB', (1200, 630), rgb)
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle((1005, 55, 1145, 195), radius=42, outline='white', width=4)
    draw.text((1075, 125), result['name']['en'][0], font=font(70, True), fill='white', anchor='mm', language='en')
    def text(text, y, size, lang, bold=False, width=1070, max_lines=2):
        face, lines, size = fitted(draw, text, size, width, lang, bold, max_lines)
        for line in lines:
            draw.text((65, y), line, font=face, fill='white', language=lang, anchor='lt')
            y += int(size * 1.5)
        return y
    text(quiz['title']['km'], 48, 25, 'km', width=900, max_lines=1)
    text(result['name']['km'], 170, 88, 'km', True, max_lines=2)
    text(result['name']['en'], 385, 39, 'en', True, max_lines=1)
    text(result['tagline']['en'], 451, 27, 'en', max_lines=1)
    draw.line((65, 523, 1135, 523), fill='white', width=1)
    text(urlsplit(base).netloc + urlsplit(base).path.rstrip('/'), 542, 19, 'en', max_lines=1)
    text('Which Khmer dish are you? / តើអ្នកជាម្ហូបខ្មែរមួយណា?', 579, 22, 'km', max_lines=1)
    im.save(path, optimize=True)

def build():
    if not features.check('raqm'):
        raise SystemExit('ERROR: Pillow requires RAQM; without it Khmer shaping would break. Install libraqm, FriBidi, HarfBuzz and a RAQM-enabled Pillow. No BASIC fallback is allowed.')
    quiz = json.loads((SITE / 'quiz/quiz.json').read_text())
    config = json.loads((ROOT / 'tools/site.json').read_text())
    base = os.environ.get('SITE_URL', config['siteUrl']).rstrip('/') + '/'
    parsed = urlsplit(base)
    if parsed.scheme not in ('https', 'http') or not parsed.netloc or parsed.query or parsed.fragment:
        raise SystemExit('SITE_URL must be an absolute HTTP(S) base URL without query or fragment')
    ids = [r['id'] for r in quiz['results']]
    assert len(ids) == len(set(ids)) and all(re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*', id) for id in ids), 'Invalid result IDs'
    assert set(quiz['tiebreak']) == set(ids) and len(quiz['tiebreak']) == len(ids), 'Invalid tiebreak'
    for question in quiz['questions']:
        assert question['answers'], 'Question needs answers'
        for answer in question['answers']:
            assert all(id in ids and isinstance(score, (int, float)) for id, score in answer['scores'].items()), 'Invalid scores'
    template = Template((ROOT / 'tools/templates/result.html').read_text())
    for result in quiz['results']:
        assert re.fullmatch('#[0-9a-fA-F]{6}', result['color']), 'Invalid color'
        folder = SITE / 'r' / result['id']
        folder.mkdir(parents=True, exist_ok=True)
        url = base + 'r/' + result['id'] + '/'
        share = url + '?' + urlencode({'src': 'share', 'vs': result['id']})
        title = "I'm " + result['name']['en'] + ' — ' + quiz['title']['en']
        fields = dict(title=title, tagline=result['tagline']['en'], url=url, image=url+'og.png', alt=result['name']['en']+' / '+result['name']['km'], site_name=config['name']['en'], id=result['id'], emoji=result['emoji'], name_en=result['name']['en'], name_km=result['name']['km'], description=result['description']['en'], encoded=quote(share, safe=''), facebook='https://www.facebook.com/sharer/sharer.php?'+urlencode({'u':share}), telegram='https://t.me/share/url?'+urlencode({'url':share,'text':title}))
        (folder / 'index.html').write_text(template.substitute({key: html.escape(value, quote=True) for key, value in fields.items()}))
        card(folder / 'og.png', result, quiz, base)
    (SITE / 'r/index.json').write_text(json.dumps({'results': quiz['results']}, ensure_ascii=False, indent=2)+'\n')
    generic = dict(name={'en': 'Which Khmer dish are you?', 'km': 'តើអ្នកជាម្ហូបខ្មែរមួយណា?'}, color='#123d35', tagline=quiz['intro'])
    from build_daily import render
    render(SITE / 'og-image.png', None, base)
    esc = lambda value: html.escape(value, quote=True)
    tags = f'''<!-- og:start -->
<link rel="canonical" href="{esc(base)}">
<meta property="og:title" content="{esc('Today in Khmer / ប្រតិទិនខ្មែរថ្ងៃនេះ')}"><meta property="og:description" content="{esc('Your lunar date, holy day and weekday colour.')}">
<meta property="og:url" content="{esc(base)}"><meta property="og:type" content="website">
<meta property="og:image" content="{esc(base)}og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="{esc('Today in Khmer / ប្រតិទិនខ្មែរថ្ងៃនេះ')}">
<meta property="og:locale" content="en_US"><meta property="og:locale:alternate" content="km_KH"><meta name="twitter:card" content="summary_large_image">
<!-- og:end -->'''
    index = SITE / 'index.html'
    source = index.read_text()
    assert source.count('<!-- og:start -->') == source.count('<!-- og:end -->') == 1, 'Missing OG markers'
    index.write_text(re.sub(r'<!-- og:start -->.*?<!-- og:end -->', lambda _: tags, source, flags=re.S))
    print(f'Built {len(ids)} result pages, {len(ids)+1} cards (1200×630, RAQM), index.json and index OG tags; base={base}')

if __name__ == '__main__':
    build()
