import { validatePlacement } from './grid';
import { CURRENCIES } from './progress';
import type { ArcadeGameId, ArcadeState, Content, Currency, GameState, OwnedResident, ParcelRecord, Placement } from './types';

export const SAVE_VERSION = 7;

type Raw = Record<string, unknown>;
type Migration = (raw: Raw) => Raw;

/** Save migrations, keyed by the version they upgrade FROM. */
const MIGRATIONS: Record<number, Migration> = {
  // v0: pre-release shape without replay protection.
  0: (raw) => ({ ...raw, appliedCommandIds: [], version: 1 }),
  // v1 (Milestone A): rooms and furniture only. v2 adds the Milestone B progress fields.
  1: (raw) => ({ ...raw, version: 2 }),
  // v2 (Milestone B) -> v3 (Milestone C): residents get a home room; new progress fields default to empty.
  2: (raw) => ({ ...raw, version: 3 }),
  // v3 -> v4: costumes and Ribbons (new fields default to empty).
  3: (raw) => ({ ...raw, version: 4 }),
  // v4 -> v5 (Milestone D): the Arcade and companions (new fields default to empty).
  4: (raw) => ({ ...raw, version: 5 }),
  // v5 -> v6: daily Arcade Ribbon cap (today's Arcade Ribbons start at 0).
  5: (raw) => ({ ...raw, version: 6 }),
  // v6 -> v7: plays per resident per day (today's plays start at 0).
  6: (raw) => ({ ...raw, version: 7 }),
};

function emptyWallet(): Record<Currency, number> {
  return { buttons: 0, wood: 0, fabric: 0, wishStamps: 0, mendingThread: 0, keepsakes: 0, ribbons: 0 };
}

