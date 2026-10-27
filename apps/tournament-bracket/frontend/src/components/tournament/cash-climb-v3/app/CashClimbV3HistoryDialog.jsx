import React, { useState } from 'react';
import CashClimbV3Dialog from './CashClimbV3Dialog.jsx';
import { matchCard, money } from './cashClimbV3View.js';
import { roundProgress } from './cashClimbV3RoundStatus.js';
import './CashClimbV3Rounds.css';
import './CashClimbV3History.css';

/** Results posted so far, one tab per round. Display only: results and amounts come from the record. */
export default function CashClimbV3HistoryDialog({ record, onClose }) {
  const progress = roundProgress(record.event);
  const latest = [...progress].reverse().find((r) => r.done > 0) || progress[0];
  const [tab, setTab] = useState(latest.key);
  const round = progress.find((r) => r.key === tab) || latest;
  const played = round.matchIds.filter((id) => record.event.matches[id].status !== 'open').map((id) => matchCard(record, id));
  const left = round.total - played.length;

  return (
    <CashClimbV3Dialog title="Match history" onClose={onClose}>
      <nav className="ccv3-history-tabs" aria-label="Rounds">
        {progress.map((r) => (
          <button type="button" key={r.key} className={`ccv3-round-tab tone-${r.tone}${r.key === round.key ? ' is-active' : ''}`}
            aria-pressed={r.key === round.key} onClick={() => setTab(r.key)}>
            {r.label}<span className="ccv3-muted"> {r.done}/{r.total}</span>
          </button>
        ))}
      </nav>
      <div className={`ccv3-history tone-${round.tone}`}>
        {played.length ? (
          <ol className="ccv3-history-list">
            {played.map((c) => (
              <li key={c.id} className="ccv3-history-item">
                <div className="ccv3-history-head">
                  <strong>{c.title}</strong>
                  <span className="ccv3-match-status">{c.statusText}</span>
                </div>
                <p className="ccv3-history-result">{c.resultText}</p>
                <p className="ccv3-history-money">
                  {c.positions.filter((p) => p.kind === 'player' && p.earnedCents > 0)
                    .map((p) => <span key={p.id} className="ccv3-earned">{p.name} +{money(p.earnedCents)}</span>)}
                  {c.paidCents === 0 ? <span className="ccv3-muted">Nothing paid</span> : null}
                  {c.unawardedCents > 0 ? <span className="ccv3-muted">{money(c.unawardedCents)} unawarded</span> : null}
                </p>
              </li>
            ))}
          </ol>
        ) : <p className="cc-setup-note">No {round.label} results yet.</p>}
        {left > 0 && played.length ? <p className="cc-setup-note ccv3-muted">{left} {round.label} match{left === 1 ? '' : 'es'} still to play.</p> : null}
      </div>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </CashClimbV3Dialog>
  );
}
