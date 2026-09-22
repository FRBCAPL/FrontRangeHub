import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BreakAndRunPublicBoard from './BreakAndRunPublicBoard.jsx';
import useBreakAndRunLive from './useBreakAndRunLive.js';
import './BreakAndRunPublic.css';

export default function BreakAndRunPhoneView() {
  const navigate = useNavigate();
  const { eventId: routeId } = useParams();
  const { tournament, loading } = useBreakAndRunLive(routeId || '');

  return (
    <div className="bnr-public-shell bnr-public-shell-phone">
      <div className="bnr-tv-bar" role="group" aria-label="Break and Run display">
        <button type="button" onClick={() => navigate('/')}>Home</button>
      </div>
      {loading && !tournament ? (
        <p className="bnr-public-empty">Loading pot…</p>
      ) : (
        <BreakAndRunPublicBoard
          tournament={tournament}
          variant="phone"
          emptyMessage="No Break & Run pot is live. Ask the house for the link when the pot opens."
        />
      )}
    </div>
  );
}
