/**
 * Exact finishing-order bounds for an equal-rate V3 plan (cents, integers only). See
 * docs/showdown/SHOWDOWN_V3_PAYOUT_SPEC.md §5.
 *
 * Scope: a completed event whose playoff matches were all played to completion. Every earning counts:
 * qualifying games and administrative credits (at most G games per player per match, so 0..2G), playoff
 * games (a race-to-k winner takes exactly k, a loser 0..k−1), match-win pay, bye pay and, for the champion
 * only, the plan's leftover cents. Every entrant stays in the qualifying standings. Walkovers, withdrawals
 * during qualifying and audited operator adjustments are outside these bounds.
 *
 * The player ranked r holds at least w(r) = ⌈(N·G − (r−1)·2G) / (N−r+1)⌉ qualifying wins (the r−1 above hold
 * at most 2G each). A bye holder outranks every non-bye qualifier, so when the upper player had a bye and
 * the lower did not, the lower player's qualifying is at most the upper's. Two different bye holders need
 * at least two byes.
 */

/** Fewest qualifying game wins (incl. credits) possible for the player ranked `rank`. */
export function minWinsAtRank(entrants, games, rank) {
  const num = entrants * games - (rank - 1) * 2 * games;
  const den = entrants - rank + 1;
  return num <= 0 ? 0 : Math.floor((num + den - 1) / den);
}

/** Playoff earnings bounds (cents) by finishing position and path (opening round or bye). */
function playoffPaths(template, ladder, q, k) {
  const L = ladder.perRound;
  if (!template.byes && template.rounds.length === 2) {
    const sf = L.semifinal * 100;
    return {
      champ: [{ bye: false, min: (L.semifinal + L.final) * 100 + 2 * k * q }],
      ru: [{ bye: false, min: sf + k * q, max: sf + (2 * k - 1) * q }],
      sfl: [{ bye: false, max: (k - 1) * q }],
    };
  }
  const QF = L.quarterfinal * 100; const SF = L.semifinal * 100; const FN = L.final * 100; const B = ladder.bye * 100;
  const out = {
    champ: [{ bye: false, min: QF + SF + FN + 3 * k * q }],
    ru: [{ bye: false, min: QF + SF + 2 * k * q, max: QF + SF + (3 * k - 1) * q }],
    sfl: [{ bye: false, max: QF + (2 * k - 1) * q }],
  };
  if (template.byes) {
    out.champ.push({ bye: true, min: B + SF + FN + 2 * k * q });
    out.ru.push({ bye: true, min: B + SF + k * q, max: B + SF + (2 * k - 1) * q });
    out.sfl.push({ bye: true, max: B + (k - 1) * q });
  }
  return out;
}

/** Smallest (upper total − lower total) over every pairing that can happen in one event, with that pairing. */
function worstPair(ctx, upper, lower) {
  const { template, q, wLast, wBye, G } = ctx;
  let worst = null;
  upper.forEach((u) => lower.forEach((l) => {
    if (u.bye && l.bye && template.byes < 2) return;
    const upperQ = (u.bye ? wBye : wLast) * q;
    const lowerQ = u.bye && !l.bye ? upperQ : 2 * G * q;
    const upperTotal = u.min + upperQ; const lowerTotal = l.max + lowerQ;
    const margin = upperTotal - lowerTotal;
    if (!worst || margin < worst.marginCents) {
      worst = { marginCents: margin, upperCents: upperTotal, lowerCents: lowerTotal, upperPath: u.bye ? 'bye' : 'opening', lowerPath: l.bye ? 'bye' : 'opening' };
    }
  }));
  return worst;
}

/**
 * { champion, runnerUp }: the worst case of "champion minus runner-up" and of "runner-up minus semifinal
 * loser". A positive marginCents means the order is guaranteed.
 */
export function v3ExactBounds({ template, qualifiers, ladder, rate: q, leftoverCents, entrants, qualifyingGames: G, playoffRaceTo: k }) {
  const ctx = {
    template, q, G,
    wLast: minWinsAtRank(entrants, G, qualifiers),
    wBye: template.byes ? minWinsAtRank(entrants, G, template.byes) : 0,
  };
  const p = playoffPaths(template, ladder, q, k);
  const champ = p.champ.map((c) => ({ ...c, min: c.min + leftoverCents }));
  return { champion: worstPair(ctx, champ, p.ru), runnerUp: worstPair(ctx, p.ru, p.sfl) };
}
