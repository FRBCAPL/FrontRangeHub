import React, { useState } from 'react';
import { CATEGORIES, MAX_PHOTOS } from '../../data/consignmentConstants.js';
import { uploadConsignmentPhotos } from '../../services/consignmentPhotos.js';
import { saveGearProduct } from '../../services/consignmentGearAdminService.js';
import { fromEditorRows, gearFormError, toEditorRows } from '../../utils/consignmentGearForm.js';
import ConsignmentModal from './ConsignmentModal.jsx';
import ConsignmentGearVariantsEditor from './ConsignmentGearVariantsEditor.jsx';

const STATUS_OPTIONS = [
  { id: 'draft', label: 'Draft (hidden)' },
  { id: 'active', label: 'Active (in the shop)' },
  { id: 'archived', label: 'Archived (hidden)' },
];

function initialForm(p) {
  return {
    name: p?.name || '',
    brand: p?.brand || '',
    category: p?.category || 'cues',
    description: p?.description || '',
    price: p?.price == null ? '' : String(p.price),
    msrp: p?.msrp == null ? '' : String(p.msrp),
    special_order: p ? p.special_order !== false : true,
    lead_time: p?.lead_time || '',
    status: p?.status || 'draft',
    featured: !!p?.featured,
  };
}

/** Add / edit a new-gear product: details, photos, options with stock. product = null for a new one. */
export default function ConsignmentGearProductModal({ product, onClose }) {
  const [form, setForm] = useState(() => initialForm(product));
  const [photos, setPhotos] = useState(product?.photo_urls || []);
  const [optionNames, setOptionNames] = useState(product?.option_names || []);
  const [rows, setRows] = useState(() => toEditorRows(product));
  const [removedIds, setRemovedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onOptions = (names, nextRows, removedId = null) => {
    setOptionNames(names);
    setRows(nextRows);
    if (removedId) setRemovedIds((ids) => [...ids, removedId]);
  };

  async function addPhotos(e) {
    const files = [...(e.target.files || [])].slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setError('');
    try {
      const urls = await uploadConsignmentPhotos(files, (i, n) => setProgress(i < n ? `Uploading photo ${i + 1} of ${n}…` : ''));
      setPhotos((p) => [...p, ...urls].slice(0, MAX_PHOTOS));
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress('');
      setBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    const problem = gearFormError(form, optionNames, rows);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError('');
    try {
      await saveGearProduct({
        id: product?.id,
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        category: form.category,
        description: form.description.trim() || null,
        photo_urls: photos,
        price: Number(form.price),
        msrp: form.msrp.trim() ? Number(form.msrp) : null,
        option_names: optionNames.map((n) => n.trim()),
        special_order: form.special_order,
        lead_time: form.lead_time.trim() || null,
        status: form.status,
        featured: form.featured,
      }, fromEditorRows(optionNames, rows), removedIds);
      onClose(true);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <ConsignmentModal titleId="cs-gear-product-title" onClose={() => onClose(false)} busy={busy}>
      <form className="cs-modal-card cs-form cs-gear-product-form" onSubmit={save} noValidate>
        <h2 id="cs-gear-product-title">{product ? 'Edit product' : 'Add new gear'}</h2>
        <div className="cs-gear-grid2">
          <div className="cs-field">
            <label htmlFor="cs-gear-name">Name</label>
            <input id="cs-gear-name" value={form.name} maxLength={120} onChange={set('name')} required />
          </div>
          <div className="cs-field">
            <label htmlFor="cs-gear-brand">Brand</label>
            <input id="cs-gear-brand" value={form.brand} maxLength={80} onChange={set('brand')} />
          </div>
          <div className="cs-field">
            <label htmlFor="cs-gear-category">Category</label>
            <select id="cs-gear-category" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label htmlFor="cs-gear-status">Status</label>
            <select id="cs-gear-status" value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label htmlFor="cs-gear-price">Price ($, before tax)</label>
            <input id="cs-gear-price" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required />
          </div>
          <div className="cs-field">
            <label htmlFor="cs-gear-msrp">MSRP (optional, shown crossed out)</label>
            <input id="cs-gear-msrp" type="number" step="0.01" min="0" value={form.msrp} onChange={set('msrp')} />
          </div>
        </div>
        <div className="cs-field">
          <label htmlFor="cs-gear-desc">Description</label>
          <textarea id="cs-gear-desc" rows={4} maxLength={4000} value={form.description} onChange={set('description')} />
        </div>
        <div className="cs-field">
          <span>Photos ({photos.length}/{MAX_PHOTOS})</span>
          <div className="cs-gear-photos">
            {photos.map((src, i) => (
              <figure key={src}>
                <img src={src} alt={`Photo ${i + 1}`} />
                <button type="button" className="cs-btn-secondary" aria-label={`Remove photo ${i + 1}`} disabled={busy}
                  onClick={() => setPhotos((p) => p.filter((u) => u !== src))}>✕</button>
              </figure>
            ))}
          </div>
          {photos.length < MAX_PHOTOS ? (
            <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={busy} aria-label="Add photos" />
          ) : null}
          {progress ? <p className="cs-meta">{progress}</p> : null}
          <p className="cs-hint">The first photo is the shop picture.</p>
        </div>
        <ConsignmentGearVariantsEditor optionNames={optionNames} rows={rows} basePrice={form.price} onChange={onOptions} disabled={busy} />
        <div className="cs-gear-checks">
          <label className="cs-check">
            <input type="checkbox" checked={form.special_order} onChange={set('special_order')} /> Can be special ordered when out of stock
          </label>
          {form.special_order ? (
            <div className="cs-field">
              <label htmlFor="cs-gear-lead">Special-order lead time</label>
              <input id="cs-gear-lead" value={form.lead_time} maxLength={60} placeholder="e.g. 1–2 weeks" onChange={set('lead_time')} />
            </div>
          ) : null}
          <label className="cs-check">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} /> Featured (shows first)
          </label>
        </div>
        {error ? <p className="cs-error" role="alert">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)} disabled={busy}>Cancel</button>
        </div>
      </form>
    </ConsignmentModal>
  );
}
