import React from 'react';
import { matchesPerNight, money, weeklyDues } from '../../utils/duezyMath.js';

const OPTIONS = [
  [1, 'One match a night'],
  [2, 'Double play: 2 matches a night'],
];

/** "Matches each night" choice with a plain-language explanation and the weekly total it produces. */
export default function DuezyDoublePlayField({ league, onChange }) {
  const matches = matchesPerNight(league);
  const perMatch = weeklyDues({ ...league, matches_per_night: 1 });
  const weekly = weeklyDues(league);

  return (
    <div className="dz-field dz-double-play">
      <span><center><strong>Matches each night</strong></center></span>
      <small className="dz-small dz-muted">
        <center>Do your teams play two matches each league night? <br />
        Pick double play and Duezy tracks dues for each match.</center>
      </small>
      <div className="dz-segment" role="radiogroup" aria-label="Matches each night">
        {OPTIONS.map(([n, label]) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={matches === n}
            className={matches === n ? 'is-active' : ''}
            onClick={() => onChange({ matches_per_night: n })}
          >
            {label}
          </button>
        ))}
      </div>
      {perMatch > 0 ? (
        <p className="dz-double-play-total">
          {matches > 1 ? (
            <>
              {money(perMatch)} × {matches} matches = <strong>{money(weekly)}</strong> per team each week.
              One tap on Paid records the full {money(weekly)}.
            </>
          ) : (
            <>Each team owes <strong>{money(weekly)}</strong> a week.</>
          )}
        </p>
      ) : null}
      {matches > 1 ? (
        <ul className="dz-double-play-notes dz-small dz-muted">
          <li>Dues for both matches are collected together, so each team has one payment per week.</li>
          <li>Selecting Double Play Doesn&apos;t change your Duezy price. <br />
          It&apos;s still effectively one division in Duezy.</li>
        </ul>
      ) : null}
    </div>
  );
}
