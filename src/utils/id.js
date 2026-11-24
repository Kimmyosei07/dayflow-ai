/**
 * Generates a unique ID for records (tasks, courses, sessions...).
 * Uses crypto.randomUUID when available (all modern browsers and Node 19+),
 * with a timestamp + random fallback for older environments.
 */
export function createId(prefix = 'id') {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
