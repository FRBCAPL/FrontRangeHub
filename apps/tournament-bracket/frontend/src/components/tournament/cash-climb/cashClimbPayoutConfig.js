/** Tunable Cash Climb payout knobs. Keep all prize math constants here. */

export const PAYOUT_MODEL_V2 = 'rr-koh-v2';

export const MIN_OPENING_WIN = 2;
export const RR_CLIMB_STEP = 1;

/**
 * KOH bank as a share of the pool. This is the maximum KOH can ever give
 * the champion (match pays + unused KOH championship). Tuned so finishing first
 * feels like a real win while round-robin still pays as you go.
 */
export const KOH_TARGET_PERCENT = 0.27;

/**
 * Share of the pool that RR matches cannot spend. It stays unused RR and
 * funds 2nd / 3rd even on a long night that exhausts the RR climb.
 */
export const RR_PODIUM_PERCENT = 0.16;

/** Extra planned RR rounds kept in the spendable climb when sizing a hold. Unused. */
export const RR_HOLD_BUFFER_ROUNDS = 2;

/** KOH schedule prefers this many slots. Unused slots become championship money. */
export const KOH_MATCH_COUNT = 5;

/**
 * Fraction of the KOH budget that may be scheduled as match pays.
 * The rest is a guaranteed championship floor even if the KOH ladder is fully played.
 * Kept below the old 80% so finishing first still pays, but high enough that 2nd stays close.
 */
export const KOH_MATCH_SPEND_CAP = 0.72;

/** Prefer KOH match 1 at least this many dollars above the last RR per-win. */
export const KOH_MIN_GAP_OVER_RR = 1;

/** Unused RR allocation: 2nd / 3rd podium split. */
export const RR_SURPLUS_SECOND_SHARE = 0.6;
export const RR_SURPLUS_THIRD_SHARE = 0.4;
