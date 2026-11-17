import type {
  ArcadeGameDef,
  ArcadeGameId,
  CompanionDef,
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
  SucculentDef,
  ResearchStudyDef,
  SucculentColourDef,
  SucculentPatternDef,
  GardenToolDef,
  GardenGoalDef,
  GardenRules,
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
  // Milestone D: Arcade prizes (only won in the Arcade, never sold or crafted)
  { id: 'button_jar', name: 'Button Jar', layer: 'floor', w: 1, h: 1, tags: { Crafty: 1, Playful: 1 }, canFlip: false },
  { id: 'button_rug', name: 'Button Rug', layer: 'rug', w: 2, h: 2, tags: { Playful: 2 }, canFlip: false },
  { id: 'card_table', name: 'Card Table', layer: 'floor', w: 2, h: 1, tags: { Playful: 1, Warm: 1 }, canFlip: false },
  { id: 'photo_wall', name: 'Photo Wall', layer: 'wall', w: 2, h: 1, tags: { Warm: 2 }, canFlip: false },
  { id: 'stone_tablet', name: 'Stone Tablet', layer: 'floor', w: 1, h: 1, tags: { Calm: 1, Natural: 1 }, canFlip: false },
  { id: 'glyph_banner', name: 'Glyph Banner', layer: 'wall', w: 1, h: 1, tags: { Dreamy: 1, Crafty: 1 }, canFlip: false },
  { id: 'mini_oven', name: 'Mini Oven', layer: 'floor', w: 1, h: 1, tags: { Warm: 2 }, canFlip: true },
  { id: 'teacup_set', name: 'Teacup Set', layer: 'floor', w: 1, h: 1, tags: { Calm: 1, Warm: 1 }, canFlip: false },
  { id: 'sewing_basket', name: 'Sewing Basket', layer: 'floor', w: 1, h: 1, tags: { Crafty: 2 }, canFlip: true },
  { id: 'embroidery_hoop', name: 'Embroidery Hoop', layer: 'wall', w: 1, h: 1, tags: { Crafty: 1, Warm: 1 }, canFlip: false },
  { id: 'flower_cart', name: 'Flower Cart', layer: 'floor', w: 2, h: 1, tags: { Natural: 2, Playful: 1 }, canFlip: true },
  { id: 'trellis_arch', name: 'Trellis Arch', layer: 'floor', w: 2, h: 1, tags: { Natural: 2, Dreamy: 1 }, canFlip: false },
  { id: 'magnifier_lamp', name: 'Magnifier Lamp', layer: 'floor', w: 1, h: 1, tags: { Warm: 1, Crafty: 1 }, canFlip: true },
  { id: 'puzzle_frame', name: 'Puzzle Frame', layer: 'wall', w: 1, h: 1, tags: { Playful: 1, Calm: 1 }, canFlip: false },
  { id: 'firefly_jar', name: 'Firefly Jar', layer: 'floor', w: 1, h: 1, tags: { Dreamy: 2 }, canFlip: false },
  { id: 'lantern_string', name: 'Lantern String', layer: 'wall', w: 2, h: 1, tags: { Dreamy: 2, Warm: 1 }, canFlip: false },
  { id: 'mailbox', name: 'Mailbox', layer: 'floor', w: 1, h: 1, tags: { Warm: 1, Playful: 1 }, canFlip: true },
  { id: 'parcel_stack', name: 'Parcel Stack', layer: 'floor', w: 1, h: 1, tags: { Playful: 2 }, canFlip: true },
  { id: 'play_tent', name: 'Play Tent', layer: 'floor', w: 2, h: 1, tags: { Playful: 2, Dreamy: 1 }, canFlip: true },
  { id: 'peek_curtain', name: 'Peek-a-boo Curtain', layer: 'wall', w: 2, h: 1, tags: { Playful: 1, Calm: 1 }, canFlip: false, overlay: true },
];

// ---------- Milestone D: the Arcade ----------
// Scores, prize milestones and Ribbon rates are PROPOSED values (the brief leaves them to the code).
const prizes = (gameId: string, f1: string, f2: string, pet: string, scores: [number, number, number]): ArcadeGameDef['prizes'] => [
  { score: scores[0], kind: 'furniture', id: f1 },
  { score: scores[1], kind: 'furniture', id: f2 },
  { score: scores[2], kind: 'companion', id: pet },
];

