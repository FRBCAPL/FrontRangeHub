import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMovements, MOVEMENT_LABELS } from '../../services/itemsureInventoryService.js';
import { loadPeopleNames } from '../../services/itemsureCountService.js';
import { listMovementPackages } from '../../services/itemsurePackageService.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { displayQuantity, displaySigned, quantitySign } from '../../utils/itemsureQuantity.js';
import { slotLabel } from '../../utils/itemsureStock.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { ErrorNote } from './ItemsureUi.jsx';

const PAGE = 100;

/** Newest first. Each row is one posted movement; nothing here can be edited. */
export default function ItemsureStockActivity({ organizationId, location, locations }) {
  const [rows, setRows] = useState(null);
  const [names, setNames] = useState({});
  const [packages, setPackages] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    listMovements(organizationId, { locationId: location.id, limit: PAGE })
      .then(async (list) => {
        if (!alive) return;
        setRows(list);
        const [people, packs] = await Promise.all([
          loadPeopleNames(list.map((m) => m.created_by)),
          listMovementPackages(list.map((m) => m.id)).catch(() => ({})),
        ]);
        if (!alive) return;
        setNames(people);
        setPackages(packs);
      })
      .catch((e) => {
        if (!alive) return;
        setRows([]);
        setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [organizationId, location.id]);

  if (rows === null) return <p className="isu-muted">Loading activity…</p>;

  return (
    <section className="isu-stack">
      <ErrorNote message={error} />
      {!rows.length && !error ? (
        <div className="isu-card isu-empty">
          <h2>No activity yet</h2>
          <p className="isu-muted">Approved counts, adjustments, and transfers at {location.name} will appear here.</p>
        </div>
      ) : null}
      <ul className="isu-count-report">
        {rows.map((m) => {
          const sign = quantitySign(m.quantity_text);
          const pack = packages[m.id];
          return (
            <li key={m.id} className="isu-card isu-stock-move">
              <div className="isu-count-report-head">
                <div>
                  <strong>{m.item_name}</strong>
                  <p className="isu-muted isu-small">
                    {MOVEMENT_LABELS[m.movement_type] || m.movement_type} {'\u00b7'} {slotLabel(locations, m.location_id, m.storage_area_id)}
                  </p>
                </div>
                <span className={`isu-count-total isu-stock-delta${sign < 0 ? ' is-out' : ' is-in'}`}>
                  {m.movement_type === 'opening_balance' ? displayQuantity(m.quantity_text) : displaySigned(m.quantity_text)} {m.unit_symbol || m.unit_name}
                </span>
              </div>
              <p className="isu-muted isu-small">
                {formatWhen(m.posted_at)} by {names[m.created_by] || 'a member'} {'\u00b7'} After: {displayQuantity(m.balance_after_text)} {m.unit_symbol || m.unit_name}
              </p>
              {m.effective_at !== m.posted_at && m.source_type === 'count_session' ? (
                <p className="isu-muted isu-small">As of the count, {formatWhen(m.effective_at)}</p>
              ) : null}
              {pack ? (
                <p className="isu-muted isu-small">
                  Entered as {displayQuantity(pack.package_quantity_text)} {'\u00d7'} {pack.package_name} {'\u00b7'} 1 {pack.package_name} = {displayQuantity(pack.base_per_package_text)} {m.unit_symbol || m.unit_name}
                </p>
              ) : null}
              {m.reason ? <p className="isu-small">{m.reason}</p> : null}
              {m.source_type === 'count_session' ? (
                <Link to={`${ITEMSURE_PATH}/counts/${m.source_id}`} className="isu-link isu-small">View count</Link>
              ) : null}
            </li>
          );
        })}
      </ul>
      {rows.length === PAGE ? <p className="isu-muted isu-small isu-center">Showing the latest {PAGE} entries.</p> : null}
    </section>
  );
}
