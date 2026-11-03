import {
  advance,
  choose,
  currentStep,
  startDialogue,
  type DialogueState,
  type Flags,
} from '../../game/dialogue';
import type { Scene } from '../../puzzles/scenes';
import { el } from '../dom';
import { playSound } from '../sound';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CHARS_PER_SECOND = 45;

export interface DialogueView {
  root: HTMLElement;
  /** Removes global listeners. */
  destroy(): void;
}

/**
 * Plays a scene (#22): a portrait for whoever's speaking, a text box that
 * types each line out, and choice buttons. Tap, Enter, or Space finishes the
 * line or moves on; number keys pick choices. Calls `onEnd` with the scene's
 * final flags when it ends or is skipped.
 */
export function createDialogue(
  scene: Scene,
  flags: Flags,
  onEnd: (flags: Flags) => void,
): DialogueView {
  let state: DialogueState = startDialogue(scene, flags);
  let typing: number | undefined;
  let fullText = '';
  let ended = false;

  const portrait = el('div', { className: 'portrait', ariaHidden: 'true' });
  const speaker = el('p', { className: 'speaker' });
  const text = el('p', { className: 'line-text' });
  const more = el('span', { className: 'more', ariaHidden: 'true', textContent: '▼' });
  const live = el('div', { className: 'sr-only', ariaLive: 'polite' });
  const box = el('div', { className: 'text-box' }, [speaker, text, more]);
  const choices = el('div', { className: 'choices', role: 'group', ariaLabel: 'Choices' });
  const skip = el('button', { className: 'button ghost skip', textContent: 'Skip ⏭' });
  const stage = el('div', { className: 'stage' }, [portrait]);
  const root = el('section', { className: 'dialogue', ariaLabel: 'Scene' }, [
    skip,
    stage,
    box,
    choices,
    live,
  ]);

  const finish = () => {
    if (ended) return;
    ended = true;
    window.clearInterval(typing);
    onEnd(state.flags);
  };

  const finishTyping = () => {
    window.clearInterval(typing);
    typing = undefined;
    text.textContent = fullText;
    box.classList.add('ready');
  };

  const typeOut = (line: string) => {
    fullText = line;
    box.classList.remove('ready');
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = `${speaker.textContent || ''} ${line}`));
    if (reducedMotion()) return finishTyping();
    let shown = 0;
    text.textContent = '';
    typing = window.setInterval(() => {
      shown += 1;
      text.textContent = line.slice(0, shown);
      if (shown >= line.length) finishTyping();
    }, 1000 / CHARS_PER_SECOND);
  };

  const render = () => {
    const step = currentStep(scene, state);
    if (step.kind === 'end') return finish();
    if (step.kind === 'line') {
      choices.replaceChildren();
      root.classList.toggle('narration', !step.speaker);
      portrait.textContent = step.speaker?.portrait ?? '';
      portrait.dataset.who = step.speaker?.id ?? '';
      speaker.textContent = step.speaker?.name ?? '';
      playSound('blip');
      typeOut(step.text);
      return;
    }
    box.classList.remove('ready');
    const buttons = step.choices.map((c, i) =>
      el('button', {
        className: 'choice',
        textContent: `${i + 1}. ${c.text}`,
        onclick: () => pick(c.index),
      }),
    );
    choices.replaceChildren(...buttons);
    buttons[0]?.focus();
  };

  const next = () => {
    if (ended) return;
    if (typing !== undefined) return finishTyping();
    if (currentStep(scene, state).kind !== 'line') return;
    state = advance(scene, state);
    render();
  };

  const pick = (index: number) => {
    state = choose(scene, state, index);
    render();
  };

  stage.addEventListener('click', next);
  box.addEventListener('click', next);
  skip.onclick = finish;

  const onKey = (e: KeyboardEvent) => {
    if (ended || e.ctrlKey || e.metaKey || e.altKey) return;
    const step = currentStep(scene, state);
    if ((e.key === 'Enter' || e.key === ' ') && step.kind === 'line') {
      // Let a focused button (like Skip) handle its own Enter/Space.
      if (document.activeElement instanceof HTMLButtonElement) return;
      e.preventDefault();
      next();
    } else if (step.kind === 'choices' && /^[1-9]$/.test(e.key)) {
      const choice = step.choices[Number(e.key) - 1];
      if (choice) {
        e.preventDefault();
        pick(choice.index);
      }
    }
  };
  window.addEventListener('keydown', onKey);

  render();
  return {
    root,
    destroy() {
      window.clearInterval(typing);
      window.removeEventListener('keydown', onKey);
    },
  };
}
