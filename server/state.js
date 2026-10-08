/**
 * Small on-disk store (server/data/state.json, this user only) so the backend keeps the
 * user's settings, profile and schedule across restarts. Scheduled runs and alerts
 * need them when nobody has the dashboard open.
 */
import fs from 'fs';
import path from 'path';

const FILE = path.resolve('server/data/state.json');
let cached = null;

export function loadState() {
  if (cached) return cached;
  try { cached = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { cached = {}; }
  return cached;
}

/** Shallow-merges `patch` into the stored state and writes it out. */
export function saveState(patch) {
  cached = { ...loadState(), ...patch };
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cached, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, FILE);
  } catch (err) {
    console.warn('[state] could not save:', err.message);
  }
  return cached;
}
