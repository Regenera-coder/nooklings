"""Import ChatGPT art from a download folder into the game.

Usage:  python3 tools/import_art.py <folder-with-pngs>

For each image named per the art brief (char_*, furn_*, room_*, ui_*, icon_*, parcel_*):
  - keeps only the highest _vN version of each name
  - if the image has no real transparency, removes a plain white background that
    touches the edges (flood fill from the border, so white inside the art stays)
  - trims empty margins (not for room backgrounds, panels or buttons)
  - downsizes so the longest side is at most 1024 px (room background: 2400 px)
  - writes the result to apps/client/public/assets/<name>.png
Then rebuilds the asset manifest. Prints a short report of anything that looks wrong.
"""
from __future__ import annotations

import re
import subprocess
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "apps" / "client" / "public" / "assets"
PREFIXES = ("char_", "furn_", "room_", "ui_", "icon_", "parcel_")
NO_TRIM = ("room_", "ui_panel", "ui_button")
WHITE_TOLERANCE = 18  # how far from pure white still counts as background


def has_real_alpha(img: Image.Image) -> bool:
    if img.mode != "RGBA":
        return False
    alpha = np.asarray(img)[:, :, 3]
    return (alpha < 250).mean() > 0.02


def remove_edge_white(img: Image.Image) -> Image.Image:
    rgba = np.array(img.convert("RGBA"))
    h, w = rgba.shape[:2]
    near_white = (rgba[:, :, :3].astype(int) >= 255 - WHITE_TOLERANCE).all(axis=2)
    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    rgba[bg, 3] = 0
    return Image.fromarray(rgba)


def trim(img: Image.Image, pad: int = 6) -> Image.Image:
    alpha = np.asarray(img.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return img
    x0, x1 = max(0, xs.min() - pad), min(img.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(img.height, ys.max() + 1)  # no pad below: feet sit on the edge
    return img.crop((x0, y0, x1, y1))


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    src = Path(sys.argv[1])
    best: dict[str, tuple[int, Path]] = {}
    for f in sorted(src.glob("*.png")):
        m = re.match(r"^(.*?)(?:_v(\d+))?$", f.stem)
        assert m
        key, version = m.group(1), int(m.group(2) or 1)
        if not key.startswith(PREFIXES):
            print(f"skip (unknown name): {f.name}")
            continue
        if key not in best or version > best[key][0]:
            best[key] = (version, f)
    OUT.mkdir(parents=True, exist_ok=True)
    for key, (version, f) in sorted(best.items()):
        img = Image.open(f).convert("RGBA")
        notes = []
        if not has_real_alpha(img) and not key.startswith(("room_", "ui_panel", "ui_button")):
            img = remove_edge_white(img)
            notes.append("white background removed")
        if not key.startswith(NO_TRIM) and not key.endswith("_master"):
            img = trim(img)
        limit = 2400 if key.startswith("room_") else 1024
        if max(img.size) > limit:
            scale = limit / max(img.size)
            img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        img.save(OUT / f"{key}.png", optimize=True)
        print(f"{key:<34} v{version}  {img.width}x{img.height}  {'; '.join(notes)}")
    subprocess.run(["node", str(ROOT / "tools" / "build-asset-manifest.mjs")], check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
