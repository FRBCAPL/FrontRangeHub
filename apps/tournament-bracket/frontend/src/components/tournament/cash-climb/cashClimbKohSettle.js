import { splitRrSurplus } from './cashClimbAllocations.js';
import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { isPayoutV2, remainingPhaseBudget } from './cashClimbPayoutRuntime.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function dollars(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function isKohRound(round) {
  return round && round.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName;
}

function kohStarted(state) {
  return (state?.rounds || []).some(isKohRound);
}

function byExit(stats, pred) {
  return (stats || [])
    .filter(pred)
    .sort((a, b) => (Number(b.eliminated_order) || 0) - (Number(a.eliminated_order) || 0));
}

export function remainingUnpaid(state) {
  const paid = (state?.stats || []).reduce((sum, p) => sum + (Number(p.total_payout) || 0), 0);
  return money(Math.max(0, (Number(state?.totalPrizePool) || 0) - paid));
}

function creditLeftover(state, player, amount) {
  if (!player) return 0;
  const amt = money(Math.min(Math.max(0, Number(amount) || 0), remainingUnpaid(state)));
  if (amt <= 0) return 0;
  player.total_payout = money((player.total_payout || 0) + amt);
  return amt;
}

export function splitChopShares(amount) {
  const total = money(Math.max(0, amount));
  const first = money(total / 2);
  return [first, money(total - first)];
}

export function lockLeftoverBuckets(state) {
  if (!state || !isPayoutV2(state)) return state?.leftoverBuckets || null;
  if (state.leftoverBuckets) return state.leftoverBuckets;
  if (!kohStarted(state)) return null;
  const split = splitRrSurplus(remainingPhaseBudget(state, false));
  state.leftoverBuckets = { second: split.second, third: split.third };
  return state.leftoverBuckets;
}

export function leftoverBucketsForDisplay(state) {
  if (state?.leftoverBuckets) return state.leftoverBuckets;
  if (!state || !isPayoutV2(state) || !kohStarted(state)) return null;
  return splitRrSurplus(remainingPhaseBudget(state, false));
}

export function findThirdLastStanding(state) {
  if (!kohStarted(state)) return null;
  const active = (state.stats || []).filter((p) => !p.eliminated);
  if (active.length > 2) return null;
  const kohOuts = byExit(state.stats, (p) => p.eliminated && p.in_koh);
  const rrOuts = byExit(state.stats, (p) => p.eliminated && !p.in_koh);
  if (active.length === 2) return kohOuts[0] || rrOuts[0] || null;
  if (kohOuts.length >= 2) return kohOuts[1];
  return rrOuts[0] || null;
}

export function payThirdLastIfNeeded(state) {
  if (!state || !isPayoutV2(state) || state.thirdLastAwardPaid) return 0;
  lockLeftoverBuckets(state);
  const player = findThirdLastStanding(state);
  if (!player) return 0;
  const amount = money(state.leftoverBuckets?.third || 0);
  const paid = creditLeftover(state, player, amount);
  player.finish_place = 3;
  player.leftover_award = paid;
  player.place_bonus = money((player.place_bonus || 0) + paid);
  state.thirdLastAwardPaid = { player_id: player.player_id, amount: paid };
  const note = paid
    ? `${player.player_name} is 3rd last standing — pay ${dollars(paid)} leftover now.`
    : `${player.player_name} is 3rd last standing.`;
  state.message = state.message ? `${state.message} ${note}` : note;
  return paid;
}

export function undoThirdLastAward(state, player) {
  if (!player || player.finish_place !== 3) return 0;
  const amt = money(player.leftover_award || 0);
  player.total_payout = money(Math.max(0, (player.total_payout || 0) - amt));
  player.place_bonus = money(Math.max(0, (player.place_bonus || 0) - amt));
  player.leftover_award = 0;
  player.finish_place = null;
  if (state?.thirdLastAwardPaid && state.thirdLastAwardPaid.player_id === player.player_id) {
    state.thirdLastAwardPaid = null;
  }
  return amt;
}

export function canChopKoh(state) {
  if (!state || state.status !== 'in-progress' || !isPayoutV2(state)) return false;
  if (!kohStarted(state)) return false;
  return (state.stats || []).filter((p) => !p.eliminated).length === 2;
}

export function chopRemainingPreview(state) {
  const unpaid = remainingUnpaid(state);
  if (state?.thirdLastAwardPaid) return unpaid;
  const buckets = leftoverBucketsForDisplay(state);
  return money(Math.max(0, unpaid - (buckets?.third || 0)));
}

function cancelPendingKohMatches(state) {
  (state.matches || []).forEach((match) => {
    if (match.status !== 'pending') return;
    const round = (state.rounds || []).find((r) => r.id === match.round_id);
    if (isKohRound(round)) match.status = 'cancelled';
  });
}

export function chopKohRemaining(state) {
  if (!canChopKoh(state)) {
    throw new Error('Chop is only for the last two players in King of the Hill.');
  }
  lockLeftoverBuckets(state);
  payThirdLastIfNeeded(state);
  cancelPendingKohMatches(state);

  const pair = (state.stats || [])
    .filter((p) => !p.eliminated)
    .sort((a, b) => String(a.player_name || '').localeCompare(String(b.player_name || '')));
  if (pair.length !== 2) {
    throw new Error('Chop needs exactly two players still in.');
  }

  const [firstShare, secondShare] = splitChopShares(remainingUnpaid(state));
  pair.forEach((player, i) => {
    const paid = creditLeftover(state, player, i === 0 ? firstShare : secondShare);
    player.chopped = true;
    player.chop_share = paid;
    player.place_bonus = money((player.place_bonus || 0) + paid);
  });

  state.chopped = true;
  state.status = 'completed';
  state.completedAt = new Date().toISOString();
  state.winner = null;
  (state.rounds || []).forEach((round) => {
    if (round.status !== 'completed') round.status = 'completed';
  });
  state.message = `${pair[0].player_name} and ${pair[1].player_name} chopped remaining leftover.`;
  return state;
}
