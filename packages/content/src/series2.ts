import type {
  BakeRecipeDef,
  Content,
  CostumeDef,
  ExpeditionDef,
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
 * Series 2 "Teatime Friends": Home Levels 11 to 20, the Kitchen and the Tea Garden, ten new
 * residents, Baking and Treats. Plan: docs/series-2-plan.md.
 * Every number here is a PROPOSED value, tuned with the scripted player in packages/core/test.
 */

export const SERIES_2 = 'teatime_friends';
export const KITCHEN_ID = 'kitchen';
export const TEA_GARDEN_ID = 'tea_garden';
const SERIES_1 = 'first_residents';
const YARD_ID = 'yard';
const HOUR = 3_600_000;

const rooms: RoomDef[] = [
  {
    id: KITCHEN_ID, name: 'Kitchen', cols: 10, rows: 5, door: { col: 1, row: 0 }, theme: 'kitchen',
    access: { unlock: 'kitchen', cost: { buttons: 600, wood: 40 } },
  },
  {
    id: TEA_GARDEN_ID, name: 'Tea Garden', cols: 12, rows: 5, door: { col: 0, row: 0 }, theme: 'teagarden', walls: false,
    access: { unlock: 'tea_garden', cost: { buttons: 800, wood: 50 } },
  },
];

const furniture: FurnitureDef[] = [
  { id: 'little_oven', name: 'Little Oven', layer: 'floor', w: 1, h: 1, tags: { Tasty: 2, Warm: 1 }, canFlip: true },
  { id: 'kitchen_counter', name: 'Kitchen Counter', layer: 'floor', w: 2, h: 1, tags: { Tasty: 2 }, canFlip: true },
  { id: 'tea_trolley', name: 'Tea Trolley', layer: 'floor', w: 1, h: 1, tags: { Calm: 2, Tasty: 1 }, canFlip: true },
  { id: 'cake_stand', name: 'Cake Stand', layer: 'floor', w: 1, h: 1, tags: { Sweet: 2 }, canFlip: false },
  { id: 'jam_shelf', name: 'Jam Shelf', layer: 'wall', w: 2, h: 1, tags: { Sweet: 1, Tasty: 1 }, canFlip: false },
  { id: 'bamboo_steamer', name: 'Bamboo Steamer', layer: 'floor', w: 1, h: 1, tags: { Tasty: 2 }, canFlip: false },
  { id: 'spice_rack', name: 'Spice Rack', layer: 'wall', w: 1, h: 1, tags: { Tasty: 1, Warm: 1 }, canFlip: false },
  { id: 'gingham_curtains', name: 'Gingham Curtains', layer: 'wall', w: 2, h: 1, tags: { Sweet: 1, Calm: 2 }, canFlip: false, overlay: true },
  { id: 'flour_sacks', name: 'Flour Sacks', layer: 'floor', w: 1, h: 1, tags: { Tasty: 1, Crafty: 1 }, canFlip: true },
  { id: 'cookie_jar', name: 'Cookie Jar', layer: 'floor', w: 1, h: 1, tags: { Sweet: 2, Playful: 1 }, canFlip: false },
  { id: 'checkered_rug', name: 'Checkered Rug', layer: 'rug', w: 2, h: 2, tags: { Warm: 1, Tasty: 1 }, canFlip: false },
  { id: 'breakfast_nook', name: 'Breakfast Nook', layer: 'floor', w: 2, h: 1, tags: { Warm: 1, Calm: 1 }, canFlip: true, rest: 'sit' },
  { id: 'hanging_pans', name: 'Hanging Pans', layer: 'wall', w: 2, h: 1, tags: { Tasty: 2 }, canFlip: false },
  { id: 'candy_bunting', name: 'Candy Bunting', layer: 'wall', w: 2, h: 1, tags: { Sweet: 2, Playful: 1 }, canFlip: false },
  { id: 'berry_patch', name: 'Berry Patch', layer: 'floor', w: 2, h: 1, tags: { Natural: 2, Sweet: 1 }, canFlip: false },
  { id: 'old_oven', name: 'Old Oven', layer: 'floor', w: 1, h: 1, tags: { Warm: 2, Calm: 1 }, canFlip: true },
  { id: 'tea_party_table', name: 'Tea Party Table', layer: 'floor', w: 2, h: 1, tags: { Sweet: 3, Calm: 1 }, canFlip: false },
  // Tea Garden
  { id: 'garden_parasol', name: 'Garden Parasol', layer: 'floor', w: 1, h: 1, tags: { Calm: 2, Sweet: 1 }, canFlip: false },
  { id: 'macaron_stool', name: 'Macaron Stool', layer: 'floor', w: 1, h: 1, tags: { Sweet: 2 }, canFlip: false, rest: 'sit' },
  { id: 'teacup_planter', name: 'Teacup Planter', layer: 'floor', w: 1, h: 1, tags: { Natural: 1, Sweet: 1 }, canFlip: false },
  { id: 'picnic_blanket', name: 'Picnic Blanket', layer: 'rug', w: 2, h: 2, tags: { Sweet: 1, Playful: 1 }, canFlip: false },
  // Series rewards (never crafted or found in parcels)
  { id: 'first_residents_trophy', name: 'First Residents Keepsake', layer: 'floor', w: 1, h: 1, tags: { Warm: 2, Dreamy: 1 }, canFlip: false },
  { id: 'teatime_trophy', name: 'Teatime Keepsake', layer: 'floor', w: 1, h: 1, tags: { Sweet: 2, Calm: 1 }, canFlip: false },
];

const B = { idle: 3, wander: 4, rest: 3 };

const residents: ResidentDef[] = [
  {
    id: 'crumb', name: 'Crumb', rarity: 'Common', series: SERIES_2, joinLevel: 11,
    tagline: 'A little baker who is always covered in flour.', mood: 'Cheerful', favouriteTags: ['Tasty', 'Warm'],
    story: 'Crumb followed the smell of warm bread through the kitchen door and never left. Crumb counts everything in loaves, including time.',
    hint: 'Home Level 11. Invite with a Tasty, Warm Kitchen.',
    behaviour: { idle: 3, wander: 5, rest: 2 }, favouriteRest: 'sit', speed: 1.7, palette: { body: '#e9c79a', accent: '#b9783f' },
    favouriteBake: 'butter_cookies',
  },
  {
    id: 'whisk', name: 'Whisk', rarity: 'Common', series: SERIES_2, joinLevel: 12,
    tagline: 'A fluffy helper who stirs everything up.', mood: 'Bubbly', favouriteTags: ['Tasty', 'Playful'],
    story: 'Whisk arrived by post, wrapped in a tea towel, and immediately started stirring. Whisk cannot walk past a bowl without checking what is in it.',
    hint: 'Home Level 12. Comes in your first Teatime Parcel.',
    behaviour: { idle: 2, wander: 6, rest: 2 }, favouriteRest: 'sit', speed: 2.1, palette: { body: '#fbf1dc', accent: '#f0b84c' },
    favouriteBake: 'butter_cookies',
  },
  {
    id: 'mallow', name: 'Mallow', rarity: 'Common', series: SERIES_2, joinLevel: 12,
    tagline: 'A soft, round friend with whipped cream on top.', mood: 'Content', favouriteTags: ['Sweet', 'Calm'],
    story: 'Mallow is exactly as soft as Mallow looks. Mallow believes any problem gets smaller if you sit next to it with something sweet.',
    hint: 'Home Level 12. Invite with a Sweet, Calm Kitchen.',
    behaviour: { idle: 4, wander: 3, rest: 3 }, favouriteRest: 'sit', speed: 1.3, palette: { body: '#f6e3cf', accent: '#f1a7a0' },
    favouriteBake: 'jam_tarts',
  },
  {
    id: 'pekoe', name: 'Pekoe', rarity: 'Common', series: SERIES_2, joinLevel: 13,
    tagline: 'A calm tea friend who pours for everyone.', mood: 'Serene', favouriteTags: ['Calm', 'Tasty'],
    story: 'Pekoe pours the first cup for the house, the second for a guest, and waits until both are finished before pouring a third.',
    hint: 'Home Level 13. Place a Tea Trolley in a Calm Kitchen and offer Treats.',
    behaviour: { idle: 4, wander: 3, rest: 3 }, favouriteRest: 'sit', speed: 1.3, palette: { body: '#bcd4a0', accent: '#7a5b3c' },
    favouriteBake: 'jam_tarts',
  },
  {
    id: 'jammy', name: 'Jammy', rarity: 'Common', series: SERIES_2, joinLevel: 14,
    tagline: 'A berry-picking friend with sticky paws.', mood: 'Jolly', favouriteTags: ['Natural', 'Sweet'],
    story: 'Jammy picks two berries for the basket and one for Jammy. The basket is never quite full, and nobody minds.',
    hint: 'Home Level 14. Plant a Berry Patch in a Natural Yard and offer Treats.',
    behaviour: B, favouriteRest: 'sit', speed: 1.8, palette: { body: '#d9647a', accent: '#6fa25a' },
    favouriteBake: 'jam_tarts',
  },
  {
    id: 'dumple', name: 'Dumple', rarity: 'Common', series: SERIES_2, joinLevel: 15,
    tagline: 'A sleepy dumpling who naps where it is warm.', mood: 'Drowsy', favouriteTags: ['Tasty', 'Warm'],
    story: 'Lift the lid of a warm steamer slowly: Dumple is probably asleep inside. Dumple says it is the only bed that hugs back.',
    hint: 'Home Level 15. Place a Bamboo Steamer in a Tasty Kitchen and look inside.',
    behaviour: { idle: 3, wander: 2, rest: 5 }, favouriteRest: 'sleep', speed: 1.1, palette: { body: '#f4ead8', accent: '#c8a46a' },
    favouriteBake: 'honey_cake',
  },
  {
    id: 'sprinkle', name: 'Sprinkle', rarity: 'Rare', series: SERIES_2, joinLevel: 16,
    tagline: 'A party in a cupcake case.', mood: 'Excited', favouriteTags: ['Sweet', 'Playful'],
    story: 'Sprinkle leaves a trail of tiny coloured dots wherever Sprinkle has been dancing, which is everywhere.',
    hint: 'Home Level 16. Invite with a very Sweet, Playful Kitchen.',
    behaviour: { idle: 2, wander: 6, rest: 2 }, favouriteRest: 'sit', speed: 2.3, palette: { body: '#f7b6c9', accent: '#8fd3e8' },
    favouriteBake: 'honey_cake',
  },
  {
    id: 'toffee', name: 'Toffee', rarity: 'Rare', series: SERIES_2, joinLevel: 17,
    tagline: 'A market trader with a pocket full of sweets.', mood: 'Charming', favouriteTags: ['Sweet', 'Warm'],
    story: 'Toffee kept a stall at the Moonlit Market, trading sweets for stories. Yours was good enough that Toffee packed up the stall and came along.',
    hint: 'Home Level 17. Comes home from your first trip to the Moonlit Market.',
    behaviour: B, favouriteRest: 'sit', speed: 1.6, palette: { body: '#c98a4b', accent: '#f3d9a4' },
    favouriteBake: 'honey_cake',
  },
  {
    id: 'souffle', name: 'Soufflé', rarity: 'Epic', series: SERIES_2, joinLevel: 18,
    tagline: 'A delicate friend who rises only in a quiet room.', mood: 'Graceful', favouriteTags: ['Calm', 'Warm'],
    story: 'Soufflé lived in the Old Oven for longer than anyone remembers, waiting for a kitchen quiet enough to rise in. Please do not slam the door.',
    hint: 'Home Level 18. Restore the Old Oven, then invite to a very Calm Kitchen.',
    behaviour: { idle: 5, wander: 2, rest: 3 }, favouriteRest: 'sit', speed: 1.1, palette: { body: '#f6dc9c', accent: '#e9b25d' },
    favouriteBake: 'honey_cake',
  },
  {
    id: 'cherri', name: 'Cherri', rarity: 'Secret', series: SERIES_2, joinLevel: 20,
    tagline: 'The cherry on top of a perfect tea party.', mood: 'Radiant', favouriteTags: ['Sweet'],
    story: 'Cherri appears only when the table is laid, the tea is poured and every friend has a seat. Cherri is what makes it a party.',
    hint: 'Secret. Home Level 20, every other Teatime Friend, and a Tea Party Table in the Tea Garden.',
    behaviour: B, favouriteRest: 'sit', speed: 1.5, palette: { body: '#e8455a', accent: '#fdf3e3' },
    favouriteBake: 'honey_cake',
  },
];

const levels: LevelDef[] = [
  { level: 11, hearts: 310, unlocks: ['kitchen', 'baking'], label: 'The Kitchen and Baking' },
  { level: 12, hearts: 350, unlocks: ['teatime_parcels'], label: 'Teatime Parcels' },
  { level: 13, hearts: 390, unlocks: ['tea_service'], label: 'Tea service and Jam Tarts' },
  { level: 14, hearts: 430, unlocks: ['berry_patch'], label: 'Berry Patch' },
  { level: 15, hearts: 470, unlocks: ['tea_garden'], label: 'The Tea Garden' },
  { level: 16, hearts: 510, unlocks: ['party_decor'], label: 'Party decor and Honey Cake' },
  { level: 17, hearts: 550, unlocks: ['moonlit_market'], label: 'The Moonlit Market' },
  { level: 18, hearts: 590, unlocks: ['old_oven'], label: 'Old Oven restoring' },
  { level: 19, hearts: 630, unlocks: ['tea_party'], label: 'Tea Party Table' },
  { level: 20, hearts: 670, unlocks: ['grand_tea_party'], label: 'The Grand Tea Party' },
];

const recipes: RecipeDef[] = [
  { id: 'little_oven', furnitureId: 'little_oven', cost: { buttons: 120, wood: 6 }, requiresLevel: 11 },
  { id: 'kitchen_counter', furnitureId: 'kitchen_counter', cost: { buttons: 100, wood: 6 }, requiresLevel: 11 },
  { id: 'spice_rack', furnitureId: 'spice_rack', cost: { buttons: 60, wood: 3 }, requiresLevel: 11 },
  { id: 'flour_sacks', furnitureId: 'flour_sacks', cost: { buttons: 50, fabric: 3 }, requiresLevel: 11 },
  { id: 'checkered_rug', furnitureId: 'checkered_rug', cost: { buttons: 80, fabric: 5 }, requiresLevel: 11 },
  { id: 'cake_stand', furnitureId: 'cake_stand', cost: { buttons: 80, wood: 3 }, requiresLevel: 12 },
  { id: 'gingham_curtains', furnitureId: 'gingham_curtains', cost: { buttons: 90, fabric: 6 }, requiresLevel: 12 },
  { id: 'tea_trolley', furnitureId: 'tea_trolley', cost: { buttons: 120, wood: 6 }, requiresLevel: 13 },
  { id: 'breakfast_nook', furnitureId: 'breakfast_nook', cost: { buttons: 140, wood: 8, fabric: 4 }, requiresLevel: 13 },
  { id: 'berry_patch', furnitureId: 'berry_patch', cost: { buttons: 120, wood: 6 }, requiresLevel: 14 },
  { id: 'bamboo_steamer', furnitureId: 'bamboo_steamer', cost: { buttons: 120, wood: 8 }, requiresLevel: 15 },
  { id: 'hanging_pans', furnitureId: 'hanging_pans', cost: { buttons: 100, wood: 5 }, requiresLevel: 15 },
  { id: 'garden_parasol', furnitureId: 'garden_parasol', cost: { buttons: 120, wood: 5, fabric: 4 }, requiresLevel: 15 },
  { id: 'teacup_planter', furnitureId: 'teacup_planter', cost: { buttons: 70, wood: 3 }, requiresLevel: 15 },
  { id: 'cookie_jar', furnitureId: 'cookie_jar', cost: { buttons: 100, treats: 4 }, requiresLevel: 16 },
  { id: 'candy_bunting', furnitureId: 'candy_bunting', cost: { buttons: 100, fabric: 6 }, requiresLevel: 16 },
  { id: 'macaron_stool', furnitureId: 'macaron_stool', cost: { buttons: 90, fabric: 4 }, requiresLevel: 16 },
  { id: 'old_oven', furnitureId: 'old_oven', cost: { wood: 20, keepsakes: 6, treats: 10 }, requiresLevel: 18 },
  { id: 'picnic_blanket', furnitureId: 'picnic_blanket', cost: { buttons: 100, fabric: 8 }, requiresLevel: 19 },
  { id: 'tea_party_table', furnitureId: 'tea_party_table', cost: { buttons: 300, wood: 15, treats: 15 }, requiresLevel: 19 },
];

const TEATIME_NINE = ['crumb', 'whisk', 'mallow', 'pekoe', 'jammy', 'dumple', 'sprinkle', 'toffee', 'souffle'];

const invitations: InvitationDef[] = [
  {
    residentId: 'crumb', requiresLevel: 11, roomId: KITCHEN_ID,
    atmosphere: { Tasty: 4, Warm: 2 }, welcomeGift: { wood: 4 },
    welcomeText: 'Make the Kitchen tasty and warm, and leave 4 Wood to keep the oven going.',
  },
  {
    residentId: 'mallow', requiresLevel: 12, roomId: KITCHEN_ID,
    atmosphere: { Sweet: 3, Calm: 2 }, welcomeGift: { treats: 3 },
    welcomeText: 'Give the Kitchen a sweet, calm corner and offer 3 Treats.',
  },
  {
    residentId: 'pekoe', requiresLevel: 13, roomId: KITCHEN_ID,
    atmosphere: { Calm: 4 }, requiresPlaced: ['tea_trolley'], welcomeGift: { treats: 4 },
    welcomeText: 'Place a Tea Trolley in a calm Kitchen and offer 4 Treats to go with the tea.',
  },
  {
    residentId: 'jammy', requiresLevel: 14, roomId: YARD_ID,
    atmosphere: { Natural: 5, Sweet: 1 }, requiresPlaced: ['berry_patch'], welcomeGift: { treats: 4 },
    welcomeText: 'Plant a Berry Patch in a leafy Yard and offer 4 Treats.',
  },
  {
    residentId: 'dumple', requiresLevel: 15, roomId: KITCHEN_ID,
    atmosphere: { Tasty: 7 }, requiresPlaced: ['bamboo_steamer'], welcomeGift: { fabric: 4 },
    welcomeText: 'Place a Bamboo Steamer in a very tasty Kitchen and leave 4 Fabric for a blanket. Then lift the lid.',
  },
  {
    residentId: 'sprinkle', requiresLevel: 16, roomId: KITCHEN_ID,
    atmosphere: { Sweet: 7, Playful: 2 }, welcomeGift: { treats: 6 },
    welcomeText: 'Make the Kitchen very sweet and playful, and offer 6 Treats for the party.',
  },
  {
    residentId: 'souffle', requiresLevel: 18, roomId: KITCHEN_ID,
    atmosphere: { Calm: 7 }, requiresPlaced: ['old_oven'], welcomeGift: { treats: 8 },
    welcomeText: 'Restore the Old Oven, place it in a very calm Kitchen and offer 8 Treats.',
  },
  {
    residentId: 'cherri', requiresLevel: 20, roomId: TEA_GARDEN_ID,
    atmosphere: { Sweet: 8, Calm: 2 }, requiresPlaced: ['tea_party_table'], requiresOwned: TEATIME_NINE,
    welcomeGift: { treats: 12 },
    welcomeText: 'Lay the Tea Party Table in a very sweet Tea Garden once every other Teatime Friend lives with you, and offer 12 Treats.',
  },
];

const expeditions: ExpeditionDef[] = [
  {
    id: 'moonlit_market', name: 'The Moonlit Market', description: 'A night market of lanterns and sweet stalls. One trader there loves a good story.',
    durationMs: 4 * HOUR, reward: { buttons: 80, treats: 5, keepsakes: 3, ribbons: 4, hearts: 4 }, requiresUnlock: 'moonlit_market',
    firstTimeResident: 'toffee',
  },
];

const bakes: BakeRecipeDef[] = [
  { id: 'butter_cookies', name: 'Butter Cookies', description: 'Quick and crumbly. Ready in an hour.', durationMs: HOUR, cost: { buttons: 20 }, treats: 3, requiresLevel: 11 },
  { id: 'jam_tarts', name: 'Jam Tarts', description: 'Sticky, shiny and worth the wait.', durationMs: 4 * HOUR, cost: { buttons: 40 }, treats: 6, requiresLevel: 13 },
  { id: 'honey_cake', name: 'Honey Cake', description: 'A slow bake for a long day out.', durationMs: 8 * HOUR, cost: { buttons: 60, wood: 2 }, treats: 10, requiresLevel: 16 },
];

const parcels: ParcelPoolDef[] = [
  {
    // A Friend Parcel always holds a friend, so it costs about what a friend cost on average
    // when parcels were a 60/40 mix at 8 Treats.
    id: 'teatime', name: 'Teatime Parcel', cost: { treats: 12 }, furnitureCost: { treats: 4 }, requiresUnlock: 'teatime_parcels',
    rarityWeights: { Common: 70, Rare: 25, Epic: 4, Secret: 1 },
    series: SERIES_2,
    furniture: ['spice_rack', 'flour_sacks', 'cake_stand', 'jam_shelf', 'cookie_jar', 'teacup_planter', 'checkered_rug'],
    guaranteedFirst: 'whisk',
    duplicateThread: 5,
  },
];

// One costume per Teatime Friend (art imported and reviewed 16 Nov 2026).
const costumes: CostumeDef[] = [
  {
    id: 'crumb_chef', residentId: 'crumb', name: 'Grand Chef Whites',
    description: "A tall puffy chef's hat and a white double-buttoned jacket with a red neckerchief.", cost: { ribbons: 12 }, requiresLevel: 11,
  },
  {
    id: 'whisk_bee', residentId: 'whisk', name: 'Honeybee Hoodie',
    description: 'A stripy yellow-and-brown hooded cape with two bobbly antennae.', cost: { ribbons: 12 }, requiresLevel: 12,
  },
  {
    id: 'mallow_pyjamas', residentId: 'mallow', name: 'Marshmallow Pyjamas',
    description: 'A pastel pink nightcap with a pom-pom and matching fluffy slippers.', cost: { ribbons: 12 }, requiresLevel: 12,
  },
  {
    id: 'pekoe_robe', residentId: 'pekoe', name: 'Garden Tea Robe',
    description: 'A sage-green wrap robe with a cream sash and a woven sun hat.', cost: { ribbons: 15 }, requiresLevel: 13,
  },
  {
    id: 'jammy_picker', residentId: 'jammy', name: 'Berry Picker',
    description: 'A wide straw hat with a strawberry ribbon and a little wicker basket on the back.', cost: { ribbons: 15 }, requiresLevel: 14,
  },
  {
    id: 'dumple_snow', residentId: 'dumple', name: 'Snow Day Knits',
    description: 'A pale blue bobble hat, mittens and a long knitted scarf.', cost: { ribbons: 15 }, requiresLevel: 15,
  },
  {
    id: 'sprinkle_tutu', residentId: 'sprinkle', name: 'Sugar Plum Tutu',
    description: 'A lilac tutu with sugar-crystal sparkles and a tiny tiara.', cost: { ribbons: 18 }, requiresLevel: 16,
  },
  {
    id: 'toffee_coat', residentId: 'toffee', name: 'Market Day Coat',
    description: "A long plum trader's coat with gold buttons and a paper lantern on a stick.", cost: { ribbons: 18 }, requiresLevel: 17,
  },
  {
    id: 'souffle_hat', residentId: 'souffle', name: 'Garden Party Hat',
    description: 'A wide-brimmed cream hat piled with roses, and a rose corsage.', cost: { ribbons: 20 }, requiresLevel: 18,
  },
  {
    id: 'cherri_sundae', residentId: 'cherri', name: 'Sundae Best',
    description: 'A whipped-cream swirl hat with sprinkles and a little wafer cape.', cost: { ribbons: 20 }, requiresLevel: 20,
  },
];

const L = (n: number) => n;
const tasks: TaskDef[] = [
  {
    id: 'open_kitchen', title: 'Something smells good', description: 'Open the Kitchen (Home Level 11).', fromLevel: L(11),
    condition: { kind: 'purchased', key: `${KITCHEN_ID}:open` }, reward: { buttons: 80, wood: 10, hearts: 6 }, goTo: 'build',
  },
  {
    id: 'first_bake', title: 'First batch', description: 'Bake something in the Kitchen and collect the Treats.', fromLevel: L(11),
    condition: { kind: 'baked', count: 1 }, reward: { buttons: 40, fabric: 4, hearts: 4 }, goTo: 'kitchen',
  },
  {
    id: 'meet_crumb', title: 'Flour everywhere', description: 'Invite Crumb to the Kitchen.', fromLevel: L(11),
    condition: { kind: 'owns_resident', residentId: 'crumb' }, reward: { buttons: 60, wishStamps: 1, hearts: 8 }, goTo: 'invitations',
  },
  {
    id: 'meet_whisk', title: 'Wrapped in a tea towel', description: 'Open a Teatime Parcel (Home Level 12).', fromLevel: L(12),
    condition: { kind: 'owns_resident', residentId: 'whisk' }, reward: { buttons: 60, fabric: 4, hearts: 6 }, goTo: 'parcels',
  },
  {
    id: 'meet_mallow', title: 'Soft landing', description: 'Invite Mallow.', fromLevel: L(12),
    condition: { kind: 'owns_resident', residentId: 'mallow' }, reward: { buttons: 60, wood: 6, hearts: 8 }, goTo: 'invitations',
  },
  {
    id: 'meet_pekoe', title: 'Time for tea', description: 'Invite Pekoe (Home Level 13).', fromLevel: L(13),
    condition: { kind: 'owns_resident', residentId: 'pekoe' }, reward: { buttons: 80, wishStamps: 1, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'meet_jammy', title: 'Sticky paws', description: 'Invite Jammy to the Yard (Home Level 14).', fromLevel: L(14),
    condition: { kind: 'owns_resident', residentId: 'jammy' }, reward: { buttons: 80, wood: 8, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'open_tea_garden', title: 'Tea outdoors', description: 'Open the Tea Garden (Home Level 15).', fromLevel: L(15),
    condition: { kind: 'purchased', key: `${TEA_GARDEN_ID}:open` }, reward: { buttons: 80, fabric: 6, hearts: 8 }, goTo: 'build',
  },
  {
    id: 'meet_dumple', title: 'Lift the lid', description: 'Find Dumple in the Bamboo Steamer.', fromLevel: L(15),
    condition: { kind: 'owns_resident', residentId: 'dumple' }, reward: { buttons: 80, keepsakes: 2, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'bakers_dozen', title: "Baker's habit", description: 'Collect 8 batches from the oven.', fromLevel: L(15),
    condition: { kind: 'baked', count: 8 }, reward: { buttons: 80, wishStamps: 1, hearts: 6 }, goTo: 'kitchen',
  },
  {
    id: 'meet_sprinkle', title: 'Confetti', description: 'Invite Sprinkle (Home Level 16).', fromLevel: L(16),
    condition: { kind: 'owns_resident', residentId: 'sprinkle' }, reward: { buttons: 100, fabric: 6, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'meet_toffee', title: 'A story for a sweet', description: 'Bring Toffee home from the Moonlit Market (Home Level 17).', fromLevel: L(17),
    condition: { kind: 'owns_resident', residentId: 'toffee' }, reward: { buttons: 100, keepsakes: 2, hearts: 10 }, goTo: 'explore',
  },
  {
    id: 'old_oven', title: 'Warm again', description: 'Restore the Old Oven and place it in the Kitchen (Home Level 18).', fromLevel: L(18),
    condition: { kind: 'placed', roomId: KITCHEN_ID, furnitureIds: ['old_oven'] }, reward: { fabric: 6, hearts: 8 }, goTo: 'build',
  },
  {
    id: 'meet_souffle', title: 'Quiet, please', description: 'Invite Soufflé.', fromLevel: L(18),
    condition: { kind: 'owns_resident', residentId: 'souffle' }, reward: { buttons: 120, keepsakes: 2, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'lay_the_table', title: 'Lay the table', description: 'Craft the Tea Party Table and place it in the Tea Garden (Home Level 19).', fromLevel: L(19),
    condition: { kind: 'placed', roomId: TEA_GARDEN_ID, furnitureIds: ['tea_party_table'] }, reward: { buttons: 100, hearts: 10 }, goTo: 'build',
  },
  {
    id: 'meet_cherri', title: 'The cherry on top', description: 'Hold the Grand Tea Party and invite the secret friend (Home Level 20).', fromLevel: L(20),
    condition: { kind: 'owns_resident', residentId: 'cherri' }, reward: { buttons: 150, hearts: 10 }, goTo: 'invitations',
  },
  {
    id: 'teatime_set', title: 'A full table', description: 'Collect the Teatime Friends reward in the Nookbook.', fromLevel: L(20),
    condition: { kind: 'series_claimed', seriesId: SERIES_2 }, reward: { buttons: 100, hearts: 5 }, goTo: 'nookbook',
  },
];

function add<T>(base: Record<string, T>, extra: T[], key: (t: T) => string): Record<string, T> {
  const out = { ...base };
  for (const item of extra) {
    const id = key(item);
    if (out[id]) throw new Error(`Duplicate definition id: ${id}`);
    out[id] = item;
  }
  return out;
}

export function withSeries2(base: Content): Content {
  return {
    ...base,
    rooms: add(base.rooms, rooms, (r) => r.id),
    furniture: add(base.furniture, furniture, (f) => f.id),
    residents: add(base.residents, residents, (r) => r.id),
    levels: [...base.levels, ...levels],
    recipes: add(base.recipes, recipes, (r) => r.id),
    invitations: add(base.invitations, invitations, (i) => i.residentId),
    tasks: [...base.tasks, ...tasks],
    parcels: add(base.parcels, parcels, (p) => p.id),
    expeditions: add(base.expeditions, expeditions, (e) => e.id),
    costumes: add(base.costumes, costumes, (c) => c.id),
    roomOrder: [...base.roomOrder, KITCHEN_ID, TEA_GARDEN_ID],
    baking: {
      roomId: KITCHEN_ID,
      recipes: Object.fromEntries(bakes.map((b) => [b.id, b])),
      order: bakes.map((b) => b.id),
      bakerSeries: SERIES_2,
      bakerBonus: 1,
      favouriteBonus: 1,
      giftCost: { treats: 1 },
      giftBondXp: 1,
    },
    series: [
      { id: SERIES_1, name: 'First Residents', reward: { cost: { ribbons: 10 }, furnitureId: 'first_residents_trophy' } },
      { id: SERIES_2, name: 'Teatime Friends', reward: { cost: { ribbons: 15 }, furnitureId: 'teatime_trophy' } },
    ],
  };
}
