import React from 'react';
import { Link } from 'react-router-dom';
import ball8 from '@shared/assets/ball8.svg';
import ball9 from '@shared/assets/nineball.svg';
import ball10 from '@shared/assets/tenball.svg';

/** Front Range Pool.com badge (same look as the hub nav) — back to the home page. */
export default function DuezyHubBadge() {
  return (
    <Link to="/" className="dz-hub-badge" aria-label="Front Range Pool.com home">
      <img src={ball8} alt="" />
      <span>Front Range</span>
      <img src={ball9} alt="" />
      <span>Pool.com</span>
      <img src={ball10} alt="" />
    </Link>
  );
}
