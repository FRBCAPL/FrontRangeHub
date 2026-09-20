import React from 'react';
import { centsToDollars } from '../../data/usaplIncomeProjection.js';
import { incomeSplitRecipe } from '../../data/usaplIncomeRecipe.js';

function shareWidth(part, whole) {
  if (!whole) return '0%';
  return `${Math.max(0, (Number(part) / Number(whole)) * 100)}%`;
}

export default function UsaplAdminIncomeResult({ result }) {
  const recipe = incomeSplitRecipe(result);
  if (!recipe) return null;
  const rows = [
    { id: 'prize', label: 'Prize fund', night: recipe.prize_night_cents, season: recipe.prize_season_cents, tone: 'prize' },
    { id: 'csi', label: 'CSI', night: recipe.csi_night_cents, season: recipe.csi_season_cents, tone: 'csi' },
    { id: 'lo', label: 'League operator', night: recipe.lo_night_cents, season: recipe.lo_season_cents, tone: 'lo' },
  ];
  return (
    <section className="usapl-income-split-view">
      <h2>Split</h2>
      <p className="usapl-income-split-total">
        Dues collected
        <strong>{centsToDollars(recipe.night_dues_cents)}</strong>
        <span>tonight</span>
        <strong>{centsToDollars(recipe.season_dues_cents)}</strong>
        <span>season</span>
      </p>
      <p className="usapl-note">Prize fund + CSI + league operator always equals dues collected. Double play doubles the night.</p>
      <div className="usapl-income-split-bar" aria-hidden="true">
        {rows.filter((row) => row.night > 0).map((row) => (
          <span
            key={row.id}
            className={`usapl-income-split-seg is-${row.tone}`}
            style={{ width: shareWidth(row.night, recipe.night_dues_cents) }}
          />
        ))}
      </div>
      <table className="usapl-income-split-table">
        <thead>
          <tr>
            <th scope="col"> </th>
            <th scope="col">Tonight</th>
            <th scope="col">Season</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.label}</th>
              <td>{centsToDollars(row.night)}</td>
              <td>{centsToDollars(row.season)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{centsToDollars(recipe.night_dues_cents)}</td>
            <td>{centsToDollars(recipe.season_dues_cents)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
