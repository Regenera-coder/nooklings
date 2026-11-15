// Scans apps/client/public/assets for PNG and WebP images and writes manifest.json mapping each art key
// (e.g. "char_snug_idle") to its file, picking the highest _vN version when several exist.
import { readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../apps/client/public/assets/', import.meta.url).pathname;
const best = new Map();
for (const file of readdirSync(dir)) {
  const ext = file.toLowerCase().match(/\.(png|webp)$/)?.[0];
  if (!ext || !statSync(join(dir, file)).isFile()) continue;
  const m = file.slice(0, -ext.length).match(/^(.*?)(?:_v(\d+))?$/);
  const key = m[1];
  const version = m[2] ? Number(m[2]) : 1;
  const prev = best.get(key);
  if (!prev || version > prev.version) best.set(key, { version, file });
}
const manifest = Object.fromEntries([...best.entries()].sort().map(([k, v]) => [k, `assets/${v.file}`]));
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`asset manifest: ${Object.keys(manifest).length} image(s)`);
