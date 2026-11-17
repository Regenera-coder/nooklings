/** Shared data shapes. Definitions (content) are static; GameState is the saved, mutable part. */

/** floor blocks walking; rug is flat and walkable; wall hangs on the back wall; ceiling hangs above a floor cell. */
export type Layer = 'floor' | 'rug' | 'wall' | 'ceiling';

export interface Cell {
  col: number;
  row: number;
}

export type Currency = 'buttons' | 'wood' | 'fabric' | 'wishStamps' | 'mendingThread' | 'keepsakes' | 'ribbons' | 'treats';
export type Cost = Partial<Record<Currency, number>>;

export interface FurnitureDef {
  id: string;
  name: string;
  /** floor = blocks walking; rug = flat, walkable; wall = hangs on the back wall. */
  layer: Layer;
  /** Footprint in cells. Wall items use w slots along the back wall and h = 1. */
  w: number;
  h: number;
  /** Atmosphere tags, e.g. { Dreamy: 2, Calm: 1 }. PROPOSED values, unbalanced. */
  tags: Record<string, number>;
  canFlip: boolean;
  /** Optional resident interaction this furniture offers. */
  rest?: 'sleep' | 'sit';
  /** Wall items only: can hang over another wall item (curtains over a window). */
  overlay?: boolean;
  /** A grown succulent put on show: drawn from the plant art, tinted, in its pot (no furn_ image). */
  succulent?: { speciesId: string; colour: string; pattern: string };
}

export interface RoomDef {
  id: string;
  name: string;
  cols: number;
  rows: number;
  /** Floor cell in front of the doorway. Must always stay free and reachable. */
  door: Cell;
  /** false for outdoor spaces: no back wall, so no wall items. Default true. */
  walls?: boolean;
  /** Placeholder look until room art exists. */
  theme: 'living' | 'sunroom' | 'yard' | 'kitchen' | 'teagarden';
  /** Room must be opened: needs a level unlock, then a one-off purchase. */
  access?: { unlock: string; cost: Cost };
  /** Optional expansion: before it is bought only the first baseCols columns are usable. */
  expansion?: { unlock: string; cost: Cost; baseCols: number };
}

/** A costume a resident can wear over their Original or Decorated look. Bought once with Ribbons. */
export interface CostumeDef {
  id: string;
  residentId: string;
  name: string;
  description: string;
  cost: Cost;
  requiresLevel: number;
  /** Hidden from the Wardrobe until the owner releases it (art pending or design not settled). */
  hidden?: boolean;
}

/** Ribbon rules: how players earn the costume currency outside the Arcade. */
export interface RibbonRules {
  perPlay: number;
  playsPerDay: number;
}

export type ArcadeGameId =
  | 'button_catch' | 'memory' | 'glyph' | 'kitchen' | 'stitch'
  | 'garden' | 'spot' | 'lantern' | 'parcel' | 'hide';

/** One of the three exclusive prizes a game unlocks at a score milestone. */
export interface ArcadePrize {
  /** Score needed in a single round. */
  score: number;
  kind: 'furniture' | 'companion';
  /** Furniture definition id or companion id. */
  id: string;
}

export interface ArcadeGameDef {
  id: ArcadeGameId;
  name: string;
  /** Resident who presents the game. */
  host: string;
  /** Home Level that opens the game. */
  unlockLevel: number;
  /** One line of how to play, said by the host. */
  howTo: string;
  /** Round length in seconds (0 = the round ends on moves, not time). */
  seconds: number;
  /** Scores are clamped to this. */
  maxScore: number;
  pointsPerRibbon: number;
  prizes: [ArcadePrize, ArcadePrize, ArcadePrize];
}

export interface ArcadeRules {
  playsPerDay: number;
  maxRibbonsPerGame: number;
  /** Most Ribbons the whole Arcade gives in one day; rounds after that still count for best scores and prizes. */
  maxRibbonsPerDay: number;
  /** Buttons for each point scored in a round. */
  buttonsPerPoint: number;
  /** Most Buttons the whole Arcade gives in one day. */
  maxButtonsPerDay: number;
  /** Display order on the Arcade page. */
  order: ArcadeGameId[];
}

/** A small pet won in the Arcade. It follows the resident it is given to. */
export interface CompanionDef {
  id: string;
  name: string;
  description: string;
}

