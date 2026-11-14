import { validatePlacement } from './grid';
import type { Content, GameState, Placement } from './types';

export const SAVE_VERSION = 1;

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Save migrations, keyed by the version they upgrade FROM.
 * Version 0 was the pre-release shape without replay protection.
 */
const MIGRATIONS: Record<number, Migration> = {
  0: (raw) => ({ ...raw, appliedCommandIds: [], version: 1 }),
};

export function newGame(content: Content): GameState {
  let state: GameState = {
    version: SAVE_VERSION,
    homeName: content.starter.homeName,
    rooms: {},
    inventory: { ...content.starter.inventory },
    nextUid: 1,
    appliedCommandIds: [],
  };
  for (const roomId of Object.keys(content.rooms)) {
    const placements: Placement[] = [];
    for (const start of content.starter.placements[roomId] ?? []) {
      placements.push({ ...start, uid: `f${state.nextUid}` });
      state = { ...state, nextUid: state.nextUid + 1 };
    }
    state.rooms[roomId] = { placements };
  }
  return state;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export class SaveError extends Error {}

/**
 * Read a save defensively: upgrade old versions, refuse newer ones, and drop anything
 * that no longer fits the current content (unknown items go back to nothing rather
 * than crashing the room).
 */
export function deserialize(text: string, content: Content): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError('Save is not valid JSON');
  }
  if (typeof raw !== 'object' || raw === null) throw new SaveError('Save is not an object');
  let data = raw as Record<string, unknown>;
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
  const rawInventory = (data.inventory ?? {}) as Record<string, unknown>;
  for (const [defId, count] of Object.entries(rawInventory)) {
    if (content.furniture[defId] && typeof count === 'number' && Number.isInteger(count) && count > 0) {
      inventory[defId] = count;
    }
  }

  const rooms: GameState['rooms'] = {};
  const rawRooms = (data.rooms ?? {}) as Record<string, { placements?: unknown }>;
  for (const [roomId, roomDef] of Object.entries(content.rooms)) {
    const kept: Placement[] = [];
    const list = Array.isArray(rawRooms[roomId]?.placements) ? (rawRooms[roomId]!.placements as Placement[]) : null;
    if (list === null) {
      rooms[roomId] = fresh.rooms[roomId] ?? { placements: [] };
      continue;
    }
    for (const p of list) {
      if (!p || typeof p.uid !== 'string' || typeof p.defId !== 'string') continue;
      const candidate = { defId: p.defId, col: p.col, row: p.row };
      if (kept.some((k) => k.uid === p.uid)) continue;
      if (validatePlacement(roomDef, kept, content, candidate).ok) {
        kept.push({ uid: p.uid, defId: p.defId, col: p.col, row: p.row, flipped: p.flipped === true });
      } else if (content.furniture[p.defId]) {
        inventory[p.defId] = (inventory[p.defId] ?? 0) + 1;
      }
    }
    rooms[roomId] = { placements: kept };
  }

  const usedUids = Object.values(rooms).flatMap((r) => r.placements.map((p) => Number(p.uid.slice(1)) || 0));
  const nextUid = Math.max(typeof data.nextUid === 'number' ? data.nextUid : 1, ...usedUids.map((n) => n + 1), 1);
  const ids = Array.isArray(data.appliedCommandIds)
    ? (data.appliedCommandIds as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];

  return {
    version: SAVE_VERSION,
    homeName: typeof data.homeName === 'string' && data.homeName.trim() ? data.homeName : fresh.homeName,
    rooms,
    inventory,
    nextUid,
    appliedCommandIds: ids,
  };
}
