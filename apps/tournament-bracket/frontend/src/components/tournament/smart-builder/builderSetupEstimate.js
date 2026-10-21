/**
 * Time estimate for one Showdown setting, for the setup screen. Same simulator, seeds and run count as a
 * refined Help me choose option, so the same settings give the same typical and conservative times.
 * Reads the engine only; nothing is saved.
 */
import { simulateOnce, runSeed } from './builderEvaluate.js';
import { SHOWDOWN_RACES } from './builderCandidates.js';
import { assumptionsWith, percentile } from './builderTiming.js';
import { PASS2_RUNS, UNCALIBRATED_NOTE } from './builderFlags.js';

/** The Builder's candidate for these settings (same id, so the same seeds). */
export function setupCandidate({ version, qualifyingRaceTo, qualifyingGames, playoffRaceTo }) {
  if (version === 3) return { family: 'showdown', version: 3, id: `v3-${qualifyingGames}-${playoffRaceTo}`, qualifyingGames, playoffRaceTo };
  const standard = qualifyingRaceTo === SHOWDOWN_RACES.qualifyingRaceTo && playoffRaceTo === SHOWDOWN_RACES.playoffRaceTo;
  return { family: 'showdown', version, id: standard ? `v${version}` : `v${version}-${qualifyingRaceTo}-${playoffRaceTo}`, qualifyingRaceTo, playoffRaceTo };
}

/**
 * `settings`: { version, entrants, tables, entryFee, qualifyingRaceTo, qualifyingGames, playoffRaceTo, minutesPerGame }.
 * Returns typical (P50) and conservative (P80) minutes for the whole event and its two phases.
 */
export function estimateSetup(settings, { runs = PASS2_RUNS } = {}) {
  const c = setupCandidate(settings);
  const inputs = { entrants: settings.entrants, tables: settings.tables, entryFee: settings.entryFee };
  const a = assumptionsWith({ minutesPerGame: settings.minutesPerGame });
  const rs = Array.from({ length: runs }, (_, i) => simulateOnce(c, inputs, a, runSeed(c, inputs, i)));
  const pick = (f, p) => percentile(rs.map(f), p);
  return {
    runs,
    p50: pick((r) => r.total, 50),
    p80: pick((r) => r.total, 80),
    qualifyingP50: pick((r) => r.qualifyingEnd, 50),
    playoffsP50: pick((r) => r.total - r.playoffStart, 50),
    shootoutShare: rs.filter((r) => r.shootouts > 0).length / runs,
    note: UNCALIBRATED_NOTE,
  };
}
