/**
 * Immutable inventory reference codes.
 * Room: R03  |  Item: R03#012 (shown as "Item # R03#012")
 * Numbers are assigned at create and never renumbered on reorder or move.
 */

function positiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

/** Compact room code: R03 */
export function formatRoomRefCode(collectionNumber) {
  const n = positiveInt(collectionNumber);
  if (n == null) return '';
  return `R${String(n).padStart(2, '0')}`;
}

/** Compact item code: R03#012 */
export function formatItemRefCode(roomNumber, itemNumber) {
  const room = formatRoomRefCode(roomNumber);
  const item = positiveInt(itemNumber);
  if (!room || item == null) return '';
  return `${room}#${String(item).padStart(3, '0')}`;
}

/** Card / list label: Item # 012 (item sequence only — room shown in room title) */
export function formatItemRefLabel(_roomNumber, itemNumber) {
  const item = positiveInt(itemNumber);
  if (item == null) return '';
  return `Item # ${String(item).padStart(3, '0')}`;
}

/** Room list / heading label: Room # 03 */
export function formatRoomRefLabel(collectionNumber) {
  const n = positiveInt(collectionNumber);
  if (n == null) return '';
  return `Room # ${String(n).padStart(2, '0')}`;
}

export function roomTitleWithCode(name, collectionNumber) {
  const code = formatRoomRefCode(collectionNumber);
  const title = String(name || '').trim() || 'Room';
  return code ? `${code} · ${title}` : title;
}

export function itemTitleWithCode(name, roomNumber, itemNumber) {
  const code = formatItemRefCode(roomNumber, itemNumber);
  const title = String(name || '').trim() || 'Item';
  return code ? `${code} · ${title}` : title;
}
