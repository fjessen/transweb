#!/usr/bin/env python3
"""Generates the Transweb brand kit: SVG logos (text outlined), favicons, manifest, palette."""
import os, json, subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = os.path.dirname(os.path.abspath(__file__)) + "/assets"
os.makedirs(OUT + "/favicon", exist_ok=True)

NAVY, TEAL, TEAL_LIGHT, AMBER, WHITE = "#0B2A3C", "#087D7A", "#3FC1B8", "#F2A900", "#FFFFFF"

def text_path(text, font_path, size, x=0, y=0, tracking=0):
    f = TTFont(font_path); gs = f.getGlyphSet(); cmap = f.getBestCmap()
    scale = size / f["head"].unitsPerEm
    d, cx, parts = "", x, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (scale, 0, 0, -scale, cx, y))
        gs[g].draw(tp)
        parts.append(pen.getCommands())
        cx += gs[g].width * scale + tracking
    return parts, cx

FONT = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"

CYAN = "#6FE7F2"
HEX = "64,6 114,35 114,93 64,122 14,93 14,35"

def mark(cx=0, cy=0, s=1.0, hex_fill=NAVY, node=AMBER, uid="a", detail=True, **_):
    """Hexagonal logistics web: a T-shaped trunk route over a mesh that reaches out in every direction
    (land, sea, air, rail), an orbit ring for global reach, and an amber destination node."""
    g = f'<g transform="translate({cx} {cy}) scale({s})" fill="none" stroke-linecap="round" stroke-linejoin="round">'
    g += (f'<defs><linearGradient id="g{uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{CYAN}"/>'
          f'<stop offset="1" stop-color="{TEAL}"/></linearGradient>'
          f'<clipPath id="c{uid}"><polygon points="{HEX}"/></clipPath></defs>')
    g += f'<polygon points="{HEX}" fill="{hex_fill}" stroke="url(#g{uid})" stroke-width="3.5"/>'
    g += f'<g clip-path="url(#c{uid})">'
    if detail:
        g += f'<ellipse cx="64" cy="64" rx="46" ry="15" transform="rotate(-24 64 64)" stroke="{CYAN}" stroke-width="1.3" opacity=".5"/>'
        mesh = "M30 44L24 82M98 44L104 82M24 82L64 100M104 82L64 100M24 82L64 72M104 82L64 72M30 44L64 72M98 44L64 72"
        g += f'<path d="{mesh}" stroke="{TEAL_LIGHT}" stroke-width="1.6" opacity=".55"/>'
    else:
        g += f'<path d="M24 82L64 100L104 82M24 82L64 72L104 82" stroke="{TEAL_LIGHT}" stroke-width="3" opacity=".7"/>'
    g += '</g>'
    # trunk route: the "T"
    g += f'<path d="M30 44H98M64 44V92" stroke="url(#g{uid})" stroke-width="{7 if detail else 10}"/>'
    g += f'<path d="M30 44H98M64 44V92" stroke="#FFFFFF" stroke-width="2.2" opacity=".9"/>'
    for x, y, r in [(30, 44, 5.5), (64, 44, 5.5), (98, 44, 5.5), (64, 72, 4.5)]:
        g += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{hex_fill}" stroke="{CYAN}" stroke-width="2.2"/>'
    for x, y in [(24, 82), (104, 82)]:
        g += f'<circle cx="{x}" cy="{y}" r="3.6" fill="{TEAL_LIGHT}" stroke="none"/>'
    g += f'<circle cx="64" cy="100" r="13" stroke="{node}" stroke-width="1.6" opacity=".55"/>'
    g += f'<circle cx="64" cy="100" r="8" fill="{node}" stroke="none"/>'
    g += '</g>'
    return g

def icon_svg(bg=NAVY, detail=True, **kw):
    hf = kw.pop("hex_fill", "#0F3A52" if bg == NAVY else NAVY)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">'
            f'<rect width="128" height="128" rx="30" fill="{bg}"/>' + mark(cx=9.6, cy=9.6, s=.85, hex_fill=hf, uid="i", detail=detail) + '</svg>')

def wordmark(trans_color, web_color, *_ignored, height=137):
    on_dark = trans_color == WHITE
    hf = "#0F3A52" if on_dark else NAVY
    FONT_W = "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf"
    size = 62
    p1, x1 = text_path("TRANS", FONT_W, size, x=0, y=0, tracking=7)
    p2, x2 = text_path("WEB", FONT_W, size, x=x1, y=0, tracking=7)
    tx, ty = 136, 88
    w = int(tx + x2 + 6)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {height}" width="{w}" height="{height}">'
    svg += mark(cx=0, cy=4, hex_fill=hf, uid="w")
    svg += f'<g transform="translate({tx} {ty})"><path fill="{trans_color}" d="{"".join(p1)}"/>'
    svg += f'<path fill="{web_color}" d="{"".join(p2)}"/></g>'
    svg += f'<g transform="translate({tx} {ty+22})"><rect width="44" height="4" rx="2" fill="{AMBER}"/></g></svg>'
    return svg


def write(path, s):
    with open(path, "w") as f: f.write(s)

