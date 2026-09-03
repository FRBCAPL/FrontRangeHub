import React from 'react';
import usaplNationalsLogo from '@frontend/assets/usapl_nationals_logo_color.png';
import frontRangeLogo from '@frontend/assets/logo.png';
import { USAPL_VEGAS_BANNER } from '../../data/usaplConstants.js';
import UsaplRotateBanner from './UsaplRotateBanner.jsx';
import UsaplVegasWinnerTicker from './UsaplVegasWinnerTicker.jsx';

export default function UsaplVegasCupWelcome() {
  return (
    <header className="usapl-hero-welcome usapl-vegas-hero">
      <img className="usapl-hero-corner usapl-hero-corner-left" src={frontRangeLogo} alt="" />
      <img className="usapl-hero-corner usapl-hero-corner-right" src={frontRangeLogo} alt="Front Range Pool" />
      <p className="usapl-kicker usapl-league-name">Front Range USA Pool League</p>
      <UsaplRotateBanner items={USAPL_VEGAS_BANNER} />
      <div className="usapl-vegas-welcome-row">
        <img
          className="usapl-vegas-nationals"
          src={usaplNationalsLogo}
          alt=""
        />
        <div className="usapl-vegas-welcome-mid">
          <h1 className="usapl-hero-title">Vegas Cup Division Winners</h1>
          <UsaplVegasWinnerTicker />
        </div>
        <img
          className="usapl-vegas-nationals"
          src={usaplNationalsLogo}
          alt="USAPL Nationals Las Vegas"
        />
      </div>
    </header>
  );
}
