import React from 'react';
import { matchCard, money } from './cashClimbV3View.js';

/** One bracket match. `live` shows play status; `onEnter` (ready matches only) opens result entry. */
export default function CashClimbV3MatchCard({ record, matchId, live, onEnter }) {
  const card = matchCard(record, matchId);
  const resolved = card.status !== 'open';
  const tone = resolved ? 'is-resolved' : live ? `is-${card.readiness}` : '';
  return (
    <article className={`ccv3-match ${tone}${card.championship ? ' is-championship' : ''}`} aria-label={card.title}>
      <header className="ccv3-match-head">
        <strong>{card.title}</strong>
        {live || resolved ? <span className="ccv3-match-status">{card.statusText}</span> : null}
      </header>
      <ul className="ccv3-match-players">
        {card.positions.map((p, i) => (
          <li key={i} className={`ccv3-pos is-${p.kind}${p.winner ? ' is-winner' : ''}`}>
            <span>{p.name}{p.kind === 'player' && p.from ? <small className="ccv3-muted"> (from {p.from})</small> : null}</span>
            {p.kind === 'player' && p.earnedCents > 0 ? <span className="ccv3-earned">+{money(p.earnedCents)}</span> : null}
          </li>
        ))}
      </ul>
      {card.resultText ? <p className="ccv3-match-result">{card.resultText}</p> : null}
      <p className="ccv3-match-money">
        {card.moneyLabel} {money(card.allocationCents)}
        {resolved && card.unawardedCents > 0 ? <span className="ccv3-muted"> · {money(card.unawardedCents)} unawarded</span> : null}
      </p>
      {live && card.readiness === 'ready' && onEnter ? (
        <button type="button" className="btn-primary ccv3-enter" onClick={() => onEnter(matchId)}>Enter result</button>
      ) : null}
    </article>
  );
}
