import { validatePlacement, type PlacementError } from './grid';
import {
  addCost,
  bondLevel,
  canAfford,
  effectiveRoom,
  homeForNewResident,
  invitationStatus,
  isRoomOpen,
  purchaseKey,
  dayOf,
  ribbonToday,
  ribbonsForScore,
  arcadePlaysLeft,
  arcadeRibbonsLeft,
  arcadeUnlocked,
  clampScore,
  companionHomeFor,
  prizeKey,
  residentsInRoom,
  spotUnlocked,
  isUnlocked,
  levelFor,
  nextRandom,
  parcelOdds,
  parcelCost,
  friendParcelHasNew,
  parcelGuaranteed,
  pickOutcome,
  playReadyAt,
  playsLeftToday,
  taskStates,
  bakeYield,
  bakingOpen,
  canBake,
  gardenOpen,
  nextPotCost,
  succulentGrowth,
  parseSeedKey,
  plantStatus,
  seedKey,
  succulentName,
  succulentFurnitureId,
  succulentSellPrice,
  undiscovered,
  unseenPatterns,
  nextGardenGoal,
  PLAIN,
  researchSpeed,
  nextStudyLevel,
  dailyGiftAmount,
  dailyGiftReady,
  arcadeButtonsLeft,
  seriesProgress,
  treatGivenToday,
} from './progress';
import type { ArcadeGameId, Content, Cost, GameState, GardenToolId, ParcelKind, ParcelRecord, Placement } from './types';

/**
 * Every change to the game goes through a command with a unique id.
 * The same function will run on the server later (Milestone D), so it must stay
 * pure: no clocks, no Math.random, no browser or database access. Anything
 * time-based receives the time as `at`; the server will supply it in Milestone D.
 */
export type Command =
  | { id: string; type: 'place'; roomId: string; defId: string; col: number; row: number; flipped?: boolean }
  | { id: string; type: 'move'; roomId: string; uid: string; col: number; row: number }
  | { id: string; type: 'flip'; roomId: string; uid: string }
  | { id: string; type: 'store'; roomId: string; uid: string }
  | { id: string; type: 'craft'; recipeId: string }
  | { id: string; type: 'claim_task'; taskId: string }
  | { id: string; type: 'invite'; residentId: string }
  | { id: string; type: 'open_parcel'; poolId: string; kind?: ParcelKind }
  | { id: string; type: 'trade_thread' }
  | { id: string; type: 'play'; residentId: string; at: number }
  | { id: string; type: 'upgrade_form'; residentId: string }
  | { id: string; type: 'set_flag'; flag: string }
  | { id: string; type: 'buy_room'; roomId: string; kind: 'open' | 'expand' }
  | { id: string; type: 'gather'; spotId: string; at: number }
  | { id: string; type: 'start_expedition'; routeId: string; residentId: string; at: number }
  | { id: string; type: 'collect_expedition'; at: number }
  | { id: string; type: 'move_resident'; residentId: string; roomId: string }
  | { id: string; type: 'buy_costume'; costumeId: string }
  | { id: string; type: 'wear_costume'; residentId: string; costumeId: string | null }
  | { id: string; type: 'play_arcade'; gameId: ArcadeGameId; score: number; at: number }
  | { id: string; type: 'assign_companion'; companionId: string; residentId: string | null }
  | { id: string; type: 'start_baking'; recipeId: string; bakerId: string | null; at: number }
  | { id: string; type: 'collect_baking'; at: number }
  | { id: string; type: 'give_treat'; residentId: string; at: number }
  | { id: string; type: 'claim_series'; seriesId: string }
  | { id: string; type: 'plant_succulent'; pot: number; speciesId: string; at: number }
  | { id: string; type: 'sell_succulent'; pot: number; at: number }
  | { id: string; type: 'buy_pot' }
  | { id: string; type: 'plant_seed'; pot: number; seed: string; at: number }
  | { id: string; type: 'pollinate'; pot: number; fromPot: number; at: number }
  | { id: string; type: 'collect_pod'; pot: number; at: number }
  | { id: string; type: 'take_offset'; pot: number; at: number }
  | { id: string; type: 'tend_garden'; at: number }
  | { id: string; type: 'buy_garden_tool'; toolId: GardenToolId }
  | { id: string; type: 'give_succulent'; pot: number; residentId: string; at: number }
  | { id: string; type: 'claim_garden_goal'; goalId: string }
  | { id: string; type: 'display_succulent'; pot: number; at: number }
  | { id: string; type: 'start_research'; studyId: string; at: number }
  | { id: string; type: 'finish_research'; at: number }
  | { id: string; type: 'claim_daily_gift'; at: number };

export type CommandError =
  | PlacementError
  | 'unknown_room'
  | 'unknown_placement'
  | 'not_in_inventory'
  | 'cannot_flip'
  | 'unknown_recipe'
  | 'unknown_task'
  | 'unknown_resident'
  | 'unknown_pool'
  | 'locked'
  | 'cannot_afford'
  | 'not_ready'
  | 'already_done'
  | 'not_owned'
  | 'cooldown'
  | 'bad_flag'
  | 'unknown_spot'
  | 'unknown_route'
  | 'room_full'
  | 'busy'
  | 'away'
  | 'unknown_costume'
  | 'daily_limit'
  | 'unknown_game'
  | 'unknown_companion'
  | 'unknown_bake'
  | 'unknown_series'
  | 'unknown_species'
  | 'unknown_pot'
  | 'nothing_new';

