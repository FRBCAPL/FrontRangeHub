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
  { result: 'Foul?', then: 'Your turn is over, and your opponent gets ball in hand under normal 8-Ball rules.', tone: 'foul' },
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
export const TRAP_EM_WIN_NOTE = 'All normal CSI 8-Ball rules still apply unless changed by the one-shot-per-turn rule:';

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
