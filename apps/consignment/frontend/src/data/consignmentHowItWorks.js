/**
 * Text for the public "How it works" window. Edit freely.
 * {placeholders} are filled from the public settings: days, graceDays, payDays, deliverDays, softClose, taxPct.
 * Fees and commission stay out of this public text; approved sellers see them in the seller agreements.
 */

/** Sub-tabs inside the Buying tab of the pop-up. The home page shows all their steps as one list. */
const BUYING_SECTIONS = [
  {
    id: 'basics',
    label: 'Basics',
    icon: '📍',
    intro: '{basicsIntro}',
    steps: [
      { icon: '📍', title: 'Local pickup', text: 'Look it over, pay and pick it up at Legends in Colorado Springs, CO. {pickupShipping}' },
      { icon: '🔐', title: 'Log in', text: 'Anyone can browse. To bid or make offers, log in with your FRPL account. No account? Sign up from the Log in button; FRPL approves new accounts before they can bid.' },
      { icon: '🧾', title: 'Totals with tax', text: 'Each item shows its total with {taxPct} sales tax. Some sellers set a price with tax already included; those say “tax included.” You pay at the register; this site does not take payment.' },
      { icon: '✅', title: 'Sold as-is', text: 'All sales are final and items are sold as-is. Look the item over before you pay; if it isn’t as described, you don’t have to buy it.' },
    ],
  },
  {
    id: 'case',
    label: 'In the case',
    icon: '🏪',
    intro: 'Fixed-price items sit in the case at Legends. Buy them in person, first come, first served.',
    steps: [
      { icon: '🔎', title: 'Browse or scan', text: 'Browse here, or scan the QR tag on any item in the case at Legends.' },
      { icon: '🏃', title: 'First come, first served', text: 'Fixed-price items are bought first come first serve, in person at Legends.' },
      { icon: '🤝', title: 'Make an offer', text: 'Logged in? Make an offer on any item for sale, from half the price. The seller has {offerDays} days to accept, decline or counter. If it’s accepted, the item is held for you for {offerHoldDays} days while you come in and pay.' },
      { icon: '🪪', title: 'Inspect before you buy', text: 'Some items can be inspected at Legends: ask at the bar and staff will hold your ID while you look. You’re responsible for any damage while inspecting.' },
    ],
  },
  {
    id: 'table',
    label: 'On the table',
    icon: '🔨',
    intro: 'Online auctions. The item stays with the seller until it sells, then comes to Legends for you to look over and pay.',
    steps: [
      { icon: '📈', title: 'Bid steps', text: 'Bids go up in $5 steps under $500 and $10 steps at $500 and up.' },
      { icon: '⏱️', title: 'No sniping', text: 'A bid in the last {softClose} minutes adds {softClose} more minutes, so nobody can snipe it at the buzzer.' },
      { icon: '⚡', title: 'Buy It Now', text: 'Some auctions have Buy It Now. It disappears once bidding reaches that price.' },
      { icon: '🤝', title: 'Offers on auctions', text: 'No bids yet, or it ended without any? You can make an offer, from half the opening bid. If the seller accepts, you win the auction at your price.' },
      { icon: '🏆', title: 'Won it?', text: 'Won an auction? The seller brings it to Legends, and FRPL lets you know when it arrives. Then you have {payDays} days to look it over, pay and pick it up. If it isn’t as described, you can decline it. Winners who don’t pay for an item as described may lose bidding privileges.{wonShipping}' },
    ],
  },
];

