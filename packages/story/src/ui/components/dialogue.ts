import {
  advance,
  choose,
  currentStep,
  emptyStage,
  speakOnStage,
  startDialogue,
  type DialogueState,
  type Flags,
} from '../../game/dialogue';
import { getBackdrop } from '../../puzzles/backdrops';
import type { Scene } from '../../puzzles/scenes';
import { portraitArt, preloadArt, withArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';
import { createBackdrop } from './backdrop';
import { reducedMotion } from '@picross/shared/ui/motion';
import { playSound } from '@picross/shared/ui/sound';

const CHARS_PER_SECOND = 45;

export interface DialogueView {
  root: HTMLElement;
  /** Removes global listeners. */
  destroy(): void;
}

/**
 * Plays a scene (#22): the place it happens, a portrait for everyone who's
 * spoken with the speaker up front, a text box that types each line out, and
 * choice buttons. Tap, Enter, or Space finishes the
 * line or moves on; number keys pick choices. Calls `onEnd` with the scene's
 * final flags when it ends or is skipped.
 */
export function createDialogue(
  scene: Scene,
  flags: Flags,
  onEnd: (flags: Flags) => void,
): DialogueView {
  let state: DialogueState = startDialogue(scene, flags);
  preloadArt(
    'cast',
    Object.values(scene.cast).map((member) => member.portrait),
  );
  let typing: number | undefined;
  let fullText = '';
  let ended = false;

  const backdrop = scene.backdrop ? getBackdrop(scene.backdrop) : undefined;
  const cast = el('div', { className: 'stage-cast', ariaHidden: 'true' });
  let onStage = emptyStage;
  const speaker = el('p', { className: 'speaker' });
  const text = el('p', { className: 'line-text' });
  const more = el('span', { className: 'more', ariaHidden: 'true', textContent: '▼' });
  const live = el('div', { className: 'sr-only', ariaLive: 'polite' });
  const box = el('div', { className: 'text-box' }, [speaker, text, more]);
  const choices = el('div', { className: 'choices', role: 'group', ariaLabel: 'Choices' });
  const skip = el('button', { className: 'button ghost skip', textContent: 'Skip ⏭' });
  const stage = el('div', { className: 'stage' }, [
    ...(backdrop ? [createBackdrop(backdrop)] : []),
    cast,
  ]);
  const root = el('section', { className: 'dialogue', ariaLabel: 'Scene' }, [
    skip,
    stage,
    box,
    choices,
    live,
  ]);

  root.classList.toggle('has-backdrop', Boolean(backdrop));

  /** Walks the speaker on if they're new, then puts them up front. Narration brings nobody up. */
  const updateStage = (speaker?: { id: string; portrait: string }) => {
    if (speaker) {
      const before = onStage.cast;
      onStage = speakOnStage(onStage, speaker.id);
      if (!before.includes(speaker.id)) {
        const portrait = el('div', { className: 'portrait' }, [portraitArt(speaker.portrait)]);
        portrait.dataset.who = speaker.id;
        const leaving = before.find((id) => !onStage.cast.includes(id));
        const seat = leaving && cast.querySelector(`[data-who="${leaving}"]`);
        if (seat) seat.replaceWith(portrait);
        else cast.append(portrait);
      }
    }
    for (const portrait of cast.children) {
      portrait.classList.toggle('listening', (portrait as HTMLElement).dataset.who !== speaker?.id);
    }
  };

  const finish = () => {
    if (ended) return;
    ended = true;
    window.clearInterval(typing);
    onEnd(state.flags);
  };

  const finishTyping = () => {
    window.clearInterval(typing);
    typing = undefined;
    text.replaceChildren(...withArt(fullText));
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
      text.replaceChildren(...withArt(line.slice(0, shown)));
      if (shown >= line.length) finishTyping();
    }, 1000 / CHARS_PER_SECOND);
  };

  const render = () => {
    const step = currentStep(scene, state);
    if (step.kind === 'end') return finish();
    if (step.kind === 'line') {
      choices.replaceChildren();
      root.classList.toggle('narration', !step.speaker);
      updateStage(step.speaker);
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
