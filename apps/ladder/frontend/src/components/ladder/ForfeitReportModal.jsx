import React, { useState, useRef } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import './ForfeitReportModal.css';

const ForfeitReportModal = ({ 
  isOpen, 
  onClose, 
  match, 
  currentUser,
  onForfeitSubmitted 
}) => {
  const [message, setMessage] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }
    
    setPhotoFile(file);
    setError('');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // Validate message
    if (!message || message.trim().length < 10) {
      setError('Please provide a detailed explanation (at least 10 characters)');
      setLoading(false);
      return;
    }

    // Validate photo
    if (!photoFile) {
      setError('Photo proof is required. Please upload a photo showing you at the venue.');
      setLoading(false);
      return;
    }

    try {
      // Determine which player didn't show up
      const player1Id = match.player1?._id || match.challenger?._id;
      const player2Id = match.player2?._id || match.defender?._id;
      const currentUserId = currentUser.playerId || currentUser._id;
      
      const noShowPlayerId = currentUserId === player1Id ? player2Id : player1Id;

      // Convert photo to base64
      const reader = new FileReader();
      reader.readAsDataURL(photoFile);
      
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result;
          
          // Submit forfeit request
          const result = await supabaseDataService.reportForfeit({
            matchId: match._id,
            reportedBy: currentUserId,
            noShowPlayer: noShowPlayerId,
            message: message.trim(),
            photoProof: base64Image
          });

          if (!result.success) {
            throw new Error(result.error || 'Failed to submit forfeit request');
          }

          if (onForfeitSubmitted) {
            onForfeitSubmitted(result);
          }
          
          // Reset form
          setMessage('');
          setPhotoFile(null);
          setPhotoPreview(null);
          
          onClose();
        } catch (err) {
          console.error('Error submitting forfeit request:', err);
          setError(err.message);
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read photo file');
        setLoading(false);
      };

    } catch (err) {
      console.error('Error preparing forfeit request:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen || !match) return null;

  // Determine opponent name
  const player1Id = match.player1?._id || match.challenger?._id;
  const player2Id = match.player2?._id || match.defender?._id;
  const currentUserId = currentUser.playerId || currentUser._id;
  
  const player1Name = match.player1 ? `${match.player1.firstName} ${match.player1.lastName}` : 
                      match.challenger ? `${match.challenger.firstName} ${match.challenger.lastName}` : 'Player 1';
  const player2Name = match.player2 ? `${match.player2.firstName} ${match.player2.lastName}` : 
                      match.defender ? `${match.defender.firstName} ${match.defender.lastName}` : 'Player 2';
  
  const opponentName = currentUserId === player1Id ? player2Name : player1Name;

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title="📝 Report No-Show"
      maxWidth="600px"
    >
      <div style={{ padding: '20px' }}>
        {/* Instructions */}
        <div style={{ 
          background: 'rgba(245, 158, 11, 0.1)', 
          border: '1px solid rgba(245, 158, 11, 0.3)', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ color: '#f59e0b', margin: '0 0 12px 0' }}>⚠️ Forfeit Report Instructions</h4>
          <ul style={{ color: '#e0e0e0', fontSize: '0.9rem', margin: '0', paddingLeft: '20px' }}>
            <li>You must have waited at least 30 minutes past scheduled match time</li>
            <li>Provide a detailed explanation of what happened</li>
            <li>Upload a photo showing you at the venue (required proof)</li>
            <li>Admin will review and approve/deny this forfeit request</li>
          </ul>
        </div>

        {/* Match Info */}
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)', 
          border: '1px solid rgba(59, 130, 246, 0.3)', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ color: '#3b82f6', margin: '0 0 8px 0' }}>Match Details</h4>
          <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
            <div><strong>Opponent:</strong> {opponentName}</div>
            <div><strong>Scheduled:</strong> {new Date(match.scheduledDate).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}</div>
            {match.venue && <div><strong>Location:</strong> {match.venue}</div>}
          </div>
        </div>

        {/* Message Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Explanation <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <p style={{ color: '#999', fontSize: '0.85rem', margin: '0 0 8px 0' }}>
            Explain what happened, how long you waited, any communication attempts, etc.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows="5"
            placeholder="Example: I arrived at Legends Brews & Cues at 7:00 PM as scheduled. I waited until 7:35 PM (35 minutes). I tried calling and texting but got no response. The venue staff can confirm I was here..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #444',
              background: '#333',
              color: '#fff',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          {message.length > 0 && message.length < 10 && (
            <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Message must be at least 10 characters
            </p>
          )}
        </div>

        {/* Photo Upload */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Photo Proof <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <p style={{ color: '#999', fontSize: '0.85rem', margin: '0 0 8px 0' }}>
            Upload a photo showing you at the venue (table, scoreboard, check-in, etc.)
          </p>
          
          {!photoPreview ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '40px',
                  borderRadius: '8px',
                  border: '2px dashed #666',
                  background: '#2a2a2a',
                  color: '#999',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.color = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#666';
                  e.target.style.color = '#999';
                }}
              >
                📸 Click to Upload Photo<br />
                <span style={{ fontSize: '0.85rem' }}>JPG, PNG, or HEIC (Max 5MB)</span>
              </button>
            </div>
          ) : (
            <div style={{ 
              position: 'relative',
              border: '2px solid #10b981',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <img 
                src={photoPreview} 
                alt="Forfeit proof" 
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  background: '#000'
                }} 
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(220, 38, 38, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
              <div style={{
                padding: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderTop: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '0.9rem',
                textAlign: 'center'
              }}>
                ✅ Photo uploaded - Ready to submit
              </div>
            </div>
          )}
        </div>

        {/* Penalty Warning */}
        <div style={{ 
          background: 'rgba(220, 38, 38, 0.1)', 
          border: '1px solid rgba(220, 38, 38, 0.3)', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>⚠️ Penalties for No-Show Player</h4>
          <p style={{ color: '#e0e0e0', fontSize: '0.9rem', margin: '0' }}>
            If approved by admin, {opponentName} will receive penalties based on their no-show history:
          </p>
          <ul style={{ color: '#e0e0e0', fontSize: '0.85rem', margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>1st offense:</strong> Forfeit loss + down 1 additional position</li>
            <li><strong>2nd offense (within 60 days):</strong> Forfeit loss + down 2 additional positions</li>
            <li><strong>3rd offense (within 60 days):</strong> Forfeit loss + down 1 position + 14-day suspension</li>
          </ul>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ 
            padding: '12px', 
            background: 'rgba(220, 38, 38, 0.1)', 
            border: '1px solid rgba(220, 38, 38, 0.3)', 
            borderRadius: '4px', 
            color: '#ff6b6b', 
            marginBottom: '20px',
            fontSize: '0.9rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          marginTop: '20px'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading || !message.trim() || message.length < 10 || !photoFile}
            style={{
              padding: '12px 24px',
              background: loading || !message.trim() || message.length < 10 || !photoFile ? '#666' : 
                         'linear-gradient(135deg, #dc2626, #991b1b)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !message.trim() || message.length < 10 || !photoFile ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Submitting...' : 'Submit Forfeit Report'}
          </button>
        </div>

        {/* Submission Info */}
        <p style={{ 
          color: '#999', 
          fontSize: '0.8rem', 
          margin: '12px 0 0 0',
          textAlign: 'center'
        }}>
          This report will be reviewed by an admin. You'll be notified when a decision is made.
        </p>
      </div>
    </DraggableModal>
  );
};

export default ForfeitReportModal;

