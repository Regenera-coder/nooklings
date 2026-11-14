import type {
  Content,
  FurnitureDef,
  InvitationDef,
  LevelDef,
  ParcelPoolDef,
  RecipeDef,
  ResidentDef,
  RoomDef,
  TaskDef,
} from '@nooklings/core';

/**
 * Build 1 content definitions.
 * Milestone B: Living Room, Home Levels 1-3, Snug/Tinker/Mischi playable, the other
 * seven First Residents listed in the Nookbook only.
 * Every number here (prices, tags, hearts, odds, cooldowns) is a PROPOSED value, not balanced.
 */

export const LIVING_ROOM_ID = 'living_room';
export const SERIES_1 = 'first_residents';

const rooms: RoomDef[] = [
  // Widened from the handover's provisional 8x6 to suit landscape phones.
  { id: LIVING_ROOM_ID, name: 'Living Room', cols: 12, rows: 6, door: { col: 10, row: 0 } },
];

const furniture: FurnitureDef[] = [
  { id: 'cloud_bed', name: 'Cloud Bed', layer: 'floor', w: 2, h: 1, tags: { Calm: 2 }, canFlip: true, rest: 'sleep' },
  { id: 'cozy_sofa', name: 'Cozy Sofa', layer: 'floor', w: 2, h: 1, tags: { Warm: 2 }, canFlip: true, rest: 'sit' },
  { id: 'bookshelf', name: 'Bookshelf', layer: 'floor', w: 2, h: 1, tags: { Calm: 1 }, canFlip: false },
  { id: 'workbench', name: 'Workbench', layer: 'floor', w: 2, h: 1, tags: { Crafty: 2 }, canFlip: true },
  { id: 'floor_lamp', name: 'Floor Lamp', layer: 'floor', w: 1, h: 1, tags: { Warm: 2 }, canFlip: false },
  { id: 'side_table', name: 'Side Table', layer: 'floor', w: 1, h: 1, tags: { Warm: 1 }, canFlip: false },
  { id: 'potted_fern', name: 'Potted Fern', layer: 'floor', w: 1, h: 1, tags: { Natural: 1 }, canFlip: false },
  { id: 'toy_chest', name: 'Toy Chest', layer: 'floor', w: 1, h: 1, tags: { Playful: 2 }, canFlip: true },
  { id: 'star_rug', name: 'Star Rug', layer: 'rug', w: 2, h: 2, tags: { Dreamy: 2 }, canFlip: false },
  { id: 'round_window', name: 'Round Window', layer: 'wall', w: 2, h: 1, tags: { Dreamy: 1 }, canFlip: false },
  { id: 'moon_lantern', name: 'Moon Lantern', layer: 'wall', w: 1, h: 1, tags: { Dreamy: 2, Calm: 1 }, canFlip: false },
  { id: 'soft_curtains', name: 'Soft Curtains', layer: 'wall', w: 2, h: 1, tags: { Dreamy: 1, Calm: 2 }, canFlip: false },
  { id: 'picture_frame', name: 'Picture Frame', layer: 'wall', w: 1, h: 1, tags: { Warm: 1 }, canFlip: true },
];

const B = { idle: 3, wander: 4, rest: 3 };

