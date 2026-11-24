/**
 * User preferences persistence.
 */
import { readJSON, writeJSON } from './storageService.js';
import { normalizeSettings } from './schema.js';

export const SETTINGS_KEY = 'settings';

export function loadSettings() {
  return normalizeSettings(readJSON(SETTINGS_KEY, {}));
}

export function saveSettings(settings) {
  return writeJSON(SETTINGS_KEY, normalizeSettings(settings));
}
