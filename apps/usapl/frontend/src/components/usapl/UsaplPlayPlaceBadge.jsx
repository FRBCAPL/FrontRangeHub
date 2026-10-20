import React from 'react';
import { usaplDivisionIsInHouse, usaplDivisionIsTravel } from '../../data/usaplDivisions.js';

function PlaceTip({ className, label, tip }) {
  return (
    <span className={`${className} usapl-tip-wrap`} tabIndex={0}>
      {label}
      <span className="usapl-tip" role="tooltip">{tip}</span>
    </span>
  );
}

export default function UsaplPlayPlaceBadge({ division }) {
  if (usaplDivisionIsInHouse(division)) {
    return (
      <PlaceTip
        className="usapl-in-house-tag"
        label="In house"
        tip="Played at this location only."
      />
    );
  }
  if (usaplDivisionIsTravel(division)) {
    return (
      <PlaceTip
        className="usapl-travel-tag"
        label="Travel"
        tip="Teams can play from anywhere with 2 tables available for league play."
      />
    );
  }
  return null;
}
