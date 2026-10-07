import { CONSIGNMENT_DAYS, PICKUP_GRACE_DAYS } from './consignmentConstants.js';
import { feeTextValues } from '../utils/consignmentFeeText.js';
import { fillHowItWorks } from './consignmentHowItWorks.js';

/** Placeholders filled from consignment_settings. */
export const AUCTION_AGREEMENT_PLACEHOLDERS = '{auctionFee}, {commission}, {freeDrop}, {repeatShare}, {payDays}';

export const DEFAULT_AUCTION_AGREEMENT = `By checking the box you confirm that:

• You own this item and have the right to sell it, and your description and photos are accurate.
• You are offering it in an online auction run by Front Range Pool League (FRPL), with payment and pickup at Legends Brews & Cues.
• Your reserve is the opening bid. The item will not sell for less than your reserve.
• If you set a Buy It Now price, a buyer can purchase the item at that price until bidding reaches it.
• The listing fee is {auctionFee}, paid at drop-off before the auction starts. It is not refunded if the item doesn't sell or you cancel.
• When it sells, FRPL earns the greater of your listing fee or {commission}% of the final price (before sales tax). Your listing fee counts toward the {commission}%, so FRPL takes only the difference from the sale. You receive the rest after the winning bidder pays.
• The winner has {payDays} days to pay. If they don't, FRPL may offer the item to the next-highest bidder at their bid, or relist it.
• You can ask FRPL to withdraw the item before the first bid. Once bidding starts, the auction runs to the end and the reserve can't be changed.
• If the item doesn't sell, you can relist it, switch it to a fixed-price consignment, or pick it up. Your first relist is free if you lower the reserve {freeDrop} or more; otherwise a relist costs {repeatShare} the original listing fee. Relist fees don't count toward FRPL's share.`;

export const CONSIGNMENT_AGREEMENT_PLACEHOLDERS = '{fee}, {shelfCommission}, {freeDrop}, {repeatShare}, {days}, {graceDays}';

export const DEFAULT_CONSIGNMENT_AGREEMENT = `By checking the box you confirm that:

• You own this item and have the right to sell it, and your description and photos are accurate.
• You are offering it for sale on consignment through Front Range Pool League (FRPL) at Legends Brews & Cues, at the price agreed with FRPL. Sales tax is added at the register.
• The listing fee is {fee}, paid at drop-off, for {days} days in the case. It is not refunded if the item doesn't sell or you cancel.
• When it sells, FRPL earns the greater of your listing fee or {shelfCommission}% of the sale price. Your listing fee counts toward the {shelfCommission}%, so FRPL takes only the difference from the sale. You receive the rest.
• Your price will not be lowered without your OK.
• You can ask FRPL to withdraw the item before it sells.
• If it doesn't sell in {days} days, you can renew it, switch it to an online auction, or pick it up within {graceDays} days. Your first renewal is free if you lower the price {freeDrop} or more; otherwise a renewal costs {repeatShare} the original listing fee. Renewal fees don't count toward FRPL's share.`;

const PLACEHOLDER_PREFIX = 'This is a placeholder';

function savedOrDefault(saved, fallback) {
  const text = String(saved || '').trim();
  return !text || text.startsWith(PLACEHOLDER_PREFIX) ? fallback : text;
}

/** The saved agreement, or the default while the saved one is still the setup placeholder. */
export function auctionAgreementTemplate(settings) {
  return savedOrDefault(settings?.auction_agreement_text, DEFAULT_AUCTION_AGREEMENT);
}

export function consignmentAgreementTemplate(settings) {
  return savedOrDefault(settings?.agreement_text, DEFAULT_CONSIGNMENT_AGREEMENT);
}

export function fillConsignmentAgreement(template, settings) {
  return fillHowItWorks(template, {
    ...feeTextValues(settings),
    days: String(Number(settings?.consignment_days || CONSIGNMENT_DAYS)),
    graceDays: String(Number(settings?.pickup_grace_days ?? PICKUP_GRACE_DAYS)),
  });
}

export function fillAuctionAgreement(template, settings) {
  return fillHowItWorks(template, {
    ...feeTextValues(settings),
    payDays: String(Number(settings?.auction_payment_days ?? 7)),
  });
}
