/**
 * Family portal inline page tour — bump FAMILY_COACH_VERSION to re-show for everyone.
 */
export const FAMILY_COACH_VERSION = '2026-08-03c';

export const FAMILY_COACH_STEPS = [
  {
    targetId: 'ei-family-coach-welcome',
    kicker: 'Hello',
    helloName: true,
    title: 'A small tour to start',
    body: 'This page is made for family. \n A calm place to see how the estate affects you. \nWe’ll walk you through a few short steps.'
  },
  {
    targetId: 'ei-family-coach-welcome',
    kicker: 'What this is?',
    title: 'A private workspace for this estate',
    body: 'Think of Estate Vault as a private record keeper. \nA secure place to keep property, money moves, \nmessages, and decisions organized in one record. \nInstead of scattered texts, spreadsheets, and notebooks. \nIt is not court e-filing or legal advice. \nFor a fuller overview anytime,\nopen Menu → What is Estate Vault.'
  },
  {
    targetId: 'ei-family-coach-you',
    kicker: 'Step 1',
    title: 'Begin with what’s yours',
    body: 'Your inheritance, family updates, messages, and requests are gathered here first so you don’t have to hunt for them.'
  },
  {
    targetId: 'ei-family-coach-overview',
    kicker: 'Step 2',
    title: 'See the bigger picture',
    body: 'When you’re ready, \nopen Estate overview for the numbers and milestones.'
  },
  {
    targetId: 'ei-family-coach-property',
    kicker: 'Step 3',
    title: 'Estate inventory',
    body:
      'Browse rooms and items at your own pace. \n(if available)\nYour role determines your access.'
  }
];

function storageKey(caseNumber, siblingKey) {
  const casePart = String(caseNumber || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  const heirPart = String(siblingKey || 'heir').trim() || 'heir';
  return `estateVault:familyCoach:${FAMILY_COACH_VERSION}:${casePart}:${heirPart}`;
}

export function hasSeenFamilyCoach(caseNumber, siblingKey) {
  try {
    return localStorage.getItem(storageKey(caseNumber, siblingKey)) === '1';
  } catch {
    return true;
  }
}

export function markFamilyCoachSeen(caseNumber, siblingKey) {
  try {
    localStorage.setItem(storageKey(caseNumber, siblingKey), '1');
  } catch {
    // ignore
  }
}
