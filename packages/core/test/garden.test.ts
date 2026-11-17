import { describe, expect, it } from 'vitest';
import { content as c } from '@nooklings/content';
import {
  applyCommand,
  deserialize,
  gardenOpen,
  gardenReady,
  levelFor,
  newGame,
  serialize,
  succulentGrowth,
  SAVE_VERSION,
  type Command,
  type GameState,
} from '@nooklings/core';

let n = 0;
type In = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
const run = (s: GameState, cmd: In) => applyCommand(s, { ...cmd, id: `g${++n}` } as Command, c);
const ok = (s: GameState, cmd: In) => {
  const r = run(s, cmd);
  if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`);
  return r;
};
const err = (s: GameState, cmd: In) => {
  const r = run(s, cmd);
  return r.ok ? null : r.error;
};
const T = 1_800_000_000_000;
const garden = c.garden!;
const rose = garden.species.meringue_rose!;
const total = rose.sproutMs + rose.growMs;

function home(level = 5, buttons = 1000, wood = 50): GameState {
  const g = newGame(c);
  return { ...g, hearts: c.levels.find((l) => l.level === level)!.hearts, wallet: { ...g.wallet, buttons, wood } };
}

describe('Succulent Garden content', () => {
  it('has five of our own species, each with its own colours, and opens at Home Level 5', () => {
    expect(garden.order).toEqual(['meringue_rose', 'gumdrop_cluster', 'stitchback', 'teacup_tree', 'ribbon_fall']);
    for (const id of garden.order) {
      const def = garden.species[id]!;
      expect(def.colour.mature).toMatch(/^#[0-9a-f]{6}$/);
      expect(def.colour.blush).toMatch(/^#[0-9a-f]{6}$/);
      expect(def.sellPrice.buttons!).toBeGreaterThan(def.seedCost.buttons!);
    }
    expect(c.levels.find((l) => l.unlocks.includes(garden.unlock))!.level).toBe(5);
    expect(newGame(c).garden.pots).toEqual([null, null, null]);
  });
});

describe('growing', () => {
  it('stays a green seedling, then blends smoothly to its own colour', () => {
    const at = (ms: number) => succulentGrowth(c, rose.id, T, T + ms)!;
    expect(at(0)).toMatchObject({ stage: 'seedling', colour: 0 });
    expect(at(rose.sproutMs - 1)).toMatchObject({ stage: 'seedling', colour: 0 });
    expect(at(rose.sproutMs + rose.growMs / 2)).toMatchObject({ stage: 'young', colour: 0.5 });
    expect(at(total)).toMatchObject({ stage: 'grown', colour: 1, progress: 1 });
    // The blend never jumps: small time steps give small colour steps.
    let last = 0;
    for (let ms = 0; ms <= total; ms += 60_000) {
      const col = at(ms).colour;
      expect(col).toBeGreaterThanOrEqual(last);
      expect(col - last).toBeLessThan(0.01);
      last = col;
    }
  });

  it('is locked before Home Level 5', () => {
    const s = home(4);
    expect(gardenOpen(s, c)).toBe(false);
    expect(err(s, { type: 'plant_succulent', pot: 0, speciesId: rose.id, at: T })).toBe('locked');
  });

  it('plants a seed packet, then sells the grown plant once', () => {
    let s = home();
    const before = s.wallet.buttons;
    s = ok(s, { type: 'plant_succulent', pot: 1, speciesId: rose.id, at: T }).state;
    expect(s.wallet.buttons).toBe(before - rose.seedCost.buttons!);
    expect(s.garden.pots[1]).toEqual({ speciesId: rose.id, plantedAt: T });
    expect(err(s, { type: 'plant_succulent', pot: 1, speciesId: rose.id, at: T })).toBe('busy');
    expect(err(s, { type: 'sell_succulent', pot: 1, at: T + total - 1 })).toBe('not_ready');
    expect(gardenReady(s, c, T + total)).toBe(true);

    const hearts = s.hearts;
    const r = ok(s, { type: 'sell_succulent', pot: 1, at: T + total });
    s = r.state;
    expect(s.wallet.buttons).toBe(before - rose.seedCost.buttons! + rose.sellPrice.buttons!);
    expect(s.garden.pots[1]).toBeNull();
    expect(s.garden.grown).toEqual([rose.id]);
    expect(s.hearts).toBe(hearts + garden.heartsPerNewSpecies);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'succulent_sold', firstTime: true }));

    // A second plant of the same species gives no new Hearts.
    s = ok(s, { type: 'plant_succulent', pot: 1, speciesId: rose.id, at: T }).state;
    const again = ok(s, { type: 'sell_succulent', pot: 1, at: T + total });
    expect(again.state.hearts).toBe(s.hearts);
    expect(again.state.garden.sold).toBe(2);
  });

  it('refuses unknown pots and species, and empty pots', () => {
    const s = home();
    expect(err(s, { type: 'plant_succulent', pot: 3, speciesId: rose.id, at: T })).toBe('unknown_pot');
    expect(err(s, { type: 'plant_succulent', pot: -1, speciesId: rose.id, at: T })).toBe('unknown_pot');
    expect(err(s, { type: 'plant_succulent', pot: 0, speciesId: 'cactus', at: T })).toBe('unknown_species');
    expect(err(s, { type: 'sell_succulent', pot: 0, at: T })).toBe('not_ready');
    expect(err(home(5, 10), { type: 'plant_succulent', pot: 0, speciesId: rose.id, at: T })).toBe('cannot_afford');
  });
});

describe('pots', () => {
  it('buys extra pots up to the maximum', () => {
    let s = home(5, 5000, 100);
    for (let i = garden.startPots; i < garden.maxPots; i++) s = ok(s, { type: 'buy_pot' }).state;
    expect(s.garden.pots).toHaveLength(garden.maxPots);
    expect(err(s, { type: 'buy_pot' })).toBe('already_done');
    expect(err(home(5, 5000, 0), { type: 'buy_pot' })).toBe('cannot_afford');
    expect(err(home(4), { type: 'buy_pot' })).toBe('locked');
  });
});

describe('saves', () => {
  it('keeps the garden through a save, and starts old saves with empty pots', () => {
    let s = home();
    s = ok(s, { type: 'buy_pot' }).state;
    s = ok(s, { type: 'plant_succulent', pot: 3, speciesId: 'ribbon_fall', at: T }).state;
    const back = deserialize(serialize(s), c);
    expect(back.garden).toEqual(s.garden);

    const old = JSON.parse(serialize(newGame(c))) as Record<string, unknown>;
    delete old.garden;
    old.version = 8;
    const upgraded = deserialize(JSON.stringify(old), c);
    expect(upgraded.version).toBe(SAVE_VERSION);
    expect(upgraded.garden).toEqual({ pots: [null, null, null], grown: [], sold: 0 });
  });

  it('drops plants of unknown species and clamps the pot count', () => {
    const raw = JSON.parse(serialize(home())) as { garden: unknown };
    raw.garden = { pots: [{ speciesId: 'nope', plantedAt: T }, { speciesId: 'stitchback', plantedAt: T }, null, null, null, null, null, null, null], grown: ['nope', 'stitchback', 'stitchback'], sold: 4 };
    const s = deserialize(JSON.stringify(raw), c);
    expect(s.garden.pots).toHaveLength(garden.maxPots);
    expect(s.garden.pots[0]).toBeNull();
    expect(s.garden.pots[1]).toEqual({ speciesId: 'stitchback', plantedAt: T });
    expect(s.garden.grown).toEqual(['stitchback']);
    expect(levelFor(s.hearts, c)).toBe(5);
  });
});
