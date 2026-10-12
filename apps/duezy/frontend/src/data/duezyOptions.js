export const DUEZY_PATH = '/duezy';

export const SPORTS = [
  { value: 'pool', label: 'Pool / billiards', short: 'Pool', icon: '🎱' },
  { value: 'darts', label: 'Darts', short: 'Darts', icon: '🎯' },
  { value: 'bowling', label: 'Bowling', short: 'Bowling', icon: '🎳' },
  { value: 'cornhole', label: 'Cornhole', short: 'Cornhole', icon: '🌽' },
  { value: 'softball', label: 'Softball / baseball', short: 'Softball', icon: '🥎' },
  { value: 'volleyball', label: 'Volleyball', short: 'Volleyball', icon: '🏐' },
  { value: 'golf', label: 'Golf', short: 'Golf', icon: '⛳' },
  { value: 'trivia', label: 'Trivia', short: 'Trivia', icon: '🧠' },
  { value: 'other', label: 'Something else', short: 'Other', icon: '🏆' },
];

const OTHER = SPORTS[SPORTS.length - 1];

/** True when the league typed its own sport name under "Other". */
export const isCustomSport = (value) => Boolean(value) && !SPORTS.some((s) => s.value === value);

export const sportOf = (value) => {
  if (isCustomSport(value)) {
    const name = String(value).trim();
    return { ...OTHER, label: name, short: name };
  }
  return SPORTS.find((s) => s.value === value) || OTHER;
};

/** Value to store: trimmed custom name, or 'other' when left blank. */
export const sportToSave = (value) => String(value || '').trim() || 'other';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const METHODS = ['Cash', 'Venmo', 'Cash App', 'Zelle', 'PayPal', 'Card', 'Check'];

/** What a "player" is called when dues are per person. */
export const MEMBER_WORD = {
  golf: 'golfers',
  trivia: 'members',
  default: 'players',
};

export const memberWord = (sport) => MEMBER_WORD[sport] || MEMBER_WORD.default;