# Icons
write(f"{OUT}/icon.svg", icon_svg())
write(f"{OUT}/icon-small.svg", icon_svg(detail=False))
write(f"{OUT}/icon-light.svg", icon_svg(bg="#E6F6F5", bar=NAVY, stem=TEAL))
# Logos (outlined text)
write(f"{OUT}/transweb-logo.svg", wordmark(NAVY, TEAL, NAVY, WHITE, TEAL_LIGHT, AMBER))              # for light backgrounds
write(f"{OUT}/transweb-logo-on-dark.svg", wordmark(WHITE, TEAL_LIGHT, TEAL, WHITE, NAVY, AMBER))     # for dark backgrounds
# console uses fleetbase-logo-svg.svg on a DARK onboarding bg (white text) -> ship the on-dark version under that name too
write(f"{OUT}/transweb-logo-svg.svg", open(f"{OUT}/transweb-logo-on-dark.svg").read())

def png(svg, out, size):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), svg, "-o", out], check=True)

for s, name in [(16, "favicon-16x16.png"), (32, "favicon-32x32.png"), (57, "apple-touch-icon-57x57.png"),
                (60, "apple-touch-icon-60x60.png"), (72, "apple-touch-icon-72x72.png"), (76, "apple-touch-icon-76x76.png"),
                (114, "apple-touch-icon-114x114.png"), (120, "apple-touch-icon-120x120.png"), (144, "apple-touch-icon-144x144.png"),
                (152, "apple-touch-icon-152x152.png"), (180, "apple-touch-icon-180x180.png"), (180, "apple-touch-icon.png"),
                (192, "android-chrome-192x192.png"), (256, "android-chrome-256x256.png"), (150, "mstile-150x150.png")]:
    png(f"{OUT}/icon-small.svg" if s <= 76 else f"{OUT}/icon.svg", f"{OUT}/favicon/{name}", s)
png(f"{OUT}/icon.svg", f"{OUT}/icon.png", 512)

# favicon.ico (16/32/48)
from PIL import Image
for s in (48,): png(f"{OUT}/icon.svg", f"/tmp/_ico{s}.png", s)
im = Image.open(f"{OUT}/favicon/favicon-32x32.png")
im.save(f"{OUT}/favicon/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
im.save(f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# Safari pinned tab (monochrome)
write(f"{OUT}/favicon/safari-pinned-tab.svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><polygon points="64,6 114,35 114,93 64,122 14,93 14,35" fill="none" stroke="#000" stroke-width="5"/><path d="M30 44H98M64 44V92" stroke="#000" stroke-width="8" stroke-linecap="round"/><circle cx="64" cy="100" r="8"/></svg>')

write(f"{OUT}/favicon/site.webmanifest", json.dumps({
    "name": "Transweb", "short_name": "Transweb", "theme_color": NAVY, "background_color": NAVY, "display": "standalone",
    "icons": [{"src": "/favicon/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "/favicon/android-chrome-256x256.png", "sizes": "256x256", "type": "image/png"}]}, indent=4))
write(f"{OUT}/favicon/browserconfig.xml",
      f'<?xml version="1.0" encoding="utf-8"?><browserconfig><msapplication><tile><square150x150logo src="/favicon/mstile-150x150.png"/><TileColor>{NAVY}</TileColor></tile></msapplication></browserconfig>')

# Social/OG preview 1200x630
og = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
      f'<rect width="1200" height="630" fill="{NAVY}"/>'
      f'<g opacity=".12" stroke="{TEAL_LIGHT}" stroke-width="2" fill="none"><path d="M0 520C250 430 420 560 700 440S1050 330 1200 380"/><path d="M0 560C260 480 430 600 710 490S1060 390 1200 430"/></g>'
      f'<g transform="translate(110 150) scale(2.4)">{mark()}</g>')
p1, x1 = text_path("Transweb", FONT, 120, x=0, y=0)
og += f'<g transform="translate(400 330)"><path fill="{WHITE}" d="{"".join(p1)}"/></g>'
p2, _ = text_path("Logística e mobilidade para Moçambique", "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf", 36, x=0, y=0)
og += f'<g transform="translate(404 400)"><path fill="{TEAL_LIGHT}" d="{"".join(p2)}"/></g>'
og += f'<rect x="404" y="440" width="120" height="8" rx="4" fill="{AMBER}"/></svg>'
write(f"{OUT}/og-image.svg", og)
subprocess.run(["rsvg-convert", "-w", "1200", f"{OUT}/og-image.svg", "-o", f"{OUT}/og-image.png"], check=True)

# Palette
def lum(h):
    h = h.lstrip("#"); r, g, b = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    f = lambda c: c/12.92 if c <= .03928 else ((c+.055)/1.055)**2.4
    return .2126*f(r)+.7152*f(g)+.0722*f(b)
def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la+.05)/(lb+.05)

PRIMARY = {100: "#E3F5F4", 200: "#B7E5E2", 300: "#84D1CC", 400: "#4BBAB3", 500: "#1FA39C", 600: "#087D7A", 700: "#096E6D", 800: "#065253", 900: "#033637"}
json.dump({"primary": PRIMARY, "navy": NAVY, "amber": AMBER,
           "contrast_white_on_600": round(contrast("#FFFFFF", PRIMARY[600]), 2),
           "contrast_white_on_700": round(contrast("#FFFFFF", PRIMARY[700]), 2),
           "contrast_navy_on_amber": round(contrast(NAVY, AMBER), 2),
           "contrast_white_on_navy": round(contrast("#FFFFFF", NAVY), 2)},
          open(f"{OUT}/palette.json", "w"), indent=2)
print(open(f"{OUT}/palette.json").read())
