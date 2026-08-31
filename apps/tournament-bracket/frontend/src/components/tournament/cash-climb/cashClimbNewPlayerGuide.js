/**
 * General Cash Climb explainer for first-timers.
 * Edit the strings below. This is not tied to tonight's race, fee, or game.
 */
export function cashClimbNewPlayerGuide() {
  return {
    title: 'How Cash Climb works',
    subtitle: 'Win a match, get paid.',
    sections: [
      {
        title: 'What it is',
        body: [
          'Cash Climb is a cash pool tournament. \nYou pay an entry, and the full entry stays in this event.',
          'You earn money during the night by winning matches, \nnot only at the end.',
          'The game is CSI rules. Call your shots. May be 8-Ball, 9-Ball, or 10-Ball.',
          'One house rule: no 9 on the break. If the 9-ball is pocketed on the break, spot it and the shooter continues with the table as it lays.',
        ],
      },
      {
        title: 'Two stages',
        body: [
          'Everyone starts in round robin. \n You keep getting matches until you take 3 losses. Then you are out.',
          'When 3 or less players are remaining, \n the tournament switches to King of the Hill.',
          "Round-robin matches are usually 1 game.\n King of the Hill is usually race to 2.\n Check Player rules for tonight's exact races.",
        ],
      },
      {
        title: 'How you get paid',
        body: [
          'Every match has a posted dollar amount. \nWin the match, you take that cash.',
          'Early matches pay less. Later matches pay more. That is the climb.',
          'A bye pays about half a match win and does not count as a loss.',
          'Money you already won is yours. It is not taken back if you lose later.',
        ],
      },
      {
        title: 'King of the Hill',
        body: [
          'Winner stays on the table. Loser sits down.',
          'Take 2 King of the Hill losses and you are out.',
          'Last player standing is the champion. \nThat means who survived longest, not who has the most cash.',
        ],
      },
      {
        title: 'How the night ends',
        body: [
          '3rd last leftover is paid when that player sits, not at the end.',
          'Leftover King of the Hill money is the championship for last standing.',
          'Leftover round-robin money for 2nd last standing is paid at the end, unless the last two chop remaining leftover 50/50.',
          'The last two players may chop instead of playing for last standing. Match money already won is kept.',
        ],
      },
      {
        title: 'Reading the board',
        body: [
          'The number next to player names is cash rank: who has earned the most so far.',
          'Last standing / 2nd last standing / 3rd last standing is who lasted longest in King of the Hill.',
          'Those two things are not the same. You can be up in cash and still not finish last standing.',
        ],
      },
    ],
  };
}
