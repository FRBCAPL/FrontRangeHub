import React from 'react';
import { money } from './showdownView.js';

const COLUMNS = [
  ['qualifyingRacks', 'Qualifying games'],
  ['qualifying', 'Qualifying wins'],
  ['playoffRacks', 'Playoff games'],
  ['playoff', 'Playoff wins'],
  ['bye', 'Bye'],
  ['championBonus', 'Champion bonus'],
];

const cell = (v) => (v ? money(v) : '\u2014');

/** V2 earnings by source. `tag` renders an optional badge after the name. */
export default function ShowdownEarningsTableV2({ players, paid, tag = null, label = 'Player earnings' }) {
  return (
    <div className="sd-table-wrap">
      <table className="sd-table sd-earnings" aria-label={label}>
        <thead>
          <tr>
            <th>Player</th>
            {COLUMNS.map(([key, text]) => <th key={key} className="sd-num">{text}</th>)}
            <th className="sd-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.playerId} className={p.withdrawn ? 'is-withdrawn' : ''}>
              <td>{p.name} {tag ? tag(p) : null}</td>
              {COLUMNS.map(([key]) => <td key={key} className="sd-num">{cell(p[key])}</td>)}
              <td className="sd-num"><strong>{money(p.total)}</strong></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={COLUMNS.length + 1}>Total paid</td><td className="sd-num">{money(paid)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}
