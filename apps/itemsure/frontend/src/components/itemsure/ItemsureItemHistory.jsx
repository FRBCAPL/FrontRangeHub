import React, { useEffect, useState } from 'react';
import { listMovements } from '../../services/itemsureInventoryService.js';
import { loadPeopleNames } from '../../services/itemsureCountService.js';
import { onInventoryChanged } from '../../utils/itemsureChanges.js';
import { displayQuantity, displaySigned } from '../../utils/itemsureQuantity.js';
import { slotLabel } from '../../utils/itemsureStock.js';
import { formatWhen } from '../../utils/itemsureText.js';

const LIMIT = 15;
const LABELS = {
  opening_balance: 'Starting amount',
  manual_addition: 'Added',
  manual_removal: 'Taken out',
  transfer_in: 'Moved in',
  transfer_out: 'Moved out',
  count_adjustment: 'Count correction',
};

/** The latest changes for one item, newest first. Read only. */
export default function ItemsureItemHistory({ organizationId, itemId, locations }) {
  const [rows, setRows] = useState(null);
  const [names, setNames] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      listMovements(organizationId, { itemId, limit: LIMIT })
        .then(async (list) => {
          if (!alive) return;
          setRows(list);
          setError('');
          const people = await loadPeopleNames(list.map((m) => m.created_by));
          if (alive) setNames(people);
        })
        .catch((e) => {
          if (!alive) return;
          setRows([]);
          setError(e.message);
        });
    load();
    const off = onInventoryChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, [organizationId, itemId]);

  if (rows === null) return <p className="isu-muted">Loading history…</p>;
  if (error) return <p className="isu-muted isu-small">History isn&apos;t available: {error}</p>;
  if (!rows.length) return <p className="isu-muted">No changes yet.</p>;

  return (
    <ul className="isu-history">
      {rows.map((m) => (
        <li key={m.id} className="isu-history-row">
          <div>
            <strong>{LABELS[m.movement_type] || m.movement_type}</strong>{' '}
            <span>{m.movement_type === 'opening_balance' ? displayQuantity(m.quantity_text) : displaySigned(m.quantity_text)} {m.unit_symbol || m.unit_name}</span>
            <p className="isu-muted isu-small">
              {slotLabel(locations, m.location_id, m.storage_area_id)} {'\u00b7'} {formatWhen(m.posted_at)} by {names[m.created_by] || 'a member'}
              {m.reason ? ` \u00b7 ${m.reason}` : ''}
            </p>
          </div>
          <span className="isu-muted isu-small">Then {displayQuantity(m.balance_after_text)}</span>
        </li>
      ))}
    </ul>
  );
}