const arcadeGames: ArcadeGameDef[] = [
  { id: 'button_catch', name: 'Button Catch', host: 'snug', unlockLevel: 1, seconds: 30, maxScore: 60, pointsPerRibbon: 10,
    howTo: 'Tap the buttons before they float away. Golden ones are worth 3. Do not tap the red ones: they cost a point!',
    prizes: prizes('button_catch', 'button_jar', 'button_rug', 'button_mouse', [15, 30, 45]) },
  { id: 'memory', name: 'Memory Match', host: 'tinker', unlockLevel: 2, seconds: 60, maxScore: 100, pointsPerRibbon: 15,
    howTo: 'Flip two cards at a time and find the matching pairs.',
    prizes: prizes('memory', 'card_table', 'photo_wall', 'paper_crane', [25, 50, 75]) },
  { id: 'stitch', name: 'Stitch-a-Pattern', host: 'patcha', unlockLevel: 2, seconds: 60, maxScore: 120, pointsPerRibbon: 20,
    howTo: 'Follow the dotted line with your finger to stitch the pattern.',
    prizes: prizes('stitch', 'sewing_basket', 'embroidery_hoop', 'yarn_kitten', [30, 60, 90]) },
  { id: 'kitchen', name: 'Cosy Kitchen', host: 'bloomi', unlockLevel: 3, seconds: 60, maxScore: 120, pointsPerRibbon: 20,
    howTo: 'Follow the recipe card: drag, tap to chop, hold to stir, swipe to flip.',
    prizes: prizes('kitchen', 'mini_oven', 'teacup_set', 'teapot_sprite', [30, 60, 90]) },
  { id: 'garden', name: 'Garden Tending', host: 'bloomi', unlockLevel: 4, seconds: 45, maxScore: 100, pointsPerRibbon: 15,
    howTo: 'Water the sprouts, pick the flowers when they bloom, and pull the weeds.',
    prizes: prizes('garden', 'flower_cart', 'trellis_arch', 'bumblebee', [25, 50, 75]) },
  { id: 'glyph', name: 'Glyph Garden', host: 'patcha', unlockLevel: 5, seconds: 60, maxScore: 120, pointsPerRibbon: 20,
    howTo: 'Look at the pattern on the scroll and pick the symbol that comes next.',
    prizes: prizes('glyph', 'stone_tablet', 'glyph_banner', 'tiny_tortoise', [30, 60, 90]) },
  { id: 'lantern', name: 'Lantern Lights', host: 'glim', unlockLevel: 5, seconds: 60, maxScore: 100, pointsPerRibbon: 12,
    howTo: 'Watch the lanterns glow, then tap them in the same order.',
    prizes: prizes('lantern', 'firefly_jar', 'lantern_string', 'firefly', [20, 40, 60]) },
  { id: 'spot', name: 'Spot the Difference', host: 'mischi', unlockLevel: 6, seconds: 75, maxScore: 180, pointsPerRibbon: 25,
    howTo: 'I changed five little things in the right picture. Tap them!',
    prizes: prizes('spot', 'magnifier_lamp', 'puzzle_frame', 'curious_owl', [40, 90, 140]) },
  { id: 'parcel', name: 'Parcel Sorting', host: 'pippo', unlockLevel: 7, seconds: 45, maxScore: 100, pointsPerRibbon: 15,
    howTo: 'Drag each parcel to the basket with the same face on its stamp.',
    prizes: prizes('parcel', 'mailbox', 'parcel_stack', 'carrier_pigeon', [25, 50, 75]) },
  { id: 'hide', name: 'Hide and Seek', host: 'hush', unlockLevel: 8, seconds: 45, maxScore: 100, pointsPerRibbon: 15,
    howTo: 'Everyone is hiding behind the furniture. Watch for peeking eyes and tap to find them!',
    prizes: prizes('hide', 'play_tent', 'peek_curtain', 'shadow_bunny', [30, 60, 90]) },
];

