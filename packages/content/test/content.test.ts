import { describe, expect, it } from 'vitest';
import { content } from '@nooklings/content';
import { newGame, validatePlacement, type Placement } from '@nooklings/core';

describe('content definitions', () => {
  it('uses only the allowed footprints', () => {
    const allowed = new Set(['1x1', '2x1', '1x2', '2x2']);
    for (const def of Object.values(content.furniture)) {
      expect(allowed.has(`${def.w}x${def.h}`), def.id).toBe(true);
      if (def.layer === 'wall') expect(def.h, def.id).toBe(1);
      for (const value of Object.values(def.tags)) expect(value).toBeGreaterThan(0);
    }
  });

  it('has doors inside their rooms', () => {
    for (const room of Object.values(content.rooms)) {
      expect(room.door.col).toBeGreaterThanOrEqual(0);
      expect(room.door.col).toBeLessThan(room.cols);
      expect(room.door.row).toBe(0);
    }
  });

  it('starter references exist and the starter layout is valid', () => {
    for (const id of Object.keys(content.starter.inventory)) expect(content.furniture[id], id).toBeDefined();
    for (const [roomId, list] of Object.entries(content.starter.placements)) {
      const room = content.rooms[roomId]!;
      const placed: Placement[] = [];
      list.forEach((p, i) => {
        expect(validatePlacement(room, placed, content, p), p.defId).toEqual({ ok: true });
        placed.push({ ...p, uid: `s${i}` });
      });
    }
    expect(Object.keys(newGame(content).rooms)).toEqual(Object.keys(content.rooms));
  });
});
