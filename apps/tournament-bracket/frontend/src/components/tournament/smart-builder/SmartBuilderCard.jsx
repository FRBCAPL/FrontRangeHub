import React from 'react';
import { formatMinutes, warnings } from './builderExplain.js';
import {
  FIT_NAMES, formatName, formatSubtitle, settingsText, slackText, guaranteeLines, payoutLines,
} from './builderNarrative.js';

/**
 * One refined option. `why` (reasons) and `tradeoff` (one sentence) are optional.
 * `onUse` adds "Use these settings"; `useProblem` disables it and says why, `useNote` says what happens next.
 */
export default function SmartBuilderCard({ m, inputs, why, tradeoff, featured = false, onUse = null, useProblem = '', useNote = '' }) {
  const notes = warnings(m);
  return (
    <article className={`sb-card sb-fit-${m.fit}${featured ? ' sb-card-featured' : ''}`}>
      <div className="sb-card-badges">
        <span className="sb-badge">{FIT_NAMES[m.fit]}</span>
        {m.borderline ? <span className="sb-badge sb-badge-warn">Borderline</span> : null}
      </div>
      <p className="sb-format">{formatName(m)}</p>
      <p className="sb-format-sub">{formatSubtitle(m)}</p>
      <h3 className="sb-settings">{settingsText(m)}</h3>
      <dl className="sb-times">
        <div><dt>Typical</dt><dd>{formatMinutes(m.p50)}</dd></div>
        <div><dt>Conservative</dt><dd>{formatMinutes(m.p80)}</dd></div>
      </dl>
      <p className="sb-slack">{slackText(m)}</p>
      {tradeoff ? <p className="sb-tradeoff">{tradeoff}</p> : null}
      {why?.length ? (
        <div className="sb-why">
          <p className="sb-why-title">Why this one</p>
          <ul>{why.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      ) : null}
      <ul className="sb-facts">
        {[...guaranteeLines(m), ...payoutLines(m, inputs)].map((f) => <li key={f}>{f}</li>)}
      </ul>
      {notes.length ? <ul className="sb-warnings">{notes.map((w) => <li key={w}>{w}</li>)}</ul> : null}
      {onUse ? (
        <div className="sb-use">
          <button type="button" className="tb-btn-new sb-use-btn" disabled={Boolean(useProblem)} onClick={() => onUse(m)}>
            Use these settings
          </button>
          <p className={useProblem ? 'sb-use-note sb-use-blocked' : 'sb-use-note'}>{useProblem || useNote}</p>
        </div>
      ) : null}
    </article>
  );
}
