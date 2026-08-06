/**
 * Family portal inline page tour — bump FAMILY_COACH_VERSION to re-show for everyone.
 */
import {
  heirCanBrowseRooms,
  isMemorandumOnlyHeir,
  normalizeHeirAccessTier,
  HEIR_ACCESS_TIER
} from './estateInventoryConstants.js';

export const FAMILY_COACH_VERSION = '2026-08-05-role-tour-v2';

/**
 * Build tour steps from role + which menu tiles are visible.
 * Order matches the family portal button grid.
 */
export function buildFamilyCoachSteps({
  accessTier,
  canBrowseRooms = false,
  showRooms = false,
  showRequests = false
} = {}) {
  const tier = normalizeHeirAccessTier(accessTier);
  const memo = isMemorandumOnlyHeir(tier);
  const both = tier === HEIR_ACCESS_TIER.both;
  const canBrowse = heirCanBrowseRooms({
    access_tier: tier,
    can_browse_rooms: canBrowseRooms
  });

  const roleTitle = memo
    ? 'Specific Gift Recipient'
    : both
      ? 'Heir + Specific Gift Recipient'
      : 'Heir / Residual Beneficiary';

  const steps = [
    {
      targetId: 'ei-family-coach-welcome',
      kicker: 'Hello',
      helloName: true,
      title: 'A short tour of your family portal',
      body: `Your role here is ${roleTitle}.\nWe’ll walk through each button available to you and what you can do.`
    },
    {
      targetId: 'ei-family-coach-welcome',
      kicker: 'Your role',
      title: 'Tap your role badge anytime',
      body: memo
        ? canBrowse
          ? 'Your access centers on gifts named for you, with room browsing to review collections.\nTap the badge anytime for a fuller explanation of your role.'
          : 'Your access centers on gifts named for you.\nTap the badge anytime for a fuller explanation of your role.'
        : both
          ? 'You have named gifts and also share in what remains.\nYou can browse rooms, request items, cancel your own requests, and release items you do not want.'
          : 'You share in what remains after debts, expenses, and specific gifts.\nYou can browse rooms, request items, cancel your own requests, and release items you do not want.'
    }
  ];

  steps.push({
    targetId: 'ei-family-coach-messages',
    kicker: 'Messages',
    title: 'Message the Personal Representative',
    body:
      'Open a private, saved conversation with the Personal Representative.\nAsk questions and keep the thread in the estate record.'
  });

  steps.push({
    targetId: 'ei-family-coach-inheritance',
    kicker: 'Inheritance',
    title: 'My inheritance',
    body: memo
      ? 'See cash or property already recorded for you, plus receipts.\nAcknowledge receipt here when you are ready to confirm.'
      : 'See distributions recorded for you — cash, property, receipts, and acknowledgements.\nConfirm receipt here when you are ready so it is dated in the estate record.'
  });

  if (showRequests) {
    steps.push({
      targetId: 'ei-family-coach-requests',
      kicker: 'Requests',
      title: 'My requests',
      body:
        'Review items you have already requested and the reason you gave.\nCancel a request from here if you change your mind while it is still open.'
    });
  }

  steps.push({
    targetId: 'ei-family-coach-updates',
    kicker: 'Updates',
    title: 'Family updates',
    body:
      'Numbered reports the Personal Representative publishes for the family.\nOpen them here when new updates appear — unread counts show on the button.'
  });

  steps.push({
    targetId: 'ei-family-coach-overview',
    kicker: 'Overview',
    title: memo ? 'Estate status' : 'Estate overview',
    body: memo
      ? 'A clear look at how inventory and gift status are progressing for your role.\nOpen it when you want the bigger picture in plain terms.'
      : 'Numbers and status shared with family — inventory, cash picture, and sale progress when available.\nOpen it anytime for the estate snapshot your access includes.'
  });

  if (showRooms) {
    steps.push({
      targetId: 'ei-family-coach-rooms',
      kicker: 'Rooms',
      title: canBrowse && !memo ? 'Rooms & inventory' : 'My gifts & rooms',
      body: memo
        ? canBrowse
          ? 'Open rooms to browse collections and review items, especially gifts named for you.\nTake your time room by room.'
          : 'Open rooms that contain gifts or items listed for you and review them here.'
        : 'Open the room list, then open a room to see items.\nRequest what you want, and when finished with a room use “No interest in remaining items in this room.”'
    });
  }

  steps.push({
    targetId: 'ei-family-coach-timeline',
    kicker: 'Timeline',
    title: 'Disclosure timeline',
    body:
      'Milestones for this estate — such as inventory progress and distributions — as things move forward.\nTap a milestone for a plain-language explanation.'
  });

  steps.push({
    targetId: 'ei-family-coach-auction',
    kicker: 'Sale',
    title: 'Sale & auction',
    body: memo
      ? 'Follow public sale / auction lots when items are approved for sale.\nUse this when you want to watch public listings.'
      : 'Follow items headed to public sale or auction once they are approved.\nA good next step after you finish requesting or releasing rooms you care about.'
  });

  steps.push({
    targetId: 'ei-family-coach-help',
    kicker: 'Help',
    title: 'Help / FAQ',
    body:
      'Common questions about this portal and how Estate Vault works for family.\nReplay this tour anytime with “Show me around.”'
  });

  return steps;
}

/** @deprecated Prefer buildFamilyCoachSteps — kept so old imports do not crash. */
export const FAMILY_COACH_STEPS = buildFamilyCoachSteps({
  accessTier: 'residual',
  canBrowseRooms: true,
  showRooms: true,
  showRequests: true
});

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