export function newGame(content: Content): GameState {
  const wallet = emptyWallet();
  for (const c of CURRENCIES) wallet[c] = content.starter.wallet[c] ?? 0;
  const residents: Record<string, OwnedResident> = {};
  for (const id of content.starter.residents) residents[id] = { bondXp: 0, form: 'original', lastPlayAt: 0, playsToday: 0, room: content.roomOrder[0]!, costume: null };
  let nextUid = 1;
  const rooms: GameState['rooms'] = {};
  for (const roomId of Object.keys(content.rooms)) {
    const placements: Placement[] = [];
    for (const start of content.starter.placements[roomId] ?? []) placements.push({ ...start, uid: `f${nextUid++}` });
    rooms[roomId] = { placements };
  }
  return {
    version: SAVE_VERSION,
    homeName: content.starter.homeName,
    rooms,
    inventory: { ...content.starter.inventory },
    wallet,
    hearts: 0,
    residents,
    residentOrder: [...content.starter.residents],
    claimedTasks: [],
    craftedRecipes: [],
    flags: [],
    parcelsOpened: 0,
    parcelLog: [],
    purchases: [],
    gatherReadyAt: {},
    gatherCount: 0,
    expedition: null,
    expeditionsDone: {},
    costumesOwned: [],
    ribbonDay: { day: 0, fromPlay: 0, games: 0 },
    arcade: { day: 0, plays: {}, ribbons: 0, best: {}, prizes: [] },
    companions: {},
    rngState: content.starter.rngSeed >>> 0,
    nextUid,
    appliedCommandIds: [],
  };
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export class SaveError extends Error {}

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const nonNegInt = (v: unknown): number => Math.max(0, Math.floor(num(v)));
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Read a save defensively: upgrade old versions, refuse newer ones, and drop anything
 * that no longer fits the current content instead of crashing.
 */
export function deserialize(text: string, content: Content): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError('Save is not valid JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SaveError('Save is not an object');
  let data = raw as Raw;
  let version = typeof data.version === 'number' ? data.version : 0;
  if (version > SAVE_VERSION) throw new SaveError(`Save version ${version} is newer than this build`);
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) throw new SaveError(`No migration from save version ${version}`);
    data = migrate(data);
    version = typeof data.version === 'number' ? data.version : version + 1;
  }

  const fresh = newGame(content);

  const inventory: Record<string, number> = {};
  for (const [defId, count] of Object.entries((data.inventory ?? {}) as Raw)) {
    if (content.furniture[defId] && nonNegInt(count) > 0) inventory[defId] = nonNegInt(count);
  }

  const rooms: GameState['rooms'] = {};
  const rawRooms = (data.rooms ?? {}) as Record<string, { placements?: unknown }>;
  for (const [roomId, roomDef] of Object.entries(content.rooms)) {
    const list = Array.isArray(rawRooms[roomId]?.placements) ? (rawRooms[roomId]!.placements as Placement[]) : null;
    if (list === null) {
      rooms[roomId] = fresh.rooms[roomId] ?? { placements: [] };
      continue;
    }
    const kept: Placement[] = [];
    for (const p of list) {
      if (!p || typeof p.uid !== 'string' || typeof p.defId !== 'string') continue;
      if (kept.some((k) => k.uid === p.uid)) continue;
      if (validatePlacement(roomDef, kept, content, { defId: p.defId, col: p.col, row: p.row }).ok) {
        kept.push({ uid: p.uid, defId: p.defId, col: p.col, row: p.row, flipped: p.flipped === true });
      } else if (content.furniture[p.defId]) {
        inventory[p.defId] = (inventory[p.defId] ?? 0) + 1;
      }
    }
    rooms[roomId] = { placements: kept };
  }

  const rawWallet = (data.wallet ?? null) as Raw | null;
  const wallet = emptyWallet();
  for (const c of CURRENCIES) wallet[c] = rawWallet ? nonNegInt(rawWallet[c]) : fresh.wallet[c];

  const residents: Record<string, OwnedResident> = {};
  const rawResidents = (data.residents ?? null) as Record<string, Raw> | null;
  if (rawResidents) {
    for (const [id, r] of Object.entries(rawResidents)) {
      if (!content.residents[id] || !r) continue;
      const room = typeof r.room === 'string' && content.rooms[r.room] ? r.room : content.roomOrder[0]!;
      residents[id] = { bondXp: nonNegInt(r.bondXp), form: r.form === 'decorated' ? 'decorated' : 'original', lastPlayAt: num(r.lastPlayAt), playsToday: Math.min(content.bond.playsPerDay, nonNegInt(r.playsToday)), room, costume: typeof r.costume === 'string' ? r.costume : null };
    }
  } else {
    Object.assign(residents, fresh.residents);
  }
  const order = strings(data.residentOrder).filter((id, i, all) => id in residents && all.indexOf(id) === i);
  for (const id of Object.keys(residents)) if (!order.includes(id)) order.push(id);

  const parcelLog: ParcelRecord[] = Array.isArray(data.parcelLog)
    ? (data.parcelLog as ParcelRecord[]).filter((r) => r && typeof r.id === 'string' && (r.kind === 'resident' || r.kind === 'furniture'))
    : [];

  const purchases = strings(data.purchases).filter((k) => {
    const [roomId, kind] = k.split(':');
    const room = roomId ? content.rooms[roomId] : undefined;
    return !!room && ((kind === 'open' && !!room.access) || (kind === 'expand' && !!room.expansion));
  });
  const gatherReadyAt: Record<string, number> = {};
  for (const [k, v] of Object.entries((data.gatherReadyAt ?? {}) as Raw)) if (content.gatherSpots[k]) gatherReadyAt[k] = num(v);
  const expeditionsDone: Record<string, number> = {};
  for (const [k, v] of Object.entries((data.expeditionsDone ?? {}) as Raw)) if (content.expeditions[k]) expeditionsDone[k] = nonNegInt(v);
  const rawTrip = data.expedition as Raw | null | undefined;
  const expedition =
    rawTrip && typeof rawTrip.routeId === 'string' && content.expeditions[rawTrip.routeId] && typeof rawTrip.residentId === 'string' && rawTrip.residentId in residents
      ? { routeId: rawTrip.routeId, residentId: rawTrip.residentId, startAt: num(rawTrip.startAt), endAt: num(rawTrip.endAt) }
      : null;

  const costumesOwned = strings(data.costumesOwned).filter((c, i, a) => !!content.costumes[c] && a.indexOf(c) === i);
  for (const r of Object.values(residents)) if (r.costume && !costumesOwned.includes(r.costume)) r.costume = null;
  const rd = (data.ribbonDay ?? {}) as Raw;
  const ribbonDay = { day: nonNegInt(rd.day), fromPlay: nonNegInt(rd.fromPlay), games: nonNegInt(rd.games) };

  // Arcade: keep only known games and prizes; scores within each game's range.
  const ra = (data.arcade ?? {}) as Raw;
  const isGame = (k: string): k is ArcadeGameId => k in content.arcadeGames;
  const arcade: ArcadeState = { day: nonNegInt(ra.day), plays: {}, ribbons: Math.min(content.arcade.maxRibbonsPerDay, nonNegInt(ra.ribbons)), best: {}, prizes: [] };
  for (const [k, v] of Object.entries((ra.plays ?? {}) as Raw)) if (isGame(k)) arcade.plays[k] = Math.min(content.arcade.playsPerDay, nonNegInt(v));
  for (const [k, v] of Object.entries((ra.best ?? {}) as Raw)) if (isGame(k)) arcade.best[k] = Math.min(content.arcadeGames[k].maxScore, nonNegInt(v));
  arcade.prizes = strings(ra.prizes).filter((key, i, all) => {
    const [g, n] = key.split(':');
    return !!g && isGame(g) && /^[012]$/.test(n ?? '') && all.indexOf(key) === i;
  });
  // Companions: known ones only, following an owned resident, at most one per resident.
  const companions: GameState['companions'] = {};
  const following = new Set<string>();
  for (const [id, c] of Object.entries((data.companions ?? {}) as Record<string, Raw>)) {
    if (!content.companions[id] || !c) continue;
    let residentId = typeof c.residentId === 'string' && c.residentId in residents ? c.residentId : null;
    if (residentId && following.has(residentId)) residentId = null;
    if (residentId) following.add(residentId);
    companions[id] = { residentId };
  }

  const usedUids = Object.values(rooms).flatMap((r) => r.placements.map((p) => Number(p.uid.slice(1)) || 0));
  const nextUid = Math.max(num(data.nextUid, 1), ...usedUids.map((n) => n + 1), 1);
  const taskIds = new Set(content.tasks.map((t) => t.id));

  return {
    version: SAVE_VERSION,
    homeName: typeof data.homeName === 'string' && data.homeName.trim() ? data.homeName : fresh.homeName,
    rooms,
    inventory,
    wallet,
    hearts: nonNegInt(data.hearts),
    residents,
    residentOrder: order,
    claimedTasks: strings(data.claimedTasks).filter((id) => taskIds.has(id)),
    craftedRecipes: strings(data.craftedRecipes).filter((id) => content.recipes[id]),
    flags: strings(data.flags),
    parcelsOpened: nonNegInt(data.parcelsOpened),
    parcelLog,
    purchases,
    gatherReadyAt,
    gatherCount: nonNegInt(data.gatherCount),
    expedition,
    expeditionsDone,
    costumesOwned,
    ribbonDay,
    arcade,
    companions,
    rngState: typeof data.rngState === 'number' ? data.rngState >>> 0 : fresh.rngState,
    nextUid,
    appliedCommandIds: strings(data.appliedCommandIds),
  };
}
