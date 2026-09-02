import React from 'react';
import { usaplDivisionIsInHouse } from '../../data/usaplDivisions.js';

export default function UsaplInHouseTag({ division }) {
  if (!usaplDivisionIsInHouse(division)) return null;
  return <span className="usapl-in-house-tag">In house</span>;
}
