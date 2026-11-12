import React from 'react';
import TournamentRunningList from './TournamentRunningList.jsx';
import TournamentHubTools from './TournamentHubTools.jsx';
import './TournamentHome.css';
import './TournamentDashboard.css';

export default function TournamentHubHome({
  currentEvents = [],
  completedCount = 0,
  loading = false,
  onNew,
  onOpenEvent,
  onCurrent,
  onCompleted,
  onTvWide,
  onTvTall,
  onSubmit,
  onBackHome,
}) {
  return (
    <div className="tb-dash">
      <header className="tb-dash-head">
        <div>
          <h1>Tournaments</h1>
          <p>Run tonight’s event, start a new one, or look back at past results.</p>
        </div>
        <button type="button" className="tb-dash-primary" onClick={onNew}>+ New tournament</button>
      </header>

      <section className="tb-dash-section" aria-labelledby="tb-dash-running">
        <div className="tb-dash-section-head">
          <h2 id="tb-dash-running">
            <span className="tb-live-dot" aria-hidden="true" /> Running now
            {currentEvents.length ? <span className="tb-dash-count">{currentEvents.length}</span> : null}
          </h2>
        </div>
        <TournamentRunningList
          events={currentEvents}
          loading={loading}
          onOpen={onOpenEvent}
          onSeeAll={onCurrent}
        />
      </section>

      <div className="tb-dash-tiles">
        <button type="button" className="tb-dash-tile" onClick={onCurrent}>
          <span className="tb-dash-tile-icon" aria-hidden="true">🗂️</span>
          <strong>Manage running{currentEvents.length ? ` (${currentEvents.length})` : ''}</strong>
          <span>Open events, or remove ones you no longer need.</span>
        </button>
        <button type="button" className="tb-dash-tile is-done" onClick={onCompleted}>
          <span className="tb-dash-tile-icon" aria-hidden="true">📁</span>
          <strong>Completed{completedCount ? ` (${completedCount})` : ''}</strong>
          <span>Open or clear out finished events.</span>
        </button>
      </div>

      <TournamentHubTools onTvWide={onTvWide} onTvTall={onTvTall} onSubmit={onSubmit} />

      <div className="tb-hub-back">
        <button type="button" className="tb-link-btn" onClick={onBackHome}>← Back to frontrangepool.com</button>
      </div>
    </div>
  );
}
