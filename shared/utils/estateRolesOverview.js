/**
 * Roles / portals explainer — who uses which door in Estate Vault.
 */

export const ESTATE_ROLES_OVERVIEW = {
  title: 'Roles / portals',
  intro:
    'Estate Vault has different portals for different jobs. Each person uses the door that matches their role — access and permissions stay separate.',
  roles: [
    {
      eyebrow: 'Estate management',
      title: 'Executor / Personal Representative',
      body:
        'Runs the estate workspace: inventory review, money, distributions, family settings, sale/auction approval, and exportable records. Requires the admin PIN.'
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
      eyebrow: 'Public & follow-along',
      title: 'Sale / Auction',
      body:
        'Lots approved for public sale appear here. Family can follow along after signing into the estate; public bidding follows the posted sale window. The Personal Representative does not bid on this estate’s public sale.'
    }
  ],
  notes:
    'Need a different portal? Leave this estate or use Change case from the menu, then enter with the PIN or password for that role. Menu → Your role explains the role you are in and what to do next.'
};
