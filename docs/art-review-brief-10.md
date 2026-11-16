# Art review — brief 10 (16 Nov 2026)

## Part 2 — Mischi wing costume redraw: PASS (3 of 3)

`char_mischi_costume_wings_idle_v2`, `_walk_v2`, `_sleep_v2` (1024×1024, white background).

- No ground shadow in any of the three (checked with the white range stretched; the old idle and sleep showed a brown smear under the feet and body).
- Same pose, scale and framing as the files they replace: after import the outlines match the old ones to within 3 px.
- Four-point Mischief Star with the purple stitch, scarf, cheek bandage and plum bat wings all unchanged.
- `walk` still pairs with the existing `walk2` (not redrawn) exactly as before.

Imported with `tools/import_art.py <folder> --add`. The importer's shadow-removal step for these three files is now switched off, since the sources are clean.

## Part 3 — Series 2 "Teatime Friends" concept board: 6 approved, 4 to revise

`series_2_teatime_friends_concept_board.png` (1536×1024). Ten characters, right order, no text, style matches Series 1.

| # | Character | Verdict | Note |
|---|---|---|---|
| 1 | Crumb (mouse baker) | Approve | Keeps the baker's cap; the only one with a chef-style hat after the changes below |
| 2 | Mallow (hamster) | Revise | Orange-and-white colouring is close to a well-known cartoon hamster. Make it marshmallow cream all over with one toasted golden-brown patch |
| 3 | Pekoe (otter) | Approve | Teapot-lid hat and leaf scarf read clearly |
| 4 | Jammy (hedgehog) | Approve | |
| 5 | Whisk (duckling) | Revise | Same tall white chef hat as Crumb. Remove the hat; a small tuft of head feathers instead. Keep whisk, bow and apron |
| 6 | Dumple (panda cub) | Approve | |
| 7 | Sprinkle (kitten) | Approve, with a rule | White kitten with a bow: the bow stays on the chest, never on an ear, and the open mouth stays, so it cannot be mistaken for a famous white cat |
| 8 | Toffee (raccoon) | Approve, with a rule | Keeps the flat cap and cookie; never an apron |
| 9 | Soufflé (swan) | Revise | Third chef hat on the board. Remove it; keep the neckerchief and ribbon |
| 10 | Cherri (sprite) | Revise | Drawn as a little fairy girl with hair, elf ears and wings: the only human-like figure in the cast, doll-like, and not glowing. Redraw as a small round cherry-shaped plush creature with a leaf stem and a soft glow |

Pose briefs (13 files per character) wait until the four revisions are approved.

## Part 1 — Snug, Dreamtime Cape: PASS (5 of 5)

`char_snug_costume_cape_idle`, `_walk`, `_walk2`, `_sit`, `_sleep`.

- Snug is unchanged (nightcap, fleece, cloud pillow, closed eyes); only the lavender quilted cape with stars and a button is added.
- White background, no shadow, no text. After import, idle, walk, walk2 and sit match Snug's normal poses to within 4 px.
- `walk` and `walk2` pair correctly.
- Sleep: Snug's head sits a little more upright than in the normal sleep pose, so the figure is about 12% taller on the bed. It reads fine in the room; no redraw needed.
- Source sizes vary (1024, 1254 and 1448×1085); the importer normalises them.

Remaining costumes (45 files): Tinker, Bloomi, Mischi, Glim, Mopey, Pippo, Hush, Patcha, Luma.

## Part 1 — the other nine costumes (delivered 16 Nov, 45 files)

Reviewed against each character's normal poses after import. All 45 files are present, white background, no shadows, no text.

