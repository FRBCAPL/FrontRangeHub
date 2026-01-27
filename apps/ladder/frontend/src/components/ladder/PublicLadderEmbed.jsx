import React, { useState } from 'react';
import LadderApp from './LadderApp.jsx';

// This component renders the existing public ladder view without any authentication
const PublicLadderEmbed = () => {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#000',
      overflow: 'auto',
      padding: '20px',
      margin: 0,
      position: 'relative',
      top: 0,
      left: 0,
      boxSizing: 'border-box'
    }}>
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
        onClaimLadderPosition={() => {}}
        claimedPositions={[]}
        isPositionClaimed={() => false}
      />
    </div>
  );
};

export default PublicLadderEmbed;