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
  pickOutcome,
  playReadyAt,
  taskStates,
} from './progress';
import type { ArcadeGameId, Content, Cost, GameState, ParcelRecord, Placement } from './types';

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
  | { id: string; type: 'open_parcel'; poolId: string }
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
  | { id: string; type: 'assign_companion'; companionId: string; residentId: string | null };

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
  | 'unknown_companion';

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
  | { type: 'arcade_done'; gameId: ArcadeGameId; score: number; best: number; newBest: boolean; ribbons: number; playsLeft: number }
  | { type: 'prize_won'; gameId: ArcadeGameId; index: number; kind: 'furniture' | 'companion'; id: string; residentId: string | null }
  | { type: 'companion_assigned'; companionId: string; residentId: string | null }
  | { type: 'parcel_opened'; record: ParcelRecord; threadGranted: number }
  | { type: 'played'; residentId: string; bondUp: boolean; newBondLevel: number }
  | { type: 'form_upgraded'; residentId: string; form: string }
  | { type: 'hearts'; amount: number }
  | { type: 'level_up'; level: number };

export type CommandResult =
  | { ok: true; state: GameState; events: GameEvent[]; duplicate: boolean }
  | { ok: false; error: CommandError };

const MAX_REMEMBERED_COMMANDS = 64;
const MAX_PARCEL_LOG = 50;
const FLAG_PATTERN = /^viewed:[a-z_]+$/;

type Draft = { state: GameState; events: GameEvent[] };

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
    residents: { ...d.state.residents, [residentId]: { bondXp: 0, form: 'original', lastPlayAt: 0, room, costume: null } },
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
      if (!canAfford(state, pool.cost)) return fail('cannot_afford');
      const odds = parcelOdds(state, content, cmd.poolId);
      const guaranteed = odds.length === 1 && odds[0]!.chance === 1 && state.parcelsOpened === 0;
      const [roll, rngState] = guaranteed ? [0, state.rngState] : nextRandom(state.rngState);
      const outcome = pickOutcome(odds, roll);
      if (!outcome) return fail('not_ready');
      const duplicate = outcome.kind === 'resident' && outcome.id in state.residents;
      const record: ParcelRecord = { n: state.parcelsOpened + 1, poolId: pool.id, kind: outcome.kind, id: outcome.id, duplicate, guaranteed };
      let wallet = addCost(state.wallet, pool.cost, -1);
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
        parcelLog: [...state.parcelLog, record].slice(-MAX_PARCEL_LOG),
      };
      d.events.push({ type: 'parcel_opened', record, threadGranted });
      if (outcome.kind === 'resident' && !duplicate) grantResident(d, content, outcome.id, 'parcel');
      return done();
    }

    case 'play': {
      const owned = state.residents[cmd.residentId];
      if (!content.residents[cmd.residentId]) return fail('unknown_resident');
      if (!owned) return fail('not_owned');
      if (state.expedition?.residentId === cmd.residentId) return fail('away');
      if (!Number.isFinite(cmd.at) || cmd.at < playReadyAt(state, content, cmd.residentId)) return fail('cooldown');
      const before = bondLevel(owned.bondXp, content);
      const bondXp = owned.bondXp + 1;
      const after = bondLevel(bondXp, content);
      d.state = {
        ...state,
        wallet: addCost(state.wallet, content.bond.playReward, 1),
        residents: { ...state.residents, [cmd.residentId]: { ...owned, bondXp, lastPlayAt: cmd.at } },
      };
      d.events.push({ type: 'played', residentId: cmd.residentId, bondUp: after > before, newBondLevel: after });
      // Ribbons for playing, up to a daily limit.
      const today = ribbonToday(d.state, cmd.at);
      if (today.fromPlay < content.ribbons.playsPerDay && content.ribbons.perPlay > 0) {
        d.state = {
          ...d.state,
          wallet: addCost(d.state.wallet, { ribbons: content.ribbons.perPlay }, 1),
          ribbonDay: { day: dayOf(cmd.at), fromPlay: today.fromPlay + 1, games: today.games },
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
        gatherReadyAt: { ...state.gatherReadyAt, [cmd.spotId]: cmd.at + spot.cooldownMs },
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
      const expedition = { routeId: route.id, residentId: cmd.residentId, startAt: cmd.at, endAt: cmd.at + route.durationMs };
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
      const ribbons = ribbonsForScore(content, game, score);
      const day = dayOf(cmd.at);
      const plays = state.arcade.day === day ? { ...state.arcade.plays } : {};
      plays[cmd.gameId] = (plays[cmd.gameId] ?? 0) + 1;
      const oldBest = state.arcade.best[cmd.gameId] ?? 0;
      const best = Math.max(oldBest, score);
      d.state = {
        ...state,
        wallet: addCost(state.wallet, { ribbons }, 1),
        arcade: { ...state.arcade, day, plays, best: { ...state.arcade.best, [cmd.gameId]: best } },
      };
      d.events.push({ type: 'arcade_done', gameId: cmd.gameId, score, best, newBest: score > oldBest, ribbons, playsLeft: left - 1 });
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
