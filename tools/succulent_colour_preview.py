"""Succulent colour preview: stage blend (green seedling -> pale young -> mature colour) plus tip blush.
Blush sits on leaf tips: strong near the silhouette edge AND far from the plant's anchor (centre or base).
Edge pixels are alpha-blended from luminance, so no coloured halo. Brown wood (Teacup Tree trunk) is kept untinted."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

def load(p):
    a = np.asarray(Image.open(p).convert("RGB")).astype(float) / 255
    L = a.mean(2)
    alpha = np.clip((0.965 - L) / 0.06, 0, 1)                     # soft silhouette, no halo
    raw = alpha > 0.5
    holes = ndimage.binary_fill_holes(raw) & ~raw
    lab, n = ndimage.label(holes)
    sizes = ndimage.sum(holes, lab, range(1, n + 1))
    small = np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz < 400])  # fill only tiny gaps, keep sky between branches
    solid = raw | small
    alpha = np.where(solid, np.maximum(alpha, ndimage.binary_erosion(solid, iterations=2)), alpha)
    shade = np.clip(L / np.median(L[solid]), 0, 1.35)
    wood = (a[..., 0] - a[..., 1] > 0.035) & solid                  # brown: red clearly above green
    wood = ndimage.binary_opening(wood, iterations=2)
    return a, alpha, solid, shade, wood

def tip_weight(solid, anchor, k=45):
    d = ndimage.distance_transform_edt(solid)
    edge = np.exp(-d / k)
    ys, xs = np.nonzero(solid)
    if anchor == "centre": cy, cx = ys.mean(), xs.mean()
    elif anchor == "base": cy, cx = ys.max(), xs.mean()
    else: cy, cx = ys.min(), xs.mean()                              # "top" (trailing plants hang from the crown)
    yy, xx = np.indices(solid.shape)
    r = np.hypot(yy - cy, xx - cx); r = r / r[solid].max()
    radial = np.clip((r - 0.30) / 0.60, 0, 1) ** 1.3
    return np.clip((edge ** 0.6) * radial * 1.1, 0, 1)

def render(data, body, blush=None, strength=0.0, anchor="centre", wood_col=(0.62, 0.48, 0.38)):
    a, alpha, solid, shade, wood = data
    out = shade[..., None] * np.array(body)
    if blush is not None and strength > 0:
        w = tip_weight(solid, anchor) * strength
        out = out * (1 - w[..., None]) + shade[..., None] * np.array(blush) * w[..., None]
    out = np.where(wood[..., None], shade[..., None] * np.array(wood_col), out)
    out = np.clip(out, 0, 1)
    res = out * alpha[..., None] + (1 - alpha[..., None])
    return Image.fromarray((res * 255).astype(np.uint8))

def lerp(c1, c2, t): return tuple(x * (1 - t) + y * t for x, y in zip(c1, c2))

GREEN = (0.56, 0.78, 0.50)
PALE = (0.72, 0.82, 0.84)
if __name__ == "__main__":
    import sys
    src, dst = sys.argv[1], sys.argv[2]
    plants = [  # file, label, mature colour, blush colour, anchor
        ("own_meringue_rose.png", "Meringue Rose", (0.70, 0.80, 0.93), (0.95, 0.42, 0.55), "centre"),
        ("own_gumdrop_cluster.png", "Gumdrop Cluster", (0.80, 0.73, 0.93), (0.92, 0.42, 0.62), "base"),
        ("own_stitchback.png", "Stitchback", (0.98, 0.80, 0.64), (0.93, 0.42, 0.25), "base"),
        ("own2_teacup_tree.png", "Teacup Tree", (0.96, 0.72, 0.78), (0.88, 0.28, 0.38), "base"),
        ("own_ribbon_fall.png", "Ribbon Fall", (0.72, 0.54, 0.74), (0.93, 0.40, 0.55), "top"),
    ]
    stages = [("seedling", 0.0, 0.0), ("young", 0.45, 0.0), ("mature", 1.0, 0.0), ("sun blush", 1.0, 0.85)]
    cell = 230
    sheet = Image.new("RGB", (cell * 4 + 150, cell * 5 + 40), "white"); d = ImageDraw.Draw(sheet)
    for j, (lab, _, _) in enumerate(stages): d.text((150 + j * cell + 8, 10), lab, fill=0)
    for i, (f, name, mat, bl, anch) in enumerate(plants):
        data = load(f"{src}/{f}")
        d.text((8, 40 + i * cell + cell // 2), name, fill=0)
        for j, (_, t, s) in enumerate(stages):
            body = lerp(GREEN, PALE, t / 0.45) if t <= 0.45 else lerp(PALE, mat, (t - 0.45) / 0.55)
            im = render(data, body, bl, s, anch).resize((cell - 10, cell - 10), Image.LANCZOS)
            sheet.paste(im, (150 + j * cell + 5, 30 + i * cell + 5))
    sheet.save(dst)
