import type {
  ArcadeGameDef,
  ArcadeGameId,
  Content,
  RoomDef,
  Cost,
  Currency,
  GameState,
  InvitationDef,
  ParcelKind,
  ParcelPoolDef,
  Rarity,
  TaskCondition,
  TaskDef,
  PottedSucculent,
  GardenGoalDef,
  GardenToolId,
  ResearchEffect,
} from './types';

export const CURRENCIES: readonly Currency[] = ['buttons', 'wood', 'fabric', 'wishStamps', 'mendingThread', 'keepsakes', 'ribbons', 'treats'];

// ---------- levels ----------

export function levelFor(hearts: number, content: Content): number {
  let level = 1;
  for (const l of content.levels) if (hearts >= l.hearts) level = Math.max(level, l.level);
  return level;
}

export function isUnlocked(state: GameState, content: Content, unlock: string): boolean {
  const level = levelFor(state.hearts, content);
  return content.levels.some((l) => l.level <= level && l.unlocks.includes(unlock));
}

export function nextLevel(state: GameState, content: Content): { level: number; hearts: number } | null {
  const level = levelFor(state.hearts, content);
  const next = content.levels.filter((l) => l.level > level).sort((a, b) => a.level - b.level)[0];
  return next ? { level: next.level, hearts: next.hearts } : null;
}

// ---------- rooms ----------

export function purchaseKey(roomId: string, kind: 'open' | 'expand'): string {
  return `${roomId}:${kind}`;
}

/** Can the player use this room yet (level unlock and, if needed, the opening purchase)? */
export function isRoomOpen(state: GameState, content: Content, roomId: string): boolean {
  const room = content.rooms[roomId];
  if (!room) return false;
  return !room.access || state.purchases.includes(purchaseKey(roomId, 'open'));
}

/** The room as it can currently be used: before an expansion only the first baseCols are usable. */
export function effectiveRoom(state: GameState, content: Content, roomId: string): RoomDef | undefined {
  const room = content.rooms[roomId];
  if (!room) return undefined;
  if (room.expansion && !state.purchases.includes(purchaseKey(roomId, 'expand'))) {
    return { ...room, cols: room.expansion.baseCols };
  }
  return room;
}

/** Residents living in a room who are at home (not away on an expedition). */
export function residentsAtHome(state: GameState, roomId: string): string[] {
  return state.residentOrder.filter((id) => state.residents[id]?.room === roomId && state.expedition?.residentId !== id);
}

export function residentsInRoom(state: GameState, roomId: string): string[] {
  return state.residentOrder.filter((id) => state.residents[id]?.room === roomId);
}

/** Some open room still has space for another resident. */
export function homeHasSpace(state: GameState, content: Content): boolean {
  return content.roomOrder.some((id) => isRoomOpen(state, content, id) && residentsInRoom(state, id).length < content.rules.maxResidentsPerRoom);
}

/** First open room with space, in the content's room order. */
export function homeForNewResident(state: GameState, content: Content): string {
  for (const id of content.roomOrder) {
    if (isRoomOpen(state, content, id) && residentsInRoom(state, id).length < content.rules.maxResidentsPerRoom) return id;
  }
  return content.roomOrder[0]!;
}

// ---------- wallet ----------

export function canAfford(state: GameState, cost: Cost): boolean {
  return CURRENCIES.every((c) => (state.wallet[c] ?? 0) >= (cost[c] ?? 0));
}

export function addCost(wallet: Record<Currency, number>, cost: Cost, sign: 1 | -1): Record<Currency, number> {
  const next = { ...wallet };
  for (const c of CURRENCIES) {
    const delta = cost[c] ?? 0;
    if (delta) next[c] = (next[c] ?? 0) + sign * delta;
  }
  return next;
}

// ---------- atmosphere ----------

/**
 * Sum atmosphere tags of furniture placed in a room. Variety rule: only the first
 * `maxCopiesCounted` copies of the same item count, so stacking cheap duplicates
 * can't brute-force an invitation.
 */