export interface GatherSpotDef {
  id: string;
  name: string;
  roomId: string;
  yield: Cost;
  cooldownMs: number;
  requiresUnlock?: string;
}

export interface ExpeditionDef {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  reward: Cost & { hearts?: number };
  requiresUnlock: string;
  /** The first time this route is completed, this resident comes home with the traveller. */
  firstTimeResident?: string;
}

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Secret';
export type ResidentActivity = 'idle' | 'wander' | 'rest';
export type Form = 'original' | 'decorated';

export interface ResidentDef {
  id: string;
  name: string;
  rarity: Rarity;
  series: string;
  tagline: string;
  mood: string;
  story: string;
  /** Atmosphere tags this resident loves. Shown as favourite decor. */
  favouriteTags: string[];
  /** Home Level at which this resident can first join (handover section 10). */
  joinLevel: number;
  /** How to work toward this resident, shown on the missing silhouette. */
  hint: string;
  /** Relative weights for choosing the next activity. Data-first, PROPOSED values. */
  behaviour: Record<ResidentActivity, number>;
  favouriteRest: 'sleep' | 'sit';
  /** Walking speed in cells per second. */
  speed: number;
  /** Placeholder colours until production art arrives. */
  palette: { body: string; accent: string };
  /** Baking recipe this resident is best at (Series 2). */
  favouriteBake?: string;
}

export interface LevelDef {
  level: number;
  hearts: number;
  unlocks: string[];
  label: string;
}

export interface RecipeDef {
  id: string;
  furnitureId: string;
  cost: Cost;
  requiresLevel: number;
}

export interface InvitationDef {
  residentId: string;
  requiresLevel: number;
  roomId: string;
  atmosphere: Record<string, number>;
  /** Short welcome step: a small gift, paid when sending the invitation. */
  welcomeGift: Cost;
  welcomeText: string;
  /** Furniture that must be placed in roomId. */
  requiresPlaced?: string[];
  /** Residents the player must already have. */
  requiresOwned?: string[];
}

export type TaskCondition =
  | { kind: 'placed'; roomId: string; furnitureIds: string[] }
  | { kind: 'owns_resident'; residentId: string }
  | { kind: 'parcels_opened'; count: number }
  | { kind: 'flag'; flag: string }
  | { kind: 'bond_level'; level: number }
  | { kind: 'form'; residentId: string; form: Form }
  | { kind: 'purchased'; key: string }
  | { kind: 'room_items'; roomId: string; count: number }
  | { kind: 'gathered'; count: number }
  | { kind: 'expeditions_done'; count: number }
  | { kind: 'residents_owned'; count: number }
  | { kind: 'costumes_owned'; count: number }
  | { kind: 'baked'; count: number }
  | { kind: 'series_claimed'; seriesId: string };

export interface TaskDef {
  id: string;
  title: string;
  description: string;
  condition: TaskCondition;
  reward: Cost & { hearts?: number };
  /** Where the "Go" button sends the player. */
  goTo?: 'build' | 'nookbook' | 'parcels' | 'invitations' | 'explore' | 'kitchen';
  /** Shown and counted only from this Home Level (later chapters). */
  fromLevel?: number;
}

/** A pool sells two parcels: one that always holds a friend, one that always holds furniture. */
export type ParcelKind = 'friend' | 'furniture';

export interface ParcelPoolDef {
  id: string;
  name: string;
  cost: Cost;
  requiresUnlock: string;
  /** Price of a Furniture Parcel from this pool (`cost` is the price of a Friend Parcel). */
  furnitureCost: Cost;
  /** Character rarity weights, handover section 8 (provisional). */
  rarityWeights: Record<Rarity, number>;
  series: string;
  furniture: string[];
  /** The very first parcel ever opened always gives this resident (tutorial). */
  guaranteedFirst?: string;
  duplicateThread: number;
}

export interface BondDef {
  /** Bond XP needed to reach level 1..5. */
  thresholds: number[];
  playCooldownMs: number;
  /** Plays that count per resident per day. */
  playsPerDay: number;
  playReward: Cost;
  heartsPerBondLevel: number;
}

export interface FormUpgradeDef {
  form: Form;
  requiresBond: number;
  cost: Cost;
  hearts: number;
}

/** Something the Kitchen oven can bake into Treats. */
export interface BakeRecipeDef {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  cost: Cost;
  treats: number;
  requiresLevel: number;
}

