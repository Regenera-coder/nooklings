/** Shared data shapes. Definitions (content) are static; GameState is the saved, mutable part. */

/** floor blocks walking; rug is flat and walkable; wall hangs on the back wall; ceiling hangs above a floor cell. */
export type Layer = 'floor' | 'rug' | 'wall' | 'ceiling';

export interface Cell {
  col: number;
  row: number;
}

export type Currency = 'buttons' | 'wood' | 'fabric' | 'wishStamps' | 'mendingThread' | 'keepsakes' | 'ribbons';
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
  theme: 'living' | 'sunroom' | 'yard';
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
  | { kind: 'costumes_owned'; count: number };

export interface TaskDef {
  id: string;
  title: string;
  description: string;
  condition: TaskCondition;
  reward: Cost & { hearts?: number };
  /** Where the "Go" button sends the player. */
  goTo?: 'build' | 'nookbook' | 'parcels' | 'invitations' | 'explore';
}

export interface ParcelPoolDef {
  id: string;
  name: string;
  cost: Cost;
  requiresUnlock: string;
  /** Chance of a character draw versus a furniture draw. PROPOSED. */
  categoryWeights: { character: number; furniture: number };
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
  parcelLog: ParcelRecord[];
  /** One-off purchases such as "sunroom:open" and "yard:expand". */
  purchases: string[];
  /** When each gathering spot is ready again (ms). */
  gatherReadyAt: Record<string, number>;
  gatherCount: number;
  expedition: ActiveExpedition | null;
  expeditionsDone: Record<string, number>;
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
  /** Order in which new residents are housed, and the room shown first. */
  roomOrder: string[];
  /** Hearts and caps used by the progress rules. PROPOSED values. */
  rules: {
    heartsPerNewResident: number;
    heartsPerFirstCraft: number;
    maxCopiesCounted: number;
    maxActiveResidents: number;
    maxResidentsPerRoom: number;
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
