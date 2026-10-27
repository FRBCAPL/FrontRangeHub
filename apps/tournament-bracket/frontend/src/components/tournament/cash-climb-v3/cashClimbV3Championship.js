/**
 * Championship split of the combined championship allocation (the last ladder payout):
 *   champion = round_half_up(0.80 x allocation), runner-up = allocation - champion.
 */
import { roundHalfUpRatio } from './cashClimbV3Money.js';

export function championshipSplit(allocation) {
  if (!Number.isSafeInteger(allocation) || allocation <= 0) {
    throw new RangeError('The championship allocation must be a positive whole-dollar amount.');
  }
  const champion = roundHalfUpRatio(4 * allocation, 5);
  return { allocation, champion, runnerUp: allocation - champion };
}
