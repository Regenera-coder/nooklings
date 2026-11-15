# Change log

Labels: **Implemented** (in the code and tested) · **Placeholder** (works, but stands in for final content) · **Planned** (not built).

## 0.3.0 — Milestone C: the whole First Residents series (15 Nov 2026), local commits only, not pushed or deployed

### Implemented
- Home Levels 4 to 10 (Gardening, Bigger yard, Rainy-day decor, Expeditions, Tranquil decor, Heirloom restoring, Wishing Lantern).
- Two new rooms: the **Sunroom** (opens at Level 3 for 300 Buttons + 25 Wood) and the **Yard** (open from the start at 8 columns; expands to 14 at Level 5 for 500 Buttons + 40 Wood). The Yard is outdoors, so it has no wall items. Room switcher under the room.
- All ten First Residents can be earned without parcels or money: invitations for Bloomi, Glim, Mopey, Hush, Patcha and Luma (secret, needs every other resident and the Wishing Lantern); Pippo comes home from the first trip to the Old Mill.
- Gathering in the Yard (Woodpile, Button Berry Bush, Cotton Patch from Level 4) with cooldowns.
- Expeditions (Clover Meadow 3 min, The Old Mill 10 min): one resident at a time, who is away from home and can't be played with until they return. New currency: Keepsakes.
- 13 new furniture recipes, including the Heirloom Chest (Keepsakes) and the Wishing Lantern.
- Residents live in a room (up to 4 per room); invited residents move into the room they were invited to; "Lives in" picker on each character page.
- 13 new tasks continuing the chain to Level 10; Task "Go" buttons take you to the right room.
- Save format v3 with migration from v2 (existing residents move into the Living Room).
- Whole-game simulation test: a patient player with no money and no lucky parcels reaches Level 10 with all ten residents and every task done (about 50 minutes of non-stop play in the simulation).
- Importer ready for the Milestone C art (brief 07): seven new residents, three room backgrounds, 13 furniture items, Keepsake icon and five Explore cards. It now refuses to run against an empty folder.

### Placeholder
- New furniture, the Sunroom and Yard, and the seven new residents are drawn as simple coloured stand-ins (furniture is labelled) until the brief 07 art arrives.
- Decorated upgrade is available for every resident, but only Snug, Tinker and Mischi have Decorated art.

### Planned
- Tuning of the level pace after the phone playtest.
- Gathering spots drawn in the Yard (currently in Explore only).

## 0.2.2 — Milestone B art revisions (15 Nov 2026), local commit only, not pushed or deployed

### Implemented
- Decorated walk, sit and sleep poses for Snug, Tinker and Mischi; a Decorated resident now keeps its costume everywhere, including on the sofa and bed.
- New Tasks tab icon (stitched clipboard).
- Snug three-quarter idle (v2).
- Importer: Decorated poses in the lineup, and `art/import-exclude.txt` for reviewed rejections (Tinker and Mischi idle v2).

## 0.2.1 — Milestone B production art (15 Nov 2026), local only, not deployed

### Implemented
- All 53 ChatGPT art pieces from the Milestone B brief are in the game: Snug, Tinker and Mischi (idle, walk, sit, sleep, happy, portrait, Decorated), the Living Room background (v2), 13 furniture items, 10 tab and resource icons, the stitched panel and buttons, and the closed and opened parcel.
- `tools/import_art.py` rewritten for real generated art: inventory against the brief, newest version wins, sparkle-proof measuring, normalization to the brief's canvas sizes, a shared foot anchor and one scale per character, and half-size game copies.
- Residents use the art with feet anchored to the floor; walking flips for leftward movement; sleeping faces the bed's pillow; seat heights come from the furniture images.
- Furniture art fitted to footprints, with height caps for wall and tall items.
- Tab icons, currency icons, stitched panel, cards and buttons (nine-slice), and a two-stage parcel opening (shake, then burst open).
- Art review: `docs/art-review-milestone-b.md`.

### Placeholder
- Decorated forms only have an idle pose, so decorated residents sit and sleep in their original outfit (see the art review).

## 0.2.0 — Milestone B vertical slice (14 Nov 2026), local only, not deployed

