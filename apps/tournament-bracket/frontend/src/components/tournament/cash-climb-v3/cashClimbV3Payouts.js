/**
 * Ledger entries a resolved match creates (whole dollars, posted as cents).
 *
 * Opening matches (preliminary and main):
 *   completed           Score-Split winner and loser awards
 *   withdrawal(s)       base rack earnings only: racks x E/(2R), halved for a preliminary, rounded half up;
 *                       no performance premium, no shutout bonus
 *   forfeit / walkover  advancing player gets half the match reserve, rounded half up
 * Later rounds (not the championship):
 *   completed           the scheduled award to the winner
 *   withdrawal(s)       nothing new
 *   forfeit / walkover  advancing player gets half the scheduled award, rounded half up
 * Championship:
 *   completed           champion round_half_up(80% x allocation), runner-up the exact remainder
 *   forfeit / walkover  champion gets half the normal rounded 80% share, rounded half up; no runner-up award
 *   withdrawal(s)       nothing new; one withdrawal leaves the other finalist champion by withdrawal
 * Double forfeit and void (both positions vacant) pay nothing.
 */
import { openingScoreSplit } from './cashClimbV3Opening.js';
import { championshipSplit } from './cashClimbV3Championship.js';
import { roundHalfUpRatio } from './cashClimbV3Money.js';
import { entitlementKey } from './cashClimbV3Ledger.js';

const half = (dollars) => roundHalfUpRatio(dollars, 2);

function entry(matchId, type, playerId, dollars) {
  return dollars > 0 ? [{ key: entitlementKey(matchId, type, playerId), matchId, type, playerId, cents: dollars * 100 }] : [];
}

function baseRacks(config, racks, preliminary) {
  return roundHalfUpRatio(racks * config.entryFeeCents, (preliminary ? 400 : 200) * config.raceTo);
}

function openingEntries(config, match, r) {
  const preliminary = match.stage === 'preliminary';
  const allocation = match.allocationCents / 100;
  switch (r.outcome) {
    case 'completed': {
      const s = openingScoreSplit(config, r.loserRacks, { preliminary });
      return [...entry(match.id, 'score-split-winner', r.winner, s.winner), ...entry(match.id, 'score-split-loser', r.loser, s.loser)];
    }
    case 'withdrawal':
    case 'double-withdrawal':
      return Object.entries(r.racks).flatMap(([id, n]) => entry(match.id, 'rack-earnings', id, baseRacks(config, n, preliminary)));
    case 'forfeit':
    case 'walkover':
      return entry(match.id, `${r.outcome}-award`, r.winner, half(allocation));
    default:
      return [];
  }
}

function laterEntries(match, r) {
  const award = match.allocationCents / 100;
  if (r.outcome === 'completed') return entry(match.id, 'match-award', r.winner, award);
  if (r.outcome === 'forfeit' || r.outcome === 'walkover') return entry(match.id, `${r.outcome}-award`, r.winner, half(award));
  return [];
}

function championshipEntries(match, r) {
  const split = championshipSplit(match.allocationCents / 100);
  if (r.outcome === 'completed') {
    return [...entry(match.id, 'champion-share', r.winner, split.champion), ...entry(match.id, 'runner-up-share', r.loser, split.runnerUp)];
  }
  if (r.outcome === 'forfeit' || r.outcome === 'walkover') return entry(match.id, `champion-${r.outcome}-award`, r.winner, half(split.champion));
  return [];
}

export function matchEntries(config, match, result) {
  if (match.stage === 'preliminary' || match.stage === 'opening') return openingEntries(config, match, result);
  return match.championship ? championshipEntries(match, result) : laterEntries(match, result);
}
