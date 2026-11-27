import { BALL_SIZE, TABLE_WIDTH, TABLE_HEIGHT } from './constants';

export const GAME_TEN = 'tenball';
export const GAME_NINE = 'nineball';
export const GAME_EIGHT = 'eightball';
export const GAME_ONE_POCKET = 'onepocket';

const TEN_RULES = {
  id: GAME_TEN,
  label: '10-Ball',
  moneyBall: 10,
  ballIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  callShot: true,
  callEight: false,
  winOnBreak: false,
  pushOut: true,
  groups: false,
  onePocket: false,
  threeFoulRule: true
};

const NINE_RULES = {
  id: GAME_NINE,
  label: '9-Ball',
  moneyBall: 9,
  ballIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  callShot: false,
  callEight: false,
  winOnBreak: true,
  pushOut: true,
  groups: false,
  onePocket: false,
  threeFoulRule: true
};

const EIGHT_RULES = {
  id: GAME_EIGHT,
  label: '8-Ball',
  moneyBall: 8,
  ballIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  // CSI / BCA 8-Ball: call shot, groups, no push-out, no three-foul rule.
  callShot: true,
  callEight: true,
  winOnBreak: false,
  pushOut: false,
  groups: true,
  onePocket: false,
  threeFoulRule: false
};

const ONE_POCKET_RULES = {
  id: GAME_ONE_POCKET,
  label: 'One Pocket',
  moneyBall: null,
  ballIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  // CSI One Pocket §5: foot-corner scoring, no call shot, alternate break, 3-foul loss.
  callShot: false,
  callEight: false,
  winOnBreak: false,
  pushOut: false,
  groups: false,
  onePocket: true,
  threeFoulRule: true,
  raceToBalls: 8
};

export function getGameRules(gameType = GAME_TEN) {
  if (gameType === GAME_NINE) return NINE_RULES;
  if (gameType === GAME_EIGHT) return EIGHT_RULES;
  if (gameType === GAME_ONE_POCKET) return ONE_POCKET_RULES;
  return TEN_RULES;
}

function jitter() {
  return (Math.random() - 0.5) * 1.5;
}

