/**
 * 3-Phase Membership System Utility
 * 
 * Phase 1: Testing (Free) - Until Nov 1, 2025
 * Phase 2: Trial Launch ($5/month) - Nov 1, 2025 to Dec 31, 2025
 * Phase 3: Full Launch ($10/month) - Jan 1, 2026 onwards
 */

export const PHASES = {
  TESTING: 1,
  TRIAL_LAUNCH: 2,
  FULL_LAUNCH: 3
};

export const PHASE_DATES = {
  PHASE_1_END: new Date(2025, 10, 1), // Nov 1, 2025 (month 10 = November)
  PHASE_2_END: new Date(2026, 0, 1),  // Jan 1, 2026 (month 0 = January)
};

export const getCurrentPhase = () => {
  const now = new Date();
  
  if (now < PHASE_DATES.PHASE_1_END) {
    return {
      phase: PHASES.TESTING,
      membershipFee: 0,
      name: 'Testing Phase',
      description: 'Free Membership',
      fullDescription: 'Free access to all features during testing phase',
      color: 'rgba(76, 175, 80, 0.1)',
      icon: '🧪',
      isFree: true
    };
  } else if (now < PHASE_DATES.PHASE_2_END) {
    return {
      phase: PHASES.TRIAL_LAUNCH,
      membershipFee: 5,
      name: 'Trial Launch',
      description: '$5/month',
      fullDescription: 'Trial launch with reduced pricing - 2-month cycles',
      color: 'rgba(255, 152, 0, 0.1)',
      icon: '🚀',
      isFree: false
    };
  } else {
    return {
      phase: PHASES.FULL_LAUNCH,
      membershipFee: 10,
      name: 'Full Launch',
      description: '$10/month',
      fullDescription: 'Full launch with complete prize pool system - 3-month cycles',
      color: 'rgba(156, 39, 176, 0.1)',
      icon: '🎯',
      isFree: false
    };
  }
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

export const canReportMatchesWithoutMembership = () => {
  // Only Phase 1 (testing) allows reporting without membership
  return isPhase1Active();
};

export const requiresMembership = () => {
  // Phase 2 and 3 require membership
  return !isPhase1Active();
};

