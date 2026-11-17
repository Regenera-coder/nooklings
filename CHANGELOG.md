# Change log

Labels: **Implemented** (in the code and tested) · **Placeholder** (works, but stands in for final content) · **Planned** (not built).

## 0.15.0 — Garden map (17 Nov 2026)

### Changed
- **The Succulent Garden is now a place:** a felt garden patio where each pot sits on its own spot — three stepping stones in front, three more on the potting bench as pots are bought (the next one to buy shows as a "+"). Each pot shows its plant growing, a seed pod when there is one, and a small label (time left, "In flower", "Seeds!", "Offset!").
- Tap a pot to see it beside the map with its buttons (Pollinate, Collect seeds, Take offset, Give, Put on show, Sell). With pollen on the brush, tapping another flower on the map brushes it.
- Garden tools you own sit on the little side table. Ribbon Fall trails over the front of its pot.
- New art: `garden_scene_background`. The Seed bag, seed packets, goals, tools and Succulent book stay below the map. Saves are unchanged.
- Checked at 740×360 and 640×320, including pollinating by tapping pots on the map.

## 0.14.0 — Faster Home Levels and more Buttons (17 Nov 2026)

### Changed: faster Home Levels
- **Every Home Level needs 25% fewer Hearts** (Level 10 at 202 instead of 270; Level 20 at 502 instead of 670). The scripted player now reaches Level 10 on day 3 instead of day 7, and Level 20 on about day 9. Saved Hearts are kept, so existing homes may jump up a level or two.
- **The daily gift also gives 2 Hearts.**
- **New friends wait for space:** when every open room already has 4 residents, invitations and Friend Parcels say so instead of squeezing a fifth resident into the Living Room. Faster levels made this possible before the next room could be afforded.

### Changed: more Buttons

### Changed
- **The Arcade pays Buttons:** half a Button for every point scored, up to 150 Buttons a day across all games, on top of Ribbons and prizes. The result screen shows the Buttons won.
- **Daily gift:** the first time the game is open each day, 50 Buttons plus 5 per Home Level arrive by themselves (55 at Level 1, 100 at Level 10).
- **Succulents sell for more:** about 2.5 times the seed price (Meringue Rose 100, Gumdrop Cluster 125, Stitchback 150, Teacup Tree 200, Ribbon Fall 250). The new-colour and pattern bonuses apply on top.
- Hearts are unchanged, so Home Levels still take about a week. Save version 13. Tests cover the daily gift, the Arcade Button limit and garden prices.

## 0.13.0 — Research, and a Cosy Kitchen fix (17 Nov 2026)

### Implemented
- **Research**, from a new Research button on the Home screen, open from the start. Study one thing at a time; each study has 3 levels (200 Buttons / 1 h, 500 Buttons + 5 Wood / 4 h, 1,000 Buttons + 10 Wood / 12 h), kept for good:
  - Green Thumb: succulents grow 10% faster per level (offsets too).
  - Busy Bees: flowering and seed pods 10% faster per level.
  - Quick Paws: Outdoors trips 10% shorter per level.
  - Warm Oven: baking 10% shorter per level.
  - Bountiful Spots: berry bush, cotton patch and woodpile ready 10% sooner per level.
  - Keen Eye: +1 point per level on the chance of a new colour or pattern.
- Garden speed-ups apply to plants already growing; trips, baking, pods and gathering use the speed at the time they start. Shown times (trip and bake lengths, grow hours) include research. A dot on the Research button when a study has finished.
- Pictures reuse art already in the game. Save version 12. Research tests added.

### Fixed
- **Cosy Kitchen:** ingredients now show on the board, bowl, pot and pan. Before, a carrot put on the board seemed to vanish because the tool only got a faint glow. Chopped pieces shrink and tilt, and tipping the board into the pot carries them across.

## 0.12.0 — Succulent Garden Phases 3 and 4, garden tidy-up (17 Nov 2026)

### Changed
- **No flower spike on plants.** The cream spike beside every flowering plant looked like a stray stem, so it is gone; the Pollinate button shows when a plant is in flower. The seed pod picture still shows while a pod ripens.

### Phase 4: succulents on show at home

### Implemented
- **Put on show:** a grown plant can leave its pot and go into storage as furniture, then be placed from Build like any other item. It keeps its colour and leaf pattern, standing in the felt pot; Ribbon Fall hangs from the ceiling in its hanging pot (indoors only). Each counts as Natural and Calm decor (patterned ones are extra Natural).
- One furniture definition per shape, colour and pattern (100 in all), drawn in the game from the plant art, so no new art was needed.
- Tests cover the definitions, putting a plant on show, placing it and saving. Checked in the browser at 740×360: a Teacup Tree, a hanging Ribbon Fall and a Meringue Rose placed in the Living Room.

