# Change log

Labels: **Implemented** (in the code and tested) · **Placeholder** (works, but stands in for final content) · **Planned** (not built).

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
