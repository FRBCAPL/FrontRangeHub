/**
 * PR Home — dismissible “how this works” overview (plain workflow map).
 * Action checklist remains EstateNextStepsPanel.
 */

export const HOW_IT_WORKS_DISMISS_KEY = 'ei_how_it_works_dismissed';

export function howItWorksDismissStorageKey(caseNumber) {
  const caseKey = String(caseNumber || '').trim().toUpperCase() || 'GLOBAL';
  return `${HOW_IT_WORKS_DISMISS_KEY}:${caseKey}`;
}

export const ESTATE_HOW_IT_WORKS = {
  eyebrow: 'Orientation',
  title: 'How Estate Vault works',
  thesis:
    'Estate Vault does not interpret your will or give legal advice. You decide what must be done. Use it to record property, money, decisions, receipts, communications, and distributions.',
  steps: [
    {
      number: '1',
      title: 'Set up the estate',
      actionKey: 'settings_case',
      actionLabel: 'Case settings'
    },
    {
      number: '2',
      title: 'Record will instructions yourself',
      actionKey: null,
      actionLabel: null
    },
    {
      number: '3',
      title: 'Inventory property',
      actionKey: 'collections',
      actionLabel: 'Collections'
    },
    {
      number: '4',
      title: 'Track money in and out',
      actionKey: 'ledger',
      actionLabel: 'Accounts & expenses'
    },
    {
      number: '5',
      title: 'Document decisions',
      actionKey: null,
      actionLabel: null
    },
    {
      number: '6',
      title: 'Communicate with beneficiaries',
      actionKey: 'reports',
      actionLabel: 'Reports / updates'
    },
    {
      number: '7',
      title: 'Record distributions & receipts',
      actionKey: 'ledger_distributions',
      actionLabel: 'Distributions'
    },
    {
      number: '8',
      title: 'Export the final record',
      actionKey: 'closing',
      actionLabel: 'Closing / export'
    }
  ],
  footer: 'Next Steps below shows what to do next for this estate.',
  whatIsLabel: 'What is Estate Vault?',
  faqLabel: 'FAQ',
  dismissLabel: 'Dismiss'
};

export default ESTATE_HOW_IT_WORKS;
