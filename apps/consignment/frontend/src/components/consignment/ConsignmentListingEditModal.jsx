import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CONDITIONS, itemLabel, MAX_PHOTOS } from '../../data/consignmentConstants.js';
import { uploadConsignmentPhotos } from '../../services/consignmentPhotos.js';
import { updateMyListing } from '../../services/consignmentSellerService.js';
import ConsignmentPhotoManager from './ConsignmentPhotoManager.jsx';

const TEXT_FIELDS = ['name', 'brand', 'model', 'condition', 'specs', 'description'];
const MAX_TEXT = 2000;

function initialForm(item) {
  return {
    name: item.name || '',
    brand: item.brand || '',
    model: item.model || '',
    condition: item.condition || 'good',
    specs: item.specs || '',
    description: item.description || '',
    photo_urls: Array.isArray(item.photo_urls) ? item.photo_urls : [],
  };
}

/** Only the fields the seller actually changed, so the history shows exactly what moved. */
function changedFields(form, original) {
  const changes = {};
  for (const key of TEXT_FIELDS) {
    if (form[key].trim() !== original[key].trim()) changes[key] = form[key].trim();
  }
  if (form.photo_urls.join('\n') !== original.photo_urls.join('\n')) changes.photo_urls = form.photo_urls;
  return changes;
}

/**
 * Edits an item's listing (name, brand, model, condition, specs, description, photos).
 * Sellers save through updateMyListing; admins pass `save` and `admin` (Auctions tab).
 * Price/reserve isn't here; FRPL changes those with the seller.
 */
export default function ConsignmentListingEditModal({ item, onClose, onSaved, save: saveChanges, admin = false }) {
  const [original] = useState(() => initialForm(item));
  const [form, setForm] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changes = changedFields(form, original);
  const dirty = Object.keys(changes).length > 0;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const addPhotos = async (files) => {
    const room = MAX_PHOTOS - form.photo_urls.length;
    if (!files.length) return;
    if (room <= 0) { setError(`Up to ${MAX_PHOTOS} photos.`); return; }
    setBusy(true);
    setError('');
    try {
      const urls = await uploadConsignmentPhotos(files.slice(0, room));
      setForm((prev) => ({ ...prev, photo_urls: [...prev.photo_urls, ...urls] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Give the item a name.'); return; }
    setBusy(true);
    setError('');
    try {
      if (saveChanges) await saveChanges(changes);
      else await updateMyListing(item.id, changes);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return createPortal(
    <div className="cs-portal">
      <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-listing-edit-title" onClick={busy ? undefined : onClose}>
        <form className="cs-modal-card cs-form cs-listing-edit" onSubmit={save} onClick={(e) => e.stopPropagation()}>
          <h2 id="cs-listing-edit-title">Edit {itemLabel(item)}</h2>
          <p className="cs-hint">
            {admin
              ? 'Changes show in the shop as soon as you save. Reserve, Buy It Now and fees are in the full editor on the Items tab.'
              : 'Changes show in the shop as soon as you save. Keep it accurate; FRPL can see every change. To change the price or reserve, message FRPL.'}
          </p>

          <div className="cs-field">
            <label htmlFor="cs-le-name">Item name</label>
            <input id="cs-le-name" value={form.name} onChange={set('name')} maxLength={120} required />
          </div>
          <div className="cs-row">
            <div className="cs-field">
              <label htmlFor="cs-le-brand">Brand</label>
              <input id="cs-le-brand" value={form.brand} onChange={set('brand')} maxLength={80} />
            </div>
            <div className="cs-field">
              <label htmlFor="cs-le-model">Model</label>
              <input id="cs-le-model" value={form.model} onChange={set('model')} maxLength={80} />
            </div>
          </div>
          <div className="cs-field">
            <label htmlFor="cs-le-condition">Condition</label>
            <select id="cs-le-condition" value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label htmlFor="cs-le-specs">Specifications</label>
            <textarea id="cs-le-specs" rows={3} value={form.specs} onChange={set('specs')} maxLength={MAX_TEXT} placeholder="Weight, length, wrap, tip, joint…" />
          </div>
          <div className="cs-field">
            <label htmlFor="cs-le-desc">Description</label>
            <textarea id="cs-le-desc" rows={4} value={form.description} onChange={set('description')} maxLength={MAX_TEXT} placeholder="Anything a buyer should know — wear, history, extras included." />
          </div>
          <ConsignmentPhotoManager
            photos={form.photo_urls}
            onChange={(photo_urls) => setForm((prev) => ({ ...prev, photo_urls }))}
            onRemove={() => {}}
            onAddFiles={addPhotos}
            disabled={busy}
          />
          <p className="cs-hint">The first photo is the cover in the shop. Up to {MAX_PHOTOS}.</p>

          {error ? <p className="cs-error" role="alert">{error}</p> : null}
          <div className="cs-actions">
            <button className="cs-btn" type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save changes'}</button>
            <button className="cs-btn-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
