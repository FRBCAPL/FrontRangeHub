/** The Showdown guide shares the public how-it-works route; `?format=showdown` selects it. */
import { CASH_CLIMB_GUIDE_HASH, cashClimbGuideHref } from '../../cash-climb/cashClimbGuideRoute.js';

export const SHOWDOWN_GUIDE_FORMAT = 'showdown';
export const SHOWDOWN_GUIDE_HASH = `${CASH_CLIMB_GUIDE_HASH}?format=${SHOWDOWN_GUIDE_FORMAT}`;

export const SHOWDOWN_V3_GUIDE_FORMAT = 'showdown-v3';
export const SHOWDOWN_V3_GUIDE_HASH = `${CASH_CLIMB_GUIDE_HASH}?format=${SHOWDOWN_V3_GUIDE_FORMAT}`;

export function isShowdownGuide(search) {
  return new URLSearchParams(search || '').get('format') === SHOWDOWN_GUIDE_FORMAT;
}

export function isShowdownV3Guide(search) {
  return new URLSearchParams(search || '').get('format') === SHOWDOWN_V3_GUIDE_FORMAT;
}

export function showdownGuideHref({ v3 = false } = {}) {
  return `${cashClimbGuideHref()}?format=${v3 ? SHOWDOWN_V3_GUIDE_FORMAT : SHOWDOWN_GUIDE_FORMAT}`;
}

export function showdownGuideTvHref({ v3 = false } = {}) {
  return `${showdownGuideHref({ v3 })}&tv=1`;
}

/** `v3`: the V3 presentation; V1/V2 keep the original guide. */
export function openShowdownGuideTv({ v3 = false } = {}) {
  const url = showdownGuideTvHref({ v3 });
  const opened = typeof window !== 'undefined' ? window.open(url, 'frontrange-showdown-guide-tv') : null;
  if (!opened && typeof window !== 'undefined') window.location.assign(url);
}
