import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { listSupplierItems } from '../../services/itemsureSupplierService.js';
import { ErrorNote } from './ItemsureUi.jsx';

const SEARCH_FROM = 9;

/** The items bought from one supplier, each with Edit (back to Suppliers after). */
export default function ItemsureSupplierItems({ organizationId, supplier, canManageItems }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let live = true;
    listSupplierItems(organizationId, supplier.id)
      .then((rows) => live && setItems(rows))
      .catch((e) => live && (setError(e.message), setItems([])));
    return () => {
      live = false;
    };
  }, [organizationId, supplier.id]);

  const needle = query.trim().toLowerCase();
  const shown = (items || []).filter((i) => !needle || i.name.toLowerCase().includes(needle));
  const addItem = () => navigate(`${ITEMSURE_PATH}/items/new?supplier=${supplier.id}&from=suppliers`);

  return (
    <div className="isu-stack">
      <ErrorNote message={error} />
      {items === null ? <p className="isu-muted">Loading…</p> : null}
      {items && items.length === 0 ? <p className="isu-muted">No items have {supplier.name} as their supplier yet.</p> : null}
      {items && items.length >= SEARCH_FROM ? (
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an item" aria-label="Find an item" />
      ) : null}
      {items && items.length > 0 ? (
        <ul className="isu-supplier-items">
          {shown.map((i) => (
            <li key={i.id} className={i.is_active ? '' : 'is-archived'}>
              <Link to={`${ITEMSURE_PATH}/items/${i.id}`}>{i.name}</Link>
              {!i.is_active ? <span className="isu-badge">Archived</span> : null}
              {canManageItems ? (
                <button
                  type="button"
                  className="isu-btn isu-btn--ghost isu-btn--sm"
                  onClick={() => navigate(`${ITEMSURE_PATH}/items/${i.id}/edit?from=suppliers`)}
                  aria-label={`Edit ${i.name}`}
                >
                  Edit
                </button>
              ) : null}
            </li>
          ))}
          {!shown.length ? <li className="isu-muted">Nothing matches &quot;{query.trim()}&quot;.</li> : null}
        </ul>
      ) : null}
      {canManageItems && supplier.is_active ? (
        <div className="isu-quickcount-actions">
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={addItem}>Add item from {supplier.name}</button>
        </div>
      ) : null}
    </div>
  );
}
