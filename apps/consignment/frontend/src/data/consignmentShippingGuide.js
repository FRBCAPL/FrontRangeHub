/** Wording for the shipping info modal (home page badge). {shipDays} = days to report a problem. */
export const SHIPPING_GUIDE = {
  on: {
    title: 'Shipping',
    lede: 'Most sales are picked up at Legends, but items marked 🚚 Ships can be shipped to buyers outside Colorado.',
    who: 'Lower 48 states and DC. In Colorado? Pick up and pay in person at Legends.',
    steps: [
      'Find an item marked 🚚 Ships. On its page, tap Buy & ship (case items), or win the auction and choose Ship it to me.',
      'FRPL emails you a secure Square payment link for the price plus shipping & handling. No Colorado sales tax on orders shipped out of state.',
      'FRPL packs it and ships it from Legends with tracking, insured for what you paid.',
      'Something wrong? Report it within {shipDays} days of delivery from My offers & orders.',
    ],
    pricesIntro: 'Shipping & handling starts at these rates and includes insurance for the first {coverage}:',
    pricesNote: 'Over that, add {insurance} per $100 of value, rounded up to the next $5. Some items have their own shipping price; the item page always shows the exact amount.',
  },
  off: {
    title: 'Local pickup only',
    lede: 'Shipping isn’t available at this time. Everything is looked over, paid for and picked up in person at Legends.',
  },
};
