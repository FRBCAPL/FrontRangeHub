/**
 * Estate Vault release notes — open from EV Menu → What's new (no auto-popup).
 * Set ESTATEIT_WHATS_NEW_ENABLED true to show Menu entry + modal again.
 * Bump `id` when you rewrite items so stale cached labels are easy to spot in code review.
 *
 * roles: 'all' | 'admin' | 'heir' | 'helper' | 'auction'
 */
export const ESTATEIT_WHATS_NEW_ENABLED = false;

export const ESTATEIT_WHATS_NEW = {
  id: '2026-08-04-vault',
  title: "What's new in Estate Vault",
  dateLabel: 'August 2026',
  intro: 'Highlights of recent Estate Vault updates. Open anytime from EV Menu → What’s new.',
  items: [
    {
      roles: ['all'],
      text: 'Estate Vault branding — navy & gold vault mark on entry, sign-in, and in-app navigation.'
    },
    {
      roles: ['admin'],
      text: 'Billing per estate: your first estate includes a free trial; additional estates bill monthly after a short grace period. Subscribe / Manage subscription from Estate Settings or EV Menu.'
    },
    {
      roles: ['admin'],
      text: 'Admin home focuses on work: subscription status when needed, probate window, Needs attention, Inventory, and Money — plus What is / FAQ in the top bar.'
    },
    {
      roles: ['admin', 'heir'],
      text: 'Clearer money language — Cash available reconciliation hints and stronger export completeness warnings on Evidence Pack / Formal Accounting.'
    },
    {
      roles: ['heir', 'admin'],
      text: 'Heirs can message the Personal Representative; conversations stay with the estate records.'
    },
    {
      roles: ['heir'],
      text: 'Family portal: browse rooms, claim or pass on items, and follow Family Updates the PR publishes.'
    },
    {
      roles: ['helper'],
      text: 'Helpers add photos and draft items for PR review — room lists stay limited to the case you signed into.'
    },
    {
      roles: ['auction'],
      text: 'Public sale / auction stays tied to this estate case — lots and bids do not mix with other estates.'
    },
    {
      roles: ['all'],
      text: 'Each estate case stays separate — rooms, people, and items for one case do not mix with another.'
    }
  ]
};

const STORAGE_KEY = 'estateit-whats-new-seen';

export function getWhatsNewItemsForRole(role) {
  const r = String(role || 'all').toLowerCase();
  return (ESTATEIT_WHATS_NEW.items || []).filter((item) => {
    const roles = item.roles || ['all'];
    return roles.includes('all') || roles.includes(r);
  });
}

export function hasSeenWhatsNew(versionId = ESTATEIT_WHATS_NEW.id) {
  try {
    return localStorage.getItem(STORAGE_KEY) === String(versionId);
  } catch {
    return true;
  }
}

export function markWhatsNewSeen(versionId = ESTATEIT_WHATS_NEW.id) {
  try {
    localStorage.setItem(STORAGE_KEY, String(versionId));
  } catch {
    // ignore
  }
}
