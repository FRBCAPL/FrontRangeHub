import React from 'react';
import { formatMoney, sessionPlayerIdList } from './breakAndRunEngine.js';
import { formatSessionDetails } from './breakAndRunSessions.js';
import './BreakAndRunOperator.css';
import './BreakAndRunSessionCard.css';

function sessionStats(tournament, sessionId) {
  const sid = String(sessionId || '');
  const turns = (tournament.turns || []).filter((t) => String(t.sessionId || '') === sid);
  return {
    attempts: turns.length,
    paidOut: turns.reduce((sum, t) => sum + (Number(t.amountWon) || 0), 0),
  };
}

function PastSessions({ sessions, onEdit }) {
  if (!sessions.length) return null;
  return (
    <details className="bnr-session-more">
      <summary>Past sessions ({sessions.length})</summary>
      <ul className="bnr-session-past">
        {sessions.map((s) => (
          <li key={s.id}>
            <div>
              <strong>{s.name || 'Session'}</strong>
              <span>{formatSessionDetails({ ...s, name: '' }, { includeVenue: true }) || 'No details'}</span>
            </div>
            <button type="button" className="tb-btn-new" onClick={() => onEdit(s)}>Rename</button>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Tonight's session: who/what/where, quick stats, and the session controls in one place. */
export default function BreakAndRunSessionCard({
  tournament,
  session,
  live,
  onAddPlayer,
  onStartSession,
  onStartNext,
  onEndSession,
  onEdit,
}) {
  const sessions = tournament.sessions || [];
  const open = session?.status === 'open';
  const past = [...sessions].reverse().filter((s) => !open || String(s.id) !== String(session.id));
  const stats = open ? sessionStats(tournament, session.id) : null;
  const playerCount = open ? sessionPlayerIdList(tournament).length : 0;
  const details = open ? formatSessionDetails({ ...session, name: '' }, { includeVenue: true }) : '';

  return (
    <section className={`bnr-session-card${open ? ' is-open' : ''}`} aria-label="Session">
      <div className="bnr-session-head">
        <div>
          <p className="bnr-session-kicker">
            {open ? <span className="bnr-session-pill">Live</span> : null}
            {open ? 'Current session' : 'No session running'}
          </p>
          {open ? (
            <>
              <h2 className="bnr-session-name">{session.name || 'Tonight'}</h2>
              {details ? <p className="bnr-session-details">{details}</p> : null}
            </>
          ) : (
            <p className="bnr-session-details">
              The pot is waiting. Start a session for the next play night — money carries over.
            </p>
          )}
        </div>
        {open ? (
          <button type="button" className="tb-btn-new" onClick={() => onEdit(session)}>Edit</button>
        ) : null}
      </div>

      {open ? (
        <ul className="bnr-session-stats">
          <li><strong>{playerCount}</strong><span>player{playerCount === 1 ? '' : 's'}</span></li>
          <li><strong>{stats.attempts}</strong><span>attempt{stats.attempts === 1 ? '' : 's'}</span></li>
          <li><strong>{formatMoney(stats.paidOut)}</strong><span>paid out</span></li>
        </ul>
      ) : null}

      {live ? (
        <div className="bnr-session-actions">
          {open ? (
            <>
              <button type="button" className="bnr-op-btn is-go" onClick={onAddPlayer}>Add player</button>
              <button type="button" className="bnr-op-btn" onClick={onEndSession}>End session</button>
              <button type="button" className="bnr-op-btn is-quiet" onClick={onStartNext}>
                End &amp; start next
              </button>
            </>
          ) : (
            <button type="button" className="bnr-op-btn is-go" onClick={onStartSession}>Start session</button>
          )}
        </div>
      ) : null}

      <details className="bnr-session-more">
        <summary>How sessions work</summary>
        <ul className="bnr-session-help">
          <li>One pot runs across every play night. Each night is a session; money always carries over.</li>
          <li>No payout on a turn → the player can rebuy as many times as they like this session.</li>
          <li>Cash out → that player is done for this session.</li>
          <li>Ending a session asks which players still have an open turn to carry to the next one.</li>
          <li>The next session starts with only those carried players — everyone else joins with Add player.</li>
        </ul>
      </details>

      <PastSessions sessions={past} onEdit={onEdit} />
    </section>
  );
}
