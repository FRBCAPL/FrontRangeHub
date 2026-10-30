// "What each role can do" switches. Each turns a group of permissions on or off
// for Manager or Staff in one business. Only permissions the database lists in
// itemsure.adjustable_permission can appear here.

import { sites } from './itemsureTerms.js';

export const ADJUSTABLE_ROLES = ['manager', 'staff'];

export const ROLE_SWITCHES = [
  {
    key: 'submit',
    label: 'Send counts in for approval',
    permissions: ['counts.submit'],
  },
  {
    key: 'approve',
    label: 'Approve or reject counts, and set exact amounts',
    permissions: ['counts.approve', 'counts.reject'],
  },
  {
    key: 'stock',
    label: 'Add deliveries and take stock out',
    permissions: ['inventory.adjust'],
  },
  {
    key: 'move',
    label: 'Move stock between places',
    permissions: ['inventory.transfer'],
  },
  {
    key: 'items',
    label: 'Add and edit items, categories, and units',
    permissions: ['items.manage', 'categories.manage', 'units.manage'],
  },
  {
    key: 'levels',
    label: 'Set warning levels',
    permissions: ['inventory.targets.manage'],
  },
  {
    key: 'suppliers',
    label: 'Add and edit suppliers',
    permissions: ['suppliers.manage'],
  },
  {
    key: 'sites',
    label: `Add and edit ${sites} and spots`,
    permissions: ['locations.manage', 'storage.manage'],
  },
  {
    key: 'history',
    label: 'See History and stock history',
    permissions: ['audit.read', 'inventory.activity'],
  },
];
