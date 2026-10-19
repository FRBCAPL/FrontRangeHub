/**
 * In-memory stand-in for the Showdown database functions, used by the tests and (persisted to browser
 * storage) by the development-only isolated test cloud in showdownIsolatedCloud.js. It mirrors the rules in
 * supabase-migrations/cash-climb-showdown-2026-10.sql (operator + owner checks, versioned saves,
 * sanitized public reads, phone submission validation, duplicate and rate limits) so the app code
 * can be exercised end to end without a database.
 */
import { phoneSubmissionCode } from '../showdownPhoneActions.js';
import {
  dbPayoutVersion, dbMinEngine, legacySaveProblem, saveV2PreProblem, saveV2LockProblem,
  guardedLegacySaveProblem, legacyV1OnlyProblem, engineProblem, approvalProblem,
} from './showdownSaveRules.js';

const smallInt = (v) => (/^[1-9][0-9]?$/.test(String(v ?? '')) ? Number(v) : null);

/** Format and settings checks the database makes before it validates a phone score. */
function submitFormatProblem(payload, matchId) {
  const version = dbPayoutVersion(payload);
  if (version === null || dbMinEngine(payload) === null) return 'unsupported-format';
  const match = (payload.matches || []).find((m) => m.id === matchId);
  if (!match || !['qualifying', 'playoff'].includes(match.phase)) return '';
  if (version === 3) {
    const plan = payload.payoutPlan;
    if (plan?.payoutVersion !== 3) return 'invalid-settings';
    return smallInt(match.phase === 'qualifying' ? plan.qualifyingGames : plan.playoffRaceTo) ? '' : 'invalid-settings';
  }
  const s = payload.settings || {};
  return smallInt(match.phase === 'qualifying' ? s.qualifyingRaceTo : s.playoffRaceTo) ? '' : 'invalid-settings';
}

const OPERATOR_EMAILS = ['sslampro@gmail.com', 'guest@guestmail.com'];
const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/**
 * `migrated: false` behaves like a database without cash-climb-showdown-v3-2026-10.sql (no save_v2, old rules).
 * `guarded: false` behaves like a database without the V2 guard (no delete_v2 / decide_v2; older builds may
 * still save V2 and delete or decide any format).
 */
