import { describe, expect, it } from 'vitest';
import { content as c } from '@nooklings/content';
import {
  applyCommand,
  deserialize,
  newGame,
  nextGardenGoal,
  parseSeedKey,
  plantStatus,
  seedKey,
  serialize,
  succulentName,
  succulentSellPrice,
  type Command,
  type GameState,
  type PottedSucculent,
} from '@nooklings/core';

let n = 0;
type In = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
const run = (s: GameState, cmd: In) => applyCommand(s, { ...cmd, id: `q${++n}` } as Command, c);
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
const g = c.garden!;
const full = (id: string) => g.species[id]!.sproutMs + g.species[id]!.growMs;
const plant = (speciesId: string, colour: string, plantedAt: number, pattern = 'plain'): PottedSucculent => ({ speciesId, colour, pattern, plantedAt, pod: null, offsetTakenAt: null });

function home(): GameState {
  const s = newGame(c);
  return { ...s, hearts: 90, wallet: { ...s.wallet, buttons: 5000, wood: 100 } };
}

describe('patterns', () => {
  it('keys, names and prices carry the pattern', () => {
    expect(seedKey('stitchback', 'plum')).toBe('stitchback:plum');
    expect(seedKey('stitchback', 'plum', 'zebra')).toBe('stitchback:plum:zebra');
    expect(parseSeedKey(c, 'stitchback:plum:zebra')).toEqual({ speciesId: 'stitchback', colour: 'plum', pattern: 'zebra' });
    expect(parseSeedKey(c, 'stitchback:plum:plain')).toBeNull();
    expect(parseSeedKey(c, 'stitchback:plum:spots')).toBeNull();
    expect(succulentName(c, 'stitchback', 'plum', 'zebra')).toBe('Zebra Plum Stitchback');
    expect(succulentName(c, 'stitchback', 'apricot')).toBe('Apricot Stitchback');
    const base = g.species.stitchback!.sellPrice.buttons!;
    expect(succulentSellPrice(c, plant('stitchback', 'apricot', T, 'tipped')).buttons).toBe(Math.round(base * g.patternSellBonus));
    expect(succulentSellPrice(c, plant('stitchback', 'plum', T, 'tipped')).buttons).toBe(Math.round(base * g.patternSellBonus * g.newColourSellBonus));
  });

  it('a patterned parent passes its pattern on about half the time', () => {
    let patterned = 0;
    let seeds = 0;
    for (let i = 0; i < 200; i++) {
      const start = T - full('ribbon_fall') - g.bloomMs;
      let s: GameState = { ...home(), rngState: 77 + i * 104729 };
      s = { ...s, garden: { ...s.garden, pots: [plant('meringue_rose', 'blueberry', start, 'zebra'), plant('ribbon_fall', 'plum', start), null] } };
      s = ok(s, { type: 'pollinate', pot: 1, fromPot: 0, at: T }).state;
      const ev = ok(s, { type: 'collect_pod', pot: 1, at: T + g.podMs }).events.find((e) => e.type === 'pod_collected') as { seeds: string[] };
      for (const k of ev.seeds) {
        seeds++;
        if (k.endsWith(':zebra')) patterned++;
      }
    }
    expect(patterned / seeds).toBeGreaterThan(0.4);
    expect(patterned / seeds).toBeLessThan(0.6);
  });

  it('a grown patterned plant is recorded once', () => {
    let s = home();
    s = { ...s, garden: { ...s.garden, pots: [plant('teacup_tree', 'taro', T - full('teacup_tree'), 'red_border'), null, null] } };
    const r = ok(s, { type: 'tend_garden', at: T });
    expect(r.state.garden.patternsFound).toEqual(['red_border']);
    expect(r.state.garden.discovered).toEqual(['teacup_tree:taro']);
  });
});

describe('tools', () => {
  it('buys each tool once', () => {
    let s = home();
    s = ok(s, { type: 'buy_garden_tool', toolId: 'loupe' }).state;
    expect(s.garden.tools).toEqual(['loupe']);
    expect(s.wallet.buttons).toBe(5000 - g.tools.loupe.cost.buttons!);
    expect(err(s, { type: 'buy_garden_tool', toolId: 'loupe' })).toBe('already_done');
    expect(err({ ...home(), hearts: 0 }, { type: 'buy_garden_tool', toolId: 'sun_shelf' })).toBe('locked');
  });

  it('Sun Shelf: flowers sooner', () => {
    const p = plant('meringue_rose', 'blueberry', T);
    const at = T + full('meringue_rose') + g.bloomMs * g.sunBloomFactor;
    expect(plantStatus(c, p, at)!.blooming).toBe(false);
    expect(plantStatus(c, p, at, ['sun_shelf'])!.blooming).toBe(true);
  });

  it('Pollen Jar: one more seed per pod', () => {
    const start = T - full('ribbon_fall') - g.bloomMs;
    let s = home();
    s = { ...s, garden: { ...s.garden, tools: ['pollen_jar'], pots: [plant('meringue_rose', 'blueberry', start), plant('ribbon_fall', 'plum', start), null] } };
    s = ok(s, { type: 'pollinate', pot: 0, fromPot: 1, at: T }).state;
    const ev = ok(s, { type: 'collect_pod', pot: 0, at: T + g.podMs }).events.find((e) => e.type === 'pod_collected') as { seeds: string[] };
    expect(ev.seeds).toHaveLength(g.seedsPerPod + g.pollenJarSeeds);
  });
});

