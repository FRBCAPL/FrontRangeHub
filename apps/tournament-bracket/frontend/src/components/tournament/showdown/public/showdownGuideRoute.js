/**
 * The Showdown guide shares the public how-it-works route; `?format=showdown` selects it and `&v=1|2|3`
 * picks the payout version (V3 when missing). Old `?format=showdown-v3` links still open the V3 guide.
 */
import { CASH_CLIMB_GUIDE_HASH, cashClimbGuideHref } from '../../cash-climb/cashClimbGuideRoute.js';

export const SHOWDOWN_GUIDE_FORMAT = 'showdown';
export const SHOWDOWN_GUIDE_HASH = `${CASH_CLIMB_GUIDE_HASH}?format=${SHOWDOWN_GUIDE_FORMAT}`;

export const SHOWDOWN_V3_GUIDE_FORMAT = 'showdown-v3';
export const SHOWDOWN_GUIDE_VERSIONS = [3, 2, 1];
export const DEFAULT_SHOWDOWN_GUIDE_VERSION = 3;
/** Players see only V3; the V1/V2 guides stay reachable by direct link (older event pages use them). */
export const SHOW_OLDER_GUIDE_VERSIONS = false;

const params = (search) => new URLSearchParams(search || '');

export function isShowdownGuide(search) {
  const format = params(search).get('format');
  return format === SHOWDOWN_GUIDE_FORMAT || format === SHOWDOWN_V3_GUIDE_FORMAT;
}

/** The payout version the guide should show: 1, 2 or 3. */
export function showdownGuideVersion(search) {
  const p = params(search);
  if (p.get('format') === SHOWDOWN_V3_GUIDE_FORMAT) return 3;
  const v = Number(p.get('v'));
  return SHOWDOWN_GUIDE_VERSIONS.includes(v) ? v : DEFAULT_SHOWDOWN_GUIDE_VERSION;
}

const versionQuery = (version) => (SHOWDOWN_GUIDE_VERSIONS.includes(Number(version)) ? `&v=${Number(version)}` : '');

/** In-app route for one version's guide; no version means the default (V3). */
export function showdownGuideHash(version) {
  return `${SHOWDOWN_GUIDE_HASH}${versionQuery(version)}`;
}

export function showdownGuideHref({ version } = {}) {
  return `${cashClimbGuideHref()}?format=${SHOWDOWN_GUIDE_FORMAT}${versionQuery(version)}`;
}

export function showdownGuideTvHref({ version } = {}) {
  return `${showdownGuideHref({ version })}&tv=1`;
}

export function openShowdownGuideTv({ version } = {}) {
  const url = showdownGuideTvHref({ version });
  const opened = typeof window !== 'undefined' ? window.open(url, 'frontrange-showdown-guide-tv') : null;
  if (!opened && typeof window !== 'undefined') window.location.assign(url);
}
