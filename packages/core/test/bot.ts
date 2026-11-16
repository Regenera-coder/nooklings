// A scripted player used by the pacing tests.
import {
  applyCommand,
  atmosphere,
  bakeRecipes,
  bakingOpen,
  canBake,
  effectiveRoom,
  invitationStatus,
  isRoomOpen,
  isUnlocked,
  levelFor,
  newGame,
  spotUnlocked,
  taskStates,
  validatePlacement,
  type Command,
  type Content,
} from '@nooklings/core';

type Input = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;

/**
 * A plain, patient player: no money, no lucky parcels (the bot never opens a parcel after the
 * guaranteed first one), just tasks, gathering, crafting, decorating, invitations and expeditions.
 * Time moves in 30-second ticks. Returns the final state and when each level was reached.
 */
export interface Schedule {
  /** Minutes of play per sitting. */
  sessionMinutes: number;
  /** Hours from the start of one sitting to the start of the next. */
  gapHours: number[];
}

/** Two short sittings a day: morning and evening. */
export const CASUAL: Schedule = { sessionMinutes: 10, gapHours: [10, 14] };
/** One long sitting a day. */
export const BINGE: Schedule = { sessionMinutes: 90, gapHours: [24] };

export function playWholeGame(content: Content, schedule?: Schedule, opts: { giveTreats?: boolean } = {}) {
  let s = newGame(content);
  let t = 1_000_000;
  let n = 0;
  const levelAt: Record<number, number> = { 1: 0 };
  const joinedAt: Record<string, number> = {};
  const start = t;
  let sessionStart = t;
  let sessionNo = 0;
  const tryRun = (cmd: Input): boolean => {
    const res = applyCommand(s, { ...cmd, id: `g${++n}` } as Command, content);
    if (!res.ok) return false;
    s = res.state;
    for (const e of res.events) {
      if (e.type === 'level_up') levelAt[e.level] = (t - start) / 60_000;
      if (e.type === 'resident_joined') joinedAt[e.residentId] = Math.round((t - start) / 60_000);
    }
    return true;
  };

  const placeSomewhere = (roomId: string, defId: string): boolean => {
    const room = effectiveRoom(s, content, roomId)!;
    for (let row = 0; row < room.rows; row++)
      for (let col = 0; col < room.cols; col++) {
        if (validatePlacement(room, s.rooms[roomId]!.placements, content, { defId, col, row }).ok) {
          return tryRun({ type: 'place', roomId, defId, col, row });
        }
      }
    return false;
  };

  /** Get one of this item into the room: from inventory, or craft it if possible. */
  const addItem = (roomId: string, defId: string): boolean => {
    if (!(s.inventory[defId] ?? 0)) {
      const recipe = Object.values(content.recipes).find((r) => r.furnitureId === defId);
      if (!recipe || !tryRun({ type: 'craft', recipeId: recipe.id })) return false;
    }
    return placeSomewhere(roomId, defId);
  };

  /** Best item that still adds to a tag in this room (respecting the copy cap). */
  const candidatesFor = (roomId: string, tag: string): string[] => {
    const room = effectiveRoom(s, content, roomId)!;
    const counts: Record<string, number> = {};
    for (const p of s.rooms[roomId]!.placements) counts[p.defId] = (counts[p.defId] ?? 0) + 1;
    const level = levelFor(s.hearts, content);
    return Object.values(content.furniture)
      .filter((f) => (f.tags[tag] ?? 0) > 0 && (counts[f.id] ?? 0) < content.rules.maxCopiesCounted)
      .filter((f) => f.layer !== 'wall' || room.walls !== false)
      .filter((f) => (s.inventory[f.id] ?? 0) > 0 || Object.values(content.recipes).some((r) => r.furnitureId === f.id && r.requiresLevel <= level))
      .sort((a, b) => (b.tags[tag] ?? 0) - (a.tags[tag] ?? 0))
      .map((f) => f.id);
  };

  const everyone = Object.keys(content.residents);
  for (let tick = 0; tick < 60_000 && !everyone.every((id) => id in s.residents); tick++) {
    // Tasks
    for (const ts of taskStates(s, content)) if (ts.status === 'claimable') tryRun({ type: 'claim_task', taskId: ts.def.id });
    const active = taskStates(s, content).find((ts) => ts.status === 'active');
    const c = active?.def.condition;
    if (c?.kind === 'parcels_opened') tryRun({ type: 'open_parcel', poolId: 'first_residents', kind: 'friend' });
    // Later pools: the guaranteed first parcel as soon as it can be opened
    for (const pool of Object.values(content.parcels)) {
      if (pool.id !== 'first_residents' && pool.guaranteedFirst && !(pool.guaranteedFirst in s.residents)) tryRun({ type: 'open_parcel', poolId: pool.id });
    }
    if (c?.kind === 'flag') tryRun({ type: 'set_flag', flag: c.flag });
    if (c?.kind === 'bond_level') tryRun({ type: 'play', residentId: 'snug', at: t });
    if (c?.kind === 'form') tryRun({ type: 'upgrade_form', residentId: c.residentId });
    if (c?.kind === 'placed') for (const id of c.furnitureIds) if (!s.rooms[c.roomId]!.placements.some((p) => p.defId === id)) addItem(c.roomId, id);
    if (c?.kind === 'room_items' && isRoomOpen(s, content, c.roomId)) {
      const cheap = ['potted_fern', 'picture_frame', 'side_table', 'reading_chair'];
      for (const id of cheap) if ((s.rooms[c.roomId]!.placements.length ?? 0) < c.count) addItem(c.roomId, id);
    }

    // Rooms
    for (const room of Object.values(content.rooms)) {
      if (room.access) tryRun({ type: 'buy_room', roomId: room.id, kind: 'open' });
      if (room.expansion) tryRun({ type: 'buy_room', roomId: room.id, kind: 'expand' });
    }

    // Invitations: decorate toward the next one, then invite
    for (const inv of Object.values(content.invitations)) {
      const st = invitationStatus(s, content, inv.residentId);
      if (!st || st.owned || !st.levelOk || !st.roomOpen) continue;
      for (const row of st.atmosphere) if (!row.ok) for (const id of candidatesFor(inv.roomId, row.tag)) {
        if ((atmosphere(s, content, inv.roomId)[row.tag] ?? 0) >= row.need) break;
        addItem(inv.roomId, id);
      }
      for (const p of st.placed) if (!p.ok) addItem(inv.roomId, p.furnitureId);
      tryRun({ type: 'invite', residentId: inv.residentId });
    }

    // Expeditions: the Old Mill first (it brings Pippo home), then the Meadow
    if (s.expedition && t >= s.expedition.endAt) tryRun({ type: 'collect_expedition', at: t });
    if (!s.expedition && isUnlocked(s, content, 'expeditions')) {
      const fresh = Object.values(content.expeditions).find((r) => r.firstTimeResident && !s.expeditionsDone[r.id] && isUnlocked(s, content, r.requiresUnlock));
      tryRun({ type: 'start_expedition', routeId: fresh?.id ?? 'meadow', residentId: 'snug', at: t });
    }

    // Baking: the longest recipe available, with a baker who likes it if there is one
    if (s.baking && t >= s.baking.endAt) tryRun({ type: 'collect_baking', at: t });
    if (!s.baking && bakingOpen(s, content)) {
      const recipe = bakeRecipes(s, content).filter((r) => r.unlocked).pop()?.def;
      const bakers = Object.keys(s.residents).filter((id) => canBake(s, content, id));
      const baker = bakers.find((id) => content.residents[id]!.favouriteBake === recipe?.id) ?? bakers[0] ?? null;
      if (recipe) tryRun({ type: 'start_baking', recipeId: recipe.id, bakerId: baker, at: t });
    }
    // Spare Treats go to friends, one each a day
    if (opts.giveTreats !== false && s.wallet.treats > 20) tryRun({ type: 'give_treat', residentId: Object.keys(s.residents)[tick % Object.keys(s.residents).length]!, at: t });
    for (const series of content.series) if (series.reward) tryRun({ type: 'claim_series', seriesId: series.id });

    // Play with one resident each tick (round robin), the way a player taps around the house
    const ids = Object.keys(s.residents);
    tryRun({ type: 'play', residentId: ids[tick % ids.length]!, at: t });

    // Gathering
    for (const spot of Object.keys(content.gatherSpots)) if (spotUnlocked(s, content, spot)) tryRun({ type: 'gather', spotId: spot, at: t });

    t += 30_000;
    if (schedule && t - sessionStart >= schedule.sessionMinutes * 60_000) {
      sessionStart += schedule.gapHours[sessionNo++ % schedule.gapHours.length]! * 3_600_000;
      t = sessionStart;
    }
  }
  for (const series of content.series) if (series.reward) tryRun({ type: 'claim_series', seriesId: series.id });
  for (let i = 0; i < 3; i++) for (const ts of taskStates(s, content)) if (ts.status === 'claimable') tryRun({ type: 'claim_task', taskId: ts.def.id });
  if (process.env.SIM_DEBUG) console.log(JSON.stringify({ hearts: s.hearts, wallet: s.wallet, residents: Object.keys(s.residents), active: taskStates(s, content).find((x) => x.status !== 'claimed'), purchases: s.purchases, rooms: Object.fromEntries(Object.entries(s.rooms).map(([k, v]) => [k, v.placements.map((p) => p.defId)])), inv: s.inventory, levelAt }));
  return { s, levelAt, joinedAt, minutes: (t - start) / 60_000 };
}

