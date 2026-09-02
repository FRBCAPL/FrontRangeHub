export const CASH_CLIMB_GUIDE_HASH = '/tournament-bracket/how-it-works';

export function cashClimbGuideHref() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${CASH_CLIMB_GUIDE_HASH}`;
}

export function cashClimbGuideTvHref() {
  return `${cashClimbGuideHref()}?tv=1`;
}

export function isCashClimbGuideTv(search) {
  return new URLSearchParams(search || '').get('tv') === '1';
}

export function openCashClimbGuideTv() {
  const url = cashClimbGuideTvHref();
  const opened = typeof window !== 'undefined' ? window.open(url, 'frontrange-cash-climb-guide-tv') : null;
  if (!opened && typeof window !== 'undefined') window.location.assign(url);
}
