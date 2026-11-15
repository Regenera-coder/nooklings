import { describe, expect, it } from 'vitest';
import { content, LIVING_ROOM_ID } from '@nooklings/content';
import { blockedGrid, findPath, reachableFrom, validatePlacement, type Placement } from '@nooklings/core';

const room = content.rooms[LIVING_ROOM_ID]!;
const at = (uid: string, defId: string, col: number, row: number): Placement => ({ uid, defId, col, row, flipped: false });

describe('validatePlacement', () => {
  it('accepts a free spot inside the room', () => {
    expect(validatePlacement(room, [], content, { defId: 'cozy_sofa', col: 3, row: 3 })).toEqual({ ok: true });
  });

  it('rejects out-of-bounds footprints', () => {
    expect(validatePlacement(room, [], content, { defId: 'cozy_sofa', col: 11, row: 3 })).toEqual({ ok: false, reason: 'out_of_bounds' });
    expect(validatePlacement(room, [], content, { defId: 'star_rug', col: 0, row: 5 })).toEqual({ ok: false, reason: 'out_of_bounds' });
    expect(validatePlacement(room, [], content, { defId: 'floor_lamp', col: -1, row: 0 })).toEqual({ ok: false, reason: 'out_of_bounds' });
  });

  it('rejects overlap on the same layer but lets furniture stand on a rug', () => {
    const placed = [at('a', 'cozy_sofa', 3, 3), at('r', 'star_rug', 6, 2)];
    expect(validatePlacement(room, placed, content, { defId: 'floor_lamp', col: 4, row: 3 })).toEqual({ ok: false, reason: 'overlap' });
    expect(validatePlacement(room, placed, content, { defId: 'floor_lamp', col: 6, row: 2 })).toEqual({ ok: true });
    expect(validatePlacement(room, placed, content, { defId: 'star_rug', col: 7, row: 3 })).toEqual({ ok: false, reason: 'overlap' });
  });

  it('ignores the item being moved when checking overlap', () => {
    const placed = [at('a', 'cozy_sofa', 3, 3)];
    expect(validatePlacement(room, placed, content, { defId: 'cozy_sofa', col: 4, row: 3 }, 'a')).toEqual({ ok: true });
  });

  it('keeps the doorway free', () => {
    expect(validatePlacement(room, [], content, { defId: 'floor_lamp', col: room.door.col, row: room.door.row })).toEqual({ ok: false, reason: 'blocks_door' });
    expect(validatePlacement(room, [], content, { defId: 'round_window', col: room.door.col - 1, row: 0 })).toEqual({ ok: false, reason: 'blocks_door' });
  });

  it('rejects a placement that seals off part of the floor', () => {
    // Wall off the top-left corner cell (0,0) with (1,0) then (0,1).
    const placed = [at('a', 'floor_lamp', 1, 0)];
    expect(validatePlacement(room, placed, content, { defId: 'side_table', col: 0, row: 1 })).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('rejects a placement that leaves furniture with no free neighbour', () => {
    // A lamp in the corner (0,0) boxed in by (1,0) and then (0,1).
    const placed = [at('a', 'floor_lamp', 0, 0), at('b', 'side_table', 1, 0)];
    expect(validatePlacement(room, placed, content, { defId: 'potted_fern', col: 0, row: 1 })).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('places wall items by slot and rejects wall overlap', () => {
    const placed = [at('w', 'round_window', 4, 0)];
    expect(validatePlacement(room, placed, content, { defId: 'picture_frame', col: 5, row: 0 })).toEqual({ ok: false, reason: 'overlap' });
    expect(validatePlacement(room, placed, content, { defId: 'picture_frame', col: 6, row: 0 })).toEqual({ ok: true });
    expect(validatePlacement(room, placed, content, { defId: 'picture_frame', col: 6, row: 2 })).toEqual({ ok: false, reason: 'out_of_bounds' });
  });
});

describe('pathfinding', () => {
  it('walks around furniture', () => {
    const blocked = blockedGrid(room, [at('a', 'bookshelf', 2, 2), at('b', 'bookshelf', 2, 3)], content);
    const path = findPath(blocked, { col: 1, row: 2 }, { col: 4, row: 2 });
    expect(path).not.toBeNull();
    expect(path!.at(-1)).toEqual({ col: 4, row: 2 });
    for (const step of path!) expect(blocked[step.row]![step.col]).toBe(false);
    expect(path!.length).toBe(5);
  });

  it('returns null for a blocked target and [] when already there', () => {
    const blocked = blockedGrid(room, [at('a', 'floor_lamp', 5, 5)], content);
    expect(findPath(blocked, { col: 0, row: 0 }, { col: 5, row: 5 })).toBeNull();
    expect(findPath(blocked, { col: 0, row: 0 }, { col: 0, row: 0 })).toEqual([]);
  });

  it('marks every free cell reachable in the starter room', () => {
    const placed = content.starter.placements[LIVING_ROOM_ID]!.map((p, i) => ({ ...p, uid: `s${i}` }));
    const blocked = blockedGrid(room, placed, content);
    const reach = reachableFrom(blocked, room.door);
    for (let r = 0; r < room.rows; r++) for (let c = 0; c < room.cols; c++) expect(reach[r]![c]).toBe(!blocked[r]![c]);
  });
});
