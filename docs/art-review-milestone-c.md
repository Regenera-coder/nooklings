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
