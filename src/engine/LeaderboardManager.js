const LEADERBOARD_KEY = 'prompt_override_leaderboard_v1';
const SETTINGS_KEY = 'prompt_override_settings_v1';
const MAX_ENTRIES = 50;

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/storage errors; game continues without persistence.
  }
};

export const loadLeaderboard = () => {
  const rows = readJson(LEADERBOARD_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row.score === 'number')
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
};

export const saveLeaderboardEntry = (entry) => {
  const existing = loadLeaderboard();
  const next = [...existing, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  writeJson(LEADERBOARD_KEY, next);
  return next;
};

export const loadSettings = (defaults) => {
  const value = readJson(SETTINGS_KEY, defaults);
  return { ...defaults, ...value };
};

export const saveSettings = (settings) => {
  writeJson(SETTINGS_KEY, settings);
};
