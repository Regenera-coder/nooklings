import { describe, expect, it } from 'vitest';
import { content, LIVING_ROOM_ID } from '@nooklings/content';
import {
  applyCommand,
  atmosphere,
  bondLevel,
  deserialize,
  invitationStatus,
  levelFor,
  newGame,
  parcelOdds,
  serialize,
  taskStates,
  type Command,
  type Content,
  type GameState,
} from '@nooklings/core';

const R = LIVING_ROOM_ID;
type Input = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
let n = 0;
function run(state: GameState, cmd: Input, c: Content = content) {
  const res = applyCommand(state, { ...cmd, id: `p${++n}` } as Command, c);
  if (!res.ok) throw new Error(`${cmd.type} failed: ${res.error}`);
  return res;
}
function fails(state: GameState, cmd: Input) {
  const res = applyCommand(state, { ...cmd, id: `f${++n}` } as Command, content);
  return res.ok ? 'ok' : res.error;
}

/** Plays the whole Milestone B first session and returns each step's state. */
function playTutorial() {
  let s = newGame(content);
  const steps: Record<string, GameState> = { start: s };
  s = run(s, { type: 'place', roomId: R, defId: 'floor_lamp', col: 6, row: 1 }).state;
  s = run(s, { type: 'place', roomId: R, defId: 'star_rug', col: 4, row: 3 }).state;
  s = run(s, { type: 'claim_task', taskId: 'cozy' }).state;
  steps.afterCozy = s;
  s = run(s, { type: 'craft', recipeId: 'workbench' }).state;
  s = run(s, { type: 'place', roomId: R, defId: 'workbench', col: 8, row: 3 }).state;
  s = run(s, { type: 'claim_task', taskId: 'maker' }).state;
  steps.afterMaker = s;
  s = run(s, { type: 'invite', residentId: 'tinker' }).state;
  s = run(s, { type: 'claim_task', taskId: 'welcome_tinker' }).state;
  steps.afterTinker = s;
  const parcel = run(s, { type: 'open_parcel', poolId: 'first_residents' });
  s = parcel.state;
  steps.afterParcel = s;
  s = run(s, { type: 'claim_task', taskId: 'first_parcel' }).state;
  s = run(s, { type: 'set_flag', flag: 'viewed:mischi' }).state;
  s = run(s, { type: 'claim_task', taskId: 'meet_mischi' }).state;
  for (let i = 0; i < 3; i++) s = run(s, { type: 'play', residentId: 'snug', at: 1_000_000 + i * content.bond.playCooldownMs }).state;
  s = run(s, { type: 'claim_task', taskId: 'best_friends' }).state;
  s = run(s, { type: 'upgrade_form', residentId: 'snug' }).state;
  s = run(s, { type: 'claim_task', taskId: 'snug_new_look' }).state;
  steps.end = s;
  return { steps, parcelEvents: parcel.events };
}

