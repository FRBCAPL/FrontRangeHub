/**
 * PR admin home inline page tour — bump PR_COACH_VERSION to re-show for everyone.
 */

export const PR_COACH_VERSION = '2026-08-06-admin-home-v1';

export const PR_COACH_STEPS = [
  {
    targetId: 'ei-pr-coach-status',
    kicker: 'Welcome',
    title: 'Your estate command center',
    body:
      'This is the Personal Representative home for this estate.\nStatus, deadlines, and progress live up here — start here whenever you open the case.'
  },
  {
    targetId: 'ei-pr-coach-next',
    kicker: "What's next",
    title: 'Suggested first moves',
    body:
      'Tap What’s next for a short checklist that shrinks as you finish each step — Letters date, first room, family invites, and more.'
  },
  {
    targetId: 'ei-pr-coach-attention',
    kicker: 'Needs attention',
    title: 'Things waiting on you',
    body:
      'Pending helper items, heir requests, and other follow-ups show here.\nWhen the list is clear, you’re caught up for now.'
  },
  {
    targetId: 'ei-pr-coach-inventory',
    kicker: 'Action center',
    title: 'Your admin shortcuts',
    body:
      'Add items, create rooms, capture scene photos, log locksmith entry, and open contacts from here.\nHelpers can submit too — you approve in Pending review.'
  },
  {
    targetId: 'ei-pr-coach-money',
    kicker: 'Estate Finances',
    title: 'Keep the ledger current',
    body:
      'Accounts, expenses, PR loans, and distributions live under Estate Finances.\nOpen the ledger anytime to record cash in and out.'
  },
  {
    targetId: 'ei-pr-coach-settings',
    kicker: 'Settings',
    title: 'Case, family, and helpers',
    body:
      'Settings holds probate dates, family PINs, helpers, contacts, billing, and records.\nMost setup work starts here.'
  },
  {
    targetId: 'ei-pr-coach-menu',
    kicker: 'EV Menu',
    title: 'Help, reports, and exit',
    body:
      'Open EV Menu for Admin help guide, FAQ, What is Estate Vault?, reports, lock admin, and leave/sign out.\nReplay this tour anytime with Tour this page.'
  }
];

function storageKey(caseNumber) {
  const casePart = String(caseNumber || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  return `estateVault:prCoach:${PR_COACH_VERSION}:${casePart}`;
}

export function hasSeenPrCoach(caseNumber) {
  try {
    return localStorage.getItem(storageKey(caseNumber)) === '1';
  } catch {
    return true;
  }
}

export function markPrCoachSeen(caseNumber) {
  try {
    localStorage.setItem(storageKey(caseNumber), '1');
  } catch {
    // ignore
  }
}

/** After create — force tour even if an older version was dismissed on another case. */
export function requestPrCoachOnEnter(caseNumber) {
  try {
    const casePart = String(caseNumber || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    if (!casePart) return;
    sessionStorage.setItem(`estateVault:prCoachPending:${casePart}`, '1');
  } catch {
    // ignore
  }
}

export function consumePrCoachPending(caseNumber) {
  try {
    const casePart = String(caseNumber || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    const key = `estateVault:prCoachPending:${casePart}`;
    const pending = sessionStorage.getItem(key) === '1';
    if (pending) sessionStorage.removeItem(key);
    return pending;
  } catch {
    return false;
  }
}
