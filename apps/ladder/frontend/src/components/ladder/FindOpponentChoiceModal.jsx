import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Lets a player choose between browsing the ladder or opening Smart Match.
 */
const FindOpponentChoiceModal = ({ isOpen, onClose, onBrowseLadder, onSmartMatch }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10055,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))',
        boxSizing: 'border-box'
      }}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)'
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-opponent-choice-title"
        style={{
          position: 'relative',
          width: 'min(400px, 100%)',
          borderRadius: '14px',
          border: '1px solid rgba(139,92,246,0.45)',
          background: 'rgba(15,23,42,0.98)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          padding: '18px 18px 16px',
          color: '#e2e8f0',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="find-opponent-choice-title"
          style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}
        >
          Find an opponent
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '0.9rem', lineHeight: 1.45, color: '#cbd5e1' }}>
          Choose how you want to find someone to challenge.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={onBrowseLadder}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(139,92,246,0.75)',
              background: 'rgba(139,92,246,0.4)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.92rem',
              textAlign: 'left'
            }}
          >
            Browse the ladder
            <span style={{ display: 'block', fontWeight: 500, fontSize: '0.78rem', color: '#c4b5fd', marginTop: '4px' }}>
              Open rankings and pick a player from the table
            </span>
          </button>
          <button
            type="button"
            onClick={onSmartMatch}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(59,130,246,0.55)',
              background: 'rgba(37,99,235,0.25)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.92rem',
              textAlign: 'left'
            }}
          >
            Use Smart Match
            <span style={{ display: 'block', fontWeight: 500, fontSize: '0.78rem', color: '#93c5fd', marginTop: '4px' }}>
              Get AI-style suggestions based on position and availability
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: '14px',
            width: '100%',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'transparent',
            color: '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
};

export default FindOpponentChoiceModal;
