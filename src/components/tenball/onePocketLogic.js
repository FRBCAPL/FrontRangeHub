/** CSI One Pocket helpers (Rules Section 5). Foot-corner scoring only. */

export const FOOT_POCKET_TOP = 'top-right';
export const FOOT_POCKET_BOTTOM = 'bottom-right';
export const ONE_POCKET_RACE = 8;

export const FOOT_POCKETS = [FOOT_POCKET_TOP, FOOT_POCKET_BOTTOM];

export function isFootPocket(pocketId) {
  return FOOT_POCKETS.includes(pocketId);
}

export function oppositeFootPocket(pocketId) {
  return pocketId === FOOT_POCKET_TOP ? FOOT_POCKET_BOTTOM : FOOT_POCKET_TOP;
}

export function pocketLabelShort(pocketId) {
  if (pocketId === FOOT_POCKET_TOP) return 'Top foot corner';
  if (pocketId === FOOT_POCKET_BOTTOM) return 'Bottom foot corner';
  return 'Pocket';
}

/** Breaker chooses a foot pocket; opponent gets the other. */
export function assignTargetPockets(breakerPocket, breaker = 1) {
  const other = oppositeFootPocket(breakerPocket);
  if (breaker === 1) return { 1: breakerPocket, 2: other };
  return { 1: other, 2: breakerPocket };
}

/**
 * Classify object balls pocketed this shot.
 * scratchCue: cue scratched or jumped — opponent-pocket balls do not count (5-8e).
 */
export function classifyOnePocketPocketed(ballsPocketed, targets, shooter, { scratchCue = false } = {}) {
  const mine = targets?.[shooter];
  const theirs = targets?.[shooter === 1 ? 2 : 1];
  const forShooter = [];
  const forOpponent = [];
  const illegal = [];

  (ballsPocketed || []).forEach((ball) => {
    const pocket = ball.pocketedPocket;
    if (pocket === mine) forShooter.push(ball);
    else if (pocket === theirs) {
      if (scratchCue) illegal.push(ball);
      else forOpponent.push(ball);
    } else {
      illegal.push(ball);
    }
  });

  return { forShooter, forOpponent, illegal };
}

/** Apply foul ball penalty (CSI 5-9): reduce score or add an owe. */
export function applyFoulBallPenalty(scores, owed, scoredIds, player) {
  const nextScores = { 1: scores[1] || 0, 2: scores[2] || 0 };
  const nextOwed = { 1: owed[1] || 0, 2: owed[2] || 0 };
  const nextScored = {
    1: [...(scoredIds[1] || [])],
    2: [...(scoredIds[2] || [])]
  };
  let spottedId = null;

  if (nextScores[player] > 0 && nextScored[player].length > 0) {
    spottedId = nextScored[player].pop();
    nextScores[player] -= 1;
  } else if (nextScores[player] > 0) {
    nextScores[player] -= 1;
  } else {
    nextOwed[player] += 1;
  }

  return { scores: nextScores, owed: nextOwed, scoredIds: nextScored, spottedId };
}

/** After a scoring inning, clear owes by spotting scored balls (5-9.2). */
export function clearOwesAfterScoring(scores, owed, scoredIds, player) {
  const nextScores = { 1: scores[1] || 0, 2: scores[2] || 0 };
  const nextOwed = { 1: owed[1] || 0, 2: owed[2] || 0 };
  const nextScored = {
    1: [...(scoredIds[1] || [])],
    2: [...(scoredIds[2] || [])]
  };
  const spotIds = [];

  while (nextOwed[player] > 0 && nextScored[player].length > 0) {
    spotIds.push(nextScored[player].pop());
    nextScores[player] -= 1;
    nextOwed[player] -= 1;
  }

  return { scores: nextScores, owed: nextOwed, scoredIds: nextScored, spotIds };
}

export function hasWonOnePocket(scores, owed, player) {
  return (scores?.[player] || 0) >= ONE_POCKET_RACE && (owed?.[player] || 0) === 0;
}

/**
 * Spot object balls near the foot spot without overlapping live balls.
 */
export function spotObjectBalls(balls, idsToSpot, footX, footY, ballRadius) {
  if (!idsToSpot?.length) return balls;
  const spotSet = new Set(idsToSpot);
  const live = (balls || []).filter((ball) => !spotSet.has(ball.id) && ball.visible && !ball.pocketed);
  const placements = [];
  const gap = ballRadius * 2.15;
  const candidates = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      candidates.push({
        x: footX + row * gap * 0.15,
        y: footY + col * gap
      });
    }
  }

  const free = (x, y) => {
    const others = [...live, ...placements];
    return others.every((ball) => Math.hypot(ball.x - x, ball.y - y) >= gap - 0.5);
  };

  return (balls || []).map((ball) => {
    if (!spotSet.has(ball.id)) return ball;
    const spot = candidates.find((c) => free(c.x, c.y)) || { x: footX, y: footY };
    placements.push({ x: spot.x, y: spot.y });
    return {
      ...ball,
      pocketed: false,
      visible: true,
      x: spot.x,
      y: spot.y,
      vx: 0,
      vy: 0,
      isMoving: false,
      pocketedPocket: null,
      wasPocketedBeforeShot: false
    };
  });
}
