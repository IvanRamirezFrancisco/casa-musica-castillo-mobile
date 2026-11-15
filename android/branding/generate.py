"""Generate Android and Play launcher art from the supplied Casa de Música Castillo logo."""
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent
BURGUNDY = "#722F37"
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def isolate_shield(logo):
    alpha = logo.getchannel("A")
    # The shield is the largest connected part of the original transparent logo.
    pixels = {(x, y) for y in range(logo.height) for x in range(logo.width) if alpha.getpixel((x, y))}
    largest = []
    while pixels:
        start = pixels.pop()
        queue = deque([start])
        component = [start]
        while queue:
            x, y = queue.popleft()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in pixels:
                    pixels.remove(neighbor)
                    queue.append(neighbor)
                    component.append(neighbor)
        if len(component) > len(largest):
            largest = component
    mask = Image.new("L", logo.size)
    for point in largest:
        mask.putpixel(point, alpha.getpixel(point))
    shield = logo.copy()
    shield.putalpha(mask)
    return shield.crop(mask.getbbox())


def centered(shield, size, diameter, background=None):
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    # Measure the opaque artwork rather than its rectangle so circular masks cannot crop it.
    center_x, center_y = (shield.width - 1) / 2, (shield.height - 1) / 2
    alpha = shield.getchannel("A")
    radius = max(
        ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
        for y in range(shield.height)
        for x in range(shield.width)
        if alpha.getpixel((x, y))
    )
    scale = diameter / (2 * radius)
    art = shield.resize((round(shield.width * scale), round(shield.height * scale)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas


def save(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def main():
    with Image.open(ROOT / "castillo-original.png") as original:
        shield = isolate_shield(original.convert("RGBA"))
    resources = APP / "app/src/main/res"
    for density, scale in DENSITIES.items():
        folder = resources / f"mipmap-{density}"
        size = round(48 * scale)
        legacy = centered(shield, size, size * 0.82, BURGUNDY)
        save(legacy, folder / "ic_launcher.png")
        circle = Image.new("L", legacy.size)
        ImageDraw.Draw(circle).ellipse((0, 0, size - 1, size - 1), fill=255)
        legacy.putalpha(circle)
        save(legacy, folder / "ic_launcher_round.png")
        adaptive = centered(shield, round(108 * scale), round(63 * scale))
        save(adaptive, folder / "ic_launcher_foreground.png")

    # The themed icon uses the original dark instrument detail and the original shield mask.
    tone = ImageOps.grayscale(shield).point(lambda value: max(0, min(255, round((165 - value) * 4))))
    themed = Image.new("RGBA", shield.size, "black")
    themed.putalpha(Image.composite(tone, Image.new("L", shield.size), shield.getchannel("A")))
    save(centered(themed, 432, 244), resources / "drawable-nodpi/ic_launcher_monochrome.png")
    save(shield, APP.parent / "src/assets/icon/castillo-escudo.png")
    save(centered(shield, 512, 420, BURGUNDY), ROOT / "play-icon-512.png")


if __name__ == "__main__":
    main()
