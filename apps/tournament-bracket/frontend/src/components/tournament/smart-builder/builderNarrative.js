/**
 * Plain-English text for the Smart Builder screen. Every number comes from a Builder result (or the
 * operator's own inputs); nothing here estimates, ranks or recommends on its own.
 */
import { formatMinutes as fm } from './builderExplain.js';
import { familyOf } from './builderCandidates.js';
import { formatFor } from '../showdown/showdownFormats.js';
import { CLOSE_MARGIN_MIN, REFINE_BAND_MIN } from './builderFlags.js';

/** Beyond this many minutes over the limit the search stops early, so the estimate is only "over". */
export const FAR_OVER_MIN = CLOSE_MARGIN_MIN + REFINE_BAND_MIN;

const pct = (x) => `${Math.round(100 * x)}%`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const list = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

export const FIT_NAMES = { comfortable: 'Comfortable fit', tight: 'Tight fit', close: 'Close, but over', over: 'Over' };
export const FAMILIES = ['Cash Climb King of the Hill', 'Showdown V1', 'Showdown V2', 'Showdown V3'];

export function formatName(m) {
  return m.family === 'cash-climb' ? 'Cash Climb King of the Hill' : `Cash Climb Showdown \u2014 V${m.version}`;
}

export function formatSubtitle(m) {
  return m.family === 'cash-climb' ? 'Round robin, 3-loss cut, then King of the Hill' : formatFor(m.version)?.name || '';
}

export function settingsText(m) {
  if (m.family === 'cash-climb') return `Round robin race to ${m.raceTo} \u00b7 King of the Hill race to ${m.kohRaceTo}`;
  if (m.version === 3) return `${m.qualifyingGames} games per qualifying match \u00b7 Playoffs race to ${m.playoffRaceTo}`;
  return `Qualifying race to ${m.qualifyingRaceTo} \u00b7 Playoffs race to ${m.playoffRaceTo}`;
}

export function shortName(m) {
  if (m.family === 'cash-climb') return `Cash Climb King of the Hill race ${m.raceTo} / KOH ${m.kohRaceTo}`;
  if (m.version === 3) return `Showdown V3 (${m.qualifyingGames} games / race ${m.playoffRaceTo})`;
  return `Showdown V${m.version}`;
}

export function slackText(m) {
  if (m.marginMin >= 1) return `Leaves about ${fm(m.marginMin)} before your time limit (conservative estimate).`;
  if (m.marginMin > -1) return 'Finishes right at your time limit (conservative estimate).';
  return `Runs about ${fm(-m.marginMin)} past your time limit (conservative estimate).`;
}

export function guaranteeLines(m) {
  return [
    `Every player gets at least ${plural(m.guaranteedMatches, 'match', 'matches')} and ${plural(m.guaranteedGames, 'game', 'games')}, if every match is played.`,
    `Championship: race to ${m.finalRace}.`,
  ];
}

export function payoutLines(m, { entrants, entryFee }) {
  if (!(entryFee > 0)) return ['No entry fee, so there is no prize pool.'];
  const pool = entrants * entryFee;
  return [
    `${pct(m.breakEvenShare)} of players win back at least their $${entryFee} entry fee.`,
    `${pct(m.cashShare)} of players win some money.`,
    `The champion takes about ${pct(m.championShare)} of the $${pool} prize pool (about $${Math.round(m.championShare * pool)}).`,
  ];
}

const LEADS = [
  ['guaranteedGames', 'the most guaranteed games per player'],
  ['guaranteedMatches', 'the most guaranteed matches'],
  ['finalRace', 'the longest championship race'],
  ['breakEvenShare', 'the most players winning back their entry fee'],
  ['minOpponents', 'the most different opponents'],
  ['tableUse', 'the busiest tables'],
];

