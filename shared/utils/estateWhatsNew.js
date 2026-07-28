/**
 * EstateIt release notes — bump `id` whenever you ship a user-facing update.
 * Users see the modal once per browser until `id` changes.
 *
 * roles: 'all' | 'admin' | 'heir' | 'helper' | 'auction'
 */
export const ESTATEIT_WHATS_NEW = {
  id: '2026-07-28a',
  title: "What's new in EstateIt",
  dateLabel: 'July 28, 2026',
  intro: 'A short summary of recent updates while this estate is in use.',
  items: [
    {
      roles: ['all'],
      text: 'Each estate case stays separate — rooms, people, and items for one case do not mix with another.'
    },
    {
      roles: ['heir', 'admin'],
      text: 'Heirs can message the Personal Representative; conversations are kept with the estate records.'
    },
    {
      roles: ['heir'],
      text: 'Browse rooms with clear room buttons, and use in-app confirms for requests and “no interest.”'
    },
    {
      roles: ['helper'],
      text: 'Helper room lists only show rooms for the case you signed into.'
    },
    {
      roles: ['admin'],
      text: 'Locksmith / scene photos stay in admin Scene documentation (not heir or auction lists).'
    },
    {
      roles: ['auction'],
      text: 'Public auction stays tied to this estate case — bids and lots do not mix with other estates.'
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
