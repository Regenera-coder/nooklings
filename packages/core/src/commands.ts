import { validatePlacement, type PlacementError } from './grid';
import type { Content, GameState, Placement } from './types';

/**
 * Every change to the game goes through a command with a unique id.
 * The same function will run on the server later (Milestone D), so it must stay
 * pure: no clocks, no randomness, no browser or database access.
 */
export type Command =
  | { id: string; type: 'place'; roomId: string; defId: string; col: number; row: number; flipped?: boolean }
  | { id: string; type: 'move'; roomId: string; uid: string; col: number; row: number }
  | { id: string; type: 'flip'; roomId: string; uid: string }
  | { id: string; type: 'store'; roomId: string; uid: string };

export type CommandError =
  | PlacementError
  | 'unknown_room'
  | 'unknown_placement'
  | 'not_in_inventory'
  | 'cannot_flip';

export type GameEvent =
  | { type: 'placed'; roomId: string; placement: Placement }
  | { type: 'moved'; roomId: string; placement: Placement }
  | { type: 'flipped'; roomId: string; placement: Placement }
  | { type: 'stored'; roomId: string; uid: string; defId: string };

export type CommandResult =
  | { ok: true; state: GameState; events: GameEvent[]; duplicate: boolean }
  | { ok: false; error: CommandError };

const MAX_REMEMBERED_COMMANDS = 64;

export function applyCommand(state: GameState, cmd: Command, content: Content): CommandResult {
  if (state.appliedCommandIds.includes(cmd.id)) {
    return { ok: true, state, events: [], duplicate: true };
  }
  const roomDef = content.rooms[cmd.roomId];
  const room = state.rooms[cmd.roomId];
  if (!roomDef || !room) return { ok: false, error: 'unknown_room' };

  const finish = (
    placements: Placement[],
    inventory: Record<string, number>,
    nextUid: number,
    events: GameEvent[],
  ): CommandResult => ({
    ok: true,
    duplicate: false,
    events,
    state: {
      ...state,
      rooms: { ...state.rooms, [cmd.roomId]: { placements } },
      inventory,
      nextUid,
      appliedCommandIds: [...state.appliedCommandIds, cmd.id].slice(-MAX_REMEMBERED_COMMANDS),
    },
  });

  switch (cmd.type) {
    case 'place': {
      const def = content.furniture[cmd.defId];
      if (!def) return { ok: false, error: 'unknown_item' };
      if ((state.inventory[cmd.defId] ?? 0) < 1) return { ok: false, error: 'not_in_inventory' };
      const check = validatePlacement(roomDef, room.placements, content, cmd);
      if (!check.ok) return { ok: false, error: check.reason };
      const placement: Placement = {
        uid: `f${state.nextUid}`,
        defId: cmd.defId,
        col: cmd.col,
        row: cmd.row,
        flipped: def.canFlip ? cmd.flipped === true : false,
      };
      const inventory = { ...state.inventory, [cmd.defId]: (state.inventory[cmd.defId] ?? 0) - 1 };
      if (inventory[cmd.defId] === 0) delete inventory[cmd.defId];
      return finish([...room.placements, placement], inventory, state.nextUid + 1, [
        { type: 'placed', roomId: cmd.roomId, placement },
      ]);
    }
    case 'move': {
      const current = room.placements.find((p) => p.uid === cmd.uid);
      if (!current) return { ok: false, error: 'unknown_placement' };
      const check = validatePlacement(
        roomDef,
        room.placements,
        content,
        { defId: current.defId, col: cmd.col, row: cmd.row },
        cmd.uid,
      );
      if (!check.ok) return { ok: false, error: check.reason };
      const placement: Placement = { ...current, col: cmd.col, row: cmd.row };
      return finish(
        room.placements.map((p) => (p.uid === cmd.uid ? placement : p)),
        state.inventory,
        state.nextUid,
        [{ type: 'moved', roomId: cmd.roomId, placement }],
      );
    }
    case 'flip': {
      const current = room.placements.find((p) => p.uid === cmd.uid);
      if (!current) return { ok: false, error: 'unknown_placement' };
      if (!content.furniture[current.defId]?.canFlip) return { ok: false, error: 'cannot_flip' };
      const placement: Placement = { ...current, flipped: !current.flipped };
      return finish(
        room.placements.map((p) => (p.uid === cmd.uid ? placement : p)),
        state.inventory,
        state.nextUid,
        [{ type: 'flipped', roomId: cmd.roomId, placement }],
      );
    }
    case 'store': {
      const current = room.placements.find((p) => p.uid === cmd.uid);
      if (!current) return { ok: false, error: 'unknown_placement' };
      const inventory = { ...state.inventory, [current.defId]: (state.inventory[current.defId] ?? 0) + 1 };
      return finish(
        room.placements.filter((p) => p.uid !== cmd.uid),
        inventory,
        state.nextUid,
        [{ type: 'stored', roomId: cmd.roomId, uid: current.uid, defId: current.defId }],
      );
    }
  }
}
