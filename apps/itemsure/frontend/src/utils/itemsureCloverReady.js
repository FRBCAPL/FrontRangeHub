import { ITEMSURE_PATH } from '../data/itemsureConstants.js';

const POS_SETUP = `${ITEMSURE_PATH}/settings/pos`;
const COUNTS = `${ITEMSURE_PATH}/counts`;
const SALES_VS = `${ITEMSURE_PATH}/sales-vs-counts`;

export const cloverReadyVisitedKey = (orgId) => `itemsure.cloverReady.visited.${orgId}`;
export const cloverReadyHiddenKey = (orgId) => `itemsure.cloverReady.hidden.${orgId}`;

/**
 * Path to the first trusted Sales vs counts: connect → match → amounts → sizes →
 * two approved counts → open the report. Confidence is how close that first compare is.
 *
 * `pos`: usePosSetup summary (or { off: true } / null while loading).
 * `approvedCount`: how many approved counts exist for the business.
 * `visitedReport`: localStorage flag once they've opened Sales vs counts.
 */
export function buildCloverReady({ connected, pos, approvedCount = 0, visitedReport = false }) {
  const off = Boolean(pos?.off);
  const ready = Boolean(pos && !off && pos.ready);
  const matched = ready ? (pos.matched || 0) : 0;
  const amountsLeft = ready ? (pos.amounts?.length || 0) : 0;
  const sizesLeft = ready ? (pos.sizes?.length || 0) : 0;
  const hasMatch = matched > 0;
  const amountsDone = connected && hasMatch && amountsLeft === 0;
  const sizesDone = amountsDone && sizesLeft === 0;
  const oneCount = approvedCount >= 1;
  const twoCounts = approvedCount >= 2;

  const steps = [
    {
      id: 'connect',
      done: connected,
      title: 'Connect Clover',
      body: 'Link your merchant so ItemSure can pull sales.',
      to: POS_SETUP,
      action: 'Connect',
    },
    {
      id: 'match',
      done: hasMatch,
      title: 'Match menu buttons to stock',
      body: 'Each Clover button that uses stock needs at least one ItemSure item.',
      to: POS_SETUP,
      action: 'Match',
    },
    {
      id: 'amounts',
      done: amountsDone,
      title: 'Set how much each sale uses',
      body: amountsLeft
        ? `${amountsLeft} matched sale${amountsLeft === 1 ? '' : 's'} still need an amount.`
        : 'Pour / piece rules for matched buttons.',
      to: POS_SETUP,
      action: 'Set amounts',
    },
    {
      id: 'sizes',
      done: sizesDone,
      title: 'Set bottle size or pack count',
      body: sizesLeft
        ? `${sizesLeft} item${sizesLeft === 1 ? '' : 's'} still need size or pack count.`
        : 'Needed when sales are in oz/ml or pieces from a case.',
      to: POS_SETUP,
      action: 'Set sizes',
    },
    {
      id: 'counts',
      done: twoCounts,
      title: 'Finish two approved counts',
      body: oneCount
        ? 'One approved count is in — finish another so you can compare a span.'
        : 'Sales vs counts needs a starting count and an ending count at the same site.',
      to: COUNTS,
      action: oneCount ? 'Count again' : 'Start a count',
    },
    {
      id: 'report',
      done: twoCounts && sizesDone && visitedReport,
      title: 'Open Sales vs counts',
      body: twoCounts && sizesDone
        ? 'Pick two counts and compare what Clover used to what the counts say.'
        : 'Unlocks when matching, amounts, sizes, and two counts are ready.',
      to: SALES_VS,
      action: 'Compare now',
      locked: !(twoCounts && sizesDone),
    },
  ];

  // Weighted toward "can I trust a compare?" — amounts/sizes/counts matter most.
  const weights = { connect: 15, match: 15, amounts: 25, sizes: 15, counts: 20, report: 10 };
  let confidence = 0;
  if (connected) confidence += weights.connect;
  if (hasMatch) confidence += weights.match;
  if (amountsDone) confidence += weights.amounts;
  else if (hasMatch && matched > 0) {
    const doneShare = Math.max(0, 1 - amountsLeft / Math.max(matched, 1));
    confidence += Math.round(weights.amounts * doneShare * 0.5);
  }
  if (sizesDone) confidence += weights.sizes;
  else if (amountsDone && sizesLeft > 0) {
    confidence += Math.round(weights.sizes * 0.25);
  }
  if (twoCounts) confidence += weights.counts;
  else if (oneCount) confidence += Math.round(weights.counts * 0.5);
  if (twoCounts && sizesDone && visitedReport) confidence += weights.report;

  const next = steps.find((s) => !s.done && !s.locked) || steps.find((s) => !s.done) || null;
  const allDone = steps.every((s) => s.done);

  return {
    steps,
    next,
    allDone,
    confidence: Math.min(100, confidence),
    readyToCompare: twoCounts && sizesDone,
  };
}
