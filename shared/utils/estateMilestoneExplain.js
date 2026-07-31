/**
 * Estate Vault — expandable disclosure milestone explanations.
 * Pure copy helpers for family portal timeline clicks.
 */

export function milestoneExplanation(event = {}, context = {}) {
  const key = event.key;
  const inventory = context.inventory || {};
  const auctionStatus = context.auctionStatus || {};

  const base = {
    key,
    title: event.title || 'Milestone',
    status: event.status || 'upcoming',
    dateLabel: event.dateLabel || null,
    summary: event.detail || '',
    whatItMeans: '',
    whyItMatters: '',
    whatsComplete: '',
    whatsNext: ''
  };

  switch (key) {
    case 'case_opened':
      return {
        ...base,
        whatItMeans: 'The Personal Representative opened this estate workspace in Estate Vault.',
        whyItMatters: 'It starts the documented record of administration for this case.',
        whatsComplete: event.status === 'done' ? 'Estate record exists.' : 'Not started.',
        whatsNext: 'Set Letters issued date and begin inventory.'
      };
    case 'letters':
      return {
        ...base,
        whatItMeans:
          'Letters Testamentary / Letters of Administration document the PR’s legal authority.',
        whyItMatters:
          'Many probate clocks (including the claims window) start from Letters, not from the date of death alone.',
        whatsComplete: event.status === 'done'
          ? `Letters date recorded${event.dateLabel ? ` (${event.dateLabel})` : ''}.`
          : 'Letters date not set yet.',
        whatsNext: event.status === 'done'
          ? 'Inventory, auction planning, and claims countdown can proceed.'
          : 'Ask the PR to enter the Letters issued date in Settings.'
      };
    case 'inventory_shared':
      return {
        ...base,
        whatItMeans:
          'Personal property is being recorded so beneficiaries can see what the estate holds.',
        whyItMatters:
          'A clear inventory reduces disputes about what existed and what has already been transferred.',
        whatsComplete: `${inventory.total || 0} total · ${inventory.active || 0} active · ${
          inventory.distributed || 0
        } distributed.`,
        whatsNext: inventory.source === 'server' || inventory.total
          ? 'PR certifies completion when recording is done; distributed items still count in totals.'
          : 'Wait for the PR to record items.'
      };
    case 'auction':
      return {
        ...base,
        whatItMeans:
          'Approved lots may be offered publicly. Not every approved item appears on the catalog the same day.',
        whyItMatters:
          'Auction proceeds fund expenses and residual distributions; mismatches without reasons look like missing property.',
        whatsComplete: auctionStatus.summaryLabel || event.detail || 'Auction status recorded.',
        whatsNext:
          auctionStatus.notListedCount > 0
            ? 'Approved-but-not-listed lots have stated reasons (review, dispute, claim, etc.).'
            : 'Collect payments and update account balances as lots settle.'
      };
    case 'claims':
      return {
        ...base,
        whatItMeans:
          'Creditors may present claims against the estate during the probate / claims window.',
        whyItMatters:
          'Final residual distributions are usually safer after this window closes so known debts can be paid first.',
        whatsComplete: event.status === 'done'
          ? 'Claims / probate window has closed on the recorded end date.'
          : event.dateLabel
            ? `Window open until ${event.dateLabel}.`
            : 'Window not fully configured.',
        whatsNext: event.status === 'done'
          ? 'Preliminary and final accounting can move forward.'
          : 'Expect staged numbers, not a final residual split, while this window remains open.'
      };
    case 'distributions':
      return {
        ...base,
        whatItMeans:
          'Cash and/or specific property delivered to recipients, with receipts and acknowledgements.',
        whyItMatters:
          'Distributions create an auditable record of what each beneficiary has already received.',
        whatsComplete: event.detail || 'No distributions recorded yet.',
        whatsNext:
          'Additional partial or final distributions may follow; ask for a published Family Update for the latest snapshot.'
      };
    case 'preliminary_accounting':
      return {
        ...base,
        whatItMeans:
          'A staged Family Update or preliminary figures — not continuous live bank access.',
        whyItMatters:
          'Beneficiaries need process communication before final accounting is appropriate.',
        whatsComplete: 'Available when the PR publishes a Family Update.',
        whatsNext: 'Watch the Family Updates section for numbered reports from the PR.'
      };
    case 'final_accounting':
      return {
        ...base,
        whatItMeans:
          'Closing records and residual wrap-up after claims, settlement, and distributions.',
        whyItMatters: 'This is the court-oriented end state, not an early portal view.',
        whatsComplete: event.status === 'done' ? event.detail : 'Estate not closed for records yet.',
        whatsNext: event.status === 'done'
          ? 'Final figures are preserved in formal accounting / court pack.'
          : 'Expect this after claims close, auction settlement, and remaining distributions.'
      };
    default:
      return {
        ...base,
        whatItMeans: event.detail || 'Estate administration milestone.',
        whyItMatters: 'Documents where the estate is in the process.',
        whatsComplete: event.status === 'done' ? 'Complete.' : 'In progress or upcoming.',
        whatsNext: 'See the disclosure timeline for related milestones.'
      };
  }
}
