/**
 * Succulent colour in the browser. The art is neutral felt; this tints it by growth:
 * green seedling -> the species' own colour, blended smoothly by hue (so it never passes through grey).
 * A light blush settles on the far leaf tips once the plant is nearly grown.
 * Brown wood (the Teacup Tree trunk) keeps its own colour. Same method as
 * tools/succulent_colour_preview.py, at a smaller size so it runs on phones.
 */
import type { SucculentDef } from '@nooklings/core';
import { artUrl } from '../assets';

const SIZE = 256;
/** Colour steps cached per species: the blend moves slowly, so 48 steps look smooth. */
const STEPS = 48;
const WOOD: RGB = [0.62, 0.48, 0.38];

type RGB = [number, number, number];

interface Prepared {
  w: number;
  h: number;
  alpha: Uint8ClampedArray;
  shade: Float32Array;
  wood: Uint8Array;
  tip: Float32Array;
}

const prepared = new Map<string, Promise<Prepared | null>>();
const rendered = new Map<string, string>();

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function toHsl([r, g, b]: RGB): RGB {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl([h, s, l]: RGB): RGB {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    return u < 1 / 6 ? p + (q - p) * 6 * u : u < 1 / 2 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/** Body colour at a point of the growth blend (0 = seedling green, 1 = grown), turning the short way round the colour wheel. */
export function bodyColour(def: SucculentDef, seedling: string, t: number): RGB {
  const a = toHsl(hexToRgb(seedling));
  const b = toHsl(hexToRgb(def.colour.mature));
  let dh = b[0] - a[0];
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  const h = (a[0] + dh * t + 1) % 1;
  return fromHsl([h, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

/** Blush appears over the last fifth of growing, up to a light natural level (the Sun Shelf will deepen it later). */
function blushAt(t: number): number {
  return Math.max(0, Math.min(1, (t - 0.8) / 0.2)) * 0.4;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Chamfer distance (in pixels) from each solid pixel to the nearest empty one. */
function distanceInside(solid: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h);
  const big = 1e6;
  for (let i = 0; i < d.length; i++) d[i] = solid[i] ? big : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]!);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i]!, at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i]!, at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  return d;
}

function morph(mask: Uint8Array, w: number, h: number, grow: boolean): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = grow ? 0 : 1;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const m = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : mask[yy * w + xx]!;
          if (grow ? m : !m) v = grow ? 1 : 0;
        }
      out[y * w + x] = v;
    }
  return out;
}

async function prepare(def: SucculentDef): Promise<Prepared | null> {
  const url = artUrl(`succ_${def.id}`);
  if (!url) return null;
  const img = await loadImage(url);
  const scale = SIZE / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const n = w * h;
  const alpha = new Uint8ClampedArray(n);
  const lum = new Float32Array(n);
  const solid = new Uint8Array(n);
  let woodRaw: Uint8Array = new Uint8Array(n);
  const lums: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = px[i * 4]! / 255;
    const g = px[i * 4 + 1]! / 255;
    const b = px[i * 4 + 2]! / 255;
    alpha[i] = px[i * 4 + 3]!;
    lum[i] = (r + g + b) / 3;
    if (alpha[i]! > 128) {
      solid[i] = 1;
      lums.push(lum[i]!);
      if (r - g > 0.035) woodRaw[i] = 1;
    }
  }
  lums.sort((a, b) => a - b);
  const median = lums[Math.floor(lums.length / 2)] || 0.6;
  const shade = new Float32Array(n);
  for (let i = 0; i < n; i++) shade[i] = Math.min(1.35, lum[i]! / median);
  // Opening removes stray brown specks so only real wood stays untinted.
  woodRaw = morph(morph(woodRaw, w, h, false), w, h, true);

  // Blush weight: near the outline AND far from where the plant grows from.
  const dist = distanceInside(solid, w, h);
  const k = 0.044 * Math.max(w, h);
  let cx = 0, cy = 0, count = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (solid[y * w + x]) {
        cx += x; cy += y; count++;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  cx /= count || 1;
  cy /= count || 1;
  const ay = def.anchor === 'centre' ? cy : def.anchor === 'base' ? maxY : minY;
  let rMax = 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (solid[y * w + x]) rMax = Math.max(rMax, Math.hypot(x - cx, y - ay));
  const tip = new Float32Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!solid[i] && alpha[i]! === 0) continue;
      const edge = Math.pow(Math.exp(-dist[i]! / k), 0.6);
      const r = Math.hypot(x - cx, y - ay) / rMax;
      const radial = Math.pow(Math.max(0, Math.min(1, (r - 0.3) / 0.6)), 1.3);
      tip[i] = Math.min(1, edge * radial * 1.1);
    }
  return { w, h, alpha, shade, wood: woodRaw, tip };
}

function prepared$(def: SucculentDef): Promise<Prepared | null> {
  let p = prepared.get(def.id);
  if (!p) {
    p = prepare(def).catch(() => null);
    prepared.set(def.id, p);
  }
  return p;
}

function paint(p: Prepared, body: RGB, blush: RGB, strength: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = p.w;
  canvas.height = p.h;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(p.w, p.h);
  const o = out.data;
  for (let i = 0; i < p.w * p.h; i++) {
    const a = p.alpha[i]!;
    if (!a) continue;
    const s = p.shade[i]!;
    let c: RGB;
    if (p.wood[i]) c = WOOD;
    else {
      const wgt = p.tip[i]! * strength;
      c = [body[0] + (blush[0] - body[0]) * wgt, body[1] + (blush[1] - body[1]) * wgt, body[2] + (blush[2] - body[2]) * wgt];
    }
    o[i * 4] = Math.min(255, c[0] * s * 255);
    o[i * 4 + 1] = Math.min(255, c[1] * s * 255);
    o[i * 4 + 2] = Math.min(255, c[2] * s * 255);
    o[i * 4 + 3] = a;
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL('image/png');
}

export interface Palette {
  seedling: string;
}

/**
 * Picture of a succulent at a point of its growth blend, as an image URL.
 * Returns null if it is not ready yet (the first call starts preparing it); `onReady` runs once it is.
 */
export function succulentImage(def: SucculentDef, palette: Palette, colour: number, onReady: () => void): string | null {
  const step = Math.round(Math.max(0, Math.min(1, colour)) * STEPS);
  const key = `${def.id}:${step}`;
  const hit = rendered.get(key);
  if (hit) return hit;
  void prepared$(def).then((p) => {
    if (!p || rendered.has(key)) return;
    const t = step / STEPS;
    rendered.set(key, paint(p, bodyColour(def, palette.seedling, t), hexToRgb(def.colour.blush), blushAt(t)));
    onReady();
  });
  return null;
}

/** The untinted felt art (shown while the tinted one is being prepared). */
export function succulentArtUrl(def: SucculentDef): string | null {
  return artUrl(`succ_${def.id}`);
}
