#!/usr/bin/env python3
"""Prépare les images du site à partir des originaux placés à la racine du projet.

    python src/images.py

Produit dans assets/img : portrait recadré (WebP), logos associatifs réduits,
favicons et visuels de partage (Open Graph). Dépendance : Pillow.
À relancer seulement si une image source change.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"
FONTS = Path("C:/Windows/Fonts")
BG = (5, 9, 18)
ACCENT = (52, 216, 245)
MINT = (110, 231, 200)
WARM = (246, 181, 69)
TEXT = (233, 239, 248)
MUTED = (166, 181, 202)
DIM = (125, 142, 168)


def font(name, size):
    try:
        return ImageFont.truetype(str(FONTS / name), size)
    except OSError:
        return ImageFont.load_default()


def portrait():
    im = Image.open(ROOT / "ali_photo.jpg").convert("RGB")
    crop = im.crop((240, 60, 960, 960))  # cadrage buste, ratio 4:5
    for width in (700, 420):
        crop.resize((width, width * 5 // 4), Image.LANCZOS).save(OUT / f"portrait-{width}.webp", "WEBP", quality=82, method=6)


def logos():
    for src, dst in (("ESN_logo.png", "logo-esn.png"), ("EP_logo.png", "logo-electro-power.png"), ("Enactus_logo.png", "logo-enactus.png")):
        im = Image.open(ROOT / src).convert("RGBA")
        im.thumbnail((192, 192), Image.LANCZOS)
        im.save(OUT / dst, "PNG", optimize=True)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def monogram(size):
    scale = 4
    s = size * scale
    grad = Image.new("RGB", (s, s))
    px = grad.load()
    for y in range(s):
        for x in range(s):
            px[x, y] = lerp(ACCENT, MINT, (x + y) / (2 * s))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.24), fill=255)
    tile = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    tile.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(tile)
    f = font("segoeuib.ttf", int(s * 0.5))
    box = d.textbbox((0, 0), "AA", font=f)
    d.text(((s - (box[2] - box[0])) / 2 - box[0], (s - (box[3] - box[1])) / 2 - box[1]), "AA", font=f, fill=(3, 18, 26))
    return tile.resize((size, size), Image.LANCZOS)


def favicons():
    monogram(32).save(OUT / "favicon-32.png", "PNG", optimize=True)
    apple = Image.new("RGB", (180, 180), BG)
    m = monogram(148)
    apple.paste(m, (16, 16), m)
    apple.save(OUT / "apple-touch-icon.png", "PNG", optimize=True)
    (OUT / "favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#34d8f5"/><stop offset="1" stop-color="#6ee7c8"/></linearGradient></defs>'
        '<rect width="64" height="64" rx="15" fill="url(#g)"/>'
        '<text x="32" y="43" text-anchor="middle" font-family="Segoe UI,Helvetica,Arial,sans-serif" '
        'font-size="30" font-weight="700" letter-spacing="-1" fill="#03121a">AA</text></svg>\n',
        encoding="utf-8",
    )


def og(lang, role, line, place):
    W, H, S = 1200, 630, 2
    im = Image.new("RGB", (W * S, H * S), BG)
    # halos
    glow = Image.new("RGB", im.size, BG)
    g = ImageDraw.Draw(glow)
    g.ellipse((-300 * S, -380 * S, 620 * S, 420 * S), fill=(12, 52, 70))
    g.ellipse((760 * S, 260 * S, 1500 * S, 900 * S), fill=(48, 36, 16))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(150 * S)), 0.9)
    d = ImageDraw.Draw(im, "RGBA")
    # grille
    for x in range(0, W, 60):
        d.line((x * S, 0, x * S, H * S), fill=(148, 163, 184, 14), width=S)
    for y in range(0, H, 60):
        d.line((0, y * S, W * S, y * S), fill=(148, 163, 184, 14), width=S)
    # ondes + échantillons
    def wave(y0, amp, length, phase, color, alpha, width):
        pts = []
        for x in range(0, W + 6, 6):
            u = x / W
            env = 0.3 + 0.7 * math.sin(math.pi * u)
            y = y0 + amp * env * (math.sin(u / length * math.tau + phase) + 0.42 * math.sin(u / length * math.tau * 2.3 + phase * 1.7))
            pts.append((x * S, y * S))
        d.line(pts, fill=(*color, alpha), width=width * S, joint="curve")
        return pts
    wave(508, 36, 0.95, 4.2, MINT, 60, 2)
    wave(492, 24, 0.44, 2.1, ACCENT, 90, 2)
    main = wave(478, 32, 0.62, 0.4, ACCENT, 230, 3)
    for i in range(3, len(main), 5):
        x, y = main[i]
        t = i / len(main)
        col = lerp(ACCENT, WARM, max(0.0, (t - 0.55) / 0.45))
        d.line((x, 478 * S, x, y), fill=(*col, 70), width=S)
        d.ellipse((x - 4 * S, y - 4 * S, x + 4 * S, y + 4 * S), fill=(*col, 255))
    # textes
    m = monogram(64 * S)
    im.paste(m, (72 * S, 64 * S), m)
    d = ImageDraw.Draw(im, "RGBA")
    d.text((154 * S, 80 * S), "PORTFOLIO", font=font("consola.ttf", 22 * S), fill=(*ACCENT, 255))
    f_name = font("segoeuib.ttf", 124 * S)
    d.text((66 * S, 150 * S), "Ali", font=f_name, fill=TEXT)
    ali_w = d.textlength("Ali ", font=f_name)
    d.text((66 * S + ali_w, 150 * S), "Azami", font=f_name, fill=ACCENT)
    d.text((72 * S, 306 * S), role, font=font("seguisb.ttf", 40 * S), fill=TEXT)
    d.text((72 * S, 364 * S), line, font=font("segoeui.ttf", 25 * S), fill=MUTED)
    d.text((72 * S, 556 * S), place, font=font("consola.ttf", 21 * S), fill=DIM)
    url = "ali123az.github.io/portfolio"
    f_url = font("consola.ttf", 21 * S)
    d.text(((W - 72) * S - d.textlength(url, font=f_url), 556 * S), url, font=f_url, fill=(*ACCENT, 255))
    im.resize((W, H), Image.LANCZOS).save(OUT / f"og-cover-{lang}.png", "PNG", optimize=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    portrait()
    logos()
    favicons()
    og("fr", "Ingénieur IA embarquée & systèmes embarqués",
       "Edge AI  ·  TinyML  ·  Radar  ·  Firmware temps réel  ·  FPGA", "OCEAN DATA SYSTEM · LORIENT")
    og("en", "Embedded AI & Embedded Systems Engineer",
       "Edge AI  ·  TinyML  ·  Radar  ·  Real-time firmware  ·  FPGA", "OCEAN DATA SYSTEM · LORIENT, FRANCE")
    for p in sorted(OUT.iterdir()):
        print(f"{p.name:28s} {p.stat().st_size / 1024:7.1f} kB")


if __name__ == "__main__":
    main()
