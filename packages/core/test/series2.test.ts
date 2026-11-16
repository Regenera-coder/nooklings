import { describe, expect, it } from 'vitest';
import { content, contentWithSeries2 as c2, KITCHEN_ID, SERIES_2, TEA_GARDEN_ID } from '@nooklings/content';
import {
  applyCommand,
  bakeYield,
  deserialize,
  levelFor,
  newGame,
  parcelOdds,
  serialize,
  seriesProgress,
  taskStates,
  SAVE_VERSION,
  type Command,
  type GameState,
} from '@nooklings/core';
import { CASUAL, playWholeGame } from './bot';

let n = 0;
type In = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
const run = (s: GameState, cmd: In) => applyCommand(s, { ...cmd, id: `s${++n}` } as Command, c2);
const ok = (s: GameState, cmd: In) => {
  const r = run(s, cmd);
  if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`);
  return r;
};
const err = (s: GameState, cmd: In) => {
  const r = run(s, cmd);
  return r.ok ? null : r.error;
};
const DAY = 86_400_000;
const T = 20_000 * DAY;
const friend = (room: string) => ({ bondXp: 0, form: 'original' as const, lastPlayAt: 0, playsToday: 0, room, costume: null, treatDay: 0 });
/** A Level 11 home with the Kitchen open, Crumb living in it and some money. */
function kitchenHome(level = 11): GameState {
  const g = newGame(c2);
  return {
    ...g,
    hearts: c2.levels.find((l) => l.level === level)!.hearts,
    purchases: ['sunroom:open', 'yard:expand', `${KITCHEN_ID}:open`],
    wallet: { ...g.wallet, buttons: 1000, wood: 100, fabric: 100, treats: 0 },
    residents: { ...g.residents, crumb: friend(KITCHEN_ID) },
    residentOrder: [...g.residentOrder, 'crumb'],
  };
}

describe('Series 2 stays out of the released game', () => {
  it('the released content has no Series 2 rooms, residents, levels or baking', () => {
    expect(Math.max(...content.levels.map((l) => l.level))).toBe(10);
    expect(Object.values(content.residents).some((r) => r.series === SERIES_2)).toBe(false);
    expect(content.rooms[KITCHEN_ID]).toBeUndefined();
    expect(content.baking).toBeNull();
    expect(content.series.some((x) => x.reward)).toBe(false);
    const g = newGame(content);
    expect(applyCommand(g, { id: 'x1', type: 'start_baking', recipeId: 'butter_cookies', bakerId: null, at: T }, content)).toEqual({ ok: false, error: 'unknown_bake' });
    expect(applyCommand(g, { id: 'x2', type: 'claim_series', seriesId: 'first_residents' }, content)).toEqual({ ok: false, error: 'unknown_series' });
  });

  it('a save made with Series 2 opens safely in the released game', () => {
    const full = playWholeGame(c2).s;
    const back = deserialize(serialize(full), content);
    expect(Object.keys(back.residents).sort()).toEqual(Object.keys(content.residents).sort());
    expect(back.rooms[KITCHEN_ID]).toBeUndefined();
    expect(back.baking).toBeNull();
    expect(back.seriesClaimed).toEqual([]);
  });
});

describe('Series 2 content', () => {
  it('has ten Teatime Friends, twenty levels and room for everyone', () => {
    const s2 = Object.values(c2.residents).filter((r) => r.series === SERIES_2);
    expect(s2).toHaveLength(10);
    expect(c2.levels.map((l) => l.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (let i = 1; i < c2.levels.length; i++) expect(c2.levels[i]!.hearts).toBeGreaterThan(c2.levels[i - 1]!.hearts);
    expect(c2.roomOrder.length * c2.rules.maxResidentsPerRoom).toBeGreaterThanOrEqual(Object.keys(c2.residents).length);
  });

  it('every reference points at something that exists', () => {
    for (const r of Object.values(c2.recipes)) expect(c2.furniture[r.furnitureId], r.id).toBeTruthy();
    for (const inv of Object.values(c2.invitations)) {
      expect(c2.rooms[inv.roomId], inv.residentId).toBeTruthy();
      for (const f of inv.requiresPlaced ?? []) expect(c2.furniture[f], f).toBeTruthy();
      for (const f of inv.requiresOwned ?? []) expect(c2.residents[f], f).toBeTruthy();
    }
    for (const p of Object.values(c2.parcels)) for (const f of p.furniture) expect(c2.furniture[f], f).toBeTruthy();
    for (const r of Object.values(c2.residents)) if (r.favouriteBake) expect(c2.baking!.recipes[r.favouriteBake], r.id).toBeTruthy();
    for (const x of c2.series) if (x.reward?.furnitureId) expect(c2.furniture[x.reward.furnitureId]).toBeTruthy();
    // Every Teatime Friend has exactly one way to join besides luck.
    for (const r of Object.values(c2.residents).filter((x) => x.series === SERIES_2)) {
      const ways =
        (c2.invitations[r.id] ? 1 : 0) +
        Object.values(c2.parcels).filter((p) => p.guaranteedFirst === r.id).length +
        Object.values(c2.expeditions).filter((e) => e.firstTimeResident === r.id).length;
      expect(ways, r.id).toBe(1);
    }
  });
});

describe('baking', () => {
  it('needs the Kitchen, bakes for the recipe time, and gives Treats once', () => {
    const closed = { ...kitchenHome(), purchases: [] };
    expect(err(closed, { type: 'start_baking', recipeId: 'butter_cookies', bakerId: null, at: T })).toBe('locked');
    let s = kitchenHome();
    expect(err(s, { type: 'start_baking', recipeId: 'honey_cake', bakerId: null, at: T })).toBe('locked');
    s = ok(s, { type: 'start_baking', recipeId: 'butter_cookies', bakerId: null, at: T }).state;
    expect(s.wallet.buttons).toBe(980);
    expect(err(s, { type: 'start_baking', recipeId: 'butter_cookies', bakerId: null, at: T })).toBe('busy');
    expect(err(s, { type: 'collect_baking', at: T + 3_599_000 })).toBe('not_ready');
    s = ok(s, { type: 'collect_baking', at: T + 3_600_000 }).state;
    expect(s.wallet.treats).toBe(3);
    expect(s.bakesDone).toBe(1);
    expect(err(s, { type: 'collect_baking', at: T + 3_600_000 })).toBe('not_ready');
  });

  it('a Teatime Friend adds a Treat, and one more for their favourite recipe', () => {
    expect(bakeYield(c2, 'butter_cookies', null).treats).toBe(3);
    expect(bakeYield(c2, 'butter_cookies', 'crumb').treats).toBe(5);
    expect(bakeYield(c2, 'jam_tarts', 'crumb').treats).toBe(7);
    let s = kitchenHome();
    expect(err(s, { type: 'start_baking', recipeId: 'butter_cookies', bakerId: 'snug', at: T })).toBe('locked');
    expect(err(s, { type: 'start_baking', recipeId: 'butter_cookies', bakerId: 'mallow', at: T })).toBe('not_owned');
    s = ok(s, { type: 'start_baking', recipeId: 'butter_cookies', bakerId: 'crumb', at: T }).state;
    const done = ok(s, { type: 'collect_baking', at: T + 3_600_000 });
    expect(done.state.wallet.treats).toBe(5);
    expect(done.events).toContainEqual({ type: 'baking_done', recipeId: 'butter_cookies', bakerId: 'crumb', treats: 5, bonus: 2 });
  });

  it('a Treat a day adds bond, once per friend per day', () => {
    let s: GameState = { ...kitchenHome(), wallet: { ...kitchenHome().wallet, treats: 2 } };
    s = ok(s, { type: 'give_treat', residentId: 'snug', at: T }).state;
    expect(s.residents.snug!.bondXp).toBe(1);
    expect(s.wallet.treats).toBe(1);
    expect(err(s, { type: 'give_treat', residentId: 'snug', at: T + 3_600_000 })).toBe('daily_limit');
    s = ok(s, { type: 'give_treat', residentId: 'crumb', at: T }).state;
    expect(err(s, { type: 'give_treat', residentId: 'snug', at: T + DAY })).toBe('cannot_afford');
  });
});

describe('Teatime Parcel and series rewards', () => {
  it('the first Teatime Parcel always brings Whisk, whatever was opened before', () => {
    const s: GameState = { ...kitchenHome(12), wallet: { ...kitchenHome().wallet, treats: 20 }, parcelsOpened: 5, parcelsByPool: { first_residents: 5 } };
    expect(parcelOdds(s, c2, 'teatime')).toEqual([{ kind: 'resident', id: 'whisk', chance: 1 }]);
    const r = ok(s, { type: 'open_parcel', poolId: 'teatime' });
    expect('whisk' in r.state.residents).toBe(true);
    expect(r.state.parcelsByPool).toEqual({ first_residents: 5, teatime: 1 });
    const odds = parcelOdds(r.state, c2, 'teatime');
    expect(odds.reduce((a, o) => a + o.chance, 0)).toBeCloseTo(1);
    expect(odds.filter((o) => o.kind === 'resident').every((o) => c2.residents[o.id]!.series === SERIES_2 && c2.residents[o.id]!.joinLevel <= 12)).toBe(true);
  });

  it('a series reward is given once, only when the series is complete', () => {
    let s = kitchenHome();
    expect(err(s, { type: 'claim_series', seriesId: 'first_residents' })).toBe('not_ready');
    const all = Object.values(c2.residents).filter((r) => r.series === 'first_residents').map((r) => r.id);
    s = { ...s, residents: { ...s.residents, ...Object.fromEntries(all.map((id) => [id, friend('living_room')])) }, residentOrder: [...new Set([...s.residentOrder, ...all])] };
    expect(seriesProgress(s, c2, 'first_residents')).toEqual({ owned: 10, total: 10, complete: true, claimed: false });
    const r = ok(s, { type: 'claim_series', seriesId: 'first_residents' });
    expect(r.state.wallet.ribbons).toBe(s.wallet.ribbons + 10);
    expect(r.state.inventory.first_residents_trophy).toBe(1);
    expect(err(r.state, { type: 'claim_series', seriesId: 'first_residents' })).toBe('already_done');
    expect(err(s, { type: 'claim_series', seriesId: 'nope' })).toBe('unknown_series');
  });
});

describe('saves', () => {
  it('a version 7 save keeps its progress and gains the new fields', () => {
    const old = JSON.parse(serialize(playWholeGame(content).s));
    old.version = 7;
    for (const k of ['parcelsByPool', 'baking', 'bakesDone', 'seriesClaimed']) delete old[k];
    delete old.wallet.treats;
    for (const r of Object.values(old.residents) as Array<Record<string, unknown>>) delete r.treatDay;
    const s = deserialize(JSON.stringify(old), c2);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.wallet.treats).toBe(0);
    expect(s.parcelsByPool).toEqual({ first_residents: old.parcelsOpened });
    expect(s.baking).toBeNull();
    expect(Object.keys(s.residents)).toHaveLength(10);
    expect(Object.values(s.residents).every((r) => r.treatDay === 0)).toBe(true);
    expect(levelFor(s.hearts, c2)).toBe(10);
    // The next chapter is waiting: the first Series 2 task is the one to do.
    expect(taskStates(s, c2).find((t) => t.status !== 'claimed')?.def.id).toBe('open_kitchen');
  });

  it('a batch in the oven survives a save and load', () => {
    const s = ok(kitchenHome(), { type: 'start_baking', recipeId: 'butter_cookies', bakerId: 'crumb', at: T }).state;
    expect(deserialize(serialize(s), c2).baking).toEqual(s.baking);
  });
});

describe('whole game with Series 2', () => {
  const full = playWholeGame(c2);

  it('reaches Home Level 20 with all twenty residents, without luck or money', () => {
    expect(levelFor(full.s.hearts, c2)).toBe(20);
    expect(Object.keys(full.s.residents).sort()).toEqual(Object.keys(c2.residents).sort());
    expect(taskStates(full.s, c2).filter((t) => t.status !== 'claimed').map((t) => t.def.id)).toEqual([]);
    for (const v of Object.values(full.s.wallet)) expect(v).toBeGreaterThanOrEqual(0);
    expect(full.s.purchases).toContain(`${KITCHEN_ID}:open`);
    expect(full.s.purchases).toContain(`${TEA_GARDEN_ID}:open`);
    expect(full.s.seriesClaimed.sort()).toEqual(['first_residents', SERIES_2].sort());
    const per: Record<string, number> = {};
    for (const r of Object.values(full.s.residents)) per[r.room] = (per[r.room] ?? 0) + 1;
    for (const v of Object.values(per)) expect(v).toBeLessThanOrEqual(c2.rules.maxResidentsPerRoom);
  });

  it('Series 1 pacing is unchanged and Series 2 adds about ten more days', () => {
    const base = playWholeGame(content, CASUAL);
    const casual = playWholeGame(c2, CASUAL);
    const day = (lv: number) => Math.floor(casual.levelAt[lv]! / 1440) + 1;
    console.log('series 2 casual: level reached on day', Object.fromEntries(Object.keys(casual.levelAt).map((l) => [l, day(Number(l))])), 'finished on day', Math.ceil(casual.minutes / 1440), 'joined (day)', Object.fromEntries(Object.entries(casual.joinedAt).map(([k, v]) => [k, Math.floor(v / 1440) + 1])));
    for (let lv = 2; lv <= 10; lv++) expect(casual.levelAt[lv]).toBe(base.levelAt[lv]);
    expect(levelFor(casual.s.hearts, c2)).toBe(20);
    expect(Object.keys(casual.s.residents)).toHaveLength(20);
    for (let lv = 11; lv <= 20; lv++) expect(casual.levelAt[lv]).toBeGreaterThanOrEqual(casual.levelAt[lv - 1]!);
    const added = day(20) - day(10);
    expect(added).toBeGreaterThanOrEqual(7);
    expect(added).toBeLessThanOrEqual(14);
  });
});
