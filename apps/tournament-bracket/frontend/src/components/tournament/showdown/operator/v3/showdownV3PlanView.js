/** View data for a V3 payout plan: the preview during setup and the plan locked at the start. */
import { buildV3Plan, V3_GUARANTEE_SCOPE } from '../../v3/showdownV3Plan.js';
import { v3SettingsOf, v3SetupProblems } from '../../v3/showdownV3Event.js';
import { formatCents, V3_CHAMPIONSHIP_PCT, V3_EQUAL_RATE, isEqualRatePlan, v3UnitCents } from '../../v3/showdownV3Rules.js';
import { playoffTemplate, finalRound } from '../../showdownPlayoffTemplates.js';
import { fieldRuleFor, supportedFieldRange } from '../../showdownFieldRules.js';
import { entryFeeProblem } from '../../showdownPayout.js';

const dollars = (d) => formatCents(d * 100);
const pctOf = (part, whole) => (whole ? Math.round((part * 100) / whole) : 0);
/** "4.08×": cents as a multiple of the whole-dollar fee, rounded down to hundredths. */
const times = (cents, fee) => {
  const h = Math.floor(cents / fee);
  return `${Math.floor(h / 100)}.${String(h % 100).padStart(2, '0')}\u00d7`;
};

export const V3_REMAINDER_LABEL = 'Playoff reserve remainder';

/** Equal-rate wording: the design champion and, when used, the heavier semifinal bonus. */
function equalRateTerms(plan) {
  const d = plan.design || {};
  const design = `A champion who won half of their qualifying games, with every playoff match going the full distance, earns at least ${formatCents(d.championCents || 0)} (${times(d.championCents || 0, plan.entryFee)} the entry fee).`;
  const target = d.targetMet
    ? `That meets the 4\u00d7 design target (${formatCents(d.championTargetCents || 0)}).`
    : `That is below the 4\u00d7 design target (${formatCents(d.championTargetCents || 0)}), which is a goal, not a guarantee.`;
  const w = plan.ladder.semifinalWeight;
  const rebalanced = w && w !== V3_EQUAL_RATE.standardSemifinalWeight
    ? `The semifinal bonus is raised (weight ${w} instead of ${V3_EQUAL_RATE.standardSemifinalWeight}) so the runner-up always out-earns both semifinal losers.`
    : '';
  return [design, target, rebalanced].filter(Boolean).join(' ');
}

/** Everything the operator sees about one plan, all amounts already formatted. */
export function v3PlanView(plan) {
  const template = playoffTemplate(plan.templateId);
  const finalKey = finalRound(template).key;
  const r = plan.reserves;
  const rounds = template.rounds.map((round) => ({
    key: round.key,
    label: round.label,
    matches: round.matches,
    each: dollars(plan.ladder.perRound[round.key]),
    total: dollars(plan.ladder.perRound[round.key] * round.matches),
  }));
  const byeTotal = plan.ladder.bye * plan.byes;
  const checks = Object.values(plan.guarantees?.checks || {}).map((c) => ({ label: c.label, ok: c.ok }));
  const equalRate = isEqualRatePlan(plan);
  return {
    equalRate,
    unitCents: v3UnitCents(plan),
    entrants: plan.entrants,
    entryFee: dollars(plan.entryFee),
    pool: formatCents(plan.poolCents),
    qualifyingGames: plan.qualifyingGames,
    playoffRaceTo: plan.playoffRaceTo,
    qualifiers: plan.qualifiers,
    byes: plan.byes,
    rates: { r1: formatCents(plan.rates.r1), r2: formatCents(plan.rates.r2), playoff: formatCents(plan.rates.playoff), game: formatCents(plan.rates.r1) },
    allocation: [
      { key: 'qualifying', label: `Qualifying games (${plan.entrants} matches \u00d7 ${plan.qualifyingGames} games)`, amount: formatCents(r.qualifying), pct: pctOf(r.qualifying, plan.poolCents) },
      { key: 'playoffGames', label: `Playoff games (${plan.playoffMatches} matches \u00d7 up to ${r.playoffGamesPerMatch} games)`, amount: formatCents(r.playoffGames), pct: pctOf(r.playoffGames, plan.poolCents) },
      { key: 'ladder', label: `Match-win bonuses${plan.byes ? ' and bye payments' : ''}`, amount: formatCents(r.ladder), pct: pctOf(r.ladder, plan.poolCents) },
      { key: 'leftover', label: equalRate ? `Rounding left over (part of the ${V3_REMAINDER_LABEL.toLowerCase()}, to the champion)` : 'Rounding left over (goes to the champion bonus)', amount: formatCents(r.leftover), pct: pctOf(r.leftover, plan.poolCents) },
    ],
    rounds,
    bye: plan.byes ? { count: plan.byes, each: dollars(plan.ladder.bye), total: dollars(byeTotal) } : null,
    championship: dollars(plan.ladder.perRound[finalKey]),
    tierPct: plan.championshipTierPct,
    tierHeading: equalRate ? 'Champion design target' : 'Championship guarantee tier',
    tierText: equalRate
      ? equalRateTerms(plan)
      : `The championship match win is ${plan.championshipTierPct}% of the entry fee (target ${V3_CHAMPIONSHIP_PCT.target}%, never below ${V3_CHAMPIONSHIP_PCT.min}%).`,
    checks,
    scope: equalRate ? plan.guarantees?.scope || V3_GUARANTEE_SCOPE : '',
    remainderText: equalRate
      ? `Unused playoff game money, unearned match-win bonuses, unplayed qualifying games and rounding go to the champion as the ${V3_REMAINDER_LABEL.toLowerCase()}, listed apart from game and match winnings.`
      : 'Unused playoff game money, unearned match-win bonuses and rounding go to the champion as the champion bonus.',
    warnings: plan.guarantees?.warnings || [],
  };
}

/** The plan's key terms, repeated in the start confirmation. */
export function v3PlanSummary(view) {
  if (!view) return [];
  return [
    `Entry pool ${view.pool} (${view.entrants} \u00d7 ${view.entryFee}).`,
    view.equalRate
      ? `Qualifying: ${view.qualifyingGames} games per match. Every game won pays ${view.rates.game}, in qualifying and in the playoffs.`
      : `Qualifying: ${view.qualifyingGames} games per match. Round 1 game ${view.rates.r1}, Round 2 game ${view.rates.r2}.`,
    `Playoffs: race to ${view.playoffRaceTo}, ${view.rates.playoff} per game won, championship match win ${view.championship}.`,
    ...(view.bye ? [`${view.bye.count} quarterfinal bye${view.bye.count === 1 ? '' : 's'} at ${view.bye.each} each.`] : []),
  ];
}

/**
 * Setup preview: the plan the current settings would lock, or why there is none yet.
 * Uses the same plan builder as the start, so what is shown is exactly what would be locked.
 */
export function v3PlanPreview(state) {
  const s = v3SettingsOf(state);
  const range = supportedFieldRange();
  if (!fieldRuleFor(s.entrants)) {
    return { view: null, problems: [`The payout plan appears once there are ${range.min}\u2013${range.max} entrants (now ${s.entrants}).`] };
  }
  const fee = entryFeeProblem(s.entryFee);
  const problems = [...(fee ? [fee] : []), ...v3SetupProblems(state)];
  if (problems.length) return { view: null, problems };
  try {
    return { view: v3PlanView(buildV3Plan(s)), problems: [] };
  } catch (err) {
    return { view: null, problems: [err.message] };
  }
}
