import type {
  ArcadeGameDef,
  ArcadeGameId,
  Content,
  RoomDef,
  Cost,
  Currency,
  GameState,
  InvitationDef,
  ParcelPoolDef,
  Rarity,
  TaskCondition,
  TaskDef,
} from './types';

export const CURRENCIES: readonly Currency[] = ['buttons', 'wood', 'fabric', 'wishStamps', 'mendingThread', 'keepsakes', 'ribbons'];

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
  }
}

export type TaskState = 'claimed' | 'claimable' | 'active' | 'locked';

/** Tasks unlock one at a time: each needs the previous one claimed. */
export function taskStates(state: GameState, content: Content): Array<{ def: TaskDef; status: TaskState }> {
  let previousClaimed = true;
  return content.tasks.map((def) => {
    let status: TaskState;
    if (state.claimedTasks.includes(def.id)) status = 'claimed';
    else if (!previousClaimed) status = 'locked';
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

/**
 * Exact odds for the next parcel from this pool, given the player's level.
 * The same list drives the draw, so the displayed odds are the real odds.
 * Characters are limited to those whose join level the player has reached.
 */
export function parcelOdds(state: GameState, content: Content, poolId: string): ParcelOutcome[] {
  const pool = content.parcels[poolId];
  if (!pool) return [];
  const level = levelFor(state.hearts, content);
  if (pool.guaranteedFirst && state.parcelsOpened === 0 && !(pool.guaranteedFirst in state.residents)) {
    return [{ kind: 'resident', id: pool.guaranteedFirst, chance: 1 }];
  }
  const eligible = Object.values(content.residents).filter((r) => r.series === pool.series && r.joinLevel <= level);
  const byRarity = new Map<Rarity, string[]>();
  for (const r of eligible) byRarity.set(r.rarity, [...(byRarity.get(r.rarity) ?? []), r.id]);
  const rarityTotal = [...byRarity.keys()].reduce((sum, rar) => sum + (pool.rarityWeights[rar] ?? 0), 0);
  const furniture = pool.furniture.filter((id) => content.furniture[id]);
  const charW = rarityTotal > 0 ? pool.categoryWeights.character : 0;
  const furnW = furniture.length > 0 ? pool.categoryWeights.furniture : 0;
  const catTotal = charW + furnW;
  if (catTotal === 0) return [];

  const out: ParcelOutcome[] = [];
  for (const [rarity, ids] of [...byRarity.entries()].sort()) {
    const rarityChance = (charW / catTotal) * ((pool.rarityWeights[rarity] ?? 0) / rarityTotal);
    for (const id of [...ids].sort()) out.push({ kind: 'resident', id, chance: rarityChance / ids.length });
  }
  for (const id of [...furniture].sort()) out.push({ kind: 'furniture', id, chance: furnW / catTotal / furniture.length });
  return out;
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

export function poolCanOpen(state: GameState, content: Content, pool: ParcelPoolDef): boolean {
  return isUnlocked(state, content, pool.requiresUnlock) && canAfford(state, pool.cost);
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
