import {
  CONSIGNMENT_DAYS,
  DEFAULT_AUCTION_LISTING_FEE,
  DEFAULT_CONSIGNMENT_FEE,
  PICKUP_GRACE_DAYS,
} from './consignmentConstants.js';
import { DEFAULT_COMMISSION_PCT } from '../utils/consignmentAuctionMath.js';
import { formatDollars } from '../utils/consignmentMoney.js';
import { fillHowItWorks } from './consignmentHowItWorks.js';

/** Placeholders filled from consignment_settings: {auctionFee}, {commission}, {payDays}. */
export const AUCTION_AGREEMENT_PLACEHOLDERS = '{auctionFee}, {commission}, {payDays}';

export const DEFAULT_AUCTION_AGREEMENT = `By checking the box you confirm that:

• You own this item and have the right to sell it, and your description and photos are accurate.
• You are offering it in an online auction run by Front Range Pool League (FRPL), with payment and pickup at Legends Brews & Cues.
• Your reserve is the opening bid. The item will not sell for less than your reserve.
• If you set a Buy It Now price, a buyer can purchase the item at that price until bidding reaches it.
• The {auctionFee} listing fee is paid at drop-off. It does not come out of your sale.
• FRPL keeps {commission}% of the final sale price (before sales tax). You receive the rest after the winning bidder pays.
• The winner has {payDays} days to pay. If they don't, FRPL may offer the item to the next-highest bidder at their bid, or relist it.
• You can ask FRPL to withdraw the item before the first bid. Once bidding starts, the auction runs to the end and the reserve can't be changed.
• If the item doesn't sell, you can relist it (a new listing fee may apply), switch it to a fixed-price consignment, or pick it up.`;

/** Placeholders filled from consignment_settings: {fee}, {days}, {graceDays}. */
export const CONSIGNMENT_AGREEMENT_PLACEHOLDERS = '{fee}, {days}, {graceDays}';

export const DEFAULT_CONSIGNMENT_AGREEMENT = `By checking the box you confirm that:

• You own this item and have the right to sell it, and your description and photos are accurate.
• You are offering it for sale on consignment through Front Range Pool League (FRPL) at Legends Brews & Cues.
• Consignment fees start at {fee} for {days} days, paid at drop-off. The fee does not come out of your Seller Payout.
• If the item sells during the consignment period, you receive the agreed Seller Payout. FRPL sets the shop price, and sales tax is added at the register.
• Your Seller Payout will not be lowered without your OK.
• You can ask FRPL to withdraw the item before it sells.
• If it doesn't sell in {days} days, you can renew it (a new fee applies), switch it to an online auction, or pick it up within {graceDays} days.`;

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
    fee: formatDollars(Number(settings?.default_consignment_fee ?? DEFAULT_CONSIGNMENT_FEE)),
    days: String(Number(settings?.consignment_days || CONSIGNMENT_DAYS)),
    graceDays: String(Number(settings?.pickup_grace_days ?? PICKUP_GRACE_DAYS)),
  });
}

export function fillAuctionAgreement(template, settings) {
  const fee = settings?.auction_listing_fee ?? DEFAULT_AUCTION_LISTING_FEE;
  return fillHowItWorks(template, {
    auctionFee: formatDollars(Number(fee)),
    commission: String(Number(settings?.auction_commission_pct ?? DEFAULT_COMMISSION_PCT)),
    payDays: String(Number(settings?.auction_payment_days ?? 7)),
  });
}
