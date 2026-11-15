import type {
  Content,
  CostumeDef,
  ExpeditionDef,
  GatherSpotDef,
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

export const SUNROOM_ID = 'sunroom';
export const YARD_ID = 'yard';

// Room sizes widened from the handover's provisional values to suit landscape phones.
const rooms: RoomDef[] = [
  { id: LIVING_ROOM_ID, name: 'Living Room', cols: 12, rows: 6, door: { col: 10, row: 0 }, theme: 'living' },
  {
    id: SUNROOM_ID, name: 'Sunroom', cols: 10, rows: 5, door: { col: 1, row: 0 }, theme: 'sunroom',
    access: { unlock: 'sunroom', cost: { buttons: 300, wood: 25 } },
  },
  {
    id: YARD_ID, name: 'Yard', cols: 14, rows: 6, door: { col: 0, row: 0 }, theme: 'yard', walls: false,
    expansion: { unlock: 'yard_expansion', cost: { buttons: 500, wood: 40 }, baseCols: 8 },
  },
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
  { id: 'moon_lantern', name: 'Moon Lantern', layer: 'ceiling', w: 1, h: 1, tags: { Dreamy: 2, Calm: 1 }, canFlip: false },
  { id: 'soft_curtains', name: 'Soft Curtains', layer: 'wall', w: 2, h: 1, tags: { Dreamy: 1, Calm: 2 }, canFlip: false, overlay: true },
  { id: 'picture_frame', name: 'Picture Frame', layer: 'wall', w: 1, h: 1, tags: { Warm: 1 }, canFlip: true },
  // Milestone C
  { id: 'tea_table', name: 'Tea Table', layer: 'floor', w: 2, h: 1, tags: { Calm: 1, Warm: 1 }, canFlip: false },
  { id: 'reading_chair', name: 'Reading Chair', layer: 'floor', w: 1, h: 1, tags: { Calm: 2 }, canFlip: true, rest: 'sit' },
  { id: 'planter_box', name: 'Planter Box', layer: 'floor', w: 2, h: 1, tags: { Natural: 2 }, canFlip: false },
  { id: 'hanging_plant', name: 'Hanging Plant', layer: 'wall', w: 1, h: 1, tags: { Natural: 1, Calm: 1 }, canFlip: true },
  { id: 'bird_bath', name: 'Bird Bath', layer: 'floor', w: 1, h: 1, tags: { Natural: 2 }, canFlip: false },
  { id: 'garden_bench', name: 'Garden Bench', layer: 'floor', w: 2, h: 1, tags: { Natural: 1, Warm: 1 }, canFlip: true, rest: 'sit' },
  { id: 'rain_window', name: 'Rain Window', layer: 'wall', w: 2, h: 1, tags: { Rainy: 2, Calm: 1 }, canFlip: false },
  { id: 'rain_chime', name: 'Rain Chime', layer: 'wall', w: 1, h: 1, tags: { Rainy: 1, Dreamy: 1 }, canFlip: false },
  { id: 'travel_trunk', name: 'Travel Trunk', layer: 'floor', w: 1, h: 1, tags: { Playful: 1, Warm: 1 }, canFlip: true },
  { id: 'paper_lanterns', name: 'Paper Lanterns', layer: 'wall', w: 2, h: 1, tags: { Calm: 2, Dreamy: 1 }, canFlip: false },
  { id: 'zen_stones', name: 'Zen Stones', layer: 'floor', w: 1, h: 1, tags: { Calm: 2 }, canFlip: false },
  { id: 'heirloom_chest', name: 'Heirloom Chest', layer: 'floor', w: 1, h: 1, tags: { Warm: 2 }, canFlip: true },
  { id: 'wishing_lantern', name: 'Wishing Lantern', layer: 'floor', w: 1, h: 1, tags: { Dreamy: 3 }, canFlip: false },
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
    story: 'Glim only visits on clear nights, drifting in through the window like a dropped star. If the room is dreamy enough, Glim forgets to leave.', hint: 'Home Level 5. Invite with a Dreamy, Calm Living Room.',
    behaviour: B, favouriteRest: 'sleep', speed: 1.5, palette: { body: '#9fb7ef', accent: '#fff2b8' },
  },
  {
    id: 'bloomi', name: 'Bloomi', rarity: 'Common', series: SERIES_1, joinLevel: 4,
    tagline: 'A garden sprite who helps things grow.', mood: 'Joyful', favouriteTags: ['Natural'],
    story: 'Bloomi hums to seedlings until they sprout out of sheer politeness. Every pot in the house is secretly Bloomi\'s.', hint: 'Home Level 4. Invite with a Natural Sunroom.',
    behaviour: B, favouriteRest: 'sit', speed: 1.6, palette: { body: '#9cc77a', accent: '#f4a6c0' },
  },
  {
    id: 'mopey', name: 'Mopey', rarity: 'Common', series: SERIES_1, joinLevel: 6,
    tagline: 'A pouty friend who loves rainy days.', mood: 'Moody', favouriteTags: ['Calm'],
    story: 'Mopey says sunny days are too loud. Give Mopey a rainy window and a soft chair, and you get the quietest smile in the house.', hint: 'Home Level 6. Invite with a Rainy, Calm Sunroom.',
    behaviour: B, favouriteRest: 'sleep', speed: 1.2, palette: { body: '#b8a6d9', accent: '#7b6aa8' },
  },
  {
    id: 'pippo', name: 'Pippo', rarity: 'Rare', series: SERIES_1, joinLevel: 7,
    tagline: 'An energetic helper always ready for a trip.', mood: 'Energetic', favouriteTags: ['Playful'],
    story: 'Pippo was found napping in a mail sack at the Old Mill and has been trying to deliver itself somewhere ever since.', hint: 'Home Level 7. Comes home from your first trip to the Old Mill.',
    behaviour: B, favouriteRest: 'sit', speed: 2.4, palette: { body: '#f2a35e', accent: '#7a5230' },
  },
  {
    id: 'hush', name: 'Hush', rarity: 'Rare', series: SERIES_1, joinLevel: 8,
    tagline: 'A shy moonlit friend who keeps things quiet.', mood: 'Quiet', favouriteTags: ['Calm', 'Dreamy'],
    story: 'Hush talks only to the moon, and only in whispers. In a calm enough room, Hush will whisper to you too.', hint: 'Home Level 8. Invite with a very Calm Sunroom.',
    behaviour: B, favouriteRest: 'sleep', speed: 1.3, palette: { body: '#4b4458', accent: '#c9b8f0' },
  },
  {
    id: 'patcha', name: 'Patcha', rarity: 'Epic', series: SERIES_1, joinLevel: 9,
    tagline: 'A stitched heirloom full of old memories.', mood: 'Nostalgic', favouriteTags: ['Warm'],
    story: 'Patcha has been mended so many times that every patch is a memory. Patcha remembers all of them, and the people who sewed them.', hint: 'Home Level 9. Restore the Heirloom Chest, then invite.',
    behaviour: B, favouriteRest: 'sit', speed: 1.3, palette: { body: '#ecd9c6', accent: '#c46a6a' },
  },
  {
    id: 'luma', name: 'Luma', rarity: 'Secret', series: SERIES_1, joinLevel: 10,
    tagline: 'A wish-bright secret at the heart of the home.', mood: 'Wondrous', favouriteTags: ['Dreamy'],
    story: 'Luma is what a house wishes for when everyone in it is happy. Nobody has ever seen Luma arrive; Luma is simply there.', hint: 'Secret. Home Level 10, every other First Resident, and a Wishing Lantern.',
    behaviour: B, favouriteRest: 'sleep', speed: 1.5, palette: { body: '#fbf3e4', accent: '#e8c46a' },
  },
];

