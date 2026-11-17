import type { Cost, Currency } from '@nooklings/core';
import { artUrl } from '../assets';

/** Small DOM helpers shared by every screen. */
export const CURRENCY: Record<Currency | 'hearts', { name: string; icon: string; glyph: string }> = {
  buttons: { name: 'Buttons', icon: 'icon_buttons', glyph: '●' },
  wood: { name: 'Wood', icon: 'icon_wood', glyph: '▤' },
  fabric: { name: 'Fabric', icon: 'icon_fabric', glyph: '◈' },
  wishStamps: { name: 'Wish Stamps', icon: 'icon_wish_stamp', glyph: '✉' },
  mendingThread: { name: 'Mending Thread', icon: 'icon_mending_thread', glyph: '✂' },
  keepsakes: { name: 'Keepsakes', icon: 'icon_keepsake', glyph: '❖' },
  ribbons: { name: 'Ribbons', icon: 'icon_ribbon', glyph: '🎀' },
  treats: { name: 'Treats', icon: 'icon_treats', glyph: '🍪' },
  hearts: { name: 'Home Hearts', icon: 'icon_home_heart', glyph: '♥' },
};


export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function button(label: string, cls: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const b = el('button', cls, label);
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

export function icon(kind: Currency | 'hearts'): HTMLElement {
  const meta = CURRENCY[kind];
  const url = artUrl(meta.icon);
  if (url) {
    const img = el('img', 'ico-img');
    img.src = url;
    img.alt = '';
    return img;
  }
  return el('span', '', meta.glyph);
}

export function costChips(cost: Cost & { hearts?: number }, cls = 'reward'): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const [k, v] of Object.entries(cost) as Array<[Currency | 'hearts', number | undefined]>) {
    if (!v) continue;
    const chip = el('span', cls);
    const name = CURRENCY[k].name;
    chip.append(icon(k), document.createTextNode(` ${v} ${v === 1 && name.endsWith('s') ? name.slice(0, -1) : name}`));
    out.push(chip);
  }
  return out;
}

export function tagChips(tags: Record<string, number>): HTMLElement {
  const wrap = el('div', 'tags');
  const entries = Object.entries(tags);
  if (entries.length === 0) wrap.append(el('span', 'tag', 'No atmosphere'));
  for (const [k, v] of entries) wrap.append(el('span', 'tag', `${k} +${v}`));
  return wrap;
}

export function bondHearts(level: number): HTMLElement {
  const wrap = el('span', 'bond');
  for (let i = 1; i <= 5; i++) wrap.append(el('span', i <= level ? '' : 'off', '♥'));
  return wrap;
}

export function seconds(ms: number): string {
  return `${Math.max(1, Math.ceil(ms / 1000))}s`;
}

export function clock(ms: number): string {
  const total = Math.max(1, Math.ceil(ms / 1000));
  if (total >= 3600) {
    const mins = Math.ceil(total / 60);
    const rest = mins % 60;
    return rest ? `${Math.floor(mins / 60)} h ${rest} min` : `${Math.floor(mins / 60)} h`;
  }
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

/** Small square scene art for Explore rows, once ChatGPT delivers it. */
export function cardArt(key: string): HTMLElement | null {
  const url = artUrl(key);
  if (!url) return null;
  const img = el('img', 'card-thumb');
  img.src = url;
  img.alt = '';
  return img;
}


/**
 * A price as chips, each marked against what the player has: a chip turns red only for a currency they are short of.
 * Returns the chips and whether the whole price is affordable.
 */
export function priceChips(cost: Cost, wallet: Partial<Record<Currency, number>>): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const [k, v] of Object.entries(cost) as Array<[Currency, number | undefined]>) {
    if (!v) continue;
    const short = (wallet[k] ?? 0) < v;
    const chip = el('span', `price${short ? ' short' : ''}`);
    const name = CURRENCY[k].name;
    chip.append(icon(k), document.createTextNode(` ${v} ${v === 1 && name.endsWith('s') ? name.slice(0, -1) : name}`));
    if (short) chip.title = `You have ${wallet[k] ?? 0}`;
    out.push(chip);
  }
  return out;
}

/** An image from the art manifest, or nothing if it hasn't been made yet. */
export function art(key: string, cls: string, alt = ''): HTMLImageElement | null {
  const url = artUrl(key);
  if (!url) return null;
  const img = el('img', cls);
  img.src = url;
  img.alt = alt;
  return img;
}
