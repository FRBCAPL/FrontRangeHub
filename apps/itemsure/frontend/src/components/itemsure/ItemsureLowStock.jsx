import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { listTargetStatus } from '../../services/itemsureTargetService.js';
import { onInventoryChanged } from '../../utils/itemsureChanges.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { ErrorNote, LoadFailed, PageHead } from './ItemsureUi.jsx';
import { useItemLink } from '../../hooks/useItemModal.js';

const q = (text, unit) => (text === null || text === undefined ? '—' : `${displayQuantity(text)} ${unit}`);
const items = (n) => `${n} ${n === 1 ? 'item' : 'items'}`;

/** The two lists this page shows: running low (default) or `?show=topoff`. */
const MODES = {
  low: {
    status: 'low',
    title: 'Running low',
    description: 'Items at or below their "Warn me at" number, in the places you can see.',
    badge: { label: 'Running low', className: 'isu-status--danger' },
    emptyTitle: 'Nothing is running low',
    emptyText: 'Every item with a \u201cWarn me at\u201d number is above it.',
  },
  topoff: {
    status: 'below_par',
    title: 'Need topping up',
    description: 'Items above their "Warn me at" number but under "Fill up to", in the places you can see.',
    badge: { label: 'Needs topping up', className: 'isu-status--warn' },
    emptyTitle: 'Nothing needs topping up',
    emptyText: 'Everything that isn\u2019t running low is at or above its \u201cFill up to\u201d number.',
  },
};

function byLocation(rows) {
  const groups = new Map();
  rows.forEach((r) => {
    if (!groups.has(r.location_id)) groups.set(r.location_id, { name: r.location_name, rows: [] });
    groups.get(r.location_id).rows.push(r);
  });
  return [...groups.entries()];
}

function AlertRow({ row, badge, pending }) {
  const itemLink = useItemLink();
  const levels = `${ITEMSURE_PATH}/levels?location=${row.location_id}&area=${row.storage_area_id || ''}&search=${encodeURIComponent(row.item_name)}`;
  const low = !pending && badge.className === 'isu-status--danger';
  return (
    <li className={`isu-card isu-restock-card${low ? ' is-low' : ''}`}>
      <div className="isu-restock-head">
        <div>
          <strong>{row.item_name}</strong>
          <p className="isu-muted isu-small">{row.area_name || NO_AREA_LABEL}{row.sku ? ` · ${row.sku}` : ''}</p>
        </div>
        <span className={`isu-badge ${pending ? 'isu-status--muted' : badge.className}`}>{pending ? 'No amount yet' : badge.label}</span>
      </div>
      <div className="isu-restock-figures">
        {pending ? null : <span>On hand <strong>{q(row.on_hand_text, row.unit_symbol)}</strong></span>}
        <span>Warn me at {q(row.minimum_text, row.unit_symbol)}</span>
        <span>Fill up to {q(row.par_text, row.unit_symbol)}</span>
      </div>
      <div className="isu-restock-move-actions">
        <Link className="isu-btn isu-btn--primary isu-btn--sm" {...itemLink(row.item_id)}>
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
 * Active stock alerts, from current figures so an alert disappears as soon as stock
 * recovers. Running low (at or under "Warn me at") by default; `?show=topoff` lists what
 * needs topping up instead. Places with levels but no amount yet are listed apart.
 */
export default function ItemsureLowStock() {
  const { organization } = useItemsureWorkspace();
  const [params] = useSearchParams();
  const modeKey = params.get('show') === 'topoff' ? 'topoff' : 'low';
  const mode = MODES[modeKey];
  const other = MODES[modeKey === 'low' ? 'topoff' : 'low'];
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

  const shown = useMemo(() => (rows || []).filter((r) => r.status === mode.status), [rows, mode.status]);
  const notSetUp = useMemo(() => (rows || []).filter((r) => r.status === 'not_set_up'), [rows]);
  const otherCount = (rows || []).filter((r) => r.status === other.status).length;
  const otherLink = `${ITEMSURE_PATH}/low-stock${modeKey === 'low' ? '?show=topoff' : ''}`;
  const otherNotice = otherCount ? (
    <p className="isu-notice">
      {modeKey === 'low'
        ? `${items(otherCount)} ${otherCount === 1 ? 'needs' : 'need'} topping up but ${otherCount === 1 ? 'is' : 'are'} not running low yet. `
        : `${items(otherCount)} ${otherCount === 1 ? 'is' : 'are'} running low. `}
      <Link to={otherLink}>{modeKey === 'low' ? 'See what needs topping up' : 'See what is running low'}</Link>
      {' \u00b7 '}
      <Link to={`${ITEMSURE_PATH}/restock`}>Shopping list</Link>
    </p>
  ) : null;

  return (
    <div className="isu-page">
      <PageHead title={mode.title} description={mode.description} />
      {rows ? <ErrorNote message={error} /> : null}
      {!rows && error ? <LoadFailed message={error} onRetry={load} /> : null}
      {!rows && !error ? <p className="isu-muted">Loading…</p> : null}

      {modeKey === 'topoff' && shown.length ? otherNotice : null}

      {rows && !shown.length ? (
        <div className="isu-card isu-empty">
          <h2>{mode.emptyTitle}</h2>
          <p className="isu-muted">
            {mode.emptyText}{' '}
            <Link to={`${ITEMSURE_PATH}/levels`}>Set warning levels</Link> for more items to get alerts here.
          </p>
        </div>
      ) : null}

      {byLocation(shown).map(([id, group]) => (
        <section key={id} className="isu-restock-group">
          <h2>{group.name} <span className="isu-muted isu-small">({group.rows.length})</span></h2>
          <ul className="isu-levels-list">{group.rows.map((r) => <AlertRow key={r.target_id} row={r} badge={mode.badge} />)}</ul>
        </section>
      ))}

      {otherNotice}

      {notSetUp.length ? (
        <section className="isu-restock-group">
          <h2>Levels set, but no amount yet <span className="isu-muted isu-small">({notSetUp.length})</span></h2>
          <p className="isu-muted isu-small">These have warning levels but no amount yet, so ItemSure can&apos;t tell if they&apos;re low. Set the amount to fix that.</p>
          <ul className="isu-levels-list">{notSetUp.map((r) => <AlertRow key={r.target_id} row={r} badge={mode.badge} pending />)}</ul>
        </section>
      ) : null}
    </div>
  );
}
