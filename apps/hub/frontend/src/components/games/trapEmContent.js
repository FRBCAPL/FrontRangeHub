export const TRAP_EM_PATH = '/trap-em';

export function isTrapEmPath(pathname) {
  return String(pathname || '').replace(/\/+$/, '') === TRAP_EM_PATH;
}

/**
 * Share copies the static page (FrontEnd/public/trap-em/, built by scripts/build-trap-em-static.mjs):
 * real HTML that link previews and AI tools can read. Hash links only ever show them the homepage.
 */
export function trapEmHref() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${TRAP_EM_PATH}/`;
}

export const TRAP_EM_KICKER = 'Front Range Pool League';
export const TRAP_EM_TITLE = 'Trap ’Em';
export const TRAP_EM_SUBTITLE = 'An 8-Ball game of offense & defense';
export const TRAP_EM_TAGLINE = 'Every shot is offense. Every shot is defense.';

export const TRAP_EM_INTRO =
  'Trap ’Em is a strategic variation of 8-Ball where every player gets exactly ONE shot per turn at the table. \n'
  + 'You’re not just trying to pocket your own ball — you’re trying to play safe against your opponent.';

export const TRAP_EM_HOW_TITLE = 'How to play';
export const TRAP_EM_HOW_INTRO = 'Played under the current CSI Official Rules for 8-Ball, with a few Trap ’Em specific rules:';
export const TRAP_EM_HOW_OUTRO = 'Players alternate one shot at a time until the game is won.';

export const TRAP_EM_CORE_RULE = 'Each player gets exactly ONE shot per turn at the table, regardless of the result of that shot.';
export const TRAP_EM_CORE_EXCEPTION = 'The one exception: a ball legally pocketed on the break earns the breaker one more shot.';

export const TRAP_EM_OUTCOMES = [
  { result: 'Pocket a legal ball?', then: 'Your turn is over.', tone: 'make' },
  { result: 'Miss?', then: 'Your turn is over.', tone: 'miss' },
  { result: 'Play a safety?', then: 'Your turn is over.', tone: 'safe' },
  { result: 'Scratch?', then: 'Your turn is over, and your opponent gets ball in hand.', tone: 'foul' },
  { result: 'Bad hit or no rail?', then: 'Your turn is over. Your opponent may shoot it as it lies or make you shoot again.', tone: 'foul' },
];

export const TRAP_EM_RULES_TITLE = 'Rules';
export const TRAP_EM_RULES_INTRO = 'Tap a rule to read it.';

/** `short` is the one-line version printed on the table card. */
export const TRAP_EM_RULES = [
  {
    title: 'The break',
    body: 'If the breaker legally pockets a ball on the break, they get one more shot to try to establish their group.\n After that shot, the turn passes. If nothing is pocketed, the turn passes right away.',
    short: 'Pocket a ball on the break and you get one more shot to set your group.',
  },
  {
    title: 'After the break',
    body: 'The table is open. To claim a group, call the ball and pocket it legally. \nA ball that drops without a call does not set the groups, and the table stays open.',
    short: 'Open table. Call it and pocket it to claim a group.',
  },
  {
    title: '8-ball on the break',
    body: 'Handled the same as CSI 8-Ball.',
    short: 'Same as CSI 8-Ball.',
  },
  {
    title: 'When to call your shot',
    body: 'Only two shots need a call: any shot at the 8-ball, and a shot on an open table that you want to set your group. \nPocketing the 8 without calling it, or in a pocket you didn’t call, loses the game. \nOnce groups are set, no other calls are needed except for the 8-ball.',
    short: 'Call the 8, and call open-table shots to set groups. 8 uncalled or in the wrong pocket loses.',
  },
  {
    title: 'Ball in hand only on a scratch',
    body: 'Ball in hand is given only when the cue ball is scratched. Ball in hand does not add an extra shot.',
    short: 'Only a scratch gives ball in hand. Still one shot.',
  },
  {
    title: 'Bad hit or no rail: opponent’s option',
    body: 'If the shooter fails to hit a ball of their own group first, or no ball reaches a rail after contact, it is a foul but not ball in hand. \nThe opponent may shoot the table as it lies, or make the shooter shoot again from where the balls stopped. \nThat shot is the shooter’s one shot, and then the turn passes as normal. \nOn an open table, any ball except the 8 counts as the shooter’s group.',
    short: 'Wrong ball first or no rail: opponent shoots as it lies, or makes you shoot again from there.',
  },
  {
    title: 'Pocketing your opponent’s ball',
    body: 'On a legal shot it is not a foul. The ball stays down, and your turn is over like any other shot.',
    short: 'Not a foul on a legal shot. It stays down.',
  },
  {
    title: 'Stalemate',
    body: 'If neither player can make progress, the CSI stalemate rule applies: re-rack, and the original breaker breaks again.',
    short: 'CSI stalemate rule applies.',
  },
];

export const TRAP_EM_FORMAT_TITLE = 'Tournament format';
export const TRAP_EM_FORMAT = [
  { label: 'Race', value: 'Race to 3 (race to 2 for shorter brackets)' },
  { label: 'Breaks', value: 'Alternate breaks (standard CSI)' },
  { label: 'Stalemates', value: 'CSI rules' },
  { label: 'Everything else', value: 'CSI match procedures' },
];

export const TRAP_EM_CARD_TITLE = 'Trap ’Em · Table card';

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
  'Fouls',
  'Ball in hand',
  'The 8-ball',
  'Loss of game',
];
