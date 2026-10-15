/** Test (practice) leagues: limits and wording. Must match supabase-migrations/duezy-test-league-2026-10.sql. */

export const TEST_LIMITS = { divisions: 2, teams: 10 };
export const TEST_RESET_DAYS = 30;

export const isTestLeague = (league) => Boolean(league?.is_test);

/** Whole days until the test league refreshes (0 = today), or null without a date. */
export function testDaysLeft(league, now = Date.now()) {
  if (!league?.test_reset_at) return null;
  const ms = new Date(league.test_reset_at).getTime() - now;
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86400000)) : null;
}

export function testResetText(league, now = Date.now()) {
  const days = testDaysLeft(league, now);
  if (days === null) return `Refreshes every ${TEST_RESET_DAYS} days`;
  if (days === 0) return 'Refreshes today';
  if (days === 1) return 'Refreshes tomorrow';
  return `Refreshes in ${days} days`;
}

/** What a refresh does, by how the test league started. */
export const testResetWhat = (league) => (league?.test_seed === 'sample'
  ? 'Everything is wiped and the sample teams and payments are put back.'
  : 'Payments and deposits are cleared. Your divisions and teams stay.');

/** Setup wizard: why a blank test league can't be created as entered, or null. teamCounts = teams per division. */
export function testSetupProblem(teamCounts) {
  if (teamCounts.length > TEST_LIMITS.divisions) {
    return `A test league can have up to ${TEST_LIMITS.divisions} divisions.`;
  }
  if (teamCounts.some((n) => n > TEST_LIMITS.teams)) {
    return `A test league can have up to ${TEST_LIMITS.teams} teams per division.`;
  }
  return null;
}
