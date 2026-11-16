import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { content } from '@nooklings/content';
import { applyCommand, DAY_MS, deserialize, newGame, playsLeftToday, serialize, visibleCostumes, type Command, type GameState } from '@nooklings/core';

type Input = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
let n = 0;
const run = (s: GameState, cmd: Input) => applyCommand(s, { ...cmd, id: `k${++n}` } as Command, content);
const ok = (s: GameState, cmd: Input) => { const r = run(s, cmd); if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`); return r.state; };
const err = (s: GameState, cmd: Input) => { const r = run(s, cmd); return r.ok ? 'ok' : r.error; };
const withMopey = (): GameState => {
  const g = newGame(content);
  return { ...g, hearts: content.levels[5]!.hearts, residents: { ...g.residents, mopey: { bondXp: 0, form: 'original', lastPlayAt: 0, playsToday: 0, room: 'living_room', costume: null } }, residentOrder: [...g.residentOrder, 'mopey'] };
};

describe('Ribbons', () => {
  it('come from playing, up to five a day, and reset the next day', () => {
    let s = withMopey();
    const day = 20_000 * DAY_MS;
    // Three plays each with two residents: six plays, five Ribbons.
    for (let i = 0; i < 3; i++) for (const residentId of ['snug', 'mopey']) s = ok(s, { type: 'play', residentId, at: day + i * 60_000 });
    expect(s.wallet.ribbons).toBe(5);
    s = ok(s, { type: 'play', residentId: 'snug', at: day + DAY_MS + 1 });
    expect(s.wallet.ribbons).toBe(6);
  });

});

describe('playing', () => {
  it('counts three plays per resident per day, each resident separately, and resets the next day', () => {
    let s = withMopey();
    const day = 20_000 * DAY_MS;
    expect(playsLeftToday(s, content, 'snug', day)).toBe(3);
    for (let i = 0; i < 3; i++) s = ok(s, { type: 'play', residentId: 'snug', at: day + i * 60_000 });
    expect(playsLeftToday(s, content, 'snug', day + 200_000)).toBe(0);
    expect(err(s, { type: 'play', residentId: 'snug', at: day + 200_000 })).toBe('daily_limit');
    expect(err(s, { type: 'play', residentId: 'mopey', at: day + 200_000 })).toBe('ok');
    expect(s.residents.snug!.bondXp).toBe(3);
    expect(playsLeftToday(s, content, 'snug', day + DAY_MS)).toBe(3);
    s = ok(s, { type: 'play', residentId: 'snug', at: day + DAY_MS });
    expect(s.residents.snug!.playsToday).toBe(1);
  });

  it('resets at local midnight when the device supplies its time zone', () => {
    // Singapore is UTC+8: local midnight is 16:00 UTC.
    const sg = { ...content, rules: { ...content.rules, dayOffsetMs: 8 * 3_600_000 } };
    const localMidnight = 20_000 * DAY_MS - 8 * 3_600_000;
    let s = withMopey();
    for (let i = 0; i < 3; i++) {
      const r = applyCommand(s, { id: `sg${i}`, type: 'play', residentId: 'snug', at: localMidnight - 3_600_000 + i * 60_000 }, sg);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    }
    expect(playsLeftToday(s, sg, 'snug', localMidnight - 1)).toBe(0);
    expect(playsLeftToday(s, sg, 'snug', localMidnight)).toBe(3);
    // In UTC days the same moments fall on one day, so nothing would have reset.
    expect(playsLeftToday(s, content, 'snug', localMidnight)).toBe(0);
  });

  it('loads an older save with no plays counted today and clamps a tampered count', () => {
    const raw = JSON.parse(serialize(withMopey()));
    raw.version = 6;
    delete raw.residents.snug.playsToday;
    raw.residents.mopey.playsToday = 99;
    const back = deserialize(JSON.stringify(raw), content);
    expect(back.residents.snug!.playsToday).toBe(0);
    expect(back.residents.mopey!.playsToday).toBe(content.bond.playsPerDay);
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

  it('sells Mischi her wings as a costume once she lives with you', () => {
    const g = newGame(content);
    let s: GameState = { ...g, hearts: content.levels[2]!.hearts, wallet: { ...g.wallet, ribbons: 20 } };
    expect(err(s, { type: 'buy_costume', costumeId: 'mischi_wings' })).toBe('not_owned');
    s = { ...s, residents: { ...s.residents, mischi: { bondXp: 0, form: 'original', lastPlayAt: 0, playsToday: 0, room: 'living_room', costume: null } }, residentOrder: [...s.residentOrder, 'mischi'] };
    s = ok(s, { type: 'buy_costume', costumeId: 'mischi_wings' });
    s = ok(s, { type: 'wear_costume', residentId: 'mischi', costumeId: 'mischi_wings' });
    expect(s.residents.mischi!.costume).toBe('mischi_wings');
  });
});

describe('costume release (Art Brief 10)', () => {
  it('has the ten new costumes with the approved prices, one per resident', () => {
    const prices: Record<string, number> = {
      snug_cape: 12, tinker_apron: 12, bloomi_bonnet: 12, mischi_party: 15, glim_comet: 15,
      mopey_boots: 15, pippo_pack: 18, hush_cloak: 18, patcha_quilt: 20, luma_crown: 20,
    };
    for (const [id, ribbons] of Object.entries(prices)) {
      const c = content.costumes[id]!;
      expect(c, id).toBeDefined();
      expect(c.cost).toEqual({ ribbons });
      expect(id.startsWith(c.residentId + '_')).toBe(true);
      expect(c.requiresLevel).toBe(content.residents[c.residentId]!.joinLevel);
    }
    expect(new Set(Object.keys(prices).map((id) => content.costumes[id]!.residentId)).size).toBe(10);
  });

  it('keeps a hidden costume out of the Wardrobe and unbuyable', () => {
    // Every costume is released today, so hide one here to keep the rule covered.
    const base = content.costumes.luma_crown!;
    const hiding = { ...content, costumes: { ...content.costumes, [base.id]: { ...base, hidden: true } } };
    const g = newGame(content);
    const s: GameState = {
      ...g, hearts: content.levels[9]!.hearts, wallet: { ...g.wallet, ribbons: 99 },
      residents: { ...g.residents, [base.residentId]: { bondXp: 0, form: 'original', lastPlayAt: 0, playsToday: 0, room: 'living_room', costume: null } },
    };
    const hidden = applyCommand(s, { id: 'h1', type: 'buy_costume', costumeId: base.id }, hiding);
    expect(hidden.ok).toBe(false);
    if (!hidden.ok) expect(hidden.error).toBe('unknown_costume');
    expect(visibleCostumes(hiding, base.residentId).some((c) => c.id === base.id)).toBe(false);
    // Released, the same costume can be bought.
    expect(applyCommand(s, { id: 'h2', type: 'buy_costume', costumeId: base.id }, content).ok).toBe(true);
    expect(Object.values(content.costumes).some((c) => c.hidden)).toBe(false);
  });

  it('only shows costumes whose five poses are in the game art', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../../apps/client/public/assets/manifest.json', import.meta.url), 'utf8'));
    const have = new Set<string>(Array.isArray(manifest) ? manifest : Object.keys(manifest.images ?? manifest));
    for (const c of Object.values(content.costumes)) {
      if (c.hidden) continue;
      const word = c.id.slice(c.residentId.length + 1);
      for (const pose of ['idle', 'walk', 'walk2', 'sit', 'sleep']) expect(have.has(`char_${c.residentId}_costume_${word}_${pose}`), `${c.id} ${pose}`).toBe(true);
    }
  });
});
