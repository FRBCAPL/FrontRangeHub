/**
 * Admin (Personal Representative) help guide — section browser + how-to.
 * Keep sections aligned with the real admin home, settings, and EV Menu.
 * Prefer exact button / menu labels from EstateHome, Settings hub, and EV Menu.
 */

export const ESTATE_ADMIN_HELP_GUIDE = {
  title: 'Admin help guide',
  eyebrow: 'Personal Representative',
  intro:
    'Pick a section for step-by-step how-tos using the real button and menu names. This is a workspace reference — not legal advice.',
  closeLabel: 'Got it',
  sections: [
    {
      id: 'home',
      label: 'Admin home',
      summary:
        'Your command center after you unlock this estate: status, follow-ups, shortcuts, and money.',
      howTo: [
        'From My estates, open the case, then unlock with the case admin PIN (Unlock admin). After create, save the one-time PIN when prompted — it is shown once.',
        'Top strip: Probate window (Letters / countdown), Progress (active milestone), and Inventory (rooms · items). Probate → Settings; Progress → Timeline; Inventory → Create room or Rooms.',
        'Work down the page: Needs attention (urgent inbox) → What’s next (planned checklist) → Action center (property shortcuts) → Estate Finances.',
        'Use Show me around on the status strip, or EV Menu → Tour this page, for a spotlight tour of these areas.',
        'Open Estate Settings from the nav or EV Menu for case, people, PINs, billing, and records. EV Menu also has Reports & exports, Lock admin, Leave estate, and Sign out of Estate Vault.'
      ],
      tip: 'You do not need every court detail on day one. Create with a name, unlock, document scenes, then fill Letters date, rooms, family, and money as work unfolds.'
    },
    {
      id: 'next',
      label: "What's next",
      summary:
        'A short, phase-aware checklist of the next setup moves — not every open task in the estate.',
      howTo: [
        'Tap What’s next on admin home. The modal has Do this now (active step) and Coming up (what follows).',
        'Early path is usually: Scene documentation → optional Locksmith / first entry → Set Letters date → probate/claims window → Create room → Add item.',
        'Later steps unlock in order: Manage helpers, Manage family, Copy invite text, Open ledger, Open distributions, Open Reports (Family Update), Open closing checklist.',
        'Each CTA opens the matching tool (scene panel, Settings section, create-room modal, ledger tab, etc.). Finish or skip optional items (e.g. locksmith → Not needed) to advance.',
        'The list rebuilds from live estate data — come back anytime; it will not keep nagging after inventory is certified complete or a step is done.'
      ],
      tip: 'Treat What’s next as your getting-started coach after create. Needs attention is the interrupt inbox for things waiting on you right now.'
    },
    {
      id: 'attention',
      label: 'Needs attention',
      summary:
        'Urgent follow-ups waiting on you — helper queue, heir requests, messages, and gated completeness gaps.',
      howTo: [
        'Tap Needs attention when a count badge appears. Clear state shows “Nothing urgent right now.”',
        'In the modal, use tabs Urgent and Follow up. Inbox rows open matching tools: Review queue (N) for Pending PR review, View requests (N) for Heir requests, View messages (N) for Messages.',
        'Completeness gaps (when shown) use action labels like Set Letters, Scene docs, Browse inventory, Update accounts, Attach receipts, Add photos, Distributions, Open Reports, or Inventory status.',
        'Handle interrupt items first so helpers and heirs are not blocked, then clear Follow up gaps when you have time.',
        'When the list is empty, nothing in this inbox is waiting — still check What’s next for planned setup steps.'
      ],
      tip: 'Glance here before ending a work session. Unread messages and pending helper items are easy to miss if you only use Action center.'
    },
    {
      id: 'inventory',
      label: 'Action center',
      summary:
        'Admin shortcuts for inventory work, scene evidence, locksmith entry, and contacts — beside Money on home.',
      howTo: [
        'Add item — guided flow: Photo → Details → Room → Status & value → Descendants’ interest → Heir / memorandum, then save. Prefer creating a room first if none exist.',
        'Create room opens Create collection (name the room or category). Inventory status card also offers Create room when empty, or Rooms when collections exist.',
        'See collections opens the rooms list; open a room to browse and edit items. Closed estates block add/create until you reopen under Records & retention.',
        'Scene documentation captures as-found rooms, boxes, and bags (admin evidence). Locksmith / first entry is optional for rekey or first-access photos — also available from What’s next (or mark Not needed).',
        'Contacts opens the estate directory (attorney, CPA, banks, utilities, auction house, etc.) — same place as Settings → Contacts.'
      ],
      tip: 'The top Inventory card is only a rooms/items snapshot. Action center is where you do the work. Scene docs are not the same as listing items for heirs.'
    },
    {
      id: 'scenes',
      label: 'Scene documentation',
      summary:
        'As-found photo evidence of what you walked into — separate from heir-facing inventory.',
      howTo: [
        'Open Scene documentation from Action center (or What’s next → Scene documentation / Needs attention → Scene docs when prompted).',
        'Use Add scene photo. Group captures by room or area so later review stays organized. Tap a scene to edit notes or archive.',
        'Use Locksmith / first entry (Action center or What’s next → Start locksmith entry) when you rekey, change locks, or document first access. If it does not apply, choose Not needed — you can still open Locksmith / first entry later.',
        'Keep scenes as admin evidence: overall condition of rooms, sealed boxes, bags, entry points. List individual assets for heirs with Add item instead.',
        'Scene photos feed court-supporting exports (e.g. Evidence pack) — capture early, before property is moved or cleaned out.'
      ],
      tip: 'Good scene photos support later disputes and counsel packs. They do not replace room collections or item records.'
    },
    {
      id: 'pending',
      label: 'Pending review',
      summary:
        'Approve or reject items helpers submitted — you finish legal status and value.',
      howTo: [
        'Open from Needs attention → Review queue (N), or go to Pending PR review after helpers have been working.',
        'Filter by Room or Search. Use Previous / Next to move through the queue one submission at a time.',
        'Check photo and description. Set the legal fields only you control (legal status, value tier, sale-related approvals), then Approve or Reject / Archive (include a reason when rejecting).',
        'Helpers cannot finalize legal status, value tier, or approve items for public sale — that stays with the Personal Representative.',
        'After approve, the item joins the normal collections. After reject/archive, the record keeps an audit trail; helpers can recapture if needed.'
      ],
      tip: 'Add helpers under Settings → Helpers with the exact login name they will type and a unique PIN. Remind them to describe facts, not guess values.'
    },
    {
      id: 'money',
      label: 'Estate Finances',
      summary:
        'Manual cash picture and estate ledger: accounts, bills, money in/out, PR advances, and distributions.',
      howTo: [
        'On home, Estate Finances shows a Money overview card. Empty estates start with Add accounts. With cash, shortcuts include Pay a bill, Money came in, Give to heirs, and See full overview (closed estates: View money records).',
        'See full overview opens Estate money. Primary tabs: Overview, Accounts, Pay a bill, Money in/out, Give to heirs. Secondary: Creditor claims, Money I advanced, Sale/auction sales, Inventory check.',
        'Under Accounts, list bank and cash accounts and mark Include in Cash on hand for balances that should drive the snapshot. Log debts and Property & other (not cash) so the picture stays honest.',
        'Pay a bill and Money came in record real-world moves. Money I advanced tracks PR loans to the estate. Give to heirs records distributions — keep receipts / acknowledgements with Distribution tools when you use them.',
        'Open How money works inside the ledger for definitions. This is not a live bank feed — update balances after statements or transfers so you do not double-count deposits or unpaid auction bids.'
      ],
      tip: 'Winning bids and sale activity are not cash until money is actually deposited. Reconcile Sale/auction sales back into the ledger when lots settle.'
    },
    {
      id: 'family',
      label: 'Family / heirs',
      summary:
        'Invite people who share in the estate or have named gifts, with per-person PINs and disclosure levels.',
      howTo: [
        'Open Estate Settings → Family / heirs (or What’s next → Manage family).',
        'Add each person with an admin label, choose an access tier, and save the auto-generated 6-digit PIN. Tiers: Heir / Residual Beneficiary, Specific Gift Recipient, or both.',
        'Set financial visibility per person: Minimal, Standard (recommended), or Full accounting. Specific-gift-only access is more limited (rooms/requests may stay off unless you enable them).',
        'Share case number + PIN (or What’s next → Copy invite text for SMS/email). Heirs sign in on the family portal, then choose their own display name after first login.',
        'Review open Heir requests and Messages from Needs attention. You can always re-show PINs under Settings → View passwords (requires current admin PIN) or issue New PIN.'
      ],
      tip: 'Family portal access stays free with your PR subscription. Prefer the display names heirs choose after login over temporary admin labels in day-to-day talk.'
    },
    {
      id: 'messages',
      label: 'Messages & requests',
      summary:
        'Private per-heir message threads and item request decisions kept with the estate record.',
      howTo: [
        'Needs attention → View messages opens Messages. Reply in the heir’s thread — conversations stay with this estate’s record, not a personal inbox elsewhere.',
        'Needs attention → View requests opens Heir requests. Open a request to review the item and set disposition (approve, deny, or follow up via item edit / legal status).',
        'Heirs can cancel their own open requests. Final disposition of property still sits with you as Personal Representative.',
        'For estate-wide material news (not a back-and-forth), publish a numbered Family Update from Reports & exports → Family Update instead of relying only on private threads.',
        'Clear unread counts from Needs attention so Follow up / Urgent stay trustworthy as your interrupt list.'
      ],
      tip: 'Staged Family Updates are clearer for most families than giving everyone live full-ledger access. Use messages for private questions; use updates for shared milestones.'
    },
    {
      id: 'contacts',
      label: 'Contacts & advisors',
      summary:
        'Directory for attorneys, CPA, banks, utilities, and optional advisor portal invites.',
      howTo: [
        'Open Settings → Contacts, or Action center → Contacts.',
        'Add people and organizations you work with on this estate (attorney, CPA, bank, utility, auction house, etc.) with phone, email, and notes as needed.',
        'For an advisor portal login, generate an invite PIN on the contact. Optionally set Advisor for (heir) when that advisor represents a specific family member’s interest.',
        'Share the invite; the advisor signs in with the case context and invite PIN, then sets a personal password after first login.',
        'Keep the directory current — reports and exports often list counsel and institutions from these contacts.'
      ],
      tip: 'Advisor for (heir) means that contact advises that person — it does not merge identities or give the advisor the heir’s PIN.'
    },
    {
      id: 'settings-case',
      label: 'Case & probate settings',
      summary:
        'Estate name, court case number, Letters date, claims/probate window, and family disclosure defaults.',
      howTo: [
        'Open Estate Settings → Case settings. Walk the steps: Estate → Clock → Family → Will notes (as shown).',
        'Set or update the estate display name. Enter the court case number when counsel has it. Until then, the temporary EV number is only a login ID — Temporary badge means no court affiliation.',
        'Set Letters issued date to start the Probate window countdown on the home status strip. Confirm probate length or end date and how long creditors have to make claims.',
        'Review family disclosure defaults (how much financial detail heirs see by default). You can still override per heir under Family / heirs.',
        'Save changes, then check the Probate window card on home — it should show days left / end date once Letters and window fields are complete.'
      ],
      tip: 'You can create an estate with only a name. Fill court case number and Letters when counsel has them; What’s next will keep offering Set Letters date until you do.'
    },
    {
      id: 'helpers',
      label: 'Helpers',
      summary:
        'Named inventory assistants who photograph and describe items for your Pending PR review queue.',
      howTo: [
        'Open Estate Settings → Helpers (or What’s next → Manage helpers once inventory work has started).',
        'Add each helper with the exact name they will type at Helper portal login and a unique PIN. Share case number + name + PIN.',
        'Helpers capture photos and descriptions into rooms. Their submissions wait in Pending PR review — they cannot set legal status, value tier, or approve for sale.',
        'You Approve or Reject / Archive each item in the review queue, then finish legal fields yourself.',
        'When someone is done helping, reset their PIN or disable access under Helpers. View passwords can re-show PINs if you still hold the admin PIN.'
      ],
      tip: 'Ask helpers to write factual descriptions (what it is, condition, where found) and avoid guessing dollar values or legal ownership.'
    },
    {
      id: 'sale',
      label: 'Sale / auction',
      summary:
        'Optional public sale window, lots, pickup, and PR bid blocking — skip until inventory and family decisions are further along.',
      howTo: [
        'Open Estate Settings → Sale / Auction to set schedule, pickup window, rules, and extra PR auction block emails (owner email is always blocked from bidding).',
        'Only approve items for sale after legal status and family decisions are clear. Public lots come from approved inventory — not from unreviewed helper drafts.',
        'Use EV Menu → Public auction (when relevant) to check the public-facing sale. Personal Representatives may not bid on the public sale.',
        'When lots sell, reconcile under Estate money → Sale/auction sales and deposit proceeds into Accounts / Money came in so Cash on hand stays accurate.',
        'Reports & exports → Sale/auction reconciliation builds a pack when you need a sale summary for counsel or records.'
      ],
      tip: 'Sale tools are optional. Many estates never open a public auction — distribute privately or sell outside the portal and still log money in the ledger.'
    },
    {
      id: 'reports',
      label: 'Reports & exports',
      summary:
        'Court-supporting packs, catalogs, Family Updates, share links, and JSON backup — not e-filing.',
      howTo: [
        'Open EV Menu → Reports & exports (also from What’s next / Needs attention when Open Reports appears).',
        'Choose a pack: Evidence pack (supporting), Formal accounting, Sale/auction reconciliation, Inventory reconciliation, Administration chronology, Gift & residual schedule, Decision / explanation notes, or Inventory catalog.',
        'Use Family Update to draft and publish a numbered update heirs can read in their portal. Use Share read-only for a limited share link when appropriate.',
        'Preview before export (PDF/HTML). Address completeness warnings — missing Letters, photos, accounts, or receipts — before relying on a pack with counsel.',
        'Download JSON (catalog backup) for an offline inventory backup. Exports support counsel and your records; Estate Vault does not file with the court.'
      ],
      tip: 'Publish Family Updates when something material changes for everyone. Use private Messages for one heir’s questions.'
    },
    {
      id: 'billing',
      label: 'Billing',
      summary:
        'Per-estate Personal Representative subscription — heirs, helpers, and advisors do not pay separately.',
      howTo: [
        'Open Estate Settings → Billing, or EV Menu → Manage subscription when that item is shown.',
        'Your first estate includes a free trial (about 14 days). Additional estates bill after a short grace period and do not get a second full trial.',
        'Subscribe or manage payment in Stripe when prompted (subscribe checkout or customer portal). Keep a card on file before trial/grace ends.',
        'If billing lapses, that estate pauses: PR admin, family portal, helpers, and sale access freeze until you renew from Billing.',
        'Heirs, helpers, and advisors never pay their own Estate Vault subscription for this case — access is covered by the PR estate plan.'
      ],
      tip: 'Billing is per estate. Closing for records does not cancel Stripe by itself — manage or cancel the subscription under Billing if you are done paying for that case.'
    },
    {
      id: 'records',
      label: 'Close & records',
      summary:
        'Closing checklist, close for records, reopen, and retention — Vault records state, not a court filing.',
      howTo: [
        'When inventory is certified and administration is largely done, What’s next may offer Open closing checklist (Estate closing wizard). Work through advisory checks and generate needed packs from there.',
        'Export Formal accounting, Evidence pack, Family Update, and JSON backup before you close if counsel still needs materials.',
        'Open Estate Settings → Records & retention. Enter a written reason, then Close estate for records. Closed estates become view/export-only — add item, create room, and most writes are blocked.',
        'To continue work later, use Reopen estate for work with a written reason. What’s next and Action center write tools return after reopen.',
        'Review retention notes on the same Records screen so you know what Estate Vault keeps after close.'
      ],
      tip: 'Closing here does not file anything with the court or automatically end your Stripe subscription. It freezes day-to-day admin edits for this case.'
    },
    {
      id: 'security',
      label: 'PIN, lock & exit',
      summary:
        'Case admin PIN, device unlock, leave estate, and full Estate Vault sign-out.',
      howTo: [
        'When you create an estate, copy and save the one-time admin PIN (Copy PIN → I saved the PIN — continue). You will be prompted to replace it with your own PIN — the original is not shown again.',
        'Change the unlock PIN anytime under Estate Settings → Admin PIN. Use View passwords (after entering the current admin PIN) to re-show admin, helper, and heir PINs stored for this case.',
        'EV Menu → Lock admin (require PIN again) clears unlock on this device so the next visit asks for the case admin PIN.',
        'Leave estate clears this case’s local session but keeps you signed into Estate Vault (you can open My estates or another case). Sign out of Estate Vault ends the full PR Auth session.',
        'Forgot PIN flows start from the unlock gate (EstateAdminGate) — follow on-screen reset; you can also return to My estates from that screen.'
      ],
      tip: 'Google or email signs you into Estate Vault. The case admin PIN still unlocks each estate on a device. Family and helper PINs are separate and never replace the admin PIN.'
    }
  ]
};

export default ESTATE_ADMIN_HELP_GUIDE;
