"""Offline Silk & Kbach cards: Pillow/RAQM only; declarative CSS-like flow."""
from pathlib import Path
from functools import lru_cache
import json
import math
import shutil
import struct
import subprocess
import tempfile
import os
from PIL import Image, ImageDraw, ImageFont, ImageColor, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'tools/card-assets'

@lru_cache(None)
def cmap(path):
    """Read Unicode cmap formats 4/12 without an extra CI dependency."""
    data = (ROOT / path).read_bytes()
    u16 = lambda p: struct.unpack_from('>H', data, p)[0]
    u32 = lambda p: struct.unpack_from('>I', data, p)[0]
    table = next(u32(p+8) for p in range(12, 12+16*u16(4), 16) if data[p:p+4] == b'cmap')
    chars = set()
    for p in range(table+4, table+4+8*u16(table+2), 8):
        sub = table+u32(p+4)
        if u16(sub) == 12:
            for q in range(sub+16, sub+16+12*u32(sub+12), 12):
                start, end, glyph = struct.unpack_from('>III', data, q)
                chars.update(c for c in range(start, end+1) if glyph+c-start)
        elif u16(sub) == 4:
            n = u16(sub+6)//2
            for i in range(n):
                end, start = u16(sub+14+2*i), u16(sub+16+2*n+2*i)
                delta = u16(sub+16+4*n+2*i)
                offpos = sub+16+6*n+2*i
                off = u16(offpos)
                for c in range(start, min(end, 65534)+1):
                    glyph = u16(offpos+off+2*(c-start)) if off else c
                    if glyph and (glyph+delta)%65536: chars.add(c)
    return chars

@lru_cache(None)
def font(path, size, weight=400):
    face = ImageFont.truetype(str(ROOT/path), size, layout_engine=ImageFont.Layout.RAQM)
    axes = face.get_variation_axes() if 'Moul' not in path else []
    if axes:
        face.set_variation_by_axes([weight if a['name'] == b'Weight' else a['default'] for a in axes])
    return face

@lru_cache(None)
def layouts():
    return json.loads((ROOT/'tools/cards.json').read_text())

@lru_cache(None)
def asset(name):
    return Image.open(ASSETS/name).convert('RGBA')

@lru_cache(None)
def silk(size, deep, main, sheen):
    w,h=size
    dx,dy=math.sin(math.radians(118)), -math.cos(math.radians(118))
    length=w*dx+h*dy
    stops=[(-.1,deep),(.3,main),(.48,sheen),(.64,main),(1.2,deep)]
    stops=[(p,ImageColor.getrgb(c)) for p,c in stops]
    colors=[]
    for i in range(4096):
        t=i/4095
        a,b=next((a,b) for a,b in zip(stops,stops[1:]) if a[0]<=t<=b[0])
        f=(t-a[0])/(b[0]-a[0]); colors.append(tuple(round(x+(y-x)*f) for x,y in zip(a[1],b[1])))
    lut=Image.new('RGB',(4096,1));lut.putdata(colors)
    im=lut.transform(size,Image.Transform.AFFINE,(4095*dx/length,4095*dy/length,0,0,0,0),Image.Resampling.BILINEAR)
    weave=Image.new('RGBA',size); d=ImageDraw.Draw(weave)
    for x in range(0,w,3): d.line((x,0,x,h),fill=(255,255,255,9))
    return Image.alpha_composite(im.convert('RGBA'),weave).convert('RGB')

@lru_cache(None)
def radial(size, story):
    im=Image.new('RGBA',(size,size)); pixels=[]
    for y in range(size):
        for x in range(size):
            if math.hypot(x-size/2,y-size/2)>size/2: pixels.append((0,0,0,0));continue
            t=min(1,math.hypot(x-size*.5,y-size*.42)/(math.hypot(size*.5,size*.58)*.7))
            white=(.24 if story else .22)*(1-t)
            black=(.20 if story else .18)*t
            alpha=white+black
            color=round(255*white/alpha)
            pixels.append((color,color,color,round(alpha*255)))
    im.putdata(pixels);return im


