/** View data for an escalating (D10) V3 payout plan: game values by stage, bye credit and the Champion Fund. */
import { formatCents, V3_ESCALATING } from '../../v3/showdownV3Rules.js';
import { playoffTemplate, finalRound } from '../../showdownPlayoffTemplates.js';

const pctOf = (part, whole) => (whole ? Math.round((part * 100) / whole) : 0);

export const V3_CHAMPION_FUND_LABEL = 'Champion Fund';

export const V3_ESCALATING_SUMMARY = 'Every game won earns money. Game values increase as the tournament progresses. Players receiving an opening-round bye earn a bye credit. Unused game money grows the Champion Fund, which is awarded to the tournament champion.';

export function escalatingPlanView(plan) {
  const template = playoffTemplate(plan.templateId);
  const finalKey = finalRound(template).key;
  const r = plan.reserves;
  const g = plan.guarantees || {};
  const stages = template.rounds.map((round) => ({
    key: round.key,
    label: round.label,
    matches: round.matches,
    rateCents: plan.rates.byRound[round.key],
    rate: formatCents(plan.rates.byRound[round.key]),
    reserve: formatCents(round.matches * r.playoffGamesPerMatch * plan.rates.byRound[round.key]),
  }));
  const checks = Object.values(g.checks || {}).map((c) => ({ label: c.label, ok: c.ok, hard: Boolean(c.hard) }));
  const fund = formatCents(r.championFund);
  return {
    escalating: true,
    equalRate: false,
    unitCents: plan.unitCents,
    entrants: plan.entrants,
    entryFee: formatCents(plan.entryFee * 100),
    pool: formatCents(plan.poolCents),
    qualifyingGames: plan.qualifyingGames,
    playoffRaceTo: plan.playoffRaceTo,
    qualifiers: plan.qualifiers,
    byes: plan.byes,
    rates: { r1: formatCents(plan.rates.r1), r2: formatCents(plan.rates.r2), game: formatCents(plan.rates.r1), qualifying: formatCents(plan.rates.r1), playoff: '' },
    stages,
    rounds: stages.map((s) => ({ key: s.key, label: s.label, matches: s.matches, each: s.rate, total: s.reserve })),
    allocation: [
      { key: 'qualifying', label: `Qualifying games (${plan.entrants} matches \u00d7 ${plan.qualifyingGames} games at ${formatCents(plan.rates.r1)})`, amount: formatCents(r.qualifying), pct: pctOf(r.qualifying, plan.poolCents) },
      { key: 'playoffGames', label: `Playoff games (${plan.playoffMatches} matches \u00d7 up to ${r.playoffGamesPerMatch} games at each stage\u2019s rate)`, amount: formatCents(r.playoffGames), pct: pctOf(r.playoffGames, plan.poolCents) },
      ...(plan.byes ? [{ key: 'byeCredits', label: `Bye credits (${plan.byes} \u00d7 ${formatCents(plan.byeCreditCents)})`, amount: formatCents(r.byeCredits), pct: pctOf(r.byeCredits, plan.poolCents) }] : []),
      { key: 'championFund', label: `Starting ${V3_CHAMPION_FUND_LABEL}`, amount: fund, pct: pctOf(r.championFund, plan.poolCents) },
    ],
    bye: plan.byes ? { count: plan.byes, each: formatCents(plan.byeCreditCents), total: formatCents(r.byeCredits) } : null,
    byeRule: `half of a full ${template.rounds[0].label.toLowerCase()} win (${plan.playoffRaceTo} games at ${stages[0].rate}), rounded to the nearest 25\u00a2`,
    championship: stages.find((s) => s.key === finalKey).rate,
    championFund: { start: fund, startCents: r.championFund },
    championLead: formatCents(g.margins?.championCents || 0),
    championMin: formatCents(g.championMinCents || 0),
    stepPct: V3_ESCALATING.minStepPct,
    tierPct: null,
    tierHeading: 'Champion guarantee',
    tierText: `The champion always earns more than every other player: in the worst possible case by at least ${formatCents(g.margins?.championCents || 0)}, with at least ${formatCents(g.championMinCents || 0)} in total.`,
    checks,
    scope: g.scope || '',
    remainderText: `Game money nobody wins (unplayed qualifying games and the unused part of each playoff match) joins the ${V3_CHAMPION_FUND_LABEL}, which starts at ${fund} and goes to the champion when the event is completed. Bye credits are not games won.`,
    warnings: g.warnings || [],
    summary: V3_ESCALATING_SUMMARY,
  };
}

/** The plan's key terms, repeated in the start confirmation. */
export function escalatingPlanSummary(view) {
  return [
    `Entry pool ${view.pool} (${view.entrants} \u00d7 ${view.entryFee}).`,
    `Qualifying: ${view.qualifyingGames} games per match. Every game won pays ${view.rates.qualifying}.`,
    `Playoffs: race to ${view.playoffRaceTo}. Each game won pays ${view.stages.map((s) => `${s.rate} in the ${s.label.toLowerCase()}`).join(', ')}.`,
    ...(view.bye ? [`${view.bye.count} opening-round bye${view.bye.count === 1 ? '' : 's'}, each earning a ${view.bye.each} bye credit.`] : []),
    `Starting ${V3_CHAMPION_FUND_LABEL}: ${view.championFund.start}, plus every unplayed game\u2019s money, to the champion.`,
  ];
}
