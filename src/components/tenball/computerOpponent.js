import {
  BALL_RADIUS,
  KITCHEN_LEFT,
  KITCHEN_RIGHT,
  KITCHEN_TOP,
  KITCHEN_BOTTOM,
  FOOT_SPOT_X,
  FOOT_SPOT_Y
} from './constants';

const FELT_LEFT = 30;
const FELT_RIGHT = 570.77;
const FELT_TOP = 24.5;
const FELT_BOTTOM = 270.18;
const MID_X = (FELT_LEFT + FELT_RIGHT) / 2;

// Above-average: takes solid mid-table pots, still refuses hero cuts.
const MAX_MAKE_CUT = 1.02;
const MIN_MAKE_SCORE = 900;
// One Pocket: only soft, high-percentage pots — otherwise play safe.
const ONE_POCKET_MAX_CUT = 0.55;
const ONE_POCKET_MIN_MAKE = 1180;
const ONE_POCKET_MAX_POWER = 0.36;

const POCKETS = [
  { id: 'top-left', x: FELT_LEFT, y: FELT_TOP },
  { id: 'top-right', x: FELT_RIGHT, y: FELT_TOP },
  { id: 'bottom-left', x: FELT_LEFT, y: FELT_BOTTOM },
  { id: 'bottom-right', x: FELT_RIGHT, y: FELT_BOTTOM },
  { id: 'top-center', x: MID_X, y: FELT_TOP },
  { id: 'bottom-center', x: MID_X, y: FELT_BOTTOM }
];

const liveBalls = (balls) => balls.filter((ball) => ball.visible && !ball.pocketed);

const lowestBall = (balls) => liveBalls(balls).reduce((lowest, ball) => (
  !lowest || ball.id < lowest.id ? ball : lowest
), null);

const nextBallAfter = (balls, currentId) => liveBalls(balls)
  .filter((ball) => ball.id !== currentId)
  .sort((a, b) => a.id - b.id)[0] || null;

// legalBallIds array => 8-ball (or open table); null/undefined => rotation (9/10).
const isGroupMode = (legalBallIds) => Array.isArray(legalBallIds);

