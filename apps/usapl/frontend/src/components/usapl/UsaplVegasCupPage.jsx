import React from 'react';
import UsaplVegasCupWelcome from './UsaplVegasCupWelcome.jsx';
import UsaplVegasCupJourney from './UsaplVegasCupJourney.jsx';
import UsaplVegasCupRedemption from './UsaplVegasCupRedemption.jsx';
import UsaplVegasCupFinals from './UsaplVegasCupFinals.jsx';

export default function UsaplVegasCupPage() {
  return (
    <div className="usapl-page usapl-home usapl-vegas-page">
      <UsaplVegasCupWelcome />
      <div className="usapl-vegas-cards">
        <UsaplVegasCupJourney />
        <UsaplVegasCupRedemption />
        <UsaplVegasCupFinals />
      </div>
    </div>
  );
}
