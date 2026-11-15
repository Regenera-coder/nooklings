import {
  arcadePlaysLeft,
  arcadeUnlocked,
  levelFor,
  prizeWon,
  type ArcadeGameDef,
  type ArcadeGameId,
  type ArcadePrize,
  type Content,
  type GameEvent,
  type GameState,
} from '@nooklings/core';
import { artUrl } from '../assets';
import type { RoomScene } from '../game/RoomScene';
import { portraitUrl } from '../portraits';
import type { CommandInput } from '../store';
import { art, Clock, el, sparkle, type GameContext, type GameFactory, type RunningGame } from './engine';
import { buttonCatch } from './games/buttonCatch';
import { garden } from './games/garden';
import { glyph } from './games/glyph';
import { hide } from './games/hide';
import { kitchen } from './games/kitchen';
import { lantern } from './games/lantern';
import { memory } from './games/memory';
import { parcel } from './games/parcel';
import { spot } from './games/spot';
import { stitch } from './games/stitch';

const GAMES: Record<ArcadeGameId, GameFactory> = {
  button_catch: buttonCatch, memory, glyph, kitchen, stitch, garden, spot, lantern, parcel, hide,
};

export interface ArcadeHooks {
  content: Content;
  getState: () => GameState;
  dispatch: (cmd: CommandInput) => { ok: true; events: GameEvent[] } | { ok: false; error: string };
  getScene: () => RoomScene | null;
  /** Hide and Seek: show the room the game is played in. Returns false if no room can be shown. */
  showRoomForHide: () => void;
  /** Back to wherever the player was before Hide and Seek. */
  leaveRoomAfterHide: () => void;
  /** Take the player home to place a prize item. */
  placeNow: (defId: string) => void;
  /** Open a resident's Nookbook page (to choose who a companion follows). */
  openResident: (id: string) => void;
  /** Called when the overlay closes so the page underneath can refresh. */
  onClosed: () => void;
  errorText: (error: string) => string;
}

type Won = Extract<GameEvent, { type: 'prize_won' }>;

/**
 * The Arcade: the hub inside Explore, plus the full-screen intro, game frame, results and
 * prize reveal screens, rebuilt from ChatGPT's mock-ups (all words and numbers are drawn here).
 */
export class Arcade {
  private readonly root: HTMLElement;
  private readonly reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private clock: Clock | null = null;
  private running: RunningGame | null = null;