const residents: ResidentDef[] = [
  {
    id: 'snug', name: 'Snug', rarity: 'Common', series: SERIES_1, joinLevel: 1,
    tagline: 'The sleepy comfort friend who loves soft places.',
    mood: 'Sleepy', favouriteTags: ['Calm', 'Warm'],
    story: 'Snug arrived with the cottage, already asleep on the softest spot. Nobody is quite sure whether Snug moved in or simply never woke up to leave.',
    hint: 'Already lives in your cottage.',
    behaviour: { idle: 3, wander: 3, rest: 4 }, favouriteRest: 'sleep', speed: 1.4,
    palette: { body: '#f6ead7', accent: '#a99ad6' },
  },
  {
    id: 'tinker', name: 'Tinker', rarity: 'Common', series: SERIES_1, joinLevel: 2,
    tagline: 'A curious maker who can fix (almost) anything.',
    mood: 'Curious', favouriteTags: ['Crafty', 'Warm'],
    story: 'Tinker carries a key for every lock it has ever met and a few for locks that do not exist yet. It hums while it works and leaves tiny tidy screws everywhere.',
    hint: 'Joins at Home Level 2. Invite with a Crafty, Warm room.',
    behaviour: { idle: 4, wander: 4, rest: 2 }, favouriteRest: 'sit', speed: 1.7,
    palette: { body: '#a87a55', accent: '#c9a227' },
  },
  {
    id: 'mischi', name: 'Mischi', rarity: 'Common', series: SERIES_1, joinLevel: 3,
    tagline: 'A playful troublemaker with a heart of gold.',
    mood: 'Playful', favouriteTags: ['Playful', 'Dreamy'],
    story: 'Mischi hides your socks, then returns them folded, with a flower inside. Every prank ends in a present.',
    hint: 'Joins at Home Level 3. Comes in your first Mystery Parcel.',
    behaviour: { idle: 2, wander: 6, rest: 2 }, favouriteRest: 'sit', speed: 2.2,
    palette: { body: '#f29bb0', accent: '#d94f5c' },
  },
  {
    id: 'glim', name: 'Glim', rarity: 'Common', series: SERIES_1, joinLevel: 5,
    tagline: 'A dreamy little light who visits at night.', mood: 'Dreamy', favouriteTags: ['Dreamy', 'Calm'],
    story: 'Story unlocks when Glim joins.', hint: 'Joins at Home Level 5. Loves Dreamy and Calm rooms.',
    behaviour: B, favouriteRest: 'sleep', speed: 1.5, palette: { body: '#9fb7ef', accent: '#fff2b8' },
  },
  {
    id: 'bloomi', name: 'Bloomi', rarity: 'Common', series: SERIES_1, joinLevel: 4,
    tagline: 'A garden sprite who helps things grow.', mood: 'Joyful', favouriteTags: ['Natural'],
    story: 'Story unlocks when Bloomi joins.', hint: 'Joins at Home Level 4. Loves Natural decor.',
    behaviour: B, favouriteRest: 'sit', speed: 1.6, palette: { body: '#9cc77a', accent: '#f4a6c0' },
  },
  {
    id: 'mopey', name: 'Mopey', rarity: 'Common', series: SERIES_1, joinLevel: 6,
    tagline: 'A pouty friend who loves rainy days.', mood: 'Moody', favouriteTags: ['Calm'],
    story: 'Story unlocks when Mopey joins.', hint: 'Joins at Home Level 6. Loves rain and window decor.',
    behaviour: B, favouriteRest: 'sleep', speed: 1.2, palette: { body: '#b8a6d9', accent: '#7b6aa8' },
  },
  {
    id: 'pippo', name: 'Pippo', rarity: 'Rare', series: SERIES_1, joinLevel: 7,
    tagline: 'An energetic helper always ready for a trip.', mood: 'Energetic', favouriteTags: ['Playful'],
    story: 'Story unlocks when Pippo joins.', hint: 'Joins at Home Level 7. Found on expeditions.',
    behaviour: B, favouriteRest: 'sit', speed: 2.4, palette: { body: '#f2a35e', accent: '#7a5230' },
  },
  {
    id: 'hush', name: 'Hush', rarity: 'Rare', series: SERIES_1, joinLevel: 8,
    tagline: 'A shy moonlit friend who keeps things quiet.', mood: 'Quiet', favouriteTags: ['Calm', 'Dreamy'],
    story: 'Story unlocks when Hush joins.', hint: 'Joins at Home Level 8. Loves tranquil decor.',
    behaviour: B, favouriteRest: 'sleep', speed: 1.3, palette: { body: '#4b4458', accent: '#c9b8f0' },
  },
  {
    id: 'patcha', name: 'Patcha', rarity: 'Epic', series: SERIES_1, joinLevel: 9,
    tagline: 'A stitched heirloom full of old memories.', mood: 'Nostalgic', favouriteTags: ['Warm'],
    story: 'Story unlocks when Patcha joins.', hint: 'Joins at Home Level 9. Restore an heirloom.',
    behaviour: B, favouriteRest: 'sit', speed: 1.3, palette: { body: '#ecd9c6', accent: '#c46a6a' },
  },
  {
    id: 'luma', name: 'Luma', rarity: 'Secret', series: SERIES_1, joinLevel: 10,
    tagline: 'A wish-bright secret at the heart of the home.', mood: 'Wondrous', favouriteTags: ['Dreamy'],
    story: 'Story unlocks when Luma joins.', hint: 'A secret quest opens at Home Level 10.',
    behaviour: B, favouriteRest: 'sleep', speed: 1.5, palette: { body: '#fbf3e4', accent: '#e8c46a' },
  },
];

const levels: LevelDef[] = [
  { level: 1, hearts: 0, unlocks: [], label: 'Living Room' },
  { level: 2, hearts: 10, unlocks: ['crafting'], label: 'Crafting' },
  { level: 3, hearts: 25, unlocks: ['parcels'], label: 'Mystery Parcels' },
];

const recipes: RecipeDef[] = [
  { id: 'workbench', furnitureId: 'workbench', cost: { buttons: 80, wood: 4 }, requiresLevel: 2 },
  { id: 'potted_fern', furnitureId: 'potted_fern', cost: { buttons: 30 }, requiresLevel: 2 },
  { id: 'side_table', furnitureId: 'side_table', cost: { buttons: 40, wood: 2 }, requiresLevel: 2 },
  { id: 'picture_frame', furnitureId: 'picture_frame', cost: { buttons: 30, wood: 1 }, requiresLevel: 2 },
  { id: 'toy_chest', furnitureId: 'toy_chest', cost: { buttons: 60, wood: 2, fabric: 1 }, requiresLevel: 2 },
];

