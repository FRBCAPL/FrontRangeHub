/**
 * PR preference: locksmith / first-entry documentation not needed (for now).
 * Local to this device/browser; can still open Locksmith entry anytime from Action center.
 */

function storageKey(caseNumber) {
  const casePart = String(caseNumber || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  return `estateVault:locksmithNotNeeded:${casePart}`;
}

export function isLocksmithMarkedNotNeeded(caseNumber) {
  try {
    return localStorage.getItem(storageKey(caseNumber)) === '1';
  } catch {
    return false;
  }
}

export function markLocksmithNotNeeded(caseNumber) {
  try {
    localStorage.setItem(storageKey(caseNumber), '1');
  } catch {
    // ignore
  }
}

export function clearLocksmithNotNeeded(caseNumber) {
  try {
    localStorage.removeItem(storageKey(caseNumber));
  } catch {
    // ignore
  }
}
