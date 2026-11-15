/**
 * Production art lookup. tools/import_art.py drops images into public/assets and writes
 * manifest.json. Anything missing falls back to the placeholder drawings.
 */
export type Manifest = Record<string, string>;

let manifest: Manifest = {};

export async function loadManifest(): Promise<Manifest> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}assets/manifest.json`, { cache: 'no-cache' });
    manifest = res.ok ? ((await res.json()) as Manifest) : {};
  } catch {
    manifest = {};
  }
  return manifest;
}

export function hasArt(key: string): boolean {
  return key in manifest;
}

export function artUrl(key: string): string | null {
  const path = manifest[key];
  return path ? `${import.meta.env.BASE_URL}${path}` : null;
}

export function allArt(): Manifest {
  return manifest;
}

export type Pose = 'idle' | 'walk' | 'walk2' | 'sit' | 'sleep' | 'happy';

/**
 * Texture key for a character pose. A Decorated resident uses its Decorated art for
 * every pose that has it (idle, walk, sit, sleep); happy falls back to Decorated idle.
 * Anything missing falls back to the original-form pose, then to idle.
 */
export function charKey(id: string, pose: Pose, decorated: boolean, costume: string | null = null): string | null {
  // A worn costume has its own pose set: char_<id>_costume_<name>_<pose> (costume id mopey_umbrella -> umbrella), falling back pose by pose.
  if (costume) {
    const base = `char_${id}_costume_${costumeArtName(id, costume)}_`;
    const tryPose = pose === 'happy' ? 'idle' : pose;
    if (hasArt(base + tryPose)) return base + tryPose;
    if (pose === 'walk2' && hasArt(base + 'walk')) return base + 'walk';
    if ((pose === 'walk' || pose === 'walk2') && hasArt(base + 'idle')) return base + 'idle';
  }
  // walk2 is the opposite-foot step frame; without it the walk cycle uses walk only.
  if (pose === 'walk2') {
    if (decorated && hasArt(`char_${id}_decorated_walk2`)) return `char_${id}_decorated_walk2`;
    if (!decorated && hasArt(`char_${id}_walk2`)) return `char_${id}_walk2`;
    return charKey(id, 'walk', decorated);
  }
  if (decorated) {
    const decoPose = pose === 'happy' ? 'idle' : pose;
    if (hasArt(`char_${id}_decorated_${decoPose}`)) return `char_${id}_decorated_${decoPose}`;
    if ((pose === 'idle' || pose === 'walk') && hasArt(`char_${id}_decorated_idle`)) return `char_${id}_decorated_idle`;
  }
  if (hasArt(`char_${id}_${pose}`)) return `char_${id}_${pose}`;
  if (hasArt(`char_${id}_idle`)) return `char_${id}_idle`;
  return null;
}

/** File-name part of a costume: the costume id without the resident prefix. */
export function costumeArtName(residentId: string, costumeId: string): string {
  return costumeId.startsWith(residentId + '_') ? costumeId.slice(residentId.length + 1) : costumeId;
}
