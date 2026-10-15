import duezy from './duezyClient.js';
import { check, createLeague, listLeagues } from './duezyService.js';

/** Wipe / refill the caller's test league now. Returns the next automatic refresh time. */
export async function resetTestLeague(leagueId) {
  return check(await duezy.rpc('duezy_test_reset', { p_league_id: leagueId }));
}

/** New test league filled with the sample divisions, teams and payments (seeded by the database). */
export async function createSampleTestLeague(name) {
  const created = await createLeague({ name, sport: 'pool', dues_amount: 20, is_test: true, test_seed: 'sample' }, []);
  try {
    await resetTestLeague(created.id);
  } catch (e) {
    await duezy.from('duezy_leagues').delete().eq('id', created.id);
    throw e;
  }
  return created;
}

export async function hasTestLeague() {
  return (await listLeagues()).some((l) => l.is_test);
}
