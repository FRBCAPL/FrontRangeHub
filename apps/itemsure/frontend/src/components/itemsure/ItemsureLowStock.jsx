import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { listTargetStatus } from '../../services/itemsureTargetService.js';
import { onInventoryChanged } from '../../utils/itemsureChanges.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { ErrorNote, LoadFailed, PageHead } from './ItemsureUi.jsx';

const q = (text, unit) => (text === null || text === undefined ? '—' : `${displayQuantity(text)} ${unit}`);

function byLocation(rows) {
  const groups = new Map();
  rows.forEach((r) => {
    if (!groups.has(r.location_id)) groups.set(r.location_id, { name: r.location_name, rows: [] });
    groups.get(r.location_id).rows.push(r);
  });
  return [...groups.entries()];
}

function AlertRow({ row, pending }) {
  const levels = `${ITEMSURE_PATH}/levels?location=${row.location_id}&area=${row.storage_area_id || ''}&search=${encodeURIComponent(row.item_name)}`;
  return (
    <li className={`isu-card isu-restock-card${pending ? '' : ' is-low'}`}>
      <div className="isu-restock-head">
        <div>
          <strong>{row.item_name}</strong>
          <p className="isu-muted isu-small">{row.area_name || NO_AREA_LABEL}{row.sku ? ` · ${row.sku}` : ''}</p>
        </div>
        <span className={`isu-badge ${pending ? 'isu-status--muted' : 'isu-status--danger'}`}>{pending ? 'No amount yet' : 'Running low'}</span>
      </div>
      <div className="isu-restock-figures">
        {pending ? null : <span>On hand <strong>{q(row.on_hand_text, row.unit_symbol)}</strong></span>}
        <span>Warn me at {q(row.minimum_text, row.unit_symbol)}</span>
        <span>Fill up to {q(row.par_text, row.unit_symbol)}</span>
      </div>
      <div className="isu-restock-move-actions">
        <Link className="isu-btn isu-btn--primary isu-btn--sm" to={`${ITEMSURE_PATH}/items/${row.item_id}`}>
          {pending ? 'Set amount' : 'Open item'}
        </Link>
        {pending ? null : (
          <Link className="isu-btn isu-btn--ghost isu-btn--sm" to={`${ITEMSURE_PATH}/restock`}>Shopping list</Link>
        )}
        <Link className="isu-btn isu-btn--ghost isu-btn--sm" to={levels}>Levels</Link>
      </div>
    </li>
  );
}

/**
 * Active low-stock alerts: established stock at or under its minimum. Computed
 * from current figures, so an alert disappears as soon as stock is back above
 * the minimum. Places with levels but no established stock are listed apart.
 */
export default function ItemsureLowStock() {
  const { organization } = useItemsureWorkspace();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setRows(await listTargetStatus(organization.id, ['low', 'below_par', 'not_set_up']));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [organization.id]);

  useEffect(() => {
    load();
    return onInventoryChanged(load);
  }, [load]);

  const low = useMemo(() => (rows || []).filter((r) => r.status === 'low'), [rows]);
  const notSetUp = useMemo(() => (rows || []).filter((r) => r.status === 'not_set_up'), [rows]);
  const belowPar = (rows || []).filter((r) => r.status === 'below_par').length;

  return (
    <div className="isu-page">
      <PageHead title="Running low" description="Items at or below their &quot;Warn me at&quot; number, in the places you can see." />
      {rows ? <ErrorNote message={error} /> : null}
      {!rows && error ? <LoadFailed message={error} onRetry={load} /> : null}
      {!rows && !error ? <p className="isu-muted">Loading…</p> : null}

      {rows && !low.length ? (
        <div className="isu-card isu-empty">
          <h2>Nothing is running low</h2>
          <p className="isu-muted">
            Every item with a &ldquo;Warn me at&rdquo; number is above it.{' '}
            <Link to={`${ITEMSURE_PATH}/levels`}>Set warning levels</Link> for more items to get alerts here.
          </p>
        </div>
      ) : null}

      {byLocation(low).map(([id, group]) => (
        <section key={id} className="isu-restock-group">
          <h2>{group.name} <span className="isu-muted isu-small">({group.rows.length})</span></h2>
          <ul className="isu-levels-list">{group.rows.map((r) => <AlertRow key={r.target_id} row={r} />)}</ul>
        </section>
      ))}

      {belowPar ? (
        <p className="isu-notice">
          {belowPar} more {belowPar === 1 ? 'item needs' : 'items need'} topping up but {belowPar === 1 ? 'is not' : 'are not'} running low yet.{' '}
          <Link to={`${ITEMSURE_PATH}/restock`}>See the shopping list</Link>
        </p>
      ) : null}

      {notSetUp.length ? (
        <section className="isu-restock-group">
          <h2>Levels set, but no amount yet <span className="isu-muted isu-small">({notSetUp.length})</span></h2>
          <p className="isu-muted isu-small">These have warning levels but no amount yet, so ItemSure can&apos;t tell if they&apos;re low. Set the amount to fix that.</p>
          <ul className="isu-levels-list">{notSetUp.map((r) => <AlertRow key={r.target_id} row={r} pending />)}</ul>
        </section>
      ) : null}
    </div>
  );
}
