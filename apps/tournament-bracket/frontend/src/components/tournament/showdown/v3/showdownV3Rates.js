/**
 * Deterministic V3 rate selection. Inputs: entrants N, whole-dollar fee F, qualifying games per match G,
 * playoff race length k. Every amount is in cents.
 *
 *   Qualifying reserve Q = G × (⌊N/2⌋ × r1 + ⌈N/2⌉ × r2)   (an odd field's bridge is reserved at Round 2)
 *   Playoff game reserve  = M × (2k − 1) × r2               (M = playoff matches; playoff games pay r2)
 *   Ladder budget         = ⌊(N × F − Q − reserve) / $1⌋, laid out by the existing playoffLadder weights
 *
 * A candidate is valid when the ladder meets the approved ladder rules, the opening win pays at least 50%
 * of the fee and Q is 30–55% of the pool. Championship tiers are tried from 150% of the fee down to 100%
 * in 5% steps; the first tier with a valid candidate wins. Within it: highest Q, then the higher
 * championship, then the +50¢ Round 2 step, then the lower Round 1 rate.
 */
import { entryFeeProblem, playoffLadder } from '../showdownPayout.js';
import { fieldRuleFor, unsupportedFieldMessage } from '../showdownFieldRules.js';
import { playoffTemplate, finalRound } from '../showdownPlayoffTemplates.js';
import {
  V3_QUALIFYING_GAMES, V3_PLAYOFF_RACE_TO, V3_UNIT_CENTS, V3_ROUND2_STEPS_CENTS, V3_QUALIFYING_SHARE_PCT,
  V3_OPENING_MIN_PCT, v3ChampionshipTiers, maxPlayoffGames,
} from './showdownV3Rules.js';

function intInRange(value, { min, max }) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

/** Problems with the V3 settings that decide the money. Empty when the inputs can be priced. */
export function v3SettingsProblems({ entrants, entryFee, qualifyingGames, playoffRaceTo }) {
  const problems = [];
  if (!fieldRuleFor(entrants)) problems.push(unsupportedFieldMessage(Number(entrants)));
  const fee = entryFeeProblem(entryFee);
  if (fee) problems.push(fee);
  if (!intInRange(qualifyingGames, V3_QUALIFYING_GAMES)) {
    problems.push(`Games per qualifying match must be a whole number from ${V3_QUALIFYING_GAMES.min} to ${V3_QUALIFYING_GAMES.max}.`);
  }
  if (!intInRange(playoffRaceTo, V3_PLAYOFF_RACE_TO)) {
    problems.push(`The playoff race must be to ${V3_PLAYOFF_RACE_TO.min}\u2013${V3_PLAYOFF_RACE_TO.max} games.`);
  }
  return problems;
}

export function v3Field(entrants) {
  const rule = fieldRuleFor(entrants);
  const template = playoffTemplate(rule.templateId);
  const matches = template.rounds.reduce((s, r) => s + r.matches, 0);
  return { templateId: template.id, qualifiers: template.size, byes: template.byes, playoffMatches: matches, template };
}

export function qualifyingReserveCents(entrants, games, r1, r2) {
  return games * (Math.floor(entrants / 2) * r1 + Math.ceil(entrants / 2) * r2);
}

