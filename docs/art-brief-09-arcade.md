# 09 ART & UI BRIEF — The Arcade (Milestone D mini-games)

Approved by Marcus on 15 Nov 2026: all nine new mini-games go in, plus the existing Button Catch. **ChatGPT designs every screen and makes all images; Claude writes all the code.** This brief explains each game's rules and screen layout so the art fits the code exactly.

All rules from **04 ART BRIEF** still apply: soft felt-and-stitch storybook plush style, plain white background for single objects, no text baked into images (the game adds all words and numbers), no logos, nothing that resembles an existing game. Upload to a new Drive folder **03 ART INBOX — Milestone D**. Use the exact file names; for redos add `_v2`, `_v3`.

The game is **landscape only on phones** (design for 740×360 points, must also work at 640×320). Every tap target at least 44×44 points. Children play, so keep it gentle: no fail sounds, no harsh red, no timers that punish (timers only end the round).

---

## Part A — Arcade screens (UI design, 5 files)

Deliver these as **flat mock-up images** (PNG, 1480×720, which is 740×360 at 2×) showing the screen with real-looking content, plus the separate pieces listed in Part B. Claude rebuilds them in code from the mock-ups, so clarity matters more than polish.

| File | What it shows |
|---|---|
| `ui_arcade_hub.png` | The Arcade page inside Explore. A grid of 10 game cards (2 rows × 5, scrolling sideways is fine). Each card: game picture, game name, host resident's face in a corner, "Plays left today 2/3", best score, a lock state for games not yet unlocked ("Home Level 4"). The player's Ribbon count at top. Left tab rail and top bar stay as they are now. |
| `ui_game_intro.png` | The screen before a game starts: big game picture, host resident saying one line of how to play, the three reward milestones as a row of locked/unlocked prize cards (e.g. "Score 30: Teacup Set"), and a big Play button. |
| `ui_game_frame.png` | The in-game frame every game shares: thin top bar with score (left), time or moves (centre), pause button (right). Everything else is the play area. |
| `ui_game_results.png` | Results card: score, best score, Ribbons earned, a prize unlocking with a little celebration, buttons "Play again" and "Back to Arcade". |
| `ui_prize_reveal.png` | Full-screen reveal when an exclusive prize unlocks (similar feeling to the Mystery Parcel reveal): the prize item large in the centre, its name, and "Placed in your storage" / "New companion!". |

## Part B — UI pieces (single objects on white, 1024×1024 unless stated)

`ui_card_frame.png` (game card border, 9-slice friendly: plain middle, decorated corners), `ui_prize_slot_locked.png`, `ui_prize_slot_open.png`, `ui_pause_button.png`, `ui_star_burst.png` (celebration sparkle), `ui_play_button.png` (wide pill, 1024×384).

---

## Part C — The ten games

Each game: a **card picture** `game_<id>_card.png` (1024×1024 square scene, shown on the hub and intro), plus the **play pieces** listed. Pieces are single objects on white, 1024×1024 unless stated. All games last about 30–60 seconds.

### 1. Button Catch (exists) — host: Snug
Card only: `game_button_catch_card.png`. Plus `game_button_catch_button.png` and `game_button_catch_gold.png` (a sewing button and a shiny golden one, viewed from above).

### 2. Memory Match — host: Tinker — unlocks Level 2
Flip cards to find pairs. Grid of 4×3 (6 pairs), later 4×4. Score from pairs found and fewest flips.
Files: `game_memory_card.png`, `game_memory_back.png` (card back with a stitched pattern, portrait 2:3 shape, 683×1024), `game_memory_face_01.png` … `_08.png` (eight different cute faces/objects for pairs: button, spool, teacup, star, leaf, moon, key, heart — each as a card face, 683×1024).

### 3. Glyph Garden (hieroglyph-style symbol puzzle) — host: Patcha — unlocks Level 5
A row of stitched picture-symbols forms a code; the player chooses which symbol completes each pattern, or decodes a short "message" by matching symbols to a key shown at the top. Gentle logic, no reading needed.
Files: `game_glyph_card.png`, `game_glyph_tile.png` (blank square stone/fabric tile), `game_glyph_01.png` … `_12.png` (twelve simple, clearly different symbols stitched in thread: sun, moon, leaf, drop, flame, house, bird, fish, key, star, heart, spiral; each on its own tile, 512×512), `game_glyph_scroll.png` (the key/legend backdrop, 1024×512).

### 4. Cosy Kitchen (cooking game) — host: Bloomi — unlocks Level 3
A recipe card shows 3–5 steps; the player follows quick gestures: tap to chop, hold to stir, swipe to flip, drag ingredients into the pot. Three dishes to start: Berry Tart, Vegetable Soup, Pancakes.
Files: `game_kitchen_card.png`, `game_kitchen_counter.png` (wide counter background, 2400×1040), `game_kitchen_pot.png`, `game_kitchen_pan.png`, `game_kitchen_board.png` (chopping board), `game_kitchen_bowl.png`, ingredients `game_kitchen_berry.png`, `_flour.png`, `_egg.png`, `_carrot.png`, `_potato.png`, `_butter.png`, finished dishes `game_kitchen_dish_tart.png`, `_dish_soup.png`, `_dish_pancakes.png`.

### 5. Stitch-a-Pattern (sewing) — host: Patcha — unlocks Level 2
Trace a dotted stitch line with your finger; accuracy and speed give points. Patterns get curvier.
Files: `game_stitch_card.png`, `game_stitch_fabric.png` (fabric square in a wooden embroidery hoop, seen from above), `game_stitch_needle.png`, `game_stitch_done_01.png` … `_04.png` (four finished embroidered motifs shown at the end: flower, heart, star, cottage).