/** Baking: one batch at a time in the Kitchen; Treats are collected when it is done. */
export interface BakingRules {
  /** Room that must be open before anything can be baked. */
  roomId: string;
  recipes: Record<string, BakeRecipeDef>;
  /** Display order. */
  order: string[];
  /** Residents of this series can be the baker. */
  bakerSeries: string;
  /** Extra Treats when a baker helps, and when the recipe is the baker's favourite. */
  bakerBonus: number;
  favouriteBonus: number;
  /** Giving a Treat to a resident: once a day each. */
  giftCost: Cost;
  giftBondXp: number;
}

/** One of the Succulent Garden's own species. Every number is a PROPOSED value. */
export interface SucculentDef {
  id: string;
  name: string;
  description: string;
  /** Price of one seed packet. */
  seedCost: Cost;
  /** Time as a green seedling before it starts to colour. */
  sproutMs: number;
  /** Time from sprout to fully grown; the colour blends smoothly across it. */
  growMs: number;
  /** Paid when a grown plant is sold. */
  sellPrice: Cost;
  /** Its own colour (a GardenRules.colours id): what shop seeds grow into. Seedlings are always green. */
  colour: string;
  /** Where the plant grows from, so blush sits on the far leaf tips: rosettes from the centre, trailing plants from the top. */
  anchor: 'centre' | 'base' | 'top';
}

/** A colour a succulent can grow into. Several species can share one. */
export interface SucculentColourDef {
  id: string;
  /** Sweet-treat name used in discovery names, e.g. "Strawberry" -> "Strawberry Gumdrop Cluster". */
  name: string;
  /** Mature body colour and leaf-tip blush, as #rrggbb. */
  mature: string;
  blush: string;
}

/** What a Research study speeds up. */
export type ResearchEffect = 'grow' | 'flower' | 'trips' | 'baking' | 'spots' | 'mutation';

/** One Research study: several levels, each bought and then waited for. Every number is PROPOSED. */
export interface ResearchStudyDef {
  id: string;
  name: string;
  description: string;
  /** Art key for its picture. */
  icon: string;
  effect: ResearchEffect;
  /** Per level: time saved (0.1 = 10% shorter) or, for 'mutation', chance added (0.01 = +1 point). */
  perLevel: number;
  levels: Array<{ cost: Cost; ms: number }>;
}

/** The daily gift: Buttons the first time the game is opened each day, more at higher Home Levels. */
export interface DailyGiftRules {
  buttons: number;
  buttonsPerLevel: number;
}

export interface ResearchRules {
  studies: Record<string, ResearchStudyDef>;
  order: string[];
}

export interface ActiveStudy {
  studyId: string;
  /** The level being studied (1 = first). */
  level: number;
  startAt: number;
  endAt: number;
}

export interface ResearchState {
  /** Finished levels per study. */
  levels: Record<string, number>;
  active: ActiveStudy | null;
}

/** A leaf pattern, drawn in code over the plant's colour. "plain" is no pattern. */
export interface SucculentPatternDef {
  id: string;
  /** Added in front of the plant's name ("Zebra Strawberry Meringue Rose"); empty for plain. */
  name: string;
  description: string;
}

export type GardenToolId = 'sun_shelf' | 'pollen_jar' | 'loupe';

/** A garden tool, bought once. */
export interface GardenToolDef {
  id: GardenToolId;
  name: string;
  description: string;
  cost: Cost;
}

/** A garden goal: the Garden's own short chain of goals, one at a time. */
export interface GardenGoalDef {
  id: string;
  title: string;
  description: string;
  check: { kind: 'sold' | 'pods' | 'discovered' | 'patterns' | 'tools' | 'gifts'; count: number };
  reward: Cost & { hearts?: number };
}

