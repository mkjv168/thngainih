"""Shared RAQM font fitting; quiz rendering retains its original metrics."""
from pathlib import Path
from PIL import ImageFont
FONTS = Path(__file__).resolve().parent / "fonts"

def font(size, bold=False):
    return ImageFont.truetype(str(FONTS / ('NotoSansKhmer-Bold.ttf' if bold else 'NotoSansKhmer-Regular.ttf')), size, layout_engine=ImageFont.Layout.RAQM)

def wrap(draw, text, face, width, language):
    # Prefer spaces; Khmer names may have no spaces, so shrink before wrapping clusters.
    lines, line = [], ''
    for word in text.split():
        candidate = (line + ' ' + word).strip()
        if line and draw.textlength(candidate, font=face, language=language) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    return lines + [line]

def fitted(draw, text, size, width, language, bold=False, max_lines=2):
    for value in range(size, 17, -1):
        face = font(value, bold)
        lines = wrap(draw, text, face, width, language)
        if len(lines) <= max_lines and all(draw.textlength(line, font=face, language=language) <= width for line in lines):
            return face, lines, value
    raise ValueError('Text cannot fit safely: ' + text)

