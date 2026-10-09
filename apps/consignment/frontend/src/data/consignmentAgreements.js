import { CONSIGNMENT_DAYS, LEGENDS, LEGENDS_PLACE, PICKUP_GRACE_DAYS } from './consignmentConstants.js';
import { feeTextValues } from '../utils/consignmentFeeText.js';
import { fillHowItWorks } from './consignmentHowItWorks.js';

export const SELLER_PAYOUT_DAYS = 7;
export const UNCLAIMED_SALE_DAYS = 30;

const SHARED_TERMS = `• Everything happens in person at ${LEGENDS_PLACE}: drop-off, inspection, payment and pickup. FRPL does not ship items. You must be able to get to Legends yourself.
• FRPL pays you within ${SELLER_PAYOUT_DAYS} days of the buyer's payment. Collect your payment at Legends.
• Your item is left at your own risk. Neither FRPL nor Legends Brews & Cues is responsible for loss, theft or damage while it is on consignment, including during an inspection. Insure valuable items yourself if you want coverage.
• An item or payment not picked up within {graceDays} days becomes unclaimed property held by Legends Brews & Cues. After ${UNCLAIMED_SALE_DAYS} more days it may be sold, and you give up any claim to the item, the payment, or the money from its sale.`;

/** Placeholders filled from consignment_settings. */
export const AUCTION_AGREEMENT_PLACEHOLDERS = '{auctionFee}, {commission}, {freeDrop}, {repeatShare}, {payDays}, {deliverDays}, {graceDays}';

export const DEFAULT_AUCTION_AGREEMENT = `By checking the box you confirm that:

• You own this item and have the right to sell it, and your description and photos are accurate.
• You are offering it in an online auction run by Front Range Pool League (FRPL). The buyer pays at Legends Brews & Cues, with sales tax added to the winning bid at the register.
• Your reserve is the opening bid. The item will not sell for less than your reserve.
• If you set a Buy It Now price, a buyer can purchase the item at that price until bidding reaches it.
• The listing fee is {auctionFee}, paid to FRPL (Cash App, Venmo, or in person at Legends) before the auction goes live. It is not refunded if the item doesn't sell or you cancel.
• You keep the item during the auction. Keep it safe and in the condition shown in your photos.
• When it sells, you bring it to Legends within {deliverDays} days of the auction ending. If you don't, the sale is cancelled, your listing fee is not refunded, and you lose your FRPL selling access.
• When it sells, FRPL earns the greater of your listing fee or {commission}% of the final price (before sales tax). Your listing fee counts toward the {commission}%, so FRPL takes only the difference from the sale. You receive the rest after the winning bidder pays.
• The winner has {payDays} days from when the item arrives at Legends to pay. If they don't, FRPL may offer the item to the next-highest bidder at their bid, or relist it.
• The winner looks the item over at Legends before paying. If it isn't as described, they can decline it, and FRPL may offer it to the next-highest bidder or relist it.
• You can ask FRPL to withdraw the item before the first bid. Once bidding starts, the auction runs to the end and the reserve can't be changed.
• If the item doesn't sell, or the winner declines or doesn't pay, you can relist it, switch it to a fixed-price consignment, or pick it up from Legends within {graceDays} days (if you delivered it). Your first relist is free if you lower the reserve {freeDrop} or more; otherwise a relist costs {repeatShare} the original listing fee. Relist fees don't count toward FRPL's share.
${SHARED_TERMS}`;

export const CONSIGNMENT_AGREEMENT_PLACEHOLDERS = '{fee}, {shelfCommission}, {freeDrop}, {repeatShare}, {days}, {graceDays}';

export const DEFAULT_CONSIGNMENT_AGREEMENT = `By checking the box you confirm that:

• You own this item and have the right to sell it, and your description and photos are accurate.
• You are offering it for sale on consignment through Front Range Pool League (FRPL) at Legends Brews & Cues, at the price agreed with FRPL. Sales tax is added at the register.
• The listing fee is {fee}, paid at drop-off, for {days} days in the case. It is not refunded if the item doesn't sell or you cancel.
• When it sells, FRPL earns the greater of your listing fee or {shelfCommission}% of the sale price. Your listing fee counts toward the {shelfCommission}%, so FRPL takes only the difference from the sale. You receive the rest.
• Your price will not be lowered without your OK.
• You choose whether buyers may inspect your item at Legends. If you allow it, a buyer may handle it in the bar under staff watch while Legends holds their ID. If not, it stays in the case until it's bought.
• Buyers look the item over before paying. If it isn't as described, they don't have to buy it.
• You can ask FRPL to withdraw the item before it sells.
• If it doesn't sell in {days} days, you can renew it, switch it to an online auction, or pick it up within {graceDays} days. Your first renewal is free if you lower the price {freeDrop} or more; otherwise a renewal costs {repeatShare} the original listing fee. Renewal fees don't count toward FRPL's share.
${SHARED_TERMS}`;

const PLACEHOLDER_PREFIX = 'This is a placeholder';

// Phrases from the agreements written for the old fee model (Seller Payout + markup, flat fee kept separate).
const OUTDATED_PHRASES = [
  'Seller Payout',
  'does not come out',
  'Consignment fees start',
  'FRPL sets the shop price',
  'a new fee applies',
  'a new listing fee may apply',
  'paid at drop-off before the auction starts',
];

// Every current agreement must cover these; saved text without them predates the liability and unclaimed terms.
const REQUIRED_PHRASES = ['unclaimed property', 'own risk', LEGENDS.city];

/** True when saved agreement text describes the old fee model or is missing current terms. */
export function isOutdatedAgreement(saved) {
  const text = String(saved || '');
  return OUTDATED_PHRASES.some((phrase) => text.includes(phrase))
    || REQUIRED_PHRASES.some((phrase) => !text.includes(phrase));
}

/** True when the admin saved their own text but it is out of date (so sellers see the standard text). */
export function savedAgreementOutdated(saved) {
  const text = String(saved || '').trim();
  return Boolean(text) && !text.startsWith(PLACEHOLDER_PREFIX) && isOutdatedAgreement(text);
}

function savedOrDefault(saved, fallback) {
  const text = String(saved || '').trim();
  if (!text || text.startsWith(PLACEHOLDER_PREFIX) || isOutdatedAgreement(text)) return fallback;
  return text;
}

/** The saved agreement, or the standard one when nothing current is saved. */
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
    deliverDays: String(Number(settings?.auction_delivery_days ?? 3)),
    graceDays: String(Number(settings?.pickup_grace_days ?? PICKUP_GRACE_DAYS)),
  });
}
