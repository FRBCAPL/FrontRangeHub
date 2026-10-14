import duezy from './duezyClient.js';
import { check, createLeague } from './duezyService.js';
import { syncQuantity } from './duezyBillingService.js';

const NO_WORD_COLUMN = /season_word/;
const NO_LABEL_COLUMN = /session_label/;

/** createLeague, retried without season_word / division session labels if their SQL hasn't been run yet. */
export async function createSeasonRow(row, divisions) {
  try {
    return await createLeague(row, [], divisions);
  } catch (e) {
    const msg = e.message || '';
    const hasLabels = Array.isArray(divisions) && divisions.some((d) => 'session_label' in d);
    if (NO_WORD_COLUMN.test(msg) && 'season_word' in row) {
      const { season_word: _word, ...rest } = row;
      return createSeasonRow(rest, divisions);
    }
    if (NO_LABEL_COLUMN.test(msg) && hasLabels) {
      return createSeasonRow(row, divisions.map(({ session_label: _label, ...d }) => d));
    }
    throw e;
  }
}

/** Archived leagues this account can see, newest first. */
export async function listArchivedLeagues() {
  return check(
    await duezy.from('duezy_leagues').select('*').eq('archived', true).order('created_at', { ascending: false })
  ) || [];
}

export async function restoreLeague(id) {
  check(await duezy.from('duezy_leagues').update({ archived: false }).eq('id', id));
  syncQuantity();
}
