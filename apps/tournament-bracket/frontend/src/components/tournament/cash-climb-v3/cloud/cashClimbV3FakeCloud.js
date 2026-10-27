/**
 * An in-memory copy of the Cash Climb (V3) database functions (cash_climb_v3_save / _load / _list / _delete)
 * for tests and the development isolated cloud. Same checks, same order and same error codes as the SQL
 * (cashClimbV3CloudRules.js); it never touches Supabase.
 *
 * `operators`: [{ uid, canManageAll }] (the cash_climb_v3_operators table). A user is { uid, email, anonymous }.
 */
import { canManage, isOperator, lockProblem, payloadProblem, requiredLevel, sameJson } from './cashClimbV3CloudRules.js';

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function fail(code) {
  const error = new Error(`ccv3:${code}`);
  error.code = 'P0001';
  throw error;
}

const result = (row, replayed) => ({
  id: row.id, revision: row.revision, status: row.status, updated_at: row.updated_at, deleted: Boolean(row.deleted_at), replayed,
});

export function createCashClimbV3FakeCloud({ operators = [], now = () => new Date().toISOString(), rows = new Map() } = {}) {
  const ops = operators;
  const columns = (p) => ({
    name: p.name.replace(/^ +| +$/g, ''), event_date: p.tournamentDate, status: p.status,
    record_schema: p.schemaVersion, engine_version: p.event.version, optimizer_id: p.payout.optimizerId,
  });

  function save(user, { p_id, p_expected_revision, p_payload, p_client_level }) {
    if (!isOperator(user, ops)) fail('not-authorized');
    if (!Number.isInteger(p_client_level) || p_client_level < 1) fail('update-required');
    if (!Number.isInteger(p_expected_revision) || p_expected_revision < 0) fail('invalid-event');
    const problem = payloadProblem(p_id, p_payload);
    if (problem) fail(problem);
    if (requiredLevel(p_payload) > p_client_level) fail('update-required');
    const row = rows.get(p_id);
    if (!row) {
      if (p_expected_revision !== 0) fail('missing');
      const at = now();
      const created = { id: p_id, owner_id: user.uid, ...columns(p_payload), revision: 1, payload: clone(p_payload), deleted_at: null, created_at: at, updated_at: at };
      rows.set(p_id, created);
      return result(created, false);
    }
    if (!canManage(user, ops, row.owner_id)) fail('not-authorized');
    if (row.deleted_at) fail('deleted');
    if ((requiredLevel(row.payload) ?? Infinity) > p_client_level) fail('update-required');
    if (row.revision === p_expected_revision + 1 && sameJson(row.payload, p_payload)) return result(row, true);
    if (row.revision !== p_expected_revision) fail(`stale-revision:${row.revision}`);
    if (sameJson(row.payload, p_payload)) return result(row, false);
    const lock = lockProblem(row.payload, p_payload);
    if (lock) fail(lock);
    const next = { ...row, ...columns(p_payload), revision: row.revision + 1, payload: clone(p_payload), updated_at: now() };
    rows.set(p_id, next);
    return result(next, false);
  }

  function load(user, { p_id }) {
    if (!isOperator(user, ops)) fail('not-authorized');
    const row = rows.get(p_id);
    if (!row) return null;
    if (!canManage(user, ops, row.owner_id)) fail('not-authorized');
    return { ...result(row, false), payload: row.deleted_at ? null : clone(row.payload) };
  }

  function list(user) {
    if (!isOperator(user, ops)) fail('not-authorized');
    return [...rows.values()]
      .filter((r) => !r.deleted_at && canManage(user, ops, r.owner_id))
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 100)
      .map((r) => ({ id: r.id, name: r.name, event_date: r.event_date, status: r.status, revision: r.revision, updated_at: r.updated_at }));
  }

  function remove(user, { p_id, p_expected_revision, p_client_level }) {
    if (!isOperator(user, ops)) fail('not-authorized');
    if (!Number.isInteger(p_client_level) || p_client_level < 1) fail('update-required');
    const row = rows.get(p_id);
    if (!row) fail('missing');
    if (!canManage(user, ops, row.owner_id)) fail('not-authorized');
    if (row.deleted_at) return result(row, true);
    if ((requiredLevel(row.payload) ?? Infinity) > p_client_level) fail('update-required');
    if (row.revision !== p_expected_revision) fail(`stale-revision:${row.revision}`);
    if (row.status !== 'setup') fail('not-deletable');
    const at = now();
    const next = { ...row, deleted_at: at, revision: row.revision + 1, updated_at: at };
    rows.set(p_id, next);
    return result(next, false);
  }

  const FUNCTIONS = { cash_climb_v3_save: save, cash_climb_v3_load: load, cash_climb_v3_list: list, cash_climb_v3_delete: remove };

  /** A Supabase-like client for one user: rpc(fn, args) → { data, error }, never throws. */
  function client(user) {
    return {
      async rpc(fn, args = {}) {
        const handler = FUNCTIONS[fn];
        if (!handler) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn}` } };
        try {
          return { data: clone(handler(user, clone(args))) ?? null, error: null };
        } catch (error) {
          return { data: null, error: { code: error.code || 'XX000', message: error.message } };
        }
      },
    };
  }

  return { rows, operators: ops, client };
}
