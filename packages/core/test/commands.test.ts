import { describe, expect, it } from 'vitest';
import { content, LIVING_ROOM_ID } from '@nooklings/content';
import { applyCommand, newGame, type Command, type GameState } from '@nooklings/core';

const R = LIVING_ROOM_ID;
type Input = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
let n = 0;
const ok = (state: GameState, cmd: Input) => {
  const res = applyCommand(state, { ...cmd, id: `t${++n}` } as Command, content);
  if (!res.ok) throw new Error(`expected ok, got ${res.error}`);
  return res;
};
const total = (s: GameState, defId: string) =>
  (s.inventory[defId] ?? 0) + Object.values(s.rooms).flatMap((r) => r.placements).filter((p) => p.defId === defId).length;

describe('room commands', () => {
  it('places from inventory, removes empty stacks and never changes the owned total', () => {
    const start = newGame(content);
    const before = total(start, 'floor_lamp');
    const a = ok(start, { type: 'place', roomId: R, defId: 'floor_lamp', col: 8, row: 4 });
    expect('floor_lamp' in a.state.inventory).toBe(false);
    expect(total(a.state, 'floor_lamp')).toBe(before);
    expect(a.events[0]).toMatchObject({ type: 'placed' });
    expect(start.inventory.floor_lamp).toBe(1); // input state untouched
  });

  it('refuses to place more than is owned', () => {
    const s = ok(newGame(content), { type: 'place', roomId: R, defId: 'floor_lamp', col: 8, row: 4 }).state;
    expect(applyCommand(s, { id: 'x', type: 'place', roomId: R, defId: 'floor_lamp', col: 9, row: 4 }, content)).toEqual({ ok: false, error: 'not_in_inventory' });
  });

  it('a replayed command id applies once only', () => {
    const cmd: Command = { id: 'same', type: 'place', roomId: R, defId: 'floor_lamp', col: 8, row: 4 };
    const first = applyCommand(newGame(content), cmd, content);
    if (!first.ok) throw new Error();
    const second = applyCommand(first.state, cmd, content);
    expect(second).toMatchObject({ ok: true, duplicate: true, events: [] });
    if (second.ok) expect(second.state).toBe(first.state);
  });

  it('moves, flips and stores a placed item', () => {
    let s = ok(newGame(content), { type: 'place', roomId: R, defId: 'cozy_sofa', col: 7, row: 4 }).state;
    const uid = s.rooms[R]!.placements.find((p) => p.defId === 'cozy_sofa')!.uid;
    s = ok(s, { type: 'move', roomId: R, uid, col: 8, row: 5 }).state;
    expect(s.rooms[R]!.placements.find((p) => p.uid === uid)).toMatchObject({ col: 8, row: 5 });
    s = ok(s, { type: 'flip', roomId: R, uid }).state;
    expect(s.rooms[R]!.placements.find((p) => p.uid === uid)!.flipped).toBe(true);
    s = ok(s, { type: 'store', roomId: R, uid }).state;
    expect(s.rooms[R]!.placements.some((p) => p.uid === uid)).toBe(false);
    expect(s.inventory.cozy_sofa).toBe(1);
  });

  it('rejects invalid room commands', () => {
    const s = newGame(content);
    const bed = s.rooms[R]!.placements.find((p) => p.defId === 'cloud_bed')!;
    const win = s.rooms[R]!.placements.find((p) => p.defId === 'round_window')!;
    expect(applyCommand(s, { id: 'a', type: 'move', roomId: R, uid: bed.uid, col: 11, row: 0 }, content)).toEqual({ ok: false, error: 'out_of_bounds' });
    expect(applyCommand(s, { id: 'b', type: 'move', roomId: R, uid: 'nope', col: 1, row: 1 }, content)).toEqual({ ok: false, error: 'unknown_placement' });
    expect(applyCommand(s, { id: 'c', type: 'flip', roomId: R, uid: win.uid }, content)).toEqual({ ok: false, error: 'cannot_flip' });
    expect(applyCommand(s, { id: 'd', type: 'store', roomId: 'attic', uid: bed.uid }, content)).toEqual({ ok: false, error: 'unknown_room' });
  });
});
