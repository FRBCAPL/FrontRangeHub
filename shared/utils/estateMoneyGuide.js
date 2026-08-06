/**
 * Estate money modal — short PR guide (copy + first-visit storage).
 */

const STORAGE_KEY = 'ei-money-guide-v1';

export const ESTATE_MONEY_GUIDE = {
  title: 'How Estate money works',
  intro:
    'This workspace tracks spendable cash separately from sales, property estimates, and what the estate owes.',
  tips: [
    {
      id: 'cash',
      title: 'Cash available',
      body: 'Money in checking or savings you marked Include in Cash on hand. Match this to your bank statement.',
      tab: 'accounts'
    },
    {
      id: 'sales',
      title: 'Sales stay separate',
      body: 'A winning bid is not cash. When the buyer pays, say if you deposited it into an estate account — or note where the money is until you do.',
      tab: 'auction'
    },
    {
      id: 'in-out',
      title: 'Money in & out',
      body: 'Record deposits and payments here so the account balances stay honest.',
      tab: 'transactions'
    },
    {
      id: 'bills',
      title: 'Pay a bill',
      body: 'Funeral costs, utilities, legal fees — paid from estate cash.',
      tab: 'expenses'
    },
    {
      id: 'heirs',
      title: 'Give to heirs',
      body: 'Cash or property you hand to beneficiaries, with a record for later.',
      tab: 'distributions'
    },
    {
      id: 'claims',
      title: 'Creditor claims',
      body: 'A list of who claimed money against the estate. Recording a claim does not spend cash by itself.',
      tab: 'claims'
    }
  ],
  footer: 'Open this guide anytime with How money works.'
};

export function hasSeenMoneyGuide() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markMoneyGuideSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export default ESTATE_MONEY_GUIDE;