const levels: LevelDef[] = [
  { level: 1, hearts: 0, unlocks: [], label: 'Living Room and a tiny yard' },
  { level: 2, hearts: 10, unlocks: ['crafting'], label: 'Crafting' },
  { level: 3, hearts: 25, unlocks: ['parcels', 'sunroom'], label: 'Mystery Parcels and the Sunroom' },
  { level: 4, hearts: 45, unlocks: ['gardening'], label: 'Gardening' },
  { level: 5, hearts: 70, unlocks: ['yard_expansion'], label: 'Bigger yard' },
  { level: 6, hearts: 100, unlocks: ['rain_decor'], label: 'Rainy-day decor' },
  { level: 7, hearts: 130, unlocks: ['expeditions'], label: 'Expeditions' },
  { level: 8, hearts: 165, unlocks: ['tranquil_decor'], label: 'Tranquil decor' },
  { level: 9, hearts: 200, unlocks: ['heirloom'], label: 'Heirloom restoring' },
  { level: 10, hearts: 240, unlocks: ['exterior'], label: 'Wishing Lantern' },
];

const recipes: RecipeDef[] = [
  { id: 'workbench', furnitureId: 'workbench', cost: { buttons: 80, wood: 4 }, requiresLevel: 2 },
  { id: 'potted_fern', furnitureId: 'potted_fern', cost: { buttons: 30 }, requiresLevel: 2 },
  { id: 'side_table', furnitureId: 'side_table', cost: { buttons: 40, wood: 2 }, requiresLevel: 2 },
  { id: 'picture_frame', furnitureId: 'picture_frame', cost: { buttons: 30, wood: 1 }, requiresLevel: 2 },
  { id: 'toy_chest', furnitureId: 'toy_chest', cost: { buttons: 60, wood: 2, fabric: 1 }, requiresLevel: 2 },
  { id: 'tea_table', furnitureId: 'tea_table', cost: { buttons: 70, wood: 3 }, requiresLevel: 3 },
  { id: 'reading_chair', furnitureId: 'reading_chair', cost: { buttons: 60, fabric: 2 }, requiresLevel: 3 },
  { id: 'planter_box', furnitureId: 'planter_box', cost: { buttons: 60, wood: 3 }, requiresLevel: 4 },
  { id: 'hanging_plant', furnitureId: 'hanging_plant', cost: { buttons: 40, fabric: 1 }, requiresLevel: 4 },
  { id: 'bird_bath', furnitureId: 'bird_bath', cost: { buttons: 50, wood: 2 }, requiresLevel: 4 },
  { id: 'garden_bench', furnitureId: 'garden_bench', cost: { buttons: 80, wood: 4 }, requiresLevel: 5 },
  { id: 'rain_window', furnitureId: 'rain_window', cost: { buttons: 100, wood: 4 }, requiresLevel: 6 },
  { id: 'rain_chime', furnitureId: 'rain_chime', cost: { buttons: 60, fabric: 2 }, requiresLevel: 6 },
  { id: 'travel_trunk', furnitureId: 'travel_trunk', cost: { buttons: 60, wood: 2 }, requiresLevel: 7 },
  { id: 'paper_lanterns', furnitureId: 'paper_lanterns', cost: { buttons: 120, fabric: 4 }, requiresLevel: 8 },
  { id: 'zen_stones', furnitureId: 'zen_stones', cost: { buttons: 80, wood: 3 }, requiresLevel: 8 },
  { id: 'heirloom_chest', furnitureId: 'heirloom_chest', cost: { fabric: 6, keepsakes: 4 }, requiresLevel: 9 },
  { id: 'wishing_lantern', furnitureId: 'wishing_lantern', cost: { buttons: 200, keepsakes: 6 }, requiresLevel: 10 },
];

