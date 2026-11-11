import { getPrefs } from '../game/prefs';

export function applyTheme(): void {
  if (getPrefs().highContrast) document.documentElement.dataset.contrast = 'high';
  else delete document.documentElement.dataset.contrast;
}