  constructor(private readonly h: ArcadeHooks) {
    this.root = el('div', 'arcade');
    this.root.id = 'arcade';
    this.root.hidden = true;
    document.getElementById('app')!.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  private get content(): Content {
    return this.h.content;
  }

  private game(id: ArcadeGameId): ArcadeGameDef {
    return this.content.arcadeGames[id];
  }

  private prizeName(p: ArcadePrize): string {
    return p.kind === 'furniture' ? this.content.furniture[p.id]?.name ?? p.id : this.content.companions[p.id]?.name ?? p.id;
  }

  private prizeArt(p: ArcadePrize, cls = ''): HTMLElement {
    return art(p.kind === 'furniture' ? `furn_${p.id}` : `pet_${p.id}_idle`, cls, this.prizeName(p));
  }

  // ---------- hub (inside the Explore page) ----------

  renderHub(page: HTMLElement): void {
    const s = this.h.getState();
    const now = Date.now();
    const level = levelFor(s.hearts, this.content);
    const head = el('div', 'ar-hub-head');
    const ribbons = el('span', 'ar-ribbons');
    const ri = artUrl('icon_ribbon');
    if (ri) {
      const img = el('img');
      img.src = ri;
      img.alt = '';
      ribbons.append(img);
    }
    ribbons.append(el('b', '', String(s.wallet.ribbons)), el('span', '', ' Ribbons'));
    head.append(el('p', 'muted', `Win Ribbons and exclusive prizes. ${this.content.arcade.playsPerDay} plays per game each day.`), ribbons);
    page.append(head);

    const grid = el('div', 'ar-grid');
    for (const id of this.content.arcade.order) {
      const g = this.game(id);
      const unlocked = level >= g.unlockLevel;
      const left = arcadePlaysLeft(s, this.content, id, now);
      const card = el('button', `ar-card${unlocked ? '' : ' locked'}${artUrl('ui_card_frame') ? ' has-frame' : ''}`);
      card.dataset.game = id;
      const pic = el('span', 'ar-card-art');
      pic.append(art(`game_${id}_card`, 'pic', g.name));
      const host = this.content.residents[g.host];
      if (host) {
        const face = el('img', 'ar-host');
        face.src = portraitUrl(host);
        face.alt = '';
        pic.append(face);
      }
      if (!unlocked) {
        const lock = el('span', 'ar-lock');
        lock.append(el('i', '', '🔒'), el('b', '', `Home Level ${g.unlockLevel}`));
        pic.append(lock);
      }
      const won = g.prizes.filter((_, i) => prizeWon(s, id, i)).length;
      const meta = el('span', 'ar-meta');
      const pips = el('span', 'ar-pips');
      pips.setAttribute('aria-label', `Plays left today ${left}/${this.content.arcade.playsPerDay}`);
      for (let i = 0; i < this.content.arcade.playsPerDay; i++) pips.append(el('i', i < left ? 'on' : ''));
      meta.append(pips, el('span', 'ar-best', `Best ${s.arcade.best[id] ?? 0}`));
      card.append(pic, el('span', 'ar-name', g.name), meta);
      card.setAttribute('aria-label', `${g.name}. ${unlocked ? `Plays left today ${left} of ${this.content.arcade.playsPerDay}. Best ${s.arcade.best[id] ?? 0}. Prizes ${won} of 3.` : `Unlocks at Home Level ${g.unlockLevel}.`}`);
      card.addEventListener('click', () => this.openIntro(id));
      grid.append(card);
    }
    page.append(grid);
  }

  // ---------- screens ----------

  private show(cls: string): HTMLElement {
    this.root.className = `arcade ${cls}`;
    this.root.replaceChildren();
    this.root.hidden = false;
    return this.root;
  }

  close(): void {
    this.stopRound();
    this.root.hidden = true;
    this.root.replaceChildren();
    this.h.onClosed();
  }

  openIntro(id: ArcadeGameId): void {
    const g = this.game(id);
    const s = this.h.getState();
    const unlocked = arcadeUnlocked(s, this.content, id);
    const left = arcadePlaysLeft(s, this.content, id, Date.now());
    const root = this.show('ar-intro');
    const back = el('button', 'ar-back', '‹');
    back.setAttribute('aria-label', 'Back to the Arcade');
    back.addEventListener('click', () => this.close());
    const pic = el('div', 'ar-intro-art');
    pic.append(art(`game_${id}_card`, '', g.name));
    const side = el('div', 'ar-intro-side');
    const talk = el('div', 'ar-talk');
    const host = this.content.residents[g.host];
    if (host) {
      const face = el('img', 'ar-talk-face');
      face.src = portraitUrl(host);
      face.alt = host.name;
      talk.append(face);
    }
    const bubble = el('div', 'ar-bubble');
    bubble.append(el('h2', '', g.name), el('p', '', g.howTo));
    talk.append(bubble);

    const prizes = el('div', 'ar-prizes');
    g.prizes.forEach((p, i) => prizes.append(this.prizeSlot(id, p, i, s)));

    const play = el('button', 'ar-play');
    play.append(el('b', '', unlocked ? (left > 0 ? 'Play' : 'Come back tomorrow') : `Home Level ${g.unlockLevel}`));
    play.append(el('small', '', unlocked ? `Plays left today ${left}/${this.content.arcade.playsPerDay} · Best ${s.arcade.best[id] ?? 0}` : 'Not unlocked yet'));
    play.disabled = !unlocked || left <= 0;
    play.addEventListener('click', () => this.startRound(id));
    side.append(talk, prizes, play);
    root.append(back, pic, side);
  }

  private prizeSlot(id: ArcadeGameId, p: ArcadePrize, index: number, s: GameState): HTMLElement {
    const won = prizeWon(s, id, index);
    const slot = el('div', `ar-slot${won ? ' won' : ''}${p.kind === 'companion' ? ' pet' : ''}`);
    // The open slot frames every prize; the padlock version is kept for games that are still locked.
    slot.append(art(arcadeUnlocked(s, this.content, id) ? 'ui_prize_slot_open' : 'ui_prize_slot_locked', 'ar-slot-bg'));
    const win = el('span', 'ar-slot-win');
    win.append(this.prizeArt(p, 'ar-slot-art'));
    slot.append(win);
    slot.append(el('span', 'ar-slot-score', `★ ${p.score}`));
    slot.append(el('span', 'ar-slot-name', this.prizeName(p)));
    slot.setAttribute('aria-label', `Score ${p.score}: ${this.prizeName(p)}${won ? ', won' : ''}`);
    return slot;
  }

  // ---------- a round ----------

  private stopRound(): void {
    this.running?.destroy?.();
    this.running = null;
    this.clock?.stop();
    this.clock = null;
  }

  private startRound(id: ArcadeGameId): void {
    const g = this.game(id);
    const s = this.h.getState();
    if (arcadePlaysLeft(s, this.content, id, Date.now()) <= 0) return;
    if (id === 'hide') this.h.showRoomForHide();
    const root = this.show(`ar-frame${id === 'hide' ? ' see-room' : ''}`);
    root.dataset.game = id;
    const bar = el('div', 'ar-bar');
    const scoreEl = el('b', 'ar-pill', '0');
    const timeEl = el('b', 'ar-pill', `${g.seconds}`);
    const pause = el('button', 'ar-pause');
    pause.setAttribute('aria-label', 'Pause');
    pause.append(art('ui_pause_button', '', 'Pause'));
    const left = el('span', 'ar-bar-side');
    left.append(el('i', 'ar-ico', '★'), scoreEl);
    const mid = el('span', 'ar-bar-mid');
    mid.append(el('i', 'ar-ico', '⏱'), timeEl);
    bar.append(left, mid, pause);
    const say = el('div', 'ar-say');
    say.setAttribute('role', 'status');
    const field = el('div', 'ar-field');
    root.append(bar, field, say);

    const clock = new Clock();
    this.clock = clock;
    let score = 0;
    let ended = false;
    const ctx: GameContext = {
      field,
      clock,
      reduced: this.reduced,
      content: this.content,
      state: s,
      scene: this.h.getScene(),
      get score() {
        return score;
      },
      addScore: (points, at) => {
        if (ended || points <= 0) return;
        score = Math.min(g.maxScore, score + points);
        scoreEl.textContent = String(score);
        let pos: { x: number; y: number } | null = null;
        if (at instanceof Element) {
          const f = field.getBoundingClientRect();
          const r = at.getBoundingClientRect();
          pos = { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 3 };
        } else if (at) pos = at;
        const pop = el('span', 'ar-pop', `+${points}`);
        if (pos) {
          pop.style.left = `${pos.x}px`;
          pop.style.top = `${pos.y}px`;
        } else pop.classList.add('ar-pop-bar');
        (pos ? field : bar).append(pop);
        window.setTimeout(() => pop.remove(), 800);
      },
      say: (text) => {
        say.textContent = text;
      },
      timeLeft: () => Math.max(0, g.seconds - clock.now() / 1000),
      end: () => finish(),
    };

    const finish = () => {
      if (ended) return;
      ended = true;
      const final = score;
      this.stopRound();
      if (id === 'hide') this.h.leaveRoomAfterHide();
      const res = this.h.dispatch({ type: 'play_arcade', gameId: id, score: final, at: Date.now() });
      this.showResults(id, final, res.ok ? res.events : [], res.ok ? null : this.h.errorText(res.error));
    };

    pause.addEventListener('click', () => {
      if (ended || clock.isPaused) return;
      clock.pause();
      field.classList.add('paused');
      const menu = el('div', 'ar-paused');
      const card = el('div', 'ar-paused-card');
      card.append(el('h2', '', 'Paused'));
      const keep = el('button', 'ar-btn primary', 'Keep playing');
      keep.addEventListener('click', () => {
        menu.remove();
        field.classList.remove('paused');
        clock.resume();
      });
      const stop = el('button', 'ar-btn', 'End round');
      stop.addEventListener('click', () => {
        menu.remove();
        finish();
      });
      card.append(el('p', '', 'Ending now keeps your score and uses this play.'), keep, stop);
      menu.append(card);
      root.append(menu);
      keep.focus();
    });

    // Countdown: only the end of the round, never a penalty.
    clock.every(250, () => {
      const t = Math.ceil(ctx.timeLeft());
      timeEl.textContent = String(t);
      mid.classList.toggle('low', t <= 5);
      if (t <= 0) finish();
    });
    this.running = GAMES[id](ctx);
    // A game that ends on its own before the countdown (no furniture to hide behind, etc.).
    if (ended) this.running?.destroy?.();
  }

  // ---------- results and prizes ----------

  private showResults(id: ArcadeGameId, score: number, events: GameEvent[], error: string | null): void {
    const g = this.game(id);
    const s = this.h.getState();
    const done = events.find((e): e is Extract<GameEvent, { type: 'arcade_done' }> => e.type === 'arcade_done');
    const won = events.filter((e): e is Won => e.type === 'prize_won');
    const root = this.show('ar-results');
    const card = el('div', 'ar-res-card');
    card.append(el('h2', 'ar-banner', score >= (g.prizes[0]?.score ?? 0) ? 'Wonderful!' : 'Well played!'));
    const body = el('div', 'ar-res-body');
    const left = el('div', 'ar-res-score');
    left.append(art('ui_star_burst', 'ar-res-burst'), el('b', 'ar-big', String(score)), el('span', '', 'points'));
    const mid = el('div', 'ar-res-mid');
    const best = done?.best ?? s.arcade.best[id] ?? score;
    mid.append(el('span', 'ar-pill2', done?.newBest ? `New best: ${best}!` : `Best ${best}`));
    const rib = el('span', 'ar-pill2 ribbon');
    const ri = artUrl('icon_ribbon');
    if (ri) {
      const img = el('img');
      img.src = ri;
      img.alt = '';
      rib.append(img);
    }
    rib.append(document.createTextNode(done ? `+${done.ribbons} Ribbon${done.ribbons === 1 ? '' : 's'}` : 'No Ribbons'));
    mid.append(rib);
    if (error) mid.append(el('p', 'ar-note', error));
    else if (done) mid.append(el('p', 'ar-note', `Plays left today ${done.playsLeft}/${this.content.arcade.playsPerDay}`));

    // Right: the prize just won, or the next one to aim for.
    const right = el('div', 'ar-res-prize');
    const next = g.prizes.findIndex((_, i) => !prizeWon(s, id, i));
    if (won.length) {
      const p = g.prizes[won[0]!.index]!;
      const names = won.map((w) => this.prizeName(g.prizes[w.index]!));
      right.append(this.prizeArt(p, 'ar-res-art'), el('b', '', `Unlocked: ${names.join(' and ')}!`));
      right.classList.add('celebrate');
    } else if (next >= 0) {
      const p = g.prizes[next]!;
      right.append(this.prizeArt(p, `ar-res-art${p.kind === 'companion' ? ' shadow' : ''}`), el('b', '', `Next prize at ★ ${p.score}`), el('span', '', this.prizeName(p)));
      const bar = el('span', 'ar-progress');
      const fill = el('i');
      fill.style.width = `${Math.min(100, (best / p.score) * 100)}%`;
      bar.append(fill);
      right.append(bar);
    } else {
      right.append(el('b', '', 'All three prizes won!'));
    }
    body.append(left, mid, right);
    const actions = el('div', 'ar-res-actions');
    const again = el('button', 'ar-btn primary', 'Play again');
    again.disabled = !done || done.playsLeft <= 0;
    again.addEventListener('click', () => this.startRound(id));
    const back = el('button', 'ar-btn', 'Back to Arcade');
    back.addEventListener('click', () => this.close());
    actions.append(again, back);
    card.append(body, actions);
    root.append(card);
    if (won.length) {
      if (!this.reduced) {
        const r = right.getBoundingClientRect();
        sparkle(root, { x: r.left + r.width / 2, y: r.top + r.height / 3 }, 160, false);
      }
      window.setTimeout(() => this.reveal(won, id), this.reduced ? 300 : 1100);
    }
  }

  /** Full-screen reveal for each prize won, one after another. */
  private reveal(queue: Won[], id: ArcadeGameId): void {
    const e = queue[0];
    if (!e) return;
    const p: ArcadePrize = { kind: e.kind, id: e.id, score: 0 };
    const layer = el('div', 'ar-reveal');
    const title = el('h2', 'ar-banner', this.prizeName(p));
    const stage = el('div', 'ar-reveal-stage');
    stage.append(art('ui_star_burst', 'ar-reveal-burst'), this.prizeArt(p, 'ar-reveal-art'));
    const pills = el('div', 'ar-reveal-pills');
    const actions = el('div', 'ar-res-actions');
    const nice = el('button', 'ar-btn primary', 'Lovely!');
    const nextUp = () => {
      layer.remove();
      if (queue.length > 1) this.reveal(queue.slice(1), id);
    };
    nice.addEventListener('click', nextUp);
    if (e.kind === 'furniture') {
      pills.append(el('span', 'ar-pill2', 'Placed in your storage'), el('span', 'ar-pill2', 'Exclusive Arcade prize'));
      const place = el('button', 'ar-btn', 'Place it now');
      place.addEventListener('click', () => {
        this.close();
        this.h.placeNow(e.id);
      });
      actions.append(nice, place);
    } else {
      const who = e.residentId ? this.content.residents[e.residentId]?.name : null;
      pills.append(el('span', 'ar-pill2', 'New companion!'), el('span', 'ar-pill2', who ? `Now following ${who}` : 'Resting in the Nookbook'));
      const choose = el('button', 'ar-btn', 'Choose a friend');
      choose.addEventListener('click', () => {
        this.close();
        this.h.openResident(e.residentId ?? this.h.getState().residentOrder[0] ?? 'snug');
      });
      actions.append(nice, choose);
    }
    layer.append(title, stage, pills, actions);
    this.root.append(layer);
  }
}
