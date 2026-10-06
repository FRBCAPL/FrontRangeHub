export const TRAP_EM_PATH = '/trap-em';

export function isTrapEmPath(pathname) {
  return String(pathname || '').replace(/\/+$/, '') === TRAP_EM_PATH;
}

/** Hash link works on every domain without a server rewrite, so it's what Share copies. */
export function trapEmHref() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${TRAP_EM_PATH}`;
}

export const TRAP_EM_KICKER = 'Front Range Pool League';
export const TRAP_EM_TITLE = 'Trap ’Em';
export const TRAP_EM_SUBTITLE = 'An 8-Ball game of offense & defense';
export const TRAP_EM_TAGLINE = 'Every shot is offense. Every shot is defense.';

export const TRAP_EM_INTRO =
  'Trap ’Em is a strategic variation of 8-Ball where every player gets exactly ONE shot per turn at the table. \n'
  + 'You’re not just trying to pocket your own ball — you’re trying to leave the table in the worst possible position for your opponent.';

export const TRAP_EM_HOW_TITLE = 'How to play';
export const TRAP_EM_HOW_INTRO = 'Played under the current CSI Official Rules for 8-Ball, with one major change:';
export const TRAP_EM_HOW_OUTRO = 'Players alternate one shot at a time until the game is won.';

export const TRAP_EM_CORE_RULE = 'Each player gets exactly ONE shot per turn at the table, regardless of the result of that shot.';

export const TRAP_EM_OUTCOMES = [
  { result: 'Pocket a legal ball?', then: 'Your turn is over.', tone: 'make' },
  { result: 'Miss?', then: 'Your turn is over.', tone: 'miss' },
  { result: 'Play a safety?', then: 'Your turn is over.', tone: 'safe' },
  { result: 'Scratch?', then: 'Your turn is over, and your opponent gets ball in hand.', tone: 'foul' },
  { result: 'Miss the ball or no rail?', then: 'Your turn is over. Your opponent has the option to shoot or make you shoot again.', tone: 'foul' },
];

export const TRAP_EM_RULES_TITLE = 'Rules';
export const TRAP_EM_RULES_INTRO = 'How the one-shot rule works in the situations that come up most.';

export const TRAP_EM_RULES = [
  {
    title: 'The break',
    body: 'If the breaker legally pockets a ball on the break, they get one more shot to try to establish their group. After that shot, the turn passes. If nothing is pocketed, the turn passes right away.',
  },
  {
    title: 'After the break',
    body: 'The table is open. Groups are set the normal CSI way, by the first called ball legally pocketed after the break.',
  },
  {
    title: '8-ball on the break',
    body: 'Handled the same as CSI 8-Ball.',
  },
  {
    title: 'Ball in hand only on a scratch',
    body: 'Ball in hand is given only when the cue ball is scratched. The incoming player places the cue ball anywhere and takes their one shot. Ball in hand does not add an extra shot.',
  },
  {
    title: 'Missed hit or no rail: opponent’s option',
    body: 'If the shooter misses the object ball completely, or no ball reaches a rail after contact, it is a foul but not ball in hand. The opponent chooses: shoot the table as it lies, or give it back and make the shooter shoot again from where the cue ball stopped.',
  },
  {
    title: 'No need to call safe',
    body: 'Every turn ends after one shot, so you never have to declare a safety. Called shots still apply, including the 8-ball.',
  },
  {
    title: 'Pocketing your opponent’s ball',
    body: 'On a legal shot it is not a foul. The ball stays down, and your turn is over like any other shot.',
  },
  {
    title: 'Stalemate',
    body: 'If neither player can make progress, the CSI stalemate rule applies: re-rack, and the original breaker breaks again.',
  },
];

export const TRAP_EM_STRATEGY_TITLE = 'The strategy';
export const TRAP_EM_STRATEGY_INTRO =
  'In regular 8-Ball, making a ball lets you keep shooting, so position play is about leaving yourself a shot.\n '
  + 'In Trap ’Em, your opponent comes to the table after every shot.';
export const TRAP_EM_OLD_QUESTION = 'Can I make my ball?';
/** Text between the asterisks is highlighted in gold. */
export const TRAP_EM_NEW_QUESTION = 'Can I make my ball *and* leave my opponent trapped?';

export const TRAP_EM_STRATEGY_TIPS = [
  'Pocket a ball while hiding the cue ball.',
  'Use your remaining balls as blockers.',
  'Tie up your opponent’s balls.',
  'Avoid opening their problem areas.',
  'Sometimes the best ball to make isn’t the easiest one.',
  'Sometimes a ball is worth more on the table than in a pocket.',
];

export const TRAP_EM_WIN_TITLE = 'Winning the game';
export const TRAP_EM_WIN_BODY = 'Same as standard 8-Ball: legally pocket your group, then legally pocket the 8-ball.';
export const TRAP_EM_WIN_NOTE = 'All normal CSI 8-Ball rules still apply unless changed by the Trap ’Em rules above:';

export const TRAP_EM_REMEMBER_KICKER = 'The rule to remember';
export const TRAP_EM_REMEMBER_BIG = 'ONE TURN. ONE SHOT.';
export const TRAP_EM_REMEMBER_MOTTO = 'Make it. Miss it. Trap ’em.';

export const TRAP_EM_STILL_APPLIES = [
  'The break',
  'Open table',
  'Establishing groups',
  'Legal shots',
  'Called shots',
  'Fouls',
  'Ball in hand',
  'The 8-ball',
  'Loss of game',
];
