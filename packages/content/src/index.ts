import type { Content, FurnitureDef, ResidentDef, RoomDef } from '@nooklings/core';

/**
 * Build 1 content definitions. Milestone A ships the Living Room and a placeholder
 * furniture set only. Room size and every atmosphere tag value are PROPOSED, not balanced.
 */

const rooms: RoomDef[] = [
  // Widened from the handover's provisional 8x6 to suit landscape phones.
  { id: 'living_room', name: 'Living Room', cols: 12, rows: 6, door: { col: 10, row: 0 } },
];

const furniture: FurnitureDef[] = [
  { id: 'cloud_bed', name: 'Cloud Bed', layer: 'floor', w: 2, h: 1, tags: { Calm: 2 }, canFlip: true, rest: 'sleep' },
  { id: 'cozy_sofa', name: 'Cozy Sofa', layer: 'floor', w: 2, h: 1, tags: { Warm: 2 }, canFlip: true, rest: 'sit' },
  { id: 'bookshelf', name: 'Bookshelf', layer: 'floor', w: 2, h: 1, tags: { Calm: 1 }, canFlip: false },
  { id: 'workbench', name: 'Workbench', layer: 'floor', w: 2, h: 1, tags: { Crafty: 2 }, canFlip: true },
  { id: 'floor_lamp', name: 'Floor Lamp', layer: 'floor', w: 1, h: 1, tags: { Warm: 1 }, canFlip: false },
  { id: 'side_table', name: 'Side Table', layer: 'floor', w: 1, h: 1, tags: {}, canFlip: false },
  { id: 'potted_fern', name: 'Potted Fern', layer: 'floor', w: 1, h: 1, tags: { Natural: 1 }, canFlip: false },
  { id: 'toy_chest', name: 'Toy Chest', layer: 'floor', w: 1, h: 1, tags: { Playful: 1 }, canFlip: true },
  { id: 'star_rug', name: 'Star Rug', layer: 'rug', w: 2, h: 2, tags: { Dreamy: 2 }, canFlip: false },
  { id: 'round_window', name: 'Round Window', layer: 'wall', w: 2, h: 1, tags: { Dreamy: 1 }, canFlip: false },
  { id: 'moon_lantern', name: 'Moon Lantern', layer: 'wall', w: 1, h: 1, tags: { Dreamy: 2, Calm: 1 }, canFlip: false },
  { id: 'soft_curtains', name: 'Soft Curtains', layer: 'wall', w: 2, h: 1, tags: { Dreamy: 1, Calm: 2 }, canFlip: false },
  { id: 'picture_frame', name: 'Picture Frame', layer: 'wall', w: 1, h: 1, tags: { Warm: 1 }, canFlip: true },
];

const residents: ResidentDef[] = [
  {
    id: 'snug',
    name: 'Snug',
    rarity: 'Common',
    tagline: 'The sleepy comfort friend who loves soft places.',
    behaviour: { idle: 3, wander: 4, rest: 3 },
    favouriteRest: 'sleep',
    speed: 1.6,
  },
];

function byId<T extends { id: string }>(list: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of list) {
    if (out[item.id]) throw new Error(`Duplicate definition id: ${item.id}`);
    out[item.id] = item;
  }
  return out;
}

export const content: Content = {
  rooms: byId(rooms),
  furniture: byId(furniture),
  residents: byId(residents),
  starter: {
    homeName: 'Little Cottage',
    inventory: {
      cozy_sofa: 1,
      bookshelf: 1,
      workbench: 1,
      floor_lamp: 1,
      side_table: 1,
      potted_fern: 2,
      toy_chest: 1,
      moon_lantern: 1,
      soft_curtains: 1,
      picture_frame: 1,
    },
    placements: {
      living_room: [
        { defId: 'cloud_bed', col: 1, row: 1, flipped: false },
        { defId: 'star_rug', col: 5, row: 2, flipped: false },
        { defId: 'round_window', col: 4, row: 0, flipped: false },
      ],
    },
  },
};

export const LIVING_ROOM_ID = 'living_room';
