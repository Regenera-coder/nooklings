import type { ResidentDef } from '@nooklings/core';
import { artUrl, costumeArtName } from './assets';

/**
 * Placeholder portraits for the DOM (Nookbook, character page, parcel reveal),
 * drawn once per character on a canvas. Replaced by char_<id>_portrait.png when it exists.
 */
const cache = new Map<string, string>();

function draw(def: ResidentDef, silhouette: boolean, decorated: boolean): string {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d')!;
  const body = silhouette ? '#3a2d40' : def.palette.body;
  const accent = silhouette ? '#3a2d40' : def.palette.accent;
  const ear = (x: number, y: number, w: number, h: number, rot: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.beginPath();
    g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  g.fillStyle = body;
  switch (def.id) {
    case 'snug':
      ear(70, 150, 26, 70, 0.15);
      ear(186, 150, 26, 70, -0.15);
      break;
    case 'mischi':
      g.beginPath();
      g.moveTo(60, 110); g.lineTo(40, 10); g.lineTo(120, 80);
      g.moveTo(196, 110); g.lineTo(216, 10); g.lineTo(136, 80);
      g.fill();
      break;
    case 'tinker':
      ear(70, 110, 30, 34, 0);
      ear(186, 110, 30, 34, 0);
      break;
    default:
      ear(80, 90, 26, 30, 0);
      ear(176, 90, 26, 30, 0);
  }
  g.beginPath();
  g.ellipse(128, 236, 90, 50, 0, Math.PI, 0);
  g.fill();
  g.beginPath();
  g.arc(128, 140, 78, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = accent;
  if (def.id === 'snug') {
    g.beginPath(); g.moveTo(50, 110); g.lineTo(206, 110); g.lineTo(196, 30); g.closePath(); g.fill();
    g.beginPath(); g.arc(198, 32, 14, 0, Math.PI * 2); g.fillStyle = silhouette ? accent : '#ffffff'; g.fill();
  } else if (def.id === 'tinker') {
    g.beginPath(); g.ellipse(128, 82, 82, 34, 0, Math.PI, 0); g.fill();
    if (!silhouette) {
      g.fillStyle = '#c9a227';
      for (const x of [98, 158]) { g.beginPath(); g.arc(x, 80, 22, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#e8f3ff';
      for (const x of [98, 158]) { g.beginPath(); g.arc(x, 80, 14, 0, Math.PI * 2); g.fill(); }
    }
  } else if (def.id === 'mischi') {
    if (!silhouette) {
      g.fillStyle = '#ffffff';
      g.fillRect(70, 196, 116, 18);
      g.fillStyle = accent;
      for (let x = 70; x < 186; x += 24) g.fillRect(x, 196, 12, 18);
    }
  } else {
    g.beginPath(); g.arc(128, 70, 30, 0, Math.PI * 2); g.fill();
  }
  if (!silhouette) {
    g.fillStyle = '#3d2b3a';
    const closed = def.id === 'snug';
    for (const x of [100, 156]) {
      g.beginPath();
      if (closed) { g.lineWidth = 5; g.strokeStyle = '#3d2b3a'; g.arc(x, 146, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
      else { g.arc(x, 146, 9, 0, Math.PI * 2); g.fill(); }
    }
    g.fillStyle = 'rgba(242,150,170,0.6)';
    for (const x of [82, 174]) { g.beginPath(); g.ellipse(x, 166, 13, 8, 0, 0, Math.PI * 2); g.fill(); }
    if (decorated) {
      g.fillStyle = '#fff2b8';
      for (const [x, y] of [[50, 210], [206, 206], [128, 226]] as const) {
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 14 : 6;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        g.fill();
      }
    }
  } else {
    g.fillStyle = '#ffffff55';
    g.font = 'bold 72px sans-serif';
    g.textAlign = 'center';
    g.fillText('?', 128, 166);
  }
  return c.toDataURL();
}

/**
 * Put a resident's picture in an <img>. A friend not found yet is their real portrait shown as a dark
 * silhouette (class "silhouette", styled in CSS), so no shape is ever drawn in code when the art exists.
 */
export function setPortrait(img: HTMLImageElement, def: ResidentDef, opts: { silhouette?: boolean; decorated?: boolean; costume?: string | null } = {}): void {
  const shadow = opts.silhouette === true ? artUrl(`char_${def.id}_portrait`) : null;
  img.classList.toggle('silhouette', !!shadow);
  img.src = shadow ?? portraitUrl(def, opts);
}

export function portraitUrl(def: ResidentDef, opts: { silhouette?: boolean; decorated?: boolean; costume?: string | null } = {}): string {
  const silhouette = opts.silhouette === true;
  const decorated = opts.decorated === true;
  if (!silhouette) {
    const costumeArt = opts.costume ? artUrl(`char_${def.id}_costume_${costumeArtName(def.id, opts.costume)}_idle`) : null;
    const art = costumeArt || (decorated && artUrl(`char_${def.id}_decorated_idle`)) || artUrl(`char_${def.id}_portrait`);
    if (art) return art;
  }
  const key = `${def.id}:${silhouette}:${decorated}`;
  let url = cache.get(key);
  if (!url) {
    url = draw(def, silhouette, decorated);
    cache.set(key, url);
  }
  return url;
}
