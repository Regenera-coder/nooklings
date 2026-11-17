import { validatePlacement } from './grid';
import { CURRENCIES, parseSeedKey } from './progress';
import type { ArcadeGameId, ArcadeState, Content, Currency, GameState, GardenState, GardenToolId, OwnedResident, ParcelRecord, Placement } from './types';

export const SAVE_VERSION = 14;

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
  // v7 -> v8 (Series 2): Treats, baking, series rewards. Every parcel so far came from the first pool.
  7: (raw) => ({ ...raw, parcelsByPool: { first_residents: raw.parcelsOpened }, version: 8 }),
  // v8 -> v9: the Succulent Garden (starts with empty pots).
  8: (raw) => ({ ...raw, version: 9 }),
  // v9 -> v10: succulent colours, pods, seeds, offsets and the Succulent book (plants keep their species' own colour).
  9: (raw) => ({ ...raw, version: 10 }),
  // v10 -> v11: leaf patterns (plants and seeds so far are plain), garden tools, gifts and goals.
  10: (raw) => ({ ...raw, version: 11 }),
  // v11 -> v12: Research (nothing studied yet).
  11: (raw) => ({ ...raw, version: 12 }),
  // v12 -> v13: Arcade Buttons counter and the daily gift (not yet claimed).
  12: (raw) => ({ ...raw, version: 13 }),
  // v13 -> v14: several trips at once (the one trip under way becomes a list), Happy friends' gifts, series milestones.
  13: (raw) => {
    const { expedition, ...rest } = raw;
    return { ...rest, expeditions: expedition ? [expedition] : [], version: 14 };
  },
};

function emptyWallet(): Record<Currency, number> {
  return { buttons: 0, wood: 0, fabric: 0, wishStamps: 0, mendingThread: 0, keepsakes: 0, ribbons: 0, treats: 0 };
}

function emptyGarden(content: Content): GardenState {
  return { pots: Array.from({ length: content.garden?.startPots ?? 0 }, () => null), grown: [], sold: 0, seeds: {}, discovered: [], patternsFound: [], podsCollected: 0, gifts: 0, tools: [], goalsClaimed: [] };
}

