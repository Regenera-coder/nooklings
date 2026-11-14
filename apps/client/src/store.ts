import {
  applyCommand,
  deserialize,
  newGame,
  serialize,
  type Command,
  type CommandError,
  type Content,
  type GameEvent,
  type GameState,
} from '@nooklings/core';
import type { SaveStore } from './save/saveStore';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type CommandInput = DistributiveOmit<Command, 'id'>;
type Listener = (state: GameState, events: GameEvent[]) => void;

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Holds the current game state, runs commands through the shared rules and autosaves. */
export class GameStore {
  private current: GameState;
  private listeners = new Set<Listener>();

  constructor(
    readonly content: Content,
    private readonly saves: SaveStore,
  ) {
    const text = saves.load();
    let state: GameState;
    try {
      state = text ? deserialize(text, content) : newGame(content);
    } catch (err) {
      console.warn('Save could not be read, starting fresh', err);
      state = newGame(content);
    }
    this.current = state;
    this.saves.save(serialize(state));
  }

  get state(): GameState {
    return this.current;
  }

  dispatch(input: CommandInput): { ok: true; events: GameEvent[] } | { ok: false; error: CommandError } {
    const cmd = { ...input, id: newId() } as Command;
    const res = applyCommand(this.current, cmd, this.content);
    if (!res.ok) return res;
    if (!res.duplicate) {
      this.current = res.state;
      this.saves.save(serialize(res.state));
      for (const l of this.listeners) l(res.state, res.events);
    }
    return { ok: true, events: res.events };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.current = newGame(this.content);
    this.saves.save(serialize(this.current));
    for (const l of this.listeners) l(this.current, []);
  }
}