/** One rate pair priced out. `status` is 'valid' or the first rule it breaks. */
export function v3Candidate(s, field, r1, r2) {
  const pool = s.entrants * s.entryFee * 100;
  const qualifying = qualifyingReserveCents(s.entrants, s.qualifyingGames, r1, r2);
  const playoffGames = field.playoffMatches * maxPlayoffGames(s.playoffRaceTo) * r2;
  const budgetCents = pool - qualifying - playoffGames;
  const base = { r1, r2, playoffRate: r2, pool, qualifying, playoffGames, budgetCents };
  if (budgetCents < 0) return { ...base, status: 'over-budget' };
  let ladder;
  try {
    ladder = playoffLadder(field.templateId, Math.floor(budgetCents / 100));
  } catch (e) {
    return { ...base, status: 'ladder-rules', detail: e.message };
  }
  const t = field.template;
  const opening = ladder.perRound[t.rounds[0].key] * 100;
  const championship = ladder.perRound[finalRound(t).key] * 100;
  const out = { ...base, ladder, ladderCents: ladder.budget * 100, leftoverCents: budgetCents - ladder.budget * 100, opening, championship };
  if (opening * 100 < V3_OPENING_MIN_PCT * s.entryFee * 100) return { ...out, status: 'opening-below-minimum' };
  if (qualifying * 100 > V3_QUALIFYING_SHARE_PCT.max * pool) return { ...out, status: 'qualifying-above-maximum' };
  if (qualifying * 100 < V3_QUALIFYING_SHARE_PCT.min * pool) return { ...out, status: 'qualifying-below-minimum' };
  return { ...out, status: 'valid' };
}

/**
 * Every rate pair from Round 1 = 50¢ upward. Stops at the first Round 1 rate whose pairs are all
 * unaffordable (over budget or no valid ladder) or all above the qualifying maximum; higher rates only
 * shrink the ladder and raise the qualifying share.
 */
export function v3Candidates(s, field = v3Field(s.entrants)) {
  const out = [];
  for (let r1 = V3_UNIT_CENTS; ; r1 += V3_UNIT_CENTS) {
    const row = V3_ROUND2_STEPS_CENTS.map((step) => v3Candidate(s, field, r1, r1 + step));
    out.push(...row);
    const priced = row.filter((c) => c.status !== 'over-budget' && c.status !== 'ladder-rules');
    if (!priced.length || priced.every((c) => c.status === 'qualifying-above-maximum')) break;
  }
  return out;
}

function better(a, b) {
  return (b.qualifying - a.qualifying) || (b.championship - a.championship)
    || ((a.r2 - a.r1) - (b.r2 - b.r1)) || (a.r1 - b.r1);
}

const pick = (c) => ({ r1: c.r1, r2: c.r2, qualifying: c.qualifying, championship: c.championship });

/** Picks the rates. Returns { ok, problems, choice, tierPct, trace }. */
export function selectV3Rates(settings) {
  const s = {
    entrants: Number(settings.entrants),
    entryFee: Number(settings.entryFee),
    qualifyingGames: Number(settings.qualifyingGames),
    playoffRaceTo: Number(settings.playoffRaceTo),
  };
  const problems = v3SettingsProblems(s);
  if (problems.length) return { ok: false, problems, settings: s };
  const field = v3Field(s.entrants);
  const candidates = v3Candidates(s, field);
  const valid = candidates.filter((c) => c.status === 'valid');
  const tiers = [];
  let choice = null;
  for (const pct of v3ChampionshipTiers()) {
    const meeting = valid.filter((c) => c.championship * 100 >= pct * s.entryFee * 100).sort(better);
    tiers.push({ pct, candidates: meeting.length, best: meeting[0] ? pick(meeting[0]) : null });
    if (meeting.length) { choice = { ...meeting[0], tierPct: pct }; break; }
  }
  const trace = {
    candidates: candidates.map((c) => ({
      r1: c.r1, r2: c.r2, qualifying: c.qualifying, playoffGames: c.playoffGames, budgetCents: c.budgetCents,
      opening: c.opening ?? null, championship: c.championship ?? null, status: c.status,
    })),
    tiers,
  };
  if (!choice) {
    const why = valid.length
      ? 'no rate pair pays the championship at least 100% of the entry fee'
      : 'no rate pair keeps qualifying between 30% and 55% of the pool with an opening playoff win of at least half the fee';
    return {
      ok: false,
      problems: [`This configuration cannot meet the V3 payout rules: ${why}. Use fewer qualifying games, a shorter playoff race or a higher entry fee.`],
      settings: s, field, trace,
    };
  }
  return { ok: true, problems: [], settings: s, field, choice, tierPct: choice.tierPct, trace };
}