const companions: CompanionDef[] = [
  { id: 'button_mouse', name: 'Button Mouse', description: 'A tiny felt mouse who collects lost buttons.' },
  { id: 'paper_crane', name: 'Paper Crane', description: 'A folded crane that remembers every card it has seen.' },
  { id: 'tiny_tortoise', name: 'Tiny Tortoise', description: 'Slow, steady, and covered in little stitched symbols.' },
  { id: 'teapot_sprite', name: 'Teapot Sprite', description: 'Always warm, always ready to share a cup.' },
  { id: 'yarn_kitten', name: 'Yarn Kitten', description: 'Half kitten, half ball of yarn, all cuddles.' },
  { id: 'bumblebee', name: 'Bumblebee', description: 'A fuzzy helper who hums to the flowers.' },
  { id: 'curious_owl', name: 'Curious Owl', description: 'Notices everything, especially small changes.' },
  { id: 'firefly', name: 'Firefly', description: 'A gentle glow that never strays far.' },
  { id: 'carrier_pigeon', name: 'Carrier Pigeon', description: 'Delivers tiny letters between friends.' },
  { id: 'shadow_bunny', name: 'Shadow Bunny', description: 'A shy bunny who is very good at hiding.' },
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
  { level: 4, hearts: 55, unlocks: ['gardening'], label: 'Gardening' },
  { level: 5, hearts: 90, unlocks: ['yard_expansion', 'succulents'], label: 'Bigger yard and the Succulent Garden' },
  { level: 6, hearts: 125, unlocks: ['rain_decor'], label: 'Rainy-day decor' },
  { level: 7, hearts: 160, unlocks: ['expeditions'], label: 'Expeditions' },
  { level: 8, hearts: 195, unlocks: ['tranquil_decor'], label: 'Tranquil decor' },
  { level: 9, hearts: 230, unlocks: ['heirloom'], label: 'Heirloom restoring' },
  { level: 10, hearts: 270, unlocks: ['exterior'], label: 'Wishing Lantern' },
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
  { id: 'woodpile', name: 'Woodpile', roomId: YARD_ID, yield: { wood: 12 }, cooldownMs: 4 * 3_600_000 },
  { id: 'berry_bush', name: 'Button Berry Bush', roomId: YARD_ID, yield: { buttons: 100 }, cooldownMs: 4 * 3_600_000 },
  { id: 'cotton_patch', name: 'Cotton Patch', roomId: YARD_ID, yield: { fabric: 8 }, cooldownMs: 4 * 3_600_000, requiresUnlock: 'gardening' },
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
  // Art Brief 10 (Milestone E): one new costume per resident. A costume stays `hidden` until all five
  // of its poses (idle, walk, walk2, sit, sleep) have been delivered, reviewed and imported; then
  // remove the flag. Hidden costumes are not shown in the Wardrobe and cannot be bought.
  {
    id: 'snug_cape', residentId: 'snug', name: 'Dreamtime Cape',
    description: 'A quilted lavender blanket-cape with stitched stars, for naps on the go.', cost: { ribbons: 12 }, requiresLevel: 1,
  },
  {
    id: 'tinker_apron', residentId: 'tinker', name: 'Workshop Apron',
    description: 'A felt apron with two pockets, a tiny spanner and a pencil.', cost: { ribbons: 12 }, requiresLevel: 2,
  },
  {
    id: 'bloomi_bonnet', residentId: 'bloomi', name: 'Petal Bonnet',
    description: 'A sunflower-petal bonnet tied under the chin.', cost: { ribbons: 12 }, requiresLevel: 4,
  },
  {
    id: 'mischi_party', residentId: 'mischi', name: 'Party Surprise',
    description: 'A striped party hat with a pom-pom, and a ribbon streamer to wave.', cost: { ribbons: 15 }, requiresLevel: 3,
  },
  {
    id: 'glim_comet', residentId: 'glim', name: 'Comet Scarf',
    description: 'A long pale-yellow scarf that trails behind like a comet tail.', cost: { ribbons: 15 }, requiresLevel: 5,
  },
  {
    id: 'mopey_boots', residentId: 'mopey', name: 'Puddle Boots',
    description: 'Little yellow rain boots and a folded paper boat.', cost: { ribbons: 15 }, requiresLevel: 6,
  },
  {
    id: 'pippo_pack', residentId: 'pippo', name: 'Trail Pack',
    description: 'A rolled-blanket backpack with a tin mug and a compass badge.', cost: { ribbons: 18 }, requiresLevel: 7,
  },
  {
    id: 'hush_cloak', residentId: 'hush', name: 'Stargazer Cloak',
    description: 'A midnight-blue cloak stitched with constellations, and a tiny telescope.', cost: { ribbons: 18 }, requiresLevel: 8,
  },
  {
    id: 'patcha_quilt', residentId: 'patcha', name: 'Memory Quilt',
    description: 'A patchwork poncho where every square has its own stitch.', cost: { ribbons: 20 }, requiresLevel: 9,
  },
  {
    id: 'luma_crown', residentId: 'luma', name: 'Wish Crown',
    description: 'A small crown of folded paper stars with a soft golden glow.', cost: { ribbons: 20 }, requiresLevel: 10,
  },
];

