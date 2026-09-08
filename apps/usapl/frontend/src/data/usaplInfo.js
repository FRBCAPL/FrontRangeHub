export const USAPL_INFO_TOC = [
  { id: 'format', label: 'Format', blurb: '8-ball, 9-ball, and 10-ball.\nTeam size, skill levels, and Vegas odds.' },
  { id: 'scoring', label: 'Scoring app', blurb: 'Phone scoring, race-to numbers,\nand how points work each game.' },
  { id: 'fargo', label: 'FargoRate', blurb: 'Handicaps, match reporting, \nand the free premium subscription.' },
  { id: 'sanction', label: 'Dual sanction', blurb: 'USAPL, BCAPL, Nationals, \nand which nights are dual-sanctioned.' },
  { id: 'events', label: 'Events', blurb: 'Vegas Cup, Redemption, and how teams advance.' },
  { id: 'links', label: 'Official links', blurb: 'USAPL, BCAPL, CSI, \nand Billiard Congress of America sites.' },
  { id: 'faq', label: 'FAQ', blurb: 'BCA vs BCAPL vs CSI, and the rulebook Front Range actually uses.' },
];

export function usaplInfoTopic(id) {
  if (id === 'faq') return { id: 'faq', title: 'FAQ' };
  if (id === 'links') return { id: 'links', title: 'Official links' };
  return USAPL_INFO_FEATURES.find((row) => row.id === id) || null;
}

export const USAPL_INFO_FEATURES = [
  {
    id: 'format',
    title: 'Format',
    items: [
      'USAPL offers 8-ball, 9-ball, and 10-ball league matches.',
      "All skill levels are welcome. No experience necessary.",
      '5 players play on a team. Maximum of 8 players per team.',
      'Single play and double play divisions are available.',
      'USAPL offers the best odds of winning a trip to a national tournament in Las Vegas — as low as about 1 in 12.',
      'Big-table divisions are available.',
      'No age restrictions. Juniors are welcome.',
    ],
  },
  {
    id: 'scoring',
    title: 'Easy scoring app',
    items: [
      'No weekly paperwork.',
      'All scoring for weekly play is done in the USAPL scoring app.',
      'Unique race-to format. \n Your race-to number may change week to week, or even match to match. \n The app shows each player’s race-to number before you start.',
      'The winner of each game receives 14 points.',
      'In 8-ball, the opponent gets 1 point per ball of their group that is pocketed. \nIn 9-ball and 10-ball the shooter gets credit for legally pocketed balls. \nOnly the loser of the game gets credit for the ball count. \n The winner receives 14 points, regardless of balls pocketed.',
      'Ball count plus a full win for every game means strategy matters. \n Anyone can win against anyone.',
      'No tracking innings or defensive shots. Every rack is completed.',
      'Handoff lets teammates share scoring duties.',
    ],
  },
  {
    id: 'fargo',
    title: 'Powered by FargoRate',
    items: [
      'USAPL uses FargoRate for rankings and handicaps.',
      'Match results are reported automatically to FargoRate. \n Team stats usually show up immediately. \n Player stats often within about 48 hours.',
      'FargoRate is a worldwide dynamic rating system, \nfrom new players to professionals.',
      'Your rating is based on how you perform against opponents, \nand how those opponents perform against theirs. \nThe more people you play, the more the rating can settle in.',
      'FRUSAPL members receive a free FargoRate app premium subscription after 4 weeks of play. Email support from within the FargoRate app\n to request access to the premium subscription.',
    
    ],
  },
  {
    id: 'sanction',
    title: 'Dual sanction',
    items: [
      'As an official CSI pool league we can dual-sanction with USAPL, BCAPL, or both.',
      'USAPL has no yearly player fee. \n BCAPL requires a $25 yearly sanction fee per player.',
      'Each division can be independently dual-sanctioned. \nOnly divisions marked Dual Sanction are dual-sanctioned.',
      'Eligible divisions: play one league and qualify for both the BCAPL and USAPL national tournaments at the CSI expo in Las Vegas, plus state and regional team and individual events.',
      'Teams can win a Las Vegas trip allowance in USAPL Vegas divisions — only in USAPL or dual-sanction Vegas divisions, as stated on the division page.',
      'You do not have to win the Vegas Cup to play in USAPL Nationals, or BCAPL Nationals if the division is dual-sanctioned.',
      'If your team wants to go to Las Vegas but did not win the Vegas Cup, you can still play.',
    ],
  },
  {
    id: 'events',
    title: 'Events',
    items: [
      'Division winners advance to the Vegas Cup tournament.',
      'Remaining teams play in the Redemption tournament for a chance to advance to the Vegas Cup.',
    ],
  },
];
