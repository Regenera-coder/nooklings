import * as Phaser from 'phaser';
import { content as releasedSeries1, contentWithSeries2, LIVING_ROOM_ID } from '@nooklings/content';
import { loadManifest } from './assets';
import { RoomScene, type SceneCallbacks } from './game/RoomScene';
import { deserialize, levelFor } from '@nooklings/core';
import { CloudSync } from './save/cloud';
import { cloudCard } from './save/cloudCard';
import { LocalSaveStore, WatchedSaveStore } from './save/saveStore';
import { GameStore } from './store';
import { GameUI } from './ui/ui';
import './style.css';

/** Render at screen density (capped at 2x for phone GPUs) and display at CSS size. */
const pixelRatio = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));

/**
 * Series 2 (Teatime Friends) was released on 16 Nov 2026. To go back to Series 1 only, use
 * `releasedSeries1` here: saves open safely either way, but Series 2 progress is dropped.
 */
const baseContent = contentWithSeries2;
void releasedSeries1;

/** Daily limits reset at midnight on this device's clock. */
const content = { ...baseContent, rules: { ...baseContent.rules, dayOffsetMs: -new Date().getTimezoneOffset() * 60_000 } };

async function start(): Promise<void> {
  await loadManifest();
  const saves = new WatchedSaveStore(new LocalSaveStore());
  const store = new GameStore(content, saves);
  const stage = document.getElementById('stage')!;
  let scene: RoomScene | null = null;

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
    (cmd) => store.dispatch(cmd),
    () => scene,
    () => requestAnimationFrame(fitToStage),
  );

  const callbacks: SceneCallbacks = {
    onSelection: (sel) => ui.onSelection(sel),
    onPending: (edit) => ui.onPending(edit),
    onError: (msg) => ui.toast(msg),
  };
  game.scene.add('room', RoomScene, true, { store, roomId: LIVING_ROOM_ID, callbacks });
  game.events.once(Phaser.Core.Events.READY, () => {
    scene = game.scene.getScene('room') as RoomScene;
  });
  store.subscribe((_state, events) => ui.onStateChanged(events));

  // Cloud save: does nothing, and shows nothing, unless the server has it set up.
  const describe = (text: string): { level: number; friends: number } | null => {
    try {
      const s = deserialize(text, content);
      return { level: levelFor(s.hearts, content), friends: Object.keys(s.residents).length };
    } catch {
      return null;
    }
  };
  const cloud = new CloudSync({
    fetch: (input, init) => fetch(input, init),
    storage: window.localStorage,
    getLocal: () => store.snapshot(),
    applyRemote: (text) => store.load(text),
    isFresh: (text) => {
      try {
        const s = deserialize(text, content);
        return s.hearts === 0 && s.claimedTasks.length === 0 && Object.keys(s.residents).length <= content.starter.residents.length;
      } catch {
        return true;
      }
    },
    onChange: () => ui.refresh(),
  });
  // A Series 2 preview never talks to cloud save: its save must not replace the real one.
  if (import.meta.env.VITE_SERIES2 !== '1') {
    saves.onSave = () => cloud.localChanged();
    ui.tasksExtra = () => cloudCard(cloud, describe, () => store.snapshot());
    void cloud.init();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void cloud.flush();
    });
  }
  new ResizeObserver(fitToStage).observe(stage);

  // Debug hook for automated checks in development builds only.
  if (import.meta.env.DEV) {
    (window as unknown as { nooklings: unknown }).nooklings = { store, game, ui, getScene: () => scene };
  }
}

void start();
