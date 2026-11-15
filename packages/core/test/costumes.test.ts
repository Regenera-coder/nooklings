import { describe, expect, it } from 'vitest';
import { content } from '@nooklings/content';
import { applyCommand, DAY_MS, deserialize, newGame, serialize, type Command, type GameState } from '@nooklings/core';

type Input = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
let n = 0;
const run = (s: GameState, cmd: Input) => applyCommand(s, { ...cmd, id: `k${++n}` } as Command, content);
const ok = (s: GameState, cmd: Input) => { const r = run(s, cmd); if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`); return r.state; };
const err = (s: GameState, cmd: Input) => { const r = run(s, cmd); return r.ok ? 'ok' : r.error; };
const withMopey = (): GameState => {
  const g = newGame(content);
  return { ...g, hearts: 100, residents: { ...g.residents, mopey: { bondXp: 0, form: 'original', lastPlayAt: 0, room: 'living_room', costume: null } }, residentOrder: [...g.residentOrder, 'mopey'] };
};

describe('Ribbons', () => {
  it('come from playing, up to five a day, and reset the next day', () => {
    let s = newGame(content);
    const day = 20_000 * DAY_MS;
    for (let i = 0; i < 7; i++) s = ok(s, { type: 'play', residentId: 'snug', at: day + i * 60_000 });
    expect(s.wallet.ribbons).toBe(5);
    s = ok(s, { type: 'play', residentId: 'snug', at: day + DAY_MS + 1 });
    expect(s.wallet.ribbons).toBe(6);
  });

  it('come from Button Catch by score, three games a day, capped', () => {
    let s = newGame(content);
    const at = 30_000 * DAY_MS;
    s = ok(s, { type: 'play_minigame', score: 34, at });
    expect(s.wallet.ribbons).toBe(3);
    s = ok(s, { type: 'play_minigame', score: 9999, at: at + 1 });
    expect(s.wallet.ribbons).toBe(8);
    s = ok(s, { type: 'play_minigame', score: 0, at: at + 2 });
    expect(err(s, { type: 'play_minigame', score: 50, at: at + 3 })).toBe('daily_limit');
    expect(ok(s, { type: 'play_minigame', score: 50, at: at + DAY_MS }).wallet.ribbons).toBe(13);
  });
});

describe('costumes', () => {
  it('are bought once with Ribbons, then worn and taken off', () => {
    let s = withMopey();
    expect(err(s, { type: 'buy_costume', costumeId: 'mopey_umbrella' })).toBe('cannot_afford');
    s = { ...s, wallet: { ...s.wallet, ribbons: 20 } };
    expect(err(s, { type: 'wear_costume', residentId: 'mopey', costumeId: 'mopey_umbrella' })).toBe('not_owned');
    s = ok(s, { type: 'buy_costume', costumeId: 'mopey_umbrella' });
    expect(s.wallet.ribbons).toBe(8);
    expect(err(s, { type: 'buy_costume', costumeId: 'mopey_umbrella' })).toBe('already_done');
    s = ok(s, { type: 'wear_costume', residentId: 'mopey', costumeId: 'mopey_umbrella' });
    expect(s.residents.mopey!.costume).toBe('mopey_umbrella');
    expect(err(s, { type: 'wear_costume', residentId: 'snug', costumeId: 'mopey_umbrella' })).toBe('unknown_costume');
    const back = deserialize(serialize(s), content);
    expect(back.residents.mopey!.costume).toBe('mopey_umbrella');
    s = ok(s, { type: 'wear_costume', residentId: 'mopey', costumeId: null });
    expect(s.residents.mopey!.costume).toBeNull();
  });

  it('keeps hidden costumes (wings, pending decision) out of the shop', () => {
    const s = { ...newGame(content), hearts: 300, wallet: { ...newGame(content).wallet, ribbons: 99 } };
    expect(err(s, { type: 'buy_costume', costumeId: 'mischi_wings' })).toBe('unknown_costume');
  });
});
