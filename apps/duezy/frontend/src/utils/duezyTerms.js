/**
 * Duezy wording, used everywhere on screen:
 *   League   = the organization ("APA of Denver", "Front Range 8-Ball League"). One row, kept for good.
 *   Division = teams that play each other: same night, format, dues and schedule.
 *   Session  = the run of weeks a division plays ("Fall 2026"). Each league picks "season" or "session".
 *   Week     = one league night.
 */

export const SEASON_WORDS = ['season', 'session'];
export const SESSION_LABEL_MAX = 40;

/** { one, One, many, Many } for this league's word ("season" unless it chose "session"). */
export function seasonTerms(league) {
  const one = league?.season_word === 'session' ? 'session' : 'season';
  const cap = one.charAt(0).toUpperCase() + one.slice(1);
  return { one, One: cap, many: `${one}s`, Many: `${cap}s` };
}

/** True once the league row carries season_word (older databases simply don't). */
export const hasSeasonWord = (league) => Boolean(league) && 'season_word' in league;

export const seasonWordToSave = (form, league = form) => (
  hasSeasonWord(league) ? { season_word: form.season_word === 'session' ? 'session' : 'season' } : {}
);

/** A division's session label ("Fall 2026"), or ''. */
export const sessionLabel = (division) => String(division?.session_label || '').trim();

/** "Tuesday 8-Ball · Fall 2026", or just the division name. */
export function divisionTitle(division) {
  const label = sessionLabel(division);
  const name = String(division?.name || '');
  return label ? `${name} · ${label}` : name;
}

export const cleanSessionLabel = (text) => String(text || '').trim().slice(0, SESSION_LABEL_MAX);