/** Next ball to leave shape on: own group / legal set, then the 8; rotation stays lowest-next. */
const nextBallForShape = (balls, currentId, legalBallIds = null) => {
  if (!isGroupMode(legalBallIds)) return nextBallAfter(balls, currentId);
  const allowed = new Set(legalBallIds);
  const ownNext = liveBalls(balls)
    .filter((ball) => ball.id !== currentId && allowed.has(ball.id) && ball.id !== 8)
    .sort((a, b) => a.id - b.id)[0];
  if (ownNext) return ownNext;
  const eight = liveBalls(balls).find((ball) => ball.id === 8);
  return eight && eight.id !== currentId ? eight : null;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const clampToTable = (x, y, kitchenOnly) => {
  if (kitchenOnly) {
    return {
      x: clamp(x, KITCHEN_LEFT + BALL_RADIUS, KITCHEN_RIGHT - BALL_RADIUS),
      y: clamp(y, KITCHEN_TOP + BALL_RADIUS, KITCHEN_BOTTOM - BALL_RADIUS)
    };
  }
  return {
    x: clamp(x, FELT_LEFT + BALL_RADIUS, FELT_RIGHT - BALL_RADIUS),
    y: clamp(y, FELT_TOP + BALL_RADIUS, FELT_BOTTOM - BALL_RADIUS)
  };
};

const overlapsBall = (x, y, balls) => liveBalls(balls).some((ball) => (
  Math.hypot(ball.x - x, ball.y - y) < BALL_RADIUS * 2 + 1
));

const pointSegmentDistance = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

const pathClear = (x1, y1, x2, y2, balls, ignoreIds = []) => {
  const ignore = new Set(ignoreIds);
  return liveBalls(balls).every((ball) => {
    if (ignore.has(ball.id)) return true;
    return pointSegmentDistance(ball.x, ball.y, x1, y1, x2, y2) >= BALL_RADIUS * 2 - 0.3;
  });
};

/** First cushion hit on the straight line from `from` toward a mirrored target. */
const railPointForMirror = (from, virt, side) => {
  const dx = virt.x - from.x;
  const dy = virt.y - from.y;
  if (side === 'top') {
    if (Math.abs(dy) < 1e-6) return null;
    const t = (FELT_TOP - from.y) / dy;
    if (t <= 0.02 || t >= 0.98) return null;
    const x = from.x + t * dx;
    if (x < FELT_LEFT + 2 || x > FELT_RIGHT - 2) return null;
    return { x, y: FELT_TOP };
  }
  if (side === 'bottom') {
    if (Math.abs(dy) < 1e-6) return null;
    const t = (FELT_BOTTOM - from.y) / dy;
    if (t <= 0.02 || t >= 0.98) return null;
    const x = from.x + t * dx;
    if (x < FELT_LEFT + 2 || x > FELT_RIGHT - 2) return null;
    return { x, y: FELT_BOTTOM };
  }
  if (side === 'left') {
    if (Math.abs(dx) < 1e-6) return null;
    const t = (FELT_LEFT - from.x) / dx;
    if (t <= 0.02 || t >= 0.98) return null;
    const y = from.y + t * dy;
    if (y < FELT_TOP + 2 || y > FELT_BOTTOM - 2) return null;
    return { x: FELT_LEFT, y };
  }
  if (side === 'right') {
    if (Math.abs(dx) < 1e-6) return null;
    const t = (FELT_RIGHT - from.x) / dx;
    if (t <= 0.02 || t >= 0.98) return null;
    const y = from.y + t * dy;
    if (y < FELT_TOP + 2 || y > FELT_BOTTOM - 2) return null;
    return { x: FELT_RIGHT, y };
  }
  return null;
};

const kickMirrorsFor = (point) => ([
  { side: 'top', virt: { x: point.x, y: 2 * FELT_TOP - point.y } },
  { side: 'bottom', virt: { x: point.x, y: 2 * FELT_BOTTOM - point.y } },
  { side: 'left', virt: { x: 2 * FELT_LEFT - point.x, y: point.y } },
  { side: 'right', virt: { x: 2 * FELT_RIGHT - point.x, y: point.y } }
]);

/** Cue path is blocked to ghost — need a rail / alternate route. */
const cuePathBlocked = (cue, ball, target, balls) => {
  const ghost = ghostFor(ball, target);
  return !pathClear(cue.x, cue.y, ghost.x, ghost.y, balls, [ball.id]);
};

const ghostFor = (ball, target) => {
  const dx = ball.x - target.x;
  const dy = ball.y - target.y;
  const dist = Math.hypot(dx, dy) || 1;
  return {
    x: ball.x + (dx / dist) * BALL_RADIUS * 2,
    y: ball.y + (dy / dist) * BALL_RADIUS * 2
  };
};

const cutAngle = (cue, ball, target) => {
  const toBall = Math.atan2(ball.y - cue.y, ball.x - cue.x);
  const toTarget = Math.atan2(target.y - ball.y, target.x - ball.x);
  let diff = Math.abs(toBall - toTarget);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff;
};

const nearestPocket = (ball) => {
  let best = POCKETS[0];
  let nearest = Infinity;
  POCKETS.forEach((candidate) => {
    const dist = Math.hypot(candidate.x - ball.x, candidate.y - ball.y);
    if (dist < nearest) {
      nearest = dist;
      best = candidate;
    }
  });
  return best;
};

// Firm enough to drop, soft enough to hold shape — above-average pace control.
const potPower = (cueDist, objectTravel, cut, kind) => {
  const travel = cueDist + objectTravel;
  let power = 0.26 + travel / 2100 + cut * 0.07;
  if (kind === 'bank') power += 0.06;
  if (kind === 'combo') power += 0.08;
  if (kind === 'kick') power += 0.1;
  if (travel < 100 && cut < 0.28) power = Math.min(power, 0.34);
  else if (travel < 170 && cut < 0.45) power = Math.min(power, 0.42);
  else if (travel > 280) power = Math.max(power, 0.4);
  return clamp(power, 0.24, kind === 'direct' ? 0.62 : 0.66);
};

const estimateLeave = (ball, pocket, englishFollow) => {
  const dx = pocket.x - ball.x;
  const dy = pocket.y - ball.y;
  const len = Math.hypot(dx, dy) || 1;
  // Stun leaves near contact; follow drifts toward the pocket line.
  const back = englishFollow > 0.15 ? -12 : 30;
  return {
    x: ball.x - (dx / len) * back,
    y: ball.y - (dy / len) * back
  };
};

const positionBonus = (ball, pocket, balls, englishFollow = 0, legalBallIds = null) => {
  const next = nextBallForShape(balls, ball.id, legalBallIds);
  if (!next) return 80;
  const leave = estimateLeave(ball, pocket, englishFollow);
  let best = Infinity;
  let bestCut = Math.PI;
  POCKETS.forEach((p) => {
    const ghost = ghostFor(next, p);
    const dist = Math.hypot(leave.x - ghost.x, leave.y - ghost.y);
    const cut = cutAngle(leave, next, p);
    if (dist < best) {
      best = dist;
      bestCut = cut;
    }
  });
  // Reward natural angle on the next ball, not just distance.
  return clamp(190 - best * 0.5 - bestCut * 70, -10, 180);
};

const pickEnglish = (ball, pocket, balls, cut, legalBallIds = null) => {
  const next = nextBallForShape(balls, ball.id, legalBallIds);
  if (!next) return { english: 0, englishDirection: 0 };
  const toPocket = Math.atan2(pocket.y - ball.y, pocket.x - ball.x);
  const toNext = Math.atan2(next.y - ball.y, next.x - ball.x);
  let diff = Math.abs(toPocket - toNext);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  if (diff < 0.5 && cut < 0.6) return { english: 0.34, englishDirection: 270 };
  if (diff > 2.2) return { english: 0.36, englishDirection: 90 };
  const cross = Math.sin(toNext - toPocket);
  if (Math.abs(cross) > 0.28) {
    return { english: 0.28, englishDirection: cross > 0 ? 0 : 180 };
  }
  // Slight stun by default to hold the table.
  return { english: 0.12, englishDirection: 90 };
};

const finishShot = (cue, ball, target, pocket, balls, { scoreBase, kind = 'direct', legalBallIds = null }) => {
  const ghost = ghostFor(ball, target);
  if (!pathClear(cue.x, cue.y, ghost.x, ghost.y, balls, [ball.id])) return null;
  if (!pathClear(ball.x, ball.y, target.x, target.y, balls, [ball.id])) return null;
  const cut = cutAngle(cue, ball, target);
  const maxCut = kind === 'direct' ? MAX_MAKE_CUT : kind === 'kick' ? 0.85 : 0.75;
  if (cut > maxCut) return null;
  const objectTravel = Math.hypot(ball.x - target.x, ball.y - target.y);
  const cueDist = Math.hypot(cue.x - ghost.x, cue.y - ghost.y);
  if (kind === 'direct' && objectTravel > 340 && cut > 0.7) return null;
  const english = pickEnglish(ball, pocket, balls, cut, legalBallIds);
  const corner = pocket.id.includes('center') ? -6 : 32;
  const shape = positionBonus(
    ball,
    pocket,
    balls,
    english.englishDirection === 270 ? english.english : 0,
    legalBallIds
  );
  const percent = 240 - cut * 280 - objectTravel * 0.28 - cueDist * 0.1;
  return {
    score: scoreBase + percent + corner + shape,
    aimAngle: Math.atan2(ghost.y - cue.y, ghost.x - cue.x),
    power: potPower(cueDist, objectTravel, cut, kind),
    calledBall: ball.id,
    calledPocket: pocket.id,
    cut,
    kind,
    ...english
  };
};

const scoreDirectShot = (cue, ball, pocket, balls, legalBallIds = null) => {
  if (!pathClear(ball.x, ball.y, pocket.x, pocket.y, balls, [ball.id])) return null;
  return finishShot(cue, ball, pocket, pocket, balls, {
    scoreBase: 1120,
    kind: 'direct',
    legalBallIds
  });
};

const scoreBankShot = (cue, ball, pocket, balls, legalBallIds = null) => {
  const mirrors = [
    { x: pocket.x, y: 2 * FELT_TOP - pocket.y },
    { x: pocket.x, y: 2 * FELT_BOTTOM - pocket.y },
    { x: 2 * FELT_LEFT - pocket.x, y: pocket.y },
    { x: 2 * FELT_RIGHT - pocket.x, y: pocket.y }
  ];
  let best = null;
  mirrors.forEach((virt) => {
    if (Math.hypot(virt.x - pocket.x, virt.y - pocket.y) < 40) return;
    const objectTravel = Math.hypot(ball.x - virt.x, ball.y - virt.y);
    if (objectTravel > 300) return;
    const shot = finishShot(cue, ball, virt, pocket, balls, {
      scoreBase: 800,
      kind: 'bank',
      legalBallIds
    });
    if (shot && (!best || shot.score > best.score)) best = shot;
  });
  return best;
};

// One-rail kick when the direct cue path to the object ball is blocked.
const scoreKickShot = (cue, ball, pocket, balls, legalBallIds = null) => {
  if (!cuePathBlocked(cue, ball, pocket, balls)) return null;
  if (!pathClear(ball.x, ball.y, pocket.x, pocket.y, balls, [ball.id])) return null;
  const ghost = ghostFor(ball, pocket);
  let best = null;
  kickMirrorsFor(ghost).forEach(({ side, virt }) => {
    const rail = railPointForMirror(cue, virt, side);
    if (!rail) return;
    // Real path: cue → cushion → ghost (not a straight line through the mirrored point).
    if (!pathClear(cue.x, cue.y, rail.x, rail.y, balls, [ball.id])) return;
    if (!pathClear(rail.x, rail.y, ghost.x, ghost.y, balls, [ball.id])) return;
    const cut = cutAngle(rail, ball, pocket);
    if (cut > 0.95) return;
    const travel = Math.hypot(cue.x - rail.x, cue.y - rail.y)
      + Math.hypot(rail.x - ghost.x, rail.y - ghost.y);
    if (travel > 520) return;
    const english = pickEnglish(ball, pocket, balls, cut, legalBallIds);
    const shape = positionBonus(ball, pocket, balls, 0, legalBallIds);
    // Prefer kicks when the direct line is jammed — score high enough to beat safeties.
    const shot = {
      score: 980 - travel * 0.28 - cut * 220 + shape,
      aimAngle: Math.atan2(virt.y - cue.y, virt.x - cue.x),
      power: potPower(travel * 0.55, Math.hypot(ball.x - pocket.x, ball.y - pocket.y), cut, 'kick'),
      calledBall: ball.id,
      calledPocket: pocket.id,
      cut,
      kind: 'kick',
      ...english
    };
    if (!best || shot.score > best.score) best = shot;
  });
  return best;
};

/** Kick just to contact the object ball (no pot) when every direct line is blocked. */
const kickContactShot = (cue, ball, balls, calledPocketId) => {
  let best = null;
  // Aim at several contact points around the ball so a rail line can find the face.
  const contacts = [
    { x: ball.x, y: ball.y },
    { x: ball.x - BALL_RADIUS, y: ball.y },
    { x: ball.x + BALL_RADIUS, y: ball.y },
    { x: ball.x, y: ball.y - BALL_RADIUS },
    { x: ball.x, y: ball.y + BALL_RADIUS }
  ];
  contacts.forEach((point) => {
    kickMirrorsFor(point).forEach(({ side, virt }) => {
      const rail = railPointForMirror(cue, virt, side);
      if (!rail) return;
      if (!pathClear(cue.x, cue.y, rail.x, rail.y, balls, [ball.id])) return;
      if (!pathClear(rail.x, rail.y, point.x, point.y, balls, [ball.id])) return;
      const travel = Math.hypot(cue.x - rail.x, cue.y - rail.y)
        + Math.hypot(rail.x - point.x, rail.y - point.y);
      if (travel > 560) return;
      const score = 420 - travel * 0.2;
      if (!best || score > best.score) {
        best = {
          score,
          aimAngle: Math.atan2(virt.y - cue.y, virt.x - cue.x),
          power: clamp(0.28 + travel / 1400, 0.26, 0.48),
          calledBall: ball.id,
          calledPocket: calledPocketId || nearestPocket(ball).id,
          pushOut: false,
          cue: null,
          english: 0.16,
          englishDirection: 90,
          kind: 'kick-safe'
        };
      }
    });
  });
  if (!best) return null;
  const { score, ...shot } = best;
  return shot;
};

const scoreComboShot = (cue, lowest, object, pocket, balls) => {
  if (!pathClear(object.x, object.y, pocket.x, pocket.y, balls, [object.id, lowest.id])) return null;
  const transfer = ghostFor(object, pocket);
  const ghost = ghostFor(lowest, transfer);
  if (!pathClear(cue.x, cue.y, ghost.x, ghost.y, balls, [lowest.id])) return null;
  if (!pathClear(lowest.x, lowest.y, transfer.x, transfer.y, balls, [lowest.id, object.id])) return null;
  const cut = cutAngle(cue, lowest, transfer);
  if (cut > 0.72) return null;
  const pocketDist = Math.hypot(object.x - pocket.x, object.y - pocket.y);
  const transferDist = Math.hypot(lowest.x - transfer.x, lowest.y - transfer.y);
  const cueDist = Math.hypot(cue.x - ghost.x, cue.y - ghost.y);
  if (pocketDist + transferDist > 280) return null;
  return {
    score: 860 - pocketDist * 0.45 - transferDist * 0.4 - cueDist * 0.18 - cut * 260,
    aimAngle: Math.atan2(ghost.y - cue.y, ghost.x - cue.x),
    power: potPower(cueDist, transferDist + pocketDist, cut, 'combo'),
    calledBall: object.id,
    calledPocket: pocket.id,
    cut,
    kind: 'combo',
    english: 0.18,
    englishDirection: 270
  };
};

const cuePlacements = (ball, pocket, balls, kitchenOnly) => {
  const ghost = ghostFor(ball, pocket);
  const dx = ghost.x - ball.x;
  const dy = ghost.y - ball.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const spots = [];
  [36, 52, 70, 92, 118, 150, 190, 230].forEach((back) => {
    [-26, -12, 0, 12, 26].forEach((side) => {
      const spot = clampToTable(
        ghost.x + ux * back - uy * side,
        ghost.y + uy * back + ux * side,
        kitchenOnly
      );
      if (!overlapsBall(spot.x, spot.y, balls)) spots.push(spot);
    });
  });
  return spots;
};

const targetBalls = (balls, legalBallIds, onePocket = false) => {
  // One Pocket: every object ball is legal.
  if (onePocket) return liveBalls(balls);
  // 8-ball / open table: only the supplied legal set (may be empty).
  if (isGroupMode(legalBallIds)) {
    const allowed = new Set(legalBallIds);
    return liveBalls(balls).filter((ball) => allowed.has(ball.id));
  }
  // Rotation: always the lowest ball on the table.
  const lowest = lowestBall(balls);
  return lowest ? [lowest] : [];
};

const pocketsForShot = (targetPocketId) => {
  if (!targetPocketId) return POCKETS;
  return POCKETS.filter((pocket) => pocket.id === targetPocketId);
};

const oppositeFootPocketId = (targetPocketId) => (
  targetPocketId === 'top-right' ? 'bottom-right'
    : targetPocketId === 'bottom-right' ? 'top-right'
      : null
);

const pocketById = (id) => POCKETS.find((pocket) => pocket.id === id) || null;

/** Soften power and punish shots that open the opponent's side of the foot. */
const tuneOnePocketMake = (shot, cue, balls, targetPocketId) => {
  if (!shot || !targetPocketId) return shot;
  const oppId = oppositeFootPocketId(targetPocketId);
  const opp = pocketById(oppId);
  const own = pocketById(targetPocketId);
  let score = shot.score;
  let power = Math.min(shot.power * 0.55, ONE_POCKET_MAX_POWER);

  // Only short, soft, nearly straight pots.
  if (shot.cut > ONE_POCKET_MAX_CUT) return null;
  if (shot.kind && shot.kind !== 'direct') return null;

  const objectTravel = shot.calledBall != null
    ? (() => {
      const ball = liveBalls(balls).find((b) => b.id === shot.calledBall);
      return ball && own ? Math.hypot(ball.x - own.x, ball.y - own.y) : 200;
    })()
    : 200;
  if (objectTravel > 160) score -= (objectTravel - 160) * 2.2;
  if (objectTravel > 220) return null;

  // Cluster near the opponent's hole — blasting here gifts them the table.
  if (opp) {
    const nearOpp = liveBalls(balls).filter((ball) => (
      Math.hypot(ball.x - opp.x, ball.y - opp.y) < 95
    )).length;
    if (nearOpp >= 2) score -= 180 + nearOpp * 40;
    // Object ball sitting on their side of the foot rail is a bad first target.
    const obj = liveBalls(balls).find((b) => b.id === shot.calledBall);
    if (obj) {
      const towardOpp = Math.hypot(obj.x - opp.x, obj.y - opp.y);
      const towardOwn = own ? Math.hypot(obj.x - own.x, obj.y - own.y) : 999;
      if (towardOpp + 30 < towardOwn) score -= 220;
    }
  }

  // Prefer stun / soft — no follow-through power wars.
  power = clamp(power, 0.18, ONE_POCKET_MAX_POWER);
  score -= power * 120;

  return {
    ...shot,
    score,
    power,
    english: Math.min(shot.english || 0, 0.14),
    englishDirection: 90
  };
};

const bestShotFromCue = (cue, balls, legalBallIds = null, targetPocketId = null) => {
  const onePocket = Boolean(targetPocketId);
  const targets = targetBalls(balls, legalBallIds, onePocket);
  if (targets.length === 0) return null;
  let best = null;
  const groupMode = !onePocket && isGroupMode(legalBallIds);
  const allowed = groupMode ? new Set(legalBallIds) : null;
  const pocketList = pocketsForShot(targetPocketId);

  const consider = (shot) => {
    const tuned = onePocket ? tuneOnePocketMake(shot, cue, balls, targetPocketId) : shot;
    if (tuned && (!best || tuned.score > best.score)) best = tuned;
  };

  targets.forEach((ball) => {
    pocketList.forEach((pocket) => {
      consider(scoreDirectShot(cue, ball, pocket, balls, legalBallIds));
      // One Pocket: no banks / kicks / combos — those are the hard, stack-opening shots.
      if (!onePocket) {
        consider(scoreBankShot(cue, ball, pocket, balls, legalBallIds));
        consider(scoreKickShot(cue, ball, pocket, balls, legalBallIds));
      }
    });

    if (onePocket) return;
    liveBalls(balls).forEach((object) => {
      if (object.id === ball.id) return;
      // 8-ball: only combo into another legal (own-group / open) ball — never opponent balls.
      if (groupMode && !allowed.has(object.id)) return;
      // Never combo the 8 as the first-hit ball into something else when on the 8.
      if (groupMode && ball.id === 8) return;
      pocketList.forEach((pocket) => {
        consider(scoreComboShot(cue, ball, object, pocket, balls));
      });
    });
  });

  return best;
};

const withAimMiss = (shot) => {
  // Above-average stroke: nearly exact on makeable pots.
  const easy = shot.cut < 0.35;
  const missScale = easy ? 0.0012 : (0.0025 + shot.cut * 0.01);
  const miss = (Math.random() - 0.5) * missScale;
  const powerNudge = 1 + (Math.random() - 0.5) * (easy ? 0.01 : 0.02);
  return {
    ...shot,
    aimAngle: shot.aimAngle + miss,
    power: clamp(shot.power * powerNudge, 0.22, 0.68)
  };
};

const safetyShot = (cue, balls, legalBallIds = null, targetPocketId = null) => {
  const onePocket = Boolean(targetPocketId);
  const opp = onePocket ? pocketById(oppositeFootPocketId(targetPocketId)) : null;
  // One Pocket: pick a ball far from the opponent's hole when possible.
  const pool = targetBalls(balls, legalBallIds, onePocket);
  const ball = (onePocket && opp
    ? [...pool].sort((a, b) => (
      Math.hypot(b.x - opp.x, b.y - opp.y) - Math.hypot(a.x - opp.x, a.y - opp.y)
    ))[0]
    : pool[0])
    || (onePocket || isGroupMode(legalBallIds) ? null : lowestBall(balls));
  if (!ball) return null;

  // Soft rail taps / thin freezes — never a length-of-table blast.
  const railTargets = onePocket
    ? [
      { x: ball.x, y: FELT_TOP },
      { x: ball.x, y: FELT_BOTTOM },
      { x: FELT_LEFT, y: ball.y },
      // Prefer short side of foot rail on own half, not into their jaw.
      { x: FELT_RIGHT - 8, y: ball.y }
    ]
    : [
      { x: ball.x, y: FELT_TOP },
      { x: ball.x, y: FELT_BOTTOM },
      { x: FELT_LEFT, y: ball.y },
      { x: FELT_RIGHT, y: ball.y },
      { x: FELT_LEFT, y: FELT_TOP },
      { x: FELT_RIGHT, y: FELT_TOP },
      { x: FELT_LEFT, y: FELT_BOTTOM },
      { x: FELT_RIGHT, y: FELT_BOTTOM }
    ];

  let best = null;
  railTargets.forEach((target) => {
    const ghost = ghostFor(ball, target);
    if (!pathClear(cue.x, cue.y, ghost.x, ghost.y, balls, [ball.id])) return;
    const cut = cutAngle(cue, ball, target);
    if (cut > (onePocket ? 0.95 : 1.15)) return;
    const cueDist = Math.hypot(cue.x - ghost.x, cue.y - ghost.y);
    const railDist = Math.min(
      Math.abs(ball.x - FELT_LEFT),
      Math.abs(FELT_RIGHT - ball.x),
      Math.abs(ball.y - FELT_TOP),
      Math.abs(FELT_BOTTOM - ball.y)
    );
    // Hide the cue near a rail opposite the object ball when possible.
    const hide = Math.hypot(cue.x - MID_X, cue.y - 150) * 0.05;
    let score = 280 - cut * 40 - cueDist * 0.07 + railDist * 0.25 - hide;
    if (onePocket && opp) {
      // Do not send the object ball toward their pocket.
      const sendTowardOpp = Math.hypot(target.x - opp.x, target.y - opp.y)
        < Math.hypot(ball.x - opp.x, ball.y - opp.y);
      if (sendTowardOpp) score -= 200;
      score += Math.hypot(ball.x - opp.x, ball.y - opp.y) * 0.15;
    }
    const power = onePocket
      ? clamp(0.16 + Math.hypot(ball.x - target.x, ball.y - target.y) / 2200, 0.14, 0.26)
      : clamp(0.22 + Math.hypot(ball.x - target.x, ball.y - target.y) / 1300, 0.2, 0.4);
    if (!best || score > best.score) {
      best = {
        score,
        aimAngle: Math.atan2(ghost.y - cue.y, ghost.x - cue.x),
        power,
        calledBall: ball.id,
        calledPocket: onePocket ? targetPocketId : nearestPocket(ball).id,
        pushOut: false,
        cue: null,
        english: onePocket ? 0.1 : 0.22,
        englishDirection: 90
      };
    }
  });

  if (best) {
    const { score, ...shot } = best;
    return shot;
  }

  // Never aim straight through a blocker — kick off a rail to reach the object ball.
  const pocket = onePocket ? pocketById(targetPocketId) : nearestPocket(ball);
  const kickSafe = kickContactShot(cue, ball, balls, pocket?.id || nearestPocket(ball).id);
  if (kickSafe) return kickSafe;

  // Last resort: nudge toward the nearest clear gap past the object ball's face.
  let escape = null;
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const gx = ball.x + Math.cos(rad) * BALL_RADIUS * 2;
    const gy = ball.y + Math.sin(rad) * BALL_RADIUS * 2;
    if (!pathClear(cue.x, cue.y, gx, gy, balls, [ball.id])) continue;
    const dist = Math.hypot(cue.x - gx, cue.y - gy);
    const score = -dist;
    if (!escape || score > escape.score) {
      escape = {
        score,
        aimAngle: Math.atan2(gy - cue.y, gx - cue.x),
        power: onePocket ? 0.18 : 0.26,
        calledBall: ball.id,
        calledPocket: pocket?.id || nearestPocket(ball).id,
        pushOut: false,
        cue: null,
        english: 0.1,
        englishDirection: 90
      };
    }
  }
  if (escape) {
    const { score, ...shot } = escape;
    return shot;
  }

  // Absolute fallback still aims at a rail mirror of the ball, not through traffic.
  const kickAny = kickContactShot(cue, ball, balls, pocket?.id);
  if (kickAny) return kickAny;
  return {
    canMake: false,
    aimAngle: Math.atan2(FELT_TOP - cue.y, MID_X - cue.x),
    power: onePocket ? 0.16 : 0.22,
    calledBall: ball.id,
    calledPocket: pocket?.id || nearestPocket(ball).id,
    pushOut: false,
    cue: null,
    english: 0.1,
    englishDirection: 90
  };
};

