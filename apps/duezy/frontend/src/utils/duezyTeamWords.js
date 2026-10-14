import { memberWord } from '../data/duezyOptions.js';

/**
 * Individuals (darts singles, golf…): dues per player with a team size of 1, so each "team" is one person.
 * Team-basis divisions don't use team size (it's often the default 1), so they always count as teams.
 */
export const isSingles = (unit) => unit?.dues_basis === 'player' && Number(unit?.players_per_match) === 1;

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** { one, One, many, Many } — "team(s)", or "player(s)" / "golfer(s)" / "member(s)" for singles divisions. */
export function entryWords(singles, sport) {
  const many = singles ? memberWord(sport) : 'teams';
  const one = many.replace(/s$/, '');
  return { one, One: cap(one), many, Many: cap(many) };
}

const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/** The existing name this one duplicates (case-insensitive), ignoring `self` when editing. */
export function duplicateOf(name, existingNames = [], self = '') {
  if (!String(name).trim()) return '';
  return existingNames.find((n) => sameName(n, name) && !(self && sameName(n, self))) || '';
}
