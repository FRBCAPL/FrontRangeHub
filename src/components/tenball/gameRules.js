import { BALL_SIZE, TABLE_WIDTH, TABLE_HEIGHT } from './constants';

export const GAME_TEN = 'tenball';
export const GAME_NINE = 'nineball';

const TEN_RULES = {
  id: GAME_TEN,
  label: '10-Ball',
  moneyBall: 10,
  ballIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  callShot: true,
  winOnBreak: false
};

const NINE_RULES = {
  id: GAME_NINE,
  label: '9-Ball',
  moneyBall: 9,
  ballIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  callShot: false,
  winOnBreak: true
};

export function getGameRules(gameType = GAME_TEN) {
  return gameType === GAME_NINE ? NINE_RULES : TEN_RULES;
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

export function createRack(gameType = GAME_TEN) {
  return gameType === GAME_NINE ? createNineBallRack() : createTenBallRack();
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
