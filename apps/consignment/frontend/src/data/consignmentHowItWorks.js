/**
 * Text for the public "How it works" window. Edit freely.
 * {placeholders} are filled from the public settings: days, graceDays, payDays, deliverDays, softClose.
 * Fees and commission stay out of this public text; approved sellers see them in the seller agreements.
 */

export const HOW_IT_WORKS_TABS = [
  {
    id: 'buying',
    label: 'Buying',
    intro: 'Fixed-price items are in the case at Legends Brews & Cues in Colorado Springs. Auction items stay with the seller until they sell.',
    steps: [
      'Everything is in person at Legends in Colorado Springs, CO: inspection, payment and pickup. Nothing is shipped.',
      'Browse here, or scan the QR tag on any item in the case at Legends.',
      'Fixed-price items are bought first come first serve, in person at Legends.',
      'Prices don’t include sales tax; tax is added at the register. This site does not take payment.',
      'Some items can be inspected at Legends: ask at the bar and staff will hold your ID while you look. You’re responsible for any damage while inspecting.',
      'All sales are final and items are sold as-is. Look the item over before you pay; if it isn’t as described, you don’t have to buy it.',
      'Online auctions: log in with your FRPL account to bid. No account? Sign up from the Log in button; FRPL approves new accounts before they can bid.',
      'Bids go up in $5 steps under $500 and $10 steps at $500 and up.',
      'A bid in the last {softClose} minutes adds {softClose} more minutes, so nobody can snipe it at the buzzer.',
      'Some auctions have Buy It Now. It disappears once bidding reaches that price.',
      'Won an auction? The seller brings it to Legends, and FRPL lets you know when it arrives. Then you have {payDays} days to look it over, pay and pick it up. If it isn’t as described, you can decline it. Winners who don’t pay for an item as described may lose bidding privileges.',
    ],
  },
  {
    id: 'consign',
    label: 'Sell: Consignment',
    intro: 'You set the price. We sell it from the case at Legends.',
    steps: [
      'Selling is open to approved FRPL sellers. Log in and request seller access.',
      'You’ll need to drop the item off at Legends in Colorado Springs, CO.',
      'Submit your item online with photos and your price.',
      'FRPL reviews it and gets in touch. We may accept it, suggest changes, or decline.',
      'If accepted, bring it to Legends and pay the listing fee. It stays in the case for {days} days.',
      'Your price is never lowered without your OK. Fees and terms are in the consignment agreement.',
      'You choose whether buyers may inspect your item at Legends.',
      'Sold? Collect your payment at Legends within 7 days of the sale.',
      'Not sold after {days} days? Renew it, or pick it up within {graceDays} days. Items left longer become unclaimed property.',
    ],
  },
  {
    id: 'auction',
    label: 'Sell: Auction',
    intro: 'You set the reserve. Bidders set the price.',
    steps: [
      'Selling is open to approved FRPL sellers. Log in and request seller access.',
      'You’ll need to bring the item to Legends in Colorado Springs, CO when it sells.',
      'On the Sell page, choose Online auction and enter your reserve: the lowest price you’ll accept. Bidding starts there.',
      'Add an optional Buy It Now price. It disappears once bidding reaches it.',
      { text: 'If FRPL accepts it, pay the listing fee by Cash App or Venmo from your My items page, or in person at Legends. Your auction goes live once it’s paid.', home: false },
      'You keep the item while it’s up for auction. Auctions usually run 7 days and end Sunday at 9 PM.',
      'Sold? Bring it to Legends within {deliverDays} days. The winner looks it over and pays there. Miss the deadline and the sale is cancelled, the fee isn’t refunded, and you lose selling access.',
      'Collect your payment at Legends within 7 days of the winner paying.',
      'No bids? Relist it or switch to a fixed-price consignment. Nothing to pick up; it never left your hands.',
      'Fees and terms are in the auction agreement.',
    ],
  },
];

export const HOW_IT_WORKS_FOOTER = 'Questions? Ask at the bar at Legends, or message FRPL.';

/** Consignment home page. Steps come from HOW_IT_WORKS_TABS above; same {placeholders}. */
export const HOME_HERO = {
  kicker: 'FRPL Consignment & Auctions',
  title: 'Buy and sell pool gear at Legends',
  lede: 'Cues, cases and gear from local players. Shop the case at Legends Brews & Cues in Colorado Springs, bid online, or let FRPL sell your gear for you. All pickups are in person; nothing ships.',
};

/** `to` is relative to the consignment path; `tab` picks which steps section it points at. */
export const HOME_PATHS = [
  {
    tab: 'buying',
    icon: '🛒',
    title: 'Buy',
    blurb: 'Browse the case online or scan a tag at Legends. Fixed-price items are bought in person; auctions are bid on here.',
    cta: 'Shop now',
    to: '',
  },
  {
    tab: 'consign',
    icon: '🏷️',
    title: 'Consign',
    blurb: 'Set your price. FRPL displays it at Legends and handles the sale.',
    cta: 'Sell on consignment',
    to: 'sell',
  },
  {
    tab: 'auction',
    icon: '🔨',
    title: 'Auction',
    blurb: 'Set your reserve and an optional Buy It Now. Bidders set the final price.',
    cta: 'Sell at auction',
    to: 'sell?method=auction',
  },
];

export const HOME_COMPARE_TITLE = 'Selling: consignment or auction?';
export const HOME_COMPARE = [
  {
    tab: 'consign',
    title: 'Consignment',
    lines: [
      'Best when you know what you want for it.',
      'You set the price; it sells from the case at Legends.',
      'Listing fees apply. See the consignment agreement.',
    ],
  },
  {
    tab: 'auction',
    title: 'Online auction',
    lines: [
      'Best when you want bidders to set the price.',
      'You set the reserve (the opening bid) and an optional Buy It Now.',
      'Listing fees apply. See the auction agreement.',
    ],
  },
];

/**
 * A step is a string, or { text, home }: `text` is the pop-up version; `home` replaces it on the
 * home page (a string), or hides it there (false).
 */
export const stepText = (step) => (typeof step === 'string' ? step : step.text);

export function homeSteps(steps) {
  return steps
    .map((step) => (typeof step === 'string' || step.home === undefined ? stepText(step) : step.home))
    .filter(Boolean);
}

export function fillHowItWorks(text, values) {
  return String(text).replace(/\{(\w+)\}/g, (match, key) => (values[key] != null ? values[key] : match));
}
