import { describe, expect, it } from 'vitest';
import { content, LIVING_ROOM_ID, SUNROOM_ID, YARD_ID } from '@nooklings/content';
import { applyCommand, deserialize, effectiveRoom, newGame, serialize, type Command, type GameState } from '@nooklings/core';

type Input = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
let n = 0;
const apply = (s: GameState, cmd: Input) => applyCommand(s, { ...cmd, id: `c${++n}` } as Command, content);
const ok = (s: GameState, cmd: Input) => {
  const r = apply(s, cmd);
  if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
};
const err = (s: GameState, cmd: Input) => {
  const r = apply(s, cmd);
  return r.ok ? 'ok' : r.error;
};
const rich = (level: number): GameState => {
  const g = newGame(content);
  const hearts = [0, 0, 10, 25, 45, 70, 100, 130, 165, 200, 240][level]!;
  return { ...g, hearts, wallet: { ...g.wallet, buttons: 5000, wood: 500, fabric: 500, keepsakes: 50 } };
};

describe('rooms', () => {
  it('keeps the Sunroom shut until Level 3 and the purchase', () => {
    let s = rich(2);
    expect(err(s, { type: 'place', roomId: SUNROOM_ID, defId: 'floor_lamp', col: 3, row: 2 })).toBe('locked');
    expect(err(s, { type: 'buy_room', roomId: SUNROOM_ID, kind: 'open' })).toBe('locked');
    s = rich(3);
    expect(err({ ...s, wallet: { ...s.wallet, buttons: 10 } }, { type: 'buy_room', roomId: SUNROOM_ID, kind: 'open' })).toBe('cannot_afford');
    s = ok(s, { type: 'buy_room', roomId: SUNROOM_ID, kind: 'open' });
    expect(s.wallet.buttons).toBe(4700);
    expect(err(s, { type: 'buy_room', roomId: SUNROOM_ID, kind: 'open' })).toBe('already_done');
    ok(s, { type: 'place', roomId: SUNROOM_ID, defId: 'floor_lamp', col: 3, row: 2 });
  });

  it('limits the Yard to its first columns until expanded, and has no wall', () => {
    let s = rich(5);
    expect(effectiveRoom(s, content, YARD_ID)!.cols).toBe(8);
    expect(err(s, { type: 'place', roomId: YARD_ID, defId: 'floor_lamp', col: 10, row: 2 })).not.toBe('ok');
    expect(err(s, { type: 'place', roomId: YARD_ID, defId: 'picture_frame', col: 3, row: 0 })).not.toBe('ok');
    s = ok(s, { type: 'buy_room', roomId: YARD_ID, kind: 'expand' });
    expect(effectiveRoom(s, content, YARD_ID)!.cols).toBe(14);
    ok(s, { type: 'place', roomId: YARD_ID, defId: 'floor_lamp', col: 10, row: 2 });
  });
});

describe('gathering', () => {
  it('pays out and then waits for the cooldown', () => {
    let s = rich(1);
    const wood = s.wallet.wood;
    s = ok(s, { type: 'gather', spotId: 'woodpile', at: 1000 });
    expect(s.wallet.wood).toBe(wood + 3);
    expect(err(s, { type: 'gather', spotId: 'woodpile', at: 2000 })).toBe('cooldown');
    ok(s, { type: 'gather', spotId: 'woodpile', at: 1000 + 90_000 });
    expect(err(s, { type: 'gather', spotId: 'cotton_patch', at: 1000 })).toBe('locked');
  });
});

describe('expeditions', () => {
  it('sends one resident at a time, who cannot be played with while away, and brings Pippo home once', () => {
    let s = rich(7);
    expect(err(rich(6), { type: 'start_expedition', routeId: 'old_mill', residentId: 'snug', at: 0 })).toBe('locked');
    s = ok(s, { type: 'start_expedition', routeId: 'old_mill', residentId: 'snug', at: 0 });
    expect(err(s, { type: 'start_expedition', routeId: 'meadow', residentId: 'snug', at: 1 })).toBe('busy');
    expect(err(s, { type: 'play', residentId: 'snug', at: 1_000_000 })).toBe('away');
    expect(err(s, { type: 'collect_expedition', at: 60_000 })).toBe('not_ready');
    s = ok(s, { type: 'collect_expedition', at: 10 * 60_000 });
    expect('pippo' in s.residents).toBe(true);
    expect(s.wallet.keepsakes).toBe(53);
    s = ok(s, { type: 'start_expedition', routeId: 'old_mill', residentId: 'snug', at: 0 });
    s = ok(s, { type: 'collect_expedition', at: 10 * 60_000 });
    expect(s.expeditionsDone.old_mill).toBe(2);
  });
});

