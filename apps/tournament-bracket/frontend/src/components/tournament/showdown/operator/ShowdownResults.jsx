import React from 'react';
import { money } from './showdownView.js';

/** Final placements with earnings, plus the completion check. */
export default function ShowdownResults({ rows, status, finalDone, championship, reconciled, reconciliationMessage, onComplete }) {
  const unresolved = championship?.status === 'unresolved';
  return (
    <section className="sd-panel" aria-label="Final results">
      <div className="sd-panel-head">
        <h3>{status === 'completed' ? 'Final results' : 'Results so far'}</h3>
      </div>
      {status === 'playoffs' ? (
        <div className="sd-complete-box">
          {unresolved ? <p className="sd-error" role="alert">Championship unresolved: {championship.reason} The event cannot be completed until an earlier result is corrected.</p> : null}
          {!finalDone && !unresolved ? <p className="sd-note">The event can be completed once the championship match is recorded.</p> : null}
          {finalDone && !reconciled ? <p className="sd-error">Payouts do not reconcile: {reconciliationMessage}</p> : null}
          {finalDone && reconciled ? <p className="sd-ok">Championship decided and every dollar reconciles.</p> : null}
          <button type="button" className="sd-btn sd-btn-primary" disabled={!finalDone || !reconciled} onClick={onComplete}>Complete event</button>
        </div>
      ) : null}
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead>
            <tr><th>Place</th><th>Player</th><th>Finish</th><th className="sd-num">Earnings</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.playerId} className={r.place === 1 ? 'is-champion' : ''}>
                <td>{r.placeLabel || '\u2014'}</td>
                <td>{r.name}{r.note ? <small> · {r.note}</small> : null}</td>
                <td>{r.stage}</td>
                <td className="sd-num">{money(r.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
