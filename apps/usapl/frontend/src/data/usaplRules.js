export const USAPL_RULE_GROUPS = [
  {
    id: 'call',
    title: 'Call your shot',
    blurb: 'If it isn’t obvious, call it.',
    items: [
      'No slop. Call pocket (except 9-ball). \nCall the ball and the pocket.',
      '"Gentleman\'s call pocket". \nYou do not have to call obvious shots.',
      'Combos, banks, kicks, and caroms should not be considered obvious.' ,
      'What may be obvious to you, may not be obvious to your opponent.',
      'Make sure your opponent knows what you are calling.',
    ],
  },
  {
    id: 'break',
    title: 'Rack & break',
    blurb: 'Your break, your rack. Keep it moving.',
    items: [
      'Lag or Flip for first break.',
      'Alternate breaks. \n The black dot above the player\'s name in the scoring app indicates the breaker.',
      'Rack your own. \n In 10 ball be sure to place the 2-ball & 3-ball in the bottom corners of the rack.',
      'Open after the break (8-ball).',
      'Ball in hand if you scratch on the break. All formats.',
    ],
  },
  {
    id: 'formats',
    title: 'By the format',
    blurb: '8, 9, and 10 don\'t all play the same.',
    items: [
      'Pocket safes allowed in 8-ball (call a safety and pocket a ball).\n',
      'In 10-ball, a pocketed ball when a safety is called, is an illegally pocketed ball. In 9-ball the player\'s turn continues.',
      'Push out allowed (9-ball and 10-ball only). \n Reagrdless of who breaks, the first shot after the break may be a push out.' ,
      '3-foul rule (9-ball and 10-ball only). \n 3 consecutive fouls results in loss of game.',
    ],
  },
  {
    id: 'table',
    title: 'At the table',
    blurb: 'Use your timeouts wisely.',
    items: [
      'Coaching / timeouts: \n 1 per game, 3 per match, 10 per team — all skill levels.',
      'Only the players or referees can call a foul.',
      'Jump shots & jump cues are allowed. \nDependent on the establishment\'s policy.',
      'Good sportsmanship: \n Player\'s are expected to be friendly and respectful to each other and the staff.',
    ],
  },
];

export const USAPL_RULE_HIGHLIGHTS = USAPL_RULE_GROUPS.flatMap((group) => group.items);
