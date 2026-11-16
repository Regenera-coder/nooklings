import type { CloudSync } from './cloud';

/** The slice of Google's sign-in script this card uses. */
interface GoogleId {
  initialize(options: { client_id: string; callback: (response: { credential?: string }) => void; auto_select?: boolean }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
}

type Summary = { level: number; friends: number } | null;

let script: Promise<GoogleId | null> | null = null;
let holder: HTMLDivElement | null = null;
let failed = false;

function loadGoogle(): Promise<GoogleId | null> {
  script ??= new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://accounts.google.com/gsi/client';
    tag.async = true;
    tag.onload = () => resolve((window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id ?? null);
    tag.onerror = () => resolve(null);
    document.head.append(tag);
  });
  return script;
}

/** One Google button for the life of the page; the card just moves it back in on every redraw. */
function googleButton(cloud: CloudSync, redraw: () => void): HTMLDivElement {
  if (holder) return holder;
  holder = document.createElement('div');
  holder.className = 'cloud-google';
  const box = holder;
  void loadGoogle().then((id) => {
    if (!id || !cloud.clientId) {
      failed = true;
      box.textContent = 'Google sign-in could not load. Check your connection and reopen this page.';
      return;
    }
    id.initialize({
      client_id: cloud.clientId,
      callback: (response) => {
        if (!response.credential) return;
        void cloud.signIn(response.credential).then((ok) => {
          if (!ok) {
            failed = true;
            redraw();
          }
        });
      },
    });
    id.renderButton(box, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 240 });
  });
  return holder;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function when(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return today ? `today at ${time}` : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${time}`;
}

const line = (s: Summary): string => (s ? `Home Level ${s.level}, ${s.friends} ${s.friends === 1 ? 'Nookling' : 'Nooklings'}` : 'a save from a newer version of the game');

/** The "Cloud save" card for the Tasks page, or null while cloud save is not set up. */
export function cloudCard(cloud: CloudSync, describe: (text: string) => Summary, local: () => string): HTMLElement | null {
  if (cloud.status === 'off') return null;
  const card = el('div', 'card cloud');
  card.append(el('h3', '', 'Cloud save'));
  const redraw = (): void => card.replaceWith(cloudCard(cloud, describe, local) ?? '');
  const action = (label: string, cls: string, run: () => void): HTMLButtonElement => {
    const b = el('button', cls, label);
    b.addEventListener('click', run);
    return b;
  };

  switch (cloud.status) {
    case 'signed_out':
    case 'expired':
      card.append(
        el('p', '', cloud.status === 'expired'
          ? 'Your sign-in has ended. Sign in again to keep saving to the cloud. Nothing on this device is lost.'
          : 'Sign in with Google to keep your home safe and play it on another device. Only an anonymous account number is stored: no name, no email.'),
      );
      card.append(googleButton(cloud, redraw));
      if (failed) card.append(el('p', 'hint', 'Sign-in did not work. Please try again.'));
      break;
    case 'conflict': {
      const remote = cloud.conflict;
      const theirs = remote ? describe(remote.data) : null;
      card.append(el('p', '', 'This device and the cloud have different saves. Which one do you want to keep? The other one will be replaced.'));
      const row = el('div', 'cloud-choice');
      const cloudSide = el('div', 'cloud-side');
      cloudSide.append(el('b', '', 'Cloud'), el('p', '', line(theirs)), el('p', 'hint', remote ? `Saved ${when(remote.savedAt)}` : ''));
      // A save this version of the game cannot read must not replace one it can.
      const useCloud = action('Use the cloud save', 'btn', () => void cloud.resolve('cloud'));
      useCloud.disabled = !theirs;
      cloudSide.append(useCloud);
      const deviceSide = el('div', 'cloud-side');
      deviceSide.append(el('b', '', 'This device'), el('p', '', line(describe(local()))), el('p', 'hint', 'What you see now'));
      deviceSide.append(action('Keep this device', 'btn', () => void cloud.resolve('device')));
      row.append(cloudSide, deviceSide);
      card.append(row);
      break;
    }
    default: {
      const text =
        cloud.status === 'synced' ? `Saved to the cloud ${when(cloud.syncedAt)}.`
        : cloud.status === 'syncing' ? 'Saving to the cloud…'
        : 'Changes are waiting to be saved to the cloud. They will go up when you are online.';
      card.append(el('p', '', text));
      const row = el('div', 'rewards');
      if (cloud.status === 'pending') row.append(action('Save now', 'btn primary', () => void cloud.sync()));
      row.append(action('Sign out', 'btn', () => cloud.signOut()));
      card.append(row);
    }
  }
  return card;
}
