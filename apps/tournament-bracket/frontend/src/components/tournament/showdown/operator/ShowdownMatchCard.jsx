import React from 'react';

function Player({ name, out, won }) {
  return (
    <span className={`sd-match-player${won ? ' is-winner' : ''}${out ? ' is-out' : ''}`}>
      {name}{out ? <small> (withdrew)</small> : null}
    </span>
  );
}

/**
 * One match with the controls that fit its state:
 * waiting → start on a table / hold; on table → record, move, take off; finished → correct (corrections mode).
 */
export default function ShowdownMatchCard({ match, freeTables = [], suggested = false, corrections = false, onStart, onRecord, onMove, onTakeOff, onHold, onCorrect, onUndoFrom }) {
  const m = match;
  const done = m.status === 'completed';
  const onTable = m.status === 'on-table';
  return (
    <li className={`sd-match is-${m.status}${suggested ? ' is-suggested' : ''}${m.hold ? ' is-held' : ''}`}>
      <div className="sd-match-head">
        <span className="sd-match-label">{m.label}</span>
        {onTable ? <span className="sd-match-table">Table {m.table}</span> : null}
        {suggested ? <span className="sd-tag">Up next</span> : null}
        {m.hold ? <span className="sd-tag sd-tag-warn">On hold</span> : null}
      </div>
      <div className="sd-match-players">
        <Player name={m.p1Name} out={m.p1Out} won={done && m.winnerId === m.p1} />
        <span className="sd-vs">vs</span>
        <Player name={m.p2Name} out={m.p2Out} won={done && m.winnerId === m.p2} />
      </div>
      {m.info ? <p className="sd-match-info">{m.info}</p> : null}
      {done ? <p className="sd-match-result">{m.resultText}</p> : null}
      {!done && !onTable && m.reason ? <p className="sd-match-reason">{m.reason}</p> : null}
      <div className="sd-match-actions">
        {!done && !onTable && !m.reason && freeTables.length ? (
          <label className="sd-inline">
            <span className="sd-sr">Start on table</span>
            <select defaultValue="" onChange={(e) => { if (e.target.value) onStart(m.id, e.target.value); e.target.value = ''; }} aria-label={`Start ${m.label} on a table`}>
              <option value="" disabled>Start on table…</option>
              {freeTables.map((t) => <option key={t} value={t}>Table {t}</option>)}
            </select>
          </label>
        ) : null}
        {!done && !onTable && m.p1 && m.p2 ? (
          <button type="button" className="sd-btn" onClick={() => onRecord(m)}>Enter result</button>
        ) : null}
        {!done && !onTable && onHold ? (
          <button type="button" className="sd-btn sd-btn-quiet" onClick={() => onHold(m.id, !m.hold)}>{m.hold ? 'Release' : 'Hold'}</button>
        ) : null}
        {onTable ? (
          <>
            <button type="button" className="sd-btn sd-btn-primary" onClick={() => onRecord(m)}>Record result</button>
            {freeTables.length ? (
              <select defaultValue="" onChange={(e) => { if (e.target.value) onMove(m.id, e.target.value); e.target.value = ''; }} aria-label={`Move ${m.label} to another table`}>
                <option value="" disabled>Move to…</option>
                {freeTables.map((t) => <option key={t} value={t}>Table {t}</option>)}
              </select>
            ) : null}
            <button type="button" className="sd-btn sd-btn-quiet" onClick={() => onTakeOff(m.id)}>Take off table</button>
          </>
        ) : null}
        {done && corrections && onCorrect ? (
          <button type="button" className="sd-btn sd-btn-warn" onClick={() => onCorrect(m)}>Correct result</button>
        ) : null}
        {done && corrections && onUndoFrom ? (
          <button type="button" className="sd-btn sd-btn-danger" onClick={() => onUndoFrom(m)}>Undo from here</button>
        ) : null}
      </div>
    </li>
  );
}
