/**
 * Roles / portals explainer — who uses which door in Estate Vault.
 */

import { saleAuctionCopy } from './estateSaleAuctionCopy.js';

export const ESTATE_ROLES_OVERVIEW = {
  title: 'Roles / portals',
  intro:
    'Estate Vault has different portals for different jobs. Each person uses the door that matches their role — access and permissions stay separate.',
  roles: [
    {
      eyebrow: 'Estate management',
      title: 'Executor / Personal Representative',
      body:
        'Runs the estate workspace: inventory review, money, distributions, family settings, sale inventory approval, and exportable records. Requires the admin PIN.'
    },
    {
      eyebrow: 'Family',
      title: 'Heirs (family portal)',
      body:
        'For named heirs and specific-gift recipients. Browse (when allowed), request or release items, message the PR, and follow estate status — not editing master inventory or finance ledgers.'
    },
    {
      eyebrow: 'Assistants',
      title: 'Helper / Inventory Taker',
      body:
        'Photo, title, description, and room only. Items wait in pending review until the Personal Representative finishes legal status and values. Each helper signs in with the name and PIN the PR set.'
    },
    {
      eyebrow: 'Professionals',
      title: 'Advisor (read-only)',
      body:
        'For an invited attorney, CPA, or other contact. First visit uses an invite PIN from Settings → Contacts, then they set a personal password. Later visits use that password. Read-only: Family Updates, estate overview, and formal accounting — no inventory edits or money changes. Optionally mark Advisor for (heir) when they represent one person.'
    },
    {
      eyebrow: 'Public & follow-along',
      title: saleAuctionCopy.roleTile,
      body:
        `${saleAuctionCopy.roleHint}. Family can follow along after signing into the estate; the listing follows the posted sale listing window. Live online bidding is not required. The Personal Representative does not bid on this estate’s sale catalog.`
    }
  ],
  notes:
    'Need a different portal? Leave this estate or use Change case from the menu, then enter with the PIN or password for that role. Menu → Your role explains the role you are in and what to do next.'
};
