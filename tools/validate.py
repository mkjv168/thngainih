#!/usr/bin/env python3
"""Offline checks shared by local HTTP checks and sandbox validation."""
import json
import os
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent / 'site'
class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.meta = {}
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[attrs.get('property', attrs.get('name'))] = attrs.get('content')

quiz = json.loads((root/'quiz/quiz.json').read_text())
config = json.loads((root.parent/'tools/site.json').read_text())
base = os.environ.get('SITE_URL', config['siteUrl']).rstrip('/')+'/'
for result in quiz['results']:
    text = (root/'r'/result['id']/'index.html').read_text()
    page = Page(text)
    url = base+'r/'+result['id']+'/'
    assert page.meta['og:image'] == url+'og.png'
    assert page.meta['og:url'] == url
    assert result['name']['en'] in text and result['name']['km'] in text
for path in [root/'og-image.png', *root.glob('r/*/og.png')]:
    with Image.open(path) as image:
        assert image.format == 'PNG' and image.size == (1200, 630), path
initial = [root/'index.html', root/'styles.css', *(root/'js').glob('*.js'), *(root/'js/modules').glob('*.js'), root/'assets/fonts/inter-latin-var.woff2']
total = sum(path.stat().st_size for path in initial)
assert total <= 150_000, f'Initial transfer {total} exceeds 150KB'
assert (root/'js/modules/quiz.js').stat().st_size < 6000, 'Quiz engine exceeds 6KB'
en, km = [json.loads((root/'i18n'/f'{lang}.json').read_text()) for lang in ('en','km')]
assert en.keys() == km.keys(), 'Translation dictionaries differ'
for path in [*root.rglob('*.json'), root/'manifest.webmanifest']:
    json.loads(path.read_text())
print(f'PASS: result metadata, PNG sizes, JSON, i18n; initial transfer {total:,}/150,000 bytes')
