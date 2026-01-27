import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './dashboard.module.css';
import BilliardBall from '@shared/components/BilliardBall';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { BACKEND_URL } from '@shared/config/config.js';
import { LoadingButton } from '@shared/components/common/LoadingSpinner';

// Utility function to format date as MM-DD-YYYY
function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return 'N/A';
  
  // Handle YYYY-MM-DD format (which might be UTC)
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-');
    // Create date in local timezone to avoid UTC shift
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const localMonth = String(date.getMonth() + 1).padStart(2, '0');
    const localDay = String(date.getDate()).padStart(2, '0');
    const localYear = date.getFullYear();
    return `${localMonth}-${localDay}-${localYear}`;
  }
  
  // Handle different date formats
  let date;
  if (dateStr.includes('-')) {
    // Already in YYYY-MM-DD format
    date = new Date(dateStr);
  } else if (dateStr.includes('/')) {
    // Handle M/D/YYYY or MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      date = new Date(year, month - 1, day);
    } else {
      return dateStr; // Return as-is if can't parse
    }
  } else {
    return dateStr; // Return as-is if unknown format
  }
  
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if invalid date
  }
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}-${day}-${year}`;
}

export default function ProposalDetailsModal({ proposal, open, onClose, onEdit, onMessage }) {
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
  }, [open]);

  if (!open || !proposal) {
    return null;
  }

  const {
    senderName, receiverName, day, date, time, location,
    gameType, raceLength, message, proposalNote
  } = proposal;

  const isMobile = window.innerWidth <= 500;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/proposals/${proposal._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (!response.ok) throw new Error('Failed to confirm proposal');
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Failed to confirm proposal');
    } finally {
      setLoading(false);
    }
  }

  const modalContent = (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="🎱 Proposal Details"
      maxWidth={isMobile ? "99vw" : "480px"}
    >
      {proposal.isCounter && (
        <div style={{
          color: '#ff9800',
          fontWeight: 'bold',
          marginBottom: 8,
          fontSize: '1.05em',
          textAlign: 'center'
        }}>
          This is a counter proposal from {proposal.counteredBy || 'your opponent'}
        </div>
      )}
      <div style={{
        textAlign: 'left',
        marginBottom: isMobile ? '0.7rem' : '1.5rem',
        fontSize: isMobile ? '0.95rem' : '1.05rem',
        padding: isMobile ? '0.2rem 0.2rem' : undefined
      }}>
        <div className={styles.modalDetailRowSnazzy} style={{padding: isMobile ? '0.2em 0.3em' : undefined}}>
          <strong style={{color: '#e53e3e', minWidth: isMobile ? '80px' : '120px', fontSize: isMobile ? '0.95em' : undefined}}>You:</strong> 
          <span style={{color: '#fff', marginLeft: isMobile ? '4px' : '8px'}}>{senderName || 'N/A'}</span>
        </div>
        <div className={styles.modalDetailRowSnazzy} style={{padding: isMobile ? '0.2em 0.3em' : undefined}}>
          <strong style={{color: '#e53e3e', minWidth: isMobile ? '80px' : '120px', fontSize: isMobile ? '0.95em' : undefined}}>Opponent:</strong> 
          <span style={{color: '#fff', marginLeft: isMobile ? '4px' : '8px'}}>{receiverName || 'N/A'}</span>
        </div>
        {day && (
          <div className={styles.modalDetailRowSnazzy} style={{padding: isMobile ? '0.2em 0.3em' : undefined}}>
            <strong style={{color: '#e53e3e', minWidth: isMobile ? '80px' : '120px', fontSize: isMobile ? '0.95em' : undefined}}>Day:</strong> 
            <span style={{color: '#fff', marginLeft: isMobile ? '4px' : '8px'}}>{day}</span>
          </div>
        )}
        <div className={styles.modalDetailRowSnazzy} style={{padding: isMobile ? '0.2em 0.3em' : undefined}}>
          <strong style={{color: '#e53e3e', minWidth: isMobile ? '80px' : '120px', fontSize: isMobile ? '0.95em' : undefined}}>Date:</strong> 
          <span style={{color: '#fff', marginLeft: isMobile ? '4px' : '8px'}}>{formatDateMMDDYYYY(date)}</span>
        </div>
        <div className={styles.modalDetailRowSnazzy} style={{padding: isMobile ? '0.2em 0.3em' : undefined}}>
          <strong style={{color: '#e53e3e', minWidth: isMobile ? '80px' : '120px', fontSize: isMobile ? '0.95em' : undefined}}>Time:</strong> 
          <span style={{color: '#fff', marginLeft: isMobile ? '4px' : '8px'}}>{time || 'N/A'}</span>
        </div>
        <div className={styles.modalDetailRowSnazzy} style={{padding: isMobile ? '0.2em 0.3em' : undefined}}>
          <strong style={{color: '#e53e3e', minWidth: isMobile ? '80px' : '120px', fontSize: isMobile ? '0.95em' : undefined}}>Location:</strong> 
          <span style={{color: '#fff', marginLeft: isMobile ? '4px' : '8px'}}>{location || 'N/A'}</span>
        </div>
        {gameType && (
          <div className={styles.modalDetailRowSnazzy} style={{padding: isMobile ? '0.2em 0.3em' : undefined}}>
            <BilliardBall gameType={gameType} size={isMobile ? 12 : 16} />
            <strong style={{color: '#e53e3e', minWidth: isMobile ? '80px' : '120px', fontSize: isMobile ? '0.95em' : undefined}}>Game:</strong> 
            <span style={{color: '#fff', marginLeft: isMobile ? '4px' : '8px'}}>{gameType}</span>
          </div>
        )}
        {raceLength && (
          <div className={styles.modalDetailRowSnazzy} style={{padding: isMobile ? '0.2em 0.3em' : undefined}}>
            <strong style={{color: '#e53e3e', minWidth: isMobile ? '80px' : '120px', fontSize: isMobile ? '0.95em' : undefined}}>Race:</strong> 
            <span style={{color: '#fff', marginLeft: isMobile ? '4px' : '8px'}}>{raceLength}</span>
          </div>
        )}
        {proposalNote && (
          <div style={{
            margin: isMobile ? '8px 0 0 0' : '16px 0 0 0',
            padding: isMobile ? '0.4rem 0.5rem' : '0.8rem 1rem',
            background: 'rgba(255, 193, 7, 0.1)',
            borderLeft: '3px solid #ffc107',
            borderRadius: '6px',
            color: '#ffc107',
            fontSize: isMobile ? '0.9rem' : '0.95rem',
            textAlign: 'left'
          }}>
            <span role="img" aria-label="note">📝</span> <strong>Note:</strong><br />
            {proposalNote}
          </div>
        )}
      </div>
      <div style={{ 
        display: 'flex', 
        gap: isMobile ? 6 : 12, 
        justifyContent: 'center', 
        marginTop: isMobile ? 10 : 24, 
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center'
      }}>
        {onEdit && (
          <button 
            className={styles.dashboardBtn} 
            onClick={onEdit}
            style={{ 
              background: '#e53e3e', 
              color: '#fff',
              minWidth: isMobile ? '90px' : '120px',
              fontSize: isMobile ? '0.95em' : undefined,
              padding: isMobile ? '0.5em 0.7em' : undefined
            }}
          >
            Edit
          </button>
        )}
        {onMessage && (
          <button 
            className={styles.dashboardBtn} 
            onClick={onMessage}
            style={{ 
              background: '#007bff', 
              color: '#fff',
              minWidth: isMobile ? '90px' : '120px',
              fontSize: isMobile ? '0.95em' : undefined,
              padding: isMobile ? '0.5em 0.7em' : undefined
            }}
          >
            Msg
          </button>
        )}
        {proposal.isCounter && proposal.status === 'countered' && (
          <LoadingButton
            className={styles.dashboardBtn}
            onClick={handleConfirm}
            loading={loading}
            loadingText="Confirming..."
            disabled={loading}
            style={{
              background: '#43a047',
              color: '#fff',
              minWidth: isMobile ? '90px' : '120px',
              fontSize: isMobile ? '0.95em' : undefined,
              padding: isMobile ? '0.5em 0.7em' : undefined
            }}
          >
            Confirm
          </LoadingButton>
        )}
        <button 
          className={styles.dashboardBtn} 
          onClick={onClose}
          style={{ 
            background: '#6c757d', 
            color: '#fff',
            minWidth: isMobile ? '90px' : '120px',
            fontSize: isMobile ? '0.95em' : undefined,
            padding: isMobile ? '0.5em 0.7em' : undefined
          }}
        >
          Close
        </button>
      </div>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </DraggableModal>
  );

  return ReactDOM.createPortal(modalContent, document.body);
} 