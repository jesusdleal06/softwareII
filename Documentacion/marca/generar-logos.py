"""Generates the frontend logo images from the originals in this folder.

Usage (from the repository root, needs Pillow, NumPy and SciPy):
    python3 Documentacion/marca/generar-logos.py \
        Documentacion/marca/villadent-logo-horizontal.jpg \
        Documentacion/marca/villadent-logo-circular.jpg \
        Desarrollo/frontend/public/brand \
        [Documentacion/marca/villadent-logo-oscuro.jpg]

Writes villadent-logo.png (header, transparent background, 160 px high),
favicon-32.png, icon-192.png and apple-touch-icon.png (180 px, white background),
plus villadent-logo-dark.png when the optional fourth argument names the logo
that the header shows in the dark theme.
"""
import sys
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage


def transparent_logo(source: str, target: str) -> None:
    """Cut the flat backdrop out of a logo, whatever tone it is on.

    The backdrop may be plain white, a light checkerboard drawn behind a transparent
    export, or a dark board; in every case it is a flat tone the artwork never uses.
    The tones that own the image border are the backdrop, small leftovers are JPEG
    noise, and the outermost ring is never content, so a faint border cannot survive.
    """
    src = np.asarray(Image.open(source).convert("RGB")).astype(np.int16)
    high, low = src.max(axis=2), src.min(axis=2)
    flat = (high - low) <= 6
    ring = np.zeros_like(flat)
    ring[:6, :] = ring[-6:, :] = ring[:, :6] = ring[:, -6:] = True
    # A checkerboard puts two tones on the border, so every tone that owns part of it counts.
    tones, counts = np.unique((src[flat & ring].reshape(-1, 3) // 8) * 8, axis=0, return_counts=True)
    dominant = tones[counts >= 0.08 * counts.sum()][:4]
    backdrop = flat & np.any([np.abs(src - tone).max(axis=2) <= 12 for tone in dominant], axis=0)
    backdrop = ndimage.binary_closing(backdrop, np.ones((3, 3)))
    backdrop[:5, :] = backdrop[-5:, :] = True
    backdrop[:, :5] = backdrop[:, -5:] = True
    ink, count = ndimage.label(~backdrop)
    sizes = ndimage.sum(~backdrop, ink, range(1, count + 1))
    keep = np.isin(ink, [i + 1 for i, size in enumerate(sizes) if size >= 120])
    alpha = ndimage.gaussian_filter(keep.astype(np.float32), 0.6)
    alpha = np.clip((alpha - 0.25) / 0.5, 0.0, 1.0)
    # Un-mix the darkest backdrop tone: it is the one the soft edge blends into.
    tone = dominant[np.argmin(dominant.sum(axis=1))].astype(np.float32)
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((src.astype(np.float32) - (1.0 - alpha[..., None]) * tone) / safe, 0, 255)
    ys, xs = np.where(keep)
    pad = 8
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, src.shape[1]), min(ys.max() + pad, src.shape[0]))
    logo = Image.fromarray(np.dstack([rgb, alpha * 255.0]).astype(np.uint8), "RGBA").crop(box)
    height = 160
    logo = logo.resize((round(logo.width * height / logo.height), height), Image.LANCZOS)
    logo.save(target, optimize=True)
    print(target, "backdrop", tone.round(0), "->", logo.size)

src_h, src_c, out = sys.argv[1], sys.argv[2], sys.argv[3]

# --- Horizontal logos: the light one, and the dark twin the header swaps in ---
transparent_logo(src_h, f"{out}/villadent-logo.png")
if len(sys.argv) > 4:
    transparent_logo(sys.argv[4], f"{out}/villadent-logo-dark.png")

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
