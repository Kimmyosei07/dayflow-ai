/**
 * Low-level storage service.
 *
 * All persistence in DAYFLOW goes through this file. Today it wraps
 * window.localStorage; to move to a cloud database later you would replace
 * the `backend` (or these functions) without touching React components.
 *
 * Every key is namespaced with "dayflow:" so we never clash with other apps
 * on the same domain.
 */

export const NAMESPACE = 'dayflow:';

/** In-memory fallback used in tests, private browsing edge-cases, or SSR. */
export function createMemoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

function detectBackend() {
  try {
    const ls = globalThis.localStorage;
    const probe = `${NAMESPACE}__probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return createMemoryBackend();
  }
}

let backend = detectBackend();
const listeners = new Set();
// Issues found before anyone subscribed (e.g. while loading at startup).
const pendingIssues = [];

/** Lets tests (or a future cloud adapter) swap the storage backend. */
export function setStorageBackend(next) {
  backend = next;
}

/** Subscribe to storage problems (e.g. corrupted JSON, quota exceeded). */
export function onStorageIssue(listener) {
  listeners.add(listener);
  pendingIssues.splice(0).forEach((issue) => listener(issue));
  return () => listeners.delete(listener);
}
const report = (issue) => {
  if (listeners.size === 0) pendingIssues.push(issue);
  else listeners.forEach((l) => l(issue));
};

/**
 * Reads and parses a JSON value. If the stored value is corrupted, the raw
 * text is backed up under "dayflow:corrupt:<key>" and the fallback is used,
 * so the app keeps working and the data is not silently destroyed.
 */
export function readJSON(key, fallback) {
  const fullKey = NAMESPACE + key;
  let raw;
  try {
    raw = backend.getItem(fullKey);
  } catch {
    return fallback;
  }
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      backend.setItem(`${NAMESPACE}corrupt:${key}`, raw);
    } catch {
      /* ignore — best effort backup */
    }
    report({ type: 'corrupt', key, message: `Saved ${key} data was unreadable and has been reset. A backup copy was kept.` });
    return fallback;
  }
}

/** Serialises and writes a value. Returns false if the write failed. */
export function writeJSON(key, value) {
  try {
    backend.setItem(NAMESPACE + key, JSON.stringify(value));
    return true;
  } catch (error) {
    report({
      type: 'write-failed',
      key,
      message:
        error?.name === 'QuotaExceededError'
          ? 'Browser storage is full. Export your data and clear old conversations to free space.'
          : `Could not save ${key}.`,
    });
    return false;
  }
}

export function removeKey(key) {
  try {
    backend.removeItem(NAMESPACE + key);
  } catch {
    /* ignore */
  }
}

/** Lists every DAYFLOW key with its size in bytes (UTF-16 = 2 bytes/char). */
export function getStorageUsage() {
  const items = [];
  try {
    for (let i = 0; i < backend.length; i += 1) {
      const fullKey = backend.key(i);
      if (!fullKey || !fullKey.startsWith(NAMESPACE)) continue;
      const value = backend.getItem(fullKey) ?? '';
      items.push({ key: fullKey.slice(NAMESPACE.length), bytes: (fullKey.length + value.length) * 2 });
    }
  } catch {
    /* ignore */
  }
  items.sort((a, b) => b.bytes - a.bytes);
  return { items, totalBytes: items.reduce((s, i) => s + i.bytes, 0) };
}

/** Removes every DAYFLOW key (used by "Reset application data"). */
export function clearAll() {
  const keys = [];
  for (let i = 0; i < backend.length; i += 1) {
    const k = backend.key(i);
    if (k && k.startsWith(NAMESPACE)) keys.push(k);
  }
  keys.forEach((k) => backend.removeItem(k));
}