const invitations: InvitationDef[] = [
  {
    residentId: 'tinker', requiresLevel: 2, roomId: LIVING_ROOM_ID,
    atmosphere: { Crafty: 2, Warm: 2 },
    welcomeGift: { wood: 2 },
    welcomeText: 'Leave 2 Wood by the door as a welcome gift.',
  },
  {
    residentId: 'bloomi', requiresLevel: 4, roomId: SUNROOM_ID,
    atmosphere: { Natural: 3 }, welcomeGift: { fabric: 2 },
    welcomeText: 'Fill the Sunroom with plants and leave 2 Fabric for a seed pouch.',
  },
  {
    residentId: 'glim', requiresLevel: 5, roomId: LIVING_ROOM_ID,
    atmosphere: { Dreamy: 5, Calm: 2 }, welcomeGift: { buttons: 30 },
    welcomeText: 'Make the Living Room dreamy and calm, and leave 30 Buttons to buy starlight.',
  },
  {
    residentId: 'mopey', requiresLevel: 6, roomId: SUNROOM_ID,
    atmosphere: { Rainy: 2, Calm: 3 }, welcomeGift: { fabric: 3 },
    welcomeText: 'Give the Sunroom a rainy, calm corner and leave 3 Fabric for a blanket.',
  },
  {
    residentId: 'hush', requiresLevel: 8, roomId: SUNROOM_ID,
    atmosphere: { Calm: 6, Dreamy: 2 }, welcomeGift: { buttons: 60 },
    welcomeText: 'Make the Sunroom very calm and leave 60 Buttons for moonlit tea.',
  },
  {
    residentId: 'patcha', requiresLevel: 9, roomId: LIVING_ROOM_ID,
    atmosphere: { Warm: 5 }, requiresPlaced: ['heirloom_chest'], welcomeGift: { fabric: 3 },
    welcomeText: 'Restore the Heirloom Chest, place it in a warm Living Room and leave 3 Fabric for mending.',
  },
  {
    residentId: 'luma', requiresLevel: 10, roomId: LIVING_ROOM_ID,
    atmosphere: { Dreamy: 7 }, requiresPlaced: ['wishing_lantern'],
    requiresOwned: ['snug', 'tinker', 'mischi', 'glim', 'bloomi', 'mopey', 'pippo', 'hush', 'patcha'],
    welcomeGift: { keepsakes: 3 },
    welcomeText: 'Light the Wishing Lantern in a very dreamy Living Room once every other First Resident lives with you, and offer 3 Keepsakes.',
  },
];

