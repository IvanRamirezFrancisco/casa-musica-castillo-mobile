#!/usr/bin/env python3
"""
Generate all web, PWA, UI, and Android branding assets for Casa de Música Castillo
from the official 2048x2048 RGBA master image without redrawing or distorting it.
"""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MASTER_PATH = ROOT / "resources" / "brand" / "casa-musica-castillo-logo-master.png"
BRAND_BG = (0x5B, 0x1B, 0x23)

# Measured directly on the 2048x2048 official RGBA master:
# solid squircle (alpha >= 200) occupies [202..1844, 202..1844].
SQUIRCLE_MIN = 202
SQUIRCLE_MAX = 1844
SQUIRCLE_MARGIN = 10  # Keep intact anti-aliased edge pixels around the squircle.

# Measured gold ring outer radius around (1023, 1023) is 697..698 px.
GOLD_CENTER_X = 1023
GOLD_CENTER_Y = 1023
MEDALLION_RADIUS = 702


def clean_master(master: Image.Image) -> Image.Image:
    """Zero out stray isolated edge pixels outside the squircle anti-aliased margin."""
    cleaned = master.convert("RGBA").copy()
    w, h = cleaned.size
    low = max(0, SQUIRCLE_MIN - SQUIRCLE_MARGIN)
    high_x = min(w, SQUIRCLE_MAX + SQUIRCLE_MARGIN + 1)
    high_y = min(h, SQUIRCLE_MAX + SQUIRCLE_MARGIN + 1)

    pixels = cleaned.load()
    for y in range(h):
        for x in range(w):
            if x < low or x >= high_x or y < low or y >= high_y:
                pixels[x, y] = (0, 0, 0, 0)
            elif pixels[x, y][3] == 0:
                # Normalize hidden RGB behind full transparency so resize filters never bleed dark fringes.
                pixels[x, y] = (BRAND_BG[0], BRAND_BG[1], BRAND_BG[2], 0)
    return cleaned


def crop_squircle(cleaned: Image.Image) -> Image.Image:
    """Crop square tightly centered around the rounded burgundy squircle."""
    low = SQUIRCLE_MIN - SQUIRCLE_MARGIN
    high = SQUIRCLE_MAX + SQUIRCLE_MARGIN + 2  # (192, 192, 1856, 1856) -> 1664x1664
    return cleaned.crop((low, low, high, high))


