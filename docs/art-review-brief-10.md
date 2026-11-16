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
