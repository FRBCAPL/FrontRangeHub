/**
 * The three Cash Climb formats. Each keeps its own stable ids; nothing converts records between them.
 *   id          hub kind / Smart Builder family
 *   recordType  `type` stored on saved records
 * Cash Climb King of the Hill is the original format (id 'cash-climb'); Cash Climb Showdown stores
 * records as 'cash-climb-showdown'; the new Cash Climb engine is 'cash-climb-v3'.
 */
export const CASH_CLIMB_FORMATS = Object.freeze([
  Object.freeze({ id: 'cash-climb-v3', recordType: 'cash-climb-v3', label: 'Cash Climb' }),
  Object.freeze({ id: 'cash-climb', recordType: 'cash-climb', label: 'Cash Climb: King of the Hill' }),
  Object.freeze({ id: 'showdown', recordType: 'cash-climb-showdown', label: 'Cash Climb: Showdown' }),
]);

const byId = new Map(CASH_CLIMB_FORMATS.map((f) => [f.id, f]));
const byRecordType = new Map(CASH_CLIMB_FORMATS.map((f) => [f.recordType, f]));

export const cashClimbFormat = (id) => byId.get(id) || null;

export const cashClimbFormatLabel = (id) => cashClimbFormat(id)?.label || '';

/** Format of a hub item or saved record, by its kind or stored type. Null when it is not a Cash Climb format. */
export function cashClimbFormatOf(item) {
  if (!item) return null;
  return byId.get(item.kind) || byRecordType.get(item.type) || null;
}