export function atmosphere(state: GameState, content: Content, roomId: string): Record<string, number> {
  const totals: Record<string, number> = {};
  const seen: Record<string, number> = {};
  for (const p of state.rooms[roomId]?.placements ?? []) {
    const def = content.furniture[p.defId];
    if (!def) continue;
    seen[p.defId] = (seen[p.defId] ?? 0) + 1;
    if (seen[p.defId]! > content.rules.maxCopiesCounted) continue;
    for (const [tag, value] of Object.entries(def.tags)) totals[tag] = (totals[tag] ?? 0) + value;
  }
  return totals;
}

// ---------- invitations ----------

export interface InvitationStatus {
  def: InvitationDef;
  owned: boolean;
  levelOk: boolean;
  roomOpen: boolean;
  atmosphere: Array<{ tag: string; have: number; need: number; ok: boolean }>;
  placed: Array<{ furnitureId: string; ok: boolean }>;
  friends: Array<{ residentId: string; ok: boolean }>;
  giftOk: boolean;
  ready: boolean;
}

export function invitationStatus(state: GameState, content: Content, residentId: string): InvitationStatus | null {
  const def = content.invitations[residentId];
  if (!def) return null;
  const owned = residentId in state.residents;
  const levelOk = levelFor(state.hearts, content) >= def.requiresLevel;
  const atm = atmosphere(state, content, def.roomId);
  const rows = Object.entries(def.atmosphere).map(([tag, need]) => ({ tag, have: atm[tag] ?? 0, need, ok: (atm[tag] ?? 0) >= need }));
  const giftOk = canAfford(state, def.welcomeGift);
  const roomOpen = isRoomOpen(state, content, def.roomId);
  const inRoom = new Set((state.rooms[def.roomId]?.placements ?? []).map((p) => p.defId));
  const placed = (def.requiresPlaced ?? []).map((furnitureId) => ({ furnitureId, ok: inRoom.has(furnitureId) }));
  const friends = (def.requiresOwned ?? []).map((residentId) => ({ residentId, ok: residentId in state.residents }));
  const ready =
    !owned && levelOk && roomOpen && giftOk && rows.every((r) => r.ok) && placed.every((p) => p.ok) && friends.every((f) => f.ok);
  return { def, owned, levelOk, roomOpen, atmosphere: rows, placed, friends, giftOk, ready };
}

// ---------- bond ----------

export function bondLevel(xp: number, content: Content): number {
  let level = 1;
  content.bond.thresholds.forEach((need, i) => {
    if (xp >= need) level = i + 1;
  });
  return level;
}

export function bondProgress(xp: number, content: Content): { level: number; into: number; span: number | null } {
  const level = bondLevel(xp, content);
  const here = content.bond.thresholds[level - 1] ?? 0;
  const next = content.bond.thresholds[level];
  return { level, into: xp - here, span: next === undefined ? null : next - here };
}

export function playReadyAt(state: GameState, content: Content, residentId: string): number {
  const r = state.residents[residentId];
  return r ? r.lastPlayAt + content.bond.playCooldownMs : Infinity;
}

/** Plays left today with one resident. */
export function playsLeftToday(state: GameState, content: Content, residentId: string, at: number): number {
  const r = state.residents[residentId];
  if (!r) return 0;
  const used = dayOf(r.lastPlayAt, content) === dayOf(at, content) ? r.playsToday : 0;
  return Math.max(0, content.bond.playsPerDay - used);
}

// ---------- tasks ----------

