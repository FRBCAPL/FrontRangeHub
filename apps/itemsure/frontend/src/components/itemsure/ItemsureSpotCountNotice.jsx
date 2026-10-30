import React from 'react';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useOpenCounts from '../../hooks/useOpenCounts.js';
import ItemsureCountNotice from './ItemsureCountNotice.jsx';

/**
 * Count heads-ups for stock forms that don't already track open counts.
 * `spots` is [{ locationId, storageAreaId, label? }]; label is only needed when there is more than one.
 */
export default function ItemsureSpotCountNotice({ itemId, spots }) {
  const { organization, can } = useItemsureWorkspace();
  const counts = useOpenCounts(organization.id, can('counts.view') || can('counts.edit'));
  if (!itemId || !counts.sessions.length) return null;
  return spots.map((s) => (
    <ItemsureCountNotice
      key={`${s.locationId}:${s.storageAreaId || ''}`}
      label={s.label}
      covering={counts.coveringSpot(itemId, s.locationId, s.storageAreaId)}
    />
  ));
}
