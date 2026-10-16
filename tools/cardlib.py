"""Shared RAQM font fitting; quiz rendering retains its original metrics."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageColor
import json
from functools import lru_cache

ROOT = Path(__file__).resolve().parent.parent
FONTS = Path(__file__).resolve().parent / "fonts"

def font(size, bold=False, path=None):
    return ImageFont.truetype(str(ROOT / path if path else FONTS / ('NotoSansKhmer-Bold.ttf' if bold else 'NotoSansKhmer-Regular.ttf')), size, layout_engine=ImageFont.Layout.RAQM)

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

def fitted(draw, text, size, width, language, bold=False, max_lines=2, font_path=None, min_size=18):
    for value in range(size, min_size - 1, -1):
        face = font(value, bold, font_path)
        lines = wrap(draw, text, face, width, language)
        if len(lines) <= max_lines and all(draw.textlength(line, font=face, language=language) <= width for line in lines):
            return face, lines, value
    raise ValueError('Text cannot fit safely: ' + text)



@lru_cache(maxsize=1)
def layouts():
    """Read the declarative layouts once per build process."""
    return json.loads((ROOT / 'tools/cards.json').read_text())


def render_card(layout_name, fields, out_path):
    """Draw a layout in order; all coordinates and styling live in cards.json.

    Image layers precede elements. Dish fallbacks occupy the same layer as a
    photo. Colours resolve palette names or field templates; text may also use
    an i18n key via {"local": "key", "lang": "km"} instead of a template.
    """
    from siteconfig import local
    layout = layouts()[layout_name]
    palette = layout['palette']

    def value(item):
        if item is None:
            return None
        item = item.format_map(fields)
        return palette.get(item, item)

    background = layout['background']
    if 'from' in background:
        rgb = ImageColor.getrgb(fields[background['from']])
        def luminance(colour):
            def linear(x):
                x /= 255
                return x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4
            return sum(w * linear(c) for w, c in zip((.2126, .7152, .0722), colour))
        target = luminance(ImageColor.getrgb(value(background['min_contrast_vs'])))
        while ((max(target, luminance(rgb)) + .05) /
               (min(target, luminance(rgb)) + .05)) < background['ratio']:
            darker = tuple(int(c * background['darken_step']) for c in rgb)
            if darker == rgb:
                raise ValueError('Background cannot reach requested contrast')
            rgb = darker
        colour = rgb
    else:
        colour = value(background['colour'])
    im = Image.new('RGB', tuple(layout['size']), colour)

    def paste_image(path, box, radius=0, cover=True):
        x, y, w, h = box
        with Image.open(ROOT / path) as source:
            source = source.convert('RGBA')
            source = (ImageOps.fit(source, (w, h)) if cover else source.resize((w, h)))
            if radius:
                mask = Image.new('L', (w, h))
                ImageDraw.Draw(mask).rounded_rectangle((0, 0, w-1, h-1), radius=radius, fill=255)
                from PIL import ImageChops
                source.putalpha(ImageChops.multiply(source.getchannel('A'), mask))
            im.paste(source, (x, y), source)

    if layout.get('background_image'):
        paste_image(value(layout['background_image']), (0, 0, *im.size))
    ornament = layout.get('ornament_image')
    if ornament:
        paste_image(value(ornament['path']), ornament['box'], cover=False)
    draw = ImageDraw.Draw(im)

    def element(item):
        if item.get('if') and not fields.get(item['if']):
            return
        kind = item['type']
        if kind == 'text':
            content = item.get('text', '')
            content = (local(content['local'], content.get('lang', item.get('lang', 'en')))
                       if isinstance(content, dict) else content.format_map(fields))
            style = item.get('font', 'bold' if item.get('bold') else 'regular')
            path = layout['fonts'][style]
            size = item['size']
            lang = item.get('lang', 'en')
            if 'width' in item:
                face, lines, size = fitted(draw, content, size, item['width'], lang,
                                          max_lines=item.get('max_lines', 2), font_path=path,
                                          min_size=layout['fonts'].get('min_size', 18))
            else:
                face, lines = font(size, path=path), [content]
            y = item['y']
            for line in lines:
                draw.text((item['x'], y), line, font=face, fill=value(item.get('fill')),
                          language=lang, anchor=item.get('anchor', 'lt'))
                y += int(size * item.get('line_height', 1.5))
        elif kind in ('rect', 'rounded_rect'):
            options = dict(fill=value(item.get('fill')), outline=value(item.get('outline')),
                           width=item.get('width', 1))
            if kind == 'rounded_rect':
                draw.rounded_rectangle(item['box'], radius=item.get('radius', 0), **options)
            else:
                draw.rectangle(item['box'], **options)
        elif kind == 'line':
            draw.line(item['xy'], fill=value(item.get('fill')), width=item.get('width', 1))
        else:
            raise ValueError('Unknown card element: ' + kind)

    dish = layout.get('dish_image')
    if dish:
        path = value(dish['source'])
        if (ROOT / path).is_file():
            paste_image(path, tuple(dish[k] for k in ('x', 'y', 'w', 'h')), dish.get('radius', 0))
        else:
            for item in dish.get('fallback', []):
                element(item)
    for item in layout['elements']:
        element(item)
    im.save(out_path, optimize=True)
