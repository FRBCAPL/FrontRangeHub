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
  localBylaws: '/usapl/frusapl-bylaws.pdf',
  cashApp: 'https://cash.app/$frusapl',
  cashAppHandle: '$frusapl',
  cashAppQr: '/usapl/frusapl-cashapp-qr.png',
  venmo: 'https://venmo.com/u/duesfrusapl',
  venmoHandle: '@duesfrusapl',
  venmoQr: '/usapl/frusapl-venmo-qr.png',
  duesTracker: '/dues-tracker/index.html',
};

export const USAPL_LEAGUE_NUMBERS = {
  usapl: '2222',
  bcapl: '2345',
};

export const USAPL_DUES_PRODUCTS = {
  team: [
    { id: 'team-single-10', label: 'Team · Single play · $10/player', amount: 50, playType: 'single', perPlayer: 8 },
    { id: 'team-double-10', label: 'Team · Double play · $10/player', amount: 100, playType: 'double', perPlayer: 8 },
    
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
];