### Phase 3: patterns, tools, gifts and goals

### Implemented
- **Leaf patterns:** Zebra (cream stripes), Ruby-edged (red leaf edges) and Cherry-tipped (deep red tips), drawn in code. Shop seeds are plain; a seed can come out with a pattern neither parent had (1 in 25), and patterned parents pass it on about half the time. Patterns fade in as the plant grows. Patterned plants sell for 30% more, on top of the new-colour bonus. The Succulent book lists patterns found.
- **Garden tools,** each bought once: **Sun Shelf** (500 Buttons, 20 Wood) — plants flower twice as soon and blush deeper; **Pollen Jar** (400 Buttons, 10 Wood) — one more seed in every pod; **Loupe** (800 Buttons, 15 Wood) — see each seed's colour and pattern in the Seed bag and choose which to plant.
- **Gifts:** give a grown plant to a resident for 2 Bond XP. It shares the once-a-day gift with Treats.
- **Garden goals:** nine goals in a short chain of their own (first sale, first pod, 5/15/25 in the book, a tool, a gift, a pattern, all three patterns), with Buttons, Wood and Hearts. They do not change the main Tasks list or its pacing.
- Save version 11. 176 tests. Tap-tested at 740×360: claiming a goal, giving a plant to Snug and buying a tool.

## 0.11.0 — Succulent Garden, Phase 2 (17 Nov 2026)

