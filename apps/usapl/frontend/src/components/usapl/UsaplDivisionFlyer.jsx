import React, { useEffect, useState } from 'react';
import { usaplFlyerImageUrl } from '../../data/usaplPublicReports.js';
import UsaplFlyerLightbox from './UsaplFlyerLightbox.jsx';

export default function UsaplDivisionFlyer({ division, compact = false }) {
  const src = usaplFlyerImageUrl(division);
  const [ok, setOk] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOk(true);
    setOpen(false);
  }, [src]);

  if (!src || !ok) return null;

  const alt = `${division.shortName || 'Division'} flyer`;
  const img = <img src={src} alt={alt} onError={() => setOk(false)} />;

  return (
    <>
      <button
        type="button"
        className={compact ? 'usapl-night-flyer' : 'usapl-division-ad'}
        onClick={() => setOpen(true)}
      >
        {img}
      </button>
      {open ? <UsaplFlyerLightbox src={src} alt={alt} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
