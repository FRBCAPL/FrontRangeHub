import { isValidElim, withElimStatus } from './elimStatus.js';

const STORAGE_KEY = 'frontrange-tournament-bracket';

export function elimStorageKey() {
  return STORAGE_KEY;
}

export function loadElim() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!isValidElim(data)) return null;
    return withElimStatus(data);
  } catch {
    return null;
  }
}

export function saveElim(tournament) {
  if (!tournament) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
}

export function clearElim() {
  localStorage.removeItem(STORAGE_KEY);
}
