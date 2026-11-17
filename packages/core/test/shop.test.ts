import { describe, expect, it } from 'vitest';
import { content as c } from '@nooklings/content';
import { applyCommand, newGame, seedKey, type Command, type GameState } from '@nooklings/core';

let n = 0;
type In = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
const run = (s: GameState, cmd: In) => applyCommand(s, { ...cmd, id: `s${++n}` } as Command, c);
const T = 1_800_000_000_000;

function home(level: number, buttons = 1000): GameState {
  const g = newGame(c);
  return { ...g, hearts: c.levels.find((l) => l.level === level)!.hearts, wallet: { ...g.wallet, buttons } };
}

describe('Shop: seed packets go into the seed bag', () => {
  const rose = c.garden!.species.meringue_rose!;
  const key = seedKey(rose.id, rose.colour, 'plain');

  it('charges the packet price once and adds one plain seed of the species colour', () => {
    const s = home(5);
    const r = run(s, { type: 'buy_seed', speciesId: rose.id });
    if (!r.ok) throw new Error(r.error);
    expect(r.state.wallet.buttons).toBe(1000 - (rose.seedCost.buttons ?? 0));
    expect(r.state.garden.seeds[key]).toBe(1);
    expect(r.events).toContainEqual({ type: 'seed_bought', speciesId: rose.id, seed: key });
    const r2 = run(r.state, { type: 'buy_seed', speciesId: rose.id });
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.state.garden.seeds[key]).toBe(2);
  });

  it('is planted for free from the bag', () => {
    const bought = run(home(5), { type: 'buy_seed', speciesId: rose.id });
    if (!bought.ok) throw new Error(bought.error);
    const before = bought.state.wallet.buttons;
    const planted = run(bought.state, { type: 'plant_seed', pot: 0, seed: key, at: T });
    if (!planted.ok) throw new Error(planted.error);
    expect(planted.state.wallet.buttons).toBe(before);
    expect(planted.state.garden.pots[0]).toMatchObject({ speciesId: rose.id, colour: rose.colour, pattern: 'plain' });
    expect(planted.state.garden.seeds[key]).toBeUndefined();
  });

  it('is refused before the garden opens, when short of Buttons, or for an unknown species', () => {
    expect(run(home(4), { type: 'buy_seed', speciesId: rose.id })).toMatchObject({ ok: false, error: 'locked' });
    expect(run(home(5, 0), { type: 'buy_seed', speciesId: rose.id })).toMatchObject({ ok: false, error: 'cannot_afford' });
    expect(run(home(5), { type: 'buy_seed', speciesId: 'nope' })).toMatchObject({ ok: false, error: 'unknown_species' });
  });
});
