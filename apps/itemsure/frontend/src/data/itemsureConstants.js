export const ITEMSURE_PATH = '/itemsure';

/** Sent as sign-up metadata so database triggers know which app created the login. */
export const ITEMSURE_APP_CODE = 'itemsure';

export const ITEMSURE_TAGLINE = 'Know what you\u2019ve got.';

export const ROLE_LABELS = {
  owner: 'Owner',
  administrator: 'Administrator',
  manager: 'Manager',
  staff: 'Staff',
};

export const AUDIT_ENTITY_LABELS = {
  organizations: 'Organization',
  organization_memberships: 'Membership',
  locations: 'Location',
  location_access: 'Location access',
  inventory_categories: 'Category',
  inventory_items: 'Item',
  inventory_storage_areas: 'Storage area',
  profiles: 'Profile',
  count_sessions: 'Count',
  inventory: 'Stock',
  inventory_targets: 'Par levels',
  planned_transfers: 'Planned transfer',
  item_places: 'Item place',
  item_unit_relationships: 'Packaging size',
};

export const AUDIT_VERB_LABELS = {
  created: 'created',
  updated: 'updated',
  deleted: 'removed',
  started: 'started',
  submitted: 'submitted',
  cancelled: 'cancelled',
  renamed: 'renamed',
  approved: 'approved',
  rejected: 'rejected',
  added: 'added',
  removed: 'removed',
  transferred: 'transferred',
  copied: 'copied',
};

export const COUNT_STATUS_LABELS = {
  draft: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  cancelled: 'Cancelled',
};

/** Status shown for a submitted count, from its review. */
export const REVIEW_STATUS_LABELS = {
  awaiting: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const TIMEZONES = [
  'UTC',
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'America/Mexico_City',
  'America/Bogota',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Athens',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
];
