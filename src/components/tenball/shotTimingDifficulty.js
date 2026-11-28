/**
 * Hit-timing meter difficulty from shot setup (and later player XP).
 * Returns oscillation speed (hz) and sweet-zone half-width in −1…1 meter space.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * @param {object} opts
 * @param {number} [opts.power] 0…1 cue power
 * @param {number} [opts.english] spin magnitude 0…1 (or signed; abs used)
 * @param {number} [opts.skillLevel] future XP/level — higher eases the meter (default 1)
 * @param {number} [opts.skillEasePerLevel] how much each level above 1 softens difficulty
 */
export function timingMeterParams({
  power = 0.5,
  english = 0,
  skillLevel = 1,
  skillEasePerLevel = 0.04
} = {}) {
  const p = clamp(Number(power) || 0, 0, 1);
  const spin = clamp(Math.abs(Number(english) || 0), 0, 1);
  // Soft/slow cue + no spin → easy; max power + max spin → hard.
  const shotDemand = clamp(p * 0.72 + spin * 0.55, 0, 1);
  // Hook for a later level/experience system (higher skill → easier meter).
  const skillEase = clamp((Math.max(1, Number(skillLevel) || 1) - 1) * skillEasePerLevel, 0, 0.4);
  const difficulty = clamp(shotDemand - skillEase, 0, 1);

  // Default pace is deliberately slow; hard shots ramp up from there.
  // Soft ~0.12 Hz (~8s/cycle); hard ~0.28 Hz (~3.5s/cycle).
  const hz = 0.12 + difficulty * 0.16;
  // Large green zone when soft; tight when blasting with english.
  const sweetHalf = 0.28 - difficulty * 0.2;

  return {
    hz,
    sweetHalf: clamp(sweetHalf, 0.07, 0.3),
    difficulty,
    shotDemand,
    skillEase
  };
}

/**
 * Map raw meter offset (−1…1) through the sweet zone into an effective miss (−1…1).
 * - Dead center → 0 (exact strike / 100% for that shot)
 * - Anywhere in green → very small miss; smaller zones reward even cleaner hits
 * - Outside green → rising miss toward the edges
 */
export function timingErrorFromOffset(offset, sweetHalf = 0.14) {
  const t = clamp(Number(offset) || 0, -1, 1);
  const half = clamp(Number(sweetHalf) || 0.14, 0.04, 0.4);
  const abs = Math.abs(t);
  const side = t === 0 ? 1 : Math.sign(t);

  // Perfect: true center of the green zone.
  const perfectSlop = Math.min(0.012, half * 0.1);
  if (abs <= perfectSlop) return 0;

  if (abs <= half) {
    // Edge of a tiny zone stays near-perfect; edge of a wide zone is still "very good".
    // half 0.07 → max residual ~0.028; half 0.28 → ~0.09
    const maxInSweet = clamp(0.02 + (half - 0.07) * 0.32, 0.02, 0.09);
    return side * (abs / half) * maxInSweet;
  }

  // Missed the green — error ramps hard toward the rails.
  const outer = (abs - half) / Math.max(1 - half, 0.001);
  return side * (0.22 + outer * 0.78);
}

/** True when the effective miss is a dead-center strike. */
export function isPerfectTiming(miss) {
  return Math.abs(Number(miss) || 0) < 1e-6;
}

/** True when the effective miss is still inside the "very good" sweet band. */
export function isSweetTiming(miss) {
  return Math.abs(Number(miss) || 0) <= 0.1;
}
