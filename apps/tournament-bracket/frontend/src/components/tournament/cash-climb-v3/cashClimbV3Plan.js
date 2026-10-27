/**
 * Cash Climb V3 plan: configuration, bracket shape, opening Score-Split tables, reserves, budget and the
 * later-round ladder in one object. The ladder comes from the production optimizer by default, from
 * `optimizer` when one is passed (null for none), or from an explicit `ladder`, which is validated
 * structurally and separately reported for production eligibility. The full payout selection process
 * is documented in cashClimbV3Optimizer.js.
 * Nothing outside cash-climb-v3/ uses this yet; it is not wired to any tournament or UI workflow.
 */
import { cashClimbV3Config, cashClimbV3ConfigProblems } from './cashClimbV3Config.js';
import { openingScoreSplitTable } from './cashClimbV3Opening.js';
import { cashClimbV3Budget } from './cashClimbV3Budget.js';
import { explicitLaterRoundLadder, proposeLaterRoundLadder, PRODUCTION_LADDER_OPTIMIZER } from './cashClimbV3Ladder.js';

export function cashClimbV3Plan(input, { optimizer = PRODUCTION_LADDER_OPTIMIZER, ladder = null } = {}) {
  const configProblems = cashClimbV3ConfigProblems(input);
  if (configProblems.length) return { status: 'invalid', problems: configProblems };
  const config = cashClimbV3Config(input);
  const budget = cashClimbV3Budget(config);
  const opening = {
    main: openingScoreSplitTable(config),
    preliminary: openingScoreSplitTable(config, { preliminary: true }),
  };
  const proposal = ladder ? explicitLaterRoundLadder(budget, ladder, config.entryFeeCents) : proposeLaterRoundLadder(budget, config.entryFeeCents, optimizer);
  return {
    status: budget.problems.length ? 'invalid' : 'valid',
    problems: budget.problems,
    config,
    opening,
    budget,
    ladder: proposal,
  };
}