describe('residents and rooms', () => {
  it('moves residents between open rooms, up to four per room', () => {
    let s = rich(3);
    expect(s.residents.snug!.room).toBe(LIVING_ROOM_ID);
    expect(err(s, { type: 'move_resident', residentId: 'snug', roomId: SUNROOM_ID })).toBe('locked');
    s = ok(s, { type: 'buy_room', roomId: SUNROOM_ID, kind: 'open' });
    s = ok(s, { type: 'move_resident', residentId: 'snug', roomId: SUNROOM_ID });
    expect(s.residents.snug!.room).toBe(SUNROOM_ID);
    const full: GameState = {
      ...s,
      residents: Object.fromEntries(['a', 'b', 'c', 'd'].map((k) => [k, { bondXp: 0, form: 'original', lastPlayAt: 0, room: LIVING_ROOM_ID, costume: null }])),
      residentOrder: ['a', 'b', 'c', 'd'],
    };
    expect(err({ ...full, residents: { ...full.residents, snug: s.residents.snug! } }, { type: 'move_resident', residentId: 'snug', roomId: LIVING_ROOM_ID })).toBe('room_full');
  });
});

describe('save v3', () => {
  it('migrates a v2 save: residents move into the Living Room, new fields start empty', () => {
    const v2 = JSON.parse(serialize(newGame(content)));
    v2.version = 2;
    for (const k of ['purchases', 'gatherReadyAt', 'gatherCount', 'expedition', 'expeditionsDone']) delete v2[k];
    for (const r of Object.values(v2.residents) as Array<Record<string, unknown>>) delete r.room;
    const s = deserialize(JSON.stringify(v2), content);
    expect(s.version).toBe(4);
    expect(s.costumesOwned).toEqual([]);
    expect(s.residents.snug!.costume).toBeNull();
    expect(s.residents.snug!.room).toBe(LIVING_ROOM_ID);
    expect(s.purchases).toEqual([]);
    expect(s.expedition).toBeNull();
  });

  it('round-trips an expedition in progress and drops nonsense', () => {
    let s = ok(rich(7), { type: 'start_expedition', routeId: 'meadow', residentId: 'snug', at: 5 });
    s = { ...s, purchases: [...s.purchases, 'yard:open', 'nowhere:expand'] };
    const back = deserialize(serialize(s), content);
    expect(back.expedition).toEqual(s.expedition);
    expect(back.purchases).toEqual([]);
  });
});

describe('invited residents', () => {
  it('move into the room they were invited to', () => {
    let s = rich(4);
    s = ok(s, { type: 'buy_room', roomId: SUNROOM_ID, kind: 'open' });
    for (const id of ['planter_box', 'potted_fern']) {
      s = ok(s, { type: 'craft', recipeId: id });
    }
    s = ok(s, { type: 'place', roomId: SUNROOM_ID, defId: 'planter_box', col: 3, row: 2 });
    s = ok(s, { type: 'place', roomId: SUNROOM_ID, defId: 'potted_fern', col: 6, row: 3 });
    s = ok(s, { type: 'invite', residentId: 'bloomi' });
    expect(s.residents.bloomi!.room).toBe(SUNROOM_ID);
  });
});

describe('wall coverings and hanging items', () => {
  const base = () => {
    const g = rich(3);
    return { ...g, inventory: { ...g.inventory, round_window: 2, soft_curtains: 2, moon_lantern: 2, cloud_bed: 1 } };
  };

  it('lets curtains hang over a window, but not over other curtains', () => {
    let s = ok(base(), { type: 'place', roomId: LIVING_ROOM_ID, defId: 'round_window', col: 2, row: 0 });
    s = ok(s, { type: 'place', roomId: LIVING_ROOM_ID, defId: 'soft_curtains', col: 2, row: 0 });
    expect(err(s, { type: 'place', roomId: LIVING_ROOM_ID, defId: 'soft_curtains', col: 3, row: 0 })).toBe('overlap');
    expect(err(s, { type: 'place', roomId: LIVING_ROOM_ID, defId: 'round_window', col: 3, row: 0 })).toBe('overlap');
  });

  it('hangs the Moon Lantern anywhere indoors, even over furniture, without blocking paths', () => {
    let s = ok(base(), { type: 'place', roomId: LIVING_ROOM_ID, defId: 'cloud_bed', col: 4, row: 3 });
    s = ok(s, { type: 'place', roomId: LIVING_ROOM_ID, defId: 'moon_lantern', col: 4, row: 3 });
    s = ok(s, { type: 'place', roomId: LIVING_ROOM_ID, defId: 'moon_lantern', col: 10, row: 0 }); // over the doorway is fine
    expect(err(s, { type: 'place', roomId: LIVING_ROOM_ID, defId: 'floor_lamp', col: 4, row: 3 })).toBe('overlap');
    expect(err({ ...s, inventory: { ...s.inventory, moon_lantern: 1 } }, { type: 'place', roomId: YARD_ID, defId: 'moon_lantern', col: 2, row: 2 })).toBe('out_of_bounds');
  });
});
