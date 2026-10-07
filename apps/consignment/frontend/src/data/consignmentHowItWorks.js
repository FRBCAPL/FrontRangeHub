/**
 * Text for the public "How it works" window. Edit freely.
 * {placeholders} are filled from consignment settings: fee, days, graceDays,
 * auctionFee, commission, payDays, softClose. The auction example ({ex...}) is calculated from
 * EXAMPLE_RESERVE, EXAMPLE_HIGH_BID and EXAMPLE_BUY_NOW using the current commission.
 * Never mention the fixed-price consignment markup here — only the auction commission is public.
 */
export const EXAMPLE_RESERVE = 500;
export const EXAMPLE_HIGH_BID = 650;
export const EXAMPLE_BUY_NOW = 800;

export const HOW_IT_WORKS_TABS = [
  {
    id: 'buying',
    label: 'Buying',
    intro: 'Everything here is in the case at Legends Brews & Cues.',
    steps: [
      'Browse here, or scan the QR tag on any item in the case at Legends.',
      'Fixed-price items are bought first come first serve, in person at Legends.',
      'Prices don’t include sales tax; tax is added at the register. This site does not take payment.',
      'Online auctions: log in with your FRPL account to bid. No account? Sign up from the Log in button; FRPL approves new accounts before they can bid.',
      'Bids go up in $5 steps under $500 and $10 steps at $500 and up.',
      'A bid in the last {softClose} minutes adds {softClose} more minutes, so nobody can snipe it at the buzzer.',
      'Some auctions have Buy It Now. It disappears once bidding reaches that price.',
      'Won an auction? Pay and pick up at Legends within {payDays} days. Winners who don’t pay may lose bidding privileges.',
    ],
  },
  {
    id: 'consign',
    label: 'Sell: Consignment',
    intro: 'You tell us what you want to get. We help sell it.',
    steps: [
      'Submit your item online with photos and your Seller Payout: the amount you want to receive if it sells.',
      'FRPL reviews it and gets in touch. We may accept it, suggest changes, or decline.',
      {
        text: 'If accepted, bring it to Legends and pay the consignment fee. Consignment fees start at {fee} for {days} days. FRPL sets the shelf price.',
        home: 'If accepted, bring it to Legends. FRPL sets the shelf price.',
      },
      'When it sells, you receive your Seller Payout. Your payout is never lowered without your agreement.',
      'Not sold after {days} days? Renew it, or pick it up within {graceDays} days.',
    ],
  },
  {
    id: 'auction',
    label: 'Sell: Auction',
    intro: 'You set the reserve. Bidders set the price.',
    steps: [
      'On the Sell page, choose Online auction and enter your reserve: the lowest price you’ll accept. Bidding starts there.',
      'Add an optional Buy It Now price. It disappears once bidding reaches it.',
      { text: 'If FRPL accepts it, the listing fee is {auctionFee}, paid at drop-off.', home: false },
      'Auctions usually run 7 days and end Sunday at 9 PM, with payment and pickup at Legends.',
      'No bids? Relist it, switch to a fixed-price consignment, or pick it up.',
    ],
    exampleTitle: 'Example: {exReserve} reserve, {exBuyNow} Buy It Now',
    example: [
      'Sells at the {exReserve} reserve: FRPL’s {commission}% is {exReserveFee}, so you receive {exReserveSeller}.',
      'Bidding goes to {exHigh}: FRPL’s {commission}% is {exHighFee}, so you receive {exHighSeller}.',
      'Someone clicks Buy It Now at {exBuyNow}: FRPL’s {commission}% is {exBuyNowFee}, so you receive {exBuyNowSeller}.',
      'The {auctionFee} listing fee is paid at drop-off. It does not come out of your sale.',
    ],
  },
];

export const HOW_IT_WORKS_FOOTER = 'Questions? Ask at the bar at Legends, or message FRPL.';

/** Consignment home page. Steps come from HOW_IT_WORKS_TABS above; same {placeholders}. */
export const HOME_HERO = {
  kicker: 'FRPL Consignment & Auctions',
  title: 'Buy and sell pool gear at Legends',
  lede: 'Cues, cases and gear from local players, in the case at Legends Brews & Cues. Shop in person, bid online, or let FRPL sell your gear for you.',
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
    blurb: 'Tell us what you want to receive. FRPL displays it at Legends and handles the sale.',
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
      'You set your Seller Payout; We help sell it.',
      'When it sells, you receive your Seller Payout.',
    ],
  },
  {
    tab: 'auction',
    title: 'Online auction',
    lines: [
      'Best when you want bidders to set the price.',
      'You set the reserve (the opening bid) and an optional Buy It Now.',
      'You receive at least your reserve price if it sells.',
      
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
