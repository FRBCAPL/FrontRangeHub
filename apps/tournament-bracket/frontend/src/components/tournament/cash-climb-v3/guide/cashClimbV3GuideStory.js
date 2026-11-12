/**
 * "Sam's night": one player's run through the example event, so a new player sees the whole format in
 * dollars before reading any rules. Every amount comes from the payout engine via the guide example.
 */
import { cashClimbV3GuideExample } from './cashClimbV3GuideExample.js';

const sum = (rows) => rows.reduce((t, r) => t + r.amount, 0);

export function cashClimbV3GuideStory() {
  const ex = cashClimbV3GuideExample();
  if (!ex || ex.later.length < 3) return null;
  const first = ex.opening[2];
  const close = ex.opening[ex.raceTo - 1];
  const climb = ex.later.slice(0, -1);
  const run = [
    { label: `Wins the first match ${first.score}`, amount: first.winner },
    ...climb.map((r) => ({ label: `Wins the ${r.name.toLowerCase()}`, amount: r.amount })),
    { label: 'Wins the final', amount: ex.final.champion },
  ];
  const beforeSemi = first.winner + sum(climb.slice(0, -1));
  return {
    title: 'Sam\u2019s night',
    setup: `${ex.entrants} players, $${ex.entryFee} entry, race to ${ex.raceTo}`,
    run,
    total: sum(run),
    whatIf: [
      { label: `Sam loses the first match ${ex.raceTo - 1}-${ex.raceTo}`, amount: close.loser },
      { label: 'Sam loses in the semifinal', amount: beforeSemi },
      { label: 'Sam loses the final', amount: beforeSemi + climb.at(-1).amount + ex.final.runnerUp },
    ],
    note: 'Example only, before any leftover-money bonus in the final. Your event\u2019s exact amounts are on its payout table.',
  };
}
