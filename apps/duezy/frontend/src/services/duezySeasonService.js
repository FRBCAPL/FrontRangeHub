import duezy from './duezyClient.js';
import { archiveLeague, check, createLeague } from './duezyService.js';
import { syncQuantity } from './duezyBillingService.js';

const NO_LINK_COLUMN = /previous_league_id/;
const NO_SEASON_COLUMNS = /season_label|season_word/;

/** createLeague, retried without the season label / word if duezy-season-label SQL hasn't been run yet. */
export async function createSeasonRow(row, divisions) {
  try {
    return await createLeague(row, [], divisions);
  } catch (e) {
    if (!NO_SEASON_COLUMNS.test(e.message || '') || !('season_label' in row || 'season_word' in row)) throw e;
    const { season_label: _label, season_word: _word, ...rest } = row;
    return createLeague(rest, [], divisions);
  }
}

async function createLinked(previousId, row, divisions) {
  try {
    return await createSeasonRow({ ...row, previous_league_id: previousId }, divisions);
  } catch (e) {
    if (!NO_LINK_COLUMN.test(e.message || '')) throw e;
    return createSeasonRow(row, divisions);
  }
}

/**
 * New league from last season's settings, divisions and teams (all or nothing, via createLeague).
 * Links back with previous_league_id once duezy-seasons SQL is run; before that it's created without the link.
 * `archiveOld` archives last season so its divisions stop counting toward the plan. `archiveFirst` does that
 * before creating (frees trial divisions) and restores last season if the create fails.
 */
export async function createNextSeason(previousId, row, divisions, { archiveOld = false, archiveFirst = false } = {}) {
  if (archiveOld && archiveFirst) {
    await archiveLeague(previousId);
    try {
      return { created: await createLinked(previousId, row, divisions), archiveError: '' };
    } catch (e) {
      await restoreLeague(previousId).catch(() => {});
      throw e;
    }
  }
  const created = await createLinked(previousId, row, divisions);
  let archiveError = '';
  if (archiveOld) {
    try {
      await archiveLeague(previousId);
    } catch (e) {
      archiveError = e.message || 'Couldn’t archive last season.';
    }
  }
  return { created, archiveError };
}

/** Archived seasons this account can see, newest first (grouped under their league on the dashboard). */
export async function listArchivedLeagues() {
  return check(
    await duezy.from('duezy_leagues').select('*').eq('archived', true).order('created_at', { ascending: false })
  ) || [];
}

export async function restoreLeague(id) {
  check(await duezy.from('duezy_leagues').update({ archived: false }).eq('id', id));
  syncQuantity();
}
