import React, { useEffect, useState } from 'react';
import { usaplScheduleImageUrl } from '../../data/usaplPublicReports.js';
import UsaplFlyerLightbox from './UsaplFlyerLightbox.jsx';

export default function UsaplSchedulePic({ division }) {
  const src = usaplScheduleImageUrl(division);
  const [ok, setOk] = useState(false);
  const [open, setOpen] = useState(false);
  const alt = `${division.shortName || 'Division'} schedule`;

  useEffect(() => {
    setOpen(false);
    if (!src) {
      setOk(false);
      return undefined;
    }
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setOk(true);
    };
    probe.onerror = () => {
      if (!cancelled) setOk(false);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || !ok) return null;

  return (
    <>
      <button type="button" className="usapl-btn-secondary" onClick={() => setOpen(true)}>
        Schedule
      </button>
      {open ? <UsaplFlyerLightbox src={src} alt={alt} wide onClose={() => setOpen(false)} /> : null}
    </>
  );
}
