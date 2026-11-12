import React from 'react';
import { hubEventDetailLine } from './tournamentHubEvents.js';
import { formatTheme } from './tournamentFormatTheme.js';

const MAX_SHOWN = 6;

function detailWithoutFormat(item, label) {
  const line = hubEventDetailLine(item);
  return line.startsWith(label) ? line.slice(label.length).replace(/^\s*•\s*/, '') : line;
}

/** In-progress events right on the Tournaments home, each with a big Open button. */
export default function TournamentRunningList({ events, loading, onOpen, onSeeAll }) {
  if (loading && !events.length) {
    return <p className="tb-run-empty">Loading events…</p>;
  }
  if (!events.length) {
    return <p className="tb-run-empty">Nothing running right now. Use <strong>+ New tournament</strong> to start one.</p>;
  }
  const shown = events.slice(0, MAX_SHOWN);
  return (
    <>
      <ul className="tb-run-grid">
        {shown.map((item) => {
          const theme = formatTheme(item);
          return (
            <li key={item.id} className={`tb-run-card is-${theme.key}`}>
              <span className="tb-run-format"><span aria-hidden="true">{theme.icon}</span> {theme.label}</span>
              <strong className="tb-run-name">{item.name}</strong>
              <span className="tb-run-meta">{detailWithoutFormat(item, theme.label)}</span>
              <button type="button" className="tb-run-open" onClick={() => onOpen(item)}>Open</button>
            </li>
          );
        })}
      </ul>
      {events.length > MAX_SHOWN ? (
        <button type="button" className="tb-link-btn" onClick={onSeeAll}>See all {events.length} running →</button>
      ) : null}
    </>
  );
}