describe('first session flow', () => {
  it('can be completed from a fresh save with no money and no luck', () => {
    const { steps, parcelEvents } = playTutorial();
    expect(levelFor(steps.start!.hearts, content)).toBe(1);
    expect(levelFor(steps.afterCozy!.hearts, content)).toBe(2);
    expect(Object.keys(steps.afterMaker!.residents)).toEqual(['snug']);
    expect(levelFor(steps.afterTinker!.hearts, content)).toBe(3);
    expect(Object.keys(steps.afterParcel!.residents).sort()).toEqual(['mischi', 'snug', 'tinker']);
    expect(parcelEvents[0]).toMatchObject({ type: 'parcel_opened', record: { kind: 'resident', id: 'mischi', guaranteed: true, duplicate: false } });
    expect(steps.end!.residents.snug!.form).toBe('decorated');
    expect(taskStates(steps.end!, content).slice(0, 7).every((t) => t.status === 'claimed')).toBe(true);
    for (const v of Object.values(steps.end!.wallet)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic: the same commands give the same result', () => {
    // Command ids differ between runs; everything else must match exactly.
    const strip = (g: GameState) => serialize({ ...g, appliedCommandIds: [] });
    expect(strip(playTutorial().steps.end!)).toBe(strip(playTutorial().steps.end!));
  });

  it('survives save and reload at every step', () => {
    for (const s of Object.values(playTutorial().steps)) expect(deserialize(serialize(s), content)).toEqual(s);
  });
});

describe('levels and gates', () => {
  it('has no circular gate: every level is reachable in order', () => {
    const sorted = [...content.levels].sort((a, b) => a.level - b.level);
    sorted.forEach((l, i) => {
      expect(l.level).toBe(i + 1);
      if (i > 0) expect(l.hearts).toBeGreaterThan(sorted[i - 1]!.hearts);
    });
    // Every invitation and recipe is reachable at a level that exists.
    const max = sorted.at(-1)!.level;
    for (const inv of Object.values(content.invitations)) expect(inv.requiresLevel).toBeLessThanOrEqual(max);
    for (const r of Object.values(content.recipes)) expect(r.requiresLevel).toBeLessThanOrEqual(max);
  });

  it('locks crafting before Level 2 and parcels before Level 3', () => {
    const s = newGame(content);
    expect(fails(s, { type: 'craft', recipeId: 'workbench' })).toBe('locked');
    expect(fails({ ...s, wallet: { ...s.wallet, wishStamps: 1 } }, { type: 'open_parcel', poolId: 'first_residents' })).toBe('locked');
  });

  it('refuses tasks out of order and double claims', () => {
    const s = newGame(content);
    expect(fails(s, { type: 'claim_task', taskId: 'cozy' })).toBe('not_ready');
    expect(fails(s, { type: 'claim_task', taskId: 'maker' })).toBe('not_ready');
    const { steps } = playTutorial();
    expect(fails(steps.afterCozy!, { type: 'claim_task', taskId: 'cozy' })).toBe('already_done');
  });
});

describe('atmosphere and invitations', () => {
  it('only counts two copies of the same item', () => {
    let s = newGame(content);
    s = { ...s, inventory: { ...s.inventory, floor_lamp: 4 } };
    for (const col of [0, 2, 4, 6]) s = run(s, { type: 'place', roomId: R, defId: 'floor_lamp', col, row: 5 }).state;
    expect(atmosphere(s, content, R).Warm).toBe(4);
  });

  it('Tinker needs the level, the room and the gift; then always joins', () => {
    const { steps } = playTutorial();
    const before = steps.afterCozy!;
    const st = invitationStatus(before, content, 'tinker')!;
    expect(st.levelOk).toBe(true);
    expect(st.atmosphere.find((a) => a.tag === 'Crafty')!.ok).toBe(false);
    expect(fails(before, { type: 'invite', residentId: 'tinker' })).toBe('not_ready');
    const ready = steps.afterMaker!;
    expect(invitationStatus(ready, content, 'tinker')!.ready).toBe(true);
    const poor = { ...ready, wallet: { ...ready.wallet, wood: 0 } };
    expect(fails(poor, { type: 'invite', residentId: 'tinker' })).toBe('cannot_afford');
    expect(fails(steps.afterTinker!, { type: 'invite', residentId: 'tinker' })).toBe('already_done');
  });
});

describe('parcels', () => {
  const atLevel3 = () => {
    const s = playTutorial().steps.afterParcel!;
    return { ...s, wallet: { ...s.wallet, wishStamps: 5000 } };
  };

  it('first parcel is guaranteed Mischi and is clearly shown as 100%', () => {
    const s = playTutorial().steps.afterTinker!;
    expect(parcelOdds(s, content, 'first_residents')).toEqual([{ kind: 'resident', id: 'mischi', chance: 1 }]);
  });

  it('odds sum to 1 and only include characters the player has reached', () => {
    const odds = parcelOdds(atLevel3(), content, 'first_residents');
    expect(odds.reduce((a, o) => a + o.chance, 0)).toBeCloseTo(1, 10);
    const chars = odds.filter((o) => o.kind === 'resident').map((o) => o.id).sort();
    expect(chars).toEqual(['mischi', 'snug', 'tinker']);
  });

  /** Level 4 with Bloomi still to find, so a Friend Parcel can bring someone new. */
  const atLevel4 = () => {
    const s = atLevel3();
    return { ...s, hearts: content.levels.find((l) => l.level === 4)!.hearts, wallet: { ...s.wallet, buttons: 1_000_000 } };
  };

  it('a Friend Parcel always holds a friend and matches the displayed odds over many opens', () => {
    const base = atLevel4();
    const odds = parcelOdds(base, content, 'first_residents', 'friend');
    expect(odds.every((o) => o.kind === 'resident')).toBe(true);
    expect(odds.map((o) => o.id).sort()).toEqual(['bloomi', 'mischi', 'snug', 'tinker']);
    const counts: Record<string, number> = {};
    const N = 4000;
    let rngState = base.rngState;
    for (let i = 0; i < N; i++) {
      // Same home every time (Bloomi never moves in), only the dice move on.
      const res = run({ ...base, rngState }, { type: 'open_parcel', poolId: 'first_residents', kind: 'friend' });
      rngState = res.state.rngState;
      const ev = res.events[0];
      expect(ev?.type === 'parcel_opened' && ev.record.kind).toBe('resident');
      if (ev?.type === 'parcel_opened') counts[ev.record.id] = (counts[ev.record.id] ?? 0) + 1;
    }
    for (const o of odds) expect(Math.abs((counts[o.id] ?? 0) / N - o.chance)).toBeLessThan(0.03);
  });

  it('a Furniture Parcel always holds furniture, at its own price, with even odds', () => {
    const base = atLevel4();
    const odds = parcelOdds(base, content, 'first_residents', 'furniture');
    expect(odds.every((o) => o.kind === 'furniture')).toBe(true);
    expect(odds.reduce((a, o) => a + o.chance, 0)).toBeCloseTo(1, 10);
    const counts: Record<string, number> = {};
    let s = base;
    const N = 2800;
    for (let i = 0; i < N; i++) {
      const res = run(s, { type: 'open_parcel', poolId: 'first_residents', kind: 'furniture' });
      const ev = res.events[0];
      expect(ev?.type === 'parcel_opened' && ev.record.kind).toBe('furniture');
      if (ev?.type === 'parcel_opened') counts[ev.record.id] = (counts[ev.record.id] ?? 0) + 1;
      s = res.state;
    }
    expect(base.wallet.buttons - s.wallet.buttons).toBe(N * content.parcels.first_residents!.furnitureCost.buttons!);
    expect(s.wallet.wishStamps).toBe(base.wallet.wishStamps);
    expect(Object.keys(s.residents)).toEqual(Object.keys(base.residents));
    for (const o of odds) expect(Math.abs((counts[o.id] ?? 0) / N - o.chance)).toBeLessThan(0.03);
  });

  it('a Friend Parcel is not sold when it could only hold duplicates', () => {
    // At Level 3 the player already has everyone this parcel can bring.
    expect(fails(atLevel3(), { type: 'open_parcel', poolId: 'first_residents', kind: 'friend' })).toBe('nothing_new');
    expect(fails(atLevel3(), { type: 'open_parcel', poolId: 'first_residents' })).toBe('nothing_new');
    expect(fails({ ...atLevel3(), wallet: { ...atLevel3().wallet, buttons: 500 } }, { type: 'open_parcel', poolId: 'first_residents', kind: 'furniture' })).toBe('ok');
  });

  it('duplicates give Mending Thread, spend exactly one stamp, and replay cannot double-award', () => {
    const s = atLevel4();
    let found: GameState | null = null;
    let rngState = s.rngState;
    for (let i = 0; i < 50 && !found; i++) {
      const cur = { ...s, rngState };
      const res = run(cur, { type: 'open_parcel', poolId: 'first_residents' });
      rngState = res.state.rngState;
      const ev = res.events[0];
      if (ev?.type === 'parcel_opened' && ev.record.duplicate) {
        expect(res.state.wallet.mendingThread - cur.wallet.mendingThread).toBe(5);
        expect(cur.wallet.wishStamps - res.state.wallet.wishStamps).toBe(1);
        found = res.state;
      }
    }
    expect(found).not.toBeNull();
    const cmd: Command = { id: 'replay-me', type: 'open_parcel', poolId: 'first_residents' };
    const once = applyCommand(s, cmd, content);
    if (!once.ok) throw new Error();
    const twice = applyCommand(once.state, cmd, content);
    expect(twice.ok && twice.duplicate).toBe(true);
    if (twice.ok) expect(twice.state.wallet.wishStamps).toBe(once.state.wallet.wishStamps);
  });

  it('Mending Thread trades for a Wish Stamp at the set rate', () => {
    const need = content.rules.threadPerStamp;
    const s = { ...atLevel3(), wallet: { ...atLevel3().wallet, mendingThread: need + 3, wishStamps: 0 } };
    const res = run(s, { type: 'trade_thread' });
    expect(res.state.wallet.mendingThread).toBe(3);
    expect(res.state.wallet.wishStamps).toBe(1);
    expect(fails(res.state, { type: 'trade_thread' })).toBe('cannot_afford');
  });

  it('cannot open without a stamp', () => {
    const s = playTutorial().steps.afterTinker!;
    expect(fails({ ...s, wallet: { ...s.wallet, wishStamps: 0 } }, { type: 'open_parcel', poolId: 'first_residents' })).toBe('cannot_afford');
  });
});

describe('bonding and forms', () => {
  it('play has a cooldown and raises bond level', () => {
    let s = newGame(content);
    s = run(s, { type: 'play', residentId: 'snug', at: 100_000 }).state;
    expect(fails(s, { type: 'play', residentId: 'snug', at: 100_000 + content.bond.playCooldownMs - 1 })).toBe('cooldown');
    s = run(s, { type: 'play', residentId: 'snug', at: 100_000 + content.bond.playCooldownMs }).state;
    expect(bondLevel(s.residents.snug!.bondXp, content)).toBe(1);
    expect(fails(s, { type: 'play', residentId: 'tinker', at: 1e9 })).toBe('not_owned');
  });

  it('Decorated form needs Bond 2 and its cost', () => {
    const s = newGame(content);
    expect(fails(s, { type: 'upgrade_form', residentId: 'snug' })).toBe('locked');
    const bonded = { ...s, residents: { ...s.residents, snug: { ...s.residents.snug!, bondXp: 3 } } };
    expect(fails(bonded, { type: 'upgrade_form', residentId: 'snug' })).toBe('cannot_afford');
  });

  it('rejects unknown flags', () => {
    expect(fails(newGame(content), { type: 'set_flag', flag: 'admin' })).toBe('bad_flag');
  });
});
