/**
 * Data versioning.
 *
 * When the stored structure changes, increase SCHEMA_VERSION in schema.js
 * and add a migration here keyed by the version it upgrades FROM. Each
 * migration receives the whole data object and returns the upgraded one.
 *
 * Example for a future version 2:
 *   1: (data) => ({
 *     ...data,
 *     tasks: data.tasks.map((t) => ({ ...t, tags: t.tags ?? [] })),
 *   }),
 */
import { SCHEMA_VERSION } from './schema.js';

export const MIGRATIONS = {
  // No migrations yet — version 1 is the first release.
};

/**
 * Upgrades `data` from `fromVersion` to `targetVersion` step by step.
 * Throws if the data was created by a newer version of the app.
 */
export function migrateData(data, fromVersion, { migrations = MIGRATIONS, targetVersion = SCHEMA_VERSION } = {}) {
  const version = Number(fromVersion) || 1;
  if (version > targetVersion) {
    throw new Error(`This data was created by a newer version of DAYFLOW (v${version}). Please update the app.`);
  }
  let result = data;
  for (let v = version; v < targetVersion; v += 1) {
    const step = migrations[v];
    if (typeof step === 'function') result = step(result);
  }
  return result;
}
