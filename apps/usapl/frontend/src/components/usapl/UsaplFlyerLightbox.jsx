import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function UsaplFlyerLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="usapl-info-overlay usapl-flyer-lightbox" role="presentation" onClick={onClose}>
      <div className="usapl-flyer-lightbox-frame" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="usapl-flyer-lightbox-close" onClick={onClose} aria-label="Close flyer">
          ×
        </button>
        <img src={src} alt={alt} />
      </div>
    </div>,
    document.body
  );
}