export type GameEvent =
  | { type: 'placed'; roomId: string; placement: Placement }
  | { type: 'moved'; roomId: string; placement: Placement }
  | { type: 'flipped'; roomId: string; placement: Placement }
  | { type: 'stored'; roomId: string; uid: string; defId: string }
  | { type: 'crafted'; recipeId: string; furnitureId: string }
  | { type: 'task_claimed'; taskId: string; reward: Cost & { hearts?: number } }
  | { type: 'resident_joined'; residentId: string; via: 'invitation' | 'parcel' | 'expedition'; roomId: string }
  | { type: 'room_bought'; roomId: string; kind: 'open' | 'expand' }
  | { type: 'gathered'; spotId: string; yield: Cost }
  | { type: 'expedition_started'; routeId: string; residentId: string; endAt: number }
  | { type: 'expedition_done'; routeId: string; residentId: string; reward: Cost & { hearts?: number } }
  | { type: 'resident_moved'; residentId: string; roomId: string }
  | { type: 'ribbons_earned'; amount: number; source: 'play' | 'arcade' | 'expedition' }
  | { type: 'costume_bought'; costumeId: string }
  | { type: 'costume_worn'; residentId: string; costumeId: string | null }
  | { type: 'arcade_done'; gameId: ArcadeGameId; score: number; best: number; newBest: boolean; ribbons: number; playsLeft: number; ribbonsLeft: number; buttons: number; buttonsLeft: number }
  | { type: 'prize_won'; gameId: ArcadeGameId; index: number; kind: 'furniture' | 'companion'; id: string; residentId: string | null }
  | { type: 'companion_assigned'; companionId: string; residentId: string | null }
  | { type: 'parcel_opened'; record: ParcelRecord; threadGranted: number }
  | { type: 'baking_started'; recipeId: string; bakerId: string | null; endAt: number }
  | { type: 'baking_done'; recipeId: string; bakerId: string | null; treats: number; bonus: number }
  | { type: 'treat_given'; residentId: string; bondUp: boolean; newBondLevel: number }
  | { type: 'thread_traded'; thread: number; wishStamps: number }
  | { type: 'series_claimed'; seriesId: string; reward: Cost; furnitureId: string | null }
  | { type: 'played'; residentId: string; bondUp: boolean; newBondLevel: number }
  | { type: 'form_upgraded'; residentId: string; form: string }
  | { type: 'succulent_planted'; pot: number; speciesId: string; grownAt: number }
  | { type: 'succulent_sold'; pot: number; speciesId: string; reward: Cost; firstTime: boolean }
  | { type: 'pot_bought'; pots: number }
  | { type: 'seed_planted'; pot: number; seed: string; grownAt: number }
  | { type: 'pollinated'; pot: number; fromPot: number; readyAt: number }
  | { type: 'pod_collected'; pot: number; seeds: string[]; mutations: number }
  | { type: 'offset_taken'; pot: number; seed: string }
  | { type: 'discovered'; keys: string[]; patterns: string[] }
  | { type: 'garden_tool_bought'; toolId: GardenToolId }
  | { type: 'succulent_given'; pot: number; residentId: string; name: string; bondUp: boolean; newBondLevel: number }
  | { type: 'garden_goal_claimed'; goalId: string; reward: Cost & { hearts?: number } }
  | { type: 'succulent_displayed'; pot: number; furnitureId: string }
  | { type: 'research_started'; studyId: string; level: number; endAt: number }
  | { type: 'research_finished'; studyId: string; level: number }
  | { type: 'daily_gift'; buttons: number }
  | { type: 'hearts'; amount: number }
  | { type: 'level_up'; level: number };

export type CommandResult =
  | { ok: true; state: GameState; events: GameEvent[]; duplicate: boolean }
  | { ok: false; error: CommandError };

const MAX_REMEMBERED_COMMANDS = 64;
const MAX_PARCEL_LOG = 50;
const FLAG_PATTERN = /^viewed:[a-z_]+$/;

type Draft = { state: GameState; events: GameEvent[] };

function addSeeds(seeds: Record<string, number>, keys: string[], sign: 1 | -1): Record<string, number> {
  const out = { ...seeds };
  for (const k of keys) {
    out[k] = (out[k] ?? 0) + sign;
    if (out[k]! <= 0) delete out[k];
  }
  return out;
}

/** Add every grown plant's species-and-colour to the Succulent book, with Hearts for each new one. */
function discover(d: Draft, content: Content, at: number): void {
  const g = content.garden;
  const keys = undiscovered(d.state, content, at);
  const patterns = unseenPatterns(d.state, content, at);
  if (!g || (!keys.length && !patterns.length)) return;
  d.state = { ...d.state, garden: { ...d.state.garden, discovered: [...d.state.garden.discovered, ...keys], patternsFound: [...d.state.garden.patternsFound, ...patterns] } };
  d.events.push({ type: 'discovered', keys, patterns });
  if (g.heartsPerDiscovery > 0) addHearts(d, g.heartsPerDiscovery * keys.length, content);
}

function addHearts(d: Draft, amount: number, content: Content): void {
  if (amount <= 0) return;
  const before = levelFor(d.state.hearts, content);
  d.state = { ...d.state, hearts: d.state.hearts + amount };
  d.events.push({ type: 'hearts', amount });
  const after = levelFor(d.state.hearts, content);
  for (let l = before + 1; l <= after; l++) d.events.push({ type: 'level_up', level: l });
}

function grantResident(
  d: Draft,
  content: Content,
  residentId: string,
  via: 'invitation' | 'parcel' | 'expedition',
  preferredRoom?: string,
): void {
  // Invited residents move into the room they were invited to, if it has space.
  const room =
    preferredRoom && isRoomOpen(d.state, content, preferredRoom) && residentsInRoom(d.state, preferredRoom).length < content.rules.maxResidentsPerRoom
      ? preferredRoom
      : homeForNewResident(d.state, content);
  d.state = {
    ...d.state,
    residents: { ...d.state.residents, [residentId]: { bondXp: 0, form: 'original', lastPlayAt: 0, playsToday: 0, room, costume: null, treatDay: 0 } },
    residentOrder: [...d.state.residentOrder, residentId],
  };
  d.events.push({ type: 'resident_joined', residentId, via, roomId: room });
  addHearts(d, content.rules.heartsPerNewResident, content);
}

export function applyCommand(state: GameState, cmd: Command, content: Content): CommandResult {
  if (state.appliedCommandIds.includes(cmd.id)) {
    return { ok: true, state, events: [], duplicate: true };
  }
  const result = run(state, cmd, content);
  if (!result.ok) return result;
  return {
    ok: true,
    duplicate: false,
    events: result.events,
    state: { ...result.state, appliedCommandIds: [...state.appliedCommandIds, cmd.id].slice(-MAX_REMEMBERED_COMMANDS) },
  };
}

