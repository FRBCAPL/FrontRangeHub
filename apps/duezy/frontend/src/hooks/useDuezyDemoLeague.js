import { useCallback, useMemo, useState } from 'react';
import { buildDemoLeague, DEMO_EMAIL, DEMO_ID } from '../data/duezyDemoData.js';
import { indexPayments } from '../utils/duezyMath.js';
import { divisionUnits, isMultiDivision } from '../utils/duezyDivisions.js';

let seq = 0;
const nextId = (prefix) => `${prefix}-${Date.now()}-${(seq += 1)}`;

/**
 * Same shape and actions as useDuezyLeague, but everything lives in memory (the public demo).
 * Each save also writes a history row the way the database trigger does, so the activity log works.
 */
export default function useDuezyDemoLeague() {
  const [seed] = useState(() => buildDemoLeague());
  const [league] = useState(seed.league);
  const [divisions, setDivisions] = useState(seed.divisions);
  const [teams, setTeams] = useState(seed.teams);
  const [payments, setPayments] = useState(seed.payments);
  const [history, setHistory] = useState(seed.history);
  const [error, setError] = useState('');
  const [lastChange, setLastChange] = useState(null);

  const paymentIndex = useMemo(() => indexPayments(payments), [payments]);
  const units = useMemo(() => divisionUnits(league, divisions), [league, divisions]);
  const several = units.length > 1;

  const writePayment = useCallback((teamId, week, entry) => {
    const now = new Date().toISOString();
    const before = payments.find((p) => p.team_id === teamId && p.week === week) || null;
    const row = {
      id: `${teamId}:${week}`, league_id: DEMO_ID, team_id: teamId, week, amount: 0, method: null, note: null, paid_by: null,
      ...entry, updated_at: now, recorded_by_email: DEMO_EMAIL,
    };
    setPayments((prev) => [...prev.filter((p) => !(p.team_id === teamId && p.week === week)), row]);
    const team = teams.find((t) => t.id === teamId);
    setHistory((prev) => [{
      id: nextId('h'), league_id: DEMO_ID, team_id: teamId, week, action: before ? 'changed' : 'created',
      old_status: before?.status ?? null, old_amount: before ? Number(before.amount) || 0 : null,
      new_status: row.status, new_amount: Number(row.amount) || 0, method: row.method, note: row.note, paid_by: row.paid_by,
      changed_by_email: DEMO_EMAIL, changed_at: now, team: { name: team?.name, division_id: team?.division_id },
    }, ...prev]);
    return before;
  }, [payments, teams]);

  const setPayment = useCallback(async (teamId, week, entry) => {
    const before = writePayment(teamId, week, entry);
    setLastChange({ teamId, week, entry, before, at: Date.now() });
  }, [writePayment]);

  const undoLastChange = useCallback(async () => {
    if (!lastChange) return;
    const { teamId, week, before } = lastChange;
    setLastChange(null);
    writePayment(teamId, week, before
      ? { status: before.status, amount: Number(before.amount) || 0, method: before.method || null, note: before.note || null, paid_by: before.paid_by || null }
      : { status: 'unpaid', amount: 0 });
  }, [lastChange, writePayment]);

  const dismissLastChange = useCallback(() => setLastChange(null), []);

  const setWeek = useCallback(async (divisionId, week) => {
    setDivisions((prev) => prev.map((d) => (d.id === divisionId ? { ...d, current_week: week } : d)));
  }, []);

  const toTeam = (t, divisionId, order) => ({
    id: nextId('team'), league_id: DEMO_ID, division_id: divisionId, name: t.name.trim(), captain: t.captain?.trim() || null,
    contact: t.contact?.trim() || null, players: t.players || [], sort_order: order, archived: false,
  });
  const addTeam = useCallback(async (team, divisionId = null) => {
    setTeams((prev) => [...prev, toTeam(team, divisionId, prev.length)]);
  }, []);
  const addTeams = useCallback(async (list, divisionId = null) => {
    setTeams((prev) => [...prev, ...list.map((t, i) => toTeam(t, t.division_id || divisionId, prev.length + i))]);
  }, []);

  const updateTeam = useCallback(async (teamId, changes) => {
    setTeams((prev) => (changes.archived ? prev.filter((t) => t.id !== teamId) : prev.map((t) => (t.id === teamId ? { ...t, ...changes } : t))));
  }, []);

  const markPaidThrough = useCallback(async (teamIds, throughWeek, dues) => {
    teamIds.forEach((teamId) => {
      for (let w = 1; w <= throughWeek; w += 1) writePayment(teamId, w, { status: 'paid', amount: dues, note: 'Marked paid at setup' });
    });
  }, [writePayment]);

  return {
    role: 'owner', canEdit: true, isOwner: false, helperCount: 0,
    league, divisions, units, multi: isMultiDivision(league, divisions), several, teams, payments, paymentIndex,
    error, setError, loading: false, setPayment, setWeek, addTeam, addTeams, updateTeam, markPaidThrough,
    lastChange, undoLastChange, dismissLastChange,
    history,
  };
}
