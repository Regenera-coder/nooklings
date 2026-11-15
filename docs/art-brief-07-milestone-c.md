# 07 ART BRIEF — Milestone C, full set (rooms, furniture, seven new residents, walk animation, Decorated forms)

Approved by Marcus on 15 Nov 2026: make everything in this brief now. Milestone C is live, and every item below already has a place in the game waiting for its art.

All style, canvas, background and naming rules from **04 ART BRIEF** still apply: soft felt-and-stitch storybook plush style, plain white background, one subject per file, no text, no logos, no watermarks, no ground shadows. Match the approved art in **01** and **02**. Do not redesign Snug, Tinker or Mischi; Mischi is the four-point Mischief Star design (brief 06).

Upload to the Drive folder **03 ART INBOX — Milestone C** using the exact file names below. If you redo a file, add `_v2`, `_v3` and so on; the newest version is used automatically. Upload each part as soon as it is done; Claude reviews as files arrive. Please do one complete resident set (Bloomi) early, so any framing problems are caught before the rest.

Total: 118 files.

---

## Part 1 — rooms, furniture, icon and Explore cards (21 files)

### Room backgrounds (empty, no furniture, no characters)

| File | Size | What it shows |
|---|---|---|
| `room_sunroom_background.png` | 2400×1092 | Bright conservatory: back wall of tall arched windows with soft daylight, pale green walls, warm cream or terracotta tiled floor. Door near the **left** end of the back wall (second of ten columns). Top 32% wall, bottom 68% floor seen from slightly above, like the Living Room. |
| `room_yard_background.png` | 2400×886 | Small cottage garden: sky and hedge across the top 28%, a low picket fence, flat lawn below. Garden gate at the far **left**. The right 43% of the lawn starts locked (the game shades it), so keep it plain grass. |

### Furniture (1024×1024 each, item only, three-quarter view like the Milestone B furniture)

| File | Footprint | Notes |
|---|---|---|
| `furn_tea_table.png` | 2 wide, floor | Low round tea table with a teapot and two cups |
| `furn_reading_chair.png` | 1 wide, floor, seat | Plump armchair with a knitted throw; residents sit in it |
| `furn_planter_box.png` | 2 wide, floor | Long wooden planter with herbs and small flowers |
| `furn_hanging_plant.png` | 1 wide, wall | Trailing ivy in a macramé hanger |
| `furn_bird_bath.png` | 1 wide, floor | Stone bird bath with a tiny felt bird |
| `furn_garden_bench.png` | 2 wide, floor, seat | Painted wooden bench, works indoors or outdoors |
| `furn_rain_window.png` | 2 wide, wall | Window with rain streaks and a cosy sill cushion |
| `furn_rain_chime.png` | 1 wide, wall | Wind chime of little glass raindrops and a felt cloud |
| `furn_travel_trunk.png` | 1 wide, floor | Old travel trunk with stickers and straps |
| `furn_paper_lanterns.png` | 2 wide, wall | String of three round paper lanterns, softly glowing |
| `furn_zen_stones.png` | 1 wide, floor | Small tray of stacked smooth stones and raked sand |
| `furn_heirloom_chest.png` | 1 wide, floor | Antique chest with a patched fabric lid and brass corners |
| `furn_wishing_lantern.png` | 1 wide, floor, tall | Standing lantern with a warm golden glow shaped like a simple four-point star (it must not look like Mischi's charm: no purple stitch) |

### Icon and Explore cards (1024×1024)

| File | What it shows |
|---|---|
| `icon_keepsake.png` | New currency: a tiny locket or pressed flower in a little frame, same style as the other currency icons |
| `spot_woodpile.png` | Stack of split logs (no axe, child-friendly) |
| `spot_berry_bush.png` | Bush whose berries are little sewing buttons |
| `spot_cotton_patch.png` | Cotton plants with fluffy bolls |
| `exp_meadow.png` | Clover Meadow: rolling clover field with wildflowers, square scene card |
| `exp_old_mill.png` | The Old Mill: creaky wooden watermill by a stream, square scene card |

---

## Part 2 — the seven new residents (56 files)

Eight files per character, the same framing as Snug, Tinker and Mischi: poses 1024×1024, feet at the bottom centre, standing figure about 80% of the canvas height; master turnaround 2048×1024 (front, side, back).

`char_<name>_master`, `char_<name>_idle`, `char_<name>_walk`, `char_<name>_walk2`, `char_<name>_sit`, `char_<name>_sleep`, `char_<name>_happy`, `char_<name>_portrait`

- **idle, walk, walk2:** three-quarter view facing **right** (the game mirrors them for walking left).
- **walk:** mid-step with the **front** foot lifted. **walk2:** the same view, scale and framing, with the **other** foot lifted. The game alternates walk, feet-down idle, walk2, feet-down idle, so the two must line up exactly apart from the legs (and a slight arm or ear swing).
- **sleep:** lying down, head to the left.
- **portrait:** head and shoulders, friendly expression, for the collection book.

| Name | Rarity | Personality | Colours |
|---|---|---|---|
| bloomi | Common | Garden sprite who helps things grow; joyful | leaf green body, pink blossom accent |
| glim | Common | Dreamy little light who visits at night | periwinkle blue body, soft yellow glow |
| mopey | Common | Pouty friend who loves rainy days; moody but sweet | lavender body, deep violet accent |
| pippo | Rare | Energetic helper always ready for a trip; was found napping in a mail sack | apricot orange body, brown accent |
| hush | Rare | Shy moonlit friend who whispers; quiet | dusky charcoal-violet body, pale lilac accent |
| patcha | Epic | Stitched heirloom made of many mended patches; nostalgic | cream body, faded rose patches |
| luma | Secret | Wish-bright secret at the heart of the home; wondrous | warm ivory body, soft gold accent |

Each must be clearly its own creature with its own silhouette, and must not resemble any existing game, film or toy character.

---

## Part 3 — walk animation for the first three residents (6 files)

Same rules as walk2 above, matching each character's existing walk pose exactly except for the legs:

`char_snug_walk2`, `char_tinker_walk2`, `char_mischi_walk2`, `char_snug_decorated_walk2`, `char_tinker_decorated_walk2`, `char_mischi_decorated_walk2`

---

## Part 4 — Decorated forms for the seven new residents (35 files)

Five files per character: `char_<name>_decorated_idle`, `_decorated_walk`, `_decorated_walk2`, `_decorated_sit`, `_decorated_sleep`. Same character, same framing and scale as their original poses, with one added outfit. Keep it simple and readable at small size:

| Name | Decorated outfit |
|---|---|
| bloomi | Crown of felt daisies and a small leaf cape |
| glim | Crescent-moon hair clip and a starry knitted shawl (no nightcap, so it doesn't echo Snug) |
| mopey | Yellow raincoat hood and a tiny felt umbrella |
| pippo | Postal cap and a messenger satchel covered in stamps |
| hush | Lilac hooded cloak with small stitched moons |
| patcha | Golden embroidered patches and a ribbon bow with a brass button |
| luma | Floating golden ribbon ring around the head and soft trailing light ribbons |

---

## Checks before uploading

- White background, nothing cropped, one subject per file.
- Head size and overall height match Snug, Tinker and Mischi when lined up.
- walk and walk2 line up exactly apart from the legs.
- No text, watermarks, signatures or logos.
