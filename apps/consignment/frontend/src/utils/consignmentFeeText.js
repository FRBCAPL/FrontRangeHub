import { feePolicyFrom } from './consignmentFeePolicy.js';
import { formatDollars } from './consignmentMoney.js';

/** e.g. "5% of your reserve ($10–$25)" */
export function feeRuleText(method, policy) {
  const auction = method === 'auction';
  const [pct, min, max] = auction
    ? [policy.auctionFeePct, policy.auctionFeeMin, policy.auctionFeeMax]
    : [policy.shelfFeePct, policy.shelfFeeMin, policy.shelfFeeMax];
  return `${pct}% of your ${auction ? 'reserve' : 'price'} (${formatDollars(min)}–${formatDollars(max)})`;
}

/** "half" or "25% of" — how much of the original fee a renewal/relist costs. */
export function repeatShareText(policy) {
  return policy.repeatFeePct === 50 ? 'half' : `${policy.repeatFeePct}% of`;
}

/**
 * Fee placeholders shared by How it works and the seller agreements:
 * {fee} {auctionFee} {shelfCommission} {commission} {freeDrop} {repeatShare}
 */
export function feeTextValues(settings) {
  const policy = feePolicyFrom(settings);
  return {
    fee: feeRuleText('fixed', policy),
    auctionFee: feeRuleText('auction', policy),
    shelfCommission: String(policy.shelfCommissionPct),
    commission: String(policy.auctionCommissionPct),
    freeDrop: `${policy.freeRepeatDropPct}%`,
    repeatShare: repeatShareText(policy),
  };
}
