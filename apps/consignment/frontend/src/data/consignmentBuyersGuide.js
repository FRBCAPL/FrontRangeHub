/**
 * Text for the Buyer's guide window on the shop page. Edit freely.
 * {placeholders} are filled from the public settings: payDays, softClose.
 *
 * Each section is a tab (label = short tab name). Each line is a card:
 * { icon, title, text }. `numbered: true` shows step numbers (for an ordered process).
 */

export const BUYERS_GUIDE_TITLE = 'Buyer’s guide';

export const BUYERS_GUIDE_INTRO =
  'Everything happens in person at Legends Brews & Cues in Colorado Springs, CO. Nothing ships, and this site does not take payment.';

export const BUYERS_GUIDE_SECTIONS = [
  {
    id: 'case',
    icon: '🏪',
    label: 'The case',
    title: 'Buying from the case',
    lines: [
      {
        icon: '🔎',
        title: 'Find it',
        text: 'Fixed-price items are in the case at Legends. Browse here, or scan the QR tag on any item there.',
      },
      {
        icon: '⏱️',
        title: 'No holds',
        text: 'First come, first served. Items aren’t held or reserved online.',
      },
      {
        icon: '💵',
        title: 'Paying',
        text: 'Pay at the register. Prices don’t include sales tax; tax is added when you pay.',
      },
    ],
  },
  {
    id: 'bidding',
    icon: '🔨',
    label: 'On the table (auctions)',
    title: 'On the table: bidding on auctions',
    lines: [
      {
        icon: '🔐',
        title: 'Your account',
        text: 'Log in with your FRPL account to bid. No account? Sign up from the Log in button; FRPL approves new accounts before they can bid.',
      },
      {
        icon: '💲',
        title: 'Opening bid & steps',
        text: 'The opening bid is the seller’s reserve. Bids go up in $5 steps under $500 and $10 steps at $500 and up.',
      },
      {
        icon: '⏰',
        title: 'No sniping',
        text: 'A bid in the last {softClose} minutes adds {softClose} more minutes, so nobody can snipe it at the buzzer.',
      },
      {
        icon: '⚡',
        title: 'Buy It Now',
        text: 'Some auctions have Buy It Now. It disappears once bidding reaches that price.',
      },
      {
        icon: '🏠',
        title: 'Where the item is',
        text: 'Auction items stay with the seller until they sell.',
      },
    ],
  },
  {
    id: 'won',
    icon: '🏆',
    label: 'If you win',
    title: 'If you win',
    numbered: true,
    lines: [
      {
        icon: '📦',
        title: 'Delivered to Legends',
        text: 'The seller brings the item to Legends, and FRPL lets you know when it arrives.',
      },
      {
        icon: '🗓️',
        title: 'Pay & pick up',
        text: 'Then you have {payDays} days to look it over, pay at the register and pick it up.',
      },
      {
        icon: '🚫',
        title: 'Never delivered?',
        text: 'If the seller never delivers it, the sale is cancelled and you owe nothing.',
      },
      {
        icon: '⚠️',
        title: 'Please pay',
        text: 'Winners who don’t pay for an item as described may lose bidding privileges.',
      },
    ],
  },
  {
    id: 'inspect',
    icon: '🔍',
    label: 'Inspecting',
    title: 'Inspecting & sales',
    lines: [
      {
        icon: '🪪',
        title: 'Inspect at Legends',
        text: 'Some items can be inspected at Legends: ask at the bar and staff will hold your ID while you look. You’re responsible for any damage while inspecting.',
      },
      {
        icon: '👀',
        title: 'Check before you pay',
        text: 'Look the item over before you pay. If it isn’t as described, you don’t have to buy it.',
      },
      {
        icon: '✅',
        title: 'Final sale',
        text: 'All sales are final and items are sold as-is once paid.',
      },
    ],
  },
];

export const BUYERS_GUIDE_FOOTER = 'Questions about an item? Ask at the bar at Legends, or message FRPL.';
