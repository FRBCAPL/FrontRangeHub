/**
 * The Cash Climb guide shares the public how-it-works route; `?format=cash-climb-v3` selects it. The bare
 * route stays the King of the Hill guide so links already shared keep working.
 */
import { CASH_CLIMB_GUIDE_HASH, cashClimbGuideHref } from '../../cash-climb/cashClimbGuideRoute.js';

export const CASH_CLIMB_V3_GUIDE_FORMAT = 'cash-climb-v3';
export const CASH_CLIMB_V3_GUIDE_HASH = `${CASH_CLIMB_GUIDE_HASH}?format=${CASH_CLIMB_V3_GUIDE_FORMAT}`;

export function isCashClimbV3Guide(search) {
  return new URLSearchParams(search || '').get('format') === CASH_CLIMB_V3_GUIDE_FORMAT;
}

export function cashClimbV3GuideHref() {
  return `${cashClimbGuideHref()}?format=${CASH_CLIMB_V3_GUIDE_FORMAT}`;
}

export function cashClimbV3GuideTvHref() {
  return `${cashClimbV3GuideHref()}&tv=1`;
}

export function openCashClimbV3GuideTv() {
  const url = cashClimbV3GuideTvHref();
  const opened = typeof window !== 'undefined' ? window.open(url, 'frontrange-cash-climb-v3-guide-tv') : null;
  if (!opened && typeof window !== 'undefined') window.location.assign(url);
}
