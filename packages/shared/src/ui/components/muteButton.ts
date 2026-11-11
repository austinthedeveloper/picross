import { getPrefs, updatePrefs } from '../../game/prefs';
import { el } from '../dom';

/** A sound on/off toggle that remembers its setting. `compact` shows just the icon. */
export function createMuteButton(compact = false): HTMLButtonElement {
  const button = el('button', { className: compact ? 'mute' : 'mute toggle' });
  const render = () => {
    const { muted } = getPrefs();
    const icon = muted ? '🔇' : '🔊';
    button.textContent = compact ? icon : `${icon} Sound ${muted ? 'off' : 'on'}`;
    button.ariaLabel = compact ? 'Sound' : null;
    button.title = muted ? 'Sound off' : 'Sound on';
    button.setAttribute('aria-pressed', String(!muted));
  };
  button.onclick = () => {
    updatePrefs({ muted: !getPrefs().muted });
    render();
  };
  render();
  return button;
}
