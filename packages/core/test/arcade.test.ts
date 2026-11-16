import { describe, expect, it } from 'vitest';
import { content } from '@nooklings/content';
import {
  applyCommand, SAVE_VERSION, arcadePlaysLeft, arcadeRibbonsLeft, companionOf, DAY_MS, deserialize, newGame, ribbonsForScore, serialize,
  type ArcadeGameId, type Command, type GameState,
} from '@nooklings/core';

type Input = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
let n = 0;
const run = (s: GameState, cmd: Input) => applyCommand(s, { ...cmd, id: `a${++n}` } as Command, content);
const ok = (s: GameState, cmd: Input) => { const r = run(s, cmd); if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`); return r; };
const err = (s: GameState, cmd: Input) => { const r = run(s, cmd); return r.ok ? 'ok' : r.error; };
const AT = 25_000 * DAY_MS;
const levelHearts = (level: number) => content.levels.find((l) => l.level === level)!.hearts;
const atLevel = (level: number): GameState => ({ ...newGame(content), hearts: levelHearts(level) });
const withResident = (s: GameState, id: string): GameState => ({
  ...s, residents: { ...s.residents, [id]: { bondXp: 0, form: 'original', lastPlayAt: 0, playsToday: 0, room: 'living_room', costume: null, treatDay: 0 } }, residentOrder: [...s.residentOrder, id],
});

describe('Arcade content', () => {
  it('has the ten games of brief 09 with the right hosts, unlock levels and three prizes each', () => {
    const expected: Record<ArcadeGameId, [string, number]> = {
      button_catch: ['snug', 1], memory: ['tinker', 2], stitch: ['patcha', 2], kitchen: ['bloomi', 3], garden: ['bloomi', 4],
      glyph: ['patcha', 5], lantern: ['glim', 5], spot: ['mischi', 6], parcel: ['pippo', 7], hide: ['hush', 8],
    };
    expect(Object.keys(content.arcadeGames).sort()).toEqual(Object.keys(expected).sort());
    for (const [id, [host, level]] of Object.entries(expected)) {
      const g = content.arcadeGames[id as ArcadeGameId];
      expect([g.host, g.unlockLevel]).toEqual([host, level]);
      expect(g.prizes.map((p) => p.kind)).toEqual(['furniture', 'furniture', 'companion']);
      expect(g.prizes[0].score).toBeLessThan(g.prizes[1].score);
      expect(g.prizes[1].score).toBeLessThan(g.prizes[2].score);
      expect(g.prizes[2].score).toBeLessThanOrEqual(g.maxScore);
      for (const p of g.prizes) expect(p.kind === 'furniture' ? content.furniture[p.id] : content.companions[p.id]).toBeTruthy();
    }
  });

  it('keeps prize furniture out of shops, recipes and parcels', () => {
    const prizeFurniture = Object.values(content.arcadeGames).flatMap((g) => g.prizes.filter((p) => p.kind === 'furniture').map((p) => p.id));
    expect(new Set(prizeFurniture).size).toBe(20);
    const elsewhere = new Set([...Object.values(content.recipes).map((r) => r.furnitureId), ...Object.values(content.parcels).flatMap((p) => p.furniture)]);
    for (const id of prizeFurniture) expect(elsewhere.has(id)).toBe(false);
  });
});

describe('play_arcade', () => {
  it('respects unlock levels', () => {
    const s = atLevel(1);
    expect(err(s, { type: 'play_arcade', gameId: 'memory', score: 10, at: AT })).toBe('locked');
    expect(err(s, { type: 'play_arcade', gameId: 'button_catch', score: 10, at: AT })).toBe('ok');
    expect(err(atLevel(8), { type: 'play_arcade', gameId: 'hide', score: 10, at: AT })).toBe('ok');
    expect(err(s, { type: 'play_arcade', gameId: 'nope' as ArcadeGameId, score: 10, at: AT })).toBe('unknown_game');
  });

  it('allows three plays per game per day, counted separately, and resets the next day', () => {
    let s = atLevel(2);
    for (let i = 0; i < 3; i++) s = ok(s, { type: 'play_arcade', gameId: 'memory', score: 0, at: AT + i }).state;
    expect(arcadePlaysLeft(s, content, 'memory', AT)).toBe(0);
    expect(err(s, { type: 'play_arcade', gameId: 'memory', score: 0, at: AT + 9 })).toBe('daily_limit');
    expect(err(s, { type: 'play_arcade', gameId: 'stitch', score: 0, at: AT + 9 })).toBe('ok');
    expect(arcadePlaysLeft(s, content, 'memory', AT + DAY_MS)).toBe(3);
    expect(err(s, { type: 'play_arcade', gameId: 'memory', score: 0, at: AT + DAY_MS })).toBe('ok');
  });

  it('pays Ribbons by score, capped at five per round, and clamps scores', () => {
    const g = content.arcadeGames.button_catch;
    expect(ribbonsForScore(content, g, 34)).toBe(3);
    expect(ribbonsForScore(content, g, 9999)).toBe(5);
    expect(ribbonsForScore(content, g, -5)).toBe(0);
    let s = atLevel(1);
    const r = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 9999, at: AT });
    s = r.state;
    expect(s.wallet.ribbons).toBe(5);
    expect(s.arcade.best.button_catch).toBe(g.maxScore);
    expect(r.events).toContainEqual({ type: 'ribbons_earned', amount: 5, source: 'arcade' });
  });

  it('remembers the best score', () => {
    let s = atLevel(1);
    s = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 20, at: AT }).state;
    const r = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 12, at: AT + 1 });
    expect(r.state.arcade.best.button_catch).toBe(20);
    expect(r.events.find((e) => e.type === 'arcade_done')).toMatchObject({ score: 12, best: 20, newBest: false, playsLeft: 1 });
  });

  it('grants each prize once: furniture to storage, companion to the host', () => {
    let s = atLevel(1);
    const jar = s.inventory.button_jar ?? 0;
    let r = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 16, at: AT });
    expect(r.events.filter((e) => e.type === 'prize_won').map((e) => (e as { id: string }).id)).toEqual(['button_jar']);
    s = r.state;
    expect(s.inventory.button_jar).toBe(jar + 1);
    r = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 60, at: AT + 1 });
    expect(r.events.filter((e) => e.type === 'prize_won').map((e) => (e as { id: string }).id)).toEqual(['button_rug', 'button_mouse']);
    s = r.state;
    expect(s.inventory.button_jar).toBe(jar + 1);
    expect(s.inventory.button_rug).toBe(1);
    expect(s.companions.button_mouse).toEqual({ residentId: 'snug' });
    expect(companionOf(s, 'snug')).toBe('button_mouse');
    // Playing well again grants nothing twice.
    r = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 60, at: AT + 2 });
    expect(r.events.some((e) => e.type === 'prize_won')).toBe(false);
    expect(r.state.inventory).toEqual(s.inventory);
    expect(r.state.arcade.prizes).toEqual(['button_catch:0', 'button_catch:1', 'button_catch:2']);
  });

  it('ignores a replayed command, so a prize cannot be granted twice', () => {
    const s = atLevel(1);
    const cmd: Command = { id: 'same', type: 'play_arcade', gameId: 'button_catch', score: 60, at: AT };
    const first = applyCommand(s, cmd, content);
    if (!first.ok) throw new Error('failed');
    const again = applyCommand(first.state, cmd, content);
    expect(again.ok && again.duplicate).toBe(true);
    expect(again.ok && again.state).toBe(first.state);
  });

  it('places prize furniture like any stored item', () => {
    let s = ok(atLevel(1), { type: 'play_arcade', gameId: 'button_catch', score: 60, at: AT }).state;
    s = ok(s, { type: 'place', roomId: 'living_room', defId: 'button_jar', col: 6, row: 3 }).state;
    expect(s.rooms.living_room!.placements.some((p) => p.defId === 'button_jar')).toBe(true);
    expect(s.inventory.button_jar ?? 0).toBe(0);
  });

  it('gives a companion to the first resident without one when the host is away or taken', () => {
    let s = withResident(atLevel(2), 'tinker');
    s = { ...s, companions: { button_mouse: { residentId: 'tinker' } } };
    const r = ok(s, { type: 'play_arcade', gameId: 'memory', score: 100, at: AT });
    expect(r.state.companions.paper_crane).toEqual({ residentId: 'snug' });
    // Patcha (stitch host) not owned and both residents have companions: it rests.
    const r2 = ok(r.state, { type: 'play_arcade', gameId: 'stitch', score: 120, at: AT });
    expect(r2.state.companions.yarn_kitten).toEqual({ residentId: null });
  });
});

describe('assign_companion', () => {
  it('moves a companion between residents, one companion per resident', () => {
    let s = withResident(atLevel(2), 'tinker');
    s = { ...s, companions: { button_mouse: { residentId: 'snug' }, paper_crane: { residentId: null } } };
    expect(err(s, { type: 'assign_companion', companionId: 'firefly', residentId: 'snug' })).toBe('not_owned');
    expect(err(s, { type: 'assign_companion', companionId: 'nope', residentId: 'snug' })).toBe('unknown_companion');
    expect(err(s, { type: 'assign_companion', companionId: 'paper_crane', residentId: 'hush' })).toBe('not_owned');
    s = ok(s, { type: 'assign_companion', companionId: 'paper_crane', residentId: 'snug' }).state;
    expect(s.companions).toEqual({ button_mouse: { residentId: null }, paper_crane: { residentId: 'snug' } });
    s = ok(s, { type: 'assign_companion', companionId: 'button_mouse', residentId: 'tinker' }).state;
    expect(companionOf(s, 'tinker')).toBe('button_mouse');
    s = ok(s, { type: 'assign_companion', companionId: 'paper_crane', residentId: null }).state;
    expect(companionOf(s, 'snug')).toBeNull();
  });
});

describe('save v5', () => {
  it('round-trips Arcade progress and companions', () => {
    let s = ok(atLevel(1), { type: 'play_arcade', gameId: 'button_catch', score: 60, at: AT }).state;
    const back = deserialize(serialize(s), content);
    expect(back.arcade).toEqual(s.arcade);
    expect(back.companions).toEqual(s.companions);
    expect(back.inventory).toEqual(s.inventory);
  });

  it('upgrades a v4 save with empty Arcade progress', () => {
    const v4 = JSON.parse(serialize(newGame(content)));
    v4.version = 4;
    delete v4.arcade;
    delete v4.companions;
    const s = deserialize(JSON.stringify(v4), content);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.arcade).toEqual({ day: 0, plays: {}, ribbons: 0, best: {}, prizes: [] });
    expect(s.companions).toEqual({});
  });

  it('drops unknown games, bad prizes, out-of-range scores and double-booked companions', () => {
    const raw = JSON.parse(serialize(newGame(content)));
    raw.arcade = { day: 3, plays: { memory: 99, nope: 1 }, best: { memory: 5000, nope: 4 }, prizes: ['memory:0', 'memory:0', 'memory:7', 'nope:1'] };
    raw.companions = { button_mouse: { residentId: 'snug' }, firefly: { residentId: 'snug' }, unknown_pet: { residentId: null }, owl: 5, curious_owl: { residentId: 'hush' } };
    const s = deserialize(JSON.stringify(raw), content);
    expect(s.arcade).toEqual({ day: 3, plays: { memory: 3 }, ribbons: 0, best: { memory: 100 }, prizes: ['memory:0'] });
    expect(s.companions).toEqual({ button_mouse: { residentId: 'snug' }, firefly: { residentId: null }, curious_owl: { residentId: null } });
  });
});

describe('daily Arcade Ribbon cap', () => {
  const cap = content.arcade.maxRibbonsPerDay;

  it('trims Ribbons at the cap, across games, and resets the next day', () => {
    let s = atLevel(8);
    const start = s.wallet.ribbons;
    expect(arcadeRibbonsLeft(s, content, AT)).toBe(cap);
    // Two full rounds (5 + 5) reach the cap of 10.
    s = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 9999, at: AT }).state;
    let r = ok(s, { type: 'play_arcade', gameId: 'memory', score: 9999, at: AT + 1 });
    s = r.state;
    expect(s.wallet.ribbons - start).toBe(cap);
    expect(r.events.find((e) => e.type === 'arcade_done')).toMatchObject({ ribbons: 5, ribbonsLeft: 0 });
    // Past the cap: the round still counts (best score, plays, prizes) but gives no Ribbons.
    r = ok(s, { type: 'play_arcade', gameId: 'stitch', score: 9999, at: AT + 2 });
    s = r.state;
    expect(s.wallet.ribbons - start).toBe(cap);
    expect(s.arcade.best.stitch).toBe(content.arcadeGames.stitch.maxScore);
    expect(s.arcade.prizes).toContain('stitch:2');
    expect(r.events.find((e) => e.type === 'arcade_done')).toMatchObject({ ribbons: 0, ribbonsLeft: 0 });
    expect(r.events.some((e) => e.type === 'ribbons_earned')).toBe(false);
    // A new day starts again from zero.
    expect(arcadeRibbonsLeft(s, content, AT + DAY_MS)).toBe(cap);
    r = ok(s, { type: 'play_arcade', gameId: 'stitch', score: 9999, at: AT + DAY_MS });
    expect(r.state.wallet.ribbons - start).toBe(cap + 5);
    expect(r.state.arcade.ribbons).toBe(5);
  });

  it('gives a partial round when only a few Ribbons are left', () => {
    let s = atLevel(8);
    const start = s.wallet.ribbons;
    s = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 9999, at: AT }).state; // 5
    s = ok(s, { type: 'play_arcade', gameId: 'button_catch', score: 30, at: AT + 1 }).state; // 3
    const r = ok(s, { type: 'play_arcade', gameId: 'memory', score: 9999, at: AT + 2 }); // 2 of 5
    expect(r.state.wallet.ribbons - start).toBe(cap);
    expect(r.events.find((e) => e.type === 'arcade_done')).toMatchObject({ ribbons: 2, ribbonsLeft: 0 });
  });

  it('carries a v5 save over and clamps a tampered counter', () => {
    const v5 = JSON.parse(serialize(atLevel(8)));
    v5.version = 5;
    delete v5.arcade.ribbons;
    expect(deserialize(JSON.stringify(v5), content).arcade.ribbons).toBe(0);
    v5.arcade.ribbons = 9999;
    expect(deserialize(JSON.stringify(v5), content).arcade.ribbons).toBe(cap);
  });
});