/** Why the primary option was picked, from the ranked rows. */
export function whyRecommended(rec) {
  const p = rec.primary;
  if (!p) return [];
  const out = [p.fit === 'comfortable'
    ? `It fits with room to spare: even the conservative estimate leaves ${fm(p.marginMin)} before your time limit.`
    : `Nothing fits with a 30-minute cushion, so this is the best option that still fits, with ${fm(p.marginMin)} to spare on the conservative estimate.`];
  const peers = rec.rows.filter((r) => r.fit === p.fit && r.id !== p.id);
  const group = p.fit === 'comfortable' ? 'fit comfortably' : 'fit';
  if (!peers.length) out.push(`It is the only option that would ${group === 'fit' ? 'fit' : 'fit with that cushion'}.`);
  else {
    const leads = LEADS.filter(([k]) => peers.every((r) => p[k] >= r[k] - 1e-9)).map(([, text]) => text);
    const others = `the other ${plural(peers.length, 'option', 'options')} that ${group}`;
    out.push(leads.length
      ? `Compared with ${others}, it has ${list(leads.slice(0, 3))}.`
      : `It has the best overall balance of guaranteed play, variety and payouts among ${others}.`);
  }
  const quicker = rec.rows.filter((r) => ['comfortable', 'tight'].includes(r.fit) && r.p80 <= p.p80 - 15).sort((a, b) => a.p80 - b.p80)[0];
  if (quicker) out.push(`${shortName(quicker)} would finish about ${fm(p.p80 - quicker.p80)} sooner, but it scores lower on play, variety and payouts; the Builder does not reward finishing early.`);
  return out;
}

/** How `alt` differs from `base`, as one plain sentence. */
export function tradeoffSentence(base, alt) {
  const pros = [];
  const cons = [];
  const games = alt.guaranteedGames - base.guaranteedGames;
  if (games > 0) pros.push(`${plural(games, 'more guaranteed game', 'more guaranteed games')} per player`);
  if (games < 0) cons.push(`has ${plural(-games, 'fewer guaranteed game', 'fewer guaranteed games')} per player`);
  const matches = alt.guaranteedMatches - base.guaranteedMatches;
  if (matches > 0) pros.push(`${plural(matches, 'more guaranteed match', 'more guaranteed matches')}`);
  if (matches < 0) cons.push(`has ${plural(-matches, 'fewer guaranteed match', 'fewer guaranteed matches')}`);
  const race = `(race to ${alt.finalRace} instead of ${base.finalRace})`;
  if (alt.finalRace > base.finalRace) pros.push(`a longer championship race ${race}`);
  if (alt.finalRace < base.finalRace) cons.push(`has a shorter championship race ${race}`);
  const [a, b] = [Math.round(100 * alt.breakEvenShare), Math.round(100 * base.breakEvenShare)];
  if (a - b >= 5) pros.push(`more players winning back their entry fee (${a}% instead of ${b}%)`);
  if (b - a >= 5) cons.push(`has fewer players winning back their entry fee (${a}% instead of ${b}%)`);
  const dt = Math.round(alt.p80 - base.p80);
  if (dt <= -5) pros.push(`an earlier finish (about ${fm(-dt)} sooner)`);
  if (dt >= 5) {
    if (alt.marginMin < -1) cons.push(`takes about ${fm(dt)} longer and runs about ${fm(-alt.marginMin)} past your time limit`);
    else cons.push(`takes about ${fm(dt)} longer, leaving ${alt.marginMin >= 1 ? `only ${fm(alt.marginMin)} of` : 'no'} cushion`);
  }
  const name = shortName(alt);
  if (pros.length && cons.length) return `${name} offers ${list(pros)}, but ${list(cons)}.`;
  if (pros.length) return `${name} offers ${list(pros)}.`;
  if (cons.length) return `${name} ${list(cons)}.`;
  return `${name} is about the same as ${shortName(base)} on every measured point.`;
}

/**
 * Nothing fits: the quickest option the Builder measured closely (every estimate within FAR_OVER_MIN of
 * the time limit is refined), or allFarOver when every format is further over than that.
 */
export function nothingFitsAdvice({ recommendation: rec, inputs }) {
  const quickest = rec.rows.filter((r) => r.refined).sort((x, y) => x.p80 - y.p80)[0] || null;
  if (!quickest) return { quickest: null, allFarOver: true, tryMin: inputs.targetMin + 60 };
  return { quickest, allFarOver: false, extraMin: quickest.p80 - inputs.targetMin, tryMin: Math.ceil(quickest.p80 / 15) * 15 };
}

/** For each format: shown, over the time limit, or not allowed for these inputs (with the engine's reason). */
export function formatCoverage(result, shown) {
  const shownFamilies = new Set(shown.map(familyOf));
  return FAMILIES.map((family) => {
    if (shownFamilies.has(family)) return { family, status: 'shown' };
    const simulated = result.evaluated.some((m) => familyOf(m) === family) || result.skipped.some((s) => familyOf(s.candidate) === family);
    if (simulated) return { family, status: 'over', reason: 'No setting of this format fits your time limit.' };
    const blocked = result.ineligible.find((x) => familyOf(x.candidate) === family);
    return { family, status: 'ineligible', reason: blocked?.problems[0] || 'Not available for these inputs.' };
  });
}
