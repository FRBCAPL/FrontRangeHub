/**
 * Theoretical finish-order checks for a V3 plan (cents). An inversion between two adjacent finishing
 * positions is impossible when the smallest playoff gain of the deeper finisher, minus the largest playoff
 * gain of the shallower one, covers the largest possible qualifying gap G × (r1 + r2).
 * The gap is 0 when the deeper player held a bye over a non-bye player (byes go to higher-ranked
 * qualifiers) and when the shallower player did not qualify (standings rank by qualifying dollars).
 * A race-to-k winner takes exactly k games; a loser 0 to k − 1. Walkovers, administrative byes and
 * withdrawals are outside these checks: players keep what they earned.
 */
import { finalRound } from '../showdownPlayoffTemplates.js';

const LABELS = {
  championOverRunnerUp: 'The champion out-earns the runner-up',
  runnerUpOverSemifinalLoser: 'The runner-up out-earns every semifinal loser',
  semifinalLoserOverQuarterfinalLoser: 'Every semifinal loser out-earns every quarterfinal loser',
  qualifierOverNonQualifier: 'Every qualifier earns at least as much as every non-qualifier',
};

function eightPositionPaths(L, k, rp) {
  const { quarterfinal: qf, semifinal: sf, final: fin } = L.perRound;
  const bye = L.bye * 100;
  const c = (d) => d * 100;
  return {
    champ: { qf: [c(qf + sf + fin) + 3 * k * rp], bye: [bye + c(sf + fin) + 2 * k * rp] },
    ru: { qf: [c(qf + sf) + 2 * k * rp, c(qf + sf) + (3 * k - 1) * rp], bye: [bye + c(sf) + k * rp, bye + c(sf) + (2 * k - 1) * rp] },
    sf: { qf: [c(qf) + k * rp, c(qf) + (2 * k - 1) * rp], bye: [bye, bye + (k - 1) * rp] },
    qfl: { qf: [0, (k - 1) * rp] },
  };
}

/** { checks: { key: { ok, label } }, warnings: [text] } */
export function v3FinishOrderChecks({ template, ladder, rates, qualifyingGames, playoffRaceTo }) {
  const k = playoffRaceTo;
  const rp = rates.playoff;
  const qMax = qualifyingGames * (rates.r1 + rates.r2);
  const ok = {};
  if (template.id === 'p4') {
    const sf = ladder.perRound[template.rounds[0].key] * 100;
    const fin = ladder.perRound[finalRound(template).key] * 100;
    ok.championOverRunnerUp = fin + rp >= qMax;
    ok.runnerUpOverSemifinalLoser = sf + rp >= qMax;
  } else {
    const P = eightPositionPaths(ladder, k, rp);
    const paths = (key) => Object.keys(P[key]).filter((p) => template.byes > 0 || p === 'qf');
    const safe = (deep, shallow) => paths(deep).every((pd) => paths(shallow).every((ps) => {
      const gap = pd === 'bye' && ps !== 'bye' ? 0 : qMax;
      return P[deep][pd][0] - P[shallow][ps][P[shallow][ps].length - 1] >= gap;
    }));
    ok.championOverRunnerUp = safe('champ', 'ru');
    ok.runnerUpOverSemifinalLoser = safe('ru', 'sf');
    ok.semifinalLoserOverQuarterfinalLoser = safe('sf', 'qfl');
  }
  ok.qualifierOverNonQualifier = true;
  const checks = {};
  Object.entries(ok).forEach(([key, v]) => { checks[key] = { ok: v, label: LABELS[key] }; });
  const warnings = Object.entries(ok).filter(([, v]) => !v)
    .map(([key]) => `Not guaranteed: ${LABELS[key].toLowerCase()}. A large qualifying-earnings gap could outweigh the playoff step in rare results.`);
  return { checks, warnings };
}
