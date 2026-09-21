import React from 'react';
import { centsToDollars } from '../../data/usaplIncomeProjection.js';
import { usaplPlayTypeLabel } from '../../data/usaplIncomePlayType.js';

export default function UsaplAdminIncomePayoutCompare({
  compare,
  sim,
  teams,
  payingTeams,
  weeks,
  playType,
  selectedPlaces,
  onPickPlaces,
}) {
  if (!compare?.columns?.length) return null;
  const teamCount = Number(teams) || 0;
  const paying = Number(payingTeams) || teamCount;
  const bye = Math.max(0, teamCount - paying);
  const weekCount = Number(weeks) || 0;
  const places = sim?.places || [];
  return (
    <div className="usapl-payout-board">
      <p className="usapl-meta">
        {teamCount} {teamCount === 1 ? 'team' : 'teams'}
        {bye ? ` · 1 bye · ${paying} pay` : ''}
        {' · '}
        {weekCount} {weekCount === 1 ? 'week' : 'weeks'}
        {' · '}
        {usaplPlayTypeLabel(playType)}
        {String(playType || '').toLowerCase() === 'double' ? ' · each format' : ''}
        {' · '}cash pool {centsToDollars(compare.cash_pool_cents)}
      </p>
      <div className="usapl-payout-pills" role="tablist" aria-label="Places paid">
        {compare.columns.map((column) => (
          <button
            key={column.places}
            type="button"
            role="tab"
            aria-selected={Number(selectedPlaces) === column.places}
            className={`usapl-payout-pill${Number(selectedPlaces) === column.places ? ' is-selected' : ''}${
              column.suggested ? ' is-suggested' : ''
            }`}
            onClick={() => onPickPlaces(String(column.places))}
          >
            {column.places}
            {column.suggested ? <span>Best fit</span> : null}
          </button>
        ))}
      </div>
      {sim?.error ? <p className="usapl-error">{sim.error}</p> : (
        <ul className="usapl-payout-hero">
          {places.map((row) => (
            <li key={row.place}>
              <span>{row.label}</span>
              <strong>{centsToDollars(row.cents)}</strong>
            </li>
          ))}
        </ul>
      )}
      <div className="usapl-payout-matrix-wrap">
        <table className="usapl-payout-matrix">
          <caption>Every place-count option. Highlighted column is selected.</caption>
          <thead>
            <tr>
              <th scope="col">Place</th>
              {compare.columns.map((column) => (
                <th
                  key={column.places}
                  scope="col"
                  className={Number(selectedPlaces) === column.places ? 'is-selected' : ''}
                >
                  <button
                    type="button"
                    className="usapl-payout-matrix-pick"
                    onClick={() => onPickPlaces(String(column.places))}
                  >
                    {column.places}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compare.rows.map((row) => (
              <tr key={row.place}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, index) => {
                  const column = compare.columns[index];
                  return (
                    <td
                      key={column.places}
                      className={Number(selectedPlaces) === column.places ? 'is-selected' : ''}
                    >
                      {cell ? centsToDollars(cell.cents) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
