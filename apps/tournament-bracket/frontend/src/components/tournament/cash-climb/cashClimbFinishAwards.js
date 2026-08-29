import { splitRrSurplus } from './cashClimbAllocations.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function projectedTotals(championship, leftover, firstMatch, secondMatch, thirdMatch, others) {
  const podium = splitRrSurplus(leftover);
  const first = money(firstMatch + championship);
  const second = money(secondMatch + podium.second);
  const third = money(thirdMatch + podium.third);
  const otherMax = (others || []).reduce((max, paid) => Math.max(max, money(paid)), 0);
  return {
    first,
    second,
    third,
    podium,
    maxOther: Math.max(second, third, otherMax),
  };
}

/**
 * Unused KOH is the championship. Unused RR splits 60/40 to 2nd and 3rd,
 * except any amount needed so the champion's total is at least as much as
 * every other player.
 */
export function splitFinishAwards({
  rrSurplus = 0,
  kohSurplus = 0,
  firstMatchPaid = 0,
  secondMatchPaid = 0,
  thirdMatchPaid = 0,
  otherMatchPaids = [],
} = {}) {
  const leftoverStart = money(Math.max(0, rrSurplus));
  const championshipStart = money(Math.max(0, kohSurplus));
  const firstMatch = money(firstMatchPaid);
  const secondMatch = money(secondMatchPaid);
  const thirdMatch = money(thirdMatchPaid);
  const others = (otherMatchPaids || []).map((n) => money(n));

  const ok = (transfer) => {
    const t = money(Math.max(0, Math.min(leftoverStart, transfer)));
    const totals = projectedTotals(
      money(championshipStart + t),
      money(leftoverStart - t),
      firstMatch,
      secondMatch,
      thirdMatch,
      others
    );
    return totals.first + 0.0001 >= totals.maxOther;
  };

  let transfer = 0;
  if (!ok(0)) {
    if (ok(leftoverStart)) {
      let lo = 0;
      let hi = leftoverStart;
      for (let i = 0; i < 24; i += 1) {
        const mid = money((lo + hi) / 2);
        if (ok(mid)) hi = mid;
        else lo = mid;
      }
      transfer = hi;
      while (transfer < leftoverStart && !ok(transfer)) {
        transfer = money(transfer + 0.01);
      }
    } else {
      transfer = leftoverStart;
    }
  }

  const leftover = money(leftoverStart - transfer);
  const championship = money(championshipStart + transfer);
  const totals = projectedTotals(championship, leftover, firstMatch, secondMatch, thirdMatch, others);
  return {
    championship,
    second: totals.podium.second,
    third: totals.podium.third,
    transferredToChampion: transfer,
    firstTotal: totals.first,
    secondTotal: totals.second,
    thirdTotal: totals.third,
  };
}