const expeditions: ExpeditionDef[] = [
  {
    id: 'meadow', name: 'Clover Meadow', description: 'A short stroll for wildflowers and lost buttons.',
    durationMs: 60 * 60_000, reward: { wood: 4, fabric: 2, keepsakes: 1, ribbons: 2, hearts: 2 }, requiresUnlock: 'expeditions',
  },
  {
    id: 'old_mill', name: 'The Old Mill', description: 'A longer trip to the creaky mill by the stream. Something there is waiting to be found.',
    durationMs: 4 * 60 * 60_000, reward: { buttons: 60, keepsakes: 3, ribbons: 4, hearts: 4 }, requiresUnlock: 'expeditions',
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
    furnitureCost: { buttons: 100 },
    rarityWeights: { Common: 70, Rare: 25, Epic: 4, Secret: 1 },
    series: SERIES_1,
    furniture: ['potted_fern', 'side_table', 'picture_frame', 'moon_lantern', 'toy_chest', 'hanging_plant', 'tea_table'],
    guaranteedFirst: 'mischi',
    duplicateThread: 5,
  },
];

// Succulent Garden, Phase 1 (grow and sell). Our own sweet-treat species; every number is PROPOSED.
// Seedlings are green; the colour blends to each species' own colour as it grows. Plan: Succulent Garden proposal.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const succulents: SucculentDef[] = [
  {
    id: 'meringue_rose', name: 'Meringue Rose', description: 'A swirl of plump leaves that curl up into soft peaks.',
    seedCost: { buttons: 40 }, sproutMs: 30 * MINUTE, growMs: 4 * HOUR, sellPrice: { buttons: 100 },
    colour: 'blueberry', anchor: 'centre',
  },
  {
    id: 'gumdrop_cluster', name: 'Gumdrop Cluster', description: 'A low mound of round, bead-like leaves.',
    seedCost: { buttons: 50 }, sproutMs: 30 * MINUTE, growMs: 5 * HOUR, sellPrice: { buttons: 125 },
    colour: 'taro', anchor: 'base',
  },
  {
    id: 'stitchback', name: 'Stitchback', description: 'Tall pointed leaves with a neat stitched seam down each one.',
    seedCost: { buttons: 60 }, sproutMs: 30 * MINUTE, growMs: 6 * HOUR, sellPrice: { buttons: 150 },
    colour: 'apricot', anchor: 'base',
  },
  {
    id: 'teacup_tree', name: 'Teacup Tree', description: 'A tiny tree whose leaves are little cupped saucers.',
    seedCost: { buttons: 80 }, sproutMs: 30 * MINUTE, growMs: 7 * HOUR, sellPrice: { buttons: 200 },
    colour: 'strawberry', anchor: 'base',
  },
  {
    id: 'ribbon_fall', name: 'Ribbon Fall', description: 'Long braided strands that tumble over the side of the pot.',
    seedCost: { buttons: 100 }, sproutMs: 30 * MINUTE, growMs: 8 * HOUR, sellPrice: { buttons: 250 },
    colour: 'plum', anchor: 'top',
  },
];

// Colours every species can grow into (Phase 2). Each species starts in its own; pollinating mixes them.
const succulentColours: SucculentColourDef[] = [
  { id: 'blueberry', name: 'Blueberry', mature: '#b3cced', blush: '#f26b8c' },
  { id: 'taro', name: 'Taro', mature: '#ccbaed', blush: '#eb6b9e' },
  { id: 'apricot', name: 'Apricot', mature: '#facca3', blush: '#ed6b40' },
  { id: 'strawberry', name: 'Strawberry', mature: '#f5b8c7', blush: '#e04761' },
  { id: 'plum', name: 'Plum', mature: '#b88abd', blush: '#ed668c' },
];

// Leaf patterns (Phase 3), drawn in code. Shop seeds are plain; patterns appear when seeds mutate and are then inherited.
const succulentPatterns: SucculentPatternDef[] = [
  { id: 'plain', name: '', description: 'No pattern.' },
  { id: 'zebra', name: 'Zebra', description: 'Fine cream stripes across the leaves.' },
  { id: 'red_border', name: 'Ruby-edged', description: 'A thin red line around each leaf.' },
  { id: 'tipped', name: 'Cherry-tipped', description: 'Deep cherry-red leaf tips.' },
];

