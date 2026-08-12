from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "electron" / "assets"
ICON_ICO = ASSETS_DIR / "icon.ico"
ICON_PNG = ASSETS_DIR / "icon.png"

BASE_SIZE = 1024
BACKGROUND_TOP = (8, 30, 50, 255)
BACKGROUND_BOTTOM = (16, 66, 84, 255)
CARD_START = (17, 43, 68, 255)
CARD_END = (11, 26, 44, 255)
ACCENT = (249, 115, 22, 255)
ACCENT_SOFT = (255, 181, 112, 160)
TEXT = (248, 250, 252, 255)
TEXT_SOFT = (223, 232, 241, 240)


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def blend(color_a: tuple[int, int, int, int], color_b: tuple[int, int, int, int], t: float) -> tuple[int, int, int, int]:
    return tuple(lerp(color_a[i], color_b[i], t) for i in range(4))


def make_vertical_gradient(size: int, top: tuple[int, int, int, int], bottom: tuple[int, int, int, int]) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    pixels = image.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        row = blend(top, bottom, t)
        for x in range(size):
            pixels[x, y] = row
    return image


def get_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts") / name,
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("C:/Windows/Fonts/seguisb.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/calibrib.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def draw_droplet(draw: ImageDraw.ImageDraw, center: tuple[int, int], width: int, height: int, fill: tuple[int, int, int, int], outline: tuple[int, int, int, int] | None = None) -> None:
    cx, cy = center
    top = (cx, cy - height // 2)
    left = (cx - width // 2, cy + height // 8)
    right = (cx + width // 2, cy + height // 8)
    bottom = (cx, cy + height // 2)
    points = [top, (cx + width * 0.28, cy - height * 0.04), right, bottom, left, (cx - width * 0.28, cy - height * 0.04)]
    draw.polygon(points, fill=fill, outline=outline)


def build_icon() -> Image.Image:
    base = make_vertical_gradient(BASE_SIZE, BACKGROUND_TOP, BACKGROUND_BOTTOM)

    # Soft ambient glow in the upper-left corner.
    glow = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-120, -120, 640, 640), fill=(59, 130, 246, 55))
    glow_draw.ellipse((540, 40, 1040, 540), fill=(249, 115, 22, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    base = Image.alpha_composite(base, glow)

    # Main rounded tile with depth.
    shadow = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((78, 92, 946, 960), radius=180, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    base = Image.alpha_composite(base, shadow)

    tile = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    tile_draw = ImageDraw.Draw(tile)
    tile_draw.rounded_rectangle((70, 84, 938, 952), radius=180, fill=blend(CARD_START, CARD_END, 0.16))

    tile_highlight = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    tile_highlight_draw = ImageDraw.Draw(tile_highlight)
    tile_highlight_draw.rounded_rectangle((86, 100, 922, 936), radius=170, outline=(255, 255, 255, 24), width=4)
    tile_highlight_draw.ellipse((120, 120, 560, 460), fill=(255, 255, 255, 22))
    tile_highlight_draw.ellipse((520, 500, 880, 860), fill=(249, 115, 22, 22))
    tile_highlight = tile_highlight.filter(ImageFilter.GaussianBlur(18))
    tile = Image.alpha_composite(tile, tile_highlight)

    base = Image.alpha_composite(base, tile)

    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((70, 84, 938, 952), radius=180, outline=(88, 118, 145, 95), width=5)

    # Inner emblem.
    emblem_shadow = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    emblem_shadow_draw = ImageDraw.Draw(emblem_shadow)
    emblem_shadow_draw.ellipse((300, 248, 724, 672), fill=(0, 0, 0, 80))
    emblem_shadow = emblem_shadow.filter(ImageFilter.GaussianBlur(18))
    base = Image.alpha_composite(base, emblem_shadow)

    emblem = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    emblem_draw = ImageDraw.Draw(emblem)
    emblem_draw.ellipse((286, 234, 738, 686), fill=(11, 40, 60, 220), outline=(87, 164, 220, 105), width=8)
    emblem_draw.ellipse((326, 274, 698, 658), fill=(13, 55, 79, 235))
    emblem_draw.ellipse((384, 286, 614, 516), fill=(255, 255, 255, 16))
    emblem_draw.ellipse((366, 518, 648, 628), fill=(249, 115, 22, 40))
    emblem = emblem.filter(ImageFilter.GaussianBlur(2))
    base = Image.alpha_composite(base, emblem)

    base_draw = ImageDraw.Draw(base)
    base_draw.line((320, 552, 704, 552), fill=(255, 255, 255, 20), width=8)

    # Water droplet accent.
    accent = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent)
    draw_droplet(accent_draw, (680, 310), 110, 148, ACCENT, outline=(255, 214, 176, 140))
    accent_draw.ellipse((642, 254, 658, 270), fill=ACCENT_SOFT)
    accent_draw.arc((618, 236, 744, 362), start=200, end=340, fill=(255, 195, 129, 180), width=7)
    accent = accent.filter(ImageFilter.GaussianBlur(0.6))
    base = Image.alpha_composite(base, accent)

    # Monogram.
    font = get_font("segoeuib.ttf", 312)
    text = "SC"
    text_draw = ImageDraw.Draw(base)
    bbox = text_draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (BASE_SIZE - text_width) / 2 - 6
    y = (BASE_SIZE - text_height) / 2 - 10
    text_draw.text((x + 6, y + 8), text, font=font, fill=(0, 0, 0, 110))
    text_draw.text((x, y), text, font=font, fill=TEXT)

    # Small subtitle line to make the icon feel less empty in large sizes.
    small_font = get_font("segoeuib.ttf", 78)
    subtitle = "AGUA"
    sub_bbox = text_draw.textbbox((0, 0), subtitle, font=small_font)
    sub_width = sub_bbox[2] - sub_bbox[0]
    sub_x = (BASE_SIZE - sub_width) / 2 + 4
    sub_y = 700
    text_draw.text((sub_x + 3, sub_y + 4), subtitle, font=small_font, fill=(0, 0, 0, 90))
    text_draw.text((sub_x, sub_y), subtitle, font=small_font, fill=TEXT_SOFT)

    # Final outer highlight.
    final = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    final_draw = ImageDraw.Draw(final)
    final_draw.rounded_rectangle((86, 100, 922, 936), radius=168, outline=(255, 255, 255, 18), width=2)
    final_draw.arc((126, 126, 330, 330), start=205, end=340, fill=(255, 255, 255, 24), width=10)
    final = final.filter(ImageFilter.GaussianBlur(1))
    base = Image.alpha_composite(base, final)

    return base


def main() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    image = build_icon()
    image.save(ICON_PNG)
    image.save(ICON_ICO, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Saved {ICON_PNG}")
    print(f"Saved {ICON_ICO}")


if __name__ == "__main__":
    main()
