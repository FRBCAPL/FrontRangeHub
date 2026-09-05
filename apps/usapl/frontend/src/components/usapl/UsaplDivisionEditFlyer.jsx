import React, { useState } from 'react';
import { uploadUsaplFlyerImage } from '../../services/usaplScheduleImage.js';

export default function UsaplDivisionEditFlyer({ form, setField }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const src = String(form.flyerImageUrl || '').trim();

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadUsaplFlyerImage(form.id || form.shortName, file);
      setField('flyerImageUrl', url);
    } catch (err) {
      setError(err?.message || 'Could not upload the flyer.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="usapl-field">
      <label>Promo flyer</label>
      <p className="usapl-field-hint">Optional ad picture for this night — not the schedule.</p>
      {src ? (
        <img
          className="usapl-flyer-edit-preview"
          src={src}
          alt="Division flyer preview"
          style={{ width: 140, height: 140, maxWidth: 140, maxHeight: 140, objectFit: 'contain' }}
        />
      ) : null}
      <div className="usapl-actions" style={{ marginTop: 0 }}>
        <label className="usapl-btn-secondary" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
          {uploading ? 'Uploading…' : (src ? 'Replace flyer' : 'Upload flyer')}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            hidden
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
        {src ? (
          <button type="button" className="usapl-btn-secondary" onClick={() => setField('flyerImageUrl', '')}>
            Remove
          </button>
        ) : null}
      </div>
      {error ? <div className="usapl-error">{error}</div> : null}
    </div>
  );
}
