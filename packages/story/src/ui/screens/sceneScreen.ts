import type { Flags } from '../../game/dialogue';
import type { Scene } from '../../puzzles/scenes';
import { createDialogue } from '../components/dialogue';
import { el } from '@picross/shared/ui/dom';

/**
 * Plays a scene full screen. With no `onEnd`, this is the #/scene/<id>
 * preview: it shows a short end card with Replay. Returns a cleanup function.
 */
export function renderSceneScreen(
  app: HTMLElement,
  scene: Scene,
  options: { flags?: Flags; onEnd?: (flags: Flags) => void } = {},
): () => void {
  let view = play();

  function play() {
    const dialogue = createDialogue(scene, options.flags ?? {}, (flags) => {
      dialogue.destroy();
      if (options.onEnd) return options.onEnd(flags);
      app.replaceChildren(
        el('main', { className: 'screen scene-screen' }, [
          el('section', { className: 'run-card results' }, [
            el('h2', { textContent: 'Scene over' }),
            el('div', { className: 'end-actions' }, [
              el('a', { className: 'button ghost', href: '#/', textContent: 'Puzzles' }),
              el('button', {
                className: 'button primary',
                textContent: 'Replay',
                onclick: () => (view = play()),
              }),
            ]),
          ]),
        ]),
      );
    });
    app.replaceChildren(el('main', { className: 'screen scene-screen' }, [dialogue.root]));
    return dialogue;
  }

  return () => view.destroy();
}
