import { describe, expect, it } from 'vitest';
import { content, LIVING_ROOM_ID } from '@nooklings/content';
import { applyCommand, deserialize, newGame, SAVE_VERSION, SaveError, serialize } from '@nooklings/core';

const R = LIVING_ROOM_ID;

describe('save', () => {
  it('round-trips a played state exactly', () => {
    const res = applyCommand(newGame(content), { id: 'c1', type: 'place', roomId: R, defId: 'cozy_sofa', col: 7, row: 4 }, content);
    if (!res.ok) throw new Error(res.error);
    expect(deserialize(serialize(res.state), content)).toEqual(res.state);
  });

  it('migrates a version 0 save', () => {
    const legacy = { homeName: 'Old Nook', rooms: { [R]: { placements: [{ uid: 'f1', defId: 'cloud_bed', col: 2, row: 2, flipped: false }] } }, inventory: { floor_lamp: 1 }, nextUid: 2 };
    const state = deserialize(JSON.stringify(legacy), content);
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.appliedCommandIds).toEqual([]);
    expect(state.homeName).toBe('Old Nook');
    expect(state.rooms[R]!.placements).toHaveLength(1);
  });

  it('migrates a Milestone A (version 1) save and keeps the room', () => {
    const v1 = {
      version: 1, homeName: 'Little Cottage', nextUid: 4, appliedCommandIds: ['a'],
      inventory: { cozy_sofa: 1, workbench: 1 },
      rooms: { [R]: { placements: [
        { uid: 'f1', defId: 'cloud_bed', col: 1, row: 1, flipped: false },
        { uid: 'f2', defId: 'star_rug', col: 5, row: 2, flipped: false },
        { uid: 'f3', defId: 'round_window', col: 4, row: 0, flipped: false },
      ] } },
    };
    const state = deserialize(JSON.stringify(v1), content);
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.rooms[R]!.placements.map((p) => p.defId)).toEqual(['cloud_bed', 'star_rug', 'round_window']);
    expect(Object.keys(state.residents)).toEqual(['snug']);
    expect(state.wallet.buttons).toBe(content.starter.wallet.buttons);
    expect(state.hearts).toBe(0);
    expect(state.inventory).toEqual({ cozy_sofa: 1, workbench: 1 });
  });

  it('refuses saves from a newer build and broken JSON', () => {
    expect(() => deserialize(JSON.stringify({ version: SAVE_VERSION + 1 }), content)).toThrow(SaveError);
    expect(() => deserialize('{nope', content)).toThrow(SaveError);
  });

  it('drops unknown items and returns colliding ones to inventory', () => {
    const raw = {
      version: SAVE_VERSION,
      homeName: 'X',
      inventory: { ghost_item: 3, floor_lamp: 1 },
      nextUid: 1,
      appliedCommandIds: [],
      rooms: { [R]: { placements: [
        { uid: 'f1', defId: 'cozy_sofa', col: 3, row: 3, flipped: false },
        { uid: 'f2', defId: 'floor_lamp', col: 3, row: 3, flipped: false },
        { uid: 'f3', defId: 'ghost_item', col: 0, row: 0, flipped: false },
      ] } },
    };
    const state = deserialize(JSON.stringify(raw), content);
    expect(state.rooms[R]!.placements.map((p) => p.uid)).toEqual(['f1']);
    expect(state.inventory).toEqual({ floor_lamp: 2 });
    expect(state.nextUid).toBe(2);
  });

  it('drops unknown residents and clamps bad numbers', () => {
    const raw = JSON.parse(serialize(newGame(content)));
    raw.residents.ghost = { bondXp: 3, form: 'decorated', lastPlayAt: 0 };
    raw.wallet.buttons = -40;
    raw.hearts = 'lots';
    const state = deserialize(JSON.stringify(raw), content);
    expect(state.residents.ghost).toBeUndefined();
    expect(state.wallet.buttons).toBe(0);
    expect(state.hearts).toBe(0);
  });
});
