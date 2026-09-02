export const USAPL_TENANT_ID = 'frusapl';

export const USAPL_CONTACT = {
  name: 'Front Range USA Pool League',
  phoneDisplay: '(719) 396-0234',
  phoneTel: '7193960234',
  email: 'frontrange@playusapool.com',
  hours: '12:00 pm – 12:00 am, every day',
  operatorName: 'Mark Slam',
};

export const USAPL_VEGAS_BANNER = [
  'Best odds of winning a trip to Vegas!',
  'Approximately 1 in 12 teams \n win a trip to the USAPL Nationals!',
  'Join Now for your chance to win!',
];

export const USAPL_LINKS = {
  facebookPage: 'https://www.facebook.com/FRUSAPL',
  facebookGroup: 'https://www.facebook.com/groups/frusaplayers',
  youtube: 'https://www.youtube.com/UCrf1rnCeTYWCvE7cQXB7Z7A',
  leagueNightVideoId: 'ImLqn5rmwG8',
  leagueNightEmbed: 'https://www.youtube.com/embed/ImLqn5rmwG8?rel=0&modestbranding=1&playsinline=1',
  fargoRate: 'https://www.fargorate.com',
  fargoRateAndroid: 'https://play.google.com/store/apps/details?id=com.fargorate.player',
  fargoRateApple: 'https://apps.apple.com/us/app/fargorate/id1260182370',
  scoringAndroid: 'https://play.google.com/store/search?q=USAPL%20Scoring&c=apps',
  scoringApple: 'https://apps.apple.com/us/app/usapl-scoring-app/id1257913353',
  csiPolicies: 'https://www.playcsipool.com/usapl-policies.html',
  csiRules: 'https://www.playcsipool.com/usapl-rules.html',
  cashApp: 'https://cash.app/$frusapl',
  cashAppHandle: '$frusapl',
  venmo: 'https://venmo.com/u/duesfrusapl',
  venmoHandle: '@duesfrusapl',
  duesTracker: '/dues-tracker/index.html',
};

export const USAPL_LEAGUE_NUMBERS = {
  usapl: '2222',
  bcapl: '2345',
};

export const USAPL_RULE_HIGHLIGHTS = [
  'No slop. Call pocket (except 9-ball).',
  '"Gentleman\'s call pocket" — you do not have to call obvious shots.',
  'Combos, banks, kicks, and caroms are not obvious.',
  'Open after the break (8-ball).',
  'Ball in hand if you scratch on the break.',
  'Pocket safes allowed in 8-ball (call a safety and pocket a ball).',
  'Push out allowed (9-ball and 10-ball).',
  '3-foul rule (9-ball and 10-ball).',
  'Coaching / timeouts: 1 per game, 3 per match, 10 per team — all skill levels.',
  'Jump cues allowed.',
  'Alternate breaks.',
  'Rack your own.',
  'Good sportsmanship.',
];

export const USAPL_DUES_PRODUCTS = {
  team: [
    { id: 'team-single-8', label: 'Team · Single play · $8/player', amount: 40, playType: 'single', perPlayer: 8 },
    { id: 'team-double-8', label: 'Team · Double play · $8/player', amount: 80, playType: 'double', perPlayer: 8 },
    { id: 'team-single-10', label: 'Team · Single play · $10/player', amount: 50, playType: 'single', perPlayer: 10 },
  ],
  individual: [
    { id: 'ind-single-8', label: 'Individual · Single play · $8', amount: 8, playType: 'single', perPlayer: 8 },
    { id: 'ind-double-8', label: 'Individual · Double play · $16', amount: 16, playType: 'double', perPlayer: 8 },
    { id: 'ind-single-10', label: 'Individual · Single play · $10', amount: 10, playType: 'single', perPlayer: 10 },
    { id: 'ind-double-10', label: 'Individual · Double play · $20', amount: 20, playType: 'double', perPlayer: 10 },
  ],
};

export const USAPL_NAV = [
  { to: '/usapl', label: 'Home', end: true },
  { to: '/usapl/signup', label: 'Sign up' },
  { to: '/usapl/divisions', label: 'Divisions' },
  { to: '/usapl/vegas-cup', label: 'Vegas Cup' },
  { to: '/usapl/rules', label: 'Rules' },
  { to: '/usapl/dues', label: 'Dues' },
  { to: '/usapl/roster', label: 'Roster' },
  { to: '/usapl/singles', label: 'Singles' },
];
