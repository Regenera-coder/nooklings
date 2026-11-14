# Nooklings: Little Worlds

Cozy character-collecting and home-decoration game. Phone, **landscape only**, browser/PWA first.

This repository is standalone. It shares no code, assets or infrastructure with any other project.

## Run it

```bash
npm install
npm run dev        # local dev server, open the printed URL
npm test           # rules, save and content tests
npm run typecheck
npm run build      # production bundle in apps/client/dist (not deployed anywhere)
```

To try it on a phone on the same Wi-Fi: `npm run dev -- --host`, then open the network URL and turn the phone sideways.

## Layout

```
packages/core      Game rules. Pure TypeScript, no browser or clock access, so the server can run
                   the same code later: grid, collision, doorway/reachability checks, pathfinding,
                   commands with replay protection, save format and migrations.
packages/content   Data definitions: rooms, furniture, residents, starter layout.
apps/client        Phaser 4 room renderer plus DOM interface (left tab rail, top bar, right panel).
  src/game         Room scene, layout maths, resident behaviour, placeholder art.
  src/ui           Rail, top bar, build tray and context panel.
  src/save         Save interface. Local browser save now; server save in Milestone D.
```

Every change to the game is a command (`place`, `move`, `flip`, `store`) with a unique id, applied by
`applyCommand` in `packages/core`. A command id that has already been applied is ignored.

## Status

See [CHANGELOG.md](CHANGELOG.md). Design source of truth: the "00 START HERE" handover and
"01 APPROVED ART" documents in the project Drive folder.
