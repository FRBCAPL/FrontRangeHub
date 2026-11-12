/**
 * General Cash Climb explainer for first-timers.
 * Edit the strings below. This is not tied to tonight's race, fee, or game.
 */
import { cashClimbGuideDetails } from './cashClimbGuideDetails.js';

export function cashClimbNewPlayerGuide() {
  return {
    title: 'How Cash Climb King of the Hill works',
    subtitle: 'Win a match, get paid.',
    details: cashClimbGuideDetails(),
    journey: [
      { detail: 'buyin', label: 'Buy in' },
      { detail: 'roundRobin', label: 'Round robin', money: 2 },
      { detail: 'cash', label: 'Collect your cash', money: 3 },
      { detail: 'koth', label: 'King of the Hill', money: 4 },
      { detail: 'finish', label: 'The finish', money: 5 },
    ],
    faq: [
      { q: 'How do I get paid?', detail: 'getPaid' },
      { q: 'What does a bye pay?', detail: 'bye' },
      { q: 'Who wins: most cash or last standing?', detail: 'whoWins' },
      { q: 'Can the last two players chop?', detail: 'chop' },
      { q: 'Are there any house rules?', detail: 'houseRules' },
      { q: 'What do the numbers on the board mean?', detail: 'board' },
    ],
    sections: [
      {
        icon: '\u{1F3AF}',
        title: 'What it is',
        summary: 'A cash pool tournament where you earn during the night.',
        body: [
          'Cash Climb King of the Hill is a cash pool tournament. \nYou pay an entry, and the full entry stays in this event.',
          'You earn money during the night by winning matches, \nnot only at the end.',
          "The game is CSI rules. Call your shots. The director picks 8-Ball, 9-Ball, 10-Ball, mixed, or lagger's choice.",
          'One house rule: no 9 on the break. If the 9-ball is pocketed on the break, spot it and the shooter continues with the table as it lays.',
        ],
      },
      {
        icon: '\u{1F501}',
        title: 'Two stages',
        summary: 'Round robin until 3 losses, then King of the Hill.',
        body: [
          'Everyone starts in round robin. \n You keep getting matches until you take 3 losses. Then you are out.',
          'When 3 or less players are remaining, \n the tournament switches to King of the Hill.',
          "Round-robin matches are usually 1 game.\n King of the Hill is usually race to 2.\n Check Player rules for tonight's exact races.",
        ],
      },
      {
        icon: '\u{1F4B5}',
        title: 'How you get paid',
        summary: 'Win a match, take its posted cash. Later matches pay more.',
        body: [
          'Every match has a posted dollar amount. \nWin the match, you take that cash.',
          'Early matches pay less. Later matches pay more. That is the climb.',
          'A bye pays about half a match win and does not count as a loss.',
          'Money you already won is yours. It is not taken back if you lose later.',
        ],
      },
      {
        icon: '\u{1F451}',
        title: 'King of the Hill',
        summary: 'Winner stays on the table. 2 losses and you are out.',
        body: [
          'Winner stays on the table. Loser sits down.',
          'Take 2 King of the Hill losses and you are out.',
          'Last player standing is the champion. \nThat means who survived longest, not who has the most cash.',
        ],
      },
      {
        icon: '\u{1F3C1}',
        title: 'How the night ends',
        summary: 'Leftover money, last standing, and the optional chop.',
        body: [
          '3rd last leftover is paid when that player sits, not at the end.',
          'Leftover King of the Hill money is the championship for last standing.',
          'Leftover round-robin money for 2nd last standing is paid at the end, unless the last two chop remaining leftover 50/50.',
          'The last two players may chop instead of playing for last standing. Match money already won is kept.',
        ],
      },
      {
        icon: '\u{1F4CA}',
        title: 'Reading the board',
        summary: 'Cash rank and last standing are not the same thing.',
        body: [
          'The number next to player names is cash rank: who has earned the most so far.',
          'Last standing / 2nd last standing / 3rd last standing is who lasted longest in King of the Hill.',
          'Those two things are not the same. You can be up in cash and still not finish last standing.',
        ],
      },
    ],
  };
}