const invitations: InvitationDef[] = [
  {
    residentId: 'tinker', requiresLevel: 2, roomId: LIVING_ROOM_ID,
    atmosphere: { Crafty: 2, Warm: 2 },
    welcomeGift: { wood: 2 },
    welcomeText: 'Leave 2 Wood by the door as a welcome gift.',
  },
];

const tasks: TaskDef[] = [
  {
    id: 'cozy', title: 'Make it cozy', description: 'Place the Floor Lamp and the Star Rug in the Living Room.',
    condition: { kind: 'placed', roomId: LIVING_ROOM_ID, furnitureIds: ['floor_lamp', 'star_rug'] },
    reward: { buttons: 40, wood: 6, hearts: 10 }, goTo: 'build',
  },
  {
    id: 'maker', title: "A maker's corner", description: 'Craft a Workbench and place it in the Living Room.',
    condition: { kind: 'placed', roomId: LIVING_ROOM_ID, furnitureIds: ['workbench'] },
    reward: { buttons: 20, hearts: 5 }, goTo: 'build',
  },
  {
    id: 'welcome_tinker', title: 'A new neighbour', description: 'Invite Tinker to live with you.',
    condition: { kind: 'owns_resident', residentId: 'tinker' },
    reward: { wishStamps: 1, fabric: 3, hearts: 5 }, goTo: 'invitations',
  },
  {
    id: 'first_parcel', title: 'A mysterious delivery', description: 'Open a Mystery Parcel with a Wish Stamp.',
    condition: { kind: 'parcels_opened', count: 1 },
    reward: { buttons: 30, hearts: 3 }, goTo: 'parcels',
  },
  {
    id: 'meet_mischi', title: 'Say hello', description: "Open Mischi's page in the Nookbook.",
    condition: { kind: 'flag', flag: 'viewed:mischi' },
    reward: { buttons: 20, wishStamps: 1, hearts: 2 }, goTo: 'nookbook',
  },
  {
    id: 'best_friends', title: 'Best friends', description: 'Play with a resident until they reach Bond 2.',
    condition: { kind: 'bond_level', level: 2 },
    reward: { buttons: 20, fabric: 3, hearts: 3 }, goTo: 'nookbook',
  },
  {
    id: 'snug_new_look', title: "Snug's new look", description: "Upgrade Snug to its Decorated form.",
    condition: { kind: 'form', residentId: 'snug', form: 'decorated' },
    reward: { buttons: 50, hearts: 5 }, goTo: 'nookbook',
  },
];

const parcels: ParcelPoolDef[] = [
  {
    id: 'first_residents', name: 'First Residents Parcel', cost: { wishStamps: 1 }, requiresUnlock: 'parcels',
    categoryWeights: { character: 60, furniture: 40 },
    rarityWeights: { Common: 70, Rare: 25, Epic: 4, Secret: 1 },
    series: SERIES_1,
    furniture: ['potted_fern', 'side_table', 'picture_frame', 'moon_lantern', 'toy_chest'],
    guaranteedFirst: 'mischi',
    duplicateThread: 5,
  },
];

function byId<T>(list: T[], key: (t: T) => string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of list) {
    const id = key(item);
    if (out[id]) throw new Error(`Duplicate definition id: ${id}`);
    out[id] = item;
  }
  return out;
}

export const content: Content = {
  rooms: byId(rooms, (r) => r.id),
  furniture: byId(furniture, (f) => f.id),
  residents: byId(residents, (r) => r.id),
  levels,
  recipes: byId(recipes, (r) => r.id),
  invitations: byId(invitations, (i) => i.residentId),
  tasks,
  parcels: byId(parcels, (p) => p.id),
  bond: { thresholds: [0, 3, 8, 15, 25], playCooldownMs: 30_000, playReward: { buttons: 5 }, heartsPerBondLevel: 3 },
  formUpgrades: [{ form: 'decorated', requiresBond: 2, cost: { buttons: 60, fabric: 3 }, hearts: 5 }],
  rules: { heartsPerNewResident: 5, heartsPerFirstCraft: 2, maxCopiesCounted: 2, maxActiveResidents: 4 },
  starter: {
    homeName: 'Little Cottage',
    wallet: { buttons: 50 },
    residents: ['snug'],
    rngSeed: 20261114,
    inventory: {
      floor_lamp: 1,
      star_rug: 1,
      cozy_sofa: 1,
      bookshelf: 1,
      potted_fern: 1,
      moon_lantern: 1,
      soft_curtains: 1,
    },
    placements: {
      [LIVING_ROOM_ID]: [
        { defId: 'cloud_bed', col: 1, row: 1, flipped: false },
        { defId: 'round_window', col: 4, row: 0, flipped: false },
      ],
    },
  },
};
