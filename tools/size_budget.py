#!/usr/bin/env python3
"""Offline first-load accounting (deduplicated resources, gzip -9 estimates)."""
import argparse
import gzip
from html.parser import HTMLParser
import json
from pathlib import Path
import posixpath
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
URLS = re.compile(r'''url\(\s*['"]?([^'"\)]+)['"]?\s*\)''')
IMPORTS = re.compile(r'''\bimport\s+(?:[^;'"`]*?\s+from\s*)?['"]([^'"]+)['"]''')


def resolve(base, url):
    parts = urlsplit(url.strip())
    if parts.scheme or parts.netloc or not parts.path:
        return None
    path = unquote(parts.path)
    path = posixpath.normpath(path.lstrip('/') if path.startswith('/') else posixpath.join(posixpath.dirname(base), path))
    if path == '..' or path.startswith('../'):
        raise ValueError('Resource outside site: ' + url)
    return path


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.resources = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and set(attrs.get('rel', '').split()) & {'stylesheet', 'preload', 'manifest'}:
            self.resources.append((attrs.get('href', ''), 'css' if 'stylesheet' in attrs['rel'].split() else 'asset'))
        elif tag in ('script', 'img') and attrs.get('src'):
            self.resources.append((attrs['src'], 'module' if tag == 'script' and attrs.get('type') == 'module' else 'asset'))


def measure(page, runtime):
    found = set()
    processed = set()

    def add(path, kind='asset'):
        if path is None:
            return
        file = SITE / path
        if not file.is_file():
            raise ValueError('Missing resource: ' + path)
        found.add(path)
        if (path, kind) in processed:
            return
        processed.add((path, kind))
        if kind == 'module':
            for url in IMPORTS.findall(file.read_text()):
                if url.startswith(('./', '../', '/')):
                    add(resolve(path, url), 'module')
        elif kind == 'css':
            css = re.sub(r'/\*.*?\*/', '', file.read_text(), flags=re.S)
            faces = re.findall(r'@font-face\s*\{([^{}]*)\}', css)
            declarations = re.sub(r'@font-face\s*\{[^{}]*\}', '', css)
            # Token names need not contain "font": inspect all custom-property
            # values as well as literal font-family declarations. Ignore comments.
            values = re.findall(r'(?:font-family|--[\w-]+)\s*:\s*([^;{}]+)', declarations)
            active = {family.strip().strip('\'"').lower() for value in values for family in value.split(',')}
            for face in faces:
                match = re.search(r'font-family\s*:\s*([^;]+)', face)
                if match and match[1].strip().strip('\'"').lower() in active:
                    for url in URLS.findall(face):
                        add(resolve(path, url))
            for url in URLS.findall(declarations):
                add(resolve(path, url))


    html = page.lstrip('/') + 'index.html'
    add(html)
    parser = Resources()
    parser.feed((SITE / html).read_text())
    for url, kind in parser.resources:
        add(resolve(html, url), kind)
    for path in runtime:
        add(resolve('index.html', path), 'module' if path.endswith('.js') else 'asset')
    rows = []
    for path in sorted(found):
        data = (SITE / path).read_bytes()
        rows.append(dict(path=path, raw_bytes=len(data), gzip_bytes=len(gzip.compress(data, compresslevel=9, mtime=0))))
    return dict(resources=rows, raw_bytes=sum(r['raw_bytes'] for r in rows), gzip_bytes=sum(r['gzip_bytes'] for r in rows))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    config = json.loads((ROOT / 'tools/budget.json').read_text())
    note = 'GitHub Pages serves gzip: gzip is the real transfer estimate; raw is the worst case.'
    try:
        pages = {page: measure(page, config['runtime'][page]) for page in ('/', '/quiz/')}
    except (OSError, ValueError, KeyError) as error:
        if args.json:
            print(json.dumps({'error': str(error)}))
        else:
            print('ERROR:', error)
        return 1
    limit = config['limit_bytes']
    for result in pages.values():
        result['passed'] = max(result['raw_bytes'], result['gzip_bytes']) <= limit
    if args.json:
        print(json.dumps(dict(note=note, limit_bytes=limit, pages=pages), indent=2))
    else:
        print(note)
        for page, result in pages.items():
            print(f'\n{page} (limit {limit:,} bytes for each total)')
            print(f'{"Path":60} {"Raw bytes":>12} {"Gzip -9":>12}')
            for row in result['resources']:
                print(f'{row["path"]:60} {row["raw_bytes"]:12,} {row["gzip_bytes"]:12,}')
            print(f'{"TOTAL":60} {result["raw_bytes"]:12,} {result["gzip_bytes"]:12,} ' + ('PASS' if result['passed'] else 'FAIL'))
    return int(any(not result['passed'] for result in pages.values()))


if __name__ == '__main__':
    raise SystemExit(main())