### Implemented
- First play session from the handover, start to finish: meet Snug → place lamp and rug → Snug reacts → craft a Workbench → invite Tinker → guaranteed first parcel reveals Mischi → Nookbook → free play.
- Currencies: Buttons, Wood, Fabric, Wish Stamps, Mending Thread. Buttons and Wish Stamps in the top bar; tap Buttons for the full list.
- Home Hearts and Home Levels 1–3 (Level 2 unlocks crafting, Level 3 unlocks Mystery Parcels), with a progress bar in the top bar and a level-up message.
- Crafting in the Build panel: Workbench, Potted Fern, Side Table, Picture Frame, Toy Chest.
- Seven tutorial tasks that unlock one at a time, with rewards and a Go button that takes you to the right screen.
- Room atmosphere from furniture tags, with a variety rule (only two copies of the same item count).
- Deterministic invitation for Tinker: Home Level 2, Crafty 2 and Warm 2 in the Living Room, plus a welcome gift of 2 Wood. When met, Tinker always joins and walks in through the door.
- Mystery Parcels in Explore: cost 1 Wish Stamp, first parcel clearly shown as guaranteed Mischi, exact odds shown, reveal animation, recent results. Only characters at or below your Home Level can appear; furniture is also in the pool; duplicates give 5 Mending Thread.
- Nookbook: Series 1 with all ten First Residents, progress 3/10, All/Owned/Missing filters, silhouettes and hints for missing characters, completion-cabinet note.
- Character page: portrait, rarity, mood, favourite decor, Bond hearts and progress, form, home room, story, Play and Upgrade.
- Bonding: Play with a resident (30-second rest between plays) for Bond XP and Buttons; Bond 2 unlocks the Decorated form (60 Buttons + 3 Fabric).
- Up to four residents live in the room; each reserves its own bed, seat and walking target so they don't stack.
- Tab badges for claimable tasks, an openable parcel and unseen residents.
- Art pipeline: `tools/import_art.py` cleans ChatGPT images (white background removal, trimming, resizing) and the game uses them automatically, falling back to placeholders for anything missing.
- Save format version 2 with migration from Milestone A saves.
- 43 automated tests, including a full first-session playthrough, no circular gates, parcel odds checked against 4,000 opens, replay protection on parcels, and save/reload at every step.

### Placeholder
- All art is still simple shapes until the ChatGPT images arrive in Drive.
- Every number (prices, rewards, hearts, odds, cooldown) is a proposal, not balanced.
- The parcel random state lives in the save until the server takes it over in Milestone D.

### Planned
- Milestone C: Home Levels 4–10, the other seven residents' paths, Sunroom and Yard, more crafting, expeditions.
- Milestone D: Google sign-in, server-side rules and parcel draws, cloud save, reconnect handling.

## 0.1.0 — Milestone A (14 Nov 2026), local only, not deployed

### Implemented
- Standalone repo: npm workspaces with `core` rules, `content` definitions and the Phaser 4 client.
- Landscape-only phone layout: left tab rail (Home, Book, Explore, Tasks), narrow top bar, right slide-in panel; safe-area insets; rotate prompt in portrait; full-screen button that also requests landscape lock where the browser allows it.
- Living Room renderer in 2D three-quarter view: back wall, wall items, rugs, floor furniture, depth sorting so residents pass in front of and behind furniture. Renders at screen density (up to 2x).
- Responsive camera: the room refits whenever the screen or panel size changes. Tested at 640×320, 740×360 and 915×412.
- Furniture grid 12×6 (widened from the provisional 8×6 for landscape), footprints 1×1/2×1/1×2/2×2, separate floor, rug and wall layers.
- Placement rules: inside the room, no overlap on the same layer, doorway kept clear, no floor area sealed off, every floor item keeps a free side.
- Build mode: inventory tray (Furniture, Rugs, Wall), drag-to-place with green/red validity highlight and reason text, Place/Confirm, Flip, Store, Cancel; tap a placed item to move it.
- One resident (Snug) with idle, walk and sleep states, plus sitting; walks around furniture, hops onto the bed to nap, reacts with a heart when furniture is placed, and steps aside if furniture is placed where it stands. Behaviour weights come from data.
- Tap Snug or a furniture item outside build mode to see it in the side panel.
- Local save after every committed action, versioned save format with migration from version 0, defensive loading (unknown items dropped, colliding items returned to storage).
- Replay protection: an already-applied command id changes nothing.
- 23 automated tests covering placement rules, pathfinding, commands, replay, save round-trip and migration, and content validity.

### Placeholder
- All art (room, 13 furniture items, Snug) is drawn with simple shapes until production art exists.
- Buttons and Wish Stamp counters in the top bar show 0; currencies arrive in Milestone B.
- Book, Explore and Tasks tabs show a "coming in milestone" screen.
- Atmosphere tag values on furniture are unbalanced proposals.

### Planned
- Milestone B: Snug, Tinker and Mischi with production art; one invitation, one parcel, one character page, one upgrade loop; currencies.
- Milestone C: all ten residents, Nookbook, Home Levels 1–10, Sunroom and Yard, crafting, bonding, expeditions.
- Milestone D: Google sign-in, server-side rules and cloud save, reconnect handling.
- Milestone E: polish, performance, accessibility, balance.
- Pinch zoom (not needed while each room fits the screen; revisit for the Yard).
