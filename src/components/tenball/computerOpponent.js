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

const pathClear = (x1, y1, x2, y2, balls, ignoreId) => liveBalls(balls).every((ball) => {
  if (ball.id === ignoreId) return true;
  return pointSegmentDistance(ball.x, ball.y, x1, y1, x2, y2) >= BALL_RADIUS * 2 - 0.4;
});

const ghostFor = (ball, pocket) => {
  const dx = ball.x - pocket.x;
  const dy = ball.y - pocket.y;
  const dist = Math.hypot(dx, dy) || 1;
  return {
    x: ball.x + (dx / dist) * BALL_RADIUS * 2,
    y: ball.y + (dy / dist) * BALL_RADIUS * 2
  };
};

const cutAngle = (cue, ball, pocket) => {
  const toBall = Math.atan2(ball.y - cue.y, ball.x - cue.x);
  const toPocket = Math.atan2(pocket.y - ball.y, pocket.x - ball.x);
  let diff = Math.abs(toBall - toPocket);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff;
};

const scoreShot = (cue, ball, pocket, balls) => {
  const ghost = ghostFor(ball, pocket);
  if (!pathClear(cue.x, cue.y, ghost.x, ghost.y, balls, ball.id)) return null;
  if (!pathClear(ball.x, ball.y, pocket.x, pocket.y, balls, ball.id)) return null;
  const cut = cutAngle(cue, ball, pocket);
  if (cut > 1.2) return null;
  const pocketDist = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
  const cueDist = Math.hypot(cue.x - ghost.x, cue.y - ghost.y);
  return {
    score: 1000 - pocketDist * 0.6 - cueDist * 0.25 - cut * 220,
    aimAngle: Math.atan2(ghost.y - cue.y, ghost.x - cue.x),
    power: clamp(0.42 + (cueDist + pocketDist) / 1600 + cut * 0.08, 0.4, 0.78),
    calledBall: ball.id,
    calledPocket: pocket.id,
    cut
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
  [60, 85, 120, 160, 210].forEach((back) => {
    const spot = clampToTable(ghost.x + ux * back, ghost.y + uy * back, kitchenOnly);
    if (!overlapsBall(spot.x, spot.y, balls)) spots.push(spot);
  });
  return spots;
};

const bestShot = (cue, balls) => {
  const ball = lowestBall(balls);
  if (!ball) return null;
  let best = null;
  POCKETS.forEach((pocket) => {
    const shot = scoreShot(cue, ball, pocket, balls);
    if (shot && (!best || shot.score > best.score)) best = shot;
  });
  return best;
};

const withAimMiss = (shot) => {
  const miss = (Math.random() - 0.5) * (0.025 + shot.cut * 0.06);
  return { ...shot, aimAngle: shot.aimAngle + miss };
};

const safetyShot = (cue, balls) => {
  const ball = lowestBall(balls);
  if (!ball) return null;
  let pocket = POCKETS[0];
  let nearest = Infinity;
  POCKETS.forEach((candidate) => {
    const dist = Math.hypot(candidate.x - ball.x, candidate.y - ball.y);
    if (dist < nearest) {
      nearest = dist;
      pocket = candidate;
    }
  });
  return {
    canMake: false,
    aimAngle: Math.atan2(ball.y - cue.y, ball.x - cue.x) + (Math.random() - 0.5) * 0.08,
    power: 0.38,
    calledBall: ball.id,
    calledPocket: pocket.id,
    pushOut: false,
    cue: null
  };
};

export function planComputerShot({ cue, balls, ballInHand, isBreakShot, pushOutAvailable }) {
  const ball = lowestBall(balls);
  if (!ball) return null;

  if (isBreakShot) {
    const spot = clampToTable(110, 150, true);
    return {
      canMake: true,
      aimAngle: Math.atan2(ball.y - spot.y, ball.x - spot.x),
      power: 0.82,
      calledBall: null,
      calledPocket: null,
      pushOut: false,
      cue: spot
    };
  }

  if (ballInHand) {
    let best = null;
    let bestCue = null;
    POCKETS.forEach((pocket) => {
      cuePlacements(ball, pocket, balls, false).forEach((spot) => {
        const shot = scoreShot(spot, ball, pocket, balls);
        if (shot && (!best || shot.score > best.score)) {
          best = shot;
          bestCue = spot;
        }
      });
    });
    if (best) {
      return { ...withAimMiss(best), canMake: true, pushOut: false, cue: bestCue };
    }
    const open = clampToTable(MID_X, 150, false);
    const cueSpot = overlapsBall(open.x, open.y, balls) ? clampToTable(120, 80, false) : open;
    return { ...safetyShot(cueSpot, balls), cue: cueSpot };
  }

  const made = bestShot(cue, balls);
  if (made) return { ...withAimMiss(made), canMake: true, pushOut: false, cue: null };

  if (pushOutAvailable) {
    return {
      canMake: false,
      aimAngle: Math.atan2(150 - cue.y, MID_X - cue.x),
      power: 0.26,
      calledBall: null,
      calledPocket: null,
      pushOut: true,
      cue: null
    };
  }

  return safetyShot(cue, balls);
}

export function computerTakesTheTable(cue, balls, { spotTen = false } = {}) {
  const table = spotTen
    ? balls.map((ball) => (
      ball.id === 10
        ? { ...ball, pocketed: false, visible: true, x: FOOT_SPOT_X, y: FOOT_SPOT_Y }
        : ball
    ))
    : balls;
  return Boolean(bestShot(cue, table));
}
