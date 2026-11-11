import { afterEach, describe, expect, it, vi } from 'vitest';
import { SKIP_WAITING, updateBar, watchUpdates, type UpdateView, type WorkerLike } from './updates';

class FakeWorker extends EventTarget implements WorkerLike {
  state = 'installing';
  postMessage = vi.fn();
  install() {
    this.state = 'installed';
    this.dispatchEvent(new Event('statechange'));
  }
}
class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
  /** A new version starts installing. */
  found(): FakeWorker {
    this.installing = new FakeWorker();
    this.dispatchEvent(new Event('updatefound'));
    return this.installing;
  }
}
class FakeContainer extends EventTarget {
  constructor(public controller: unknown) {
    super();
  }
  takeOver() {
    this.controller = {};
    this.dispatchEvent(new Event('controllerchange'));
  }
}

/** A page with the game open at `hash`, controlled by a worker unless `controlled` is false. */
function setup(hash = '#/', controlled = true) {
  const view = { shown: false, reload: () => {} };
  const fakeView: UpdateView = {
    show: (reload) => Object.assign(view, { shown: true, reload }),
    hide: () => (view.shown = false),
  };
  const page = {
    hash,
    view,
    registration: new FakeRegistration(),
    container: new FakeContainer(controlled ? {} : null),
    reload: vi.fn(),
    sync: () => {},
    go(next: string) {
      page.hash = next;
      page.sync();
    },
  };
  page.sync = watchUpdates({
    container: page.container,
    registration: page.registration,
    hash: () => page.hash,
    view: fakeView,
    reload: page.reload,
  });
  return page;
}

describe('watchUpdates', () => {
  it('shows the bar when a new version has installed, and Reload hands over to it', () => {
    const page = setup();
    const next = page.registration.found();
    expect(page.view.shown).toBe(false);
    next.install();
    expect(page.view.shown).toBe(true);
    page.view.reload();
    expect(next.postMessage).toHaveBeenCalledWith(SKIP_WAITING);
    expect(page.reload).not.toHaveBeenCalled();
    page.container.takeOver();
    expect(page.reload).toHaveBeenCalledTimes(1);
    expect(page.view.shown).toBe(false);
  });

  it('shows it for a version already waiting when the page opens', () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker();
    const shown = vi.fn();
    watchUpdates({
      container: new FakeContainer({}),
      registration,
      hash: () => '#/cubed',
      view: { show: shown, hide: () => {} },
      reload: () => {},
    });
    expect(shown).toHaveBeenCalled();
  });

  it('waits until the player leaves the board, and hides again on the next one', () => {
    const page = setup('#/run/play');
    page.registration.found().install();
    expect(page.view.shown).toBe(false);
    page.go('#/run');
    expect(page.view.shown).toBe(true);
    page.go('#/cubed/play/steps');
    expect(page.view.shown).toBe(false);
  });

  it("never reloads mid-fight when another tab hands over: it waits until they're off it", () => {
    const page = setup('#/cubed/story/play');
    page.registration.found().install();
    page.container.takeOver();
    expect(page.reload).not.toHaveBeenCalled();
    page.go('#/cubed/story/play');
    expect(page.reload).not.toHaveBeenCalled();
    page.go('#/cubed/story');
    expect(page.reload).toHaveBeenCalledTimes(1);
    page.go('#/');
    expect(page.reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing on a first visit: that worker is the version the page is', () => {
    const page = setup('#/', false);
    const first = page.registration.found();
    first.install();
    expect(page.view.shown).toBe(false);
    page.container.takeOver();
    expect(page.reload).not.toHaveBeenCalled();
    // A later version, in the same visit, is an update.
    page.registration.found().install();
    expect(page.view.shown).toBe(true);
  });
});

describe('updateBar', () => {
  afterEach(() => document.body.replaceChildren());

  it('says a new version is ready, once, and Reload runs once', () => {
    const bar = updateBar();
    const reload = vi.fn();
    bar.show(reload);
    bar.show(reload);
    const shown = document.querySelectorAll('.update-bar');
    expect(shown).toHaveLength(1);
    expect(shown[0].textContent).toContain('A new version is ready');
    const button = shown[0].querySelector('button')!;
    button.click();
    button.click();
    expect(reload).toHaveBeenCalledTimes(1);
    bar.hide();
    expect(document.querySelector('.update-bar')).toBeNull();
  });
});
