import React, { useEffect, useState } from 'react';
import { usaplScheduleImageUrl } from '../../data/usaplPublicReports.js';

export default function UsaplSchedulePic({ division }) {
  const src = usaplScheduleImageUrl(division);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    setOk(true);
  }, [src]);

  if (!src || !ok) return null;

  return (
    <section className="usapl-card usapl-schedule-card">
      <h2>Schedule</h2>
      <a className="usapl-schedule-pic" href={src} target="_blank" rel="noreferrer">
        <img
          src={src}
          alt={`${division.shortName || 'Division'} schedule`}
          onError={() => setOk(false)}
        />
      </a>
      <p className="usapl-meta">Tap the picture to open a larger view.</p>
    </section>
  );
}
