import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BreakAndRunPublicBoard from './BreakAndRunPublicBoard.jsx';
import useBreakAndRunLive from './useBreakAndRunLive.js';
import './BreakAndRunPublic.css';

export default function BreakAndRunTvView() {
  const navigate = useNavigate();
  const { eventId: routeId } = useParams();
  const { tournament, loading } = useBreakAndRunLive(routeId || '');

  const goBack = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    navigate('/tournament-bracket');
  };

  return (
    <div className="bnr-public-shell bnr-public-shell-tv">
      <div className="bnr-tv-bar" role="group" aria-label="Break and Run TV">
        <button type="button" onClick={goBack}>Close</button>
      </div>
      {loading && !tournament ? (
        <p className="bnr-public-empty">Loading pot…</p>
      ) : (
        <BreakAndRunPublicBoard
          tournament={tournament}
          variant="tv"
          emptyMessage="No Break & Run is running. Open one on the operator tablet — this TV updates when they save."
        />
      )}
    </div>
  );
}