const gardenTools: GardenToolDef[] = [
  { id: 'sun_shelf', name: 'Sun Shelf', description: 'More sun: plants flower twice as soon and blush deeper.', cost: { buttons: 500, wood: 20 } },
  { id: 'pollen_jar', name: 'Pollen Jar', description: 'Saves extra pollen: every seed pod holds one more seed.', cost: { buttons: 400, wood: 10 } },
  { id: 'loupe', name: 'Loupe', description: 'Look closely at your seeds to see what colour and pattern they will grow into, and pick which to plant.', cost: { buttons: 800, wood: 15 } },
];

const gardenGoals: GardenGoalDef[] = [
  { id: 'g_first_sale', title: 'First harvest', description: 'Grow a succulent and sell it.', check: { kind: 'sold', count: 1 }, reward: { buttons: 60, hearts: 2 } },
  { id: 'g_first_pod', title: 'Busy brush', description: 'Pollinate a flower and collect its seed pod.', check: { kind: 'pods', count: 1 }, reward: { buttons: 80, hearts: 2 } },
  { id: 'g_book_5', title: 'Little collection', description: 'Fill 5 spaces in the Succulent book.', check: { kind: 'discovered', count: 5 }, reward: { wood: 5, hearts: 3 } },
  { id: 'g_tool', title: 'Proper gardener', description: 'Buy a garden tool.', check: { kind: 'tools', count: 1 }, reward: { wood: 10, hearts: 3 } },
  { id: 'g_gift', title: 'A plant for a friend', description: 'Give a grown succulent to a resident.', check: { kind: 'gifts', count: 1 }, reward: { buttons: 80, hearts: 2 } },
  { id: 'g_pattern', title: 'Something different', description: 'Grow a succulent with a leaf pattern.', check: { kind: 'patterns', count: 1 }, reward: { buttons: 150, hearts: 4 } },
  { id: 'g_book_15', title: 'Green fingers', description: 'Fill 15 spaces in the Succulent book.', check: { kind: 'discovered', count: 15 }, reward: { buttons: 200, hearts: 5 } },
  { id: 'g_patterns_3', title: 'Every pattern', description: 'Grow all three leaf patterns.', check: { kind: 'patterns', count: 3 }, reward: { buttons: 250, hearts: 6 } },
  { id: 'g_book_25', title: 'Complete Succulent book', description: 'Fill all 25 spaces in the Succulent book.', check: { kind: 'discovered', count: 25 }, reward: { buttons: 400, hearts: 10 } },
];

/**
 * Every grown succulent can be put on show in a room (Phase 4). One furniture definition per
 * shape, colour and pattern; the game draws it from the plant art in its pot. Ribbon Fall hangs.
 */
function succulentFurniture(): FurnitureDef[] {
  const out: FurnitureDef[] = [];
  for (const sp of succulents)
    for (const col of succulentColours)
      for (const pat of succulentPatterns) {
        const name = `${pat.name} ${col.name} ${sp.name}`.trim();
        out.push({
          id: pat.id === 'plain' ? `succ_${sp.id}_${col.id}` : `succ_${sp.id}_${col.id}_${pat.id}`,
          name,
          layer: sp.anchor === 'top' ? 'ceiling' : 'floor',
          w: 1,
          h: 1,
          tags: pat.id === 'plain' ? { Natural: 1, Calm: 1 } : { Natural: 2, Calm: 1 },
          canFlip: true,
          succulent: { speciesId: sp.id, colour: col.id, pattern: pat.id },
        });
      }
  return out;
}

