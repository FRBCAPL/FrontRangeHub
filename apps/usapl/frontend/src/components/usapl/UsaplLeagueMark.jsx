import React from 'react';
import frontRangeLogo from '@frontend/assets/logo.png';

export default function UsaplLeagueMark() {
  return (
    <div className="usapl-league-mark">
      <img className="usapl-hero-corner usapl-hero-corner-left" src={frontRangeLogo} alt="" />
      <img className="usapl-hero-corner usapl-hero-corner-right" src={frontRangeLogo} alt="Front Range Pool" />
      <p className="usapl-kicker usapl-league-name">Front Range USA Pool League</p>
    </div>
  );
}
