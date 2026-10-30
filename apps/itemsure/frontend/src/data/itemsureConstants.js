import { SITE } from './itemsureTerms.js';

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

export const ROLE_ORDER = ['owner', 'administrator', 'manager', 'staff'];

/** One line per role, shown next to the role picker. Keep in step with role_permissions. */
export const ROLE_HELP = {
  owner: 'Everything, including archiving the business and managing other owners.',
  administrator: 'Everything else: people, sites, items, stock, and settings.',
  manager: 'By default: runs sites, items, warning levels, suppliers, and stock, and approves counts.',
  staff: 'By default: sees items and stock, and counts, but cannot send counts in or approve them.',
};

export const AUDIT_ENTITY_LABELS = {
  organizations: 'Business',
  organization_memberships: 'Team member',
  locations: SITE,
  location_access: `${SITE} access`,
  inventory_categories: 'Category',
  inventory_items: 'Item',
  inventory_storage_areas: 'Spot',
  profiles: 'Profile',
  count_sessions: 'Count',
  inventory: 'Stock',
  inventory_targets: 'Warning levels',
  planned_transfers: 'Planned move',
  item_places: 'Item spot',
  item_extra_categories: 'Extra category',
  item_unit_relationships: 'Pack size',
  suppliers: 'Supplier',
  invitations: 'Invite',
  organization_role_permissions: 'Role setting',
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
  transferred: 'moved',
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
