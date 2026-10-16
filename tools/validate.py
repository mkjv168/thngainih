#!/usr/bin/env python3
"""Offline checks shared by local HTTP checks and sandbox validation."""
import json
import os
import re
from siteconfig import base_url, STRINGS, local
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
base = base_url()
for result in quiz['results']:
    text = (root/'r'/result['id']/'index.html').read_text()
    page = Page(text)
    url = base+'r/'+result['id']+'/'
    assert page.meta['og:image'] == url+'og.png'
    assert page.meta['og:url'] == url
    assert local(result['name']) in text and local(result['name'],'km') in text
assert 'data-module="today"' in (root/'index.html').read_text()
assert 'data-module="quiz"' in (root/'quiz/index.html').read_text()
assert Page((root/'index.html').read_text()).meta['og:image'] == base+'og-image.png'
for folder in (root/'d').iterdir():
    if not folder.is_dir(): continue
    page=Page((folder/'index.html').read_text())
    assert page.meta['og:image']==base+'d/'+folder.name+'/og.png'
    assert page.meta['og:url']==base+'d/'+folder.name+'/'
for path in [root/'og-image.png', root/'og-today.png', *root.glob('r/*/og.png'), *root.glob('d/*/og.png')]:
    with Image.open(path) as image:
        assert image.format == 'PNG' and image.size == (1200, 630), path
for result in quiz['results']:
    path = root/'r'/result['id']/'story.png'
    with Image.open(path) as image:
        assert image.format == 'PNG' and image.size == (1080, 1350), path
initial = [root/'index.html', root/'styles.css', *(root/'js').glob('*.js'), *(root/'js/modules').glob('*.js'), *(root/'js/lib').glob('*.js'), root/'js/vendor/momentkh.js', root/'assets/fonts/inter-latin-var.woff2']
initial += [root/'i18n/en.json',root/'i18n/km.json',root/'assets/fonts/kantumruy-khmer-var.woff2']
total = sum(path.stat().st_size for path in initial)
assert total <= 250_000, f'Initial transfer {total} exceeds 250KB'
assert (root/'js/modules/quiz.js').stat().st_size < 9000, 'Quiz engine exceeds 9KB'
en, km = [json.loads((root/'i18n'/f'{lang}.json').read_text()) for lang in ('en','km')]
assert en.keys() == km.keys(), 'Translation dictionaries differ'
assert not re.search(r'[\u1780-\u17ff]',json.dumps(en,ensure_ascii=False)), 'Khmer must live only in km.json'
for path in [*root.rglob('*.json'), root/'manifest.webmanifest']:
    json.loads(path.read_text())
# Khmer belongs only to the translation source, vendor, and generated HTML.
generated={root/'index.html',root/'404.html',root/'quiz/index.html',root/'privacy/index.html'}
violations=[]
for folder in (root,root.parent/'tools'):
    for path in folder.rglob('*'):
        if not path.is_file() or path.suffix not in ('.js','.mjs','.py','.html','.json','.webmanifest','.svg','.txt'):continue
        if path == root.parent/'tools/fonts/moul-text.txt':continue
        if path == root.parent/'tools/km_review.json': continue  # review sheet quotes km.json strings for native reviewers
        if path in generated or root/'i18n' in path.parents or root/'js/vendor' in path.parents or root/'r' in path.parents or root/'d' in path.parents:continue
        if re.search(r'[\u1780-\u17ff]',path.read_text()):violations.append(str(path))
assert not violations, 'Embedded Khmer outside i18n: '+', '.join(violations)
assert 'privacy/' in (root/'sw.js').read_text()
for path in [root/'index.html',root/'quiz/index.html',*root.glob('r/*/index.html'),*root.glob('d/*/index.html')]:
    assert 'privacy/' in path.read_text(),f'Missing privacy link: {path}'
manifest=json.loads((root/'manifest.webmanifest').read_text())
assert manifest['scope']==__import__('urllib.parse',fromlist=['urlsplit']).urlsplit(base).path
assert config['slug'] in (root/'js/config.js').read_text()
print(f'PASS: result metadata, PNG sizes, JSON, i18n; initial transfer {total:,}/250,000 bytes')
