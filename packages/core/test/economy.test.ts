import { describe, expect, it } from 'vitest';
import { content as c } from '@nooklings/content';
import { applyCommand, dailyGiftAmount, deserialize, newGame, serialize, type Command, type GameState } from '@nooklings/core';

let n = 0;
type In = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
const run = (s: GameState, cmd: In) => applyCommand(s, { ...cmd, id: `e${++n}` } as Command, c);
const T = 1_800_000_000_000;
const DAY = 86_400_000;

describe('daily gift', () => {
  it('gives Buttons once a day, more at higher Home Levels', () => {
    let s = newGame(c);
    const r = run(s, { type: 'claim_daily_gift', at: T });
    if (!r.ok) throw new Error(r.error);
    expect(r.state.wallet.buttons).toBe(s.wallet.buttons + c.dailyGift!.buttons + c.dailyGift!.buttonsPerLevel);
    s = r.state;
    const again = run(s, { type: 'claim_daily_gift', at: T + 1000 });
    expect(again.ok ? null : again.error).toBe('daily_limit');
    expect(run(s, { type: 'claim_daily_gift', at: T + DAY }).ok).toBe(true);
    expect(dailyGiftAmount({ ...s, hearts: 90 }, c)).toBe(c.dailyGift!.buttons + 5 * c.dailyGift!.buttonsPerLevel);
    expect(s.hearts).toBe(newGame(c).hearts + c.dailyGift!.hearts);
    expect(deserialize(serialize(s), c).dailyGiftDay).toBe(s.dailyGiftDay);
  });
});

describe('Arcade Buttons', () => {
  it('pays Buttons for the score, up to the daily limit', () => {
    let s: GameState = { ...newGame(c), hearts: 200 };
    const games = c.arcade.order.filter((id) => c.arcadeGames[id]!.unlockLevel <= 6);
    let total = 0;
    for (const id of games)
      for (let i = 0; i < c.arcade.playsPerDay; i++) {
        const score = c.arcadeGames[id]!.maxScore;
        const r = run(s, { type: 'play_arcade', gameId: id, score, at: T } as In);
        if (!r.ok) continue;
        const ev = r.events.find((e) => e.type === 'arcade_done') as { buttons: number };
        total += ev.buttons;
        if (total < c.arcade.maxButtonsPerDay) expect(ev.buttons).toBe(Math.min(Math.floor(score * c.arcade.buttonsPerPoint), c.arcade.maxButtonsPerDay - (total - ev.buttons)));
        s = r.state;
      }
    expect(total).toBe(c.arcade.maxButtonsPerDay);
    expect(s.arcade.buttons).toBe(c.arcade.maxButtonsPerDay);
  });
});

describe('garden prices', () => {
  it('each succulent sells for at least twice its seed cost', () => {
    for (const def of Object.values(c.garden!.species)) expect(def.sellPrice.buttons!).toBeGreaterThanOrEqual(2 * def.seedCost.buttons!);
  });
});