// Research: studies that make timers shorter (and one that makes new colours and patterns likelier).
// Every number is PROPOSED. Pictures reuse art already in the game.
const STUDY_LEVELS = [
  { cost: { buttons: 200 }, ms: HOUR },
  { cost: { buttons: 500, wood: 5 }, ms: 4 * HOUR },
  { cost: { buttons: 1000, wood: 10 }, ms: 12 * HOUR },
];
const studies: ResearchStudyDef[] = [
  { id: 'green_thumb', name: 'Green Thumb', description: 'Succulents grow faster (and make offsets sooner).', icon: 'garden_pot', effect: 'grow', perLevel: 0.1, levels: STUDY_LEVELS },
  { id: 'busy_bees', name: 'Busy Bees', description: 'Succulents flower sooner and seed pods ripen faster.', icon: 'garden_brush', effect: 'flower', perLevel: 0.1, levels: STUDY_LEVELS },
  { id: 'quick_paws', name: 'Quick Paws', description: 'Outdoors trips come home sooner.', icon: 'exp_meadow', effect: 'trips', perLevel: 0.1, levels: STUDY_LEVELS },
  { id: 'warm_oven', name: 'Warm Oven', description: 'Baking takes less time (the Kitchen opens at Home Level 11).', icon: 'furn_little_oven', effect: 'baking', perLevel: 0.1, levels: STUDY_LEVELS },
  { id: 'bountiful_spots', name: 'Bountiful Spots', description: 'The berry bush, cotton patch and woodpile are ready again sooner.', icon: 'spot_berry_bush', effect: 'spots', perLevel: 0.1, levels: STUDY_LEVELS },
  { id: 'keen_eye', name: 'Keen Eye', description: 'Seeds are a little likelier to come out in a new colour or pattern.', icon: 'garden_loupe', effect: 'mutation', perLevel: 0.01, levels: STUDY_LEVELS },
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
  furniture: byId([...furniture, ...succulentFurniture()], (f) => f.id),
  residents: byId(residents, (r) => r.id),
  levels,
  recipes: byId(recipes, (r) => r.id),
  invitations: byId(invitations, (i) => i.residentId),
  tasks,
  parcels: byId(parcels, (p) => p.id),
  bond: { thresholds: [0, 3, 6, 12, 21], playCooldownMs: 30_000, playsPerDay: 3, playReward: { buttons: 10 }, heartsPerBondLevel: 3 },
  formUpgrades: [{ form: 'decorated', requiresBond: 2, cost: { buttons: 60, fabric: 3 }, hearts: 5 }],
  gatherSpots: byId(gatherSpots, (g) => g.id),
  costumes: byId(costumes, (c) => c.id),
  ribbons: { perPlay: 1, playsPerDay: 5 },
  arcade: { playsPerDay: 3, maxRibbonsPerGame: 5, maxRibbonsPerDay: 10, buttonsPerPoint: 0.5, maxButtonsPerDay: 150, order: arcadeGames.map((g) => g.id) },
  arcadeGames: byId(arcadeGames, (g) => g.id) as Record<ArcadeGameId, ArcadeGameDef>,
  companions: byId(companions, (c) => c.id),
  expeditions: byId(expeditions, (e) => e.id),
  baking: null,
  dailyGift: { buttons: 50, buttonsPerLevel: 5 },
  research: { studies: byId(studies, (x) => x.id), order: studies.map((x) => x.id) },
  garden: {
    unlock: 'succulents',
    species: byId(succulents, (x) => x.id),
    order: succulents.map((x) => x.id),
    startPots: 3,
    maxPots: 6,
    potCost: { buttons: 150, wood: 5 },
    heartsPerNewSpecies: 3,
    seedlingColour: '#8fc780',
    colours: byId(succulentColours, (x) => x.id),
    colourOrder: succulentColours.map((x) => x.id),
    bloomMs: 2 * HOUR,
    podMs: 4 * HOUR,
    seedsPerPod: 2,
    mutationChance: 0.05,
    offsetMs: 8 * HOUR,
    newColourSellBonus: 1.5,
    heartsPerDiscovery: 1,
    patterns: byId(succulentPatterns, (x) => x.id),
    patternOrder: succulentPatterns.map((x) => x.id),
    patternMutationChance: 0.04,
    patternSellBonus: 1.3,
    tools: byId(gardenTools, (x) => x.id) as GardenRules['tools'],
    toolOrder: gardenTools.map((x) => x.id),
    sunBloomFactor: 0.5,
    pollenJarSeeds: 1,
    giftBondXp: 2,
    goals: gardenGoals,
  },
  series: [{ id: SERIES_1, name: 'First Residents' }],
  roomOrder: [LIVING_ROOM_ID, SUNROOM_ID, YARD_ID],
  rules: { heartsPerNewResident: 5, heartsPerFirstCraft: 2, maxCopiesCounted: 2, maxActiveResidents: 4, maxResidentsPerRoom: 4, threadPerStamp: 10, dayOffsetMs: 0 },
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

export { SERIES_2, KITCHEN_ID, TEA_GARDEN_ID, withSeries2 } from './series2';
import { withSeries2 } from './series2';

/**
 * The game with Series 2 "Teatime Friends" added (Home Levels 11 to 20). Not released yet:
 * the live game uses `content` until all Series 2 art is in. See docs/series-2-plan.md.
 */
export const contentWithSeries2: Content = withSeries2(content);