function ballAt(id, x, y) {
  return {
    id,
    x: x + jitter(),
    y: y + jitter(),
    vx: 0,
    vy: 0,
    visible: true,
    pocketed: false,
    wasPocketedBeforeShot: false,
    isMoving: false,
    rotation: 0,
    rotationSpeed: 0,
    spinX: 0,
    spinY: 0
  };
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

/** CSI 10-ball triangle: 1 apex, 10 center, 2 & 3 back corners, rest random. */
export function createTenBallRack() {
  const rackApexX = TABLE_WIDTH * 0.75;
  const rackApexY = TABLE_HEIGHT / 2;
  const s = BALL_SIZE * 0.95;
  const rackPositions = [
    { x: rackApexX, y: rackApexY },
    { x: rackApexX + s, y: rackApexY - BALL_SIZE * 0.48 },
    { x: rackApexX + s, y: rackApexY + BALL_SIZE * 0.48 },
    { x: rackApexX + 2 * s, y: rackApexY - BALL_SIZE * 0.95 },
    { x: rackApexX + 2 * s, y: rackApexY },
    { x: rackApexX + 2 * s, y: rackApexY + BALL_SIZE * 0.95 },
    { x: rackApexX + 3 * s, y: rackApexY - BALL_SIZE * 1.43 },
    { x: rackApexX + 3 * s, y: rackApexY - BALL_SIZE * 0.48 },
    { x: rackApexX + 3 * s, y: rackApexY + BALL_SIZE * 0.48 },
    { x: rackApexX + 3 * s, y: rackApexY + BALL_SIZE * 1.43 }
  ];
  const backCorners = [rackPositions[6], rackPositions[9]];
  const cornerBalls = shuffle([2, 3]);
  const remaining = shuffle([4, 5, 6, 7, 8, 9]);
  const remainingPositions = [
    rackPositions[1],
    rackPositions[2],
    rackPositions[3],
    rackPositions[5],
    rackPositions[7],
    rackPositions[8]
  ];

  const balls = [
    ballAt(1, rackPositions[0].x, rackPositions[0].y),
    ballAt(10, rackPositions[4].x, rackPositions[4].y),
    ballAt(cornerBalls[0], backCorners[0].x, backCorners[0].y),
    ballAt(cornerBalls[1], backCorners[1].x, backCorners[1].y)
  ];
  remaining.forEach((id, index) => {
    const position = remainingPositions[index];
    balls.push(ballAt(id, position.x, position.y));
  });
  return balls;
}

/** CSI 9-ball diamond: 1 apex, 9 in the middle, remaining balls random. */
export function createNineBallRack() {
  const rackApexX = TABLE_WIDTH * 0.75;
  const rackApexY = TABLE_HEIGHT / 2;
  const s = BALL_SIZE * 0.95;
  const spots = [
    { x: rackApexX, y: rackApexY },
    { x: rackApexX + s, y: rackApexY - BALL_SIZE * 0.48 },
    { x: rackApexX + s, y: rackApexY + BALL_SIZE * 0.48 },
    { x: rackApexX + 2 * s, y: rackApexY - BALL_SIZE * 0.95 },
    { x: rackApexX + 2 * s, y: rackApexY },
    { x: rackApexX + 2 * s, y: rackApexY + BALL_SIZE * 0.95 },
    { x: rackApexX + 3 * s, y: rackApexY - BALL_SIZE * 0.48 },
    { x: rackApexX + 3 * s, y: rackApexY + BALL_SIZE * 0.48 },
    { x: rackApexX + 4 * s, y: rackApexY }
  ];
  const remaining = shuffle([2, 3, 4, 5, 6, 7, 8]);
  const otherSpots = [spots[1], spots[2], spots[3], spots[5], spots[6], spots[7], spots[8]];
  const balls = [
    ballAt(1, spots[0].x, spots[0].y),
    ballAt(9, spots[4].x, spots[4].y)
  ];
  remaining.forEach((id, index) => {
    const position = otherSpots[index];
    balls.push(ballAt(id, position.x, position.y));
  });
  return balls;
}

/**
 * CSI / BCA 8-ball triangle: 15 balls, 8 in the center of the rack,
 * one back corner solid and the other stripe, remaining balls random.
 */
export function createEightBallRack() {
  const rackApexX = TABLE_WIDTH * 0.75;
  const rackApexY = TABLE_HEIGHT / 2;
  const s = BALL_SIZE * 0.95;
  const spots = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      spots.push({
        x: rackApexX + row * s,
        y: rackApexY - row * BALL_SIZE * 0.48 + col * BALL_SIZE * 0.95
      });
    }
  }
  // 5-row triangle: index 4 is rack center (8-ball); 10 and 14 are back corners.
  const eightSpot = spots[4];
  const cornerSpots = [spots[10], spots[14]];
  const solids = shuffle([1, 2, 3, 4, 5, 6, 7]);
  const stripes = shuffle([9, 10, 11, 12, 13, 14, 15]);
  const cornerSolid = solids.pop();
  const cornerStripe = stripes.pop();
  const remaining = shuffle([...solids, ...stripes]);
  const remainingSpots = spots.filter((_, index) => ![0, 4, 10, 14].includes(index));

  const balls = [
    ballAt(remaining.pop(), spots[0].x, spots[0].y),
    ballAt(8, eightSpot.x, eightSpot.y),
    ballAt(cornerSolid, cornerSpots[0].x, cornerSpots[0].y),
    ballAt(cornerStripe, cornerSpots[1].x, cornerSpots[1].y)
  ];
  remaining.forEach((id, index) => {
    const position = remainingSpots[index];
    balls.push(ballAt(id, position.x, position.y));
  });
  return balls;
}

/**
 * CSI One Pocket triangle: apex on the foot spot, all fifteen balls random.
 */
export function createOnePocketRack() {
  const rackApexX = TABLE_WIDTH * 0.75;
  const rackApexY = TABLE_HEIGHT / 2;
  const s = BALL_SIZE * 0.95;
  const spots = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      spots.push({
        x: rackApexX + row * s,
        y: rackApexY - row * BALL_SIZE * 0.48 + col * BALL_SIZE * 0.95
      });
    }
  }
  const ids = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  return ids.map((id, index) => ballAt(id, spots[index].x, spots[index].y));
}

export function createRack(gameType = GAME_TEN) {
  if (gameType === GAME_NINE) return createNineBallRack();
  if (gameType === GAME_EIGHT) return createEightBallRack();
  if (gameType === GAME_ONE_POCKET) return createOnePocketRack();
  return createTenBallRack();
}

export function spotMoneyBall(balls, moneyBall, x, y) {
  return (balls || []).map((ball) => (
    ball.id === moneyBall
      ? {
          ...ball,
          pocketed: false,
          visible: true,
          x,
          y,
          vx: 0,
          vy: 0,
          isMoving: false
        }
      : ball
  ));
}
