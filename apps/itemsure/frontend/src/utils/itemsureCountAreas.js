// Which spots a count can record into. Shared by the counting screen and quick count.
import { NO_AREA_LABEL } from './itemsureStock.js';

export const NO_AREA = '';

/**
 * The session's own spot, or the location's active spots plus "Loose".
 * `entries` is any list/object of saved entries; spots already used stay listed even if archived since.
 */
export function countingAreas(session, storageAreas, entries) {
  if (session.scope === 'storage_area') {
    const area = storageAreas.find((a) => a.id === session.storage_area_id);
    return [{ id: session.storage_area_id, name: area?.name || 'Spot' }];
  }
  const used = new Set(Object.values(entries || {}).map((e) => e.storage_area_id).filter(Boolean));
  const list = storageAreas.filter((a) => a.is_active || used.has(a.id)).map((a) => ({ id: a.id, name: a.name }));
  return [...list, { id: NO_AREA, name: NO_AREA_LABEL }];
}