/** Succulent Garden: Phase 1 grow and sell, Phase 2 flowers, pollinating, seeds, offsets and discoveries, Phase 3 tools, patterns, gifts and goals. */
export interface GardenRules {
  /** Level unlock that opens the garden. */
  unlock: string;
  species: Record<string, SucculentDef>;
  /** Display order. */
  order: string[];
  startPots: number;
  maxPots: number;
  /** Price of each extra pot. */
  potCost: Cost;
  /** Hearts the first time each species is grown and sold. */
  heartsPerNewSpecies: number;
  /** Colour of every seedling. It blends by hue toward the plant's colour as it grows. */
  seedlingColour: string;
  colours: Record<string, SucculentColourDef>;
  colourOrder: string[];
  /** A grown plant flowers this long after it is grown. */
  bloomMs: number;
  /** A pollinated flower ripens into a seed pod over this long. */
  podMs: number;
  /** Seeds in one pod. */
  seedsPerPod: number;
  /** Chance that a seed's colour mutates to a colour neither parent had. */
  mutationChance: number;
  /** A grown plant makes an offset this long after it is grown, and again this long after each one is taken. */
  offsetMs: number;
  /** Sell price multiplier for a plant in a colour that is not its species' own. */
  newColourSellBonus: number;
  /** Hearts for each new species-and-colour discovery. */
  heartsPerDiscovery: number;
  patterns: Record<string, SucculentPatternDef>;
  /** Display order; the first is plain. */
  patternOrder: string[];
  /** Chance that a seed's pattern changes to one neither parent had. */
  patternMutationChance: number;
  /** Sell price multiplier for a plant with a pattern (on top of the new-colour bonus). */
  patternSellBonus: number;
  tools: Record<GardenToolId, GardenToolDef>;
  toolOrder: GardenToolId[];
  /** With the Sun Shelf, plants flower this much sooner (multiplier on bloomMs). */
  sunBloomFactor: number;
  /** With the Pollen Jar, each pod gives this many extra seeds. */
  pollenJarSeeds: number;
  /** Giving a grown plant to a resident: bond XP, once a day per resident (shared with Treats). */
  giftBondXp: number;
  goals: GardenGoalDef[];
}

/** A collection of residents shown as one Nookbook tab. */
export interface SeriesDef {
  id: string;
  name: string;
  /** One-time reward for having every resident of the series. */
  reward?: { cost: Cost; furnitureId?: string };
}

export interface ActiveBake {
  recipeId: string;
  bakerId: string | null;
  startAt: number;
  endAt: number;
}

/** A ripening seed pod on a pollinated plant; its seeds are chosen when it is collected. */
export interface SeedPod {
  fatherSpecies: string;
  fatherColour: string;
  fatherPattern: string;
  readyAt: number;
}

/** A succulent growing in a pot. */
export interface PottedSucculent {
  speciesId: string;
  colour: string;
  /** Leaf pattern id ("plain" = none). */
  pattern: string;
  plantedAt: number;
  pod: SeedPod | null;
  /** When the last offset was taken (null = never; the first comes offsetMs after it is grown). */
  offsetTakenAt: number | null;
}

export interface GardenState {
  /** One entry per owned pot; null = empty. */
  pots: Array<PottedSucculent | null>;
  /** Species grown to full size and sold at least once. */
  grown: string[];
  /** Grown plants sold, all time. */
  sold: number;
  /** Saved seeds and offsets, by "<speciesId>:<colourId>" or "<speciesId>:<colourId>:<patternId>" (no third part = plain). */
  seeds: Record<string, number>;
  /** Species-and-colour combinations grown to full size, as "<speciesId>:<colourId>" (the Succulent book). */
  discovered: string[];
  /** Patterns seen on a grown plant. */
  patternsFound: string[];
  /** Seed pods collected, all time. */
  podsCollected: number;
  /** Plants given to residents, all time. */
  gifts: number;
  tools: GardenToolId[];
  goalsClaimed: string[];
}

export interface Placement {
  uid: string;
  defId: string;
  col: number;
  row: number;
  flipped: boolean;
}

export interface RoomState {
  placements: Placement[];
}

export interface OwnedResident {
  bondXp: number;
  form: Form;
  /** Timestamp (ms) of the last Play. Supplied by the caller; the server will supply it later. */
  lastPlayAt: number;
  /** Plays on the day of lastPlayAt (see dayOf). */
  playsToday: number;
  /** Room this resident lives in. */
  room: string;
  /** Costume being worn, if any. */
  costume: string | null;
  /** Day (see dayOf) this resident was last given a Treat; 0 = never. */
  treatDay: number;
}

export interface ActiveExpedition {
  routeId: string;
  residentId: string;
  startAt: number;
  endAt: number;
}

export interface ParcelRecord {
  n: number;
  poolId: string;
  kind: 'resident' | 'furniture';
  id: string;
  duplicate: boolean;
  guaranteed: boolean;
}

