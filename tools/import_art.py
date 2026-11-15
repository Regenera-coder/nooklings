"""Import ChatGPT source art into the game.

Usage:  python3 tools/import_art.py <folder-with-source-pngs> [--report report.md]

Source images are generated, so their pixel sizes, margins and framing vary. This script:
  1. Inventories the folder against the art brief (missing, unknown and superseded files).
  2. Picks the highest _vN version of each name (e.g. room_living_background_v2).
  3. Removes a plain white background if an image has no real transparency.
  4. Measures the art ignoring small detached specks (sparkles), so they don't
     change the scale or the foot position.
  5. Normalizes everything to the brief's canvas sizes with fixed anchors
     (written to art/normalized/, not committed):
       - character poses: 1024x1024, feet on the bottom-centre with a 4% margin,
         one scale per character so every pose matches the standing height
       - portraits, furniture, parcels: 1024x1024, centred / bottom-centred
       - icons 256x256, panel 512x512, buttons 512x160, room 2400x1040,
         master turnarounds 2048x1024
  6. Writes smaller game copies to apps/client/public/assets/ plus anchors.json
     (where the feet sit in each character image), then rebuilds the manifest.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
NORMALIZED = ROOT / "art" / "normalized"
GAME = ROOT / "apps" / "client" / "public" / "assets"

CHARACTERS = ["snug", "tinker", "mischi", "bloomi", "glim", "mopey", "pippo", "hush", "patcha", "luma"]
# Decorated poses exist only for the Milestone B residents so far; others are optional.
DECORATED_CHARACTERS = CHARACTERS  # brief 07 asks for Decorated sets for every resident
POSES = ["master", "idle", "walk", "walk2", "sit", "sleep", "happy", "portrait", "decorated_idle", "decorated_walk", "decorated_walk2", "decorated_sit", "decorated_sleep"]
FURNITURE = [
    "cloud_bed", "cozy_sofa", "bookshelf", "workbench", "floor_lamp", "side_table", "potted_fern",
    "toy_chest", "star_rug", "round_window", "moon_lantern", "soft_curtains", "picture_frame",
    # Milestone C
    "tea_table", "reading_chair", "planter_box", "hanging_plant", "bird_bath", "garden_bench", "rain_window",
    "rain_chime", "travel_trunk", "paper_lanterns", "zen_stones", "heirloom_chest", "wishing_lantern",
]
# Costume pose sets: char_<id>_costume_<costumeId>_<pose>
COSTUMES = {"mopey": ["umbrella"]}
COSTUME_POSES = ["idle", "walk", "walk2", "sit", "sleep"]
# Room backgrounds: normalized size (game copy is 80%). Proportions match the room grids.
ROOMS = {"living": (2400, 1040), "sunroom": (2400, 1092), "yard": (2400, 886)}
# Square scene cards for Explore (gathering spots and expedition routes).
CARDS = ["spot_woodpile", "spot_berry_bush", "spot_cotton_patch", "exp_meadow", "exp_old_mill"]
ICONS = ["tab_home", "tab_nookbook", "tab_explore", "tab_tasks", "buttons", "wish_stamp", "wood", "fabric", "mending_thread", "home_heart", "keepsake", "ribbon"]
EXPECTED = (
    [f"char_{c}_{p}" for c in CHARACTERS for p in POSES if not p.startswith("decorated_") or c in DECORATED_CHARACTERS]
    + [f"room_{r}_background" for r in ROOMS]
    + [f"char_{c}_costume_{k}_{p}" for c, ks in COSTUMES.items() for k in ks for p in COSTUME_POSES]
    + [f"furn_{f}" for f in FURNITURE]
    + ["ui_panel", "ui_button", "ui_button_primary"]
    + [f"icon_{i}" for i in ICONS]
    + ["parcel_closed", "parcel_open"]
    + CARDS
)

# Character poses: size relative to the standing height. Standing poses share one
# height; sitting is shorter; sleeping is measured by width. Tuned by eye against
# head size in the lineup check, not exact anatomy.
STAND_FRACTION = 0.80  # standing character fills 80% of the 1024 canvas height (brief)
POSE_SCALE = {
    "idle": ("h", 1.00),
    "walk": ("h", 1.00),
    "walk2": ("h", 1.00),
    "decorated_walk2": ("h", 1.00),
    "happy": ("h", 1.00),
    "decorated_idle": ("h", 1.00),
    "decorated_walk": ("h", 1.00),
    "sit": ("h", 0.80),
    "decorated_sit": ("h", 0.80),
    "sleep": ("w", 1.05),
    "decorated_sleep": ("w", 1.05),
}
# Per-character overrides where the source framing differs (matched by head size).
POSE_SCALE_BY_CHAR = {
    "snug": {"sit": ("h", 0.92), "decorated_sit": ("h", 0.92)},
    "tinker": {"sit": ("h", 0.92), "decorated_sit": ("h", 0.92)},
    "mischi": {"sit": ("h", 0.86), "decorated_sit": ("h", 0.86)},
    "bloomi": {"sit": ("h", 0.9), "decorated_sit": ("h", 0.9)},
    "glim": {"sit": ("h", 0.95), "decorated_sit": ("h", 0.95)},
    "mopey": {"sit": ("h", 0.94), "decorated_sit": ("h", 0.94)},
    "pippo": {"sit": ("h", 0.84), "decorated_sit": ("h", 0.84)},
    "hush": {"sit": ("h", 0.92), "decorated_sit": ("h", 0.92)},
    "patcha": {"sit": ("h", 0.9), "decorated_sit": ("h", 0.9)},
}
GAME_CHAR = 512  # game copy of character poses (half the normalized canvas)


def load(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    alpha = np.asarray(img)[:, :, 3]
    if (alpha < 250).mean() < 0.02:  # no real transparency: cut out white touching the edges
        img = remove_edge_white(img)
    return img


def remove_edge_white(img: Image.Image, tol: int = 18) -> Image.Image:
    rgba = np.array(img)
    white = (rgba[:, :, :3].astype(int) >= 255 - tol).all(axis=2)
    labels, _ = ndimage.label(white)
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    rgba[np.isin(labels, list(edge)), 3] = 0
    return Image.fromarray(rgba)


def body_mask(img: Image.Image, min_share: float = 0.01) -> np.ndarray:
    """Opaque pixels, minus detached specks smaller than min_share of the main shape."""
    alpha = np.asarray(img)[:, :, 3] > 24
    labels, n = ndimage.label(alpha)
    if n == 0:
        return alpha
    sizes = ndimage.sum(alpha, labels, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * min_share]
    return np.isin(labels, keep)


def bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def foot_x(mask: np.ndarray, box: tuple[int, int, int, int]) -> float:
    """Horizontal centre of the lowest 8% of the shape (the feet / base)."""
    x0, y0, x1, y1 = box
    band = mask[max(y0, y1 - max(2, (y1 - y0) // 12)) : y1, x0:x1]
    xs = np.where(band)[1]
    return x0 + (xs.mean() if len(xs) else (x1 - x0) / 2)


def place(img: Image.Image, scale: float, canvas: tuple[int, int], anchor_src: tuple[float, float], anchor_dst: tuple[float, float]) -> Image.Image:
    """Scale img and paste it so anchor_src (in source pixels) lands on anchor_dst."""
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    scaled = img.resize((w, h), Image.LANCZOS)
    out = Image.new("RGBA", canvas, (0, 0, 0, 0))
    ox = round(anchor_dst[0] - anchor_src[0] * scale)
    oy = round(anchor_dst[1] - anchor_src[1] * scale)
    out.alpha_composite(scaled, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
    return out


def fit(img: Image.Image, canvas: tuple[int, int], fill: float, bottom: bool = False, margin: float = 0.04) -> Image.Image:
    mask = body_mask(img)
    x0, y0, x1, y1 = bbox(mask)
    scale = min(canvas[0] * fill / (x1 - x0), canvas[1] * fill / (y1 - y0))
    if bottom:
        return place(img, scale, canvas, (foot_x(mask, (x0, y0, x1, y1)), y1), (canvas[0] / 2, canvas[1] * (1 - margin)))
    return place(img, scale, canvas, ((x0 + x1) / 2, (y0 + y1) / 2), (canvas[0] / 2, canvas[1] / 2))


def trimmed(img: Image.Image, pad: int = 4) -> Image.Image:
    x0, y0, x1, y1 = bbox(np.asarray(img)[:, :, 3] > 8)
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    src = Path(args[0])
    if not src.is_dir() or not any(src.glob("*.png")):
        # Guard: the importer clears the game folder, so never run it against an empty or wrong path.
        print(f"No PNG files found in {src}. Nothing changed.")
        return 2
    report_path = Path(args[args.index("--report") + 1]) if "--report" in args else None

    exclude_file = ROOT / "art" / "import-exclude.txt"
    excluded: dict[str, str] = {}
    if exclude_file.exists():
        for line in exclude_file.read_text().splitlines():
            if line.strip() and not line.startswith("#"):
                name, _, why = line.partition(" # ")
                excluded[name.strip()] = why.strip()
    best: dict[str, tuple[int, Path]] = {}
    unknown: list[str] = []
    superseded: list[str] = []
    import fnmatch
    for f in sorted(src.glob("*.png")):
        if any(fnmatch.fnmatch(f.name, pat) for pat in excluded):
            continue
        m = re.match(r"^(.*?)(?:_v(\d+))?$", f.stem)
        assert m
        key, version = m.group(1), int(m.group(2) or 1)
        if key not in EXPECTED:
            unknown.append(f.name)
            continue
        if key in best:
            loser = best[key][1].name if version > best[key][0] else f.name
            superseded.append(loser)
            if version <= best[key][0]:
                continue
        best[key] = (version, f)
    missing = [k for k in EXPECTED if k not in best]

    lines = ["| Asset | Used file | Source size | Output |", "|---|---|---|---|"]
    anchors: dict[str, dict[str, float]] = {}
    GAME.mkdir(parents=True, exist_ok=True)
    for old in GAME.glob("*.png"):
        old.unlink()

    def record(key: str, source: Image.Image, out: Image.Image, note: str = "") -> None:
        lines.append(f"| {key} | {best[key][1].name} | {source.width}×{source.height} | {out.width}×{out.height}{' — ' + note if note else ''} |")

    # Characters: one scale per character, taken from the idle pose.
    for c in CHARACTERS:
        idle_key = f"char_{c}_idle"
        if idle_key not in best:
            continue
        idle = load(best[idle_key][1])
        ix0, iy0, ix1, iy1 = bbox(body_mask(idle))
        stand_px = 1024 * STAND_FRACTION
        costume_pairs = [(f"costume_{k}_{p}", p) for k in COSTUMES.get(c, []) for p in COSTUME_POSES]
        for pose, scale_pose in [(p, p) for p in POSES] + costume_pairs:
            key = f"char_{c}_{pose}"
            if key not in best:
                continue
            img = load(best[key][1])
            if pose == "master":
                out = fit(img, (2048, 1024), 0.92)
                save(out, NORMALIZED / f"{key}.png")
                record(key, img, out, "reference only")
                continue
            if pose == "portrait":
                out = fit(img, (1024, 1024), 0.92)
                save(out, NORMALIZED / f"{key}.png")
                game = out.resize((512, 512), Image.LANCZOS)
                save(game, GAME / f"{key}.png")
                record(key, img, out)
                continue
            mask = body_mask(img)
            box = bbox(mask)
            axis, ratio = POSE_SCALE_BY_CHAR.get(c, {}).get(scale_pose, POSE_SCALE[scale_pose])
            size = (box[3] - box[1]) if axis == "h" else (box[2] - box[0])
            scale = stand_px * ratio / size
            fx = foot_x(mask, box) if not pose.endswith("sleep") else (box[0] + box[2]) / 2
            out = place(img, scale, (1024, 1024), (fx, box[3]), (512, 1024 * 0.96))
            save(out, NORMALIZED / f"{key}.png")
            game = out.resize((GAME_CHAR, GAME_CHAR), Image.LANCZOS)
            save(game, GAME / f"{key}.png")
            # Feet anchor and standing height as fractions of the game image.
            anchors[key] = {"footX": 0.5, "footY": 0.96, "standHeight": STAND_FRACTION}
            clipped = (out.getchannel("A").getbbox() or (0, 0, 0, 0))
            note = "clipped at canvas edge — check" if clipped[0] == 0 or clipped[1] == 0 or clipped[2] == 1024 else ""
            record(key, img, out, note)

    for f in FURNITURE:
        key = f"furn_{f}"
        if key not in best:
            continue
        img = load(best[key][1])
        out = fit(img, (1024, 1024), 0.92, bottom=True, margin=0.02)
        save(out, NORMALIZED / f"{key}.png")
        save(trimmed(out).resize((lambda t: (max(1, t.width // 2), max(1, t.height // 2)))(trimmed(out)), Image.LANCZOS), GAME / f"{key}.png")
        record(key, img, out)

    for i in ICONS:
        key = f"icon_{i}"
        if key not in best:
            continue
        img = load(best[key][1])
        out = fit(img, (256, 256), 0.94)
        save(out, NORMALIZED / f"{key}.png")
        save(out.resize((128, 128), Image.LANCZOS), GAME / f"{key}.png")
        record(key, img, out)

    for key in ["parcel_closed", "parcel_open", *CARDS]:
        if key not in best:
            continue
        img = load(best[key][1])
        out = fit(img, (1024, 1024), 0.9)
        save(out, NORMALIZED / f"{key}.png")
        save(out.resize((512, 512), Image.LANCZOS), GAME / f"{key}.png")
        record(key, img, out)

    for key, size in [("ui_panel", (512, 512)), ("ui_button", (512, 160)), ("ui_button_primary", (512, 160))]:
        if key not in best:
            continue
        img = load(best[key][1])
        out = trimmed(img, 0).resize(size, Image.LANCZOS)  # stretched to the brief's frame; edges stay intact
        save(out, NORMALIZED / f"{key}.png")
        save(out, GAME / f"{key}.png")
        record(key, img, out, "stretched to brief frame")

    for room, (rw, rh) in ROOMS.items():
        key = f"room_{room}_background"
        if key not in best:
            continue
        img = Image.open(best[key][1]).convert("RGB")
        # Centre-crop to the room's proportions first so nothing is stretched.
        target = rw / rh
        if abs(img.width / img.height - target) / target < 0.04:
            img_c = img  # close enough: resize as before
        elif img.width / img.height > target:
            cw = round(img.height * target)
            img_c = img.crop(((img.width - cw) // 2, 0, (img.width - cw) // 2 + cw, img.height))
        else:
            ch = round(img.width / target)
            img_c = img.crop((0, (img.height - ch) // 2, img.width, (img.height - ch) // 2 + ch))
        out = img_c.resize((rw, rh), Image.LANCZOS)
        save(out, NORMALIZED / f"{key}.png")
        gw, gh = round(rw * 0.8), round(rh * 0.8)
        out.resize((gw, gh), Image.LANCZOS).save(GAME / f"{key}.png", optimize=True)
        record(key, img, out.convert("RGBA"), f"fitted to room proportions; game copy {gw}×{gh}")

    (GAME / "anchors.json").write_text(json.dumps(anchors, indent=2) + "\n")
    subprocess.run(["node", str(ROOT / "tools" / "build-asset-manifest.mjs")], check=True)

    summary = [
        f"Expected {len(EXPECTED)} assets; found {len(best)}.",
        f"Missing: {', '.join(missing) if missing else 'none'}.",
        f"Unknown file names: {', '.join(unknown) if unknown else 'none'}.",
        f"Superseded by a newer version: {', '.join(superseded) if superseded else 'none'}.",
        f"Excluded on review: {'; '.join(f'{k} ({v})' for k, v in excluded.items()) if excluded else 'none'}.",
    ]
    print("\n".join(summary))
    if report_path:
        report_path.write_text("\n".join(summary) + "\n\n" + "\n".join(lines) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
