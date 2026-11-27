// Shared gameplay/table constants for the ten-ball component

export const TABLE_WIDTH = 600;
export const TABLE_HEIGHT = 300;

export const BALL_SIZE = 15;
export const BALL_RADIUS = BALL_SIZE / 2;

export const PLAYFIELD_OFFSET_X = 0;
export const PLAYFIELD_OFFSET_Y = 0;

// Pocket forgiveness factors (reduced for more realistic pocket size)
export const CORNER_MARGIN_FACTOR = 1.3; // slightly tight corners
export const SIDE_MARGIN_FACTOR = 0.9;   // tighter side pockets to prevent rail dribbles

// Kitchen area (behind the head string) - for break shots and ball-in-hand
export const KITCHEN_LEFT = 30;  // Start from the felt (not the rail)
export const KITCHEN_RIGHT = 160; // Head string position (middle diamond)
export const KITCHEN_TOP = 24.5;
export const KITCHEN_BOTTOM = 270.18;

// Spots
export const FOOT_SPOT_X = TABLE_WIDTH * 0.75; // Apex (front) spot where the rack's head ball sits
export const FOOT_SPOT_Y = TABLE_HEIGHT / 2;

// Pocket drop fudge factor (extra distance beyond pocket margin for a ball to be considered dropped)
// Smaller fudge = less forgiving pockets
export const POCKET_DROP_FUDGE = BALL_RADIUS * 0.1; // smaller allowance

// Approach constraints to prevent unrealistic rail-dribble drops
// Require the ball to be moving generally toward the pocket to be accepted
export const SIDE_POCKET_APPROACH_DOT = 0.7;   // cosine threshold (~45° cone)
export const CORNER_POCKET_APPROACH_DOT = 0.45; // slightly more permissive for corners
export const MIN_RADIAL_SPEED_TO_DROP = 0.05;   // minimum velocity component toward pocket

// Physics constants for ball movement and collisions.
// Tuned so a cue ball sent along the length of the table, hitting no other ball:
// half power goes end rail to end rail, back to the start rail, and dies near the middle;
// full power continues that path for one more down-and-back and also dies near the middle.
export const FRICTION = 0.984;          // Felt drag per frame
export const SETTLE_SPEED = 0.35;       // Below this, the ball is only creeping
export const SETTLE_FRICTION = 0.92;    // Stronger drag so the creep does not last a few extra seconds

export function feltDrag(speed) {
  return speed < SETTLE_SPEED ? SETTLE_FRICTION : FRICTION;
}

// The spin control is a cue-ball face. Up is follow, down is draw, right is right english.
export function englishFromControl(amount, directionDegrees) {
  const rad = (directionDegrees * Math.PI) / 180;
  return {
    follow: -Math.sin(rad) * amount,
    side: Math.cos(rad) * amount
  };
}

// Side english changes the rebound. Follow grips the cushion a little; draw springs off it.
export function applyRailEnglish(ball, axis, incomingSpeed) {
  const side = ball.spinSide || 0;
  const follow = ball.spinFollow || 0;
  if (!side && !follow) return;
  const kick = side * Math.abs(incomingSpeed) * 0.28;
  if (axis === 'x') ball.vy += Math.sign(incomingSpeed || 1) * kick;
  else ball.vx -= Math.sign(incomingSpeed || 1) * kick;
  const grip = 1 - follow * 0.12;
  if (axis === 'x') ball.vx *= grip;
  else ball.vy *= grip;
  ball.spinSide *= 0.45;
  ball.spinFollow *= 0.7;
}

// Follow sends the cue ball on after the hit. Draw brings it back. Side english throws the object ball.
export function applyHitEnglish(cue, objectBall, preVx, preVy) {
  const follow = cue.spinFollow || 0;
  const side = cue.spinSide || 0;
  if (!follow && !side) return;
  const speed = Math.hypot(preVx, preVy);
  if (speed < 0.4) return;
  const dirX = preVx / speed;
  const dirY = preVy / speed;
  cue.vx += dirX * follow * speed * 0.45;
  cue.vy += dirY * follow * speed * 0.45;
  const throwAmt = side * speed * 0.15;
  const rightX = -dirY;
  const rightY = dirX;
  objectBall.vx += rightX * throwAmt;
  objectBall.vy += rightY * throwAmt;
  cue.vx -= rightX * throwAmt * 0.35;
  cue.vy -= rightY * throwAmt * 0.35;
  cue.spinFollow = 0;
  cue.spinSide *= 0.2;
}
export const RAIL_FRICTION = 0.955;     // Speed kept on a cushion, before bounce
export const CUSHION_BOUNCE = 0.953;    // Combined with rail friction, cushions keep about 91% of speed
export const MAX_SHOT_SPEED = 46;       // Cue speed at full power, in table pixels per frame
// Tiny hit variance so live rolls are not pixel-perfect to the aim preview.
export const SHOT_ANGLE_JITTER = 0.02;  // ± radians (~1.1°) applied at strike only
export const SHOT_POWER_JITTER = 0.05;  // ± fraction of power applied at strike only
export const SPIN_DECAY = 0.95;         // How quickly spin decays
export const MAX_SPIN = 0.3;            // Maximum spin effect on ball movement
export const SPIN_TRANSFER = 0.8;       // How much spin transfers in collisions


