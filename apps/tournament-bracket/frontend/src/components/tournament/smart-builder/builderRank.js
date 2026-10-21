/**
 * Fit classes, scoring and the recommendation. All classes use the conservative (P80) estimate:
 *   comfortable  P80 <= target - 30          preferred
 *   tight        target - 30 < P80 <= target  may be recommended, with a little-room warning
 *   close        target < P80 <= target + 30  never presented as fitting
 *   over         P80 > target + 30            comparison only
 * Duration earns no score inside a class, so the Builder never just picks the shortest event.
 */
import {
  COMFORT_MARGIN_MIN, CLOSE_MARGIN_MIN, BORDERLINE_MIN, MEANINGFUL_GAIN, WEIGHTS, SCALES,
} from './builderFlags.js';
import { familyOf } from './builderCandidates.js';

export const FIT_ORDER = ['comfortable', 'tight', 'close', 'over'];
const FITTING = new Set(['comfortable', 'tight']);

export function fitClass(p80, targetMin) {
  if (p80 <= targetMin - COMFORT_MARGIN_MIN) return 'comfortable';
  if (p80 <= targetMin) return 'tight';
  if (p80 <= targetMin + CLOSE_MARGIN_MIN) return 'close';
  return 'over';
}

export function isBorderline(p80, targetMin) {
  return [targetMin - COMFORT_MARGIN_MIN, targetMin, targetMin + CLOSE_MARGIN_MIN].some((b) => Math.abs(p80 - b) <= BORDERLINE_MIN);
}

const clamp = (x) => Math.max(0, Math.min(1, x));

export function criteria(m) {
  return {
    guaranteedGames: clamp(m.guaranteedGames / SCALES.guaranteedGames),
    guaranteedMatches: clamp(m.guaranteedMatches / SCALES.guaranteedMatches),
    opponents: clamp(m.minOpponents / SCALES.opponents),
    finalRace: clamp(m.finalRace / SCALES.finalRace),
    payoutBreadth: clamp(m.breakEvenShare),
    tableUse: clamp(m.tableUse),
  };
}

export const score = (m) => Object.entries(criteria(m)).reduce((t, [k, v]) => t + WEIGHTS[k] * v, 0);

/** True when `tight` offers more participation or a better championship than `comfortable`. */
export function meaningfulGain(tight, comfortable) {
  return tight.guaranteedGames - comfortable.guaranteedGames >= MEANINGFUL_GAIN.guaranteedGames
    || tight.guaranteedMatches - comfortable.guaranteedMatches >= MEANINGFUL_GAIN.guaranteedMatches
    || tight.finalRace - comfortable.finalRace >= MEANINGFUL_GAIN.finalRace;
}

export function classify(evaluated, targetMin) {
  return evaluated.map((m) => ({
    ...m,
    fit: fitClass(m.p80, targetMin),
    borderline: isBorderline(m.p80, targetMin),
    marginMin: targetMin - m.p80,
    score: score(m),
  }));
}

function order(a, b) {
  const byClass = FIT_ORDER.indexOf(a.fit) - FIT_ORDER.indexOf(b.fit);
  if (byClass) return byClass;
  if (FITTING.has(a.fit)) return b.score - a.score || a.p80 - b.p80;
  return b.marginMin - a.marginMin || b.score - a.score;
}

/**
 * primary:     best Comfortable option, else best Tight (with its warning), else none
 * fullerEvent: best Tight option that meaningfully beats the Comfortable primary
 * alternatives: best fitting option of each other family
 * close:       options up to 30 minutes over, never presented as fitting
 */
export function recommend(evaluated, targetMin) {
  const rows = classify(evaluated, targetMin).sort(order);
  const comfortable = rows.filter((r) => r.fit === 'comfortable');
  const tight = rows.filter((r) => r.fit === 'tight');
  const primary = comfortable[0] || tight[0] || null;
  const fullerEvent = primary?.fit === 'comfortable' ? tight.find((t) => meaningfulGain(t, primary)) || null : null;
  const shown = new Set([primary, fullerEvent].filter(Boolean).map(familyOf));
  const alternatives = [];
  rows.filter((r) => FITTING.has(r.fit)).forEach((r) => {
    if (!shown.has(familyOf(r))) { shown.add(familyOf(r)); alternatives.push(r); }
  });
  return {
    targetMin,
    rows,
    primary,
    fullerEvent,
    alternatives,
    close: rows.filter((r) => r.fit === 'close'),
    nothingFits: !primary,
  };
}
