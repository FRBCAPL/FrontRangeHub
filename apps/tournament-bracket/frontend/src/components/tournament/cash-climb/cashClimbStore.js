import { sanitizeCashClimb } from './cashClimbEngine.js';

const STORAGE_KEY = 'frontrange-open-cash-climb';

export function loadCashClimb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.id) return null;
    return sanitizeCashClimb(data);
  } catch {
    return null;
  }
}

export function saveCashClimb(tournament) {
  if (!tournament) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
}

export function clearCashClimb() {
  localStorage.removeItem(STORAGE_KEY);
}
