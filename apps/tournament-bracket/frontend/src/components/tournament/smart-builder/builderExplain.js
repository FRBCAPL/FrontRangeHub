/** Plain-language labels and trade-offs, built only from measured metrics (no format preferences). */
import { UNCALIBRATED_NOTE } from './builderFlags.js';

export function formatMinutes(min) {
  const m = Math.round(Math.abs(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

export function fitLabel(m) {
  const base = {
    comfortable: 'Fits with room to spare',
    tight: `Fits, with little room (${formatMinutes(m.marginMin)} to spare)`,
    close: `Close: about ${formatMinutes(-m.marginMin)} over`,
    over: `Over by about ${formatMinutes(-m.marginMin)}`,
  }[m.fit];
  return `${base}${m.borderline ? ' \u00b7 borderline' : ''} (estimate)`;
}

export function warnings(m) {
  const out = [];
  if (m.fit === 'tight') out.push('Little room for slow matches: the conservative estimate is under the target by less than 30 minutes.');
  if (m.borderline) out.push('Borderline: this estimate is within 5 minutes of a category limit.');
  (m.flags || []).forEach((f) => out.push(f.text));
  return out;
}

const signed = (n, unit) => `${n > 0 ? '+' : '\u2212'}${Math.abs(n)} ${unit}`;

/** How `alt` differs from `base`, in plain words. */
export function tradeoff(base, alt) {
  const parts = [];
  const dg = alt.guaranteedGames - base.guaranteedGames;
  const dm = alt.guaranteedMatches - base.guaranteedMatches;
  const dr = alt.finalRace - base.finalRace;
  if (dg) parts.push(signed(dg, `guaranteed game${Math.abs(dg) === 1 ? '' : 's'} per player`));
  if (dm) parts.push(signed(dm, `guaranteed match${Math.abs(dm) === 1 ? '' : 'es'} per player`));
  if (dr) parts.push(`championship race ${base.finalRace} \u2192 ${alt.finalRace}`);
  const dt = Math.round(alt.p80 - base.p80);
  if (dt) parts.push(`about ${formatMinutes(dt)} ${dt > 0 ? 'longer' : 'shorter'} (conservative)`);
  const db = Math.round(100 * (alt.breakEvenShare - base.breakEvenShare));
  if (db) parts.push(signed(db, 'pts of players winning back the entry fee'));
  return parts.length ? parts.join('; ') : 'Same on every measured point.';
}

export function summaryLine(m) {
  return `${m.label}: ${formatMinutes(m.p50)} typical, ${formatMinutes(m.p80)} conservative \u2014 ${fitLabel(m)}. `
    + `At least ${m.guaranteedGames} games and ${m.guaranteedMatches} matches per player. `
    + `${Math.round(100 * m.breakEvenShare)}% of players win back the entry fee; the champion takes about ${Math.round(100 * m.championShare)}% of the pool.`;
}

export { UNCALIBRATED_NOTE };
