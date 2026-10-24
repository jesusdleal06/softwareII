"""Generates the frontend logo images from the originals in this folder.

Usage (from the repository root, needs Pillow and NumPy):
    python3 Documentacion/marca/generar-logos.py \
        Documentacion/marca/villadent-logo-horizontal.jpg \
        Documentacion/marca/villadent-logo-circular.jpg \
        Desarrollo/frontend/public/brand

Writes villadent-logo.png (header, transparent background, 160 px high),
favicon-32.png, icon-192.png and apple-touch-icon.png (180 px, white background).
"""
import sys
from PIL import Image, ImageDraw
import numpy as np

src_h, src_c, out = sys.argv[1], sys.argv[2], sys.argv[3]

# --- Horizontal logo: white background -> transparent, without white fringes ---
im = np.asarray(Image.open(src_h).convert("RGB")).astype(np.float32)
dist = 255.0 - im.min(axis=2)                      # 0 on white, high on ink
alpha = np.clip((dist - 14.0) / 46.0, 0.0, 1.0)    # soft edge between paper noise and ink
safe = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((im - (1.0 - alpha[..., None]) * 255.0) / safe, 0, 255)  # un-mix the white
rgba = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
logo = Image.fromarray(rgba, "RGBA")
ys, xs = np.where(alpha > 0.1)
pad = 12
box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, logo.width), min(ys.max() + pad, logo.height))
logo = logo.crop(box)
h = 160
logo = logo.resize((round(logo.width * h / logo.height), h), Image.LANCZOS)
logo.save(f"{out}/villadent-logo.png", optimize=True)
print("horizontal", box, "->", logo.size)

# --- Circular logo: find the white disc on black and cut it out ---
c = Image.open(src_c).convert("RGB")
a = np.asarray(c).astype(np.int32)
bright = a.min(axis=2) > 60                       # disc and dots are bright, the corners are near black
rows, cols = np.where(bright)
cx, cy = (cols.min() + cols.max()) / 2, (rows.min() + rows.max()) / 2
r = min(cols.max() - cols.min(), rows.max() - rows.min()) / 2
scale = 4                                          # supersampled mask for a smooth edge
mask = Image.new("L", (c.width * scale, c.height * scale), 0)
ImageDraw.Draw(mask).ellipse([(cx - r) * scale, (cy - r) * scale, (cx + r) * scale, (cy + r) * scale], fill=255)
mask = mask.resize(c.size, Image.LANCZOS)
circle = c.convert("RGBA"); circle.putalpha(mask)
circle = circle.crop((round(cx - r), round(cy - r), round(cx + r), round(cy + r)))
print("circle center", (cx, cy), "radius", r, "->", circle.size)
for size, name in [(32, "favicon-32.png"), (192, "icon-192.png")]:
    circle.resize((size, size), Image.LANCZOS).save(f"{out}/{name}", optimize=True)
apple = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
apple.alpha_composite(circle.resize((180, 180), Image.LANCZOS))
apple.convert("RGB").save(f"{out}/apple-touch-icon.png", optimize=True)
