import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import './PendingClaimsManager.css';

const PendingClaimsManager = ({ onClose }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [approvalPin, setApprovalPin] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingClaims();
  }, []);

  const fetchPendingClaims = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/pending-claims`);
      const data = await response.json();

      if (response.ok && data.success) {
        setClaims(data.claims);
      } else {
        setError(data.message || 'Error fetching pending claims');
      }
    } catch (error) {
      console.error('Fetch claims error:', error);
      setError('Error fetching pending claims');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claimId) => {
    if (!approvalPin.trim()) {
      setError('Please enter a PIN for the user');
      return;
    }

    if (approvalPin.length < 4) {
      setError('PIN must be at least 4 characters');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/approve-account-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId: claimId,
          pin: approvalPin
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Remove the approved claim from the list
        setClaims(prev => prev.filter(claim => claim.id !== claimId));
        setSelectedClaim(null);
        setApprovalPin('');
        alert('Account claim approved successfully!');
      } else {
        setError(data.message || 'Error approving claim');
      }
    } catch (error) {
      console.error('Approve error:', error);
      setError('Error approving claim');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (claimId) => {
    if (!confirm('Are you sure you want to reject this account claim? This action cannot be undone.')) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reject-account-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId: claimId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Remove the rejected claim from the list
        setClaims(prev => prev.filter(claim => claim.id !== claimId));
        setSelectedClaim(null);
        alert('Account claim rejected successfully!');
      } else {
        setError(data.message || 'Error rejecting claim');
      }
    } catch (error) {
      console.error('Reject error:', error);
      setError('Error rejecting claim');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="pending-claims-overlay">
        <div className="pending-claims-modal">
          <div className="loading">Loading pending claims...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-claims-overlay">
      <div className="pending-claims-modal">
        <div className="pending-claims-header">
          <h2>Pending Account Claims</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="pending-claims-content">
          {error && <div className="error-message">{error}</div>}

          {claims.length === 0 ? (
            <div className="no-claims">
              <p>No pending account claims</p>
            </div>
          ) : (
            <div className="claims-list">
              {claims.map((claim) => (
                <div key={claim.id} className="claim-item">
                  <div className="claim-header">
                    <h3>{claim.firstName} {claim.lastName}</h3>
                    <span className="claim-date">{formatDate(claim.submittedAt)}</span>
                  </div>

                  <div className="claim-details">
                    <div className="contact-info">
                      <p><strong>Email:</strong> {claim.email}</p>
                      {claim.phone && <p><strong>Phone:</strong> {claim.phone}</p>}
                    </div>

                    {claim.ladderInfo && (
                      <div className="ladder-info">
                        <p><strong>Ladder Position:</strong> #{claim.ladderInfo.position}</p>
                        <p><strong>Fargo Rate:</strong> {claim.ladderInfo.fargoRate}</p>
                        <p><strong>Record:</strong> {claim.ladderInfo.wins}W - {claim.ladderInfo.losses}L</p>
                      </div>
                    )}

                    {claim.claimMessage && (
                      <div className="claim-message">
                        <p><strong>Message:</strong></p>
                        <p>{claim.claimMessage}</p>
                      </div>
                    )}
                  </div>

                  <div className="claim-actions">
                    <button
                      className="approve-btn"
                      onClick={() => setSelectedClaim(claim)}
                      disabled={processing}
                    >
                      Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleReject(claim.id)}
                      disabled={processing}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Modal */}
        {selectedClaim && (
          <div className="approval-modal-overlay">
            <div className="approval-modal">
              <div className="approval-modal-header">
                <h3>Approve Account for {selectedClaim.firstName} {selectedClaim.lastName}</h3>
                <button className="close-btn" onClick={() => setSelectedClaim(null)}>&times;</button>
              </div>
              
              <div className="approval-modal-content">
                <p>Set a PIN for this user:</p>
                <div className="form-group">
                  <input
                    type="text"
                    value={approvalPin}
                    onChange={(e) => setApprovalPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    maxLength="4"
                    pattern="[0-9]*"
                  />
                </div>
                
                <div className="approval-modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setSelectedClaim(null);
                      setApprovalPin('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-approve-btn"
                    onClick={() => handleApprove(selectedClaim.id)}
                    disabled={processing || approvalPin.length < 4}
                  >
                    {processing ? 'Approving...' : 'Approve Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingClaimsManager;
