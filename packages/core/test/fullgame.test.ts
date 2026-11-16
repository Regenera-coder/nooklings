import { describe, expect, it } from 'vitest';
import { content } from '@nooklings/content';
import { levelFor, taskStates } from '@nooklings/core';
import { BINGE, CASUAL, playWholeGame } from './bot';

describe('whole game', () => {
  const run = playWholeGame(content);

  it('reaches Home Level 10 with all ten First Residents, without luck or money', () => {
    expect(levelFor(run.s.hearts, content)).toBe(10);
    expect(Object.keys(run.s.residents).sort()).toEqual(Object.keys(content.residents).sort());
    expect(taskStates(run.s, content).every((ts) => ts.status === 'claimed')).toBe(true);
    for (const v of Object.values(run.s.wallet)) expect(v).toBeGreaterThanOrEqual(0);
    expect(run.s.purchases.sort()).toEqual(['sunroom:open', 'yard:expand']);
  });

  it('lasts about a week for two short sittings a day', () => {
    const casual = playWholeGame(content, CASUAL);
    const day = (lv: number) => Math.floor(casual.levelAt[lv]! / 1440) + 1;
    // Printed so tuning changes are easy to see in test output.
    console.log('casual: level reached on day', Object.fromEntries(Object.keys(casual.levelAt).map((l) => [l, day(Number(l))])), 'finished on day', Math.ceil(casual.minutes / 1440));
    expect(levelFor(casual.s.hearts, content)).toBe(10);
    expect(Object.keys(casual.s.residents)).toHaveLength(10);
    for (let lv = 2; lv <= 10; lv++) expect(casual.levelAt[lv]).toBeGreaterThanOrEqual(casual.levelAt[lv - 1]!);
    // A full first day (parcels and the Sunroom open), then roughly a level a day.
    expect(day(3)).toBe(1);
    expect(day(5)).toBeGreaterThanOrEqual(2);
    expect(day(7)).toBeGreaterThanOrEqual(3);
    expect(day(10)).toBeGreaterThanOrEqual(6);
    expect(day(10)).toBeLessThanOrEqual(9);
  });

  it('cannot be rushed in one long sitting a day', () => {
    const binge = playWholeGame(content, BINGE);
    expect(levelFor(binge.s.hearts, content)).toBe(10);
    expect(binge.levelAt[10]! / 1440).toBeGreaterThanOrEqual(5);
    expect(binge.minutes / 1440).toBeLessThanOrEqual(14);
  });

  it('never houses more residents in a room than the cap', () => {
    const per: Record<string, number> = {};
    for (const r of Object.values(run.s.residents)) per[r.room] = (per[r.room] ?? 0) + 1;
    for (const v of Object.values(per)) expect(v).toBeLessThanOrEqual(content.rules.maxResidentsPerRoom);
  });
});