export interface ArcadeState {
  /** Day number (see dayOf) the play counters belong to. */
  day: number;
  /** Plays used today, per game. */
  plays: Partial<Record<ArcadeGameId, number>>;
  /** Ribbons earned in the Arcade today, across all games. */
  ribbons: number;
  /** Buttons earned in the Arcade today, across all games. */
  buttons: number;
  /** Best single-round score ever, per game. */
  best: Partial<Record<ArcadeGameId, number>>;
  /** Prizes already granted, as "<gameId>:<index>". */
  prizes: string[];
}

export interface GameState {
  version: number;
  homeName: string;
  rooms: Record<string, RoomState>;
  /** Stored (unplaced) furniture counts by definition id. */
  inventory: Record<string, number>;
  wallet: Record<Currency, number>;
  hearts: number;
  residents: Record<string, OwnedResident>;
  /** Join order, for display. */
  residentOrder: string[];
  claimedTasks: string[];
  craftedRecipes: string[];
  flags: string[];
  parcelsOpened: number;
  /** Parcels opened per pool, so each pool can have its own guaranteed first parcel. */
  parcelsByPool: Record<string, number>;
  parcelLog: ParcelRecord[];
  /** One-off purchases such as "sunroom:open" and "yard:expand". */
  purchases: string[];
  /** When each gathering spot is ready again (ms). */
  gatherReadyAt: Record<string, number>;
  gatherCount: number;
  expedition: ActiveExpedition | null;
  expeditionsDone: Record<string, number>;
  /** The batch in the oven, if any. */
  baking: ActiveBake | null;
  bakesDone: number;
  garden: GardenState;
  research: ResearchState;
  /** Day number (see dayOf) of the last daily gift claimed; -1 = never. */
  dailyGiftDay: number;
  /** Series whose completion reward has been claimed. */
  seriesClaimed: string[];
  costumesOwned: string[];
  /** Daily Ribbon counters for playing with residents; reset when the day changes. (games is unused since v5.) */
  ribbonDay: { day: number; fromPlay: number; games: number };
  arcade: ArcadeState;
  /** Owned companions and the resident each one follows (null = resting in the Nookbook). */
  companions: Record<string, { residentId: string | null }>;
  /** Parcel random state. Moves to the server in Milestone D so it can't be predicted. */
  rngState: number;
  nextUid: number;
  /** Recently applied command ids, so a replayed command cannot apply twice. */
  appliedCommandIds: string[];
}

export interface Content {
  rooms: Record<string, RoomDef>;
  furniture: Record<string, FurnitureDef>;
  residents: Record<string, ResidentDef>;
  levels: LevelDef[];
  recipes: Record<string, RecipeDef>;
  invitations: Record<string, InvitationDef>;
  tasks: TaskDef[];
  parcels: Record<string, ParcelPoolDef>;
  bond: BondDef;
  formUpgrades: FormUpgradeDef[];
  gatherSpots: Record<string, GatherSpotDef>;
  costumes: Record<string, CostumeDef>;
  ribbons: RibbonRules;
  arcade: ArcadeRules;
  arcadeGames: Record<ArcadeGameId, ArcadeGameDef>;
  companions: Record<string, CompanionDef>;
  expeditions: Record<string, ExpeditionDef>;
  /** null until the Kitchen exists (Series 2). */
  baking: BakingRules | null;
  /** null when the build has no Succulent Garden. */
  garden: GardenRules | null;
  dailyGift: DailyGiftRules | null;
  /** null when the build has no Research. */
  research: ResearchRules | null;
  /** Nookbook tabs, in order. */
  series: SeriesDef[];
  /** Order in which new residents are housed, and the room shown first. */
  roomOrder: string[];
  /** Hearts and caps used by the progress rules. PROPOSED values. */
  rules: {
    heartsPerNewResident: number;
    heartsPerFirstCraft: number;
    maxCopiesCounted: number;
    maxActiveResidents: number;
    maxResidentsPerRoom: number;
    /** Mending Thread (from duplicate friends) needed to trade for one Wish Stamp. */
    threadPerStamp: number;
    /** Added to timestamps before splitting them into days, so daily limits reset at the player's local midnight. 0 = UTC. */
    dayOffsetMs: number;
  };
  starter: {
    homeName: string;
    inventory: Record<string, number>;
    wallet: Partial<Record<Currency, number>>;
    residents: string[];
    rngSeed: number;
    placements: Record<string, Array<Omit<Placement, 'uid'>>>;
  };
}
