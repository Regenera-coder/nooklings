import { describe, expect, it } from 'vitest';
import { content, LIVING_ROOM_ID } from '@nooklings/content';
import { applyCommand, newGame, type GameState } from '@nooklings/core';

const R = LIVING_ROOM_ID;
const ok = (state: GameState, cmd: Parameters<typeof applyCommand>[1]) => {
  const res = applyCommand(state, cmd, content);
  if (!res.ok) throw new Error(`expected ok, got ${res.error}`);
  return res;
};
const total = (s: GameState, defId: string) =>
  (s.inventory[defId] ?? 0) + Object.values(s.rooms).flatMap((r) => r.placements).filter((p) => p.defId === defId).length;

describe('applyCommand', () => {
  it('places from inventory and never changes the owned total', () => {
    const start = newGame(content);
    const before = total(start, 'potted_fern');
    const a = ok(start, { id: 'c1', type: 'place', roomId: R, defId: 'potted_fern', col: 8, row: 4 });
    expect(a.state.inventory.potted_fern).toBe(1);
    const b = ok(a.state, { id: 'c1b', type: 'place', roomId: R, defId: 'potted_fern', col: 9, row: 4 });
    expect('potted_fern' in b.state.inventory).toBe(false);
    expect(total(a.state, 'potted_fern')).toBe(before);
    expect(a.events[0]).toMatchObject({ type: 'placed' });
    expect(start.inventory.potted_fern).toBe(2); // input state untouched
  });

  it('refuses to place more than is owned', () => {
    let s = newGame(content);
    s = ok(s, { id: 'c1', type: 'place', roomId: R, defId: 'floor_lamp', col: 8, row: 4 }).state;
    expect(applyCommand(s, { id: 'c2', type: 'place', roomId: R, defId: 'floor_lamp', col: 9, row: 4 }, content)).toEqual({ ok: false, error: 'not_in_inventory' });
  });

  it('a replayed command id applies once only', () => {
    const start = newGame(content);
    const cmd = { id: 'same', type: 'place', roomId: R, defId: 'potted_fern', col: 8, row: 4 } as const;
    const first = ok(start, cmd);
    const second = ok(first.state, cmd);
    expect(second.duplicate).toBe(true);
    expect(second.events).toEqual([]);
    expect(second.state).toBe(first.state);
    expect(second.state.inventory.potted_fern).toBe(1);
  });

  it('moves, flips and stores a placed item', () => {
    let s = newGame(content);
    const placed = ok(s, { id: 'c1', type: 'place', roomId: R, defId: 'cozy_sofa', col: 7, row: 4 });
    s = placed.state;
    const uid = s.rooms[R]!.placements.find((p) => p.defId === 'cozy_sofa')!.uid;
    s = ok(s, { id: 'c2', type: 'move', roomId: R, uid, col: 8, row: 5 }).state;
    expect(s.rooms[R]!.placements.find((p) => p.uid === uid)).toMatchObject({ col: 8, row: 5 });
    s = ok(s, { id: 'c3', type: 'flip', roomId: R, uid }).state;
    expect(s.rooms[R]!.placements.find((p) => p.uid === uid)!.flipped).toBe(true);
    s = ok(s, { id: 'c4', type: 'store', roomId: R, uid }).state;
    expect(s.rooms[R]!.placements.some((p) => p.uid === uid)).toBe(false);
    expect(s.inventory.cozy_sofa).toBe(1);
  });

  it('rejects invalid moves and leaves state alone', () => {
    const s = newGame(content);
    const bed = s.rooms[R]!.placements.find((p) => p.defId === 'cloud_bed')!;
    expect(applyCommand(s, { id: 'c1', type: 'move', roomId: R, uid: bed.uid, col: 11, row: 0 }, content)).toEqual({ ok: false, error: 'out_of_bounds' });
    expect(applyCommand(s, { id: 'c2', type: 'move', roomId: R, uid: 'nope', col: 1, row: 1 }, content)).toEqual({ ok: false, error: 'unknown_placement' });
    expect(applyCommand(s, { id: 'c3', type: 'flip', roomId: R, uid: s.rooms[R]!.placements.find((p) => p.defId === 'star_rug')!.uid }, content)).toEqual({ ok: false, error: 'cannot_flip' });
    expect(applyCommand(s, { id: 'c4', type: 'store', roomId: 'attic', uid: bed.uid }, content)).toEqual({ ok: false, error: 'unknown_room' });
  });
});
