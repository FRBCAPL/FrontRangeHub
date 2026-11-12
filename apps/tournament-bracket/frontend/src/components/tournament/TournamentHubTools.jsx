import React from 'react';
import TournamentGuideLinks from './TournamentGuideLinks.jsx';

/** Compact strip of extras: TV board, player submit page, and the format guides (folded). */
export default function TournamentHubTools({ onTvWide, onTvTall, onSubmit }) {
  return (
    <section className="tb-tools" aria-label="Tools">
      <div className="tb-tools-strip">
        <div className="tb-tool">
          <span className="tb-tool-label"><span aria-hidden="true">📺</span> TV board</span>
          <span className="tb-tool-actions">
            <button type="button" className="tb-btn-new" onClick={onTvWide}>Wide</button>
            <button type="button" className="tb-btn-new" onClick={onTvTall}>Tall</button>
          </span>
        </div>
        <div className="tb-tool">
          <span className="tb-tool-label"><span aria-hidden="true">📱</span> Players</span>
          <span className="tb-tool-actions">
            <button type="button" className="tb-btn-new" onClick={onSubmit}>Submit a result</button>
          </span>
        </div>
      </div>
      <details className="tb-tools-guides">
        <summary><span aria-hidden="true">📖</span> Player guides <span className="tb-tools-hint">Read or show on TV</span></summary>
        <TournamentGuideLinks />
      </details>
    </section>
  );
}
