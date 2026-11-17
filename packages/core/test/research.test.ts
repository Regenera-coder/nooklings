import { describe, expect, it } from 'vitest';
import { content as c } from '@nooklings/content';
import {
  applyCommand,
  deserialize,
  newGame,
  nextStudyLevel,
  plantStatus,
  researchSpeed,
  serialize,
  succulentGrowth,
  type Command,
  type GameState,
} from '@nooklings/core';

let n = 0;
type In = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
const run = (s: GameState, cmd: In) => applyCommand(s, { ...cmd, id: `r${++n}` } as Command, c);
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
const r = c.research!;
const rich = (): GameState => {
  const s = newGame(c);
  return { ...s, wallet: { ...s.wallet, buttons: 10_000, wood: 100 } };
};
const study = (s: GameState, id: string, levels: number): GameState => ({ ...s, research: { levels: { ...s.research.levels, [id]: levels }, active: null } });

describe('Research', () => {
  it('is open from the start, one study at a time, and pays its cost', () => {
    let s = rich();
    const first = r.studies.green_thumb!.levels[0]!;
    s = ok(s, { type: 'start_research', studyId: 'green_thumb', at: T }).state;
    expect(s.wallet.buttons).toBe(10_000 - first.cost.buttons!);
    expect(s.research.active).toEqual({ studyId: 'green_thumb', level: 1, startAt: T, endAt: T + first.ms });
    expect(err(s, { type: 'start_research', studyId: 'quick_paws', at: T })).toBe('busy');
    expect(err(s, { type: 'finish_research', at: T + first.ms - 1 })).toBe('not_ready');
    s = ok(s, { type: 'finish_research', at: T + first.ms }).state;
    expect(s.research).toEqual({ levels: { green_thumb: 1 }, active: null });
    expect(nextStudyLevel(s, c, 'green_thumb')!.level).toBe(2);
    expect(err({ ...newGame(c), wallet: { ...newGame(c).wallet, buttons: 0 } }, { type: 'start_research', studyId: 'green_thumb', at: T })).toBe('cannot_afford');
  });

  it('stops at the last level', () => {
    const s = study(rich(), 'keen_eye', r.studies.keen_eye!.levels.length);
    expect(nextStudyLevel(s, c, 'keen_eye')).toBeNull();
    expect(err(s, { type: 'start_research', studyId: 'keen_eye', at: T })).toBe('already_done');
  });

  it('each level makes its timer 10% shorter', () => {
    const s = study(study(rich(), 'green_thumb', 2), 'busy_bees', 3);
    const sp = researchSpeed(s, c);
    expect(sp.grow).toBeCloseTo(0.8);
    expect(sp.flower).toBeCloseTo(0.7);
    expect(sp.trips).toBe(1);
    const def = c.garden!.species.meringue_rose!;
    const full = (def.sproutMs + def.growMs) * 0.8;
    expect(succulentGrowth(c, def.id, T, T + full, sp.grow)!.stage).toBe('grown');
    expect(succulentGrowth(c, def.id, T, T + full - 1, sp.grow)!.stage).not.toBe('grown');
    const plant = { speciesId: def.id, colour: def.colour, pattern: 'plain', plantedAt: T, pod: null, offsetTakenAt: null };
    expect(plantStatus(c, plant, T + full + c.garden!.bloomMs * 0.7, [], sp)!.blooming).toBe(true);
  });

  it('shortens gathering, trips and seed pods started after it is learned', () => {
    let s = study(study(rich(), 'bountiful_spots', 1), 'quick_paws', 3);
    s = { ...s, hearts: 90 };
    const spot = Object.values(c.gatherSpots).find((x) => !x.requiresUnlock)!;
    const g = ok(s, { type: 'gather', spotId: spot.id, at: T }).state;
    expect(g.gatherReadyAt[spot.id]).toBe(T + Math.round(spot.cooldownMs * 0.9));
    const route = Object.values(c.expeditions)[0]!;
    const e = run(s, { type: 'start_expedition', routeId: route.id, residentId: 'snug', at: T } as In);
    if (e.ok) expect(e.state.expeditions[0]!.endAt).toBe(T + Math.round(route.durationMs * 0.7));
  });

  it('keeps research through a save and starts old saves with none', () => {
    let s = rich();
    s = ok(s, { type: 'start_research', studyId: 'quick_paws', at: T }).state;
    s = { ...s, research: { ...s.research, levels: { green_thumb: 2 } } };
    expect(deserialize(serialize(s), c).research).toEqual(s.research);
    const old = JSON.parse(serialize(newGame(c))) as Record<string, unknown>;
    delete old.research;
    old.version = 11;
    expect(deserialize(JSON.stringify(old), c).research).toEqual({ levels: {}, active: null });
  });
});
