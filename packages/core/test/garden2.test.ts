import { describe, expect, it } from 'vitest';
import { content as c } from '@nooklings/content';
import {
  applyCommand,
  deserialize,
  newGame,
  plantStatus,
  serialize,
  succulentName,
  succulentSellPrice,
  type Command,
  type GameState,
  type PottedSucculent,
} from '@nooklings/core';

let n = 0;
type In = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
const run = (s: GameState, cmd: In) => applyCommand(s, { ...cmd, id: `p${++n}` } as Command, c);
const ok = (s: GameState, cmd: In) => {
  const r = run(s, cmd);
  if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`);
  return r;
};
const err = (s: GameState, cmd: In) => {
  const r = run(s, cmd);
  return r.ok ? null : r.error;
};
const H = 3_600_000;
const T = 1_800_000_000_000;
const g = c.garden!;
const full = (id: string) => g.species[id]!.sproutMs + g.species[id]!.growMs;
const plant = (speciesId: string, colour: string, plantedAt: number): PottedSucculent => ({ speciesId, colour, plantedAt, pod: null, offsetTakenAt: null });

/** Level 5 garden with a blooming Meringue Rose (pot 0) and a blooming Ribbon Fall (pot 1) at time `now`. */
function blooming(now: number, rng = 1): GameState {
  const s = newGame(c);
  const start = now - full('ribbon_fall') - g.bloomMs;
  return {
    ...s,
    hearts: 90,
    rngState: rng,
    wallet: { ...s.wallet, buttons: 1000 },
    garden: { ...s.garden, pots: [plant('meringue_rose', 'blueberry', start), plant('ribbon_fall', 'plum', start), null] },
  };
}

describe('flowers and pollinating', () => {
  it('a grown plant flowers after bloomMs', () => {
    const p = plant('meringue_rose', 'blueberry', T);
    expect(plantStatus(c, p, T + full('meringue_rose'))!.blooming).toBe(false);
    expect(plantStatus(c, p, T + full('meringue_rose') + g.bloomMs)!.blooming).toBe(true);
  });

  it('pollinates one flower with another, ripens a pod and gives seeds from the two parents', () => {
    const now = T;
    let s = blooming(now);
    expect(err(s, { type: 'pollinate', pot: 0, fromPot: 0, at: now })).toBe('unknown_pot');
    expect(err(s, { type: 'pollinate', pot: 0, fromPot: 2, at: now })).toBe('not_ready');
    s = ok(s, { type: 'pollinate', pot: 0, fromPot: 1, at: now }).state;
    expect(s.garden.pots[0]!.pod).toEqual({ fatherSpecies: 'ribbon_fall', fatherColour: 'plum', readyAt: now + g.podMs });
    expect(err(s, { type: 'pollinate', pot: 0, fromPot: 1, at: now })).toBe('busy');
    expect(err(s, { type: 'sell_succulent', pot: 0, at: now })).toBe('busy');
    expect(err(s, { type: 'collect_pod', pot: 0, at: now + g.podMs - 1 })).toBe('not_ready');
    const r = ok(s, { type: 'collect_pod', pot: 0, at: now + g.podMs });
    const ev = r.events.find((e) => e.type === 'pod_collected') as { seeds: string[] };
    expect(ev.seeds).toHaveLength(g.seedsPerPod);
    for (const k of ev.seeds) {
      const [sp, col] = k.split(':');
      expect(['meringue_rose', 'ribbon_fall']).toContain(sp);
      expect(g.colourOrder).toContain(col);
    }
    expect(Object.values(r.state.garden.seeds).reduce((a, b) => a + b, 0)).toBe(g.seedsPerPod);
    expect(r.state.garden.pots[0]!.pod).toBeNull();
    expect(r.state.rngState).not.toBe(s.rngState);
  });

  it('mixes shapes and colours about evenly, with rare mutations to a third colour', () => {
    const counts: Record<string, number> = {};
    let mutations = 0;
    let seeds = 0;
    for (let i = 0; i < 400; i++) {
      let s = blooming(T, 1000 + i * 7919);
      s = ok(s, { type: 'pollinate', pot: 0, fromPot: 1, at: T }).state;
      const r = ok(s, { type: 'collect_pod', pot: 0, at: T + g.podMs });
      const ev = r.events.find((e) => e.type === 'pod_collected') as { seeds: string[]; mutations: number };
      mutations += ev.mutations;
      for (const k of ev.seeds) counts[k] = (counts[k] ?? 0) + 1;
      seeds += ev.seeds.length;
    }
    const share = (pred: (k: string) => boolean) => Object.entries(counts).filter(([k]) => pred(k)).reduce((a, [, v]) => a + v, 0) / seeds;
    expect(share((k) => k.startsWith('meringue_rose'))).toBeGreaterThan(0.4);
    expect(share((k) => k.startsWith('meringue_rose'))).toBeLessThan(0.6);
    expect(share((k) => k.endsWith(':plum'))).toBeGreaterThan(0.4);
    expect(mutations / seeds).toBeGreaterThan(0.02);
    expect(mutations / seeds).toBeLessThan(0.09);
    expect(share((k) => !k.endsWith(':plum') && !k.endsWith(':blueberry'))).toBeCloseTo(mutations / seeds, 5);
  });
});

describe('seeds, offsets and the Succulent book', () => {
  it('plants a saved seed in its colour for free, and sells a new colour for more', () => {
    let s = blooming(T);
    s = { ...s, garden: { ...s.garden, seeds: { 'gumdrop_cluster:plum': 1 } } };
    const buttons = s.wallet.buttons;
    s = ok(s, { type: 'plant_seed', pot: 2, seed: 'gumdrop_cluster:plum', at: T }).state;
    expect(s.wallet.buttons).toBe(buttons);
    expect(s.garden.seeds).toEqual({});
    expect(s.garden.pots[2]).toMatchObject({ speciesId: 'gumdrop_cluster', colour: 'plum' });
    expect(err(s, { type: 'plant_seed', pot: 2, seed: 'gumdrop_cluster:plum', at: T })).toBe('unknown_species');
    const base = g.species.gumdrop_cluster!.sellPrice.buttons!;
    expect(succulentSellPrice(c, s.garden.pots[2]!).buttons).toBe(Math.round(base * g.newColourSellBonus));
    expect(succulentSellPrice(c, plant('gumdrop_cluster', 'taro', T)).buttons).toBe(base);
    expect(succulentName(c, 'gumdrop_cluster', 'plum')).toBe('Plum Gumdrop Cluster');
  });

  it('a grown plant makes an offset that is a copy of itself, again after offsetMs', () => {
    const grownAt = T + full('stitchback');
    let s = blooming(T);
    s = { ...s, garden: { ...s.garden, pots: [plant('stitchback', 'strawberry', T), null, null] } };
    expect(err(s, { type: 'take_offset', pot: 0, at: grownAt + g.offsetMs - 1 })).toBe('not_ready');
    s = ok(s, { type: 'take_offset', pot: 0, at: grownAt + g.offsetMs }).state;
    expect(s.garden.seeds).toEqual({ 'stitchback:strawberry': 1 });
    expect(err(s, { type: 'take_offset', pot: 0, at: grownAt + g.offsetMs + H })).toBe('not_ready');
    s = ok(s, { type: 'take_offset', pot: 0, at: grownAt + 2 * g.offsetMs }).state;
    expect(s.garden.seeds['stitchback:strawberry']).toBe(2);
  });

  it('records each grown species-and-colour once, with a Heart each', () => {
    let s = blooming(T);
    const hearts = s.hearts;
    const r = ok(s, { type: 'tend_garden', at: T });
    expect(r.events).toContainEqual({ type: 'discovered', keys: ['meringue_rose:blueberry', 'ribbon_fall:plum'] });
    s = r.state;
    expect(s.hearts).toBe(hearts + 2 * g.heartsPerDiscovery);
    expect(err(s, { type: 'tend_garden', at: T })).toBe('already_done');
  });

  it('keeps pods, seeds, offsets and discoveries through a save, and v9 plants get their own colour', () => {
    let s = blooming(T);
    s = ok(s, { type: 'pollinate', pot: 0, fromPot: 1, at: T }).state;
    s = { ...s, garden: { ...s.garden, seeds: { 'teacup_tree:taro': 2 } } };
    expect(deserialize(serialize(s), c).garden).toEqual(s.garden);

    const old = JSON.parse(serialize(s)) as { version: number; garden: { pots: Array<Record<string, unknown> | null>; seeds?: unknown; discovered?: unknown } };
    old.version = 9;
    old.garden.pots = old.garden.pots.map((p) => (p ? { speciesId: p.speciesId, plantedAt: p.plantedAt } : null));
    delete old.garden.seeds;
    delete old.garden.discovered;
    const up = deserialize(JSON.stringify(old), c);
    expect(up.garden.pots[1]).toEqual(plant('ribbon_fall', 'plum', s.garden.pots[1]!.plantedAt));
    expect(up.garden.seeds).toEqual({});
    expect(up.garden.discovered).toEqual([]);
  });
});