export const HOW_IT_WORKS_TABS = [
  {
    id: 'buying',
    label: 'Buying',
    icon: '🛒',
    intro: 'Fixed-price items are in the case at Legends Brews & Cues in Colorado Springs. Auction items stay with the seller until they sell.',
    sections: BUYING_SECTIONS,
    steps: BUYING_SECTIONS.flatMap((s) => s.steps),
  },
  {
    id: 'consign',
    label: 'Sell: Consignment',
    icon: '🏷️',
    intro: 'You set the price. We sell it from the case at Legends.',
    steps: [
      { icon: '🔑', title: 'Get seller access', text: 'Selling is open to approved FRPL sellers. Log in and request seller access.' },
      { icon: '📸', title: 'Submit it online', text: 'Submit your item online with photos and your price. Keep the item for now.' },
      { icon: '👀', title: 'FRPL reviews it', text: 'FRPL reviews it and gets in touch. We may accept it, suggest changes, or decline.' },
      { icon: '🏪', title: 'Drop it off at Legends', text: 'Only once it’s accepted: bring it to Legends in Colorado Springs, CO and pay the listing fee. It goes in the case for {days} days.' },
      { icon: '💲', title: 'Your price, your call', text: 'Your price is never lowered without your OK.' },
      { icon: '🤝', title: 'Offers', text: 'Buyers can make offers (at least half your price). You accept, decline or counter on My items, and you see what you’d receive before you accept.' },
      { icon: '🧾', title: 'What it costs', text: '{consignFees}', home: false },
      { icon: '🪪', title: 'Inspection is your choice', text: 'You choose whether buyers may inspect your item at Legends.' },
      { icon: '💵', title: 'Sold? Get paid', text: 'Sold? Collect your payment at Legends within 7 days of the sale.{sellerShipping}' },
      { icon: '🔁', title: 'Didn’t sell?', text: 'Not sold after {days} days? Renew it, or pick it up within {graceDays} days. Items left longer become unclaimed property.' },
    ],
  },
  {
    id: 'auction',
    label: 'Sell: Auction',
    icon: '🔨',
    intro: 'You set the reserve. Bidders set the price.',
    steps: [
      { icon: '🔑', title: 'Get seller access', text: 'Selling is open to approved FRPL sellers. Log in and request seller access.' },
      { icon: '📍', title: 'Delivered to Legends', text: 'You’ll need to bring the item to Legends in Colorado Springs, CO when it sells.' },
      { icon: '🎯', title: 'Set your reserve', text: 'On the Sell page, choose Online auction and enter your reserve: the lowest price you’ll accept. Bidding starts there.' },
      { icon: '⚡', title: 'Optional Buy It Now', text: 'Add an optional Buy It Now price. It disappears once bidding reaches it.' },
      { icon: '🤝', title: 'Offers before bidding', text: 'Until someone bids (or if it ends with no bids), buyers can make offers from half your reserve. Accept, decline or counter on My items; accepting ends the auction as a sale.' },
      { icon: '💳', title: 'Pay the listing fee', text: 'If FRPL accepts it, pay the listing fee by Cash App or Venmo from your My items page, or in person at Legends. Your auction goes live once it’s paid.', home: false },
      { icon: '🗓️', title: 'You keep it meanwhile', text: 'You keep the item while it’s up for auction. Every auction runs 7 days from the moment it starts.' },
      { icon: '🚚', title: 'Sold? Deliver it', text: 'Sold? Bring it to Legends within {deliverDays} days. The winner looks it over and pays there. Miss the deadline and the sale is cancelled, the fee isn’t refunded, and you lose selling access.' },
      { icon: '💵', title: 'Get paid', text: 'Collect your payment at Legends within 7 days of the winner paying.{sellerShipping}' },
      { icon: '🔁', title: 'No bids?', text: 'No bids? Choose what’s next on My items: relist it (free every time you lower the reserve 10% or more), switch to a fixed-price consignment, or keep it. If it’s already at Legends, pick it up within {graceDays} days; otherwise there’s nothing to pick up.' },
      { icon: '🧾', title: 'What it costs', text: '{auctionFees}', home: false },
    ],
  },
];

/**
 * Fee wording for {consignFees} {auctionFees} {consignFeeLine} {auctionFeeLine}.
 * `seller` (with the fee placeholders from consignmentFeeText) shows to approved sellers and admins only;
 * everyone else sees `public`.
 */
export const FEE_TEXT = {
  consignFees: {
    seller: 'Listing fee: {fee}, paid at drop-off and not refunded. When it sells, FRPL keeps {shelfCommission}% of the price, with your listing fee counted toward it. Renewing costs {repeatShare} the original fee, or is free the first time if you lower your price {freeDrop} or more. Full terms are in the consignment agreement.',
    public: 'There’s a small listing fee, and percentage when it sells. Once you’re an approved seller you’ll see the exact amounts here and before you submit anything.',
  },
  auctionFees: {
    seller: 'Listing fee: {auctionFee}, paid before the auction goes live and not refunded. When it sells, FRPL keeps {commission}% of the winning bid, with your listing fee counted toward it. Relisting is free every time you lower the reserve {freeDrop} or more; otherwise it costs {repeatShare} the original fee. Full terms are in the auction agreement.',
    public: 'There’s a small listing fee, and percentage when it sells. Once you’re an approved seller you’ll see the exact amounts here and before you submit anything.',
  },
  consignFeeLine: {
    seller: 'Listing fee {fee}, paid at drop-off. FRPL keeps {shelfCommission}% of the sale, fee credited.',
    public: 'Listing fee paid at drop-off. Approved sellers see the amounts before submitting.',
  },
  auctionFeeLine: {
    seller: 'Listing fee {auctionFee}, paid before it goes live. FRPL keeps {commission}% of the winning bid, fee credited.',
    public: 'Listing fee paid before it goes live. Approved sellers see the amounts before submitting.',
  },
};

