/**
 * Smart Tournament Builder settings. The Builder is an isolated advisor: it reads engine rules and plays
 * events in memory. It never creates, stores or syncs an event; "Use these settings" only fills in the
 * normal setup screens, where the operator reviews and starts the event.
 */
export const SMART_BUILDER_ENABLED = false;

export const UNCALIBRATED_NOTE = 'Uncalibrated estimate: based on an assumed pace, not on timed events. Not a guarantee.';

/** Preferred cushion under the target (a ranking preference, not a requirement). */
export const COMFORT_MARGIN_MIN = 30;
/** How far over the target still counts as Close. */
export const CLOSE_MARGIN_MIN = 30;
/** Within this many minutes of a class boundary the estimate is marked borderline. */
export const BORDERLINE_MIN = 5;

/** A Tight option is offered beside a Comfortable one only for at least one of these gains. */
export const MEANINGFUL_GAIN = { guaranteedGames: 2, guaranteedMatches: 1, finalRace: 1 };

/** Score weights inside a fit class. Favors broad earnings; champion share is shown, not scored. */
export const WEIGHTS = {
  guaranteedGames: 0.35,
  guaranteedMatches: 0.10,
  opponents: 0.10,
  finalRace: 0.10,
  payoutBreadth: 0.20,
  tableUse: 0.15,
};

/** Fixed scales so a score means the same thing at every field size. */
export const SCALES = { guaranteedGames: 20, guaranteedMatches: 4, opponents: 4, finalRace: 5 };

export const DEFAULT_RUNS = 60;

/** Two-pass search: quick runs for every candidate, then more runs for anything that could be shown. */
export const PASS1_RUNS = 20;
export const PASS2_RUNS = 100;
/** Quick estimates this close to a class boundary are refined; beyond target + 30 + this, a setting is Over. */
export const REFINE_BAND_MIN = 15;
/** Refined per family and fitting class, in quick-score order. */
export const REFINE_PER_FAMILY = 3;
