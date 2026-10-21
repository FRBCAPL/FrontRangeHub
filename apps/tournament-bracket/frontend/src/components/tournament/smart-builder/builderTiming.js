/**
 * The one set of timing assumptions every format is simulated with. Nothing here is measured: every value
 * is an operator-adjustable guess, so every duration the Builder reports is an uncalibrated estimate.
 */
import { seededRandom } from '../showdown/showdownRandom.js';

export const DEFAULT_ASSUMPTIONS = Object.freeze({
  minutesPerGame: 10,
  gameTimeCv: 0.35,
  changeoverMin: 3,
  roundTransitionMin: 2,
  bracketSetupMin: 10,
  lagMin: 2,
  field: 'mixed',
});

export function assumptionsWith(overrides = {}) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...overrides };
  if (!(a.minutesPerGame > 0)) throw new Error('Minutes per game must be more than 0.');
  if (!['mixed', 'even'].includes(a.field)) throw new Error('Field must be "mixed" or "even".');
  return a;
}

function normal(random) {
  const u = Math.max(random(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** One game's minutes: lognormal with mean `minutesPerGame`. */
export function gameMinutes(a, random) {
  const s2 = Math.log(1 + a.gameTimeCv ** 2);
  return Math.exp(Math.log(a.minutesPerGame) - s2 / 2 + Math.sqrt(s2) * normal(random));
}

/** "even": every game 50/50. "mixed": skills from -1 to 1, game won with logistic(skill difference). */
export function makeSkills(ids, a, random) {
  return Object.fromEntries(ids.map((id) => [id, a.field === 'even' ? 0 : random() * 2 - 1]));
}

const pGame = (skills, x, y) => 1 / (1 + Math.exp(-(skills[x] - skills[y])));

/** Plays one match game by game: a race (`raceTo`) or a fixed number of games (`games`). */
export function playMatch({ p1, p2, raceTo = Infinity, games = Infinity }, skills, a, random) {
  let s1 = 0;
  let s2 = 0;
  let minutes = a.changeoverMin;
  while (s1 + s2 < games && s1 < raceTo && s2 < raceTo) {
    if (random() < pGame(skills, p1, p2)) s1 += 1; else s2 += 1;
    minutes += gameMinutes(a, random);
  }
  return { s1, s2, minutes };
}

export function percentile(values, p) {
  const sorted = [...values].sort((x, y) => x - y);
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

/** Stable 32-bit seed from text, so a candidate's runs are the same on every call. */
export function seedFor(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export { seededRandom };
