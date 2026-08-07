/**
 * Admin (Personal Representative) help guide — section browser + how-to.
 * Keep sections aligned with the real admin home, settings, and EV Menu.
 */

export const ESTATE_ADMIN_HELP_GUIDE = {
  title: 'Admin help guide',
  eyebrow: 'Personal Representative',
  intro:
    'Pick a section of the admin workspace to see what it is for and how to use it. This is a reference — not legal advice.',
  closeLabel: 'Got it',
  sections: [
    {
      id: 'home',
      label: 'Admin home',
      summary: 'Your command center for this estate.',
      howTo: [
        'Open an estate from My estates, then unlock with the case admin PIN.',
        'Status at the top shows probate window progress and inventory counts.',
        'Work down the page: Needs attention → What’s next → Inventory → Money.',
        'Use Show me around (or EV Menu → Tour this page) for a short spotlight tour.'
      ],
      tip: 'You do not need every document on day one. Start with case basics, then inventory and money as work unfolds.'
    },
    {
      id: 'next',
      label: "What's next",
      summary: 'A short checklist that shrinks as you finish setup steps.',
      howTo: [
        'Tap What’s next on the admin home.',
        'Work the active item first (often Letters date, first room, or family).',
        'Each action opens the right Settings section or tool.',
        'Come back anytime — the list updates from live estate data.'
      ],
      tip: 'Treat this as your getting-started coach after create, then as a shortcut list later.'
    },
    {
      id: 'attention',
      label: 'Needs attention',
      summary: 'Urgent follow-ups waiting on you.',
      howTo: [
        'Tap the Needs attention card when a count appears.',
        'Handle pending helper items, heir requests, messages, and similar follow-ups.',
        'Each row opens the matching panel or setting.',
        'When the list is clear, nothing urgent is waiting.'
      ],
      tip: 'Check this before leaving a work session so family and helpers are not blocked.'
    },
    {
      id: 'inventory',
      label: 'Inventory & rooms',
      summary: 'Photograph and organize personal property by room.',
      howTo: [
        'Create a room (collection), then Add item with photo, title, and room.',
        'Use See collections to open a room and edit items.',
        'Set legal status and value when you know them — helpers can capture first.',
        'Archive carefully; the record keeps an audit trail.'
      ],
      tip: 'Scene documentation is separate from heir-facing inventory — use it for as-found rooms, boxes, and bags.'
    },
    {
      id: 'scenes',
      label: 'Scene documentation',
      summary: 'As-found evidence of what you walked into.',
      howTo: [
        'Open Scene documentation from Inventory on the home page.',
        'Capture rooms, boxes, bags, or locksmith / first-entry photos.',
        'Scenes stay admin-facing evidence — not the same as listing items for heirs.',
        'Use Locksmith entry when you rekey or document first access.'
      ],
      tip: 'Good scene photos support later disputes and court-supporting exports.'
    },
    {
      id: 'pending',
      label: 'Pending review',
      summary: 'Approve or archive items helpers submitted.',
      howTo: [
        'Open Pending review from Needs attention or after helpers work.',
        'Check photo and description, then approve or archive with a reason.',
        'Finish legal status and value on approved items as needed.',
        'Helpers cannot finalize legal fields — that stays with you.'
      ],
      tip: 'Add helpers under Settings → Helpers with the exact login name and a unique PIN.'
    },
    {
      id: 'money',
      label: 'Money & ledger',
      summary: 'Accounts, expenses, PR loans, and distributions in one place.',
      howTo: [
        'Use the Money workbench on admin home, or open the Estate Ledger.',
        'List bank accounts and debts at today’s balances.',
        'Log expenses, money in/out, and Money I advanced (PR loans).',
        'When ready, record distributions to heirs and keep receipts / acknowledgements.'
      ],
      tip: 'This is a manual ledger, not a live bank feed. Update balances after real-world moves; do not double-count paid deposits.'
    },
    {
      id: 'family',
      label: 'Family / heirs',
      summary: 'Invite people who share in the estate or have named gifts.',
      howTo: [
        'Open Settings → Family / heirs.',
        'Add each person, choose access tier (residual, specific gift, or both), and set a PIN.',
        'Share the case number + PIN (or copy invite text from What’s next).',
        'Review heir requests and messages from Needs attention or the admin panels.'
      ],
      tip: 'Family access stays free with your PR subscription. Prefer display names they choose after first login.'
    },
    {
      id: 'messages',
      label: 'Messages & requests',
      summary: 'Private heir threads and item requests.',
      howTo: [
        'Open Messages to reply to heirs — threads stay with the estate record.',
        'Open Heir requests to approve, deny, or follow up on requested items.',
        'Heirs can cancel their own open requests; you decide final disposition.',
        'Publish Family Updates from Reports when something material changes.'
      ],
      tip: 'Staged Family Updates are clearer than constant live bank access for most families.'
    },
    {
      id: 'contacts',
      label: 'Contacts & advisors',
      summary: 'Directory for attorney, CPA, banks, utilities, and more.',
      howTo: [
        'Open Settings → Contacts (or Contacts from Inventory shortcuts).',
        'Add people and organizations you work with on this estate.',
        'For an advisor portal, generate an invite PIN and optionally assign Advisor for (heir).',
        'Advisors set a personal password after the first invite login.'
      ],
      tip: 'Advisor for (heir) means that contact advises that person — not that they are the same person.'
    },
    {
      id: 'settings-case',
      label: 'Case & probate settings',
      summary: 'Estate name, court case number, Letters date, and claims window.',
      howTo: [
        'Open Settings → Case settings.',
        'Enter or update the court case number when you have it (temp EV numbers have no court affiliation).',
        'Set Letters issued date to start the probate countdown on the dashboard.',
        'Confirm how long creditors have to make claims.'
      ],
      tip: 'You can create an estate with only a name; fill court details when counsel has them.'
    },
    {
      id: 'helpers',
      label: 'Helpers',
      summary: 'Inventory takers who photograph and describe for you.',
      howTo: [
        'Open Settings → Helpers.',
        'Add each helper with the name they will type at login and a unique PIN.',
        'They use the Helper portal — submissions wait in Pending review.',
        'Reset or disable access when someone is finished helping.'
      ],
      tip: 'Helpers should avoid value judgments in descriptions; you set value and legal status.'
    },
    {
      id: 'sale',
      label: 'Sale / auction',
      summary: 'Public sale window, lots, and pickup (optional).',
      howTo: [
        'Configure schedule and rules under Settings → Sale / Auction.',
        'Approve items carefully before they become public lots.',
        'The Personal Representative may not bid on the public sale.',
        'Reconcile sales back into Money / ledger when lots sell.'
      ],
      tip: 'Sale tools are optional — skip until inventory and family decisions are further along.'
    },
    {
      id: 'reports',
      label: 'Reports & exports',
      summary: 'Court-supporting packs, catalogs, Family Updates, and backups.',
      howTo: [
        'Open Reports from EV Menu (or shortcuts on home).',
        'Export evidence pack, formal accounting, inventory catalog, or JSON backup as needed.',
        'Publish numbered Family Updates when something material changes for heirs.',
        'Review completeness warnings before relying on an export.'
      ],
      tip: 'Exports support counsel and court work; Estate Vault is not e-filing.'
    },
    {
      id: 'billing',
      label: 'Billing',
      summary: 'Per-estate subscription for the Personal Representative workspace.',
      howTo: [
        'Open Settings → Billing (or Manage subscription in EV Menu when shown).',
        'Your first estate includes a free trial; additional estates bill after a short grace period.',
        'Subscribe or manage payment in Stripe when prompted.',
        'Heirs, helpers, and advisors do not pay separately.'
      ],
      tip: 'If an estate pauses for billing, renew from Billing to restore PR, family, helper, and sale access for that case.'
    },
    {
      id: 'records',
      label: 'Close & records',
      summary: 'Closing checklist and retention when work is finished.',
      howTo: [
        'Run the closing checklist when administration is largely done.',
        'Close for records only after exports and counsel review as needed.',
        'Closed estates are view/export-only until you reopen with a written reason.',
        'Use Settings → Records & retention for reopen and retention choices.'
      ],
      tip: 'Closing is an Estate Vault records state — it does not file with the court by itself.'
    },
    {
      id: 'security',
      label: 'PIN, lock & exit',
      summary: 'Keep this device and this case under your control.',
      howTo: [
        'Save the one-time admin PIN when you create an estate — it unlocks admin on this device.',
        'Change the admin PIN under Settings → Admin PIN when needed.',
        'Use Lock admin (EV Menu) to require the PIN again on this device.',
        'Leave estate clears this case session; Sign out of Estate Vault ends the full PR login.'
      ],
      tip: 'Google/email signs you into Estate Vault; the case PIN still unlocks each estate on a device.'
    }
  ]
};

export default ESTATE_ADMIN_HELP_GUIDE;
