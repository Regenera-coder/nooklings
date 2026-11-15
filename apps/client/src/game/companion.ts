import * as Phaser from 'phaser';
import type { Resident } from './resident';

/** Companions that fly: they hover at shoulder height and float instead of stepping. */
const FLYERS = new Set(['bumblebee', 'firefly']);
/** Companion height as a share of the resident's standing height (brief 09: about a third). */
const HEIGHT_SHARE = 0.38;

/**
 * A small Arcade pet that trails the resident it was given to. It keeps a little distance
 * behind them, walks when they walk (two-frame step like the residents), and settles beside
 * them when they stop, sit or sleep. Art faces right; it is mirrored when moving left.
 */
export class Companion {
  readonly sprite: Phaser.GameObjects.Image;
  private x = 0;
  private y = 0;
  private placed = false;
  private facing = 1;
  private stepT = Math.random() * 10;
  private floatT = Math.random() * 10;
  private readonly flyer: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: string,
    readonly residentId: string,
    private readonly reducedMotion: boolean,
  ) {
    this.flyer = FLYERS.has(id);
    this.sprite = scene.add.image(0, 0, this.key('idle')).setOrigin(0.5, 0.96).setVisible(false);
  }

  private key(pose: 'idle' | 'walk'): string {
    const k = `pet_${this.id}_${pose}`;
    return this.scene.textures.exists(k) ? k : `pet_${this.id}_idle`;
  }

  destroy(): void {
    this.sprite.destroy();
  }

  setVisible(on: boolean): void {
    this.sprite.setVisible(on && this.placed);
  }

  update(dtMs: number, target: Resident, hidden: boolean): void {
    if (!this.scene.textures.exists(`pet_${this.id}_idle`)) return;
    const dt = Math.min(dtMs, 100) / 1000;
    const anchor = target.followPoint();
    // Sit just behind the resident (opposite the way they face) and a touch in front, so feet don't overlap.
    const tx = anchor.x - anchor.facing * anchor.size * 0.62;
    const ty = anchor.y + anchor.size * 0.06;
    if (!this.placed) {
      this.x = tx;
      this.y = ty;
      this.placed = true;
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = anchor.size * 2.6; // px per second: a little quicker than residents so it keeps up
    const moving = dist > anchor.size * 0.08;
    if (moving) {
      const step = Math.min(dist, speed * dt * Math.max(1, dist / (anchor.size * 1.2)));
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      if (Math.abs(dx) > anchor.size * 0.05) this.facing = dx > 0 ? 1 : -1;
    } else if (Math.abs(anchor.facing) > 0) {
      this.facing = anchor.facing;
    }

    const src = this.scene.textures.get(this.key('idle')).getSourceImage() as { height: number };
    const scale = (anchor.size * 1.12 * HEIGHT_SHARE) / (Math.max(1, src.height) * 0.8);
    let y = this.y;
    let key = this.key('idle');
    let sx = 1;
    let sy = 1;
    let tilt = 0;
    if (this.flyer) {
      y -= anchor.size * 0.55;
      if (!this.reducedMotion) {
        this.floatT += dt * 3;
        y += Math.sin(this.floatT) * anchor.size * 0.06;
        if (moving) key = this.key('walk');
      }
    } else if (moving && !this.reducedMotion) {
      this.stepT += dt * 13;
      const lift = Math.abs(Math.sin(this.stepT));
      key = lift > 0.35 ? this.key('walk') : this.key('idle');
      y -= lift * anchor.size * 0.05;
      tilt = Math.sin(this.stepT) * 0.08;
      const land = 1 - lift;
      sy = 1 - land * 0.05;
      sx = 1 + land * 0.03;
    } else if (moving) {
      key = this.key('walk');
    }
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);
    this.sprite
      .setPosition(this.x, y)
      .setScale(scale * this.facing * sx, scale * sy)
      .setRotation(tilt)
      .setDepth(100 + this.y - 0.5)
      .setVisible(!hidden);
  }
}
