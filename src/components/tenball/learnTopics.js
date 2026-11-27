import {
  BREAK_OPENING_TIP,
  EIGHT_BREAK_OPENING_TIP,
  EIGHTBALL_TUTORIAL_STEPS,
  NINE_BREAK_OPENING_TIP,
  NINEBALL_TUTORIAL_STEPS,
  TUTORIAL_STEPS
} from './tutorialGuide';

const step = (title) => TUTORIAL_STEPS.find((item) => item.title === title);
const nineStep = (title) => NINEBALL_TUTORIAL_STEPS.find((item) => item.title === title);
const eightStep = (title) => EIGHTBALL_TUTORIAL_STEPS.find((item) => item.title === title);

export const LEARN_TOPICS = [
  {
    id: 'rules',
    label: 'Official CSI 10-Ball Rules',
    steps: [step('Welcome to 10-Ball!'), step('Winning the Game')]
  },
  {
    id: 'break',
    label: 'Break/Push Out Requirements',
    steps: [step('The Break Shot'), step('Push Out Option')],
    moreTips: [BREAK_OPENING_TIP]
  },
  {
    id: 'call',
    label: 'Call Shot/Ball in Hand Requirements',
    steps: [step('Call Shot Rules')],
    moreTips: [
      'Scratch. The cue ball went in. The other player has ball in hand.',
      'The lowest numbered ball had to be hit first. Hitting another ball is a foul, and the other player has ball in hand.',
      'After the hit, a ball has to reach a rail or be pocketed. This is a foul. The other player has ball in hand.'
    ]
  },
  {
    id: 'illegal',
    label: "Illegally Pocketed Balls/Opponent's Option",
    steps: [step('Illegal Ball')]
  },
  {
    id: 'fouls',
    label: 'Foul Detection and Penalties',
    steps: [step('Fouls and Penalties')],
    moreTips: [
      'The cue ball missed every ball. The other player has ball in hand.',
      'The cue ball hit a cushion before the 1-ball. The other player has ball in hand.',
      'The break did not pocket a ball or drive four balls to a rail. The other player has ball in hand.'
    ]
  },
  {
    id: 'planning',
    label: 'Advanced Shot Planning',
    steps: [step('Strategy Tips')]
  }
];

export const NINE_LEARN_TOPICS = [
  {
    id: 'nine-rules',
    label: 'Official CSI 9-Ball Rules',
    steps: [nineStep('Welcome to 9-Ball!'), nineStep('Continuing Play')]
  },
  {
    id: 'nine-rack',
    label: '9-Ball Rack',
    steps: [nineStep('The 9-Ball Rack')]
  },
  {
    id: 'nine-break',
    label: 'Break/Push Out Requirements',
    steps: [nineStep('The Break Shot'), nineStep('Push Out After the Break')],
    moreTips: [NINE_BREAK_OPENING_TIP]
  },
  {
    id: 'nine-fouls',
    label: 'Fouls and Three Fouls',
    steps: [nineStep('Fouls and Three Fouls')],
    moreTips: [
      'Scratch. The cue ball went in. The other player has ball in hand.',
      'The lowest numbered ball had to be hit first. Hitting another ball is a foul, and the other player has ball in hand.',
      'After the hit, a ball has to reach a rail or be pocketed. This is a foul. The other player has ball in hand.'
    ]
  },
  {
    id: 'nine-win',
    label: 'Winning the Game',
    steps: [nineStep('Ready to Play!')],
    moreTips: ['Legally pocket the 9-ball to win, including on the break or on a combination after contacting the lowest ball first.']
  }
];

export const EIGHT_LEARN_TOPICS = [
  {
    id: 'eight-rules',
    label: '8-Ball Rules Overview',
    steps: [eightStep('Welcome to 8-Ball!'), eightStep('Call Shot')]
  },
  {
    id: 'eight-rack',
    label: '8-Ball Rack',
    steps: [eightStep('The 8-Ball Rack')]
  },
  {
    id: 'eight-break',
    label: 'Break and Open Table',
    steps: [eightStep('The Break Shot'), eightStep('Open Table and Groups')],
    moreTips: [EIGHT_BREAK_OPENING_TIP]
  },
  {
    id: 'eight-fouls',
    label: 'Fouls and Losing on the 8',
    steps: [eightStep('Fouls'), eightStep('Call Shot')],
    moreTips: [
      'Scratch. The cue ball went in. The other player has ball in hand.',
      'Wrong ball first. The other player has ball in hand.',
      'Scratch or foul while shooting the 8 loses the game.',
      'There is no three-foul rule in 8-Ball.'
    ]
  },
  {
    id: 'eight-win',
    label: 'Winning the Game',
    steps: [eightStep('Ready to Play!')],
    moreTips: ['Clear your group, call the 8 and the pocket, then pocket it legally to win.']
  }
];
