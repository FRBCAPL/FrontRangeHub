export function readableDatabaseError(error) {
  if (!error) return 'Something went wrong.';
  const message = error.message || '';

  if (error.code === 'PGRST106' || /invalid schema|schema must be one of/i.test(message)) {
    return 'ItemSure\u2019s database is not exposed yet. In Supabase, add "itemsure" under API settings \u2192 Exposed schemas.';
  }
  // ItemSure's own triggers and functions raise messages written for people.
  if (error.code === 'P0001' && message) return message;
  if (error.code === '23505') return 'That value is already in use.';
  if (error.code === '23503') return 'That choice is no longer available.';
  if (error.code === '23514') return 'Check the values and try again.';
  if (error.code === '42P01' || /schema cache/i.test(message)) {
    return 'The ItemSure database is not ready. Apply the ItemSure migrations, then reload.';
  }
  if (error.code === '42501' || /row-level security|permission/i.test(message)) {
    return 'You do not have permission to do that.';
  }
  if (/another organization/i.test(message)) return 'That choice belongs to another organization.';
  if (/own role/i.test(message)) return 'You cannot change your own role.';
  return 'The database did not accept that change.';
}

/** Throws a readable Error for a Supabase { error } result. */
export function assertOk(result, scope) {
  if (result?.error) {
    console.error(`[itemsure] ${scope}`, result.error);
    throw new Error(readableDatabaseError(result.error));
  }
  return result.data;
}