export function conditionMet(state: GameState, content: Content, c: TaskCondition): boolean {
  switch (c.kind) {
    case 'placed': {
      const placed = new Set((state.rooms[c.roomId]?.placements ?? []).map((p) => p.defId));
      return c.furnitureIds.every((id) => placed.has(id));
    }
    case 'owns_resident':
      return c.residentId in state.residents;
    case 'parcels_opened':
      return state.parcelsOpened >= c.count;
    case 'flag':
      return state.flags.includes(c.flag);
    case 'bond_level':
      return Object.values(state.residents).some((r) => bondLevel(r.bondXp, content) >= c.level);
    case 'form':
      return state.residents[c.residentId]?.form === c.form;
    case 'purchased':
      return state.purchases.includes(c.key);
    case 'room_items':
      return (state.rooms[c.roomId]?.placements.length ?? 0) >= c.count;
    case 'gathered':
      return state.gatherCount >= c.count;
    case 'expeditions_done':
      return Object.values(state.expeditionsDone).reduce((a, b) => a + b, 0) >= c.count;
    case 'residents_owned':
      return Object.keys(state.residents).length >= c.count;
    case 'costumes_owned':
      return state.costumesOwned.length >= c.count;
    case 'baked':
      return state.bakesDone >= c.count;
    case 'series_claimed':
      return state.seriesClaimed.includes(c.seriesId);
  }
}

export type TaskState = 'claimed' | 'claimable' | 'active' | 'locked';

/** Tasks unlock one at a time: each needs the previous one claimed. */
export function taskStates(state: GameState, content: Content): Array<{ def: TaskDef; status: TaskState }> {
  let previousClaimed = true;
  const level = levelFor(state.hearts, content);
  return content.tasks.map((def) => {
    let status: TaskState;
    if (state.claimedTasks.includes(def.id)) status = 'claimed';
    else if (!previousClaimed || level < (def.fromLevel ?? 1)) status = 'locked';
    else status = conditionMet(state, content, def.condition) ? 'claimable' : 'active';
    previousClaimed = status === 'claimed';
    return { def, status };
  });
}

// ---------- parcels ----------

export interface ParcelOutcome {
  kind: 'resident' | 'furniture';
  id: string;
  chance: number;
}

/** Residents a Friend Parcel from this pool can hold at the player's level. */
function parcelFriends(state: GameState, content: Content, pool: ParcelPoolDef) {
  const level = levelFor(state.hearts, content);
  return Object.values(content.residents).filter((r) => r.series === pool.series && r.joinLevel <= level);
}

/** Is the next Friend Parcel from this pool the guaranteed one? */
export function parcelGuaranteed(state: GameState, content: Content, poolId: string): boolean {
  const pool = content.parcels[poolId];
  return !!pool?.guaranteedFirst && (state.parcelsByPool[pool.id] ?? 0) === 0 && !(pool.guaranteedFirst in state.residents);
}

/** Could a Friend Parcel from this pool bring someone new right now? (If not, it would only hold duplicates.) */
export function friendParcelHasNew(state: GameState, content: Content, poolId: string): boolean {
  const pool = content.parcels[poolId];
  if (!pool) return false;
  return parcelFriends(state, content, pool).some((r) => !(r.id in state.residents));
}

/**
 * Exact odds for the next parcel of this kind from this pool, given the player's level.
 * The same list drives the draw, so the displayed odds are the real odds.
 * A Friend Parcel always holds a resident whose join level the player has reached;
 * a Furniture Parcel always holds one of the pool's furniture pieces.
 */
export function parcelOdds(state: GameState, content: Content, poolId: string, kind: ParcelKind = 'friend'): ParcelOutcome[] {
  const pool = content.parcels[poolId];
  if (!pool) return [];
  if (kind === 'furniture') {
    const furniture = pool.furniture.filter((id) => content.furniture[id]).sort();
    return furniture.map((id) => ({ kind: 'furniture' as const, id, chance: 1 / furniture.length }));
  }
  if (parcelGuaranteed(state, content, poolId)) return [{ kind: 'resident', id: pool.guaranteedFirst!, chance: 1 }];
  const byRarity = new Map<Rarity, string[]>();
  for (const r of parcelFriends(state, content, pool)) byRarity.set(r.rarity, [...(byRarity.get(r.rarity) ?? []), r.id]);
  const rarityTotal = [...byRarity.keys()].reduce((sum, rar) => sum + (pool.rarityWeights[rar] ?? 0), 0);
  if (rarityTotal === 0) return [];
  const out: ParcelOutcome[] = [];
  for (const [rarity, ids] of [...byRarity.entries()].sort()) {
    const rarityChance = (pool.rarityWeights[rarity] ?? 0) / rarityTotal;
    for (const id of [...ids].sort()) out.push({ kind: 'resident', id, chance: rarityChance / ids.length });
  }
  return out;
}

