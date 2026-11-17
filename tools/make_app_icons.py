"""Makes the game's home-screen and browser-tab icons from the generated app_icon.png.

    python3 tools/make_app_icons.py "<path to>/app_icon.png"

Writes apps/client/public/icon-512.png, icon-192.png, apple-touch-icon.png (180) and favicon-32.png.
The square keeps its own background (home screens round the corners themselves).
"""
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "apps" / "client" / "public"
SIZES = {"icon-512.png": 512, "icon-192.png": 192, "apple-touch-icon.png": 180, "favicon-32.png": 32}


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Image.open(sys.argv[1]).convert("RGB")
    side = min(src.size)
    left, top = (src.width - side) // 2, (src.height - side) // 2
    square = src.crop((left, top, left + side, top + side))
    for name, size in SIZES.items():
        square.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
        print("wrote", OUT / name)


if __name__ == "__main__":
    main()
