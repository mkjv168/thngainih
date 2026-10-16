"""Shared build configuration and translation helpers (offline)."""
import html
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parent.parent
SITE=ROOT/'site'
CONFIG=json.loads((ROOT/'tools/site.json').read_text())
STRINGS={lang:json.loads((SITE/f'i18n/{lang}.json').read_text()) for lang in ('en','km')}
def base_url():
    override=os.environ.get('SITE_URL')
    # Explicit local/custom-domain bases remain supported; Pages always uses slug.
    value=override or CONFIG['origin'].rstrip('/')+'/'+CONFIG['slug']+'/'
    p=urlsplit(value)
    if p.scheme not in ('http','https') or not p.netloc or p.query or p.fragment:raise ValueError('Invalid SITE_URL')
    if p.hostname and p.hostname.endswith('.github.io'):
        value=f'{p.scheme}://{p.netloc}/{CONFIG["slug"]}/'
    return value.rstrip('/')+'/'
def local(value,lang='en'):
    return STRINGS[lang].get(value,STRINGS['en'].get(value,value)) if isinstance(value,str) else value.get(lang,value.get('en',''))
def template(name):
    return re.sub(r'\{\{(en|km):([^}]+)\}\}',lambda m:html.escape(STRINGS[m[1]][m[2]],quote=True),(ROOT/'tools/templates'/name).read_text())
