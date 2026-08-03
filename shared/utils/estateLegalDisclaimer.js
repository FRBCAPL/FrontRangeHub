/**
 * Legal disclaimer copy for Estate Vault (separate from product onboarding).
 * Tracking / reporting / supporting documentation — not filings or advice.
 *
 * Bump ESTATE_LEGAL_DISCLAIMER_VERSION when the text materially changes so users
 * must re-acknowledge before signing in again.
 */

import { APP_NAME } from './estateInventoryConstants.js';

export const ESTATE_LEGAL_DISCLAIMER_VERSION = '2026-08-03';

const STORAGE_KEY = 'estateit-legal-disclaimer-ack';

export function hasAcknowledgedLegalDisclaimer(
  versionId = ESTATE_LEGAL_DISCLAIMER_VERSION
) {
  try {
    return localStorage.getItem(STORAGE_KEY) === String(versionId);
  } catch {
    return false;
  }
}

export function markLegalDisclaimerAcknowledged(
  versionId = ESTATE_LEGAL_DISCLAIMER_VERSION
) {
  try {
    localStorage.setItem(STORAGE_KEY, String(versionId));
  } catch {
    // ignore quota / private mode
  }
}

export const ESTATE_LEGAL_DISCLAIMER = {
  title: 'Legal disclaimer',
  eyebrow: 'Please read before continuing',
  introFirst: `${APP_NAME} is a tracking, organization, and reporting product.`,
  intro:
    'We help Personal Representatives and authorized users keep estate administration records — inventory, money, sales, distributions — and prepare court-supporting documentation.',
  introHighlight:
    'Estate Vault is not a law firm, CPA firm, tax service, court e-filing system, or pre-death document vault.',
  sections: [
    {
      heading: 'What this product is',
      items: [
        'A workspace to organize inventory, finances, decisions, evidence, and communication related to estate administration.',
        'A source of reports and exports intended as supporting documentation for you, your counsel, and other professionals to review.',
        'A recordkeeping aid that can help show what was tracked, when it was recorded, and what still appears incomplete.',
        'A ledger that calculates Cash available and Estate balance from the Funds activity and other amounts you record — intended so the Personal Representative workspace and family overview can show the same money picture when finances are shared.'
      ]
    },
    {
      heading: 'What this product is not',
      items: [
        'Not legal advice, tax advice, accounting advice, or fiduciary advice.',
        'Not a substitute for an attorney, CPA, or any licensed professional.',
        'Not an official court filing system or e-filing software.',
        'Not a pre-death vault for wills, passwords, and life documents.',
        'Not a guarantee that any report, export, receipt, or Family Update is complete, accurate, admissible, or ready to file.',
        'Not a bank, broker, live bank feed, or official source of account balances.',
        'Not a legally binding contract, court order, or instrument that creates or transfers rights by itself.'
      ]
    },
    {
      heading: 'Reports and “court-supporting” documents',
      items: [
        'Printed or downloaded reports are supporting records only. They are not official court filings unless and until counsel (or you, as advised by counsel) properly files them through the court.',
        'Cash available, Estate balance, and similar totals are calculated from information entered in Estate Vault. They are administration aids — not bank statements and not a certified accounting unless counsel treats them that way.',
        'Completeness checks, gap warnings, and certificates describe the state of information inside Estate Vault. They do not certify legal sufficiency for any court, agency, or tax authority.',
        'Always reconcile Estate Vault records to original source documents (bank statements, receipts, appraisals, Letters, wills, and court papers).'
      ]
    },
    {
      heading: 'Your responsibility',
      items: [
        'You are responsible for the accuracy of information you enter and for decisions you make while administering an estate.',
        'Review important actions and exports with qualified counsel before relying on them for court, tax, or beneficiary disputes.',
        'If you are unsure about a legal, tax, or fiduciary obligation, stop and consult a professional — do not treat Estate Vault as your advisor.'
      ]
    }
  ],
  footer:
    'By continuing, you acknowledge that Estate Vault provides organization and supporting documentation tools only, and that you will seek independent professional advice as needed. Laws and court requirements vary by jurisdiction and change over time.',
  acknowledgeLabel: 'I understand',
  acknowledgeContinueLabel: 'I understand — continue'
};

export default ESTATE_LEGAL_DISCLAIMER;
