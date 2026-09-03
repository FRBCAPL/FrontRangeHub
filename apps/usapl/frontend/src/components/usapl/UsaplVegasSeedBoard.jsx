import React from 'react';
import { USAPL_VEGAS_CUP } from '../../data/usaplVegasCup.js';
import { useUsaplVegasSeedStats } from '../../hooks/useUsaplVegasSeedStats.js';
import UsaplVegasCupCard from './UsaplVegasCupCard.jsx';
import UsaplVegasSeedRow from './UsaplVegasSeedRow.jsx';

export default function UsaplVegasSeedBoard({ canAdmin = false }) {
  const {
    board,
    ineligible,
    pending,
    setEligible,
    busyKey,
    tableMissing,
    error,
  } = useUsaplVegasSeedStats();

  return (
    <UsaplVegasCupCard id="vegas-seeds" wide>
      <details className="usapl-facts usapl-vegas-fold">
        <summary>
          <span className="usapl-vegas-fold-title">{USAPL_VEGAS_CUP.year} Vegas Cup seeding</span>
          <span className="usapl-vegas-fold-action">
            <span className="is-show">Show Team Seeding</span>
            <span className="is-hide">Hide Seeding</span>
          </span>
        </summary>
        <div className="usapl-facts-body">
      <p><center>
        The Vegas Cup bracket is seeded by division winners.<br />
       The more divisions a team wins, the higher they seed — and the better the chance of a bye. <br />
       Teams that are no longer active are not eligible and do not take a seed.
      </center></p>
      <ol className="usapl-seed-rules">
        <li>Each first-place finish is one division win.</li>
        <li>Double Play: 8-ball 1st and 10-ball 1st are two separate wins.</li>
        <li>Most wins = seed #1. Same win count shares a seed (T-2).</li>
        <li>Inactive or DQ’d teams keep their division titles, but are not eligible for Vegas Cup.</li>
      </ol>
      {canAdmin && tableMissing ? <p className="usapl-note">{error}</p> : null}
      {canAdmin && error && !tableMissing ? <p className="usapl-note">{error}</p> : null}
      {board.length ? (
        <ol className="usapl-seed-list">
          {board.map((row) => (
            <UsaplVegasSeedRow
              key={row.key}
              row={row}
              canAdmin={canAdmin}
              busy={busyKey === row.key}
              onEligibleChange={setEligible}
            />
          ))}
        </ol>
      ) : (
        <p className="usapl-note">
          Ranked seeds fill in as eligible winners are posted. Until then, the order above is
          the rule the bracket will use.
        </p>
      )}
      {ineligible.length ? (
        <>
          <h3 className="usapl-seed-pending-title"><center>Not eligible for Vegas Cup</center></h3>
          <p className="usapl-meta"><center>These teams won a division but are no longer active.</center></p>
          <ol className="usapl-seed-list">
            {ineligible.map((row) => (
              <UsaplVegasSeedRow
                key={row.key}
                row={row}
                canAdmin={canAdmin}
                busy={busyKey === row.key}
                onEligibleChange={setEligible}
              />
            ))}
          </ol>
        </>
      ) : null}
      {pending.length ? (
        <>
          <h3 className="usapl-seed-pending-title">Division titles still to post</h3>
          <ul className="usapl-seed-pending">
            {pending.map((slot) => (
              <li key={slot.key}>{slot.label}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="usapl-meta">
       <center>All active teams that do not win a division are eligible for the Redemption Tournament.{' '}
      </center>
      </p>
        </div>
      </details>
    </UsaplVegasCupCard>
  );
}
