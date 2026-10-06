import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as T from './trapEmContent.js';
import './TrapEmTableCard.css';

/** One-page printout for the table. Hidden on screen; the print stylesheet shows only this. */
export default function TrapEmTableCard() {
  useEffect(() => {
    document.body.classList.add('trapem-printable');
    return () => document.body.classList.remove('trapem-printable');
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="trapem-card" aria-hidden="true">
      <header>
        <h1>{T.TRAP_EM_TITLE}</h1>
        <p className="trapem-card-sub">{T.TRAP_EM_SUBTITLE} · {T.TRAP_EM_TAGLINE}</p>
      </header>

      <div className="trapem-card-core">
        <strong>{T.TRAP_EM_REMEMBER_BIG}</strong>
        <span>{T.TRAP_EM_CORE_RULE}</span>
        <span>{T.TRAP_EM_CORE_EXCEPTION}</span>
      </div>

      <h2>Every shot ends your turn</h2>
      <ul className="trapem-card-outcomes">
        {T.TRAP_EM_OUTCOMES.map((o) => (
          <li key={o.result}><strong>{o.result}</strong> {o.then}</li>
        ))}
      </ul>

      <h2>{T.TRAP_EM_RULES_TITLE}</h2>
      <ol className="trapem-card-rules">
        {T.TRAP_EM_RULES.map((r) => (
          <li key={r.title}><strong>{r.title}.</strong> {r.short}</li>
        ))}
      </ol>

      <h2>{T.TRAP_EM_FORMAT_TITLE}</h2>
      <ul className="trapem-card-format">
        {T.TRAP_EM_FORMAT.map((f) => (
          <li key={f.label}><strong>{f.label}:</strong> {f.value}</li>
        ))}
      </ul>

      <p className="trapem-card-foot">
        {T.TRAP_EM_WIN_BODY} All other CSI 8-Ball rules apply. · {T.TRAP_EM_KICKER}
      </p>
    </div>,
    document.body,
  );
}