/**
 * Shipping wording for {basicsIntro} {pickupShipping} {wonShipping} {sellerShipping} {heroShipping} {guideShipping}.
 * `off` shows until an admin turns shipping on (Admin → Settings → Shipping). {shipDays} = days to report a problem.
 */
export const SHIPPING_TEXT = {
  off: {
    basicsIntro: 'Everything happens in person at Legends Brews & Cues in Colorado Springs. Shipping isn’t available at this time.',
    pickupShipping: 'Shipping isn’t available at this time.',
    wonShipping: '',
    sellerShipping: '',
    heroShipping: 'Local pickup at Legends; shipping isn’t available at this time.',
    guideShipping: 'Shipping isn’t available at this time, and you pay at the register, not on this site.',
  },
  on: {
    basicsIntro: 'Pickup and payment happen in person at Legends Brews & Cues in Colorado Springs. Outside Colorado? Items marked 🚚 Ships can be shipped to you.',
    pickupShipping: 'Outside Colorado (lower 48 states and DC)? Items marked 🚚 Ships can be shipped: FRPL emails a secure Square payment link for the price plus a flat shipping & handling charge, with no Colorado sales tax, and ships from Legends with tracking. Report any problem within {shipDays} days of delivery.',
    wonShipping: ' Outside Colorado? If the item ships, choose “Ship it to me” on the item page instead.',
    sellerShipping: ' If FRPL ships it to an out-of-state buyer, you’re paid once it’s delivered and the buyer’s {shipDays} days to report a problem have passed.',
    heroShipping: 'Local pickup at Legends; select items ship to buyers outside Colorado.',
    guideShipping: 'You pay at the register, not on this site. Outside Colorado? Items marked 🚚 Ships can be shipped to you and paid with a Square payment link.',
  },
};

export const HOW_IT_WORKS_FOOTER = 'Questions? Ask at the bar at Legends, or message FRPL.';

/** Consignment home page. Steps come from HOW_IT_WORKS_TABS above; same {placeholders}. */
export const HOME_HERO = {
  kicker: 'FRPL Consignment & Auctions',
  title: 'Buy and sell pool gear at Legends',
  lede: 'Cues, cases and gear from local players.\nBuy from the case at Legends Brews & Cues in Colorado Springs, or bid online.\n{heroShipping}',
};

/** Leads the home page while the shop is still filling up (fewer than SELLER_FIRST_UNDER listings). */
export const HOME_SELL_PITCH = {
  title: 'Turn your extra cues into cash',
  lede: 'The shop just opened, and local players are looking. List your gear in a few minutes; FRPL handles the sale at Legends.',
  points: [
    'You set the price, and it’s never lowered without your OK.',
    'Buyers can make offers. You accept, decline or counter.',
    'Sell from the case at Legends, or run a 7-day online auction.',
  ],
  cta: 'Sell an item',
  browse: 'Browse the shop',
};

/** `to` is relative to the consignment path; `tab` picks which steps section it points at. */
export const HOME_PATHS = [
  {
    tab: 'buying',
    icon: '🛒',
    title: 'Buy',
    blurb: 'Browse the case online or scan a tag at Legends. Buy in person, bid on auctions here, or make an offer.',
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
      '{consignFeeLine}',
    ],
  },
  {
    tab: 'auction',
    title: 'Online auction',
    lines: [
      'Best when you want bidders to set the price.',
      'You set the reserve (the opening bid) and an optional Buy It Now.',
      '{auctionFeeLine}',
    ],
  },
];

/**
 * A step is a string, or { text, home, icon, title, group }: `text` is the pop-up version; `home` replaces it
 * on the home page (a string), or hides it there (false). `icon`/`title` label the step in the pop-up;
 * `group` starts a new sub-heading there.
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
