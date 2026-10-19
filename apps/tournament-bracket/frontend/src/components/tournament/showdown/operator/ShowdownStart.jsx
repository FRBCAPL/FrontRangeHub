import React from 'react';
import { STATUS_LABELS, money } from './showdownView.js';
import { legacyFormatProblem } from '../showdownState.js';
import { payoutVersionOf, formatSupportProblem } from '../showdownPayoutVersion.js';
import { formatFor } from '../showdownFormats.js';

function ArchiveTags({ item }) {
  const fmt = formatFor(payoutVersionOf(item));
  return (
    <>
      <small> · {fmt ? fmt.code : 'Unknown format'}</small>
      {formatSupportProblem(item) ? <small className="sd-warn"> · Needs an app update (read-only)</small> : null}
      {!formatSupportProblem(item) && legacyFormatProblem(item) ? <small className="sd-warn"> · Obsolete test event (earlier rules)</small> : null}
    </>
  );
}

/** Landing screen when no Showdown is open on this tablet: start one, or reopen a past one. */
export default function ShowdownStart({ archive, onNew, onOpen, onRemove, onLeave }) {
  return (
    <div className="sd-app">
      <header className="tb-header">
        <h1>Cash Climb Showdown</h1>
        <p>Circle qualifying (two matches each), then a single-elimination playoff. Choose the tournament format when you create the event: V1, V2 or the recommended V3.</p>
      </header>
      <div className="cc-format-grid">
        <button type="button" className="cc-format-btn cc-primary" onClick={onNew}>
          <strong>New Showdown</strong>
          <span>Legends Brews & Cues preset: 8–24 players, $20 minimum entry. You choose and confirm the format next.</span>
        </button>
        <button type="button" className="tb-btn-new" onClick={onLeave}>Back</button>
      </div>
      {archive.length ? (
        <section className="sd-panel sd-archive" aria-label="Past events on this tablet">
          <h3>Past events on this tablet</h3>
          <ul>
            {archive.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small> · {item.tournamentDate} · {item.players.length} players · {STATUS_LABELS[item.status] || item.status}{item.payoutPlan ? ` · ${money(item.payoutPlan.pool)}` : ''}</small>
                  <ArchiveTags item={item} />
                </span>
                <span className="sd-btn-row">
                  <button type="button" className="sd-btn" onClick={() => onOpen(item)}>Open</button>
                  <button type="button" className="sd-btn sd-btn-quiet" onClick={() => onRemove(item)}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