def extract_medallion(cleaned: Image.Image) -> Image.Image:
    """Extract only the circular medallion (gold circumference + emblem) on transparent alpha."""
    box = (
        GOLD_CENTER_X - MEDALLION_RADIUS,
        GOLD_CENTER_Y - MEDALLION_RADIUS,
        GOLD_CENTER_X + MEDALLION_RADIUS,
        GOLD_CENTER_Y + MEDALLION_RADIUS,
    )
    medallion = cleaned.crop(box)
    size = medallion.size[0]
    scale = 4
    hi_mask = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(hi_mask).ellipse((0, 0, size * scale - 1, size * scale - 1), fill=255)
    mask = hi_mask.resize((size, size), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(medallion, (0, 0), mask)
    return out


def extract_monochrome(medallion: Image.Image, canvas_size: int = 432, safe_ratio: float = 0.60) -> Image.Image:
    """Create a white monochrome mask silhouette from the golden artwork for Android themed icons."""
    mw, mh = medallion.size
    mono = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
    src_px = medallion.load()
    dst_px = mono.load()

    for y in range(mh):
        for x in range(mw):
            r, g, b, a = src_px[x, y]
            if a == 0:
                continue
            # Gold artwork stands out strongly in red/green brightness above burgundy (#5B1B23 / #441218).
            if r > 125 and g > 80 and (r - b) > 35:
                alpha = min(a, min(255, int((r - b - 35) * 3.2)))
                if alpha > 0:
                    dst_px[x, y] = (255, 255, 255, alpha)

    target_d = max(1, round(canvas_size * safe_ratio))
    scaled = mono.resize((target_d, target_d), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = (canvas_size - target_d) // 2
    canvas.paste(scaled, (offset, offset), scaled)
    return canvas


def save_png(image: Image.Image, relative_path: str) -> None:
    target = ROOT / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, format="PNG", optimize=True)


def main() -> None:
    if not MASTER_PATH.is_file():
        raise FileNotFoundError(f"Master logo missing at {MASTER_PATH}")

    master = Image.open(MASTER_PATH)
    cleaned = clean_master(master)
    squircle = crop_squircle(cleaned)
    medallion = extract_medallion(cleaned)

    # 1. Optimized Web / UI / PWA brand marks (preserve transparent outer corners)
    for size in (96, 192, 256, 512):
        save_png(
            squircle.resize((size, size), Image.Resampling.LANCZOS),
            f"src/assets/brand/logo-mark-{size}.png",
        )

    # 2. Legacy icon path kept pointing to the exact cleaned 512x512 master + web favicons
    save_png(squircle.resize((512, 512), Image.Resampling.LANCZOS), "src/assets/icon/castillo-escudo.png")
    save_png(squircle.resize((64, 64), Image.Resampling.LANCZOS), "src/assets/icon/favicon.png")
    save_png(squircle.resize((32, 32), Image.Resampling.LANCZOS), "src/assets/icon/favicon-32x32.png")

    apple_touch = Image.new("RGB", (180, 180), BRAND_BG)
    apple_inner = squircle.resize((152, 152), Image.Resampling.LANCZOS)
    apple_touch.paste(apple_inner, (14, 14), apple_inner)
    save_png(apple_touch, "src/assets/icon/apple-touch-icon.png")

    # 3. Android Launcher Adaptive Foreground & Legacy Square / Round Icons
    densities = {
        "mdpi": (108, 48),
        "hdpi": (162, 72),
        "xhdpi": (216, 96),
        "xxhdpi": (324, 144),
        "xxxhdpi": (432, 192),
    }

    for density, (fg_size, launcher_size) in densities.items():
        # Adaptive icon foreground: 60% medallion inside both adaptive (61.1%) & splash (66.7%) safe zones
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        fg_d = round(fg_size * 0.60)
        fg_art = medallion.resize((fg_d, fg_d), Image.Resampling.LANCZOS)
        fg_offset = (fg_size - fg_d) // 2
        fg_canvas.paste(fg_art, (fg_offset, fg_offset), fg_art)
        save_png(fg_canvas, f"android/app/src/main/res/mipmap-{density}/ic_launcher_foreground.png")

        # Legacy square launcher icon: crisp rounded burgundy squircle on transparent canvas
        legacy_sq = squircle.resize((launcher_size, launcher_size), Image.Resampling.LANCZOS)
        save_png(legacy_sq, f"android/app/src/main/res/mipmap-{density}/ic_launcher.png")

        # Legacy round launcher icon: circular #5B1B23 badge with anti-aliased edge
        round_scale = 4
        rs = launcher_size * round_scale
        round_hi = Image.new("RGBA", (rs, rs), (0, 0, 0, 0))
        circle_mask = Image.new("L", (rs, rs), 0)
        ImageDraw.Draw(circle_mask).ellipse((2, 2, rs - 3, rs - 3), fill=255)
        bg_layer = Image.new("RGBA", (rs, rs), (*BRAND_BG, 255))
        round_hi.paste(bg_layer, (0, 0), circle_mask)
        inner_d = round(rs * 0.86)
        inner_art = medallion.resize((inner_d, inner_d), Image.Resampling.LANCZOS)
        inner_off = (rs - inner_d) // 2
        round_hi.paste(inner_art, (inner_off, inner_off), inner_art)
        round_icon = round_hi.resize((launcher_size, launcher_size), Image.Resampling.LANCZOS)
        save_png(round_icon, f"android/app/src/main/res/mipmap-{density}/ic_launcher_round.png")

    # 4. Android 13+ Monochrome Themed Icon
    mono_icon = extract_monochrome(medallion, canvas_size=432, safe_ratio=0.60)
    save_png(mono_icon, "android/app/src/main/res/drawable-nodpi/ic_launcher_monochrome.png")

    # 5. Android Splash Drawables (solid #5B1B23 background matching ic_launcher_background.xml)
    splash_specs = {
        "drawable/splash.png": (480, 320),
        "drawable-port-mdpi/splash.png": (320, 480),
        "drawable-port-hdpi/splash.png": (480, 800),
        "drawable-port-xhdpi/splash.png": (720, 1280),
        "drawable-port-xxhdpi/splash.png": (960, 1600),
        "drawable-port-xxxhdpi/splash.png": (1280, 1920),
        "drawable-land-mdpi/splash.png": (480, 320),
        "drawable-land-hdpi/splash.png": (800, 480),
        "drawable-land-xhdpi/splash.png": (1280, 720),
        "drawable-land-xxhdpi/splash.png": (1600, 960),
        "drawable-land-xxxhdpi/splash.png": (1920, 1280),
    }

    for rel, (sw, sh) in splash_specs.items():
        canvas = Image.new("RGB", (sw, sh), BRAND_BG)
        mark_d = max(1, round(min(sw, sh) * 0.34))
        mark = medallion.resize((mark_d, mark_d), Image.Resampling.LANCZOS)
        canvas.paste(mark, ((sw - mark_d) // 2, (sh - mark_d) // 2), mark)
        save_png(canvas, f"android/app/src/main/res/{rel}")

    print("Brand assets generated cleanly from 2048x2048 master.")


if __name__ == "__main__":
    main()
