import { describe, expect, it } from 'vitest';
import { content as c } from '@nooklings/content';
import { newGame, readySummary, type GameState } from '@nooklings/core';

const T = 1_800_000_000_000;
const H = 3_600_000;

function home(level: number): GameState {
  const g = newGame(c);
  return { ...g, hearts: c.levels.find((l) => l.level === level)!.hearts };
}

describe('Ready summary', () => {
  it('lists gathering spots that are ready, and leaves out ones still resting', () => {
    const s = home(1);
    const ready = readySummary(s, c, T);
    const spots = Object.keys(c.gatherSpots).filter((id) => !c.gatherSpots[id]!.requiresUnlock);
    expect(ready.find((r) => r.kind === 'gather')?.count).toBe(spots.length);
    const resting = { ...s, gatherReadyAt: Object.fromEntries(spots.map((id) => [id, T + H])) };
    expect(readySummary(resting, c, T).find((r) => r.kind === 'gather')).toBeUndefined();
  });

  it('shows a finished trip, study and batch, but not ones still running', () => {
    const s = home(8);
    const busy: GameState = {
      ...s,
      expedition: { routeId: Object.keys(c.expeditions)[0]!, residentId: 'snug', startAt: T - H, endAt: T + H },
      research: { ...s.research, active: { studyId: 'quick_paws', level: 1, startAt: T - H, endAt: T + H } },
    };
    const kinds = (st: GameState, at: number) => readySummary(st, c, at).map((r) => r.kind);
    expect(kinds(busy, T)).not.toContain('trip');
    expect(kinds(busy, T)).not.toContain('research');
    expect(kinds(busy, T + 2 * H)).toEqual(expect.arrayContaining(['trip', 'research']));
  });

  it('counts grown plants in the garden once it is open', () => {
    const s = home(5);
    const rose = c.garden!.species.meringue_rose!;
    const grown: GameState = {
      ...s,
      garden: { ...s.garden, pots: [{ speciesId: rose.id, colour: rose.colour, pattern: 'plain', plantedAt: T - 20 * H, pod: null, offsetTakenAt: T }, null, null] },
    };
    expect(readySummary(grown, c, T).find((r) => r.kind === 'garden')?.count).toBe(1);
  });

});
