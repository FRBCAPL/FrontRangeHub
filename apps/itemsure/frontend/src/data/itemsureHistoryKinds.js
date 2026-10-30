// Sections of the History page. Each kind covers the audit tables whose events it shows
// (an audit action is "<table>.<verb>"); anything not listed only appears under "Everything".

import { SITES } from './itemsureTerms.js';

export const HISTORY_KINDS = [
  { id: 'stock', title: 'Stock changes', blurb: 'Amounts set, added, used, and moved.', entities: ['inventory'] },
  { id: 'counts', title: 'Counts', blurb: 'Counts started, sent in, approved, or rejected.', entities: ['count_sessions'] },
  {
    id: 'items',
    title: 'Items',
    blurb: 'Items added or edited, where they are kept, pack sizes, and categories.',
    entities: ['inventory_items', 'item_places', 'item_unit_relationships', 'inventory_categories', 'item_extra_categories'],
  },
  {
    id: 'levels',
    title: 'Warning levels & planned moves',
    blurb: 'Warning levels changed or copied, and moves planned from the shopping list.',
    entities: ['inventory_targets', 'planned_transfers'],
  },
  { id: 'suppliers', title: 'Suppliers', blurb: 'Suppliers added, edited, or archived.', entities: ['suppliers'] },
  { id: 'places', title: `${SITES} & spots`, blurb: `${SITES} and spots added, edited, or archived.`, entities: ['locations', 'inventory_storage_areas'] },
  {
    id: 'team',
    title: 'Team & business',
    blurb: 'People, invites, their access, what roles can do, and business settings.',
    entities: ['organizations', 'organization_memberships', 'invitations', 'organization_role_permissions', 'location_access', 'profiles'],
  },
];

export const historyKind = (id) => HISTORY_KINDS.find((k) => k.id === id) || null;
