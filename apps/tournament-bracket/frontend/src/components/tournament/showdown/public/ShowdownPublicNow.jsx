import React from 'react';
import { queueView } from '../operator/showdownView.js';
import { SUBMISSION_STATUS_TEXT } from './showdownMySubmissions.js';
import ShowdownPublicShootout from './ShowdownPublicShootout.jsx';
import ShowdownWhoAmI from './ShowdownWhoAmI.jsx';
import { isMyMatch } from './showdownWhoAmI.js';

function MatchLine({ m }) {
  return (
    <li className="sd-pub-match">
      <span className="sd-pub-label">{m.label}{m.table ? ` \u00b7 Table ${m.table}` : ''}</span>
      <span>{m.p1Name} <em>vs</em> {m.p2Name}</span>
      {m.status === 'completed' ? <small>{m.winnerName ? `${m.winnerName} won \u00b7 ` : ''}{m.resultText}</small> : null}
    </li>
  );
}

/** What is happening right now, with phone reporting for matches on a table. */
export default function ShowdownPublicNow({ event, pendingIds, mine, canReport, onReport, me = null, onPickMe = () => {} }) {
  const s = event.status;
  if (s === 'shootout') return <ShowdownPublicShootout event={event} />;
  if (s === 'bracket') return <section className="sd-panel"><h3>Playoff bracket</h3><p className="sd-note">Qualifying is finished. The director is drawing the playoff bracket.</p></section>;
  if (s === 'completed') return null;
  const q = queueView(event, s === 'playoffs' ? 'playoff' : 'qualifying');
  return (
    <>
      <section className="sd-panel" aria-label="On the tables">
        <h3>On the tables</h3>
        {canReport ? <ShowdownWhoAmI event={event} me={me} onPick={onPickMe} /> : null}
        {q.onTable.length ? (
          <ul className="sd-pub-list">
            {q.onTable.map((m) => {
              const waiting = pendingIds.includes(m.id);
              return (
                <li key={m.id} className="sd-pub-match">
                  <span className="sd-pub-label">{m.label} &middot; Table {m.table}</span>
                  <span>{m.p1Name} <em>vs</em> {m.p2Name}</span>
                  {canReport && isMyMatch(m, me?.id) ? (
                    waiting
                      ? <small className="sd-warn">Score sent &mdash; waiting for the director</small>
                      : <button type="button" className="sd-btn sd-btn-primary" onClick={() => onReport(m)}>Report score</button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : <p className="sd-note">No matches on a table right now.</p>}
        {canReport ? <p className="sd-note">Only matches on a table can be reported. Forfeits and shootout games are entered by the director.</p> : null}
      </section>
      {mine.length ? (
        <section className="sd-panel" aria-label="Scores you sent">
          <h3>Scores you sent</h3>
          <ul className="sd-pub-list">
            {mine.map((x) => (
              <li key={x.id} className={`sd-pub-match is-${x.status}`}>
                <span className="sd-pub-label">{x.label}</span>
                <span>{x.scoreText}</span>
                <small className={x.status === 'rejected' ? 'sd-error' : x.status === 'approved' ? 'sd-ok' : 'sd-warn'}>
                  {SUBMISSION_STATUS_TEXT[x.status] || x.status}{x.reason ? ` \u2014 ${x.reason}` : ''}
                </small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="sd-panel" aria-label="Up next">
        <h3>Up next</h3>
        {q.ready.length || q.waiting.length ? (
          <ul className="sd-pub-list">{[...q.ready, ...q.waiting].slice(0, 8).map((m) => <MatchLine key={m.id} m={m} />)}</ul>
        ) : <p className="sd-note">Nothing waiting.</p>}
      </section>
      <section className="sd-panel" aria-label="Latest results">
        <h3>Latest results</h3>
        {q.done.length ? <ul className="sd-pub-list">{q.done.slice(0, 10).map((m) => <MatchLine key={m.id} m={m} />)}</ul> : <p className="sd-note">No results yet.</p>}
      </section>
    </>
  );
}
