import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addTeam as addTeamRow,
  getLeague,
  listPayments,
  listTeams,
  markPaidThrough as markPaidRows,
  savePayment,
  updateLeague,
  updateTeam as updateTeamRow,
} from '../services/duezyService.js';
import { listDivisions, updateDivision } from '../services/duezyDivisionService.js';
import { getPeople } from '../services/duezyPeopleService.js';
import { indexPayments } from '../utils/duezyMath.js';
import { divisionUnits, isMultiDivision } from '../utils/duezyDivisions.js';
import { canEdit as roleCanEdit, isOwner as roleIsOwner } from '../utils/duezyPeople.js';

/** Loads one league with its divisions, teams and payments, and exposes optimistic actions. */
export default function useDuezyLeague(leagueId) {
  const [league, setLeague] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [payments, setPayments] = useState([]);
  const [role, setRole] = useState(null);
  const [helperCount, setHelperCount] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [l, d, t, p, people] = await Promise.all([
        getLeague(leagueId), listDivisions(leagueId), listTeams(leagueId), listPayments(leagueId),
        getPeople(leagueId).catch(() => null),
      ]);
      setRole(people?.my_role || null);
      setHelperCount(people ? (people.members?.length || 0) + (people.invites?.length || 0) : null);
      setLeague(l);
      setDivisions(d);
      setTeams(t);
      setPayments(p);
      setError(l ? '' : 'League not found.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  const paymentIndex = useMemo(() => indexPayments(payments), [payments]);
  const units = useMemo(() => divisionUnits(league, divisions), [league, divisions]);
  const multi = isMultiDivision(league, divisions);
  const several = units.length > 1;

  const [lastChange, setLastChange] = useState(null);

  const writePayment = useCallback(
    async (teamId, week, entry) => {
      const previous = payments;
      const optimistic = { id: `tmp-${teamId}-${week}`, team_id: teamId, week, amount: 0, method: null, note: null, ...entry };
      setPayments((prev) => [...prev.filter((p) => !(p.team_id === teamId && p.week === week)), optimistic]);
      try {
        const saved = await savePayment(leagueId, teamId, week, entry);
        setPayments((prev) => [...prev.filter((p) => !(p.team_id === teamId && p.week === week)), saved]);
        return true;
      } catch (e) {
        setPayments(previous);
        setError(`Couldn't save that payment: ${e.message}`);
        return false;
      }
    },
    [leagueId, payments]
  );

  /** Saves and remembers what was there before, so the toast can offer Undo. */
  const setPayment = useCallback(
    async (teamId, week, entry) => {
      const before = payments.find((p) => p.team_id === teamId && p.week === week) || null;
      const ok = await writePayment(teamId, week, entry);
      if (ok) setLastChange({ teamId, week, entry, before, at: Date.now() });
    },
    [payments, writePayment]
  );

  /** Puts the week back how it was. A week that had no entry goes back to "not paid" (entries are never deleted). */
  const undoLastChange = useCallback(async () => {
    if (!lastChange) return;
    const { teamId, week, before } = lastChange;
    setLastChange(null);
    await writePayment(teamId, week, before
      ? { status: before.status, amount: Number(before.amount) || 0, method: before.method || null, note: before.note || null }
      : { status: 'unpaid', amount: 0 });
  }, [lastChange, writePayment]);

  const dismissLastChange = useCallback(() => setLastChange(null), []);

  /** divisionId = null moves the league's own week (league not yet migrated to division rows). */
  const setWeek = useCallback(
    async (divisionId, week) => {
      if (!divisionId) {
        setLeague((prev) => (prev ? { ...prev, current_week: week } : prev));
        try { await updateLeague(leagueId, { current_week: week }); } catch { /* viewing still works */ }
        return;
      }
      setDivisions((prev) => prev.map((d) => (d.id === divisionId ? { ...d, current_week: week } : d)));
      try { await updateDivision(divisionId, { current_week: week }); } catch { /* viewing still works */ }
    },
    [leagueId]
  );

  const addTeam = useCallback(
    async (team, divisionId = null) => {
      const created = await addTeamRow(leagueId, team, teams.length, divisionId);
      setTeams((prev) => [...prev, created]);
    },
    [leagueId, teams.length]
  );

  const markPaidThrough = useCallback(async (teamIds, throughWeek, dues) => {
    const saved = await markPaidRows(leagueId, teamIds, throughWeek, dues);
    const keys = new Set(saved.map((p) => `${p.team_id}:${p.week}`));
    setPayments((prev) => [...prev.filter((p) => !keys.has(`${p.team_id}:${p.week}`)), ...saved]);
  }, [leagueId]);

  const updateTeam = useCallback(async (teamId, changes) => {
    await updateTeamRow(teamId, changes);
    setTeams((prev) => (changes.archived ? prev.filter((t) => t.id !== teamId) : prev.map((t) => (t.id === teamId ? { ...t, ...changes } : t))));
  }, []);

  return {
    role, canEdit: roleCanEdit(role), isOwner: roleIsOwner(role), helperCount,
    league, divisions, units, multi, several, teams, payments, paymentIndex,
    error, setError, loading, setPayment, setWeek, addTeam, updateTeam, markPaidThrough,
    lastChange, undoLastChange, dismissLastChange,
  };
}
