# Art review — Milestone B delivery (15 Nov 2026)

Source: Drive folder "03 ART INBOX — Milestone B", 54 PNGs. Imported with `tools/import_art.py`.

## Inventory
- All 53 files named in "04 ART BRIEF — Milestone B" are present. Nothing missing, no unknown names.
- `room_living_background_v2.png` is used; `room_living_background.png` is superseded.
- All sprites have real transparency with clean edges (no white halos). Both room backgrounds are opaque, as intended.

## Actual sizes vs the brief (normalized on import)
| Group | Delivered | Brief | Normalized to |
|---|---|---|---|
| Character poses, portraits | 1254×1254 (Snug idle and walk 1024×1024, Snug sleep 1448×1086) | 1024×1024 | 1024×1024, feet bottom-centre at 96%, one scale per character |
| Master turnarounds | Snug 2048×1024; Tinker and Mischi 1774×887 | 2048×1024 | 2048×1024 (reference only, not in game) |
| Furniture, parcels | 1254×1254 | 1024×1024 | 1024×1024 |
| Icons | 1254×1254 | 256×256 | 256×256 |
| Panel | 1254×1254 | 512×512 | 512×512 |
| Buttons | 2172×724 | 512×160 | 512×160 |
| Room background | 1906×825 | 2400×1040 | 2400×1040 (upscaled; same 2.31 aspect) |

Margins varied from 2% to 54% of the canvas; small detached sparkles are ignored when measuring size and foot position. Game copies are half size (characters 512×512).

## In-game checks
- **Character scale and feet:** every pose shares one floor line. Sitting poses were scaled to match head size (Snug and Tinker 92%, Mischi 86% of standing height).
- **Flipping:** only the walk pose is mirrored for leftward movement. Idle, happy and sit are drawn front-facing, so they are never mirrored (accessories stay on their side). Sleep poses have the head on the right, so they are mirrored on the Cloud Bed to rest on the pillow end.
- **Poses** are used as single static images. Walking shows the walk pose with a small bob; there is no frame animation.
- **Room alignment:** v2 splits about 29% wall to 71% floor, against 28% in the game grid; the door centre at about 87% matches the door cell.
- **Furniture scale:** fitted to footprint width; wall items capped to 82% of the wall height; tall floor items capped at 2.3 cells.
- **Depth sorting:** residents correctly pass in front of and behind furniture, sleep on the bed and sit on the sofa.
- **Panel and buttons:** the stitched art stretches cleanly as nine-slice borders (corners and stitching intact).
- **Icons:** readable at 16–28 px.

## Issues for revision (no characters were redesigned)
1. **Decorated forms only have an idle pose.** A decorated resident walks in its decorated idle pose, but sits and sleeps in its original outfit, so the costume disappears on the sofa or bed. Needed: `char_<name>_decorated_walk`, `_decorated_sit`, `_decorated_sleep` for Snug, Tinker and Mischi (9 images).
2. **Idle, happy and sit are front-facing, not three-quarter right** as briefed. This works in game (they aren't flipped), but walking to idle switches between a side view and a front view. Optional: regenerate idle as three-quarter right if that switch bothers you.
3. **Tasks tab icon looks like the Nookbook icon** (both purple books, tick vs star). Readable side by side but easy to confuse. Suggest regenerating `icon_tab_tasks` as the brief's notepad or clipboard with a tick.
4. **Minor proportion drift:** Snug's head is about 10% smaller in `char_snug_happy`; Mischi sitting reads slightly small. Acceptable for now.
5. **Room background resolution** is below the brief (1906 px wide). Fine on phones; would look soft on a large tablet.
6. **Likeness check (owner decision):** Mischi's pink skull charm plus impish personality overlaps with traits of an existing Sanrio character. Worth a deliberate look before anything public.

## Not an art issue, but visible now
At 740×360 a standing resident is about 55 px tall, and about 35 px at 640×320. Faces read; small accessories don't. Consider a zoom gesture or slightly larger residents in Milestone C.

---

# Revision round 1 — 15 Nov 2026

13 candidate files received. Each was compared against the character's master, existing poses and Decorated idle.

| File | Result | Reason |
|---|---|---|
| char_snug_decorated_walk / sit / sleep | Accepted | Same quilted star cape, moon charm, lantern and cloud pillow as Decorated idle; sleep has head on the right |
| char_tinker_decorated_walk / sit / sleep | Accepted | Same brass pauldron, patched apron, clockwork bird and goggles; sleep has head on the right |
| char_mischi_decorated_walk / sit / sleep | Accepted | Same bell collar, starred wings and long sparkling scarf; sleep has head on the right |
| icon_tab_tasks_v2 | Accepted | Stitched clipboard with a tick, clearly different from the Nookbook book at 28 px |
| char_snug_idle_v2 | Accepted | Genuinely three-quarter right; same design, colours and accessories; walk-to-stand switch now matches |
| char_tinker_idle_v2 | Rejected, kept original | Design drift: new snout-and-mouth face (approved Tinker has none), curly fleece hair and ear flaps, red scarf, flatter rendering style. Only a partial turn |
| char_mischi_idle_v2 | Rejected, kept original | Still front-facing (not three-quarter); slightly flatter fur; no improvement over the current idle |

Code: Decorated residents now use Decorated art for idle, walk, sit and sleep (happy falls back to Decorated idle). Walk is mirrored for leftward movement; sleep is mirrored onto the bed's pillow end. All 24 standing, walking, sitting and sleeping poses share one floor line and one scale per character.

Remaining minor notes (no action needed for acceptance):
- Mischi Decorated sit reads slightly larger than her original sit (bigger scarf and collar); within tolerance.
- Tinker and Mischi still switch from a side view (walk) to a front view (idle) when they stop. Optional future fix: a three-quarter idle that keeps the approved design.
