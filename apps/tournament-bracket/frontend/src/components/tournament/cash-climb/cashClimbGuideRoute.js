export const CASH_CLIMB_GUIDE_HASH = '/tournament-bracket/how-it-works';

export function cashClimbGuideHref() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${CASH_CLIMB_GUIDE_HASH}`;
}
