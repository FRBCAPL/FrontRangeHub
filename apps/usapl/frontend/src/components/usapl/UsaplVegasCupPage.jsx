import React from 'react';
import UsaplVegasCupWelcome from './UsaplVegasCupWelcome.jsx';
import UsaplVegasSeedBoard from './UsaplVegasSeedBoard.jsx';
import UsaplVegasCupJourney from './UsaplVegasCupJourney.jsx';
import UsaplVegasCupRedemption from './UsaplVegasCupRedemption.jsx';
import UsaplVegasCupFinals from './UsaplVegasCupFinals.jsx';

export default function UsaplVegasCupPage({ canAdmin = false }) {
  return (
    <div className="usapl-page usapl-home usapl-vegas-page">
      <UsaplVegasCupWelcome />
      <div className="usapl-vegas-cards">
        <UsaplVegasSeedBoard canAdmin={canAdmin} />
        <UsaplVegasCupJourney />
        <UsaplVegasCupRedemption />
        <UsaplVegasCupFinals />
      </div>
    </div>
  );
}
