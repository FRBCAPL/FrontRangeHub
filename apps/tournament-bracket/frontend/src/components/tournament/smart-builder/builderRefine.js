/**
 * Which quick (pass 1) results get more runs. Anything that could change class, could be shown, or is a
 * close competitor of something shown is refined; the rest keep their quick estimate.
 */
import { familyOf } from './builderCandidates.js';
import { meaningfulGain } from './builderRank.js';
import { COMFORT_MARGIN_MIN, CLOSE_MARGIN_MIN, REFINE_BAND_MIN, REFINE_PER_FAMILY } from './builderFlags.js';

export const boundaries = (targetMin) => [targetMin - COMFORT_MARGIN_MIN, targetMin, targetMin + CLOSE_MARGIN_MIN];

export const nearBoundary = (p80, targetMin) => boundaries(targetMin).some((b) => Math.abs(p80 - b) <= REFINE_BAND_MIN);

/** The options a recommendation puts in front of the operator. */
export const shownOptions = (rec) => [rec.primary, rec.fullerEvent, ...rec.alternatives].filter(Boolean);

function topPerFamily(rows, ids) {
  const counts = new Map();
  rows.forEach((r) => {
    const n = counts.get(familyOf(r)) || 0;
    if (n < REFINE_PER_FAMILY) { counts.set(familyOf(r), n + 1); ids.add(r.id); }
  });
}

/** Ids to refine, from a recommendation whose rows are already in rank order. */
export function refineIds(rec) {
  const ids = new Set();
  rec.rows.forEach((r) => { if (!r.earlyStop && nearBoundary(r.p80, rec.targetMin)) ids.add(r.id); });
  topPerFamily(rec.rows.filter((r) => r.fit === 'comfortable'), ids);
  topPerFamily(rec.rows.filter((r) => r.fit === 'tight'), ids);
  if (rec.primary) topPerFamily(rec.rows.filter((r) => r.fit === 'tight' && meaningfulGain(r, rec.primary)), ids);
  shownOptions(rec).forEach((r) => ids.add(r.id));
  return ids;
}
