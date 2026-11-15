# Art review — Milestone C (brief 07 full set), 15 Nov 2026

Delivered: 118 files in "03 ART INBOX — Milestone C" (plus `char_glim_sleep_v2` and `char_luma_sleep_v2`; newest version used).

## Imported and in the game (104 files)
- Sunroom and Yard backgrounds, 13 furniture items, Keepsake icon, 3 gathering cards, 2 expedition cards.
- Bloomi, Glim, Mopey, Pippo, Hush, Patcha: complete (8 original + 5 Decorated files each).
- Luma: master, idle, walk, walk2, sit.
- Normalized: poses 1024×1024 with transparency, feet on the shared 96% line; masters 2048×1024; game copies at half size.
- Sitting size matched to standing head size per character (importer overrides).

## Not yet imported (14 files)
The Drive connector stopped returning file data after about 240 downloads this session, so these could not be fetched yet:
`char_snug_walk2`, `char_snug_decorated_walk2`, `char_tinker_walk2`, `char_tinker_decorated_walk2`, `char_mischi_walk2`, `char_mischi_decorated_walk2`, `char_luma_sleep`, `char_luma_happy`, `char_luma_portrait`, `char_luma_decorated_idle`, `_decorated_walk`, `_decorated_walk2`, `_decorated_sit`, `_decorated_sleep`.
They were viewed in Drive and look correct (Mischi walk2 frames keep the four-point star and one-bell knot). Until imported, Luma uses her idle pose when resting and a drawn portrait.

## Checks
| Check | Result |
|---|---|
| Walk cycle | walk → idle → walk2 → idle alternates correctly in game for all six complete residents, Original and Decorated. |
| Walk/walk2 alignment | Body lines up; horizontal offset between the two frames is under 6% of the canvas (tails and capes swing), not visible at game size. |
| Facing | idle, walk, walk2 face right; sleep has the head to the left. |
| Furniture placement | All 13 items fit their footprints; wall items sit on the wall, seats work (Reading Chair and Garden Bench seat heights tuned). |
| Rooms | Sunroom door matches the second column; Yard gate at the left; locked Yard area shades correctly. |

## Needs revision
1. `char_mopey_decorated_sleep` — wears the original purple hat; should wear the yellow raincoat hood like the other Decorated poses.
2. `char_pippo_decorated_sleep` — wears the goggles; should wear the postal cap like the other Decorated poses.

## Design notes for the owner (no change made)
3. Pippo wears aviator goggles very like Tinker's signature goggles.
4. Hush has small bat wings, like Mischi.
5. Glim and Mopey are both lavender with large purple hoods; Glim's brief asked for a periwinkle blue body.
6. Mopey's Decorated set has the raincoat but no tiny umbrella (brief asked for both). Minor.

## Update, 15 Nov evening
- The 14 missing files are now imported (all 180 expected assets present). Snug, Tinker and Mischi walk2 frames verified in game; Luma's full set verified.
- Fixes verified in game: `char_mopey_decorated_sleep_v2` (yellow raincoat hood) and `char_pippo_decorated_sleep_v2` (postal cap).
- Owner decisions: Pippo loses the goggles; Glim reworked to periwinkle blue (brief 08); the tiny umbrella becomes an earnable costume; Mischi's and Hush's wings may become costumes later (on hold, no art change yet).

## Brief 08 review (15 Nov evening) — 73 files, all imported
| Part | Result |
|---|---|
| Pippo (13) | Pass. Knitted beanie with paper-aeroplane badge and rolled map; no goggles anywhere; Decorated keeps postal cap and satchel. |
| Glim (13) | Pass. Periwinkle blue, no hood, glowing star on the tail; Decorated has the moon clip and starry shawl. Clearly different from Mopey. |
| Mopey Decorated (5) + umbrella costume (5) | Pass. Decorated is raincoat and hood only; costume holds an open yellow umbrella. Costume sleep enlarged on import to match Mopey's normal sleep size. |
| Ribbon icon (1) | Pass. Replaces the bow emoji everywhere. |
| Mischi wingless (13) | Pass. Four-point star, purple stitch and scarf unchanged; Decorated has the one-bell knot and two stitched stars on the scarf. |
| Hush wingless (13) | Pass. |
| Wing costumes (10) | Pass, with one note below. Hush's moth wings with moons look clearly different from Mischi's bat wings. |

Integration checks: every pose 1024×1024 with transparency, feet on the shared line, one scale per character; walk → idle → walk2 alternates for all four reworked residents and all three costumes; Wear / Take off switches the art immediately in the room and on the character page.

Importer changes: sleep poses drawn with the head on the left are mirrored so every resident lies the same way in bed (Mischi's new sleeps needed this).

Outstanding:
1. `char_mischi_costume_wings_idle`, `_walk`, `_sleep` were delivered with a baked-in ground shadow. The importer strips most of it (walk is clean); a faint contact shadow remains under idle and sleep. Optional redraw without shadow.