export function createFakeCloud({ now = () => Date.now(), migrated = true, guarded = migrated, newId = null } = {}) {
  const events = new Map();
  const pending = [];
  let offline = false;
  let ids = 0;
  const nextId = newId || (() => { ids += 1; return `sub-${ids}`; });

  const fail = (code) => ({ data: null, error: { message: `showdown:${code}`, code: 'P0001' } });
  const ok = (data) => ({ data: copy(data), error: null });
  const isAdmin = (u) => Boolean(u?.uid && u.admin);
  const isOperator = (u) => Boolean(u?.uid) && (OPERATOR_EMAILS.includes(String(u.email || '').toLowerCase()) || isAdmin(u));
  const canManage = (u, owner) => isOperator(u) && (owner === u.uid || isAdmin(u));
  const recent = (row) => now() - row.createdMs < 10 * 60 * 1000;

  const stale = (row) => ({ data: null, error: { message: `showdown:stale-version:${row.version}`, code: 'P0001' } });
  const STATUSES = ['setup', 'qualifying', 'shootout', 'bracket', 'playoffs', 'completed'];

  /** Shared body of both saves; `rules` adds the checks that differ between them. */
  function save(u, { p_id, p_expected_version, p_payload, p_public }, rules) {
    if (!isOperator(u)) return fail('not-authorized');
    if (!p_payload || p_payload.id !== p_id || p_payload.type !== 'cash-climb-showdown' || !STATUSES.includes(p_payload.status)) return fail('invalid-event');
    const row = events.get(p_id);
    const pre = rules.pre(row, p_payload);
    if (pre) return fail(pre);
    const pub = { ...(p_public || {}) };
    delete pub.audit;
    if (!row) {
      if ((p_expected_version || 0) !== 0) return fail('missing');
      events.set(p_id, { id: p_id, owner: u.uid, status: p_payload.status, version: 1, payload: copy(p_payload), publicPayload: copy(pub), updatedAt: new Date(now()).toISOString() });
      return ok({ version: 1 });
    }
    if (!canManage(u, row.owner)) return fail('not-authorized');
    const owned = rules.owned(row, p_payload);
    if (owned) return fail(owned);
    if (rules.replay && row.version === (p_expected_version || 0) + 1 && JSON.stringify(row.payload) === JSON.stringify(p_payload)) {
      return ok({ version: row.version, replayed: true });
    }
    if (row.version !== p_expected_version) return stale(row);
    const locked = rules.locked(row, p_payload);
    if (locked) return fail(locked);
    Object.assign(row, { status: p_payload.status, version: row.version + 1, payload: copy(p_payload), publicPayload: copy(pub), updatedAt: new Date(now()).toISOString() });
    return ok({ version: row.version });
  }

  const legacyRule = guarded ? guardedLegacySaveProblem : legacySaveProblem;
  const LEGACY = migrated
    ? { pre: (row, p) => legacyRule(null, p), owned: (row, p) => legacyRule(row, p), locked: () => '' }
    : { pre: () => '', owned: () => '', locked: () => '' };

  /** Shared body of both deletes; `formatProblem(payload)` is the check that differs between them. */
  function remove(u, p_id, formatProblem) {
    const row = events.get(p_id);
    if (!row) return ok(null);
    if (!canManage(u, row.owner)) return fail('not-authorized');
    const format = formatProblem(row.payload);
    if (format) return fail(format);
    events.delete(p_id);
    for (let i = pending.length - 1; i >= 0; i -= 1) if (pending[i].event_id === p_id) pending.splice(i, 1);
    return ok(null);
  }

  /** Shared body of both decisions; `rules.format(payload)` and `rules.approval(payload, sub)` differ. */
  function decide(u, { p_id, p_decision, p_reason }, rules) {
    if (!['approved', 'rejected'].includes(p_decision)) return fail('invalid-decision');
    if (rules.engine) return fail(rules.engine);
    const p = pending.find((x) => x.id === p_id);
    if (!p) return fail('submission-not-found');
    const row = events.get(p.event_id);
    if (!canManage(u, row?.owner)) return fail('not-authorized');
    const format = rules.format(row.payload);
    if (format) return fail(format);
    if (p.status !== 'pending') return fail('already-decided');
    const approval = p_decision === 'approved' ? rules.approval(row.payload, p) : '';
    if (approval) return fail(approval);
    Object.assign(p, { status: p_decision, reason: String(p_reason || '').slice(0, 200), decided_by: u.uid });
    return ok({ id: p_id, status: p_decision });
  }

  const none = () => '';
  const legacyFormat = guarded ? legacyV1OnlyProblem : none;
  const badEngine = (engine) => (!Number.isInteger(engine) || engine < 1 ? 'update-required' : '');

  const fns = {
    cash_climb_showdown_save(u, args) {
      return save(u, args, LEGACY);
    },
    cash_climb_showdown_save_v2(u, args) {
      return save(u, args, {
        pre: (row, p) => saveV2PreProblem(null, p, args.p_engine),
        owned: (row, p) => saveV2PreProblem(row, p, args.p_engine),
        locked: saveV2LockProblem,
        replay: true,
      });
    },
    cash_climb_showdown_load(u, { p_id }) {
      if (!isOperator(u)) return fail('not-authorized');
      const row = events.get(p_id);
      if (!row) return ok(null);
      if (!canManage(u, row.owner)) return fail('not-authorized');
      return ok({ id: row.id, version: row.version, status: row.status, updated_at: row.updatedAt, payload: row.payload });
    },
    cash_climb_showdown_list(u) {
      return ok([...events.values()].filter((r) => canManage(u, r.owner)).map((r) => ({
        id: r.id, name: r.payload.name, venue: r.payload.venue, event_date: r.payload.tournamentDate, status: r.status, version: r.version, updated_at: r.updatedAt,
      })));
    },
    cash_climb_showdown_delete(u, { p_id }) {
      return remove(u, p_id, legacyFormat);
    },
    cash_climb_showdown_delete_v2(u, { p_id, p_engine }) {
      if (badEngine(p_engine)) return fail('update-required');
      return remove(u, p_id, (payload) => engineProblem(payload, p_engine));
    },
    cash_climb_showdown_public_list() {
      return ok([...events.values()].filter((r) => r.status !== 'setup').map((r) => ({
        id: r.id, name: r.publicPayload.name, venue: r.publicPayload.venue, event_date: r.publicPayload.tournamentDate, status: r.status, updated_at: r.updatedAt,
      })));
    },
    cash_climb_showdown_public_get(u, { p_id }) {
      const row = events.get(p_id);
      if (!row || row.status === 'setup') return ok(null);
      return ok({ id: row.id, status: row.status, version: row.version, updated_at: row.updatedAt, event: row.publicPayload });
    },
    cash_climb_showdown_public_pending(u, { p_event_id }) {
      return ok(pending.filter((p) => p.event_id === p_event_id && p.status === 'pending').map((p) => ({ match_id: p.match_id, created_at: p.created_at })));
    },
    cash_climb_showdown_submit(u, { p_event_id, p_match_id, p_p1, p_p2, p_score1, p_score2, p_name }) {
      const row = events.get(p_event_id);
      if (!row || !['qualifying', 'playoffs'].includes(row.status)) return fail('event-not-active');
      const formatCode = submitFormatProblem(row.payload, p_match_id);
      if (formatCode) return fail(formatCode);
      const code = phoneSubmissionCode(row.payload, { matchId: p_match_id, p1: p_p1, p2: p_p2, score1: p_score1, score2: p_score2 });
      const v3Qualifying = dbPayoutVersion(row.payload) === 3 && row.payload.matches.find((m) => m.id === p_match_id)?.phase === 'qualifying';
      if (code) return fail(code === 'invalid-score' && v3Qualifying ? 'invalid-games' : code);
      if (pending.some((p) => p.event_id === p_event_id && p.match_id === p_match_id && p.status === 'pending')) return fail('duplicate');
      const byEvent = pending.filter((p) => p.event_id === p_event_id && recent(p)).length;
      const rejected = pending.filter((p) => p.event_id === p_event_id && p.match_id === p_match_id && p.status === 'rejected' && recent(p)).length;
      if (byEvent >= 120 || rejected >= 5) return fail('rate-limited');
      const match = row.payload.matches.find((m) => m.id === p_match_id);
      const sub = {
        id: nextId(), event_id: p_event_id, match_id: p_match_id, phase: match.phase, p1: p_p1, p2: p_p2,
        score1: p_score1, score2: p_score2, submitted_name: String(p_name || '').trim().slice(0, 60), status: 'pending', reason: '',
        event_version: row.version, created_at: new Date(now()).toISOString(), createdMs: now(),
      };
      pending.push(sub);
      return ok({ id: sub.id, status: 'pending' });
    },
    cash_climb_showdown_submission_status(u, { p_id }) {
      const p = pending.find((x) => x.id === p_id);
      return ok(p ? { id: p.id, match_id: p.match_id, status: p.status, reason: p.reason } : null);
    },
    cash_climb_showdown_pending_list(u, { p_event_id }) {
      const row = events.get(p_event_id);
      if (!row) return ok([]);
      if (!canManage(u, row.owner)) return fail('not-authorized');
      return ok(pending.filter((p) => p.event_id === p_event_id && p.status === 'pending').map(({ createdMs, ...rest }) => rest));
    },
    cash_climb_showdown_decide(u, args) {
      return decide(u, args, { format: legacyFormat, approval: none });
    },
    cash_climb_showdown_decide_v2(u, args) {
      return decide(u, args, { engine: badEngine(args.p_engine), format: (payload) => engineProblem(payload, args.p_engine), approval: approvalProblem });
    },
  };

  if (!migrated) delete fns.cash_climb_showdown_save_v2;
  if (!guarded) {
    delete fns.cash_climb_showdown_delete_v2;
    delete fns.cash_climb_showdown_decide_v2;
  }

  return {
    events,
    pending,
    setOffline(value) { offline = value; },
    client(user) {
      return {
        async rpc(fn, args) {
          if (offline) throw new TypeError('Failed to fetch');
          const f = fns[fn];
          if (!f) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function in the schema cache' } };
          return f(user, copy(args) || {});
        },
      };
    },
  };
}

export const OPERATOR = { uid: 'u-op', email: 'sslampro@gmail.com' };
export const GUEST_OPERATOR = { uid: 'u-guest', email: 'guest@guestmail.com' };
export const ADMIN = { uid: 'u-admin', email: 'frbcapl@gmail.com', admin: true };
export const PLAYER = { uid: 'u-player', email: 'player@example.com' };
