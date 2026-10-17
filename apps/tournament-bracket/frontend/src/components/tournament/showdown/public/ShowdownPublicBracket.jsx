import React from 'react';
import ShowdownBracketRounds from '../operator/ShowdownBracketRounds.jsx';
import { bracketView } from '../operator/showdownBoardView.js';
import { money } from '../operator/showdownView.js';

/** Read-only playoff bracket. Only shown once the director confirms it. */
export default function ShowdownPublicBracket({ event }) {
  const v = bracketView(event);
  if (!v || !v.confirmed) {
    return <section className="sd-panel"><h3>Playoff bracket</h3><p className="sd-note">The bracket appears here once qualifying is finished and the director confirms the draw.</p></section>;
  }
  return (
    <section className="sd-panel" aria-label="Playoff bracket">
      <h3>{v.size}-player playoff bracket</h3>
      {v.championship.status === 'unresolved' ? <p className="sd-warn">Championship unresolved: {v.championship.reason} The director will resolve it.</p> : null}
      {v.byes.length ? <p className="sd-note">Quarterfinal byes ({money(v.byePay)} each): {v.byes.map((b) => b.name).join(', ')}.</p> : null}
      <ShowdownBracketRounds v={v} readOnly />
      {v.transfers.length ? <p className="sd-note">Unwon match payouts added to the championship: {v.transfers.map((t) => `${t.label} (${money(t.amount)})`).join(', ')}.</p> : null}
    </section>
  );
}
