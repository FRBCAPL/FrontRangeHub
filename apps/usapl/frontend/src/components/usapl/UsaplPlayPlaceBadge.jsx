import React from 'react';
import { usaplDivisionIsInHouse, usaplDivisionIsTravel } from '../../data/usaplDivisions.js';
import UsaplTip from './UsaplTip.jsx';

export default function UsaplPlayPlaceBadge({ division }) {
  if (usaplDivisionIsInHouse(division)) {
    return (
      <UsaplTip className="usapl-in-house-tag" tip="Played at this location only.">
        In house
      </UsaplTip>
    );
  }
  if (usaplDivisionIsTravel(division)) {
    return (
      <UsaplTip
        className="usapl-travel-tag"
        tip="Teams can play from anywhere with 2 tables available for league play."
      >
        Travel
      </UsaplTip>
    );
  }
  return null;
}
