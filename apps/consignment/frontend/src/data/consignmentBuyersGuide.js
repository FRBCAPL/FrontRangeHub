/**
 * Text for the Buyer's guide window on the shop page. Edit freely.
 * {placeholders} are filled from the public settings: payDays, softClose.
 */

export const BUYERS_GUIDE_TITLE = 'Buyer’s guide';

export const BUYERS_GUIDE_INTRO =
  'Everything happens in person at Legends Brews & Cues in Colorado Springs, CO. Nothing ships, and this site does not take payment.';

export const BUYERS_GUIDE_SECTIONS = [
  {
    id: 'case',
    icon: '🏪',
    title: 'Buying from the case',
    lines: [
      'Fixed-price items are in the case at Legends. Browse here, or scan the QR tag on any item there.',
      'First come, first served. Items aren’t held or reserved online.',
      'Pay at the register. Prices don’t include sales tax; tax is added when you pay.',
    ],
  },
  {
    id: 'bidding',
    icon: '🔨',
    title: 'Bidding on auctions',
    lines: [
      'Log in with your FRPL account to bid. No account? Sign up from the Log in button; FRPL approves new accounts before they can bid.',
      'The opening bid is the seller’s reserve. Bids go up in $5 steps under $500 and $10 steps at $500 and up.',
      'A bid in the last {softClose} minutes adds {softClose} more minutes, so nobody can snipe it at the buzzer.',
      'Some auctions have Buy It Now. It disappears once bidding reaches that price.',
      'Auction items stay with the seller until they sell.',
    ],
  },
  {
    id: 'won',
    icon: '🏆',
    title: 'If you win',
    lines: [
      'The seller brings the item to Legends, and FRPL lets you know when it arrives.',
      'Then you have {payDays} days to look it over, pay at the register and pick it up.',
      'If the seller never delivers it, the sale is cancelled and you owe nothing.',
      'Winners who don’t pay for an item as described may lose bidding privileges.',
    ],
  },
  {
    id: 'inspect',
    icon: '🔍',
    title: 'Inspecting & sales',
    lines: [
      'Some items can be inspected at Legends: ask at the bar and staff will hold your ID while you look. You’re responsible for any damage while inspecting.',
      'Look the item over before you pay. If it isn’t as described, you don’t have to buy it.',
      'All sales are final and items are sold as-is once paid.',
    ],
  },
];

export const BUYERS_GUIDE_FOOTER = 'Questions about an item? Ask at the bar at Legends, or message FRPL.';
