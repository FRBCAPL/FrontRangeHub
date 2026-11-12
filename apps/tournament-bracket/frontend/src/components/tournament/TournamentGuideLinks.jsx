import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TOURNAMENT_GUIDES } from './tournamentGuides.js';

/** One row per format: read the guide here, or open the TV version in another window. */
export default function TournamentGuideLinks() {
  const navigate = useNavigate();
  return (
    <ul className="tb-guide-list">
      {TOURNAMENT_GUIDES.map((g) => (
        <li key={g.id} className="tb-guide-row">
          <span className="tb-guide-name">{g.label}</span>
          <span className="tb-guide-actions">
            <button type="button" className="tb-btn-new" onClick={() => navigate(g.hash)}>Read</button>
            <button type="button" className="tb-btn-new" onClick={g.openTv}>Show on TV</button>
          </span>
        </li>
      ))}
    </ul>
  );
}