const takeMakeOrSafety = (shot, cue, balls, legalBallIds = null, targetPocketId = null) => {
  const onePocket = Boolean(targetPocketId);
  const minScore = onePocket ? ONE_POCKET_MIN_MAKE : MIN_MAKE_SCORE;
  const maxCut = onePocket ? ONE_POCKET_MAX_CUT : MAX_MAKE_CUT;
  if (
    shot
    && shot.score >= minScore
    && shot.cut <= maxCut
    && (!onePocket || (shot.power || 0) <= ONE_POCKET_MAX_POWER + 0.02)
  ) {
    const played = withAimMiss(shot);
    if (onePocket) {
      played.power = clamp(played.power * 0.85, 0.16, ONE_POCKET_MAX_POWER);
    }
    return { ...played, canMake: true, pushOut: false, cue: null };
  }
  // Kick / bank / combo: take a makeable alternate route instead of crashing into traffic.
  if (
    !onePocket
    && shot
    && shot.kind
    && shot.kind !== 'direct'
    && shot.score >= 620
    && shot.cut <= maxCut + 0.12
  ) {
    return { ...withAimMiss(shot), canMake: true, pushOut: false, cue: null };
  }
  const safe = safetyShot(cue, balls, legalBallIds, targetPocketId);
  if (!safe) return null;
  return { ...safe, canMake: false };
};