describe('gifts and goals', () => {
  it('gives a grown plant to a resident once a day, for bond', () => {
    let s = home();
    s = { ...s, garden: { ...s.garden, pots: [plant('gumdrop_cluster', 'taro', T - full('gumdrop_cluster')), plant('stitchback', 'apricot', T - full('stitchback')), null] } };
    const bond = s.residents.snug!.bondXp;
    const r = ok(s, { type: 'give_succulent', pot: 0, residentId: 'snug', at: T });
    s = r.state;
    expect(s.garden.pots[0]).toBeNull();
    expect(s.garden.gifts).toBe(1);
    expect(s.residents.snug!.bondXp).toBe(bond + g.giftBondXp);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'succulent_given', name: 'Taro Gumdrop Cluster' }));
    expect(err(s, { type: 'give_succulent', pot: 1, residentId: 'snug', at: T })).toBe('daily_limit');
    expect(err(s, { type: 'give_succulent', pot: 1, residentId: 'mopey', at: T })).toBe('not_owned');
    expect(err(s, { type: 'give_succulent', pot: 0, residentId: 'snug', at: T + 86_400_000 })).toBe('not_ready');
  });

  it('goals go one at a time and pay once', () => {
    let s = home();
    expect(nextGardenGoal(s, c)).toMatchObject({ def: { id: 'g_first_sale' }, done: false });
    expect(err(s, { type: 'claim_garden_goal', goalId: 'g_first_sale' })).toBe('not_ready');
    expect(err(s, { type: 'claim_garden_goal', goalId: 'g_first_pod' })).toBe('unknown_task');
    s = { ...s, garden: { ...s.garden, sold: 1 } };
    const before = s.wallet.buttons;
    s = ok(s, { type: 'claim_garden_goal', goalId: 'g_first_sale' }).state;
    expect(s.wallet.buttons).toBe(before + 60);
    expect(nextGardenGoal(s, c)!.def.id).toBe('g_first_pod');
    expect(err(s, { type: 'claim_garden_goal', goalId: 'g_first_sale' })).toBe('unknown_task');
  });

  it('keeps tools, patterns, gifts and goals through a save', () => {
    let s = home();
    s = { ...s, garden: { ...s.garden, tools: ['sun_shelf'], patternsFound: ['zebra'], gifts: 2, podsCollected: 3, goalsClaimed: ['g_first_sale'], seeds: { 'stitchback:plum:zebra': 1 }, pots: [plant('stitchback', 'plum', T, 'zebra'), null, null] } };
    expect(deserialize(serialize(s), c).garden).toEqual(s.garden);
  });
});

describe('on show at home (Phase 4)', () => {
  it('every shape, colour and pattern has a furniture definition; Ribbon Fall hangs', () => {
    const defs = Object.values(c.furniture).filter((f) => f.succulent);
    expect(defs).toHaveLength(g.order.length * g.colourOrder.length * g.patternOrder.length);
    expect(c.furniture.succ_ribbon_fall_plum!.layer).toBe('ceiling');
    expect(c.furniture.succ_stitchback_plum_zebra).toMatchObject({ name: 'Zebra Plum Stitchback', layer: 'floor', succulent: { speciesId: 'stitchback', colour: 'plum', pattern: 'zebra' } });
  });

  it('moves a grown plant from its pot into storage, ready to place', () => {
    let s = home();
    s = { ...s, garden: { ...s.garden, pots: [plant('teacup_tree', 'plum', T - full('teacup_tree'), 'tipped'), plant('stitchback', 'plum', T), null] } };
    expect(err(s, { type: 'display_succulent', pot: 1, at: T })).toBe('not_ready');
    const r = ok(s, { type: 'display_succulent', pot: 0, at: T });
    expect(r.state.garden.pots[0]).toBeNull();
    expect(r.state.inventory.succ_teacup_tree_plum_tipped).toBe(1);
    expect(r.state.garden.discovered).toContain('teacup_tree:plum');
    const placed = ok(r.state, { type: 'place', roomId: 'living_room', defId: 'succ_teacup_tree_plum_tipped', col: 6, row: 2 }).state;
    expect(placed.rooms.living_room!.placements.some((p) => p.defId === 'succ_teacup_tree_plum_tipped')).toBe(true);
    expect(deserialize(serialize(placed), c).rooms.living_room).toEqual(placed.rooms.living_room);
  });
});
