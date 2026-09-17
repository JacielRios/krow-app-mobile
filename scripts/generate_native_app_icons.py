"""One-off generator: KrowAppMobile.png -> Android mipmaps + iOS AppIcon."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "assets" / "KrowAppMobile.png"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
IOS_ICONSET = ROOT / "ios" / "KrownMobileApp" / "Images.xcassets" / "AppIcon.appiconset"

# Legacy launcher: 48dp * density
LEGACY = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
# Adaptive foreground: 108dp * density
FOREGROUND = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

# iOS: (filename, px)
IOS_FILES = [
    ("Icon-20@2x.png", 40),
    ("Icon-20@3x.png", 60),
    ("Icon-29@2x.png", 58),
    ("Icon-29@3x.png", 87),
    ("Icon-40@2x.png", 80),
    ("Icon-40@3x.png", 120),
    ("Icon-60@2x.png", 120),
    ("Icon-60@3x.png", 180),
    ("Icon-1024.png", 1024),
]


def resize_save(img: Image.Image, size: int, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = img.resize((size, size), Image.Resampling.LANCZOS)
    out.save(path, format="PNG")


def save_ios_marketing_1024(img: Image.Image, path: Path, bg: tuple[int, int, int]) -> None:
    """App Store marketing icon must be opaque RGB (no alpha)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    out = img.resize((1024, 1024), Image.Resampling.LANCZOS).convert("RGBA")
    rgb = Image.new("RGB", out.size, bg)
    rgb.paste(out, mask=out.split()[3])
    rgb.save(path, format="PNG")


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source: {SRC}")

    img = Image.open(SRC).convert("RGBA")

    for folder, px in LEGACY.items():
        base = ANDROID_RES / folder
        resize_save(img, px, base / "ic_launcher.png")
        resize_save(img, px, base / "ic_launcher_round.png")

    for folder, px in FOREGROUND.items():
        base = ANDROID_RES / folder
        resize_save(img, px, base / "ic_launcher_foreground.png")

    marketing_bg = (247, 247, 245)  # align with android values/ic_launcher_background.xml
    for name, px in IOS_FILES:
        dest = IOS_ICONSET / name
        if name == "Icon-1024.png":
            save_ios_marketing_1024(img, dest, marketing_bg)
        else:
            resize_save(img, px, dest)

    print("Wrote Android mipmaps and iOS AppIcon PNGs.")


if __name__ == "__main__":
    main()
