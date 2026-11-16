"""Import ChatGPT source art into the game.

Usage:  python3 tools/import_art.py <folder-with-source-pngs> [--report report.md] [--add]

Without --add the folder must hold the WHOLE source set: the game folder is cleared and rebuilt
from it, so a partial folder is refused. With --add only the files in the folder are imported and
every other game image is left alone (use this for a few new or redrawn files).

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
    # Milestone D: Arcade prizes
    "button_jar", "button_rug", "card_table", "photo_wall", "stone_tablet", "glyph_banner", "mini_oven", "teacup_set",
    "sewing_basket", "embroidery_hoop", "flower_cart", "trellis_arch", "magnifier_lamp", "puzzle_frame", "firefly_jar",
    "lantern_string", "mailbox", "parcel_stack", "play_tent", "peek_curtain",
]
# Milestone D: companions (pet_<id>_idle / _walk, facing right) and Arcade art.
PETS = ["button_mouse", "paper_crane", "tiny_tortoise", "teapot_sprite", "yarn_kitten", "bumblebee", "curious_owl", "firefly", "carrier_pigeon", "shadow_bunny"]
PET_POSES = ["idle", "walk"]
ARCADE_GAMES = ["button_catch", "memory", "glyph", "kitchen", "stitch", "garden", "spot", "lantern", "parcel", "hide"]
RESIDENT_STAMPS = CHARACTERS
# Play pieces: single objects on white -> transparent, trimmed, longest side scaled to the given size.
ARCADE_SPRITES: dict[str, int] = {
    "game_button_catch_button": 192, "game_button_catch_gold": 192,
    "game_memory_back": 320, **{f"game_memory_face_{i:02d}": 320 for i in range(1, 9)},
    "game_glyph_tile": 192, **{f"game_glyph_{i:02d}": 192 for i in range(1, 13)}, "game_glyph_scroll": 768,
    **{f"game_kitchen_{k}": 256 for k in ["pot", "pan", "board", "bowl", "berry", "flour", "egg", "carrot", "potato", "butter", "dish_tart", "dish_soup", "dish_pancakes"]},
    "game_stitch_fabric": 640, "game_stitch_needle": 192, **{f"game_stitch_done_{i:02d}": 640 for i in range(1, 5)},
    **{f"game_garden_{k}": 256 for k in ["pot", "sprout", "bud", "bloom_01", "bloom_02", "bloom_03", "droop", "weed", "can"]},
    **{f"game_lantern_{c}_{st}": 256 for c in ["pink", "blue", "yellow", "green"] for st in ["on", "off"]},
    "game_parcel_belt": 1200, "game_parcel_basket": 256, **{f"game_parcel_box_{i:02d}": 224 for i in range(1, 5)},
    **{f"game_parcel_stamp_{r}": 160 for r in RESIDENT_STAMPS},
    "game_hide_peek": 160, "game_hide_found": 224,
    "ui_card_frame": 512, "ui_prize_slot_locked": 256, "ui_prize_slot_open": 256, "ui_pause_button": 128,
    "ui_star_burst": 384, "ui_play_button": 512,
}
# Full-bleed pictures (no background removal): name -> game copy size.
ARCADE_PICTURES: dict[str, tuple[int, int]] = {
    **{f"game_{g}_card": (512, 512) for g in ARCADE_GAMES},
    "game_kitchen_counter": (1200, 520), "game_garden_bed": (1200, 520), "game_lantern_backdrop": (1200, 520),
    **{f"game_spot_scene_{i:02d}_{v}": (720, 624) for i in range(1, 4) for v in ["a", "b"]},
}
# Design references kept in art/normalized only (screen mock-ups and the annotated difference images).
REFERENCES = ["ui_arcade_hub", "ui_game_intro", "ui_game_frame", "ui_game_results", "ui_prize_reveal"] + [f"game_spot_scene_{i:02d}_diffs" for i in range(1, 4)]
# Costume pose sets: char_<id>_costume_<costumeId>_<pose>
# Brief 08 costumes, plus the ten brief 10 costumes (one per resident).
COSTUMES = {
    "mopey": ["umbrella", "boots"], "mischi": ["wings", "party"], "hush": ["wings", "cloak"],
    "snug": ["cape"], "tinker": ["apron"], "bloomi": ["bonnet"], "glim": ["comet"],
    "pippo": ["pack"], "patcha": ["quilt"], "luma": ["crown"],
}
COSTUME_POSES = ["idle", "walk", "walk2", "sit", "sleep"]
# Files delivered with a baked-in ground shadow; the importer strips it (flagged for redraw).
# Brief 08 delivered three Mischi wing poses with a ground shadow; their _v2 redraws (brief 10) are clean.
SHADOW_FIX: set[str] = set()
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
    + [f"pet_{p}_{q}" for p in PETS for q in PET_POSES]
    + list(ARCADE_SPRITES) + list(ARCADE_PICTURES) + REFERENCES
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
    # The umbrella widens Mopey's costume sleep, so it is drawn larger to match the normal sleep size.
    "mopey": {"sit": ("h", 0.94), "decorated_sit": ("h", 0.94), "costume_umbrella_sleep": ("w", 1.15)},
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


def remove_ground_shadow(img: Image.Image) -> Image.Image:
    """Drop a baked-in ground shadow: dull grey-brown pixels (and their pale rim) in the bottom
    band of the figure, kept only if they are not part of a colourful body region above."""
    rgba = np.array(img)
    a = rgba[:, :, 3] > 24
    if not a.any():
        return img
    ys, xs = np.where(a)
    y0, y1 = ys.min(), ys.max()
    band_top = int(y1 - (y1 - y0) * 0.09)
    rgb = rgba[:, :, :3].astype(float) / 255
    mx, mn = rgb.max(2), rgb.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    dull = a & (sat < 0.32) & (mx < 0.78)
    pale = a & (sat < 0.10) & (mx >= 0.78)
    cand = (dull | pale)
    cand[:band_top] = False
    labels, n = ndimage.label(cand)
    for i in range(1, n + 1):
        region = labels == i
        rys, rxs = np.where(region)
        # a shadow is a wide, flat blob touching the very bottom of the figure
        if rys.max() >= y1 - 2 and (rxs.max() - rxs.min()) > 3 * max(1, rys.max() - rys.min()):
            rgba[region, 3] = 0
    return Image.fromarray(rgba)


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
    add_mode = "--add" in args

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
    if not add_mode and len(best) < len(EXPECTED) * 0.8:
        # Guard: a full import clears the game folder first, so a partial folder would delete most of the art.
        print(f"Only {len(best)} of {len(EXPECTED)} expected assets are in {src}. Nothing changed.")
        print("To import just these files and keep the rest, run again with --add.")
        return 2
    anchors: dict[str, dict[str, float]] = {}
    GAME.mkdir(parents=True, exist_ok=True)
    if add_mode:
        anchors_file = GAME / "anchors.json"
        if anchors_file.exists():
            anchors = json.loads(anchors_file.read_text())
    else:
        for old in [*GAME.glob("*.png"), *GAME.glob("*.webp")]:
            old.unlink()

    def record(key: str, source: Image.Image, out: Image.Image, note: str = "") -> None:
        lines.append(f"| {key} | {best[key][1].name} | {source.width}×{source.height} | {out.width}×{out.height}{' — ' + note if note else ''} |")

    mirrored_sleep: list[str] = []

    def sleep_head_left(im: Image.Image) -> bool:
        """Head side of a lying figure: the side with more mass in the top third (ears and head)."""
        m = body_mask(im)
        x0, y0, x1, y1 = bbox(m)
        top = m[y0 : y0 + (y1 - y0) // 3, x0:x1]
        ys, xs = np.nonzero(top)
        return xs.size > 0 and xs.mean() < (x1 - x0) / 2

    # Characters: one scale per character, taken from the idle pose.
    for c in CHARACTERS:
        idle_key = f"char_{c}_idle"
        if idle_key not in best and not add_mode:
            continue
        stand_px = 1024 * STAND_FRACTION
        costume_pairs = [(f"costume_{k}_{p}", p) for k in COSTUMES.get(c, []) for p in COSTUME_POSES]
        for pose, scale_pose in [(p, p) for p in POSES] + costume_pairs:
            key = f"char_{c}_{pose}"
            if key not in best:
                continue
            img = load(best[key][1])
            if key in SHADOW_FIX:
                img = remove_ground_shadow(img)
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
            if scale_pose.endswith("sleep") and sleep_head_left(img):
                # The game expects every sleep pose with the head on the right (like Snug's);
                # mirror ones drawn the other way so residents always lie with their head on the pillow.
                img = img.transpose(Image.FLIP_LEFT_RIGHT)
                mirrored_sleep.append(key)
            mask = body_mask(img)
            box = bbox(mask)
            overrides = POSE_SCALE_BY_CHAR.get(c, {})
            axis, ratio = overrides.get(pose) or overrides.get(scale_pose) or POSE_SCALE[scale_pose]
            size = (box[3] - box[1]) if axis == "h" else (box[2] - box[0])
            scale = stand_px * ratio / size
            fx = foot_x(mask, box) if not pose.endswith("sleep") else (box[0] + box[2]) / 2
            # Feet go to the bottom-centre. If something trailing (a long scarf, a streamer) would then
            # be cut off at the side, slide the whole figure over just enough and record where the
            # feet ended up, so the game still stands the character on the same spot.
            dst_x = 512.0
            left, right = dst_x + (box[0] - fx) * scale, dst_x + (box[2] - fx) * scale
            edge = 6
            if right - left <= 1024 - 2 * edge:
                if left < edge:
                    dst_x += edge - left
                elif right > 1024 - edge:
                    dst_x -= right - (1024 - edge)
            out = place(img, scale, (1024, 1024), (fx, box[3]), (dst_x, 1024 * 0.96))
            save(out, NORMALIZED / f"{key}.png")
            game = out.resize((GAME_CHAR, GAME_CHAR), Image.LANCZOS)
            save(game, GAME / f"{key}.png")
            # Feet anchor and standing height as fractions of the game image.
            anchors[key] = {"footX": round(dst_x / 1024, 4), "footY": 0.96, "standHeight": STAND_FRACTION}
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

    # Companions: one scale per pet so idle and walk match; feet bottom-centre like the residents.
    PET_CANVAS, PET_FILL_H, PET_FILL_W = 512, 0.80, 0.92
    for pet in PETS:
        keys = [f"pet_{pet}_{q}" for q in PET_POSES if f"pet_{pet}_{q}" in best]
        if not keys:
            continue
        imgs = {k: load(best[k][1]) for k in keys}
        boxes = {k: bbox(body_mask(im)) for k, im in imgs.items()}
        ref = boxes.get(f"pet_{pet}_idle") or next(iter(boxes.values()))
        widest = max(b[2] - b[0] for b in boxes.values())
        scale = min(PET_CANVAS * PET_FILL_H / (ref[3] - ref[1]), PET_CANVAS * PET_FILL_W / widest)
        for k, im in imgs.items():
            m = body_mask(im)
            box = boxes[k]
            out = place(im, scale, (PET_CANVAS, PET_CANVAS), (foot_x(m, box), box[3]), (PET_CANVAS / 2, PET_CANVAS * 0.96))
            save(out, NORMALIZED / f"{k}.png")
            save(out.resize((256, 256), Image.LANCZOS), GAME / f"{k}.png")
            anchors[k] = {"footX": 0.5, "footY": 0.96, "standHeight": PET_FILL_H}
            record(k, im, out)

    for key, longest in ARCADE_SPRITES.items():
        if key not in best:
            continue
        img = trimmed(load(best[key][1]), 2)
        factor = longest / max(img.width, img.height)
        out = img.resize((max(1, round(img.width * factor)), max(1, round(img.height * factor))), Image.LANCZOS)
        save(img, NORMALIZED / f"{key}.png")
        out.save(GAME / f"{key}.webp", quality=88, method=6)  # Arcade art is shown in the page, not Phaser: WebP keeps it small
        record(key, img, out, "trimmed, WebP")

    for key, size in ARCADE_PICTURES.items():
        if key not in best:
            continue
        img = Image.open(best[key][1]).convert("RGB")
        save(img, NORMALIZED / f"{key}.png")
        out = img.resize(size, Image.LANCZOS)
        out.save(GAME / f"{key}.webp", quality=86, method=6)
        record(key, img.convert("RGBA"), out.convert("RGBA"), "WebP")

    for key in REFERENCES:
        if key in best:
            img = Image.open(best[key][1]).convert("RGB")
            save(img, NORMALIZED / f"{key}.png")
            record(key, img.convert("RGBA"), img.convert("RGBA"), "reference only")

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
