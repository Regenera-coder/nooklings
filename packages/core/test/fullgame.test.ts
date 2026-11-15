import { describe, expect, it } from 'vitest';
import { content } from '@nooklings/content';
import {
  applyCommand,
  atmosphere,
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
} from '@nooklings/core';

type Input = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;

/**
 * A plain, patient player: no money, no lucky parcels (the bot never opens a parcel after the
 * guaranteed first one), just tasks, gathering, crafting, decorating, invitations and expeditions.
 * Time moves in 30-second ticks. Returns the final state and when each level was reached.
 */
function playWholeGame() {
  let s = newGame(content);
  let t = 1_000_000;
  let n = 0;
  const levelAt: Record<number, number> = { 1: 0 };
  const joinedAt: Record<string, number> = {};
  const start = t;
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

  for (let tick = 0; tick < 20_000 && !('luma' in s.residents); tick++) {
    // Tasks
    for (const ts of taskStates(s, content)) if (ts.status === 'claimable') tryRun({ type: 'claim_task', taskId: ts.def.id });
    const active = taskStates(s, content).find((ts) => ts.status === 'active');
    const c = active?.def.condition;
    if (c?.kind === 'parcels_opened') tryRun({ type: 'open_parcel', poolId: 'first_residents' });
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
      tryRun({ type: 'start_expedition', routeId: s.expeditionsDone.old_mill ? 'meadow' : 'old_mill', residentId: 'snug', at: t });
    }

    // Play with one resident each tick (round robin), the way a player taps around the house
    const ids = Object.keys(s.residents);
    tryRun({ type: 'play', residentId: ids[tick % ids.length]!, at: t });

    // Gathering
    for (const spot of Object.keys(content.gatherSpots)) if (spotUnlocked(s, content, spot)) tryRun({ type: 'gather', spotId: spot, at: t });

    t += 30_000;
  }
  for (const ts of taskStates(s, content)) if (ts.status === 'claimable') tryRun({ type: 'claim_task', taskId: ts.def.id });
  if (process.env.SIM_DEBUG) console.log(JSON.stringify({ hearts: s.hearts, wallet: s.wallet, residents: Object.keys(s.residents), active: taskStates(s, content).find((x) => x.status !== 'claimed'), purchases: s.purchases, rooms: Object.fromEntries(Object.entries(s.rooms).map(([k, v]) => [k, v.placements.map((p) => p.defId)])), inv: s.inventory, levelAt }));
  return { s, levelAt, joinedAt, minutes: (t - start) / 60_000 };
}

describe('whole game (Milestone C)', () => {
  const run = playWholeGame();

  it('reaches Home Level 10 with all ten First Residents, without luck or money', () => {
    expect(levelFor(run.s.hearts, content)).toBe(10);
    expect(Object.keys(run.s.residents).sort()).toEqual(Object.keys(content.residents).sort());
    expect(taskStates(run.s, content).every((ts) => ts.status === 'claimed')).toBe(true);
    for (const v of Object.values(run.s.wallet)) expect(v).toBeGreaterThanOrEqual(0);
    expect(run.s.purchases.sort()).toEqual(['sunroom:open', 'yard:expand']);
  });

  it('paces the levels sensibly for a patient player', () => {
    // Printed so tuning changes are easy to see in test output.
    console.log('level reached at minute', run.levelAt, 'joined at minute', run.joinedAt, 'total', run.minutes);
    for (let lv = 2; lv <= 10; lv++) expect(run.levelAt[lv]).toBeGreaterThanOrEqual(run.levelAt[lv - 1]!);
    // Every level is reachable within a few hours of steady play, not days.
    expect(run.minutes).toBeLessThan(6 * 60);
    expect(run.minutes).toBeGreaterThan(30);
  });

  it('never houses more residents in a room than the cap', () => {
    const per: Record<string, number> = {};
    for (const r of Object.values(run.s.residents)) per[r.room] = (per[r.room] ?? 0) + 1;
    for (const v of Object.values(per)) expect(v).toBeLessThanOrEqual(content.rules.maxResidentsPerRoom);
  });
});