@lru_cache(None)
def ring_mask(size, outer, inner):
    scale = 3
    mask = Image.new('L', (size*scale, size*scale))
    painter = ImageDraw.Draw(mask)
    for inset, width in [(0, outer), (outer, inner)]:
        lo = inset*scale
        hi = (size-inset)*scale-1
        painter.ellipse((lo, lo, hi, hi), outline=255, width=width*scale)
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def render_card(layout_name, fields, out_path):
    from siteconfig import local
    layout=layouts()[layout_name]; w,h=layout['size']
    im=silk((w,h),fields['deep'],fields['silk'],fields['sheen']).copy()
    draw=ImageDraw.Draw(im); fg=fields['fg'];gold=fields['gold']
    def mask(source,xy): im.paste(gold,xy,source.getchannel('A'))
    def text(item,y=None):
        content=item.get('text','')
        content=local(content['local'],item.get('lang','km')) if isinstance(content,dict) else content.format_map(fields)
        path=layout['fonts'][item.get('font','ui')];size=item['size'];lang=item.get('lang','km')
        missing=[c for c in content if not c.isspace() and ord(c) not in cmap(path)]
        if missing: raise ValueError(f'Missing glyphs in {path}: {missing!r}')
        face=font(path,size,item.get('weight',400))
        while item.get('width') and draw.textlength(content,font=face,language=lang)>item['width'] and size-4>=item['size']*.6:
            size-=4;face=font(path,size,item.get('weight',400))
        if item.get('width') and draw.textlength(content,font=face,language=lang)>item['width']: raise ValueError('Card text exceeds fit floor: '+content)
        # Centre glyphs in the CSS line box using font ascent/descent metrics.
        height=size*item.get('lh',1.6); ascent,descent=face.getmetrics()
        baseline=(y if y is not None else item['y'])+(height-ascent-descent)/2+ascent
        draw.text((item.get('x',w/2),baseline),content,font=face,fill=tuple(round(a*item.get('opacity',1)+b*(1-item.get('opacity',1))) for a,b in zip(ImageColor.getrgb(fg),im.getpixel((int(item.get('x',w/2)),min(h-1,max(0,int(baseline))))))),language=lang,anchor='ms' if item.get('center') else 'ls',stroke_width=0)
        return height
    def divider(item,y): mask(asset('divider-'+str(item['width'])+'.png'),(item.get('x',(w-item['width'])//2),round(y)))
    for item in layout['elements']:
        kind=item['type']
        if kind=='orn_strip':
            strip=asset(f"border-{item['height']}.png")
            for x in range(0,w,strip.width):
                mask(strip,(x,0));mask(ImageOps.flip(strip),(x,h-strip.height))
        elif kind=='orn_frame':
            s=item['width']; inset=item['inset']; src=asset(f'frame-{s*3}.png');tw,th=w-inset*2,h-inset*2
            for row in range(3):
                for col in range(3):
                    if row==col==1: continue
                    ww=s if col!=1 else tw-2*s;hh=s if row!=1 else th-2*s
                    tile=src.crop((col*s,row*s,(col+1)*s,(row+1)*s)).resize((ww,hh))
                    mask(tile,(inset+[0,s,tw-s][col],inset+[0,s,th-s][row]))
        elif kind=='medallion':
            x,y=item['x'],item['y'];s=item['size'];im.paste(radial(s,layout_name=='quiz_story'),(x,y),radial(s,layout_name=='quiz_story'))
            im.paste(gold, (x,y), ring_mask(s,item['ring_width'],item['inner_width']))
            if item.get('dish'):
                art=asset(fields['id']+'.png');im.paste(art,(x+50,y+40),art)
        elif kind=='text': text(item)
        elif kind=='flow':
            y=item['y']
            for child in item['children']:
                y+=child.get('mt',0)
                if child['type']=='text': y+=text(child,y)
                elif child['type']=='orn_divider': divider(child,y);y+=child['width']/10
                elif child['type']=='runs':
                    runs=child['runs']; widths=[]
                    for r in runs:
                        content=r['text'].format_map(fields);face=font(layout['fonts'][r['font']],child['size'],600)
                        if any(ord(c) not in cmap(layout['fonts'][r['font']]) for c in content if not c.isspace()): raise ValueError('Missing run glyph')
                        widths.append(draw.textlength(content,font=face,language=r['lang']))
                    x=(w-sum(widths))/2
                    for r,ww in zip(runs,widths): text(dict(r,x=x,size=child['size'],weight=600),y);x+=ww
                    y+=child['size']*1.5
        elif kind=='orn_divider': divider(item,item['y'])
        elif kind=='week_strip':
            colors=json.loads((ROOT/'site/data/day-colors.json').read_text())['weekdays'];x=item['x'];y=item['y']
            for i,c in enumerate(colors):
                ww=70 if i==fields['dow'] else 30
                draw.rounded_rectangle((x,y,x+ww,y+30),radius=15,fill=fg if i==fields['dow'] else c['silk'],outline=fg,width=2);x+=ww+14
        elif kind=='pill' and fields.get('is_sil'):
            draw.rounded_rectangle(item['box'],radius=22,outline=gold,width=2);text(item)
    # Publish atomically so concurrent page builds/previews never see partial PNGs.
    with tempfile.NamedTemporaryFile(suffix='.png', dir=Path(out_path).parent, delete=False) as tmp:
        temporary = Path(tmp.name)
    try:
        im.save(temporary, optimize=True)
        if shutil.which('pngquant'):
            result = subprocess.run(['pngquant','--quality','70-90','--speed','1','--strip','--force','--output',str(temporary),str(temporary)])
            if result.returncode not in (0, 99):
                raise RuntimeError('pngquant failed: '+str(result.returncode))
        os.replace(temporary, out_path)
    finally:
        temporary.unlink(missing_ok=True)
