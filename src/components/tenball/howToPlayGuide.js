/**
 * Shared How to Play / Controls guide for all Play Pool modes.
 * Rules tutorials stay in tutorialGuide.js — this covers the UI and shot flow.
 */

export const HOW_TO_PLAY_STEPS = [
  {
    title: 'Aiming',
    content:
      'Move the mouse over the table (or drag the felt on a phone/tablet), or drag the cue stick to aim. Use the ‹ › buttons to nudge aim. On desktop you can also scroll the mouse wheel for fine tuning — hold Shift for smaller steps.',
    proTip: 'Lock Aim when you’re happy with the line, then fine tune with the mouse wheel or ‹ › buttons.'
  },
  {
    title: 'Lock aim, fine tune, then Shoot',
    content:
      'Tap Lock Aim (or click the felt) to freeze the aim line. The main button then becomes Shoot. Before shooting, fine tune the aim with the mouse wheel or ‹ › buttons.',
    proTip: 'You can unlock the aim line by clicking the felt or tapping the Lock Aim button again. Speed and Spin can affect aiming line.'
  },
  {
    title: 'Call your shot',
    content:
      'When call shot is on, the banner above the table shows the called ball and pocket. Tap a ball in the tracker to choose it, then tap a pocket on the table. Use Clear call (or Escape) to cancel — the call stays empty until you pick again. Change the ball or pocket anytime before you shoot.',
    proTip: 'Obvious shots may be called automatically. Use Clear call to cancel a call. '
  },
  {
    title: 'Power and spin',
    content:
      'The Power ladder on the side sets how hard you hit — higher means a harder stroke. The Spin control sets english (follow, draw, left, right). Soft power and little spin are easier to time; max power with heavy spin makes the timing meter faster and the green zone smaller.',
    proTip: 'You can still change power and spin after Lock Aim, right up until you open the timing meter.'
  },
  {
    title: 'Time your hit',
    content:
      'After Shoot, a timing meter appears. A marker sweeps across a green target zone with a gold perfect mark in the center. Tap the meter, Strike, or the main Strike button when the marker is in the green. Dead center is an exact stroke; anywhere in green is still a strong hit. Miss the green and the odds of missing the shot increase.',
    proTip: 'Cancel closes the meter without shooting so you can re-aim. Soft strokes give you more time and a wider green zone.'
  },
  {
    title: 'After the break — Push Out',
    content:
      'On 9-Ball and 10-Ball, after a legal break players may Push Out: move the cue without needing contact or a rail. When that shot settles, the other player chooses Take the table or Give shot back.',
    proTip: 'Use a push out when the leave is awkward — then hope your opponent doesn’t love the new spot either.'
  },
  {
    title: 'Scoreboard, fouls, and menu',
    content:
      'The scoreboard shows whose turn it is, session or match score, and foul notes. Sticky foul banners explain what went wrong until you dismiss them. Game menu covers reset, edit match, and related options. When a rack ends you can play again or return to the menu.',
    proTip: 'Open Show Tutorial anytime for CSI rules. Open How to Play anytime for these controls.'
  }
];

export const HOW_TO_PLAY_TOPIC = {
  id: 'how-to-play',
  label: 'How to Play / Controls',
  steps: HOW_TO_PLAY_STEPS
};
