/**
 * Offline play and updates, the page's half (the worker is worker.ts). `register.ts` starts
 * it in a build (`npm run build` and `build:dev` write `sw.js`); `npm run dev` has no worker.
 *
 * A new version installs in the background and waits. When the player isn't at a board
 * (boards.ts) a bar says "A new version is ready", and Reload hands over to it: the page
 * reloads once the new worker is in charge. At a board the bar stays away, and comes back
 * when they leave: the game never reloads mid-fight. If another tab hands over first, this
 * one reloads too, but again only off a board.
 */
import '../styles/update.css';
import { el } from '@picross/shared/ui/dom';
import { isBoardRoute } from './boards';

/** The parts of a `ServiceWorker` this uses. */
export interface WorkerLike extends EventTarget {
  readonly state: string;
  postMessage(message: unknown): void;
}
/** The parts of a `ServiceWorkerRegistration` this uses. */
export interface RegistrationLike extends EventTarget {
  readonly waiting: WorkerLike | null;
  readonly installing: WorkerLike | null;
}
/** The parts of `navigator.serviceWorker` this uses. */
export interface ContainerLike extends EventTarget {
  readonly controller: unknown;
}

/** The bar: shown with what Reload does, or hidden. */
export interface UpdateView {
  show(reload: () => void): void;
  hide(): void;
}

export interface Watch {
  container: ContainerLike;
  registration: RegistrationLike;
  /** The current route (`location.hash`). */
  hash(): string;
  view: UpdateView;
  /** Reloads the page. */
  reload(): void;
}

/** The message that tells a waiting worker to take over (worker.ts). */
export const SKIP_WAITING = { type: 'SKIP_WAITING' };

/**
 * Shows the bar while a new version waits and the player isn't at a board, and reloads
 * once it takes over (off a board). Returns `sync`, for the router to call on every route.
 */
export function watchUpdates(w: Watch): () => void {
  let waiting: WorkerLike | null = null;
  // Whether a version was in charge already: the first one taking over a first visit's
  // page is the version the page is, so nothing reloads.
  let controlled = Boolean(w.container.controller);
  let takenOver = false;
  let reloaded = false;

  const sync = () => {
    const atBoard = isBoardRoute(w.hash());
    if (takenOver) {
      w.view.hide();
      if (!atBoard && !reloaded) {
        reloaded = true;
        w.reload();
      }
      return;
    }
    if (waiting && !atBoard) w.view.show(() => waiting?.postMessage(SKIP_WAITING));
    else w.view.hide();
  };
  /** A new version installed and waiting (unless it's the first, which never waits). */
  const ready = (worker: WorkerLike) => {
    if (!w.container.controller) return;
    waiting = worker;
    sync();
  };

  if (w.registration.waiting) ready(w.registration.waiting);
  w.registration.addEventListener('updatefound', () => {
    const next = w.registration.installing;
    next?.addEventListener('statechange', () => {
      if (next.state === 'installed') ready(next);
    });
  });
  w.container.addEventListener('controllerchange', () => {
    if (controlled) takenOver = true;
    controlled = true;
    sync();
  });
  return sync;
}

/** The bar along the bottom of the screen. */
export function updateBar(): UpdateView {
  let bar: HTMLElement | null = null;
  return {
    show(reload) {
      if (bar) return;
      const button = el('button', { className: 'button primary', textContent: 'Reload' });
      button.addEventListener('click', () => {
        button.disabled = true;
        reload();
      });
      bar = el('div', { className: 'update-bar', role: 'status' }, [
        el('span', { textContent: 'A new version is ready' }),
        button,
      ]);
      document.body.append(bar);
    },
    hide() {
      bar?.remove();
      bar = null;
    },
  };
}

/**
 * Registers the worker after the page has loaded (so it doesn't compete with the first
 * download), where there is one: builds only, in browsers with service workers.
 */
export function registerWorker(enabled: boolean): void {
  if (!enabled || !('serviceWorker' in navigator)) return;
  const start = () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        const sync = watchUpdates({
          container: navigator.serviceWorker,
          registration,
          hash: () => location.hash,
          view: updateBar(),
          reload: () => location.reload(),
        });
        window.addEventListener('hashchange', sync);
        // An installed game can stay open for days: look for a new version on coming back.
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) registration.update().catch(() => {});
        });
      })
      .catch(() => {});
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
