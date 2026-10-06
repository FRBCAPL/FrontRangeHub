import React, { useState } from 'react';

/**
 * Thumbnails with enlarge / remove / make cover. The first photo is the shop cover.
 * Removed URLs are reported via onRemove so the caller can delete files after saving.
 */
export default function ConsignmentPhotoManager({ photos, onChange, onRemove, onAddFiles, disabled }) {
  const [viewing, setViewing] = useState(null);

  const remove = (url) => {
    onChange(photos.filter((p) => p !== url));
    onRemove(url);
    if (viewing === url) setViewing(null);
  };

  const makeCover = (url) => {
    onChange([url, ...photos.filter((p) => p !== url)]);
  };

  return (
    <div className="cs-field">
      <label>Photos ({photos.length})</label>
      {photos.length ? (
        <div className="cs-photo-grid">
          {photos.map((url, i) => (
            <div key={url} className={`cs-photo-tile${i === 0 ? ' cover' : ''}`}>
              <button type="button" className="cs-photo-view" onClick={() => setViewing(url)} aria-label={`View photo ${i + 1}`}>
                <img src={url} alt="" />
              </button>
              {i === 0 ? <span className="cs-photo-tag">Cover</span> : null}
              <div className="cs-photo-actions">
                {i > 0 ? (
                  <button type="button" onClick={() => makeCover(url)} disabled={disabled}>Make cover</button>
                ) : null}
                <button type="button" className="danger" onClick={() => remove(url)} disabled={disabled} aria-label="Remove photo">✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="cs-hint">No photos uploaded.</p>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled}
        onChange={(e) => {
          onAddFiles([...(e.target.files || [])]);
          e.target.value = '';
        }}
      />
      {viewing ? (
        <div className="cs-lightbox" role="dialog" aria-label="Photo" onClick={() => setViewing(null)}>
          <img src={viewing} alt="" />
          <button type="button" className="cs-btn-secondary" onClick={() => setViewing(null)}>Close</button>
        </div>
      ) : null}
    </div>
  );
}
