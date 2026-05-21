import React from 'react';
import LadderApp from './LadderApp.jsx';
import LadderNewsTicker from './LadderNewsTicker.jsx';
import { LADDER_ONE_LINER } from '@shared/utils/utils/ladderEntryCopy.js';
import './PublicLadderEmbed.css';

const PublicLadderEmbed = () => {
  const goToPlayerLogin = () => {
    window.location.href = `${window.location.origin}/#/ladder`;
  };

  const goToNewPlayer = () => {
    window.location.href = `${window.location.origin}/#/ladder?signup=1`;
  };

  return (
    <div className="public-ladder-embed">
      <header className="public-ladder-embed-banner">
        <div className="public-ladder-embed-banner-text">
          <p className="public-ladder-embed-eyebrow">Ladder of Legends · Live rankings</p>
          <p className="public-ladder-embed-pitch">{LADDER_ONE_LINER}</p>
        </div>
        <div className="public-ladder-embed-banner-ctas">
          <button type="button" className="public-ladder-embed-cta primary" onClick={goToPlayerLogin}>
            Player login
          </button>
          <button
            type="button"
            className="public-ladder-embed-cta secondary"
            onClick={goToNewPlayer}
          >
            New player? Start here
          </button>
        </div>
      </header>

      <div className="public-ladder-embed-activity-label" aria-hidden="false">
        <span className="public-ladder-embed-activity-dot" />
        Recent ladder activity
      </div>
      <div className="public-ladder-embed-ticker">
        <LadderNewsTicker isPublicView userPin="GUEST" />
      </div>

      <div className="public-ladder-embed-app">
        <LadderApp
          playerName="Guest"
          playerLastName="User"
          senderEmail="guest@frontrangepool.com"
          userPin="GUEST"
          onLogout={() => {}}
          isAdmin={false}
          showClaimForm={false}
          initialView="ladders"
          isPublicView={true}
          hidePublicNewsTicker={true}
          onClaimLadderPosition={() => {}}
          claimedPositions={[]}
          isPositionClaimed={() => false}
        />
      </div>
    </div>
  );
};

export default PublicLadderEmbed;