function run(state: GameState, cmd: Command, content: Content): { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: CommandError } {
  const d: Draft = { state, events: [] };
  const done = () => ({ ok: true as const, state: d.state, events: d.events });
  const fail = (error: CommandError) => ({ ok: false as const, error });

  switch (cmd.type) {
    case 'place':
    case 'move':
    case 'flip':
    case 'store': {
      const roomDef = effectiveRoom(state, content, cmd.roomId);
      const room = state.rooms[cmd.roomId];
      if (!roomDef || !room) return fail('unknown_room');
      if (!isRoomOpen(state, content, cmd.roomId) && cmd.type !== 'store') return fail('locked');
      const setRoom = (placements: Placement[], inventory = state.inventory, nextUid = state.nextUid) => {
        d.state = { ...state, rooms: { ...state.rooms, [cmd.roomId]: { placements } }, inventory, nextUid };
      };
      if (cmd.type === 'place') {
        const def = content.furniture[cmd.defId];
        if (!def) return fail('unknown_item');
        if ((state.inventory[cmd.defId] ?? 0) < 1) return fail('not_in_inventory');
        const check = validatePlacement(roomDef, room.placements, content, cmd);
        if (!check.ok) return fail(check.reason);
        const placement: Placement = { uid: `f${state.nextUid}`, defId: cmd.defId, col: cmd.col, row: cmd.row, flipped: def.canFlip ? cmd.flipped === true : false };
        const inventory = { ...state.inventory, [cmd.defId]: (state.inventory[cmd.defId] ?? 0) - 1 };
        if (inventory[cmd.defId] === 0) delete inventory[cmd.defId];
        setRoom([...room.placements, placement], inventory, state.nextUid + 1);
        d.events.push({ type: 'placed', roomId: cmd.roomId, placement });
        return done();
      }
      const current = room.placements.find((p) => p.uid === cmd.uid);
      if (!current) return fail('unknown_placement');
      if (cmd.type === 'move') {
        const check = validatePlacement(roomDef, room.placements, content, { defId: current.defId, col: cmd.col, row: cmd.row }, cmd.uid);
        if (!check.ok) return fail(check.reason);
        const placement = { ...current, col: cmd.col, row: cmd.row };
        setRoom(room.placements.map((p) => (p.uid === cmd.uid ? placement : p)));
        d.events.push({ type: 'moved', roomId: cmd.roomId, placement });
        return done();
      }
      if (cmd.type === 'flip') {
        if (!content.furniture[current.defId]?.canFlip) return fail('cannot_flip');
        const placement = { ...current, flipped: !current.flipped };
        setRoom(room.placements.map((p) => (p.uid === cmd.uid ? placement : p)));
        d.events.push({ type: 'flipped', roomId: cmd.roomId, placement });
        return done();
      }
      const inventory = { ...state.inventory, [current.defId]: (state.inventory[current.defId] ?? 0) + 1 };
      setRoom(room.placements.filter((p) => p.uid !== cmd.uid), inventory);
      d.events.push({ type: 'stored', roomId: cmd.roomId, uid: current.uid, defId: current.defId });
      return done();
    }

    case 'craft': {
      const recipe = content.recipes[cmd.recipeId];
      if (!recipe) return fail('unknown_recipe');
      if (!isUnlocked(state, content, 'crafting') || levelFor(state.hearts, content) < recipe.requiresLevel) return fail('locked');
      if (!canAfford(state, recipe.cost)) return fail('cannot_afford');
      const first = !state.craftedRecipes.includes(recipe.id);
      d.state = {
        ...state,
        wallet: addCost(state.wallet, recipe.cost, -1),
        inventory: { ...state.inventory, [recipe.furnitureId]: (state.inventory[recipe.furnitureId] ?? 0) + 1 },
        craftedRecipes: first ? [...state.craftedRecipes, recipe.id] : state.craftedRecipes,
      };
      d.events.push({ type: 'crafted', recipeId: recipe.id, furnitureId: recipe.furnitureId });
      if (first) addHearts(d, content.rules.heartsPerFirstCraft, content);
      return done();
    }

    case 'claim_task': {
      const entry = taskStates(state, content).find((t) => t.def.id === cmd.taskId);
      if (!entry) return fail('unknown_task');
      if (entry.status === 'claimed') return fail('already_done');
      if (entry.status !== 'claimable') return fail('not_ready');
      const { hearts = 0, ...cost } = entry.def.reward;
      d.state = { ...state, wallet: addCost(state.wallet, cost, 1), claimedTasks: [...state.claimedTasks, cmd.taskId] };
      d.events.push({ type: 'task_claimed', taskId: cmd.taskId, reward: entry.def.reward });
      addHearts(d, hearts, content);
      return done();
    }

    case 'invite': {
      const status = invitationStatus(state, content, cmd.residentId);
      if (!status) return fail('unknown_resident');
      if (status.owned) return fail('already_done');
      if (!status.levelOk) return fail('locked');
      if (!status.giftOk) return fail('cannot_afford');
      if (!status.ready) return fail('not_ready');
      d.state = { ...state, wallet: addCost(state.wallet, status.def.welcomeGift, -1) };
      grantResident(d, content, cmd.residentId, 'invitation', status.def.roomId);
      return done();
    }

    case 'open_parcel': {
      const pool = content.parcels[cmd.poolId];
      if (!pool) return fail('unknown_pool');
      if (!isUnlocked(state, content, pool.requiresUnlock)) return fail('locked');
      const kind: ParcelKind = cmd.kind === 'furniture' ? 'furniture' : 'friend';
      const price = parcelCost(pool, kind);
      if (!canAfford(state, price)) return fail('cannot_afford');
      // A Friend Parcel that could only hold duplicates is not sold.
      if (kind === 'friend' && !friendParcelHasNew(state, content, cmd.poolId)) return fail('nothing_new');
      const odds = parcelOdds(state, content, cmd.poolId, kind);
      const openedHere = state.parcelsByPool[pool.id] ?? 0;
      const guaranteed = kind === 'friend' && parcelGuaranteed(state, content, cmd.poolId);
      const [roll, rngState] = guaranteed ? [0, state.rngState] : nextRandom(state.rngState);
      const outcome = pickOutcome(odds, roll);
      if (!outcome) return fail('not_ready');
      const duplicate = outcome.kind === 'resident' && outcome.id in state.residents;
      const record: ParcelRecord = { n: state.parcelsOpened + 1, poolId: pool.id, kind: outcome.kind, id: outcome.id, duplicate, guaranteed };
      let wallet = addCost(state.wallet, price, -1);
      let inventory = state.inventory;
      const threadGranted = duplicate ? pool.duplicateThread : 0;
      if (duplicate) wallet = addCost(wallet, { mendingThread: threadGranted }, 1);
      if (outcome.kind === 'furniture') inventory = { ...inventory, [outcome.id]: (inventory[outcome.id] ?? 0) + 1 };
      d.state = {
        ...state,
        wallet,
        inventory,
        rngState,
        parcelsOpened: state.parcelsOpened + 1,
        parcelsByPool: { ...state.parcelsByPool, [pool.id]: openedHere + 1 },
        parcelLog: [...state.parcelLog, record].slice(-MAX_PARCEL_LOG),
      };
      d.events.push({ type: 'parcel_opened', record, threadGranted });
      if (outcome.kind === 'resident' && !duplicate) grantResident(d, content, outcome.id, 'parcel');
      return done();
    }

    case 'trade_thread': {
      const need = content.rules.threadPerStamp;
      if (!(need > 0)) return fail('locked');
      if (state.wallet.mendingThread < need) return fail('cannot_afford');
      d.state = { ...state, wallet: addCost(addCost(state.wallet, { mendingThread: need }, -1), { wishStamps: 1 }, 1) };
      d.events.push({ type: 'thread_traded', thread: need, wishStamps: 1 });
      return done();
    }

    case 'play': {
      const owned = state.residents[cmd.residentId];
      if (!content.residents[cmd.residentId]) return fail('unknown_resident');
      if (!owned) return fail('not_owned');
      if (state.expedition?.residentId === cmd.residentId) return fail('away');
      if (!Number.isFinite(cmd.at) || cmd.at < playReadyAt(state, content, cmd.residentId)) return fail('cooldown');
      const playsLeft = playsLeftToday(state, content, cmd.residentId, cmd.at);
      if (playsLeft <= 0) return fail('daily_limit');
      const playsToday = content.bond.playsPerDay - playsLeft + 1;
      const before = bondLevel(owned.bondXp, content);
      const bondXp = owned.bondXp + 1;
      const after = bondLevel(bondXp, content);
      d.state = {
        ...state,
        wallet: addCost(state.wallet, content.bond.playReward, 1),
        residents: { ...state.residents, [cmd.residentId]: { ...owned, bondXp, lastPlayAt: cmd.at, playsToday } },
      };
      d.events.push({ type: 'played', residentId: cmd.residentId, bondUp: after > before, newBondLevel: after });
      // Ribbons for playing, up to a daily limit.
      const today = ribbonToday(d.state, content, cmd.at);
      if (today.fromPlay < content.ribbons.playsPerDay && content.ribbons.perPlay > 0) {
        d.state = {
          ...d.state,
          wallet: addCost(d.state.wallet, { ribbons: content.ribbons.perPlay }, 1),
          ribbonDay: { day: dayOf(cmd.at, content), fromPlay: today.fromPlay + 1, games: today.games },
        };
        d.events.push({ type: 'ribbons_earned', amount: content.ribbons.perPlay, source: 'play' });
      }
      if (after > before) addHearts(d, content.bond.heartsPerBondLevel * (after - before), content);
      return done();
    }

    case 'upgrade_form': {
      const owned = state.residents[cmd.residentId];
      if (!content.residents[cmd.residentId]) return fail('unknown_resident');
      if (!owned) return fail('not_owned');
      const upgrade = content.formUpgrades.find((u) => u.form === 'decorated');
      if (!upgrade) return fail('locked');
      if (owned.form === 'decorated') return fail('already_done');
      if (bondLevel(owned.bondXp, content) < upgrade.requiresBond) return fail('locked');
      if (!canAfford(state, upgrade.cost)) return fail('cannot_afford');
      d.state = {
        ...state,
        wallet: addCost(state.wallet, upgrade.cost, -1),
        residents: { ...state.residents, [cmd.residentId]: { ...owned, form: 'decorated' } },
      };
      d.events.push({ type: 'form_upgraded', residentId: cmd.residentId, form: 'decorated' });
      addHearts(d, upgrade.hearts, content);
      return done();
    }

    case 'buy_room': {
      const room = content.rooms[cmd.roomId];
      if (!room) return fail('unknown_room');
      const option = cmd.kind === 'open' ? room.access : room.expansion;
      if (!option) return fail('unknown_room');
      const key = purchaseKey(cmd.roomId, cmd.kind);
      if (state.purchases.includes(key)) return fail('already_done');
      if (cmd.kind === 'expand' && !isRoomOpen(state, content, cmd.roomId)) return fail('locked');
      if (!isUnlocked(state, content, option.unlock)) return fail('locked');
      if (!canAfford(state, option.cost)) return fail('cannot_afford');
      d.state = { ...state, wallet: addCost(state.wallet, option.cost, -1), purchases: [...state.purchases, key] };
      d.events.push({ type: 'room_bought', roomId: cmd.roomId, kind: cmd.kind });
      return done();
    }

    case 'gather': {
      const spot = content.gatherSpots[cmd.spotId];
      if (!spot) return fail('unknown_spot');
      if (!spotUnlocked(state, content, cmd.spotId)) return fail('locked');
      if (!Number.isFinite(cmd.at) || cmd.at < (state.gatherReadyAt[cmd.spotId] ?? 0)) return fail('cooldown');
      d.state = {
        ...state,
        wallet: addCost(state.wallet, spot.yield, 1),
        gatherReadyAt: { ...state.gatherReadyAt, [cmd.spotId]: cmd.at + Math.round(spot.cooldownMs * researchSpeed(state, content).spots) },
        gatherCount: state.gatherCount + 1,
      };
      d.events.push({ type: 'gathered', spotId: cmd.spotId, yield: spot.yield });
      return done();
    }

    case 'start_expedition': {
      const route = content.expeditions[cmd.routeId];
      if (!route) return fail('unknown_route');
      if (!isUnlocked(state, content, route.requiresUnlock)) return fail('locked');
      if (!state.residents[cmd.residentId]) return fail('not_owned');
      if (state.expedition) return fail('busy');
      if (!Number.isFinite(cmd.at)) return fail('not_ready');
      const expedition = { routeId: route.id, residentId: cmd.residentId, startAt: cmd.at, endAt: cmd.at + Math.round(route.durationMs * researchSpeed(state, content).trips) };
      d.state = { ...state, expedition };
      d.events.push({ type: 'expedition_started', routeId: route.id, residentId: cmd.residentId, endAt: expedition.endAt });
      return done();
    }

    case 'collect_expedition': {
      const trip = state.expedition;
      if (!trip) return fail('not_ready');
      if (!Number.isFinite(cmd.at) || cmd.at < trip.endAt) return fail('not_ready');
      const route = content.expeditions[trip.routeId];
      if (!route) return fail('unknown_route');
      const { hearts = 0, ...cost } = route.reward;
      const firstTime = !state.expeditionsDone[route.id];
      d.state = {
        ...state,
        wallet: addCost(state.wallet, cost, 1),
        expedition: null,
        expeditionsDone: { ...state.expeditionsDone, [route.id]: (state.expeditionsDone[route.id] ?? 0) + 1 },
      };
      d.events.push({ type: 'expedition_done', routeId: route.id, residentId: trip.residentId, reward: route.reward });
      addHearts(d, hearts, content);
      if (firstTime && route.firstTimeResident && !(route.firstTimeResident in d.state.residents)) {
        grantResident(d, content, route.firstTimeResident, 'expedition');
      }
      return done();
    }

    case 'move_resident': {
      const owned = state.residents[cmd.residentId];
      if (!content.residents[cmd.residentId]) return fail('unknown_resident');
      if (!owned) return fail('not_owned');
      if (!content.rooms[cmd.roomId]) return fail('unknown_room');
      if (!isRoomOpen(state, content, cmd.roomId)) return fail('locked');
      if (owned.room === cmd.roomId) return fail('already_done');
      if (residentsInRoom(state, cmd.roomId).length >= content.rules.maxResidentsPerRoom) return fail('room_full');
      d.state = { ...state, residents: { ...state.residents, [cmd.residentId]: { ...owned, room: cmd.roomId } } };
      d.events.push({ type: 'resident_moved', residentId: cmd.residentId, roomId: cmd.roomId });
      return done();
    }

    case 'buy_costume': {
      const costume = content.costumes[cmd.costumeId];
      if (!costume || costume.hidden) return fail('unknown_costume');
      if (!state.residents[costume.residentId]) return fail('not_owned');
      if (state.costumesOwned.includes(costume.id)) return fail('already_done');
      if (levelFor(state.hearts, content) < costume.requiresLevel) return fail('locked');
      if (!canAfford(state, costume.cost)) return fail('cannot_afford');
      d.state = { ...state, wallet: addCost(state.wallet, costume.cost, -1), costumesOwned: [...state.costumesOwned, costume.id] };
      d.events.push({ type: 'costume_bought', costumeId: costume.id });
      return done();
    }

    case 'wear_costume': {
      const owned = state.residents[cmd.residentId];
      if (!content.residents[cmd.residentId]) return fail('unknown_resident');
      if (!owned) return fail('not_owned');
      if (cmd.costumeId !== null) {
        const costume = content.costumes[cmd.costumeId];
        if (!costume || costume.residentId !== cmd.residentId) return fail('unknown_costume');
        if (!state.costumesOwned.includes(costume.id)) return fail('not_owned');
      }
      if (owned.costume === cmd.costumeId) return fail('already_done');
      d.state = { ...state, residents: { ...state.residents, [cmd.residentId]: { ...owned, costume: cmd.costumeId } } };
      d.events.push({ type: 'costume_worn', residentId: cmd.residentId, costumeId: cmd.costumeId });
      return done();
    }

    case 'play_arcade': {
      const game = content.arcadeGames[cmd.gameId];
      if (!game) return fail('unknown_game');
      if (!Number.isFinite(cmd.at) || !Number.isFinite(cmd.score)) return fail('not_ready');
      if (!arcadeUnlocked(state, content, cmd.gameId)) return fail('locked');
      const left = arcadePlaysLeft(state, content, cmd.gameId, cmd.at);
      if (left <= 0) return fail('daily_limit');
      const score = clampScore(game, cmd.score);
      // The daily Arcade cap trims the round's Ribbons; the round itself still counts.
      const ribbonsLeft = arcadeRibbonsLeft(state, content, cmd.at);
      const ribbons = Math.min(ribbonsForScore(content, game, score), ribbonsLeft);
      const day = dayOf(cmd.at, content);
      const sameDay = state.arcade.day === day;
      const plays = sameDay ? { ...state.arcade.plays } : {};
      const ribbonsToday = (sameDay ? state.arcade.ribbons : 0) + ribbons;
      // Buttons too: a share of the score, up to a daily Arcade limit.
      const buttonsLeft = arcadeButtonsLeft(state, content, cmd.at);
      const buttons = Math.min(Math.floor(score * content.arcade.buttonsPerPoint), buttonsLeft);
      const buttonsToday = (sameDay ? state.arcade.buttons : 0) + buttons;
      plays[cmd.gameId] = (plays[cmd.gameId] ?? 0) + 1;
      const oldBest = state.arcade.best[cmd.gameId] ?? 0;
      const best = Math.max(oldBest, score);
      d.state = {
        ...state,
        wallet: addCost(state.wallet, { ribbons, buttons }, 1),
        arcade: { ...state.arcade, day, plays, ribbons: ribbonsToday, buttons: buttonsToday, best: { ...state.arcade.best, [cmd.gameId]: best } },
      };
      d.events.push({ type: 'arcade_done', gameId: cmd.gameId, score, best, newBest: score > oldBest, ribbons, playsLeft: left - 1, ribbonsLeft: ribbonsLeft - ribbons, buttons, buttonsLeft: buttonsLeft - buttons });
      if (ribbons > 0) d.events.push({ type: 'ribbons_earned', amount: ribbons, source: 'arcade' });
      // Prizes: each is granted once, the first time a round reaches its score.
      game.prizes.forEach((prize, index) => {
        const key = prizeKey(cmd.gameId, index);
        if (score < prize.score || d.state.arcade.prizes.includes(key)) return;
        let residentId: string | null = null;
        if (prize.kind === 'furniture') {
          if (!content.furniture[prize.id]) return;
          d.state = { ...d.state, inventory: { ...d.state.inventory, [prize.id]: (d.state.inventory[prize.id] ?? 0) + 1 } };
        } else {
          if (!content.companions[prize.id] || d.state.companions[prize.id]) return;
          residentId = companionHomeFor(d.state, game.host);
          d.state = { ...d.state, companions: { ...d.state.companions, [prize.id]: { residentId } } };
        }
        d.state = { ...d.state, arcade: { ...d.state.arcade, prizes: [...d.state.arcade.prizes, key] } };
        d.events.push({ type: 'prize_won', gameId: cmd.gameId, index, kind: prize.kind, id: prize.id, residentId });
      });
      return done();
    }

    case 'start_baking': {
      const rules = content.baking;
      const recipe = rules?.recipes[cmd.recipeId];
      if (!rules || !recipe) return fail('unknown_bake');
      if (!bakingOpen(state, content) || levelFor(state.hearts, content) < recipe.requiresLevel) return fail('locked');
      if (state.baking) return fail('busy');
      if (!Number.isFinite(cmd.at)) return fail('not_ready');
      if (cmd.bakerId !== null) {
        if (!content.residents[cmd.bakerId]) return fail('unknown_resident');
        if (!state.residents[cmd.bakerId]) return fail('not_owned');
        if (state.expedition?.residentId === cmd.bakerId) return fail('away');
        if (!canBake(state, content, cmd.bakerId)) return fail('locked');
      }
      if (!canAfford(state, recipe.cost)) return fail('cannot_afford');
      const baking = { recipeId: recipe.id, bakerId: cmd.bakerId, startAt: cmd.at, endAt: cmd.at + Math.round(recipe.durationMs * researchSpeed(state, content).baking) };
      d.state = { ...state, wallet: addCost(state.wallet, recipe.cost, -1), baking };
      d.events.push({ type: 'baking_started', recipeId: recipe.id, bakerId: cmd.bakerId, endAt: baking.endAt });
      return done();
    }

    case 'collect_baking': {
      const batch = state.baking;
      if (!batch) return fail('not_ready');
      if (!Number.isFinite(cmd.at) || cmd.at < batch.endAt) return fail('not_ready');
      // A baker who has since left the game's content still leaves a plain batch behind.
      const bakerId = batch.bakerId && batch.bakerId in state.residents ? batch.bakerId : null;
      const { treats, bonus } = bakeYield(content, batch.recipeId, bakerId);
      d.state = { ...state, wallet: addCost(state.wallet, { treats }, 1), baking: null, bakesDone: state.bakesDone + 1 };
      d.events.push({ type: 'baking_done', recipeId: batch.recipeId, bakerId, treats, bonus });
      return done();
    }

    case 'give_treat': {
      const rules = content.baking;
      const owned = state.residents[cmd.residentId];
      if (!content.residents[cmd.residentId]) return fail('unknown_resident');
      if (!owned) return fail('not_owned');
      if (!rules) return fail('locked');
      if (state.expedition?.residentId === cmd.residentId) return fail('away');
      if (!Number.isFinite(cmd.at)) return fail('not_ready');
      if (treatGivenToday(state, content, cmd.residentId, cmd.at)) return fail('daily_limit');
      if (!canAfford(state, rules.giftCost)) return fail('cannot_afford');
      const before = bondLevel(owned.bondXp, content);
      const bondXp = owned.bondXp + rules.giftBondXp;
      const after = bondLevel(bondXp, content);
      d.state = {
        ...state,
        wallet: addCost(state.wallet, rules.giftCost, -1),
        residents: { ...state.residents, [cmd.residentId]: { ...owned, bondXp, treatDay: dayOf(cmd.at, content) } },
      };
      d.events.push({ type: 'treat_given', residentId: cmd.residentId, bondUp: after > before, newBondLevel: after });
      if (after > before) addHearts(d, content.bond.heartsPerBondLevel * (after - before), content);
      return done();
    }

    case 'claim_series': {
      const series = content.series.find((x) => x.id === cmd.seriesId);
      if (!series || !series.reward) return fail('unknown_series');
      const progress = seriesProgress(state, content, series.id);
      if (progress.claimed) return fail('already_done');
      if (!progress.complete) return fail('not_ready');
      const furnitureId = series.reward.furnitureId && content.furniture[series.reward.furnitureId] ? series.reward.furnitureId : null;
      d.state = {
        ...state,
        wallet: addCost(state.wallet, series.reward.cost, 1),
        inventory: furnitureId ? { ...state.inventory, [furnitureId]: (state.inventory[furnitureId] ?? 0) + 1 } : state.inventory,
        seriesClaimed: [...state.seriesClaimed, series.id],
      };
      d.events.push({ type: 'series_claimed', seriesId: series.id, reward: series.reward.cost, furnitureId });
      return done();
    }

    case 'plant_succulent': {
      const g = content.garden;
      const def = g?.species[cmd.speciesId];
      if (!g || !def) return fail('unknown_species');
      if (!gardenOpen(state, content)) return fail('locked');
      if (!Number.isInteger(cmd.pot) || cmd.pot < 0 || cmd.pot >= state.garden.pots.length) return fail('unknown_pot');
      if (state.garden.pots[cmd.pot]) return fail('busy');
      if (!Number.isFinite(cmd.at)) return fail('not_ready');
      if (!canAfford(state, def.seedCost)) return fail('cannot_afford');
      const pots = [...state.garden.pots];
      pots[cmd.pot] = { speciesId: def.id, colour: def.colour, pattern: PLAIN, plantedAt: cmd.at, pod: null, offsetTakenAt: null };
      d.state = { ...state, wallet: addCost(state.wallet, def.seedCost, -1), garden: { ...state.garden, pots } };
      d.events.push({ type: 'succulent_planted', pot: cmd.pot, speciesId: def.id, grownAt: cmd.at + Math.round((def.sproutMs + def.growMs) * researchSpeed(state, content).grow) });
      return done();
    }

    case 'sell_succulent': {
      const g = content.garden;
      if (!g) return fail('locked');
      if (!Number.isInteger(cmd.pot) || cmd.pot < 0 || cmd.pot >= state.garden.pots.length) return fail('unknown_pot');
      const plant = state.garden.pots[cmd.pot];
      if (!plant) return fail('not_ready');
      const def = g.species[plant.speciesId];
      const growth = succulentGrowth(content, plant.speciesId, plant.plantedAt, cmd.at, researchSpeed(state, content).grow);
      if (!def || !growth || !Number.isFinite(cmd.at) || growth.stage !== 'grown') return fail('not_ready');
      if (plant.pod) return fail('busy');
      discover(d, content, cmd.at);
      const firstTime = !d.state.garden.grown.includes(def.id);
      const reward = succulentSellPrice(content, plant);
      const pots = [...d.state.garden.pots];
      pots[cmd.pot] = null;
      d.state = {
        ...d.state,
        wallet: addCost(d.state.wallet, reward, 1),
        garden: { ...d.state.garden, pots, grown: firstTime ? [...d.state.garden.grown, def.id] : d.state.garden.grown, sold: d.state.garden.sold + 1 },
      };
      d.events.push({ type: 'succulent_sold', pot: cmd.pot, speciesId: def.id, reward, firstTime });
      if (firstTime && g.heartsPerNewSpecies > 0) addHearts(d, g.heartsPerNewSpecies, content);
      return done();
    }

    case 'plant_seed': {
      const g = content.garden;
      if (!g || !gardenOpen(state, content)) return fail('locked');
      const seed = parseSeedKey(content, cmd.seed);
      if (!seed || !(state.garden.seeds[cmd.seed]! > 0)) return fail('unknown_species');
      if (!Number.isInteger(cmd.pot) || cmd.pot < 0 || cmd.pot >= state.garden.pots.length) return fail('unknown_pot');
      if (state.garden.pots[cmd.pot]) return fail('busy');
      if (!Number.isFinite(cmd.at)) return fail('not_ready');
      const def = g.species[seed.speciesId]!;
      const pots = [...state.garden.pots];
      pots[cmd.pot] = { speciesId: seed.speciesId, colour: seed.colour, pattern: seed.pattern, plantedAt: cmd.at, pod: null, offsetTakenAt: null };
      d.state = { ...state, garden: { ...state.garden, pots, seeds: addSeeds(state.garden.seeds, [cmd.seed], -1) } };
      d.events.push({ type: 'seed_planted', pot: cmd.pot, seed: cmd.seed, grownAt: cmd.at + Math.round((def.sproutMs + def.growMs) * researchSpeed(state, content).grow) });
      return done();
    }

    case 'pollinate': {
      const g = content.garden;
      if (!g || !gardenOpen(state, content)) return fail('locked');
      const pots = state.garden.pots;
      const ok = (i: number) => Number.isInteger(i) && i >= 0 && i < pots.length;
      if (!ok(cmd.pot) || !ok(cmd.fromPot) || cmd.pot === cmd.fromPot) return fail('unknown_pot');
      const mother = pots[cmd.pot];
      const father = pots[cmd.fromPot];
      if (!mother || !father || !Number.isFinite(cmd.at)) return fail('not_ready');
      const tools = state.garden.tools;
      const speed = researchSpeed(state, content);
      if (!plantStatus(content, mother, cmd.at, tools, speed)?.blooming || !plantStatus(content, father, cmd.at, tools, speed)?.blooming) return fail('not_ready');
      if (mother.pod) return fail('busy');
      const readyAt = cmd.at + Math.round(g.podMs * researchSpeed(state, content).flower);
      const next = [...pots];
      next[cmd.pot] = { ...mother, pod: { fatherSpecies: father.speciesId, fatherColour: father.colour, fatherPattern: father.pattern, readyAt } };
      d.state = { ...state, garden: { ...state.garden, pots: next } };
      discover(d, content, cmd.at);
      d.events.push({ type: 'pollinated', pot: cmd.pot, fromPot: cmd.fromPot, readyAt });
      return done();
    }

    case 'collect_pod': {
      const g = content.garden;
      if (!g) return fail('locked');
      if (!Number.isInteger(cmd.pot) || cmd.pot < 0 || cmd.pot >= state.garden.pots.length) return fail('unknown_pot');
      const plant = state.garden.pots[cmd.pot];
      if (!plant?.pod || !Number.isFinite(cmd.at) || cmd.at < plant.pod.readyAt) return fail('not_ready');
      // Each seed takes its shape from one parent and its colour from one parent, chosen separately;
      // now and then the colour mutates to one neither parent has.
      let rng = state.rngState;
      const roll = () => {
        const [v, n] = nextRandom(rng);
        rng = n;
        return v;
      };
      const seeds: string[] = [];
      let mutations = 0;
      const pod = plant.pod;
      const pick = <T,>(list: T[]): T => list[Math.min(list.length - 1, Math.floor(roll() * list.length))]!;
      const count = g.seedsPerPod + (state.garden.tools.includes('pollen_jar') ? g.pollenJarSeeds : 0);
      for (let i = 0; i < count; i++) {
        const species = roll() < 0.5 ? plant.speciesId : pod.fatherSpecies;
        let colour = roll() < 0.5 ? plant.colour : pod.fatherColour;
        if (roll() < g.mutationChance + researchSpeed(state, content).mutation) {
          const others = g.colourOrder.filter((c) => c !== plant.colour && c !== pod.fatherColour);
          if (others.length) {
            colour = pick(others);
            mutations++;
          }
        }
        let pattern = roll() < 0.5 ? plant.pattern : pod.fatherPattern;
        if (roll() < g.patternMutationChance + researchSpeed(state, content).mutation) {
          const others = g.patternOrder.filter((x) => x !== PLAIN && x !== plant.pattern && x !== pod.fatherPattern);
          if (others.length) {
            pattern = pick(others);
            mutations++;
          }
        }
        seeds.push(seedKey(g.species[species] ? species : plant.speciesId, g.colours[colour] ? colour : plant.colour, g.patterns[pattern] ? pattern : PLAIN));
      }
      const pots = [...state.garden.pots];
      pots[cmd.pot] = { ...plant, pod: null };
      d.state = { ...state, rngState: rng, garden: { ...state.garden, pots, seeds: addSeeds(state.garden.seeds, seeds, 1), podsCollected: state.garden.podsCollected + 1 } };
      d.events.push({ type: 'pod_collected', pot: cmd.pot, seeds, mutations });
      return done();
    }

    case 'take_offset': {
      if (!content.garden) return fail('locked');
      if (!Number.isInteger(cmd.pot) || cmd.pot < 0 || cmd.pot >= state.garden.pots.length) return fail('unknown_pot');
      const plant = state.garden.pots[cmd.pot];
      if (!plant || !Number.isFinite(cmd.at) || !plantStatus(content, plant, cmd.at, state.garden.tools, researchSpeed(state, content))?.offsetReady) return fail('not_ready');
      const seed = seedKey(plant.speciesId, plant.colour, plant.pattern);
      const pots = [...state.garden.pots];
      pots[cmd.pot] = { ...plant, offsetTakenAt: cmd.at };
      d.state = { ...state, garden: { ...state.garden, pots, seeds: addSeeds(state.garden.seeds, [seed], 1) } };
      discover(d, content, cmd.at);
      d.events.push({ type: 'offset_taken', pot: cmd.pot, seed });
      return done();
    }

    case 'tend_garden': {
      if (!content.garden || !Number.isFinite(cmd.at)) return fail('locked');
      if (!undiscovered(state, content, cmd.at).length && !unseenPatterns(state, content, cmd.at).length) return fail('already_done');
      discover(d, content, cmd.at);
      return done();
    }

    case 'buy_garden_tool': {
      const g = content.garden;
      const tool = g?.tools[cmd.toolId];
      if (!g || !tool) return fail('unknown_species');
      if (!gardenOpen(state, content)) return fail('locked');
      if (state.garden.tools.includes(tool.id)) return fail('already_done');
      if (!canAfford(state, tool.cost)) return fail('cannot_afford');
      d.state = { ...state, wallet: addCost(state.wallet, tool.cost, -1), garden: { ...state.garden, tools: [...state.garden.tools, tool.id] } };
      d.events.push({ type: 'garden_tool_bought', toolId: tool.id });
      return done();
    }

    case 'give_succulent': {
      const g = content.garden;
      if (!g) return fail('locked');
      if (!Number.isInteger(cmd.pot) || cmd.pot < 0 || cmd.pot >= state.garden.pots.length) return fail('unknown_pot');
      const plant = state.garden.pots[cmd.pot];
      if (!plant || !Number.isFinite(cmd.at) || succulentGrowth(content, plant.speciesId, plant.plantedAt, cmd.at, researchSpeed(state, content).grow)?.stage !== 'grown') return fail('not_ready');
      if (plant.pod) return fail('busy');
      const owned = state.residents[cmd.residentId];
      if (!content.residents[cmd.residentId]) return fail('unknown_resident');
      if (!owned) return fail('not_owned');
      if (state.expedition?.residentId === cmd.residentId) return fail('away');
      if (treatGivenToday(state, content, cmd.residentId, cmd.at)) return fail('daily_limit');
      discover(d, content, cmd.at);
      const before = bondLevel(owned.bondXp, content);
      const bondXp = owned.bondXp + g.giftBondXp;
      const after = bondLevel(bondXp, content);
      const pots = [...d.state.garden.pots];
      pots[cmd.pot] = null;
      d.state = {
        ...d.state,
        residents: { ...d.state.residents, [cmd.residentId]: { ...owned, bondXp, treatDay: dayOf(cmd.at, content) } },
        garden: { ...d.state.garden, pots, gifts: d.state.garden.gifts + 1 },
      };
      d.events.push({ type: 'succulent_given', pot: cmd.pot, residentId: cmd.residentId, name: succulentName(content, plant.speciesId, plant.colour, plant.pattern), bondUp: after > before, newBondLevel: after });
      if (after > before) addHearts(d, content.bond.heartsPerBondLevel * (after - before), content);
      return done();
    }

    case 'claim_daily_gift': {
      if (!content.dailyGift || !Number.isFinite(cmd.at)) return fail('locked');
      if (!dailyGiftReady(state, content, cmd.at)) return fail('daily_limit');
      const buttons = dailyGiftAmount(state, content);
      d.state = { ...state, wallet: addCost(state.wallet, { buttons }, 1), dailyGiftDay: dayOf(cmd.at, content) };
      d.events.push({ type: 'daily_gift', buttons });
      return done();
    }

    case 'start_research': {
      const def = content.research?.studies[cmd.studyId];
      if (!def) return fail('unknown_task');
      if (state.research.active) return fail('busy');
      if (!Number.isFinite(cmd.at)) return fail('not_ready');
      const next = nextStudyLevel(state, content, def.id);
      if (!next) return fail('already_done');
      if (!canAfford(state, next.cost)) return fail('cannot_afford');
      const active = { studyId: def.id, level: next.level, startAt: cmd.at, endAt: cmd.at + next.ms };
      d.state = { ...state, wallet: addCost(state.wallet, next.cost, -1), research: { ...state.research, active } };
      d.events.push({ type: 'research_started', studyId: def.id, level: next.level, endAt: active.endAt });
      return done();
    }

    case 'finish_research': {
      const a = state.research.active;
      if (!a || !Number.isFinite(cmd.at) || cmd.at < a.endAt) return fail('not_ready');
      d.state = { ...state, research: { levels: { ...state.research.levels, [a.studyId]: a.level }, active: null } };
      d.events.push({ type: 'research_finished', studyId: a.studyId, level: a.level });
      return done();
    }

    case 'display_succulent': {
      if (!content.garden) return fail('locked');
      if (!Number.isInteger(cmd.pot) || cmd.pot < 0 || cmd.pot >= state.garden.pots.length) return fail('unknown_pot');
      const plant = state.garden.pots[cmd.pot];
      if (!plant || !Number.isFinite(cmd.at) || succulentGrowth(content, plant.speciesId, plant.plantedAt, cmd.at, researchSpeed(state, content).grow)?.stage !== 'grown') return fail('not_ready');
      if (plant.pod) return fail('busy');
      const furnitureId = succulentFurnitureId(plant.speciesId, plant.colour, plant.pattern);
      if (!content.furniture[furnitureId]) return fail('unknown_species');
      discover(d, content, cmd.at);
      const pots = [...d.state.garden.pots];
      pots[cmd.pot] = null;
      d.state = {
        ...d.state,
        inventory: { ...d.state.inventory, [furnitureId]: (d.state.inventory[furnitureId] ?? 0) + 1 },
        garden: { ...d.state.garden, pots },
      };
      d.events.push({ type: 'succulent_displayed', pot: cmd.pot, furnitureId });
      return done();
    }

    case 'claim_garden_goal': {
      const next = nextGardenGoal(state, content);
      if (!next || next.def.id !== cmd.goalId) return fail('unknown_task');
      if (!next.done) return fail('not_ready');
      const { hearts, ...cost } = next.def.reward;
      d.state = { ...state, wallet: addCost(state.wallet, cost, 1), garden: { ...state.garden, goalsClaimed: [...state.garden.goalsClaimed, next.def.id] } };
      d.events.push({ type: 'garden_goal_claimed', goalId: next.def.id, reward: next.def.reward });
      if (hearts) addHearts(d, hearts, content);
      return done();
    }

    case 'buy_pot': {
      if (!gardenOpen(state, content)) return fail('locked');
      const cost = nextPotCost(state, content);
      if (!cost) return fail('already_done');
      if (!canAfford(state, cost)) return fail('cannot_afford');
      const pots = [...state.garden.pots, null];
      d.state = { ...state, wallet: addCost(state.wallet, cost, -1), garden: { ...state.garden, pots } };
      d.events.push({ type: 'pot_bought', pots: pots.length });
      return done();
    }

    case 'assign_companion': {
      if (!content.companions[cmd.companionId]) return fail('unknown_companion');
      const current = state.companions[cmd.companionId];
      if (!current) return fail('not_owned');
      if (cmd.residentId !== null) {
        if (!content.residents[cmd.residentId]) return fail('unknown_resident');
        if (!state.residents[cmd.residentId]) return fail('not_owned');
      }
      if (current.residentId === cmd.residentId) return fail('already_done');
      // A resident keeps one companion: whoever was following them goes back to resting.
      const companions: GameState['companions'] = {};
      for (const [id, c] of Object.entries(state.companions)) {
        companions[id] = id === cmd.companionId ? { residentId: cmd.residentId } : cmd.residentId !== null && c.residentId === cmd.residentId ? { residentId: null } : c;
      }
      d.state = { ...state, companions };
      d.events.push({ type: 'companion_assigned', companionId: cmd.companionId, residentId: cmd.residentId });
      return done();
    }

    case 'set_flag': {
      if (!FLAG_PATTERN.test(cmd.flag)) return fail('bad_flag');
      if (state.flags.includes(cmd.flag)) return done();
      d.state = { ...state, flags: [...state.flags, cmd.flag] };
      return done();
    }
  }
}
