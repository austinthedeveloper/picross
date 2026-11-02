import { getSettings, updateSettings } from '../game/settings';
import { el } from './dom';

/** A sound on/off toggle that remembers its setting. */
export function createMuteButton(compact = false): HTMLButtonElement {
  const button = el('button', { className: 'mute' });
  const render = () => {
    const { muted } = getSettings();
    const icon = muted ? '🔇' : '🔊';
    button.textContent = compact ? icon : `${icon} Sound ${muted ? 'off' : 'on'}`;
    button.ariaLabel = compact ? 'Sound' : null;
    button.title = muted ? 'Sound off' : 'Sound on';
    button.setAttribute('aria-pressed', String(!muted));
  };
  button.onclick = () => {
    updateSettings({ muted: !getSettings().muted });
    render();
  };
  render();
  return button;
}
