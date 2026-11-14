import { validatePlacement, type PlacementError } from './grid';
import {
  addCost,
  bondLevel,
  canAfford,
  invitationStatus,
  isUnlocked,
  levelFor,
  nextRandom,
  parcelOdds,
  pickOutcome,
  playReadyAt,
  taskStates,
} from './progress';
import type { Content, Cost, GameState, ParcelRecord, Placement } from './types';

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
  | { id: string; type: 'set_flag'; flag: string };

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
  | 'bad_flag';

export type GameEvent =
  | { type: 'placed'; roomId: string; placement: Placement }
  | { type: 'moved'; roomId: string; placement: Placement }
  | { type: 'flipped'; roomId: string; placement: Placement }
  | { type: 'stored'; roomId: string; uid: string; defId: string }
  | { type: 'crafted'; recipeId: string; furnitureId: string }
  | { type: 'task_claimed'; taskId: string; reward: Cost & { hearts?: number } }
  | { type: 'resident_joined'; residentId: string; via: 'invitation' | 'parcel' }
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

function grantResident(d: Draft, content: Content, residentId: string, via: 'invitation' | 'parcel'): void {
  d.state = {
    ...d.state,
    residents: { ...d.state.residents, [residentId]: { bondXp: 0, form: 'original', lastPlayAt: 0 } },
    residentOrder: [...d.state.residentOrder, residentId],
  };
  d.events.push({ type: 'resident_joined', residentId, via });
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
      const roomDef = content.rooms[cmd.roomId];
      const room = state.rooms[cmd.roomId];
      if (!roomDef || !room) return fail('unknown_room');
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
      grantResident(d, content, cmd.residentId, 'invitation');
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

    case 'set_flag': {
      if (!FLAG_PATTERN.test(cmd.flag)) return fail('bad_flag');
      if (state.flags.includes(cmd.flag)) return done();
      d.state = { ...state, flags: [...state.flags, cmd.flag] };
      return done();
    }
  }
}
