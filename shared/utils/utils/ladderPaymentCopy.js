/**
 * Canonical player-facing copy for ladder access, reporting fees, and Payment Dashboard.
 * Amounts and timing should stay aligned with LadderOfLegendsRulesModal ("Fees, payments & reporting")
 * and phaseSystem match-fee helpers. UI-only — does not change charge logic.
 */

/** Matches NavigationMenu primary card title */
export const REPORT_RESULTS_MENU_LABEL = 'Report Result';

export const LADDER_ACCESS_FREE_LINE =
  'Ladder access is free (no monthly fee).';

export const MATCH_FEES_WHEN_WINNER_POSTS =
  'Match reporting fees apply when the winner posts a result.';

export const PAYMENT_DASHBOARD_PURPOSE_LINE =
  'Buy credits, tournament entry, optional legacy ladder-account tools, and view payment history.';

export const PAYMENT_MODAL_SUBTITLE =
  'Free ladder access; match reporting fees when the winner posts results';

/** Sticky bar (LadderApp) — three facts, same numbers everywhere */
export const REPORTING_FEE_STANDARD_SPLIT =
  'Winner pays $10 when posting on time (within 48 hours of the match date): $5 prize pools, $5 platform';

export const REPORTING_FEE_ONE_PER_MATCH =
  'One reporting payment per match — not per player.';

export const REPORTING_FEE_LATE_FORFEIT_SHORT =
  '+$5 late after 48 hours from the match date (full late fee to prize pool); $5 admin-confirmed forfeit per rules.';

/** One-line summary for the promotional / match-fee banner under the header */
export const PROMO_BANNER_MATCH_FEE_LINE =
  '$10 standard reporting ($5 prize pools, $5 platform); +$5 late after 48 hours from the match date to the prize pool; forfeit per rules.';

/** Compact bullets for Payment Information modal & similar */
export const MATCH_FEE_DETAIL_BULLETS = [
  'Only the winner pays when posting the result',
  'One reporting payment per match (not per player)',
  '$10 standard: $5 to prize pools, $5 platform',
  '+$5 late after 48 hours from the match date (full late fee to prize pool); $5 admin-confirmed forfeit per rules'
];

/** Report Result modal helper — same facts, slightly fuller wording */
export const MATCH_FEE_WHEN_YOU_PAY_BULLETS = [
  'The winner pays once per match when they enter the score',
  'The loser does not pay a reporting fee for that match',
  '$10 on time (within 48 hours of the match date): $5 prize pool, $5 platform',
  '+$5 if late — that whole $5 goes to the ladder prize pool (see ladder rules)',
  'Admin-confirmed forfeit uses a $5 rate per league rules'
];

export const WINNER_PAYS_LOSER_NOT_LINE =
  'Winner pays the reporting fee; the loser pays nothing for that match.';

export const TOURNAMENT_ENTRY_PRIZE_SPLIT_LINE =
  'Tournament $20/entry → $10 tournament prize pool, $5 ladder prize pool ($4 placement + $1 climber), $5 platform.';

export const CHALLENGE_CONFIRM_MATCH_FEE_BLURB =
  'The winner reports the match and pays the reporting fee ($10 standard: $5 prize pools, $5 platform; +$5 late after 48 hours from the match date to pool; forfeit per rules). Only one reporting payment per match — not per player!';

export const PRIZEPOOL_MODAL_MATCH_FEE_LINE =
  '$10 match report — $5 adds to this pool ($4 placement, $1 climber). $5 is platform. Full late fees added to the pool; special forfeit amounts follow ladder rules.';

export const OVERVIEW_LADDER_ACCESS_BODY =
  'No monthly fee. Join and play per league rules.';

export const OVERVIEW_AFTER_MATCH_BODY = `Reporting fees are paid when the winner posts the score (${REPORT_RESULTS_MENU_LABEL}).`;

export const OVERVIEW_DASHBOARD_HERE_BODY =
  'Buy credits, sync a card payment, optional legacy items, and view history.';

export const MEMBERSHIP_TAB_POST_MATCH_LINE =
  'The winner pays the reporting fee when they enter the score ($10 standard; late and admin-forfeit amounts are in ladder rules).';

export const NO_MONTHLY_CREDITS_MATCH_FEES =
  'No monthly ladder fee. Credits are optional — they speed up checkout. Match fees: see ladder rules ($10 standard, late and forfeit amounts listed there).';

export const OPTIONAL_TOOLS_REFERS_TO_REPORT = `Everything here is optional unless you are completing a legacy purchase. Match reporting is still handled mainly from ${REPORT_RESULTS_MENU_LABEL}.`;

export const WHY_CREDITS_MATCH_REPORTING =
  'Faster checkout for match reporting fees when you post results';

export const JOIN_LADDER_TOAST_PAYMENT_TAIL =
  'Use Payment Dashboard anytime for credits, tournament entry, or reporting fees when you post results.';

export const CHALLENGE_LOCKED_CONFIRM_FEE_LINE =
  'There is no monthly fee; match reporting fees apply when the winner posts a result.';

/** Onboarding “Billing & payments” — same numbers as rules modal */
export const ONBOARDING_STANDARD_FEE_LEDGER =
  '$10 standard — $5 to platform; $5 into the quarterly prize ledger (about $4 toward placement payouts and $1 toward the climber award).';

export const ONBOARDING_LATE_FEE =
  '+$5 late after 48 hours from the match date — that amount goes into the prize pool (per ladder rules).';

export const ONBOARDING_FORFEIT_FEE =
  '$5 admin-confirmed forfeit — per ladder rules.';
