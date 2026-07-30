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
    term: 'Memorandum',
    short: 'A separate list naming who should receive specific personal items.',
    full: 'A personal property memorandum is a document (referenced by many wills) that lists specific tangible items and who should get them \u2014 for example \u201CMy watch to my son.\u201D Items \u201Cclaimed via memorandum\u201D are set aside for the named person rather than sold or split.'
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
  }
};

/** Look up a glossary entry by key. Returns null when unknown. */
export function getGlossaryEntry(key) {
  if (!key) return null;
  return ESTATE_GLOSSARY[key] || null;
}
