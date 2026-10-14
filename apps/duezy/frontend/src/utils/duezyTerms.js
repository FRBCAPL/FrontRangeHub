/**
 * Duezy wording, used everywhere on screen:
 *   League   = the competition people know ("Front Range 8-Ball League"); its name stays the same.
 *   Season   = one run of play ("Fall 2026") — a league row. Some leagues call it a "session".
 *   Division = teams in a season on the same night, dues and schedule.
 *   Week     = one league night.
 */

export const SEASON_WORDS = ['season', 'session'];
export const SEASON_LABEL_MAX = 40;

/** { one, One, many, Many } for this league's word ("season" unless it chose "session"). */
export function seasonTerms(league) {
  const one = league?.season_word === 'session' ? 'session' : 'season';
  const cap = one.charAt(0).toUpperCase() + one.slice(1);
  return { one, One: cap, many: `${one}s`, Many: `${cap}s` };
}

/** True once the season-label SQL has added the columns (the league row then carries them). */
export const hasSeasonFields = (league) => Boolean(league) && 'season_label' in league;

export const seasonLabel = (league) => String(league?.season_label || '').trim();

/** "Front Range 8-Ball League · Fall 2026", or just the name. */
export function leagueTitle(league) {
  const label = seasonLabel(league);
  return label ? `${league.name} · ${label}` : String(league?.name || '');
}

/** Season fields for a save, only when the columns exist. */
export function seasonFieldsToSave(form, league = form) {
  if (!hasSeasonFields(league)) return {};
  const label = String(form.season_label || '').trim().slice(0, SEASON_LABEL_MAX);
  return { season_label: label || null, season_word: form.season_word === 'session' ? 'session' : 'season' };
}

/**
 * Seasons grouped by league family, using previous_league_id links.
 * Returns { cards: [{ league, past: [archived seasons, newest first] }], archived: [unlinked archived leagues] }.
 * Each active league is a card; a family's archived seasons sit under its newest active season.
 */
export function groupSeasons(active = [], archived = []) {
  const all = new Map([...active, ...archived].map((l) => [l.id, l]));
  const rootOf = (l) => {
    let cur = l;
    const path = [cur.id];
    while (cur.previous_league_id && all.has(cur.previous_league_id)) {
      cur = all.get(cur.previous_league_id);
      const at = path.indexOf(cur.id);
      if (at >= 0) return path.slice(at).sort()[0];
      path.push(cur.id);
    }
    return cur.id;
  };
  const newest = (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''));
  const families = new Map();
  [...active, ...archived].forEach((l) => {
    const root = rootOf(l);
    if (!families.has(root)) families.set(root, { active: [], archived: [] });
    families.get(root)[l.archived ? 'archived' : 'active'].push(l);
  });
  const pastFor = new Map();
  const leftover = [];
  families.forEach((f) => {
    f.archived.sort(newest);
    if (f.active.length) pastFor.set([...f.active].sort(newest)[0].id, f.archived);
    else leftover.push(...f.archived);
  });
  return {
    cards: active.map((league) => ({ league, past: pastFor.get(league.id) || [] })),
    archived: leftover.sort(newest),
  };
}
