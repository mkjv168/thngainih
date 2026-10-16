#!/usr/bin/env python3
"""Build the single runtime stylesheet; URLs remain relative to site/ root."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
CSS_ORDER = ('fonts.css', 'theme.css', 'layout.css')


def build():
    source = '\n'.join((ROOT / 'site/css' / name).read_text() for name in CSS_ORDER)
    source = re.sub(r'/\*.*?\*/', '', source, flags=re.S)
    source = re.sub(r'\s+', ' ', source).strip()
    output = '/* Generated from site/css/*.css by tools/build_css.py - edit those files */\n' + source + '\n'
    (ROOT / 'site/styles.css').write_text(output)
    return output


if __name__ == '__main__':
    build()