const gatherSpots: GatherSpotDef[] = [
  { id: 'woodpile', name: 'Woodpile', roomId: YARD_ID, yield: { wood: 3 }, cooldownMs: 90_000 },
  { id: 'berry_bush', name: 'Button Berry Bush', roomId: YARD_ID, yield: { buttons: 25 }, cooldownMs: 90_000 },
  { id: 'cotton_patch', name: 'Cotton Patch', roomId: YARD_ID, yield: { fabric: 2 }, cooldownMs: 120_000, requiresUnlock: 'gardening' },
];

// Costumes: bought once with Ribbons, worn over a resident's Original or Decorated look.
// Mischi and Hush are wingless by default (15 Nov 2026); their wings are costumes.
const costumes: CostumeDef[] = [
  {
    id: 'mopey_umbrella', residentId: 'mopey', name: 'Tiny Rain Umbrella',
    description: 'A little felt umbrella so Mopey can enjoy the rain anywhere.', cost: { ribbons: 12 }, requiresLevel: 6,
  },
  {
    id: 'mischi_wings', residentId: 'mischi', name: 'Mischief Wings',
    description: 'Little stitched bat wings for extra mischief.', cost: { ribbons: 15 }, requiresLevel: 3,
  },
  {
    id: 'hush_wings', residentId: 'hush', name: 'Moonlit Wings',
    description: 'Soft moth wings with stitched moons, for quiet moonlit flutters.', cost: { ribbons: 15 }, requiresLevel: 8,
  },
];