export function parcelCost(pool: ParcelPoolDef, kind: ParcelKind): Cost {
  return kind === 'furniture' ? pool.furnitureCost : pool.cost;
}

/** Deterministic random number generator (mulberry32). Returns [value in 0..1, next state]. */
export function nextRandom(stateSeed: number): [number, number] {
  const next = (stateSeed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

export function pickOutcome(odds: ParcelOutcome[], roll: number): ParcelOutcome | null {
  let acc = 0;
  for (const o of odds) {
    acc += o.chance;
    if (roll < acc) return o;
  }
  return odds[odds.length - 1] ?? null;
}

/** Can this parcel be opened now: unlocked, affordable, and (for a Friend Parcel) able to bring someone new? */
export function poolCanOpen(state: GameState, content: Content, pool: ParcelPoolDef, kind: ParcelKind = 'friend'): boolean {
  if (!isUnlocked(state, content, pool.requiresUnlock) || !canAfford(state, parcelCost(pool, kind))) return false;
  return kind === 'furniture' ? parcelOdds(state, content, pool.id, 'furniture').length > 0 : friendParcelHasNew(state, content, pool.id);
}

// ---------- gathering and expeditions ----------

export function gatherReadyIn(state: GameState, content: Content, spotId: string, now: number): number {
  const spot = content.gatherSpots[spotId];
  if (!spot) return Infinity;
  return Math.max(0, (state.gatherReadyAt[spotId] ?? 0) - now);
}

export function spotUnlocked(state: GameState, content: Content, spotId: string): boolean {
  const spot = content.gatherSpots[spotId];
  if (!spot) return false;
  return (!spot.requiresUnlock || isUnlocked(state, content, spot.requiresUnlock)) && isRoomOpen(state, content, spot.roomId);
}

// ---------- costumes and Ribbons ----------

export const DAY_MS = 86_400_000;

/** Day number of a timestamp, counted in the player's local days (see rules.dayOffsetMs). */
export function dayOf(at: number, content: Content): number {
  return Math.floor((at + content.rules.dayOffsetMs) / DAY_MS);
}

/** Today's Ribbon counters for playing with residents (fresh if the stored day is over). */
export function ribbonToday(state: GameState, content: Content, at: number): { fromPlay: number; games: number } {
  return state.ribbonDay.day === dayOf(at, content) ? state.ribbonDay : { fromPlay: 0, games: 0 };
}

// ---------- the Arcade ----------

/** A round's score as the rules count it: whole points between 0 and the game's maximum. */
export function clampScore(game: ArcadeGameDef, score: number): number {
  return Math.max(0, Math.min(game.maxScore, Math.floor(score)));
}

export function ribbonsForScore(content: Content, game: ArcadeGameDef, score: number): number {
  return Math.min(content.arcade.maxRibbonsPerGame, Math.floor(clampScore(game, score) / game.pointsPerRibbon));
}

export function arcadeUnlocked(state: GameState, content: Content, gameId: ArcadeGameId): boolean {
  const game = content.arcadeGames[gameId];
  return !!game && levelFor(state.hearts, content) >= game.unlockLevel;
}

/** Plays left today for one game. */
export function arcadePlaysLeft(state: GameState, content: Content, gameId: ArcadeGameId, at: number): number {
  const used = state.arcade.day === dayOf(at, content) ? state.arcade.plays[gameId] ?? 0 : 0;
  return Math.max(0, content.arcade.playsPerDay - used);
}

/** Arcade Ribbons still to be won today, across all games. */
export function arcadeRibbonsLeft(state: GameState, content: Content, at: number): number {
  const earned = state.arcade.day === dayOf(at, content) ? state.arcade.ribbons : 0;
  return Math.max(0, content.arcade.maxRibbonsPerDay - earned);
}

export function prizeKey(gameId: ArcadeGameId, index: number): string {
  return `${gameId}:${index}`;
}

export function prizeWon(state: GameState, gameId: ArcadeGameId, index: number): boolean {
  return state.arcade.prizes.includes(prizeKey(gameId, index));
}

/** The resident a newly won companion goes to: the game's host if free, else the first resident without one. */
export function companionHomeFor(state: GameState, preferred: string | null): string | null {
  const taken = new Set(Object.values(state.companions).map((c) => c.residentId).filter(Boolean));
  if (preferred && state.residents[preferred] && !taken.has(preferred)) return preferred;
  return state.residentOrder.find((id) => !taken.has(id)) ?? null;
}

/** Companion following a resident, if any. */
export function companionOf(state: GameState, residentId: string): string | null {
  for (const [id, c] of Object.entries(state.companions)) if (c.residentId === residentId) return id;
  return null;
}

export function visibleCostumes(content: Content, residentId: string) {
  return Object.values(content.costumes).filter((c) => c.residentId === residentId && !c.hidden);
}

// ---------- baking and Treats (Series 2) ----------

/** Recipes the player can bake at their level, in display order. */
export function bakeRecipes(state: GameState, content: Content) {
  const b = content.baking;
  if (!b) return [];
  const level = levelFor(state.hearts, content);
  return b.order.map((id) => b.recipes[id]!).filter(Boolean).map((def) => ({ def, unlocked: level >= def.requiresLevel }));
}

export function bakingOpen(state: GameState, content: Content): boolean {
  return !!content.baking && isRoomOpen(state, content, content.baking.roomId);
}

/** Can this resident help at the oven? Owned, of the baking series, and not away on a trip. */
export function canBake(state: GameState, content: Content, residentId: string): boolean {
  const def = content.residents[residentId];
  return !!content.baking && !!def && def.series === content.baking.bakerSeries && residentId in state.residents && state.expedition?.residentId !== residentId;
}

/** Treats a batch gives with this baker (null = nobody helping). */
export function bakeYield(content: Content, recipeId: string, bakerId: string | null): { treats: number; bonus: number } {
  const b = content.baking;
  const recipe = b?.recipes[recipeId];
  if (!b || !recipe) return { treats: 0, bonus: 0 };
  let bonus = 0;
  if (bakerId) bonus += b.bakerBonus + (content.residents[bakerId]?.favouriteBake === recipeId ? b.favouriteBonus : 0);
  return { treats: recipe.treats + bonus, bonus };
}

export function treatGivenToday(state: GameState, content: Content, residentId: string, at: number): boolean {
  const r = state.residents[residentId];
  return !!r && r.treatDay !== 0 && r.treatDay === dayOf(at, content);
}

// ---------- series ----------

export function seriesProgress(state: GameState, content: Content, seriesId: string): { owned: number; total: number; complete: boolean; claimed: boolean } {
  const all = Object.values(content.residents).filter((r) => r.series === seriesId);
  const owned = all.filter((r) => r.id in state.residents).length;
  return { owned, total: all.length, complete: all.length > 0 && owned === all.length, claimed: state.seriesClaimed.includes(seriesId) };
}

// ---------- succulent garden ----------

export type SucculentStage = 'seedling' | 'young' | 'grown';

export interface SucculentGrowth {
  stage: SucculentStage;
  /** 0 at planting, 1 when grown. */
  progress: number;
  /** Where the colour is: 0 = seedling green, 1 = the mature colour. Stays 0 while it is a seedling, then blends smoothly to 1. */
  colour: number;
  grownAt: number;
}

export function gardenOpen(state: GameState, content: Content): boolean {
  return !!content.garden && isUnlocked(state, content, content.garden.unlock);
}

export function succulentGrowth(content: Content, speciesId: string, plantedAt: number, now: number, growFactor = 1): SucculentGrowth | null {
  const def = content.garden?.species[speciesId];
  if (!def) return null;
  // Research (Green Thumb) shortens the whole grow, for plants already in the ground too.
  const sproutMs = def.sproutMs * growFactor;
  const growMs = def.growMs * growFactor;
  const total = sproutMs + growMs;
  const elapsed = Math.max(0, now - plantedAt);
  const grownAt = plantedAt + total;
  if (elapsed >= total) return { stage: 'grown', progress: 1, colour: 1, grownAt };
  const colour = elapsed < sproutMs ? 0 : (elapsed - sproutMs) / growMs;
  return { stage: elapsed < sproutMs ? 'seedling' : 'young', progress: elapsed / total, colour, grownAt };
}

/** Price of the next pot, or null when the garden has every pot it can hold. */
export function nextPotCost(state: GameState, content: Content): Cost | null {
  const g = content.garden;
  if (!g || state.garden.pots.length >= g.maxPots) return null;
  return g.potCost;
}

/** A pot holds a fully grown plant that can be sold. */
export function gardenReady(state: GameState, content: Content, now: number): boolean {
  return state.garden.pots.some((p) => !!p && succulentGrowth(content, p.speciesId, p.plantedAt, now, researchSpeed(state, content).grow)?.stage === 'grown');
}

// ---------- succulent garden, Phase 2 ----------

export const PLAIN = 'plain';

/** Seed bag key. Plain seeds keep the two-part key older saves used. */
export function seedKey(speciesId: string, colour: string, pattern: string = PLAIN): string {
  return pattern === PLAIN ? `${speciesId}:${colour}` : `${speciesId}:${colour}:${pattern}`;
}

export function parseSeedKey(content: Content, key: string): { speciesId: string; colour: string; pattern: string } | null {
  const [speciesId, colour, pattern = PLAIN, extra] = key.split(':');
  const g = content.garden;
  if (!g || extra !== undefined || !speciesId || !colour || !g.species[speciesId] || !g.colours[colour] || !g.patterns[pattern]) return null;
  if (key !== seedKey(speciesId, colour, pattern)) return null;
  return { speciesId, colour, pattern };
}

/** "Zebra Strawberry Gumdrop Cluster": pattern (if any), the colour's treat name and the species. */
export function succulentName(content: Content, speciesId: string, colour: string, pattern: string = PLAIN): string {
  const g = content.garden;
  const p = g?.patterns[pattern]?.name ?? '';
  return `${p} ${g?.colours[colour]?.name ?? ''} ${g?.species[speciesId]?.name ?? speciesId}`.replace(/\s+/g, ' ').trim();
}

export interface PlantStatus {
  growth: SucculentGrowth;
  /** When it flowers (grownAt + bloomMs). */
  bloomAt: number;
  blooming: boolean;
  /** A pod is on the plant and ripe. */
  podReady: boolean;
  /** When the next offset is ready. */
  offsetAt: number;
  offsetReady: boolean;
}

export function plantStatus(
  content: Content,
  plant: PottedSucculent,
  now: number,
  tools: readonly GardenToolId[] = [],
  speed: { grow: number; flower: number } = { grow: 1, flower: 1 },
): PlantStatus | null {
  const g = content.garden;
  const growth = succulentGrowth(content, plant.speciesId, plant.plantedAt, now, speed.grow);
  if (!g || !growth) return null;
  const bloomAt = growth.grownAt + Math.round(g.bloomMs * (tools.includes('sun_shelf') ? g.sunBloomFactor : 1) * speed.flower);
  const offsetAt = (plant.offsetTakenAt ?? growth.grownAt) + Math.round(g.offsetMs * speed.grow);
  const grown = growth.stage === 'grown';
  return {
    growth,
    bloomAt,
    blooming: grown && now >= bloomAt,
    podReady: !!plant.pod && now >= plant.pod.readyAt,
    offsetAt,
    offsetReady: grown && now >= offsetAt,
  };
}

/** Price a grown plant sells for: more when it is not its species' own colour. */
export function succulentSellPrice(content: Content, plant: Pick<PottedSucculent, 'speciesId' | 'colour'> & { pattern?: string }): Cost {
  const g = content.garden;
  const def = g?.species[plant.speciesId];
  if (!g || !def) return {};
  const bonus = (plant.colour !== def.colour ? g.newColourSellBonus : 1) * ((plant.pattern ?? PLAIN) !== PLAIN ? g.patternSellBonus : 1);
  const out: Cost = {};
  for (const [k, v] of Object.entries(def.sellPrice) as Array<[Currency, number]>) out[k] = Math.round(v * bonus);
  return out;
}

/** Something to do in the garden: a plant to sell, a ripe pod or an offset to take. */
export function gardenDue(state: GameState, content: Content, now: number): boolean {
  return state.garden.pots.some((p) => {
    if (!p) return false;
    const st = plantStatus(content, p, now, state.garden.tools, researchSpeed(state, content));
    return !!st && (st.podReady || st.offsetReady || st.growth.stage === 'grown');
  });
}

/** Grown plants whose species-and-colour is not yet in the Succulent book. */
export function undiscovered(state: GameState, content: Content, now: number): string[] {
  const out: string[] = [];
  for (const p of state.garden.pots) {
    if (!p || succulentGrowth(content, p.speciesId, p.plantedAt, now, researchSpeed(state, content).grow)?.stage !== 'grown') continue;
    const key = seedKey(p.speciesId, p.colour);
    if (!state.garden.discovered.includes(key) && !out.includes(key)) out.push(key);
  }
  return out;
}

/** Furniture id of a grown succulent put on show in a room. */
export function succulentFurnitureId(speciesId: string, colour: string, pattern: string = PLAIN): string {
  return pattern === PLAIN ? `succ_${speciesId}_${colour}` : `succ_${speciesId}_${colour}_${pattern}`;
}

/** Patterns on grown plants that have not been seen before. */
export function unseenPatterns(state: GameState, content: Content, now: number): string[] {
  const out: string[] = [];
  for (const p of state.garden.pots) {
    if (!p || p.pattern === PLAIN || succulentGrowth(content, p.speciesId, p.plantedAt, now, researchSpeed(state, content).grow)?.stage !== 'grown') continue;
    if (!state.garden.patternsFound.includes(p.pattern) && !out.includes(p.pattern)) out.push(p.pattern);
  }
  return out;
}

export function gardenGoalProgress(state: GameState, def: GardenGoalDef): number {
  const g = state.garden;
  switch (def.check.kind) {
    case 'sold': return g.sold;
    case 'pods': return g.podsCollected;
    case 'discovered': return g.discovered.length;
    case 'patterns': return g.patternsFound.length;
    case 'tools': return g.tools.length;
    case 'gifts': return g.gifts;
  }
}

/** The next unclaimed garden goal (goals go one at a time), or null when all are done. */
export function nextGardenGoal(state: GameState, content: Content): { def: GardenGoalDef; progress: number; done: boolean } | null {
  const def = content.garden?.goals.find((x) => !state.garden.goalsClaimed.includes(x.id));
  if (!def) return null;
  const progress = gardenGoalProgress(state, def);
  return { def, progress: Math.min(progress, def.check.count), done: progress >= def.check.count };
}

// ---------- research ----------

export function researchLevel(state: GameState, studyId: string): number {
  return state.research.levels[studyId] ?? 0;
}

function effectTotal(state: GameState, content: Content, effect: ResearchEffect): number {
  const r = content.research;
  if (!r) return 0;
  let total = 0;
  for (const id of r.order) {
    const def = r.studies[id];
    if (def?.effect === effect) total += def.perLevel * researchLevel(state, id);
  }
  return total;
}

/**
 * What finished Research does now. Speeds are multipliers on time (0.7 = 30% shorter, never below 0.2);
 * mutation is a chance added to new colours and patterns.
 */
export interface ResearchSpeed {
  grow: number;
  flower: number;
  trips: number;
  baking: number;
  spots: number;
  mutation: number;
}

export function researchSpeed(state: GameState, content: Content): ResearchSpeed {
  const f = (e: ResearchEffect) => Math.max(0.2, 1 - effectTotal(state, content, e));
  return { grow: f('grow'), flower: f('flower'), trips: f('trips'), baking: f('baking'), spots: f('spots'), mutation: effectTotal(state, content, 'mutation') };
}

/** The next level of a study, or null when it is fully studied. */
export function nextStudyLevel(state: GameState, content: Content, studyId: string): { level: number; cost: Cost; ms: number } | null {
  const def = content.research?.studies[studyId];
  if (!def) return null;
  const done = researchLevel(state, studyId);
  const next = def.levels[done];
  return next ? { level: done + 1, cost: next.cost, ms: next.ms } : null;
}

// ---------- daily gift and Arcade Buttons ----------

/** Buttons the daily gift gives at this Home Level. */
export function dailyGiftAmount(state: GameState, content: Content): number {
  const g = content.dailyGift;
  return g ? g.buttons + g.buttonsPerLevel * levelFor(state.hearts, content) : 0;
}

export function dailyGiftReady(state: GameState, content: Content, at: number): boolean {
  return !!content.dailyGift && state.dailyGiftDay !== dayOf(at, content);
}

/** Arcade Buttons still available today. */
export function arcadeButtonsLeft(state: GameState, content: Content, at: number): number {
  const earned = state.arcade.day === dayOf(at, content) ? state.arcade.buttons : 0;
  return Math.max(0, content.arcade.maxButtonsPerDay - earned);
}

// ---------- Ready summary (Home screen) ----------

export type ReadyKind = 'gather' | 'trip' | 'garden' | 'garden_goal' | 'research' | 'baking' | 'tasks' | 'invitations' | 'series' | 'parcels';

export interface ReadyItem {
  kind: ReadyKind;
  /** How many things of this kind are waiting (always at least 1). */
  count: number;
}

/**
 * Everything waiting for the player right now, in the order the Home screen lists it: things to collect first,
 * then things to claim. Only actionable items: nothing here is a timer still running.
 */
export function readySummary(state: GameState, content: Content, now: number): ReadyItem[] {
  const out: ReadyItem[] = [];
  const add = (kind: ReadyKind, count: number) => {
    if (count > 0) out.push({ kind, count });
  };
  add('gather', Object.keys(content.gatherSpots).filter((id) => spotUnlocked(state, content, id) && gatherReadyIn(state, content, id, now) === 0).length);
  add('trip', state.expedition && state.expedition.endAt <= now ? 1 : 0);
  if (content.garden && gardenOpen(state, content)) {
    const speed = researchSpeed(state, content);
    add('garden', state.garden.pots.filter((p) => {
      if (!p) return false;
      const st = plantStatus(content, p, now, state.garden.tools, speed);
      return !!st && (st.podReady || st.offsetReady || st.growth.stage === 'grown');
    }).length);
    add('garden_goal', nextGardenGoal(state, content)?.done ? 1 : 0);
  }
  add('research', state.research.active && state.research.active.endAt <= now ? 1 : 0);
  add('baking', state.baking && state.baking.endAt <= now ? 1 : 0);
  add('tasks', taskStates(state, content).filter((t) => t.status === 'claimable').length);
  add('invitations', Object.keys(content.invitations).filter((id) => invitationStatus(state, content, id)?.ready).length);
  add('series', content.series.filter((x) => x.reward && seriesProgress(state, content, x.id).complete && !state.seriesClaimed.includes(x.id)).length);
  add('parcels', Object.values(content.parcels).some((p) => poolCanOpen(state, content, p, 'friend')) ? 1 : 0);
  return out;
}
