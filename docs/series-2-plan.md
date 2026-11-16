# Series 2 "Teatime Friends" — plan (draft, 16 Nov 2026)

**Status, 16 Nov 2026: built and tested, not released.** See CHANGELOG 0.8.0 for what was built and where it differs from this plan (Teatime Parcel costs Treats; Tea Garden is 12×5; four Tea Garden pieces and two series keepsakes were added). Remaining before release: the 27 furniture, icon, parcel and trip-card images.

**Decided by Marcus, 16 Nov 2026:** room space is option A (a second new room, the Tea Garden, at Level 15), and Baking is included. Room background prompts are in `art-brief-11-series-2-rooms.md`.

## 1. Shape of the update

- Series 2 continues after Series 1: **Home Levels 11 to 20**, one new friend at most levels.
- Pacing target stays the same as today: about one level a day for two short sittings, so Series 2 adds roughly **ten more days** of play.
- Series 1 stays exactly as it is. A player who has not reached Level 10 sees Series 2 as locked silhouettes in the Nookbook.

## 2. The Kitchen (new room)

- Opens at **Level 11** for Buttons and Wood, like the Sunroom did at Level 3 (proposed 600 Buttons, 40 Wood).
- Indoor room with walls, about the size of the Sunroom (10 × 5), door on the left.
- Two new atmosphere tags join the seven already in the game (Calm, Warm, Dreamy, Playful, Natural, Crafty, Rainy): **Tasty** (ovens, counters, food) and **Sweet** (cakes, sugar, pastel decor).
- About 14 new furniture items, crafted or found in a new parcel. Examples: Little Oven, Kitchen Counter, Tea Trolley, Cake Stand, Jam Shelf, Bamboo Steamer, Spice Rack (wall), Gingham Curtains (wall), Flour Sacks, Cookie Jar, Checkered Rug, Breakfast Nook (sit), Hanging Pans (wall), Tea Party Table.

### Room space (decided: option A)
Each room holds 4 friends. Today: 3 rooms = 12 places for 10 friends. With Series 2 there are 20 friends, and the Kitchen only brings the total to 16.

| Option | What it means | Trade-off |
|---|---|---|
| **A. Second new room (recommended)** | A small "Tea Garden" patio opens at Level 15, giving exactly 20 places | One more room background and a few outdoor furniture pieces to draw |
| B. Five friends per room | No extra art | Small rooms get crowded on a phone; needs re-testing of paths and beds |
| C. Friends can "rest in the Nookbook" | Only some friends are in the house at a time | Players may not like putting friends away |

## 3. How each friend joins

Series 1 mixes five ways of joining (invite by decor, parcel, expedition, restore an heirloom, a secret). Series 2 keeps the same mix so nothing new has to be learned.

| Level | Friend | Rarity | How they join |
|---|---|---|---|
| 11 | Crumb | Common | Invite: a Tasty, Warm Kitchen. First friend of the new room |
| 12 | Whisk | Common | Guaranteed in the first Teatime Parcel |
| 12 | Mallow | Common | Invite: a Sweet, Calm Kitchen |
| 13 | Pekoe | Common | Invite: place a Tea Trolley in a Calm room and offer Treats |
| 14 | Jammy | Common | Invite: a Natural, Sweet Yard with the new Berry Patch |
| 15 | Dumple | Common | Craft and place the Bamboo Steamer; Dumple is found napping in it |
| 16 | Sprinkle | Rare | Invite: a very Sweet, Playful Kitchen |
| 17 | Toffee | Rare | Comes home from the first trip to a new place, the Moonlit Market |
| 18 | Soufflé | Epic | Restore the Old Oven (like the Heirloom Chest), then invite to a very Calm Kitchen |
| 20 | Cherri | Secret | Every other Teatime Friend at home, the Tea Party Table fully laid, and an offering of Treats |

Level 19 has no new friend: it unlocks the Tea Party Table recipe, the last step before Cherri.

## 4. New mechanic: Baking (approved)

One new daily loop, built on rules the game already has (it works like a trip):

- Put a recipe in the Kitchen oven; it bakes for a few hours; collect **Treats** at the next sitting.
- A Teatime Friend can be set as the baker. Their favourite recipe bakes a little more.
- Treats are used for Series 2 invitations and offerings, and can be given to any friend once a day for extra bond.
- Three recipes to start (short, medium, long), unlocked at Levels 11, 13 and 16.

This gives Series 2 its own flavour without touching the Arcade, costumes or Series 1 rules. If it is not wanted, Series 2 can run on the existing currencies alone.

## 5. Collection progression

- The Nookbook gets two tabs: **First Residents** and **Teatime Friends**, each with a progress count (for example 7 / 10).
- Finishing a series gives a one-time set reward: a trophy furniture piece and Ribbons. This also rewards players who have already finished Series 1.
- A new **Teatime Parcel** pool for Series 2 friends and Kitchen furniture, same odds table and duplicate rule as the First Residents Parcel. The Series 1 parcel stays as it is.
- Each Teatime Friend gets the same things a Series 1 friend has: bond levels, a Decorated look, and later a costume.

## 6. What it needs

**Art (after concept board v2 is approved)**
- 10 characters × 13 files (master, portrait, idle, walk, walk2, sit, sleep, happy, and five Decorated poses) = 130 files.
- Kitchen background; Tea Garden background if option A.
- About 14 Kitchen furniture pieces, plus the Old Oven and Tea Party Table.
- Icons: Treats, the Teatime Parcel (closed and open), Berry Patch, Moonlit Market card.
- UI mock-ups from ChatGPT for the baking card and the Nookbook series tabs.

**Code**
- Content: rooms, furniture, residents, levels 11 to 20, invitations, recipes, parcel pool, trip, tasks.
- Rules: baking (start, collect, baker bonus), Treats currency, daily treat gift, series rewards.
- Save format bump with migration; the pacing test extended to Level 20.
- Screens: Kitchen in the room bar, baking card in Explore, Nookbook tabs.

## 7. Suggested order

1. Final approval of concept board v2.
2. Room backgrounds for the Kitchen and Tea Garden (brief 11, can start now: no characters in them).
3. Brief 11: character pose sets, Kitchen background and furniture, icons, two UI mock-ups.
4. Build the rules and content behind hidden levels while the art is drawn (nothing shows in the live game until the art is in).
5. Import art, tune pacing to Level 20 with the scripted player, then release.
