import React from 'react';
import { usaplDivisionIsInHouse, usaplDivisionIsTravel } from '../../data/usaplDivisions.js';

export default function UsaplInHouseTag({ division }) {
  if (usaplDivisionIsInHouse(division)) {
    return <span className="usapl-in-house-tag">In house</span>;
  }
  if (usaplDivisionIsTravel(division)) {
    return <span className="usapl-travel-tag">Travel</span>;
  }
  return null;
}
