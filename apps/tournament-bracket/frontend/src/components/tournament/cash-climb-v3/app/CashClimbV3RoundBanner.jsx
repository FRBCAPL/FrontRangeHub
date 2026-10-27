import React, { useEffect, useRef, useState } from 'react';
import { currentRound } from './cashClimbV3RoundStatus.js';

const NOTICE_MS = 12000;

/**
 * Live "Now playing" banner: the current round in its colour, how many of its matches are done, and a
 * strip of every round. When play moves to a new round, a notice says so until dismissed (or for a while).
 */
export default function CashClimbV3RoundBanner({ progress, viewing, onPickRound }) {
  const now = currentRound(progress);
  const nowKey = now?.key ?? 'all-done';
  const previous = useRef(nowKey);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (previous.current === nowKey) return undefined;
    const finished = progress.find((r) => r.key === previous.current);
    previous.current = nowKey;
    setNotice({
      key: nowKey,
      tone: now?.tone ?? 'championship',
      text: now
        ? `${finished ? `${finished.label} complete. ` : ''}${now.label} is up!`
        : 'Every match is played. Settle the tournament to finish.',
    });
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [nowKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ccv3-round-banner-wrap">
      {notice ? (
        <div key={notice.key} className={`ccv3-round-notice tone-${notice.tone}`} role="status">
          <strong>{notice.text}</strong>
          <button type="button" className="ccv3-round-notice-close" onClick={() => setNotice(null)} aria-label="Dismiss">&times;</button>
        </div>
      ) : null}
      <section key={nowKey} className={`ccv3-round-banner tone-${now?.tone ?? 'done'}`} aria-label="Current round">
        <p className="ccv3-round-kicker">{now ? 'Now playing' : 'All rounds played'}</p>
        <h3 className="ccv3-round-name">{now ? now.label : 'Ready to settle'}</h3>
        {now ? <p className="ccv3-round-count">{now.done} of {now.total} match{now.total === 1 ? '' : 'es'} done</p> : null}
        <ol className="ccv3-round-strip" aria-label="Rounds (tap one to see its matches)">
          {progress.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                className={`ccv3-round-pip is-${r.state} tone-${r.tone}${r.key === viewing ? ' is-viewing' : ''}`}
                aria-current={r.state === 'current' ? 'step' : undefined}
                aria-pressed={r.key === viewing}
                onClick={() => onPickRound?.(r.key)}
              >
                <span aria-hidden="true">{r.state === 'done' ? '\u2713' : r.state === 'current' ? '\u25cf' : '\u25cb'}</span> {r.label}
                <span className="ccv3-round-pip-count"> {r.done}/{r.total}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
