#!/usr/bin/env python3
"""Normalize a JSON feed or RSS/Atom into the static content file."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

TARGET = Path(__file__).resolve().parents[1] / 'site/data/content.json'

def normalize(raw):
    items = raw.get('items', []) if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        raise ValueError('JSON source must be a list or contain an items list')
    return [{'title': str(item.get('title', '')).strip(),
             'title_km': str(item.get('title_km', '')).strip(),
             'url': str(item.get('url', item.get('link', ''))).strip()}
            for item in items if isinstance(item, dict) and item.get('title')][:100]

def main():
    source = os.environ.get('CONTENT_SOURCE_URL', '').strip()
    if source:
        with urlopen(Request(source, headers={'User-Agent': 'Seed-content/1.0'}), timeout=30) as response:
            body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ValueError('Source exceeds 2 MB')
        if body.lstrip().startswith((b'{', b'[')):
            items = normalize(json.loads(body))
        else:
            root = ET.fromstring(body)
            entries = root.findall('.//item') or root.findall('{http://www.w3.org/2005/Atom}entry')
            rows = []
            for entry in entries:
                fields = {child.tag.split('}')[-1]: child for child in entry}
                title = fields.get('title')
                link = fields.get('link')
                rows.append({'title': ''.join(title.itertext()) if title is not None else '',
                             'url': (link.get('href') or link.text or '') if link is not None else ''})
            items = normalize(rows)
    else:
        items = [{'title': 'A place for your next idea', 'title_km': 'កន្លែងសម្រាប់គំនិតថ្មីរបស់អ្នក', 'url': 'https://example.com/'}]
    previous = json.loads(TARGET.read_text()) if TARGET.exists() else {}
    # Preserve the timestamp on unchanged fetched feeds; sample mode demonstrates the cron heartbeat.
    if source and previous.get('items') == items:
        print(f'Unchanged: {len(items)} items')
        return
    data = {'updated': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'), 'items': items}
    serialized = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if TARGET.exists() and TARGET.read_text() == serialized:
        print(f'Unchanged: {len(items)} items')
        return
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    temporary = TARGET.with_suffix('.tmp')
    temporary.write_text(serialized, encoding='utf-8')
    temporary.replace(TARGET)
    print(f'Updated: {len(items)} items')

if __name__ == '__main__':
    main()
