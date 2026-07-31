/**
 * Estate Vault — plain-language glossary.
 *
 * First-time executors rarely know probate vocabulary. These short, non-legal
 * definitions power the hover/tap help throughout the app. Keep them friendly
 * and jargon-free; this is reassurance, not legal advice.
 */

export const ESTATE_GLOSSARY = {
  personal_representative: {
    term: 'Personal Representative',
    short: 'The person the court puts in charge of the estate.',
    full: 'The Personal Representative (PR), sometimes called the executor or administrator, is the person legally responsible for gathering the estate\u2019s property, paying its debts, and distributing what\u2019s left. In this app, that\u2019s you.'
  },
  letters: {
    term: 'Letters',
    short: 'The court document proving you\u2019re allowed to act for the estate.',
    full: '\u201CLetters\u201D (Letters Testamentary or Letters of Administration) are issued by the court. They are your proof of authority \u2014 banks and others will ask to see them before releasing information or funds. The date they were issued often starts important deadlines.'
  },
  probate_window: {
    term: 'Probate window',
    short: 'The waiting period for creditors to make claims against the estate.',
    full: 'The probate (or claims) window is the period after Letters are issued during which creditors can file claims against the estate. It\u2019s often best not to distribute everything until this window closes, so you don\u2019t pay heirs before valid debts.'
  },
  memorandum: {
    term: 'Personal property memorandum',
    short: 'A separate list naming who should receive specific personal items.',
    full: 'A personal property memorandum is a document (referenced by many wills) that lists specific tangible items and who should get them \u2014 for example \u201CMy watch to my son.\u201D People who receive those items are Specific Gift Recipients in Estate Vault. Items marked \u201Cclaimed via memorandum\u201D are set aside for the named person rather than sold or split.'
  },
  residual_beneficiary: {
    term: 'Heir / Residual Beneficiary',
    short: 'Receives a share of what is left after debts, expenses, and specific gifts.',
    full: 'A residuary (or residual) beneficiary receives the residue of the estate \u2014 whatever remains after debts, taxes, expenses, and specific gifts are handled. In Estate Vault this person can browse the remaining inventory, request items, or release items for public sale.'
  },
  specific_gift_recipient: {
    term: 'Specific Gift Recipient',
    short: 'Receives items specifically listed by the deceased.',
    full: 'A Specific Gift Recipient is named in a personal property memorandum or similar list for particular items. In Estate Vault they see those gifts in a read-only view and do not request from the remaining estate inventory unless they are also set as Both.'
  },
  affidavit: {
    term: 'Affidavit',
    short: 'A written statement you swear is true.',
    full: 'An affidavit is a written statement made under oath (signed before a notary). Courts accept them as evidence, so records and acknowledgements captured here are designed to support one if needed.'
  },
  estate_balance: {
    term: 'Estate balance',
    short: 'What the estate holds minus what it owes.',
    full: 'The estate balance is everything the estate currently holds \u2014 account balances, cash, outstanding bids, and unsold property \u2014 minus what it owes: debts and money you advanced (PR loans). It is not a bank balance; it\u2019s the estate\u2019s overall net worth right now.'
  },
  pr_loan: {
    term: 'PR loan',
    short: 'Money you paid out of pocket that the estate should pay back.',
    full: 'A PR loan is money you (the Personal Representative) advanced personally for estate expenses \u2014 for example a locksmith or filing fee \u2014 before the estate had cash. Recording it here keeps a record so you can be reimbursed later.'
  },
  outstanding_bid: {
    term: 'Outstanding bid',
    short: 'A winning auction bid that hasn\u2019t been collected yet.',
    full: 'An outstanding bid is the highest bid on an item that has been won but not yet paid or collected. It counts toward what the estate is owed until you mark it paid.'
  },
  current_balances: {
    term: 'Current balances',
    short: 'Account balances are treated as today\u2019s truth.',
    full: 'With current-balances accounting, the balances you enter for accounts are the source of truth. Paid deposits and paid expenses are kept on record for the court, but are not added or subtracted again \u2014 that prevents the same dollar from being counted twice.'
  },
  distribution: {
    term: 'Distribution',
    short: 'Cash or property delivered from the estate to a recipient.',
    full: 'A distribution is what the Personal Representative actually delivers \u2014 cash shares and/or specific property \u2014 to heirs or Specific Gift Recipients. Estate Vault records each batch with receipts and acknowledgements. Cash distributions are activity records; after you pay, update the related account balances so the estate balance stays accurate.'
  },
  formal_accounting: {
    term: 'Formal accounting',
    short: 'A period summary of what came in, went out, and remains.',
    full: 'A formal accounting is the court-oriented story of the estate over a period: beginning assets, receipts, expenses, liabilities, distributions, and the ending balance. Estate Vault builds this from today’s account balances plus activity records. Beginning figures are reconstructed (not a separately entered opening book). Cash distributions and expenses are listed for the story and are not subtracted again from the live estate balance.'
  },
  family_financial_visibility: {
    term: 'Family financial visibility',
    short: 'How much estate money detail residual beneficiaries can see.',
    full: 'The Personal Representative chooses Minimal (own receipts only), Standard (category assets, debts, expenses, distributions, remaining balance), or Full (adds receipt links and auction lot detail). Specific Gift Recipients always stay on Minimal.'
  },
  family_update: {
    term: 'Family Update',
    short: 'A numbered beneficiary report the PR publishes for staged communication.',
    full: 'A Family Update is a printable beneficiary report: disclosure timeline, inventory dispositions, auction status, recorded distributions, and next steps. When the Personal Representative publishes one, heirs can open it in the family portal. It is staged transparency, not continuous live bank access and not the sealed court evidence pack.'
  },
  disclosure_timeline: {
    term: 'Disclosure timeline',
    short: 'What has been disclosed and what stage comes next.',
    full: 'The disclosure timeline shows estate milestones (Letters, inventory, auction, claims window, distributions, final accounting) so beneficiaries understand why final numbers may not appear yet. It supports staged transparency rather than continuous live financial access.'
  }
};

/** Look up a glossary entry by key. Returns null when unknown. */
export function getGlossaryEntry(key) {
  if (!key) return null;
  return ESTATE_GLOSSARY[key] || null;
}
