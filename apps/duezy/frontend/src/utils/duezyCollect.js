/**
 * "Collect tonight": the league-night list of teams that still owe this week, and the running totals.
 */
import { paidFor } from './duezyMath.js';
import { teamBucket } from './duezyTeamGroups.js';

/** Teams still to collect this week (not paid yet, or partial), in the list's own order. */
export const collectList = (teams, week, paymentIndex) => teams.filter((t) => teamBucket(t, week, paymentIndex) === 'open');

/** This week so far: money in, money due (bye weeks owe nothing) and how many teams are left. */
export function weekTotals(teams, week, dues, paymentIndex) {
  let collected = 0;
  let due = 0;
  teams.forEach((t) => {
    const p = paymentIndex.get(`${t.id}:${week}`);
    collected += paidFor(p, dues);
    if (p?.status !== 'bye') due += dues;
  });
  return { collected, due, left: collectList(teams, week, paymentIndex).length };
}

/** Money one save added (negative if it took some away). */
export const collectDelta = (before, after, dues) => paidFor(after, dues) - paidFor(before, dues);
