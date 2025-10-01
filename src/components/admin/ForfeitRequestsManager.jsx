import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config.js';
import './ForfeitRequestsManager.css';

const ForfeitRequestsManager = ({ userPin }) => {
  const [forfeitRequests, setForfeitRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadForfeitRequests();
  }, []);

  const loadForfeitRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/forfeit/pending`);
      
      if (response.ok) {
        const data = await response.json();
        setForfeitRequests(data);
      } else {
        console.error('Failed to load forfeit requests');
      }
    } catch (error) {
      console.error('Error loading forfeit requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    if (!confirm(`Approve forfeit request?\n\nNo-show player: ${request.noShowPlayer.firstName} ${request.noShowPlayer.lastName}\nOffense: ${request.noShowOffenseNumber}${request.noShowOffenseNumber === 1 ? 'st' : request.noShowOffenseNumber === 2 ? 'nd' : 'rd'}\nPenalty: ${request.recommendedPenalty?.positionsDown} position${request.recommendedPenalty?.positionsDown > 1 ? 's' : ''} down${request.recommendedPenalty?.suspended ? ' + 14-day suspension' : ''}`)) {
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/forfeit/${request._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminNotes: adminNotes.trim() || 'Forfeit approved',
          reviewedBy: userPin // Or use admin user ID
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve forfeit');
      }

      setMessage('✅ Forfeit approved successfully!');
      setSelectedRequest(null);
      setAdminNotes('');
      await loadForfeitRequests();
    } catch (error) {
      console.error('Error approving forfeit:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async (request) => {
    const reason = prompt('Reason for denying this forfeit request?');
    
    if (!reason) return;

    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/forfeit/${request._id}/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminNotes: reason,
          reviewedBy: userPin
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to deny forfeit');
      }

      setMessage('❌ Forfeit request denied');
      setSelectedRequest(null);
      await loadForfeitRequests();
    } catch (error) {
      console.error('Error denying forfeit:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#e0e0e0' }}>Loading forfeit requests...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#e0e0e0', marginBottom: '20px' }}>
        📝 Forfeit Requests ({forfeitRequests.length} pending)
      </h2>

      {message && (
        <div style={{ 
          padding: '12px', 
          background: message.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
          border: `1px solid ${message.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`, 
          borderRadius: '4px', 
          color: message.startsWith('✅') ? '#10b981' : '#ff6b6b',
          marginBottom: '20px'
        }}>
          {message}
        </div>
      )}

      {forfeitRequests.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#999',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px'
        }}>
          ✅ No pending forfeit requests
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {forfeitRequests.map((request) => (
            <div 
              key={request._id}
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '20px'
              }}
            >
              {/* Match Info */}
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ color: '#e0e0e0', margin: '0 0 8px 0', fontSize: '1.1rem' }}>
                  {request.reportedBy.firstName} {request.reportedBy.lastName} vs {request.noShowPlayer.firstName} {request.noShowPlayer.lastName}
                </h3>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>
                  <div><strong>Reported:</strong> {new Date(request.reportedAt).toLocaleString()}</div>
                  <div><strong>Scheduled:</strong> {new Date(request.matchId?.scheduledDate).toLocaleString()}</div>
                  {request.matchId?.venue && <div><strong>Location:</strong> {request.matchId.venue}</div>}
                </div>
              </div>

              {/* No-Show Player Info */}
              <div style={{ 
                background: 'rgba(220, 38, 38, 0.1)', 
                border: '1px solid rgba(220, 38, 38, 0.3)', 
                borderRadius: '8px', 
                padding: '12px', 
                marginBottom: '16px' 
              }}>
                <h4 style={{ color: '#dc2626', margin: '0 0 8px 0', fontSize: '1rem' }}>
                  ⚠️ No-Show Player: {request.noShowPlayer.firstName} {request.noShowPlayer.lastName}
                </h4>
                <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                  <div><strong>Current Position:</strong> #{request.noShowPlayer.position}</div>
                  <div><strong>No-Shows in Last 60 Days:</strong> {request.noShowPlayerInfo?.recentNoShows || 0}</div>
                  <div><strong>This Would Be:</strong> {request.noShowOffenseNumber}
                    {request.noShowOffenseNumber === 1 ? 'st' : request.noShowOffenseNumber === 2 ? 'nd' : 'rd'} offense
                  </div>
                </div>
              </div>

              {/* Recommended Penalty */}
              <div style={{ 
                background: 'rgba(245, 158, 11, 0.1)', 
                border: '1px solid rgba(245, 158, 11, 0.3)', 
                borderRadius: '8px', 
                padding: '12px', 
                marginBottom: '16px' 
              }}>
                <h4 style={{ color: '#f59e0b', margin: '0 0 8px 0', fontSize: '1rem' }}>
                  📊 Recommended Penalty
                </h4>
                <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                  <div><strong>Positions Down:</strong> {request.recommendedPenalty?.positionsDown || 1}</div>
                  {request.recommendedPenalty?.suspended && (
                    <div style={{ color: '#dc2626', fontWeight: 'bold' }}>
                      <strong>⚠️ SUSPENSION:</strong> 14 days
                    </div>
                  )}
                </div>
              </div>

              {/* Reporter's Message */}
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.1)', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                borderRadius: '8px', 
                padding: '12px', 
                marginBottom: '16px' 
              }}>
                <h5 style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                  Message from {request.reportedBy.firstName} {request.reportedBy.lastName}:
                </h5>
                <p style={{ color: '#e0e0e0', fontSize: '0.9rem', margin: '0', whiteSpace: 'pre-wrap' }}>
                  {request.message}
                </p>
              </div>

              {/* Photo Proof */}
              {request.photoUrl && (
                <div style={{ marginBottom: '16px' }}>
                  <h5 style={{ color: '#e0e0e0', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                    📸 Photo Proof:
                  </h5>
                  <div style={{ 
                    border: '2px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.open(request.photoUrl, '_blank')}
                  >
                    <img 
                      src={request.photoUrl} 
                      alt="Forfeit proof" 
                      style={{ 
                        width: '100%', 
                        height: 'auto',
                        maxHeight: '300px',
                        objectFit: 'contain',
                        background: '#000'
                      }} 
                    />
                    <div style={{
                      padding: '8px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderTop: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#3b82f6',
                      fontSize: '0.85rem',
                      textAlign: 'center'
                    }}>
                      Click to view full size
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows="2"
                  placeholder="Add any notes about this decision..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    background: '#333',
                    color: '#fff',
                    resize: 'vertical',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleDeny(request)}
                  disabled={processing}
                  style={{
                    padding: '10px 20px',
                    background: processing ? '#666' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 'bold'
                  }}
                >
                  ❌ Deny
                </button>
                
                <button
                  onClick={() => handleApprove(request)}
                  disabled={processing}
                  style={{
                    padding: '10px 20px',
                    background: processing ? '#666' : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 'bold'
                  }}
                >
                  {processing ? 'Processing...' : '✅ Approve Forfeit'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ForfeitRequestsManager;

