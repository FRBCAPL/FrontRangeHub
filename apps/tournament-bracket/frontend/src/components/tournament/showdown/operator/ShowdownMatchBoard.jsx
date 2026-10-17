import React, { useState } from 'react';
import ShowdownMatchCard from './ShowdownMatchCard.jsx';

/** Table tiles: who is on each table, and a one-tap "start next" for open tables. */
function TableTiles({ queue, tableCount, onStartNext, onRecord }) {
  const byTable = new Map(queue.onTable.map((m) => [m.table, m]));
  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);
  return (
    <div className="sd-tables" aria-label="Tables">
      {tables.map((t) => {
        const m = byTable.get(t);
        return (
          <div key={t} className={`sd-table-tile${m ? ' is-busy' : ''}`}>
            <span className="sd-table-num">Table {t}</span>
            {m ? (
              <button type="button" className="sd-table-match" onClick={() => onRecord(m)}>
                <strong>{m.p1Name}</strong><span>vs</span><strong>{m.p2Name}</strong>
                <small>{m.label}{' \u00b7 '}tap to record</small>
              </button>
            ) : (
              <button type="button" className="sd-btn sd-btn-primary" disabled={!queue.ready.length} onClick={() => onStartNext(t)}>
                {queue.ready.length ? 'Start next match' : 'Open'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ShowdownMatchBoard({ title, queue, tableCount, corrections, handlers }) {
  const [showDone, setShowDone] = useState(false);
  const h = handlers;
  const card = (m) => (
    <ShowdownMatchCard
      key={m.id}
      match={m}
      freeTables={queue.freeTables}
      suggested={m.id === queue.suggestedId}
      corrections={corrections}
      onStart={h.onStart}
      onRecord={h.onRecord}
      onMove={h.onMove}
      onTakeOff={h.onTakeOff}
      onHold={h.onHold}
      onCorrect={h.onCorrect}
      onUndoFrom={h.onUndoFrom}
    />
  );
  return (
    <section className="sd-panel" aria-label={title}>
      <div className="sd-panel-head">
        <h3>{title}</h3>
        <span className="sd-progress">{queue.completed} of {queue.total} finished</span>
      </div>
      <TableTiles queue={queue} tableCount={tableCount} onStartNext={h.onStartNext} onRecord={h.onRecord} />

      {queue.ready.length ? (
        <>
          <h4>Ready to start</h4>
          <ul className="sd-match-list">{queue.ready.map(card)}</ul>
        </>
      ) : null}
      {queue.waiting.length ? (
        <>
          <h4>Waiting</h4>
          <ul className="sd-match-list">{queue.waiting.map(card)}</ul>
        </>
      ) : null}
      {queue.done.length ? (
        <>
          <button type="button" className="sd-link" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            {showDone ? 'Hide' : 'Show'} finished matches ({queue.done.length})
          </button>
          {showDone ? <ul className="sd-match-list">{queue.done.map(card)}</ul> : null}
        </>
      ) : null}
    </section>
  );
}
