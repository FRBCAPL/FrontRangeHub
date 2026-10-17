/**
 * Result shapes for a single match. Every function returns a new match object.
 *   result: 'played' | 'forfeit' | 'double-forfeit' | 'walkover'
 * A forfeit (qualifying) and a walkover (playoff) are administrative and never "played".
 */

function asScore(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function scoreProblem(score1, score2, raceTo) {
  const a = asScore(score1);
  const b = asScore(score2);
  if (a === null || b === null) return 'Enter both players\u2019 game scores as whole numbers.';
  const hit = (a === raceTo ? 1 : 0) + (b === raceTo ? 1 : 0);
  if (hit !== 1 || a > raceTo || b > raceTo) return `One player must reach exactly ${raceTo} and the other must have fewer.`;
  return '';
}

function cleared(match) {
  return {
    ...match,
    status: 'waiting',
    result: null,
    score1: null,
    score2: null,
    winnerId: null,
    loserId: null,
    forfeitedBy: [],
    completedAt: null,
    auto: undefined,
  };
}

export function clearResult(match) {
  return { ...cleared(match), table: null, startedAt: null };
}

export function playedResult(match, score1, score2, raceTo, now) {
  const problem = scoreProblem(score1, score2, raceTo);
  if (problem) throw new Error(problem);
  const a = Number(score1);
  const b = Number(score2);
  const p1Won = a === raceTo;
  return {
    ...cleared(match),
    status: 'completed',
    result: 'played',
    score1: a,
    score2: b,
    winnerId: p1Won ? match.p1 : match.p2,
    loserId: p1Won ? match.p2 : match.p1,
    table: null,
    completedAt: now,
  };
}

/**
 * Administrative forfeit. One forfeiting player: opponent wins raceTo–0 (`forfeit` in qualifying,
 * `walkover` in playoffs). Both forfeiting: double forfeit, no winner, 0–0, nobody advances.
 */
export function forfeitResult(match, forfeitingIds, raceTo, now) {
  const ids = [...new Set(forfeitingIds)].filter((id) => id === match.p1 || id === match.p2);
  if (!ids.length) throw new Error('Pick which player forfeits.');
  if (ids.length === 2) {
    return {
      ...cleared(match),
      status: 'completed',
      result: 'double-forfeit',
      score1: 0,
      score2: 0,
      forfeitedBy: ids,
      table: null,
      completedAt: now,
    };
  }
  const loser = ids[0];
  const winner = loser === match.p1 ? match.p2 : match.p1;
  if (!winner) throw new Error('The opponent for this match is not known yet.');
  return {
    ...cleared(match),
    status: 'completed',
    result: match.phase === 'qualifying' ? 'forfeit' : 'walkover',
    score1: winner === match.p1 ? raceTo : 0,
    score2: winner === match.p2 ? raceTo : 0,
    winnerId: winner,
    loserId: loser,
    forfeitedBy: ids,
    table: null,
    completedAt: now,
  };
}

/**
 * Playoff results created automatically when a bracket position is empty (its feeder ended
 * with no winner). None of these is a match win and none pays a match-win payout:
 *   admin-bye — one position empty; the player in the other position advances
 *   empty     — both positions empty; nobody advances
 *   vacated   — one position empty and the other player has withdrawn; nobody advances
 * Championship only:
 *   champion-walkover — one finalist position empty, the other finalist is eligible; that player is
 *                       Champion by Walkover and is paid the full championship payout (with transfers)
 */
export const EMPTY_POSITION_RESULTS = ['admin-bye', 'empty', 'vacated'];
export const CHAMPION_WALKOVER = 'champion-walkover';

export function emptyPositionResult(match, kind, playerId, now) {
  if (!EMPTY_POSITION_RESULTS.includes(kind) && kind !== CHAMPION_WALKOVER) throw new Error('Unknown administrative result.');
  return {
    ...cleared(match),
    status: 'completed',
    result: kind,
    winnerId: kind === 'admin-bye' || kind === CHAMPION_WALKOVER ? playerId : null,
    forfeitedBy: kind === 'vacated' ? [playerId] : [],
    table: null,
    completedAt: now,
    auto: 'empty-position',
  };
}

/** True only for results that pay the match-win payout. */
export function paysMatchWin(match) {
  return Boolean(match?.winnerId) && ['played', 'forfeit', 'walkover', CHAMPION_WALKOVER].includes(match.result);
}

export function isAdministrative(match) {
  return ['forfeit', 'double-forfeit', 'walkover', CHAMPION_WALKOVER, ...EMPTY_POSITION_RESULTS].includes(match?.result);
}
