import * as Phaser from 'phaser';
import { content, LIVING_ROOM_ID } from '@nooklings/content';
import { RoomScene, type SceneCallbacks } from './game/RoomScene';
import { LocalSaveStore } from './save/saveStore';
import { GameStore } from './store';
import { GameUI } from './ui/ui';
import './style.css';

const store = new GameStore(content, new LocalSaveStore());
const stage = document.getElementById('stage')!;

let scene: RoomScene | null = null;

/** Render at screen density (capped at 2x for phone GPUs) and display at CSS size. */
const pixelRatio = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));

function fitToStage(): void {
  const dpr = pixelRatio();
  const w = Math.max(1, Math.round(stage.clientWidth * dpr));
  const h = Math.max(1, Math.round(stage.clientHeight * dpr));
  game.scale.setZoom(1 / dpr);
  if (game.scale.width !== w || game.scale.height !== h) game.scale.resize(w, h);
}

const ui = new GameUI(
  content,
  () => store.state,
  () => scene,
  () => requestAnimationFrame(fitToStage),
);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: '#2b2130',
  scale: {
    mode: Phaser.Scale.NONE,
    width: Math.round((stage.clientWidth || 640) * pixelRatio()),
    height: Math.round((stage.clientHeight || 320) * pixelRatio()),
    zoom: 1 / pixelRatio(),
  },
  input: { activePointers: 2 },
  render: { antialias: true },
  banner: false,
});

game.scene.add('room', RoomScene, true, {
  store,
  roomId: LIVING_ROOM_ID,
  callbacks: {
    onSelection: (sel) => ui.onSelection(sel),
    onPending: (edit) => ui.onPending(edit),
    onError: (msg) => ui.toast(msg),
  } satisfies SceneCallbacks,
});
game.events.once(Phaser.Core.Events.READY, () => {
  scene = game.scene.getScene('room') as RoomScene;
});
store.subscribe(() => ui.onStateChanged());

new ResizeObserver(fitToStage).observe(stage);

// Debug hook for automated checks in development builds only.
if (import.meta.env.DEV) {
  (window as unknown as { nooklings: unknown }).nooklings = { store, game, getScene: () => scene };
}