export function planComputerShot({
  cue,
  balls,
  ballInHand,
  kitchenBallInHand = false,
  isBreakShot,
  pushOutAvailable,
  legalBallIds = null,
  targetPocketId = null
}) {
  const onePocket = Boolean(targetPocketId);
  const candidates = targetBalls(balls, legalBallIds, onePocket);
  const pocketList = pocketsForShot(targetPocketId);

  if (isBreakShot) {
    const apex = lowestBall(balls) || candidates[0];
    if (!apex) return null;
    // One Pocket: softish break toward the foot; prefer own-side lean when pocket known.
    const side = targetPocketId === 'top-right'
      ? -1
      : targetPocketId === 'bottom-right'
        ? 1
        : (Math.random() > 0.5 ? 1 : -1);
    const spot = clampToTable(114, 150 + side * (4 + Math.random() * 6), true);
    const aimAngle = Math.atan2(apex.y - spot.y, apex.x - spot.x) + side * 0.012;
    return {
      canMake: true,
      aimAngle,
      // Soft One Pocket break — just meet the cushion rule, don't scatter their side.
      power: onePocket ? 0.34 : 0.78,
      calledBall: null,
      calledPocket: null,
      pushOut: false,
      cue: spot,
      english: onePocket ? 0.08 : 0.15,
      englishDirection: 270
    };
  }

  const ball = candidates[0]
    || (onePocket || isGroupMode(legalBallIds) ? null : lowestBall(balls));
  if (!ball) return null;

  // Kitchen BIH: One Pocket scratch, or CSI 9/10 scratch on the break.
  const kitchenOnly = Boolean(ballInHand && kitchenBallInHand);

  if (ballInHand) {
    let best = null;
    let bestCue = null;
    candidates.forEach((target) => {
      pocketList.forEach((pocket) => {
        cuePlacements(target, pocket, balls, kitchenOnly).forEach((spot) => {
          const shot = scoreDirectShot(spot, target, pocket, balls, legalBallIds);
          if (shot && (!best || shot.score > best.score)) {
            best = shot;
            bestCue = spot;
          }
        });
      });
    });
    const probes = kitchenOnly
      ? [
        clampToTable(90, 110, true),
        clampToTable(90, 150, true),
        clampToTable(90, 190, true),
        clampToTable(120, 130, true),
        clampToTable(120, 170, true)
      ]
      : [
        clampToTable(MID_X - 50, 150, false),
        clampToTable(MID_X + 50, 150, false),
        clampToTable(MID_X - 25, 110, false),
        clampToTable(MID_X + 25, 190, false),
        clampToTable(MID_X, 130, false),
        clampToTable(MID_X, 170, false),
        clampToTable(160, 90, false),
        clampToTable(160, 210, false),
        clampToTable(200, 150, false)
      ];
    probes.forEach((spot) => {
      if (overlapsBall(spot.x, spot.y, balls)) return;
      const shot = bestShotFromCue(spot, balls, legalBallIds, targetPocketId);
      if (shot && (!best || shot.score > best.score)) {
        best = shot;
        bestCue = spot;
      }
    });
    const bihMin = onePocket ? ONE_POCKET_MIN_MAKE - 60 : MIN_MAKE_SCORE - 40;
    if (best && best.score >= bihMin && (!onePocket || best.cut <= ONE_POCKET_MAX_CUT)) {
      const played = withAimMiss(best);
      if (onePocket) {
        played.power = clamp(played.power * 0.8, 0.16, ONE_POCKET_MAX_POWER);
      }
      return {
        ...played,
        canMake: true,
        pushOut: false,
        cue: bestCue
      };
    }
    let safeCue = clampToTable(kitchenOnly ? 100 : MID_X, 150, kitchenOnly);
    let safeScore = -Infinity;
    const safeSpots = kitchenOnly
      ? [
        clampToTable(60, 80, true),
        clampToTable(60, 220, true),
        clampToTable(120, 80, true),
        clampToTable(120, 220, true)
      ]
      : [
        clampToTable(FELT_LEFT + 40, FELT_TOP + 40, false),
        clampToTable(FELT_RIGHT - 40, FELT_TOP + 40, false),
        clampToTable(FELT_LEFT + 40, FELT_BOTTOM - 40, false),
        clampToTable(FELT_RIGHT - 40, FELT_BOTTOM - 40, false),
        clampToTable(MID_X, FELT_TOP + 36, false),
        clampToTable(MID_X, FELT_BOTTOM - 36, false)
      ];
    safeSpots.forEach((spot) => {
      if (overlapsBall(spot.x, spot.y, balls)) return;
      const openness = -Math.hypot(spot.x - ball.x, spot.y - ball.y);
      if (openness > safeScore) {
        safeScore = openness;
        safeCue = spot;
      }
    });
    const safe = safetyShot(safeCue, balls, legalBallIds, targetPocketId);
    if (!safe) return null;
    return { ...safe, canMake: false, cue: safeCue };
  }

  const made = bestShotFromCue(cue, balls, legalBallIds, targetPocketId);
  const choice = takeMakeOrSafety(made, cue, balls, legalBallIds, targetPocketId);
  if (choice?.canMake) return choice;

  if (pushOutAvailable) {
    return {
      canMake: false,
      aimAngle: Math.atan2((ball.y + 40) - cue.y, (ball.x - 50) - cue.x),
      power: 0.2,
      calledBall: null,
      calledPocket: null,
      pushOut: true,
      cue: null,
      english: 0.1,
      englishDirection: 0
    };
  }

  return choice;
}

export function computerTakesTheTable(cue, balls, {
  spotMoney = false,
  moneyBall = 10,
  legalBallIds = null,
  targetPocketId = null
} = {}) {
  const table = spotMoney
    ? balls.map((ball) => (
      ball.id === moneyBall
        ? { ...ball, pocketed: false, visible: true, x: FOOT_SPOT_X, y: FOOT_SPOT_Y }
        : ball
    ))
    : balls;
  const shot = bestShotFromCue(cue, table, legalBallIds, targetPocketId);
  return Boolean(shot && shot.score >= MIN_MAKE_SCORE && shot.cut <= MAX_MAKE_CUT);
}
