/**
 * Saved daily plans from the AI Planner (one per date).
 */
import { readJSON, writeJSON } from './storageService.js';
import { normalizePlan, normalizeList } from './schema.js';

export const PLANS_KEY = 'plans';

export function loadPlans() {
  return normalizeList(readJSON(PLANS_KEY, []), normalizePlan);
}

export function savePlans(list) {
  return writeJSON(PLANS_KEY, list);
}
