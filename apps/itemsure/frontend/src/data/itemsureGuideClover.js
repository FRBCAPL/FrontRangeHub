/**
 * User guide: Clover connection, Demo Clover, and Sales vs counts.
 * Same shape as itemsureGuideBasics.js. Plain text only.
 */
export const GUIDE_CLOVER = [
  {
    id: 'clover',
    title: 'Clover',
    summary: 'Connect a merchant, match buttons, and compare sales to counts.',
    paragraphs: [
      'ItemSure reads from Clover. It does not change prices, menus, or orders in Clover. The merchant token is stored on the server, not in your browser.',
      'Under More \u2192 Clover you connect (or see Demo Clover in the Demo Bar), bring in the menu, match Clover buttons to inventory items, set pour amounts, and handle add-ons (modifiers).',
      'Sales vs counts compares what Clover sold between two approved counts with what the counts say was used — including case/bottle conversions and modifiers when those are set up.',
    ],
    steps: [
      'Open More, then Clover (or Point of sale / Connection, depending on your menu labels).',
      'Connect with your merchant id and an API token that can read inventory and orders. Prefer the least access your Clover plan allows for reading.',
      'Choose Get menu from Clover, then match buttons to items and set how much each sale uses.',
      'Pick which site Clover sales belong to.',
      'After two approved counts at that site, open Sales vs counts, pick the From and To counts, and review the comparison. ItemSure brings in sales for that window when needed.',
    ],
    tips: [
      'Demo Bar uses Demo Clover: sample menu and sales already loaded. There is no live token. Use Reset sample to refresh that sample; connect a real merchant only on your own business.',
      'If a button should not affect stock, mark it untracked or ignore it in matching.',
      'Add-ons (Double, Ranch, and so on) can use extra pours or a separate item. Set those on the add-ons screen so Sales vs counts stays accurate.',
      'Refunds and voids in Clover affect what ItemSure brings in as sales; recount or adjust stock the same way you would for any other variance.',
      'If connection or sync fails, check the token still exists in Clover, then Test connection or disconnect and connect again with a new token.',
    ],
  },
];
