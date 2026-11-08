import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryLabel } from '../../data/consignmentConstants.js';
import { loadGearProductsAdmin } from '../../services/consignmentGearAdminService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { priceRange, productStock } from '../../utils/consignmentGearMath.js';
import { gearProductPath } from './ConsignmentGearCard.jsx';
import ConsignmentGearProductModal from './ConsignmentGearProductModal.jsx';

const STATUS_LABELS = { draft: 'Draft', active: 'In the shop', archived: 'Archived' };

/** Admin: the new-gear catalog. editing = product being edited, or 'new'. */
export default function ConsignmentGearProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProducts(await loadGearProductsAdmin());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="cs-gear-products-title">
      <h3 id="cs-gear-products-title">Products</h3>
      <p className="cs-hint">
        Save as Draft while you set it up, then switch to Active to show it in the shop. Stock goes down when someone
        reserves and back up if they cancel or don’t pick up.
      </p>
      <div className="cs-actions">
        <button type="button" className="cs-btn" onClick={() => setEditing('new')}>+ Add product</button>
      </div>
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
      {loading && !products.length ? <p className="cs-meta">Loading…</p> : null}
      {!loading && !error && !products.length ? <p className="cs-meta">No products yet.</p> : null}
      <div className="cs-gear-products">
        {products.map((p) => {
          const { min, max } = priceRange(p);
          const variants = (p.variants || []).length;
          return (
            <div key={p.id} className="cs-gear-product-row">
              {p.photo_urls?.[0]
                ? <img src={p.photo_urls[0]} alt="" loading="lazy" />
                : <div className="cs-gear-order-photo" aria-hidden="true">🎱</div>}
              <div>
                <h3>{p.name}</h3>
                <p>
                  {STATUS_LABELS[p.status] || p.status} · {p.brand ? `${p.brand} · ` : ''}{categoryLabel(p.category)} ·{' '}
                  {min === max ? formatDollars(min) : `${formatDollars(min)}–${formatDollars(max)}`} ·{' '}
                  {productStock(p)} in stock{variants > 1 ? ` across ${variants} options` : ''}
                  {p.featured ? ' · Featured' : ''}
                </p>
              </div>
              <div className="cs-actions">
                <Link className="cs-btn-secondary" to={gearProductPath(p.slug)}>View</Link>
                <button type="button" className="cs-btn" onClick={() => setEditing(p)}>Edit</button>
              </div>
            </div>
          );
        })}
      </div>
      {editing ? (
        <ConsignmentGearProductModal
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          onClose={(saved) => { setEditing(null); if (saved) load(); }}
        />
      ) : null}
    </section>
  );
}
