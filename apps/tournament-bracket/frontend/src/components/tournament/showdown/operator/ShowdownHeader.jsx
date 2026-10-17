import React from 'react';
import { STATUS_LABELS, money } from './showdownView.js';

export function showdownTabs(state) {
  const tabs = [
    { key: 'run', label: 'Run event' },
    { key: 'circle', label: 'Circle' },
    { key: 'standings', label: 'Standings' },
  ];
  if ((state.shootouts || []).length) tabs.push({ key: 'shootout', label: 'Shootout' });
  if (['bracket', 'playoffs', 'completed'].includes(state.status)) tabs.push({ key: 'bracket', label: 'Bracket' });
  tabs.push({ key: 'money', label: 'Money' });
  if (['playoffs', 'completed'].includes(state.status)) tabs.push({ key: 'results', label: 'Results' });
  tabs.push({ key: 'players', label: 'Players' }, { key: 'log', label: 'Audit log' });
  return tabs;
}

export default function ShowdownHeader({ state, tab, onTab, paid, step, corrections, onCorrections, onLeave, onNew }) {
  const tabs = showdownTabs(state);
  return (
    <header className="cc-play-header">
      <div className="cc-play-header-top">
        <div className="cc-play-title">
          <p className="cc-play-kicker">Cash Climb Showdown · {STATUS_LABELS[state.status] || state.status}</p>
          <h1>{state.name}</h1>
        </div>
        <div className="cc-play-actions">
          <label className={`sd-toggle${corrections ? ' is-on' : ''}`}>
            <input type="checkbox" checked={corrections} onChange={(e) => onCorrections(e.target.checked)} />
            Corrections
          </label>
          <button type="button" className="tb-btn-new" onClick={onLeave}>Tournaments menu</button>
          <button type="button" className="tb-btn-new" onClick={onNew}>New Showdown</button>
        </div>
      </div>
      <div className="cc-chip-row">
        <span className="cc-chip">{state.tournamentDate}</span>
        {state.venue ? <span className="cc-chip">{state.venue}</span> : null}
        <span className="cc-chip">{state.players.length} entrants</span>
        <span className="cc-chip">{state.settings.tableCount} tables</span>
        <span className="cc-chip">Pool {money(state.payoutPlan?.pool)}</span>
        <span className="cc-chip">Paid {money(paid)}</span>
      </div>
      {corrections ? <p className="sd-warn">Corrections mode is on: correct, undo, and reopen controls are showing. Turn it off when you are done.</p> : null}
      {step ? <p className="sd-step" role="status">{step}</p> : null}
      <nav className="sd-tabs" aria-label="Showdown sections">
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`sd-tab${tab === t.key ? ' is-active' : ''}`} aria-current={tab === t.key ? 'page' : undefined} onClick={() => onTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
