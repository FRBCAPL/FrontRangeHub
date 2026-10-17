import React from 'react';
import { money } from './showdownView.js';

function MiniMatch({ m, byeIds }) {
  const done = m.status === 'completed';
  const tag = (id) => (m.roundKey === 'semifinal' && byeIds.has(id) ? <small className="sd-bye-tag">bye</small> : null);
  return (
    <li className={`sd-mini is-${m.status}`}>
      <span className="sd-mini-label">{m.label}{m.status === 'on-table' ? ` \u00b7 Table ${m.table}` : ''}</span>
      <span className={done && m.winnerId === m.p1 ? 'is-winner' : ''}>{m.p1Name} {tag(m.p1)}</span>
      <span className={done && m.winnerId === m.p2 ? 'is-winner' : ''}>{m.p2Name} {tag(m.p2)}</span>
      {done ? <small className={m.automatic || m.result === 'double-forfeit' ? 'sd-admin-result' : ''}>{m.resultText}</small> : null}
    </li>
  );
}

function ByeCard({ b, byePay, confirmed }) {
  return (
    <li className="sd-mini sd-mini-bye">
      <span className="sd-mini-label">Section {b.section} &middot; Bye</span>
      <span className="is-winner">{b.name}</span>
      <small>
        Straight to Semifinal {b.semifinal} &middot; {confirmed ? `earned ${money(byePay)}` : `${money(byePay)} when confirmed`}
        {b.withdrawn ? ' \u00b7 withdrew, keeps the bye' : ''}
      </small>
    </li>
  );
}

/**
 * Rounds side by side. In an 8-position bracket with byes, the quarterfinal column lists all four
 * sections in order so each bye sits where its quarterfinal would have been.
 */
export default function ShowdownBracketRounds({ v, readOnly = false }) {
  const byeIds = new Set(v.byes.map((b) => b.playerId));
  return (
    <div className="sd-rounds">
      {v.rounds.map((r) => {
        const sectioned = r.key === 'quarterfinal' && v.byes.length;
        const items = sectioned
          ? [1, 2, 3, 4].map((section) => {
            const b = v.byes.find((x) => x.section === section);
            if (b) return <ByeCard key={`bye-${section}`} b={b} byePay={v.byePay} confirmed={v.confirmed || readOnly} />;
            const m = r.matches.find((x) => x.section === section);
            return m ? <MiniMatch key={m.id} m={m} byeIds={byeIds} /> : null;
          })
          : r.matches.map((m) => <MiniMatch key={m.id} m={m} byeIds={byeIds} />);
        return (
          <div key={r.key} className="sd-round">
            <h4>{r.label}{r.payout !== null ? <small>{money(r.payout)} per win</small> : null}</h4>
            <ul>{items}</ul>
          </div>
        );
      })}
    </div>
  );
}
