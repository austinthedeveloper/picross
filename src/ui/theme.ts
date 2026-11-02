import { getSettings } from '../game/settings';

export function applyTheme(): void {
  if (getSettings().highContrast) document.documentElement.dataset.contrast = 'high';
  else delete document.documentElement.dataset.contrast;
}