const expeditions: ExpeditionDef[] = [
  {
    id: 'meadow', name: 'Clover Meadow', description: 'A short stroll for wildflowers and lost buttons.',
    durationMs: 3 * 60_000, reward: { wood: 4, fabric: 2, keepsakes: 1, ribbons: 2, hearts: 2 }, requiresUnlock: 'expeditions',
  },
  {
    id: 'old_mill', name: 'The Old Mill', description: 'A longer trip to the creaky mill by the stream. Something there is waiting to be found.',
    durationMs: 10 * 60_000, reward: { buttons: 60, keepsakes: 3, ribbons: 4, hearts: 4 }, requiresUnlock: 'expeditions',
    firstTimeResident: 'pippo',
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
  // Milestone C
  {
    id: 'open_sunroom', title: 'A sunny room', description: 'Open the Sunroom (Home Level 3).',
    condition: { kind: 'purchased', key: 'sunroom:open' }, reward: { buttons: 60, wood: 6, hearts: 6 }, goTo: 'build',
  },
  {
    id: 'yard_work', title: 'Yard work', description: 'Gather from the Yard 3 times.',
    condition: { kind: 'gathered', count: 3 }, reward: { fabric: 4, hearts: 4 }, goTo: 'explore',
  },
  {
    id: 'sunroom_cozy', title: 'Sunroom touches', description: 'Place 3 items in the Sunroom.',
    condition: { kind: 'room_items', roomId: SUNROOM_ID, count: 3 }, reward: { buttons: 40, hearts: 6 }, goTo: 'build',
  },
  {
    id: 'meet_bloomi', title: 'Green thumbs', description: 'Invite Bloomi (Home Level 4).',
    condition: { kind: 'owns_resident', residentId: 'bloomi' }, reward: { buttons: 60, wood: 6, hearts: 8 }, goTo: 'invitations',
  },
  {
    id: 'bigger_yard', title: 'Room to roam', description: 'Expand the Yard (Home Level 5).',
    condition: { kind: 'purchased', key: 'yard:expand' }, reward: { wood: 6, hearts: 8 }, goTo: 'build',
  },
  {
    id: 'meet_glim', title: 'A visitor from the stars', description: 'Invite Glim (Home Level 5).',
    condition: { kind: 'owns_resident', residentId: 'glim' }, reward: { buttons: 60, hearts: 8 }, goTo: 'invitations',
  },
  {
    id: 'meet_mopey', title: 'Rainy-day friend', description: 'Invite Mopey (Home Level 6).',
    condition: { kind: 'owns_resident', residentId: 'mopey' }, reward: { fabric: 4, wood: 4, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'first_trip', title: 'Off on an adventure', description: 'Finish an expedition (Home Level 7).',
    condition: { kind: 'expeditions_done', count: 1 }, reward: { buttons: 40, keepsakes: 1, hearts: 6 }, goTo: 'explore',
  },
  {
    id: 'meet_pippo', title: 'Special delivery', description: 'Bring Pippo home from the Old Mill.',
    condition: { kind: 'owns_resident', residentId: 'pippo' }, reward: { buttons: 60, hearts: 8 }, goTo: 'explore',
  },
  {
    id: 'meet_hush', title: 'Quiet nights', description: 'Invite Hush (Home Level 8).',
    condition: { kind: 'owns_resident', residentId: 'hush' }, reward: { buttons: 60, keepsakes: 2, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'heirloom', title: 'Heirloom restored', description: 'Restore the Heirloom Chest and place it in the Living Room (Home Level 9).',
    condition: { kind: 'placed', roomId: LIVING_ROOM_ID, furnitureIds: ['heirloom_chest'] }, reward: { fabric: 4, hearts: 8 }, goTo: 'build',
  },
  {
    id: 'meet_patcha', title: 'Stitched with love', description: 'Invite Patcha.',
    condition: { kind: 'owns_resident', residentId: 'patcha' }, reward: { buttons: 80, keepsakes: 2, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'meet_luma', title: 'A wish come true', description: 'Light the Wishing Lantern and invite the secret resident (Home Level 10).',
    condition: { kind: 'owns_resident', residentId: 'luma' }, reward: { buttons: 100, hearts: 10 }, goTo: 'invitations',
  },
];

const parcels: ParcelPoolDef[] = [
  {
    id: 'first_residents', name: 'First Residents Parcel', cost: { wishStamps: 1 }, requiresUnlock: 'parcels',
    categoryWeights: { character: 60, furniture: 40 },
    rarityWeights: { Common: 70, Rare: 25, Epic: 4, Secret: 1 },
    series: SERIES_1,
    furniture: ['potted_fern', 'side_table', 'picture_frame', 'moon_lantern', 'toy_chest', 'hanging_plant', 'tea_table'],
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
  gatherSpots: byId(gatherSpots, (g) => g.id),
  costumes: byId(costumes, (c) => c.id),
  ribbons: {
    perPlay: 1,
    playsPerDay: 5,
    minigame: { secondsLong: 30, pointsPerRibbon: 10, maxRibbonsPerGame: 5, gamesPerDay: 3, maxScore: 60 },
  },
  expeditions: byId(expeditions, (e) => e.id),
  roomOrder: [LIVING_ROOM_ID, SUNROOM_ID, YARD_ID],
  rules: { heartsPerNewResident: 5, heartsPerFirstCraft: 2, maxCopiesCounted: 2, maxActiveResidents: 4, maxResidentsPerRoom: 4 },
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
