export const DENVER_METRO_CASH_ID = 'denver-metro-cash';

export function isDenverMetroCash(division) {
  return String(division?.id || '') === DENVER_METRO_CASH_ID;
}

export function usaplMetroLines(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/\n|\\n/);
}

export const DENVER_METRO_SNAPSHOT = [
  { label: 'When', value: 'Tuesdays at 7 PM' },
  { label: 'Where', value: 'Denver Metro — home and away' },
  { label: 'Format', value: '8-ball + 10-ball double play' },
  { label: 'Team', value: '5 players per format' },
  { label: 'Dues', value: '$10 per player per format' },
  { label: 'Membership', value: 'No annual membership fee' },
  { label: 'Payouts', value: 'Separate 8-ball and 10-ball cash.\nNo playoffs — final standings pay.' },
];

export const DENVER_METRO_PROMOS = [
  {
    id: 'finish-strong',
    title: 'Finish Strong Cash Drawing',
    src: '/usapl/denver-metro-finish-strong.jpg',
    alt: 'Finish Strong Cash Drawing. Complete the full session but don’t cash in either format? You’re still in the money.',
    points: [
      'Complete the Fall session in good standing and don’t cash in either format.',
      'Click the graphic for full eligibility and how the drawing works.',
    ],
    rules: {
      hook: 'Didn’t cash in 8-Ball or 10-Ball? You’re not out yet.',
      intro: [
        'Complete the Fall Cash Session in good standing and, if your team doesn’t earn a standings payout in either format, you’ll be entered into the Finish Strong Cash Drawing.',
      ],
      highlight: 'One eligible team wins the cash prize.',
      sections: [
        {
          title: 'To Qualify',
          bullets: [
            'Complete the entire Fall Cash Session',
            'Finish in good standing',
            'Do not receive a cash payout in 8-Ball or 10-Ball',
          ],
          paragraphs: [
            'Good Standing: Complete all required scheduled matches, and pay league dues within 48 hours of each match.',
          ],
        },
      ],
      closer: [
        'Finish the season. Finish strong. You could still cash.',
      ],
    },
  },
  {
    id: 'team-credit',
    title: '$100 January Team Credit',
    src: '/usapl/denver-metro-team-credit.jpg',
    alt: '$100 team credit for the January 2027 session',
    points: [
      'Complete Fall 2026 with dues paid within 48 hours of each match and earn $100 toward January 2027.',
      'Credit applies at $20 per league week. Click the graphic for the full rules.',
    ],
    rules: {
      hook: 'Finish this session. Come back in January. Get $100 toward your team.',
      intro: [
        'Complete the Fall Cash Session and your team can earn a $100 credit toward the January 2027 Denver Metro Vegas-qualifying session.',
      ],
      highlight: 'The credit may be used at a maximum of $20 per league week until the full $100 has been used.',
      sections: [
        {
          title: 'To Qualify',
          bullets: [
            'Complete the entire Fall Cash Session',
            'Pay each week’s league dues within 48 hours of the time the match was played',
            'Return in January 2027 with at least 3 players from your Fall roster',
          ],
          paragraphs: [
            'A dues payment more than 48 hours after the match is played is late \nand makes the team ineligible.',
          ],
        },
        {
          title: 'Using your team credit',
          bullets: [
            'Applied at a maximum of $20 per league week',
            'Continues each week until the full $100 is used',
            'Has no cash value and cannot be transferred to another team',
            'Any unused credit is forfeited if the team withdraws from the January session',
          ],
          paragraphs: [
            'Example: If weekly team dues are $100, the credit takes $20 off that night. The team pays $80, and $80 credit remains. Next week, another $20, and so on for at least five weeks.',
          ],
        },
      ],
      closer: [
        'JANUARY 2027 — THE ROAD TO VEGAS 2028 BEGINS',
      ],
    },
  },
];