export function newGame(content: Content): GameState {
  const wallet = emptyWallet();
  for (const c of CURRENCIES) wallet[c] = content.starter.wallet[c] ?? 0;
  const residents: Record<string, OwnedResident> = {};
  for (const id of content.starter.residents) residents[id] = { bondXp: 0, form: 'original', lastPlayAt: 0, playsToday: 0, room: content.roomOrder[0]!, costume: null, treatDay: 0 };
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
    parcelsByPool: {},
    parcelLog: [],
    purchases: [],
    gatherReadyAt: {},
    gatherCount: 0,
    expeditions: [],
    expeditionsDone: {},
    baking: null,
    bakesDone: 0,
    garden: emptyGarden(content),
    research: { levels: {}, active: null },
    dailyGiftDay: -1,
    seriesClaimed: [],
    seriesMilestones: [],
    happyGiftDay: -1,
    costumesOwned: [],
    ribbonDay: { day: 0, fromPlay: 0, games: 0 },
    arcade: { day: 0, plays: {}, ribbons: 0, buttons: 0, best: {}, prizes: [] },
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
      residents[id] = { bondXp: nonNegInt(r.bondXp), form: r.form === 'decorated' ? 'decorated' : 'original', lastPlayAt: num(r.lastPlayAt), playsToday: Math.min(content.bond.playsPerDay, nonNegInt(r.playsToday)), room, costume: typeof r.costume === 'string' ? r.costume : null, treatDay: nonNegInt(r.treatDay) };
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
  // Trips: known routes, owned travellers, one trip per traveller.
  const expeditions: GameState['expeditions'] = [];
  for (const rawTrip of (Array.isArray(data.expeditions) ? data.expeditions : []) as Array<Raw | null>) {
    if (!rawTrip || typeof rawTrip.routeId !== 'string' || !content.expeditions[rawTrip.routeId]) continue;
    if (typeof rawTrip.residentId !== 'string' || !(rawTrip.residentId in residents) || expeditions.some((t) => t.residentId === rawTrip.residentId)) continue;
    expeditions.push({ routeId: rawTrip.routeId, residentId: rawTrip.residentId, startAt: num(rawTrip.startAt), endAt: num(rawTrip.endAt) });
  }

  const parcelsByPool: Record<string, number> = {};
  for (const [k, v] of Object.entries((data.parcelsByPool ?? {}) as Raw)) if (content.parcels[k] && nonNegInt(v) > 0) parcelsByPool[k] = nonNegInt(v);
  const rawBake = data.baking as Raw | null | undefined;
  const baking =
    rawBake && content.baking && typeof rawBake.recipeId === 'string' && content.baking.recipes[rawBake.recipeId]
      ? {
          recipeId: rawBake.recipeId,
          bakerId: typeof rawBake.bakerId === 'string' && rawBake.bakerId in residents ? rawBake.bakerId : null,
          startAt: num(rawBake.startAt),
          endAt: num(rawBake.endAt),
        }
      : null;

  const costumesOwned = strings(data.costumesOwned).filter((c, i, a) => !!content.costumes[c] && a.indexOf(c) === i);
  for (const r of Object.values(residents)) if (r.costume && !costumesOwned.includes(r.costume)) r.costume = null;
  const rd = (data.ribbonDay ?? {}) as Raw;
  const ribbonDay = { day: nonNegInt(rd.day), fromPlay: nonNegInt(rd.fromPlay), games: nonNegInt(rd.games) };

  // Arcade: keep only known games and prizes; scores within each game's range.
  const ra = (data.arcade ?? {}) as Raw;
  const isGame = (k: string): k is ArcadeGameId => k in content.arcadeGames;
  const arcade: ArcadeState = { day: nonNegInt(ra.day), plays: {}, ribbons: Math.min(content.arcade.maxRibbonsPerDay, nonNegInt(ra.ribbons)), buttons: Math.min(content.arcade.maxButtonsPerDay, nonNegInt(ra.buttons)), best: {}, prizes: [] };
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

  // Garden: at least the starting pots, at most the maximum; plants of unknown species are dropped.
  const rg = (data.garden ?? {}) as Raw;
  const garden = emptyGarden(content);
  const g = content.garden;
  if (g) {
    const rawPots = Array.isArray(rg.pots) ? (rg.pots as unknown[]) : [];
    const count = Math.min(g.maxPots, Math.max(g.startPots, rawPots.length));
    garden.pots = Array.from({ length: count }, (_, i) => {
      const p = rawPots[i] as Raw | null | undefined;
      const def = p && typeof p.speciesId === 'string' ? g.species[p.speciesId] : undefined;
      if (!p || !def) return null;
      const pod = p.pod as Raw | null | undefined;
      return {
        speciesId: def.id,
        colour: typeof p.colour === 'string' && g.colours[p.colour] ? p.colour : def.colour,
        pattern: typeof p.pattern === 'string' && g.patterns[p.pattern] ? p.pattern : 'plain',
        plantedAt: num(p.plantedAt),
        pod:
          pod && typeof pod.fatherSpecies === 'string' && g.species[pod.fatherSpecies] && typeof pod.fatherColour === 'string' && g.colours[pod.fatherColour]
            ? {
                fatherSpecies: pod.fatherSpecies,
                fatherColour: pod.fatherColour,
                fatherPattern: typeof pod.fatherPattern === 'string' && g.patterns[pod.fatherPattern] ? pod.fatherPattern : 'plain',
                readyAt: num(pod.readyAt),
              }
            : null,
        offsetTakenAt: typeof p.offsetTakenAt === 'number' && Number.isFinite(p.offsetTakenAt) ? p.offsetTakenAt : null,
      };
    });
    garden.grown = strings(rg.grown).filter((id, i, a) => !!g.species[id] && a.indexOf(id) === i);
    garden.sold = nonNegInt(rg.sold);
    const known = (key: string) => {
      const [sp, col, extra] = key.split(':');
      return !!sp && !!col && extra === undefined && !!g.species[sp] && !!g.colours[col];
    };
    for (const [k, v] of Object.entries((rg.seeds ?? {}) as Raw)) if (parseSeedKey(content, k) && nonNegInt(v) > 0) garden.seeds[k] = nonNegInt(v);
    garden.discovered = strings(rg.discovered).filter((k, i, a) => known(k) && a.indexOf(k) === i);
    garden.patternsFound = strings(rg.patternsFound).filter((k, i, a) => !!g.patterns[k] && k !== 'plain' && a.indexOf(k) === i);
    garden.podsCollected = nonNegInt(rg.podsCollected);
    garden.gifts = nonNegInt(rg.gifts);
    garden.tools = strings(rg.tools).filter((k, i, a): k is GardenToolId => k in g.tools && a.indexOf(k) === i);
    const goalIds = new Set(g.goals.map((x) => x.id));
    garden.goalsClaimed = strings(rg.goalsClaimed).filter((k, i, a) => goalIds.has(k) && a.indexOf(k) === i);
  }

  // Research: finished levels within each study's range; an active study must be the next level of a known study.
  const rr = (data.research ?? {}) as Raw;
  const research: GameState['research'] = { levels: {}, active: null };
  const studies = content.research?.studies ?? {};
  for (const [id, v] of Object.entries((rr.levels ?? {}) as Raw)) {
    const def = studies[id];
    const n = Math.min(nonNegInt(v), def?.levels.length ?? 0);
    if (def && n > 0) research.levels[id] = n;
  }
  const rAct = rr.active as Raw | null | undefined;
  if (rAct && typeof rAct.studyId === 'string' && studies[rAct.studyId] && nonNegInt(rAct.level) === (research.levels[rAct.studyId] ?? 0) + 1 && nonNegInt(rAct.level) <= studies[rAct.studyId]!.levels.length) {
    research.active = { studyId: rAct.studyId, level: nonNegInt(rAct.level), startAt: num(rAct.startAt), endAt: num(rAct.endAt) };
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
    parcelsByPool,
    parcelLog,
    purchases,
    gatherReadyAt,
    gatherCount: nonNegInt(data.gatherCount),
    expeditions,
    expeditionsDone,
    baking,
    bakesDone: nonNegInt(data.bakesDone),
    garden,
    research,
    dailyGiftDay: typeof data.dailyGiftDay === 'number' && Number.isInteger(data.dailyGiftDay) ? data.dailyGiftDay : -1,
    seriesClaimed: strings(data.seriesClaimed).filter((id, i, a) => content.series.some((x) => x.id === id && x.reward) && a.indexOf(id) === i),
    seriesMilestones: strings(data.seriesMilestones).filter((key, i, a) => {
      const cut = key.lastIndexOf(':');
      const series = content.series.find((x) => x.id === key.slice(0, cut));
      return !!series?.milestones?.some((m) => String(m.count) === key.slice(cut + 1)) && a.indexOf(key) === i;
    }),
    happyGiftDay: typeof data.happyGiftDay === 'number' && Number.isInteger(data.happyGiftDay) ? data.happyGiftDay : -1,
    costumesOwned,
    ribbonDay,
    arcade,
    companions,
    rngState: typeof data.rngState === 'number' ? data.rngState >>> 0 : fresh.rngState,
    nextUid,
    appliedCommandIds: strings(data.appliedCommandIds),
  };
}
