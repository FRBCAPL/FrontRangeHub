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
  'Trap ’Em is a strategic variation of 8-Ball where every player gets exactly ONE shot per inning. \n'
  + 'You’re not just trying to pocket your own ball — you’re trying to play safe against your opponent.';

export const TRAP_EM_HOW_TITLE = 'How to play';
export const TRAP_EM_HOW_INTRO = 'Played under the current CSI Official Rules for 8-Ball, with a few Trap ’Em specific rules:';
export const TRAP_EM_HOW_OUTRO = 'Players alternate innings until the game is won.';

export const TRAP_EM_CORE_RULE = 'Each player gets exactly ONE shot per inning, regardless of the result of that shot.';
export const TRAP_EM_INNING_NOTE = 'Like baseball, an inning is one turn for each player. In Trap ’Em every turn is a single shot, so an inning is one shot each.';
export const TRAP_EM_CORE_EXCEPTION = 'Exceptions: a ball legally pocketed on the break earns one more shot, and after a non-scratch foul your opponent may make you shoot again.';

export const TRAP_EM_OUTCOMES = [
  { result: 'Pocket a legal ball?', then: 'Your turn is over.', tone: 'make' },
  { result: 'Miss?', then: 'Your turn is over.', tone: 'miss' },
  { result: 'Play a safety?', then: 'Your turn is over.', tone: 'safe' },
  { result: 'Scratch or cue ball off the table?', then: 'Your turn is over, and your opponent gets ball in hand.', tone: 'foul' },
  { result: 'Bad hit, no rail, or other foul?', then: 'Your turn is over. Your opponent may shoot it as it lies or make you shoot again.', tone: 'foul' },
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
    body: 'The table is open. To claim a group, call the ball and pocket it legally. \nThis(and the 8-ball) is the only time you need to call your shot. \nA ball that drops without a call does not set the groups, and the table stays open.',
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
    title: 'Ball in hand: cue ball scratched or off the table',
    body: 'Pocketing the cue ball or driving it off the table gives the opponent ball in hand. Ball in hand does not add an extra shot. \nThree fouls in a row also gives ball in hand (rule 7). \nAll other fouls give the opponent the choice in rule 6. \nCSI loss-of-game fouls still apply.',
    short: 'Ball in hand, but still one shot. Other fouls: rule 6.',
  },
  {
    title: 'Other fouls: opponent’s option',
    body: 'Any foul other than a cue-ball scratch or off table is not ball in hand. \nThe opponent may shoot the table as it lies, or make the shooter shoot again from where the balls stopped. \nThe cue ball must first hit a ball of the shooter’s group, or the 8 once their group is cleared (on an open table, any ball except the 8). \nAfter that contact, a ball must be pocketed or some ball must hit a rail. \nA shoot-again shot follows the same rules, so if it is also a foul, the opponent chooses again. \nFouls that lose the game under CSI 8-ball rules still lose.',
    short: 'Bad hit, no rail, etc.: opponent shoots as it lies, or makes you shoot again.',
  },
  {
    title: 'Three fouls in a row',
    body: 'Like the 10-Ball three-foul rule, but the penalty is ball in hand instead of loss of game. \nIf the same player fouls on three of their own shots in a row, including shoot-again shots, the opponent gets ball in hand. \nThe opponent must tell the player when they are on two fouls.\n Without that warning, the third foul does not count toward the rule. \nA legal shot by that player resets the count.',
    short: '3 fouls in a row (with a warning at 2) = ball in hand.',
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
export const TRAP_EM_OLD_QUESTION = 'Can I make my ball & get position?';
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
export const TRAP_EM_LOSS_TITLE = 'You lose the game if you:';
export const TRAP_EM_LOSS = [
  'Pocket the 8 before your group is cleared (except on the break).',
  'Pocket the 8 without calling it, or in a pocket you didn’t call.',
  'Scratch or foul on the shot that pockets the 8.',
  'Drive the 8 off the table.',
];
export const TRAP_EM_WIN_NOTE = 'Everything not covered above follows CSI 8-Ball rules.';

export const TRAP_EM_REMEMBER_KICKER = 'The rule to remember';
export const TRAP_EM_REMEMBER_BIG = 'ONE TURN. ONE SHOT.';
export const TRAP_EM_REMEMBER_MOTTO = 'Make it. Miss it. Trap ’em.';