/**
 * Ladder phase labels (no monthly ladder membership — access is free;
 * match reporting fee is charged when results are submitted).
 */

export const PHASES = {
  TESTING: 1,
  TRIAL_LAUNCH: 2,
  FULL_LAUNCH: 3
};

export const PHASE_DATES = {
  PHASE_1_END: new Date(2025, 10, 1), // Nov 1, 2025
  PHASE_2_END: new Date(2026, 0, 1)  // Jan 1, 2026
};

/** Full match reporting fee (winner pays when scores are entered). */
export const LADDER_MATCH_REPORTING_FEE_STANDARD = 10;

/** Reduced fee when an admin has confirmed a forfeit (50% still goes to prize pool on backend). */
export const LADDER_MATCH_REPORTING_FEE_ADMIN_FORFEIT = 5;

/** Added when results are submitted more than 48 hours after the match date; the full late amount goes to the ladder prize pool (backend adds it on top of half the base). */
export const LADDER_MATCH_REPORTING_LATE_FEE = 5;

/** Report and pay within this many hours after the match date (end of match calendar day as anchor). */
export const LADDER_MATCH_REPORTING_DEADLINE_MS = 48 * 60 * 60 * 1000;

export function getMatchReportingBaseDollars({ adminConfirmedForfeit = false } = {}) {
  return adminConfirmedForfeit ? LADDER_MATCH_REPORTING_FEE_ADMIN_FORFEIT : LADDER_MATCH_REPORTING_FEE_STANDARD;
}

export function getMatchReportingFeeDollars({ adminConfirmedForfeit = false, isLate = false } = {}) {
  const base = getMatchReportingBaseDollars({ adminConfirmedForfeit });
  const late = isLate ? LADDER_MATCH_REPORTING_LATE_FEE : 0;
  return base + late;
}

/**
 * @param {string} matchDateYYYYMMDD - date input value (YYYY-MM-DD) or ISO string
 * @param {{ isAdmin?: boolean }} opts - admins may bypass deadline
 */
export function isPastMatchReportingDeadline(matchDateYYYYMMDD, { isAdmin = false } = {}) {
  if (isAdmin) return false;
  if (!matchDateYYYYMMDD || typeof matchDateYYYYMMDD !== 'string') return false;
  const raw = matchDateYYYYMMDD.trim();
  if (!raw) return false;

  // Robust local-date parsing to avoid browser/timezone quirks with date inputs.
  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yStr, mStr, dayStr] = raw.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const day = Number(dayStr);
    d = new Date(y, m - 1, day, 23, 59, 59, 999); // end of local match day
  } else {
    d = new Date(raw);
  }

  if (Number.isNaN(d.getTime())) return false;
  return Date.now() > d.getTime() + LADDER_MATCH_REPORTING_DEADLINE_MS;
}

/**
 * Whether the logged-in reporter (email) is the player selected as winner.
 */
export function isReporterTheSelectedWinner(playerEmail, winnerDisplayName, selectedMatch) {
  if (!playerEmail || !winnerDisplayName || !selectedMatch) return false;
  const email = String(playerEmail).trim().toLowerCase();
  const em1 = selectedMatch.player1?.email ? String(selectedMatch.player1.email).toLowerCase() : '';
  const em2 = selectedMatch.player2?.email ? String(selectedMatch.player2.email).toLowerCase() : '';
  if (winnerDisplayName === selectedMatch.senderName && em1) return em1 === email;
  if (winnerDisplayName === selectedMatch.receiverName && em2) return em2 === email;
  return false;
}

export const getCurrentPhase = () => {
  const now = new Date();

  if (now < PHASE_DATES.PHASE_1_END) {
    return {
      phase: PHASES.TESTING,
      membershipFee: 0,
      name: 'Testing Phase',
      description: 'Free ladder access',
      fullDescription: 'Free ladder access; pay per match when you report results',
      color: 'rgba(76, 175, 80, 0.1)',
      icon: '🧪',
      isFree: true
    };
  }
  if (now < PHASE_DATES.PHASE_2_END) {
    return {
      phase: PHASES.TRIAL_LAUNCH,
      membershipFee: 0,
      name: 'Trial Launch',
      description: 'Free ladder access',
      fullDescription: 'Free ladder access; winner pays match reporting fee when results are entered',
      color: 'rgba(255, 152, 0, 0.1)',
      icon: '🚀',
      isFree: true
    };
  }
  return {
    phase: PHASES.FULL_LAUNCH,
    membershipFee: 0,
    name: 'Full Launch',
    description: 'Free ladder access',
    fullDescription: 'Free ladder access; winner pays match reporting fee when results are entered',
    color: 'rgba(156, 39, 176, 0.1)',
    icon: '🎯',
    isFree: true
  };
};

export const isPhase1Active = () => {
  return getCurrentPhase().phase === PHASES.TESTING;
};

export const getMembershipFee = () => {
  return getCurrentPhase().membershipFee;
};

export const getPhaseInfo = () => {
  return getCurrentPhase();
};

export const canReportMatchesWithoutMembership = () => true;

export const requiresMembership = () => false;
