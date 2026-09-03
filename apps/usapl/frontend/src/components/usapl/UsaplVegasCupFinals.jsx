import React from 'react';
import { Link } from 'react-router-dom';
import { USAPL_VEGAS_CUP } from '../../data/usaplVegasCup.js';
import UsaplVegasCupCard from './UsaplVegasCupCard.jsx';

export default function UsaplVegasCupFinals() {
  return (
    <>
      <UsaplVegasCupCard
        title="Vegas Cup Tournament"
        when={USAPL_VEGAS_CUP.vegasWhen}
      >
        <p>Division winners and Redemption winners play for the trip.</p>
        <ul>
          <li>Modified double elimination.<br /> 
            Default format is 8-ball on the winner's side and 10-ball on the one loss side.</li>
          <li>
            Division winners are seeded by how many divisions they won. More wins = higher seed.
          </li>
          <li>
            How many teams win a trip depends on the total number of teams in all divisions.<br /> 
            For the 2027 USAPL Nationals, FRUSAPL will be sending 2 teams.
          </li>
          <li>
            Double Play teams may enter whichever Nationals format they played during the
            session(s).
          </li>
        </ul>
        <p className="usapl-vegas-win">Winning team(s) go to Vegas!</p>
      </UsaplVegasCupCard>

      <UsaplVegasCupCard title="Everyone can still play Nationals">
        <p>
          All players and teams are eligible for USAPL Nationals, regardless of Vegas Cup results.
          You do not have to win a trip to play.
        </p>
        <p className="usapl-vegas-close">
          Sign up. Hit the tables. Win your way to becoming USA Pool League National Champions.
        </p>
        <div className="usapl-actions usapl-vegas-actions">
          <Link className="usapl-btn" to="/usapl/signup">Sign up</Link>
          <Link className="usapl-btn-secondary" to="/usapl/divisions">Divisions</Link>
        </div>
      </UsaplVegasCupCard>
    </>
  );
}
