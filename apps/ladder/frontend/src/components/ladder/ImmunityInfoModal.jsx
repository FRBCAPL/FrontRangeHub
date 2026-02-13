import React from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { formatDateForDisplay } from '@shared/utils/utils/dateUtils';

const IMMUNITY_DAYS = 7;

/**
 * Modal showing the user's immunity status (dates, days left) at the top,
 * then how immunity works below.
 */
const ImmunityInfoModal = ({ isOpen, onClose, immunityUntil, isAdminPreview }) => {
  if (!isOpen) return null;

  const expiryDate = immunityUntil ? new Date(immunityUntil) : null;
  const now = new Date();
  const isActive = expiryDate && expiryDate > now;
  const startDate = expiryDate ? new Date(expiryDate.getTime() - IMMUNITY_DAYS * 24 * 60 * 60 * 1000) : null;
  const daysLeft = expiryDate && isActive
    ? Math.max(0, Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000)))
    : null;

  return createPortal(
    <DraggableModal
      open={true}
      onClose={onClose}
      title="🛡️ Immunity"
      maxWidth="520px"
      borderColor="#8b5cf6"
      textColor="#ffffff"
      glowColor="#8b5cf6"
      zIndex={100000}
      style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        color: '#ffffff'
      }}
    >
      <div style={{ padding: '16px' }}>
        {/* User's immunity status at top */}
        <div
          style={{
            background: isActive || isAdminPreview ? 'rgba(139, 92, 246, 0.15)' : 'rgba(100, 100, 100, 0.15)',
            border: `1px solid ${isActive || isAdminPreview ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px'
          }}
        >
          <h3 style={{ color: '#c4b5fd', margin: '0 0 10px 0', fontSize: '1rem' }}>
            Your immunity status
          </h3>
          {isAdminPreview ? (
            <p style={{ color: '#e0e0e0', margin: 0, fontSize: '0.9rem' }}>
              Admin preview — no active immunity. When a player wins a match, they get 7 days of immunity.
            </p>
          ) : immunityUntil ? (
            <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: 1.6 }}>
              <div><strong>Date started:</strong> {formatDateForDisplay(startDate)}</div>
              <div><strong>Date expires:</strong> {formatDateForDisplay(immunityUntil)}</div>
              {daysLeft !== null && (
                <div>
                  <strong>Days left:</strong>{' '}
                  <span style={{ color: isActive ? '#a78bfa' : '#9ca3af' }}>
                    {isActive ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Expired'}
                  </span>
                </div>
              )}
              {!isActive && (
                <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                  Your immunity period has ended. You can be challenged again.
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem' }}>
              You do not currently have immunity.
            </p>
          )}
        </div>

        {/* How immunity works */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem' }}>How immunity works</h4>
          <div
            style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: '8px',
              padding: '12px'
            }}
          >
            <p style={{ color: '#e0e0e0', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
              When you win a match, you get <strong>{IMMUNITY_DAYS} days</strong> of immunity from new challenges.
            </p>
            <ul style={{ color: '#e0e0e0', paddingLeft: '18px', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
              <li>No one can challenge you during this time</li>
              <li>You can still challenge others</li>
              <li>You can still play and complete any already-scheduled matches</li>
              <li>After {IMMUNITY_DAYS} days, immunity ends and you can be challenged again</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Close
          </button>
        </div>
      </div>
    </DraggableModal>,
    document.body
  );
};

export default ImmunityInfoModal;