### Implemented
- **Five colours** every shape can grow into: Blueberry, Taro, Apricot, Strawberry and Plum. Shop seeds grow in their species' own colour.
- **Flowers and pollinating.** A grown plant flowers 2 hours later. Tap Pollinate on one flower, then Brush here on another: the second plant forms a seed pod that ripens in 4 hours.
- **Seeds.** A pod gives 2 seeds. Each takes its shape from one parent and its colour from one parent; 1 seed in 20 comes out in a colour neither parent had. Seeds go into a Seed bag and are planted for free.
- **Colours are a surprise.** The Seed bag groups seeds by shape and shows them as green seedlings; a seed's colour only shows as it grows.
- **Offsets.** A grown plant makes an offset (a copy of itself) 8 hours after it is grown, and every 8 hours after one is taken.
- **Succulent book:** all 25 shape-and-colour combinations, shown as silhouettes until grown. Each new one gives 1 Home Heart. Plants are named by colour and shape, e.g. "Strawberry Meringue Rose".
- Plants in a colour that is not their species' own sell for 50% more. A plant with a seed pod can't be sold until the pod is collected.
- The flower spike and seed pod art are shown on the plants. Save version 10 (older plants keep their species' colour). 15 garden tests, including the mix of shapes and colours and the mutation rate over 800 seeds.
- Checked at 740×360 and 640×320: pollinate, brush, collect seeds, take an offset and plant from the seed bag all work by tapping; no page errors.

### Placeholder
- Every number (bloom 2 h, pod 4 h, 2 seeds, 5% new colour, offsets every 8 h, +50% sell price) is a PROPOSED value.

## 0.10.0 — Succulent Garden, Phase 1 (17 Nov 2026)

### Implemented
- **Succulent Garden** in Explore > Garden, opening at Home Level 5 (shown as a preview from Level 4). Five of our own sweet-treat succulents: Meringue Rose, Gumdrop Cluster, Stitchback, Teacup Tree and Ribbon Fall.
- **Grow and sell.** Buy a seed packet to plant it in an empty pot. It is a green seedling for 30 minutes, then grows for 4 to 8 hours. A grown plant can be sold for more than the seed cost, or left in its pot on show. Growing a species for the first time gives 3 Home Hearts and ticks it off in the seed list.
- **Colour that develops with growth.** Seedlings are green; the colour blends smoothly, by hue, to each species' own colour (silver-blue, lavender, peach, rose, plum), so it never passes through grey. A light blush appears on the far leaf tips as the plant finishes growing. The Teacup Tree trunk stays brown. Tinting runs in the browser from neutral felt art.
- **Pots:** three to start; three more can be bought (150 Buttons and 5 Wood each).
- Save version 9. Older saves open with three empty pots. Tests cover growth timing, the smooth colour blend, planting, selling, pots and saves.
- Checked in the browser at 740×360 and 640×320: planting, selling and buying a pot work by tapping; no page errors.

- **Garden art:** felt terracotta pot, a hanging pot for Ribbon Fall (its strands spill over the bowl), and a seed packet for each species. The seed pod and the Phase 2–3 tools (Soft Brush, Pollen Jar, Loupe, Sun Shelf) are imported too, ready for later phases.

### Placeholder
- Every number (seed prices, grow times, sell prices, pot price) is a PROPOSED value.

### Planned
- Phase 2: flowers, cross-pollinating, colour traits and offsets. Phase 3: Sun Shelf (stronger blush), patterns and tools.

## 0.9.2 — Arcade finished art (16 Nov 2026, released with 0.10.0)

### Implemented
- **Stitch-a-Pattern: finished embroideries for the ten new patterns** (button, gem, leaf, raindrop, moon, crown, mushroom, fish, cat, cloud). Imported from Milestone F; they match the original four in style. Completed outlines now show the embroidery instead of a solid seam.
- **Button Catch: a real red button** replaces the tinted normal button. Checked at 740×360 in the browser: red and gold buttons read clearly apart.
- Recovered the 0.9.1 unpushed commit (Arcade art jobs and the generator tools) from its saved patch, now on `main` locally as 1bab28f. Not pushed.

## 0.9.1 — Arcade fixes from play-testing (16 Nov 2026)

### Implemented
- **Cosy Kitchen: holding to stir no longer brings up the browser's pop-up.** The game now cancels the browser's long-press / right-click menu everywhere and switches off the iOS press-and-hold callout on the page and its images. Checked in desktop Chrome only; a real phone still has to confirm it.
- **Button Catch: red buttons.** About one button in seven is red (never two in a row, none in the first second and a half). Tapping one takes 1 point away, with a wobble and a "−1"; the score never goes below zero. Missing a red button costs nothing.
- **Button Catch: tapped buttons fly into the basket** in a visible arc (they used to fade out almost at once), and the basket bumps when one lands.
- **Stitch-a-Pattern: 14 patterns instead of 4.** New: button, gem, leaf, raindrop, moon, crown, mushroom, fish, cat, cloud. Each round starts with the easy ones and moves to harder ones, in a new order every time.
- Tests check that every pattern is a closed outline inside the hoop that never crosses itself, with dots spaced widely enough to follow.

### Placeholder
- The ten new stitch patterns have no finished-embroidery picture: when one is completed, its outline becomes a solid seam and fills with thread colour. The four original patterns still show their embroidery art.
- Red buttons are the normal button picture tinted red in code, not a drawn red button.

## 0.9.0 — Tidy-up: separate Friend and Furniture Parcels, Explore tabs, Invitations (16 Nov 2026)

### Implemented
- **Parcels are split.** Each parcel pool now sells a **Friend Parcel** (always a friend, same rarity odds and guaranteed first friend as before) and a **Furniture Parcel** (always furniture, even odds). Prices: First Residents 1 Wish Stamp / 100 Buttons; Teatime 12 Treats / 4 Treats. The Teatime Friend Parcel went from 8 to 12 Treats because it no longer has a 40% chance of furniture (8 Treats at 60% was about 13 per friend).
- A Friend Parcel **is not sold when it could only hold duplicates** (the player already has every friend it can bring at their level).
- **Mending Thread has a use:** 10 Thread trade for 1 Wish Stamp, on the Parcels tab.
- **Explore has four short tabs** (Arcade, Outdoors, Kitchen, Parcels) instead of one long "Outdoors & parcels" page; a dot marks a tab with something ready.
- **Invitations moved off the Tasks list** into their own view on the Tasks page, with a count and a dot when someone can be invited.
- Amounts of one read correctly ("1 Wish Stamp").
- No save format change. Pacing by the scripted player is unchanged (Level 10 on day 7, Level 20 on day 19).



### Implemented
- One costume for each Teatime Friend, bought with Ribbons in the Wardrobe: **Grand Chef Whites** (Crumb, 12), **Honeybee Hoodie** (Whisk, 12), **Marshmallow Pyjamas** (Mallow, 12), **Garden Tea Robe** (Pekoe, 15), **Berry Picker** (Jammy, 15), **Snow Day Knits** (Dumple, 15), **Sugar Plum Tutu** (Sprinkle, 18), **Market Day Coat** (Toffee, 18), **Garden Party Hat** (Soufflé, 20), **Sundae Best** (Cherri, 20). All 50 images reviewed and imported.
- Importer: Cherri's glow is now told apart from pale parts of the character by smoothness, so the whipped-cream hat is kept and no pale patches are left between the stem and the leaf.

## 0.8.0 — Series 2 "Teatime Friends" (released 16 Nov 2026)

The live game now uses `contentWithSeries2`. A build made with `VITE_SERIES2=1` (`npm run dev:series2`) is a sandbox with its own save and no cloud save.

### Implemented
- **Home Levels 11 to 20**, the **Kitchen** (Level 11, 600 Buttons and 40 Wood) and the **Tea Garden** (Level 15, outdoors, 800 Buttons and 50 Wood). Five rooms hold all twenty residents.
- **Ten Teatime Friends** with art: Crumb, Whisk, Mallow, Pekoe, Jammy, Dumple (Common), Sprinkle, Toffee (Rare), Soufflé (Epic), Cherri (Secret). Seven join by invitation, Whisk in the first Teatime Parcel, Toffee from the first trip to the Moonlit Market, and Cherri once the other nine are home and the Tea Party Table is laid in the Tea Garden.
- **Baking and Treats**: one batch at a time in the Kitchen (Butter Cookies 1 h, Jam Tarts 4 h, Honey Cake 8 h). A Teatime Friend at the oven adds a Treat, and one more for their favourite recipe. Treats pay for Series 2 invitations, some recipes and the Teatime Parcel, and one Treat a day can be given to each resident for bond.
- **Teatime Parcel** (8 Treats): same odds table and duplicate rule as the First Residents Parcel. It costs Treats rather than a Wish Stamp so nobody can run out of ways to get Whisk. Each pool now has its own guaranteed first parcel.
- **Nookbook series tabs** with a count each, and a one-time **series reward** (Ribbons and a keepsake) for completing a series. This also covers Series 1, but only once Series 2 is released.
- 23 new furniture pieces with two new atmosphere tags, **Tasty** and **Sweet**; 17 new tasks, which wait until their Home Level.
- Save format **version 8** (Treats, the batch in the oven, series rewards, parcels per pool); older saves upgrade, and a save made with Series 2 opens safely in the released game.
- Pacing, by the scripted player at two short sittings a day: Level 10 on day 7 (unchanged), Level 20 on day 19.
- The game only downloads character and room art that its content uses, so the unreleased art costs live players nothing.
- Importer: Series 2 characters, rooms, furniture, icon, parcel and trip card names; a glow drawn around a character (Cherri) is trimmed instead of becoming a pale outline.

- All Series 2 item art is imported (16 Nov): 23 furniture pieces, the Treats icon, the Teatime Parcel (closed and open) and the Moonlit Market card. No placeholder art remains in Series 2.

### Placeholder
- Dumple's sleep pose is drawn inside a steamer basket, so on a bed the basket sits on the bed.

## 0.7.2 — All ten brief 10 costumes (16 Nov 2026)

### Implemented
- Released the last three costumes after their redraws: **Workshop Apron** (Tinker, 12), **Stargazer Cloak** (Hush, 18) and **Wish Crown** (Luma, 20). Every Nookling now has a new costume.
- `tools/generate_art.py` and `tools/art_jobs.json`: art is now generated through the OpenAI Images API from a job list, with reference images per job, resume and `--redo`. Run by the owner on his PC (this workspace cannot reach the API).

## 0.7.1 — Six more costumes (16 Nov 2026)

### Implemented
- Released: **Petal Bonnet** (Bloomi, 12), **Party Surprise** (Mischi, 15), **Comet Scarf** (Glim, 15), **Puddle Boots** (Mopey, 15), **Trail Pack** (Pippo, 18), **Memory Quilt** (Patcha, 20). Seven of the ten brief 10 costumes are now in the Wardrobe.
- Still hidden, waiting for redraws: Workshop Apron (Tinker), Stargazer Cloak (Hush), Wish Crown (Luma). See `docs/art-review-brief-10.md`.
- A character image with something trailing to one side (Glim's scarf) is no longer cut off: the importer slides the figure over and the game reads the foot position from `anchors.json`.

### Planned
- `docs/art-brief-12-series-2-poses.md`: pose sets for the ten Teatime Friends (130 files), for after concept board v2 is approved.

## 0.7.0 — Cloud save with Google sign-in (16 Nov 2026)

### Implemented (switched off until set up, see `docs/cloud-save-setup.md`)
- **Sign in with Google** on the Tasks page, and a cloud copy of the save. Guest play is unchanged; the game still plays from the browser save.
- Changes upload a few seconds after they happen. A newer save from another device is brought down on start-up. If both sides have different progress the player chooses which to keep; nothing is merged or overwritten silently.
- Only Google's anonymous account number is stored with the save: no email, no name.
- Server: three small Cloudflare Pages Functions (`/api/config`, `/api/login`, `/api/save`) with checked Google tokens, signed 60-day sessions and one KV entry per player.
- The card and the server stay inactive until the Google client ID, session secret and KV store are added to the Pages project.

### Planned
- `docs/art-brief-11-series-2-rooms.md`: Kitchen and Tea Garden backgrounds (owner chose a second new room; Baking approved).

## 0.6.1 — Milestone E costumes, first delivery (16 Nov 2026)

### Implemented
- **Dreamtime Cape** for Snug (12 Ribbons): five poses imported and reviewed. In the Wardrobe from Level 1.
- **Mischi's wing costume** redrawn without the ground shadow (idle, walk, sleep).
- The other nine Art Brief 10 costumes are configured with their approved names and prices but **hidden**: not shown, not buyable, no placeholder art. Each is released by removing its `hidden` flag once its five poses are imported. A test fails if a visible costume is missing any pose.
- Art importer: `--add` imports a few files and leaves the rest alone; a full import now refuses a partial folder instead of clearing the game art.

### Planned
- `docs/series-2-plan.md`: Kitchen room, how each Teatime Friend joins, baking, collection progression.

## 0.6.0 — One-week pacing (16 Nov 2026)

Owner decision: Home Level 1 to 10 should take about a week of short daily sittings. Before, a patient player finished everything in 55 minutes.

### Implemented
- **Three plays per Nookling per day** (`bond.playsPerDay`). The button shows "Play · 3 left today", then "Play again tomorrow". Each play now gives 10 Buttons (was 5). Bond levels need 3, 6, 12 and 21 plays (were 3, 8, 15, 25).
- **Gathering refills every 4 hours** (was 90 seconds to 2 minutes) and gives four times as much: 12 Wood, 100 Buttons, 8 Fabric.
- **Trips take longer**: Clover Meadow 1 hour (was 3 minutes), the Old Mill 4 hours (was 10 minutes). Rewards unchanged.
- **Heart targets** for Levels 4 to 10 raised to 55, 90, 125, 160, 195, 230, 270 (were 45, 70, 100, 130, 165, 200, 240).
- Waiting times over an hour read as "3 h 20 min".
- Save format v7 (old saves carry over).

### Measured (scripted player, `packages/core/test/bot.ts`)
- Two 10-minute sittings a day: Levels 1 to 4 on day 1, then one level a day, Level 10 and all ten Nooklings on day 7.
- One 90-minute sitting a day cannot rush it: Level 10 no earlier than day 5.
- Both are now tests, so later content changes that break the pacing fail the checks.

### Daily reset
- All daily limits (plays, Arcade plays, Ribbons) now reset at **midnight on the device's clock** (`rules.dayOffsetMs`, set by the client). Before, days were UTC days, which reset at 8 am in Singapore.

## 0.5.1 — Daily Arcade Ribbon cap (16 Nov 2026)

### Implemented
- **Daily Arcade Ribbon cap** (owner decision): the whole Arcade gives at most **10 Ribbons a day** (`arcade.maxRibbonsPerDay`), counted across all games and reset each day with the play counters. Before, a full day could give up to 150.
- A round past the cap still counts: plays, best scores and prizes work as before, it just gives no Ribbons. A round that crosses the cap gives only what is left.
- The Arcade page shows "Arcade Ribbons today x/10"; the results card shows the same and "Ribbons full today" once the cap is reached.
- Save format v6 (old saves carry over; today's Arcade Ribbons start at 0).

### Proposed values
- The cap of 10 is a proposed value. Ribbons from playing with residents (5 a day) and expeditions are not capped by it.

## 0.5.0 — Milestone D: the Arcade (15 Nov 2026)

### Implemented
- **The Arcade** in Explore (Arcade / Outdoors & parcels switch). Ten game cards with the host's face, plays left today, best score and a lock with the Home Level for games not yet open. Built from ChatGPT's five approved mock-ups; every label, number and button is drawn in code.
- Full-screen **intro** (host explains the game, three prize slots with their score milestones, Play button), shared **game frame** (score, time, pause), **results** card (score, best, Ribbons earned, prize unlocked or next prize with progress) and **prize reveal** (with "Place it now" for furniture and "Choose a friend" for companions).
- **Ten games**: Button Catch (Snug, Level 1), Memory Match (Tinker, 2), Stitch-a-Pattern (Patcha, 2), Cosy Kitchen (Bloomi, 3), Garden Tending (Bloomi, 4), Glyph Garden (Patcha, 5), Lantern Lights (Glim, 5), Spot the Difference (Mischi, 6), Parcel Sorting (Pippo, 7), Hide and Seek (Hush, 8, played over your own room).
- Rules: 3 plays per game per day; Ribbons by score, up to 5 per round; best score per game; three exclusive prizes per game (two furniture, one companion), each granted once, the first time a round reaches its score. Pausing freezes the round; "End round" keeps the score.
- **20 prize furniture items** go to storage and place like any other item (rug, wall and floor types; Peek-a-boo Curtain hangs over windows). They are never sold, crafted or found in parcels.
- **Companions** (new system): 10 small pets that follow a resident around the room with a two-step walk, turning to face the way they go (bee and firefly hover). A new companion goes to the game's host, or the first resident without one. Change it on the resident's Nookbook page (one companion each).
- Gentle play: no fail sounds, no red, wrong answers only wiggle; timers only end the round; tap targets at least 44 px; shape cues alongside colour (lantern shapes, badges on garden pots). Reduced-motion is respected.
- Spot the Difference tap zones measured from the circled _diffs images (all 15 checked against the annotations).
- Save format v5 (old saves carry over; unknown games, prizes and companions are dropped on load).
- Arcade art is served as WebP (3 MB instead of 24 MB as PNG).

### Proposed values (the brief leaves them to the code)
- Prize scores, round lengths and Ribbon rates per game are in `packages/content/src/index.ts` (`arcadeGames`).

## 0.4.1 — Brief 08 (15 Nov 2026), local commit only, not pushed

### Implemented
- Pippo reworked (beanie and map, no goggles); Glim reworked (periwinkle blue, no hood).
- Mischi and Hush are wingless by default. Their wings are Wardrobe costumes: Mischief Wings (15 Ribbons, Level 3) and Moonlit Wings (15 Ribbons, Level 8).
- Mopey's Decorated look no longer includes the umbrella; the Tiny Rain Umbrella costume now has its own art.
- Ribbon currency icon.
- Character pages and the Nookbook show the costume a resident is wearing.

## 0.4.0 — Milestone C art and costumes (15 Nov 2026), local commits only, not pushed

### Implemented
- All 180 expected art files imported: Sunroom and Yard, 13 furniture items, Explore cards, Keepsake icon, all seven new residents (Original and Decorated) and second walk frames for every resident. Two corrected sleep poses (Mopey, Pippo Decorated).
- Costumes: a Wardrobe on each character page. Costumes are bought once with **Ribbons** and worn over the resident's look (or taken off). First costume: Mopey's Tiny Rain Umbrella (12 Ribbons, Level 6). Mischi's and Hush's wing costumes are set up but hidden until the wings decision is made.
- Ribbons, a new currency, come from: playing with residents (1 each, up to 5 a day), expeditions (Meadow 2, Old Mill 4), and **Button Catch**, a 30-second tapping game in Explore (1 Ribbon per 10 points, up to 5 per game, 3 games a day; golden buttons are worth 3).
- Save format v4 (old saves carry over).

### Placeholder
- Costume art and the Ribbon icon are requested in brief 08; until then the Wardrobe says the art is on its way and the icon is a bow emoji.

## 0.3.2 — Playtest fixes (15 Nov 2026), local commit only, not pushed

### Implemented
- Soft Curtains can hang over a window (or any other wall item). Two curtains still can't overlap.
- The Moon Lantern now hangs from the ceiling over any floor cell indoors, even above furniture, and never blocks walking. Existing lanterns on the wall move to hang just in front of it. New "Hanging" group in the Build tray.
- Residents now step instead of gliding: the walk pose (foot lifted) and the standing pose (feet down) alternate on each step, with a small hop, a side-to-side waddle and a squash as each foot lands. Step speed follows each resident's walking speed. Turned off when the device asks for reduced motion.

## 0.3.1 — Mischi redesign (15 Nov 2026), local commit only, not pushed or deployed

### Implemented
- Mischi switched to the approved four-point Mischief Star design: all 11 files (master v3, portrait v3, idle v3, and v2 of walk, sit, sleep, happy and the four Decorated poses). Decorated Mischi wears the asymmetrical scarf knot with one bell.
- master_v2 and portrait_v2 rejected on review (five-point star). No other character changed.

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
