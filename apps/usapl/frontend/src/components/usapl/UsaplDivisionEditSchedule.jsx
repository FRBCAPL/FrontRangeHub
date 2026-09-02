import React, { useState } from 'react';
import { uploadUsaplScheduleImage } from '../../services/usaplScheduleImage.js';

export default function UsaplDivisionEditSchedule({ form, setField }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const src = String(form.scheduleImageUrl || '').trim();

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadUsaplScheduleImage(form.id || form.shortName, file);
      setField('scheduleImageUrl', url);
    } catch (err) {
      setError(err?.message || 'Could not upload the schedule picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="usapl-field">
      <label>Division schedule picture</label>
      <p className="usapl-field-hint">JPG of this night’s schedule. It replaces the year-wide photo on the division page.</p>
      {src ? (
        <img className="usapl-schedule-edit-preview" src={src} alt="Division schedule preview" />
      ) : null}
      <div className="usapl-actions" style={{ marginTop: 0 }}>
        <label className="usapl-btn-secondary" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
          {uploading ? 'Uploading…' : (src ? 'Replace picture' : 'Upload JPG')}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            hidden
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
        {src ? (
          <button type="button" className="usapl-btn-secondary" onClick={() => setField('scheduleImageUrl', '')}>
            Remove
          </button>
        ) : null}
      </div>
      {error ? <div className="usapl-error">{error}</div> : null}
    </div>
  );
}
