import { sanitizeBreakAndRun } from './breakAndRunEngine.js';

export const BREAK_AND_RUN_STORAGE_KEY = 'frontrange-break-and-run';

export function breakAndRunStorageKey() {
  return BREAK_AND_RUN_STORAGE_KEY;
}

export function loadBreakAndRun() {
  try {
    const raw = localStorage.getItem(BREAK_AND_RUN_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.id) return null;
    return sanitizeBreakAndRun(data);
  } catch {
    return null;
  }
}

export function saveBreakAndRun(tournament) {
  if (!tournament) {
    localStorage.removeItem(BREAK_AND_RUN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(BREAK_AND_RUN_STORAGE_KEY, JSON.stringify(tournament));
}

export function clearBreakAndRun() {
  localStorage.removeItem(BREAK_AND_RUN_STORAGE_KEY);
}
