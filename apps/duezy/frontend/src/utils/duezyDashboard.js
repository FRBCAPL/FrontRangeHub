/** Money snapshot for a league card on the dashboard (same math as the league page). */
import { indexPayments, round2 } from './duezyMath.js';
import { allDivisionsStats, divisionUnits } from './duezyDivisions.js';
import { todayISO } from './duezySchedule.js';

/** { collected, late, lateTeams, due, seasonValue } — collected includes money paid ahead. */
export function leagueSnapshot(league, divisions, teams, payments, today = todayISO(league?.timezone)) {
  const units = divisionUnits(league, divisions);
  const all = allDivisionsStats(units, teams, indexPayments(payments), { today, defaultGrace: Number(league?.grace_days) || 0 });
  return {
    collected: all.season.collectedAll,
    late: round2(all.behind.reduce((s, x) => s + x.owed, 0)),
    lateTeams: all.behind.length,
    due: all.dueTotal,
    seasonValue: all.season.seasonValue,
  };
}

/** Split flat rows into { [league_id]: rows[] }. */
export function groupByLeague(rows) {
  const out = {};
  rows.forEach((r) => { (out[r.league_id] ||= []).push(r); });
  return out;
}
