import React from 'react';
import { createPortal } from 'react-dom';
import LadderApp from '../ladder/LadderApp';

const PublicLadderModal = ({ 
  isOpen, 
  onClose, 
  guestUser, 
  guestHandlers 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        zIndex: 1000,
        paddingTop: '10px',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'linear-gradient(120deg, #232323 80%, #2a0909 100%)',
          borderRadius: '1.2rem',
          boxShadow: '0 0 32px #8B5CF6, 0 0 40px rgba(0,0,0,0.85)',
          width: '98vw',
          maxWidth: '98vw',
          minWidth: '98vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          padding: '0',
          margin: '0'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#8B5CF6',
            padding: '0.4rem 0.6rem',
            borderTopLeftRadius: '1.2rem',
            borderTopRightRadius: '1.2rem',
            cursor: 'default',
            userSelect: 'none',
            gap: '0.4rem'
          }}
        >
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>📊 Ladder Rankings - Public View</h2>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 5px',
              lineHeight: '1',
              transition: 'color 0.2s ease',
            }}
            onMouseOver={e => e.currentTarget.style.color = '#e53e3e'}
            onMouseOut={e => e.currentTarget.style.color = '#fff'}
          >
            &times;
          </button>
        </div>

        {/* Public View Notice */}
        <div style={{
          background: 'rgba(229, 62, 62, 0.1)',
          border: '1px solid rgba(229, 62, 62, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '0px',
          textAlign: 'center'
        }}>
          <span style={{
            color: '#e53e3e',
            fontWeight: '600'
          }}>
            👁️ Public View - Anyone can view the ladder rankings
          </span>
        </div>

        {/* Ladder App - Force full width */}
        <div 
          style={{
            flex: 1,
            overflow: 'visible',
            padding: '0',
            margin: '0',
            width: '100%',
            maxWidth: 'none',
            minWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <LadderApp
            playerName={guestUser?.firstName || 'Guest'}
            playerLastName={guestUser?.lastName || 'User'}
            senderEmail={guestUser?.email || 'guest@frontrangepool.com'}
            userPin={guestUser?.pin || 'GUEST'}
            onLogout={guestHandlers.onLogout}
            isAdmin={false}
            showClaimForm={false}
            initialView="ladders"
            isPublicView={true}
            onClaimLadderPosition={guestHandlers.handleClaimLadderPosition}
            claimedPositions={guestHandlers.claimedPositions}
            isPositionClaimed={guestHandlers.isPositionClaimed}
            onGuestLogin={guestHandlers.onGuestLogin}
            onGuestRegister={guestHandlers.onGuestRegister}
            onGuestLogout={guestHandlers.onGuestLogout}
            onGuestLoginSuccess={guestHandlers.onGuestLoginSuccess}
            onGuestRegisterSuccess={guestHandlers.onGuestRegisterSuccess}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PublicLadderModal;