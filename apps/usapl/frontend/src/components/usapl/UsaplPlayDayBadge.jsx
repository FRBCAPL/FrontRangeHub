import React from 'react';
import { usaplNightLabel } from '../../data/usaplDivisions.js';

export default function UsaplPlayDayBadge({ division }) {
  const label = division?.night ? usaplNightLabel(division.night) : '';
  if (!label) return null;
  return (
    <span className="usapl-play-day-tag usapl-signup-pill">
      {label}
    </span>
  );
}
