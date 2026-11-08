import React, { useEffect, useState } from 'react';
import ConsignmentPhotoZoom from './ConsignmentPhotoZoom.jsx';

/** Main photo (tap to zoom) with a scrolling thumbnail row. Used by the item and new-gear product pages. */
export default function ConsignmentGallery({ photos = [], alt }) {
  const [photo, setPhoto] = useState(0);
  const [zooming, setZooming] = useState(false);
  const key = photos.join('|');
  useEffect(() => setPhoto(0), [key]);
  const current = photos[photo] || photos[0];

  return (
    <div className="cs-hero cs-gallery">
      {current ? (
        <button type="button" className="cs-hero-zoom" onClick={() => setZooming(true)} aria-label="Open photo to zoom">
          <img src={current} alt={alt} />
          <span className="cs-hero-zoom-hint" aria-hidden="true">Tap to zoom</span>
        </button>
      ) : <div className="cs-ph">🎱</div>}
      {photos.length > 1 ? (
        <div className="cs-thumbs">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              className={i === photo ? 'active' : ''}
              onClick={() => setPhoto(i)}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-pressed={i === photo}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {zooming && photos.length ? (
        <ConsignmentPhotoZoom photos={photos} start={Math.min(photo, photos.length - 1)} alt={alt} onClose={() => setZooming(false)} />
      ) : null}
    </div>
  );
}