| Costume | Verdict | Notes |
|---|---|---|
| Bloomi — Petal Bonnet | PASS, released | Sunflower bonnet in all five poses; Bloomi unchanged |
| Mischi — Party Surprise | PASS, released | Small cone hat with pom-pom and a streamer; no jester points, no bells added; Mischief Star intact |
| Glim — Comet Scarf | PASS, released | Scarf trails behind in every pose. In `idle` it reaches past the normal frame; the importer now slides such a figure over and the game reads where the feet are, so nothing is cut off |
| Mopey — Puddle Boots | PASS, released | Yellow boots and paper boat; no umbrella, no raincoat |
| Pippo — Trail Pack | PASS, released | Blanket roll, tin mug, compass badge |
| Patcha — Memory Quilt | PASS, released | Patchwork poncho in all five poses |
| Tinker — Workshop Apron | **HOLD: redraw `idle`** | `idle` shows a different character design (fleecy lamb face with a snout, red scarf, different helmet), the same off-model Tinker rejected earlier. The other four poses are correct |
| Hush — Stargazer Cloak | **HOLD: redraw `idle`** | In `idle` the hood is still Hush's purple hood with a navy cape below; in the other four poses the hood is navy with constellations. Hush would change colour every time it stops walking |
| Luma — Wish Crown | **HOLD: redraw all five** | Consistent, but the crown is a thin band of tiny stars under Luma's existing star topper. At game size it is almost invisible; not worth 20 Ribbons as drawn |

Held costumes stay hidden and their images are not in the game.

### Ready-to-paste ChatGPT prompts for the three redraws

**Tinker** (attach Tinker's approved `idle` from 01 APPROVED ART and `char_tinker_costume_apron_walk.png`):

> The first image is the approved standing pose of Tinker. The second shows Tinker correctly wearing the Workshop Apron costume while walking. Redraw the standing pose with the same apron: tan felt apron with two pockets, a tiny felt spanner and a pencil. Tinker must look exactly as in the first image: same round face, same brown aviator helmet with goggles, same olive jacket, same proportions. Do not change the face, do not add fleece, a snout or a scarf. Same pose, framing and scale as the first image. Plain white background, no shadow, no text. Save as `char_tinker_costume_apron_idle_v2.png`.

**Hush** (attach Hush's approved `idle` and `char_hush_costume_cloak_walk.png`):

> The first image is the approved standing pose of Hush. The second shows Hush correctly wearing the Stargazer Cloak costume while walking: a midnight-blue hooded cloak with gold stitched constellations, including the hood, and a tiny telescope. Redraw the standing pose wearing that same cloak. The hood must be midnight blue with constellations, not purple. Everything else about Hush stays as in the first image: face, ears, crescent moon, pose, framing and scale. Plain white background, no shadow, no text. Save as `char_hush_costume_cloak_idle_v2.png`.

**Luma** (attach Luma's five approved poses):

> These are the five approved poses of Luma. Redraw all five with Luma wearing the Wish Crown costume, and make the costume clearly visible at small size: a crown of five large folded-paper stars in warm gold, sitting around the head like a wreath just below Luma's existing star topper, each paper star about a quarter of the width of Luma's face, with a soft golden glow around the crown. Keep Luma exactly as approved in every other way: same face, hair, dress, star topper, pose, framing and scale as each attached image. Plain white background, no shadow, no text. Save as `char_luma_costume_crown_idle_v2.png`, `_walk_v2.png`, `_walk2_v2.png`, `_sit_v2.png`, `_sleep_v2.png`.

## Part 3 — concept board v2: recommended for approval

`series_2_teatime_friends_concept_board_v2.png`. All four requested changes were made and the six approved characters are unchanged.

| Character | Change asked | Result |
|---|---|---|
| Mallow | Cream all over, one toasted patch, no orange | Done |
| Whisk | No chef hat, feather tuft | Done |
| Soufflé | No chef hat | Done (a headband with a flower instead) |
| Cherri | Round cherry creature, not a fairy girl | Done. No visible glow yet, and plainer than the others; the pose brief adds a soft glow |

Crumb is now the only character with a chef-style hat. Pose brief: `art-brief-12-series-2-poses.md`.

## Brief 11 — room backgrounds: PASS (2 of 2)

- `room_kitchen_background.png` (2400×1092): empty, door at the left end of the back wall, one window, bare shelf rail, yellow checked tile band, wooden floor. The floor starts at the same height as in the Sunroom background, so the furniture grid lines up.
- `room_teagarden_background.png` (2400×886): empty stone patio with moss in the gaps, trellis fence with roses, hedge, gate at the far left. Same sky and layout as the Yard, and clearly different from it.

Not imported yet: they go into the game with the Series 2 rooms.
