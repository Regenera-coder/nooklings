# Nooklings — character art guidelines (changes to the approved designs)

The approved concept board ("02 APPROVED — First Residents concept board.png") and "01 APPROVED ART" remain the visual reference. Changes recorded here override them where they differ.

## Mischi — originality update (owner approved, 15 Nov 2026)

**Why:** an originality review found that the white skull charm, oversized pointed ears, impish expression and jester-style accessories together create an avoidable resemblance to Sanrio's Kuromi. Two small changes keep about 90% of Mischi's design.

### 1. Mischief Star replaces the skull charm (priority 1)
- Remove the white skull ornament from Mischi's head.
- Replace it with the **Mischief Star**: a slightly crooked, four-point golden star with one visible purple repair stitch.
- Same size and position as the old charm (on the head, at the base of the right ear, with the purple bow and yellow ribbon tails).
- Used on every Mischi form, pose and portrait.
- Meaning: Mischi's playful troublemaking, and her habit of making things right afterwards.

### 2. Decorated collar (priority 2)
- Replace the pointed jester-style collar with a **short, asymmetrical fabric collar or scarf knot**.
- Keep **one** small gold bell (not a row of bells).
- Keep the longer sparkling striped scarf and the star patches on the bat wings.
- No jester hood, jester points or other Kuromi-like accessories.

### 3. Unchanged
Rosy-pink fluffy body with cream accents; oversized pointed fox-like ears; playful, mischievous expressions with small fangs; yellow X-shaped cheek bandage; red-and-cream striped scarf; small purple bat wings; fluffy fox tail; proportions, plush textures and silhouette; personality ("a playful troublemaker with a heart of gold").

### Affected assets (current set, 11 files)
| File | Skull charm | Collar | Used in game for |
|---|---|---|---|
| char_mischi_master | Yes (front and side views) | — | Reference only |
| char_mischi_portrait | Yes | — | Nookbook card, character page, parcel reveal, resident side panel |
| char_mischi_idle | Yes | — | Room (standing) |
| char_mischi_walk | Yes | — | Room (walking) |
| char_mischi_sit | Yes | — | Room (on sofa) |
| char_mischi_sleep | Yes | — | Room (on bed) |
| char_mischi_happy | Yes | — | Room (reactions) |
| char_mischi_decorated_idle | Yes | Yes (row of bells) | Room, character page after upgrade |
| char_mischi_decorated_walk | Yes | Yes (pointed jester collar, 3 bells) | Room |
| char_mischi_decorated_sit | Yes | Yes (pointed jester collar, 3 bells) | Room |
| char_mischi_decorated_sleep | Yes | Yes (pointed jester collar, 3 bells) | Room |

Also affected, outside the asset folder:
- `char_mischi_idle_v2.png` in the Drive inbox (rejected, unused; has the skull). Leave it excluded.
- The approved concept board still shows the skull. Treat this file as superseded for Mischi's charm.
- Drive "01 APPROVED ART" and "04 ART BRIEF — Milestone B": wording updated to the Mischief Star and the new collar (15 Nov 2026).
- Placeholder drawing in `apps/client/src/game/art.ts` (`drawMischi`) draws a small cream circle as the charm. It is only shown if the art is missing. To be changed to a star with the art swap.
- No game text, story or task mentions the skull.

### Regeneration order (minimises rework)
1. `char_mischi_master_v2` — sets the Mischief Star design for everything after it.
2. `char_mischi_portrait_v2` — close-up check of the star, the most visible image in the game.
3. `char_mischi_decorated_idle_v2` — sets the new Decorated collar with one bell.
4. `char_mischi_idle_v3` (v2 is the rejected file already in Drive), plus `char_mischi_walk_v2`, `_sit_v2`, `_sleep_v2`, `_happy_v2` — skull swap only, copying the star from 1 and 2.
5. `char_mischi_decorated_walk_v2`, `_decorated_sit_v2`, `_decorated_sleep_v2` — star and collar, copying from 1 and 3.

The game switches to the new Mischi only when the whole set of 11 is approved, so she never shows a skull in one pose and a star in another.

## Status (15 Nov 2026)

The four-point Mischief Star design is now live in the game build (local commit). All 11 assets passed review; see `docs/art-review-milestone-b.md`. The old skull-charm art is no longer used.
