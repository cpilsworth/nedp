#!/usr/bin/env python3
"""Generate the three AppIcon appearance variants (light, dark, tinted) for the
Nedbank iOS app. Produces 1024x1024 PNGs into the AppIcon.appiconset folder.

The light/dark variants are a solid Nedbank green tile with a white "N"
letterform. The tinted variant is the same N shape on a transparent
background so iOS can fill it with the user-selected tint colour.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ASSET_DIR = Path(__file__).resolve().parent.parent / "Nedbank" / "Assets.xcassets" / "AppIcon.appiconset"

SIZE = 1024
GREEN = (23, 110, 58, 255)           # #176e3a — brand chrome green
GREEN_DARK = (12, 70, 36, 255)       # darker variant used for dark-appearance tile
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

FONT_CANDIDATES = [
    "/Library/Fonts/Arial Black.ttf",
    "/System/Library/Fonts/Supplemental/Arial Black.ttf",
    "/System/Library/Fonts/Avenir Next.ttc",
    "/System/Library/Fonts/HelveticaNeue.ttc",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_n(canvas: Image.Image, color: tuple) -> None:
    """Draw a centred, bold N letterform on the given canvas."""
    draw = ImageDraw.Draw(canvas)
    font = load_font(int(SIZE * 0.68))
    text = "N"
    # Use anchor="mm" (middle/middle) so PIL uses the glyph's own metrics
    # to centre it on the given coordinate. The default top-left + bbox
    # arithmetic tends to bias capitals visually downward because the bbox
    # reserves space for ascender headroom that the N doesn't use.
    draw.text((SIZE / 2, SIZE / 2), text, font=font, fill=color, anchor="mm")


def make_filled(bg: tuple, fg: tuple) -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), bg)
    draw_n(img, fg)
    return img


def make_tinted() -> Image.Image:
    # iOS tinted icons: shape on transparent background. The system fills the
    # opaque pixels with the user's preferred tint colour at render time, so we
    # draw white-on-transparent and let the OS reinterpret it.
    img = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    draw_n(img, WHITE)
    return img


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    make_filled(GREEN, WHITE).save(ASSET_DIR / "AppIcon-light.png")
    make_filled(GREEN_DARK, WHITE).save(ASSET_DIR / "AppIcon-dark.png")
    make_tinted().save(ASSET_DIR / "AppIcon-tinted.png")
    print("Wrote AppIcon-{light,dark,tinted}.png to", ASSET_DIR)


if __name__ == "__main__":
    main()
