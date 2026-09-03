export const USAPL_RULE_GROUPS = [
  {
    id: 'call',
    title: 'Call your shot',
    blurb: 'If it isn’t obvious, say it.',
    items: [
      'No slop. Call pocket (except 9-ball). \nCall the ball and the pocket.',
      '"Gentleman\'s call pocket". \nYou do not have to call obvious shots.',
      'Combos, banks, kicks, and caroms should not be considered obvious.  What may be obvious to you, may not be obvious to your opponent.',
    ],
  },
  {
    id: 'break',
    title: 'Break & rack',
    blurb: 'You rack. You break next. Keep it moving.',
    items: [
      'Open after the break (8-ball).',
      'Ball in hand if you scratch on the break. All formats',
      'Alternate breaks.',
      'Rack your own.',
    ],
  },
  {
    id: 'formats',
    title: 'By the format',
    blurb: 'A few extras depending on the game.',
    items: [
      'Pocket safes allowed in 8-ball (call a safety and pocket a ball). \n In 10-ball, a pocketed ball when a safety is called, is an illegally pocketed ball',
      'Push out allowed (9-ball and 10-ball).',
      '3-foul rule (9-ball and 10-ball).',
    ],
  },
  {
    id: 'table',
    title: 'At the table',
    blurb: 'Help your team. Don’t help too much.',
    items: [
      'Coaching / timeouts: 1 per game, 3 per match, 10 per team — all skill levels.',
      'Jump shots & jump cues are allowed. \nDependent on the establishment\'s policy',
      'Good sportsmanship.',
    ],
  },
];

export const USAPL_RULE_HIGHLIGHTS = USAPL_RULE_GROUPS.flatMap((group) => group.items);