### 6. Garden Tending — host: Bloomi — unlocks Level 4
Flower pots sprout; tap to water before they droop, tap again to pick when they bloom. Weeds pop up; tap to pull.
Files: `game_garden_card.png`, `game_garden_bed.png` (soil bed background, 2400×1040), `game_garden_pot.png`, `game_garden_sprout.png`, `game_garden_bud.png`, `game_garden_bloom_01.png` … `_03.png` (three flower colours), `game_garden_droop.png`, `game_garden_weed.png`, `game_garden_can.png` (watering can).

### 7. Spot the Difference — host: Mischi — unlocks Level 6
Two copies of a cosy room scene side by side; tap the 5 differences.
Files: `game_spot_card.png`, and three scene pairs (each 1200×1040): `game_spot_scene_01_a.png` / `_01_b.png`, `_02_a` / `_02_b`, `_03_a` / `_03_b`. Each **b** must differ from its **a** in exactly 5 small, clear ways (a missing cup, a different flower colour, a moved picture…). Also deliver `game_spot_scene_01_diffs.png` etc.: a copy of **b** with each difference circled, so Claude can place the tap zones exactly. No characters from the game in the scenes.

### 8. Lantern Lights (sequence memory, Simon-style) — host: Glim — unlocks Level 5
Four lanterns glow in a sequence; repeat it. Sequence grows by one each round.
Files: `game_lantern_card.png`, `game_lantern_backdrop.png` (night garden, 2400×1040), `game_lantern_off.png` and `game_lantern_on.png` in four colours: `_pink`, `_blue`, `_yellow`, `_green` (so 8 files, e.g. `game_lantern_pink_on.png`). Colours must also differ in shape/pattern (heart, moon, star, leaf) for colour-blind players.

### 9. Parcel Sorting — host: Pippo — unlocks Level 7
Parcels slide in; drag each to the basket with the matching resident stamp. Speeds up gently.
Files: `game_parcel_card.png`, `game_parcel_belt.png` (wooden conveyor/slide, 2400×600), `game_parcel_box_01.png` … `_04.png` (four parcel styles), `game_parcel_stamp_<resident>.png` for all ten residents (small round stamp of each resident's face, 512×512: snug, tinker, mischi, bloomi, glim, mopey, pippo, hush, patcha, luma), `game_parcel_basket.png`.

### 10. Hide and Seek — host: Hush — unlocks Level 8
Played in the player's own room using existing art: residents hide behind furniture; tap where they are. Only small new pieces needed.
Files: `game_hide_card.png`, `game_hide_peek.png` (a pair of eyes peeking, to overlay on furniture), `game_hide_found.png` (a little "found you!" puff, no text).

---

## Part D — Exclusive prizes (earned only in the Arcade)

Each game unlocks three prizes at score milestones. Prizes are new furniture (placeable, with atmosphere tags) or companions (small pets that follow a resident around). Furniture follows the 07 brief rules (1024×1024, three-quarter view, item only). Companions: 512×512, idle and walk pose, facing right.

| Game | Prize 1 (furniture) | Prize 2 (furniture) | Prize 3 (companion) |
|---|---|---|---|
| Button Catch | `furn_button_jar` (1×1) | `furn_button_rug` (rug 2×2) | `pet_button_mouse_idle`, `_walk` |
| Memory Match | `furn_card_table` (2×1) | `furn_photo_wall` (wall 2×1) | `pet_paper_crane_idle`, `_walk` |
| Glyph Garden | `furn_stone_tablet` (1×1) | `furn_glyph_banner` (wall 1×1) | `pet_tiny_tortoise_idle`, `_walk` |
| Cosy Kitchen | `furn_mini_oven` (1×1) | `furn_teacup_set` (1×1) | `pet_teapot_sprite_idle`, `_walk` |
| Stitch-a-Pattern | `furn_sewing_basket` (1×1) | `furn_embroidery_hoop` (wall 1×1) | `pet_yarn_kitten_idle`, `_walk` |
| Garden Tending | `furn_flower_cart` (2×1) | `furn_trellis_arch` (2×1) | `pet_bumblebee_idle`, `_walk` |
| Spot the Difference | `furn_magnifier_lamp` (1×1) | `furn_puzzle_frame` (wall 1×1) | `pet_curious_owl_idle`, `_walk` |
| Lantern Lights | `furn_firefly_jar` (1×1) | `furn_lantern_string` (wall 2×1) | `pet_firefly_idle`, `_walk` |
| Parcel Sorting | `furn_mailbox` (1×1) | `furn_parcel_stack` (1×1) | `pet_carrier_pigeon_idle`, `_walk` |
| Hide and Seek | `furn_play_tent` (2×1) | `furn_peek_curtain` (wall 2×1) | `pet_shadow_bunny_idle`, `_walk` |

Companions should be clearly smaller than residents (about a third of their height), cute, and different from every resident.

---

## Delivery order
1. Part A and Part B (screens and UI pieces) — Claude builds the Arcade around these first.
2. Games in this order: Memory Match, Stitch-a-Pattern, Cosy Kitchen, Garden Tending, Glyph Garden, Lantern Lights, Spot the Difference, Parcel Sorting, Hide and Seek, then the Button Catch pieces.
3. Part D prizes, game by game.

Upload each part as soon as it is done and say which part is finished.

## Checks before uploading
- No words or numbers inside any image.
- Single objects on plain white, nothing cropped.
- Colours readable for colour-blind players where colour matters (lanterns, flowers).
- Same felt-and-stitch style as the rest of the game.
