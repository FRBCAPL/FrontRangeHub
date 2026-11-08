import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, MAX_PHOTOS } from '../../data/consignmentConstants.js';
import { deleteConsignmentPhotos, uploadConsignmentPhotos } from '../../services/consignmentPhotos.js';
import { saveGearProduct } from '../../services/consignmentGearAdminService.js';
import {
  fromEditorRows, gearFormError, pretaxGearPrices, toEditorRows, toTaxIncludedEditor,
} from '../../utils/consignmentGearForm.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { pretaxFromTotal } from '../../utils/consignmentTax.js';
import useTaxRate from '../../hooks/useTaxRate.js';
import ConsignmentModal from './ConsignmentModal.jsx';
import ConsignmentPhotoManager from './ConsignmentPhotoManager.jsx';
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
    price_tax_included: !!p?.price_tax_included,
  };
}

/** Add / edit a new-gear product: details, photos, options with stock. product = null for a new one. */
export default function ConsignmentGearProductModal({ product, onClose }) {
  const rate = useTaxRate();
  const [start] = useState(() => {
    const base = { form: initialForm(product), rows: toEditorRows(product) };
    return product?.price_tax_included ? toTaxIncludedEditor(base.form, base.rows, rate) : base;
  });
  const [form, setForm] = useState(start.form);
  const [photos, setPhotos] = useState(product?.photo_urls || []);
  const [optionNames, setOptionNames] = useState(product?.option_names || []);
  const [rows, setRows] = useState(start.rows);
  const [removedIds, setRemovedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const uploadedRef = useRef([]);
  const originalPhotos = product?.photo_urls || [];

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onOptions = (names, nextRows, removedId = null) => {
    setOptionNames(names);
    setRows(nextRows);
    if (removedId) setRemovedIds((ids) => [...ids, removedId]);
  };

  const cancel = () => {
    deleteConsignmentPhotos(uploadedRef.current.filter((u) => !originalPhotos.includes(u))).catch(() => {});
    onClose(false);
  };

  async function addPhotos(files) {
    const room = MAX_PHOTOS - photos.length;
    if (!files.length) return;
    if (room <= 0) { setError(`Up to ${MAX_PHOTOS} photos.`); return; }
    setBusy(true);
    setError('');
    try {
      const urls = await uploadConsignmentPhotos(files.slice(0, room));
      uploadedRef.current.push(...urls);
      setPhotos((p) => [...p, ...urls].slice(0, MAX_PHOTOS));
    } catch (err) {
      setError(err.message);
    } finally {
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
      const typed = { price: Number(form.price), variants: fromEditorRows(optionNames, rows) };
      const prices = form.price_tax_included ? pretaxGearPrices(typed.price, typed.variants, rate) : typed;
      await saveGearProduct({
        id: product?.id,
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        category: form.category,
        description: form.description.trim() || null,
        photo_urls: photos,
        price: prices.price,
        msrp: form.msrp.trim() ? Number(form.msrp) : null,
        option_names: optionNames.map((n) => n.trim()),
        special_order: form.special_order,
        lead_time: form.lead_time.trim() || null,
        status: form.status,
        featured: form.featured,
        ...(form.price_tax_included !== !!product?.price_tax_included ? { price_tax_included: form.price_tax_included } : {}),
      }, prices.variants, removedIds);
      const unused = [...originalPhotos, ...uploadedRef.current].filter((u) => !photos.includes(u));
      deleteConsignmentPhotos(unused).catch(() => {});
      onClose(true);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return createPortal(
    <div className="cs-portal">
      <ConsignmentModal titleId="cs-gear-product-title" onClose={cancel} busy={busy}>
        <form className="cs-modal-card cs-form cs-gear-product-form" onSubmit={save} noValidate>
          <h2 id="cs-gear-product-title">{product ? `Edit ${product.name}` : 'Add new gear'}</h2>
          <p className="cs-hint">Save as Draft while you set it up. Switch Status to Active when it’s ready for the shop.</p>

          <div className="cs-field">
            <label htmlFor="cs-gear-name">Product name</label>
            <input id="cs-gear-name" value={form.name} maxLength={120} onChange={set('name')} placeholder="e.g. Sneaky Pete 2-piece" required />
          </div>
          <div className="cs-row">
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
          </div>
          <div className="cs-row">
            <div className="cs-field">
              <label htmlFor="cs-gear-price">Price ($, {form.price_tax_included ? 'tax included' : 'before tax'})</label>
              <input id="cs-gear-price" type="number" inputMode="decimal" step="0.01" min="0" value={form.price} onChange={set('price')} required />
            </div>
            <div className="cs-field">
              <label htmlFor="cs-gear-msrp">List price / MSRP (optional)</label>
              <input id="cs-gear-msrp" type="number" inputMode="decimal" step="0.01" min="0" value={form.msrp} onChange={set('msrp')}               placeholder="Shown crossed out" />
            </div>
          </div>
          <label className="cs-check">
            <input type="checkbox" checked={form.price_tax_included} onChange={set('price_tax_included')} />
            Prices include sales tax (buyers see “tax included”; option prices below too)
          </label>
          {form.price_tax_included && Number(form.price) > 0 ? (
            <p className="cs-hint">Saved as {formatDollars(pretaxFromTotal(form.price, rate))} before tax.</p>
          ) : null}
          <div className="cs-row">
            <div className="cs-field">
              <label htmlFor="cs-gear-status">Status</label>
              <select id="cs-gear-status" value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <label className="cs-check cs-gear-check-cell">
              <input type="checkbox" checked={form.featured} onChange={set('featured')} /> Featured (shows first)
            </label>
          </div>
          <div className="cs-field">
            <label htmlFor="cs-gear-desc">Description</label>
            <textarea id="cs-gear-desc" rows={4} maxLength={4000} value={form.description} onChange={set('description')}
              placeholder="Specs, what’s included, warranty…" />
          </div>

          <ConsignmentPhotoManager photos={photos} onChange={setPhotos} onRemove={() => {}} onAddFiles={addPhotos} disabled={busy} />
          <p className="cs-hint">The first photo is the shop picture. Up to {MAX_PHOTOS}.</p>

          <ConsignmentGearVariantsEditor optionNames={optionNames} rows={rows} basePrice={form.price} onChange={onOptions} disabled={busy} />

          <div className="cs-row">
            <label className="cs-check cs-gear-check-cell">
              <input type="checkbox" checked={form.special_order} onChange={set('special_order')} /> Can be special ordered when out of stock
            </label>
            {form.special_order ? (
              <div className="cs-field">
                <label htmlFor="cs-gear-lead">Usual wait for a special order</label>
                <input id="cs-gear-lead" value={form.lead_time} maxLength={60} placeholder="e.g. 1–2 weeks" onChange={set('lead_time')} />
              </div>
            ) : null}
          </div>

          {error ? <p className="cs-error" role="alert">{error}</p> : null}
          <div className="cs-actions">
            <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
            <button className="cs-btn-secondary" type="button" onClick={cancel} disabled={busy}>Cancel</button>
          </div>
        </form>
      </ConsignmentModal>
    </div>,
    document.body,
  );
}
