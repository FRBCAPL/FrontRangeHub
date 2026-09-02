import React from 'react';
import { Link } from 'react-router-dom';
import UsaplVegasCupCard from './UsaplVegasCupCard.jsx';

export default function UsaplVegasCupJourney() {
  return (
    <>
      <UsaplVegasCupCard wide shout>
        <p>Every team has a chance to win a trip to Vegas</p>
        <p className="usapl-vegas-shout-sub">
          Compete for a seeded spot in the Vegas Cup Tournament<br />
          Win a trip to the USAPL National Championships
          at the CSI expo in Las Vegas.
        </p>
      </UsaplVegasCupCard>

      <UsaplVegasCupCard title="Weekly play">
        <p>The journey to Las Vegas starts in your division.</p>
        <ul>
          <li>Division winners earn a seeded spot in the Vegas Cup Tournament.</li>
          <li>Double Play divisions send the 1st-place team from each format.</li>
          <li>Win more than one division and you get a higher seed which may result in a possible bye(s) in the Vegas Cup Tournament.</li>
          <li>
            Standings are available in the FargoRate app and on the{' '}
            <Link to="/usapl/divisions">division stats page</Link>. See{' '}
            <Link to="/usapl/past-divisions">past division winners</Link>.
          </li>
        </ul>
        <p className="usapl-note">
          All players need 8 weeks played in a single session to qualify for Redemption, Vegas Cup,
          and USAPL Nationals.
        </p>
      </UsaplVegasCupCard>
    </>
  );
}
