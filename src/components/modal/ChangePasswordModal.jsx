import React, { useState } from 'react';
import DraggableModal from './DraggableModal';
import { supabase } from '../../config/supabase.js';

const ChangePasswordModal = ({ isOpen, onClose, userEmail }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setLoading(true);

      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword
      });

      if (signInError) {
        setError('Current password is incorrect');
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError('Failed to update password: ' + updateError.message);
        return;
      }

      setSuccess('Password changed successfully!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError('An error occurred: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title="🔐 Change Password"
      maxWidth="400px"
    >
      <div style={{ padding: '20px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
              Current Password:
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
              New Password:
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: '#fff'
              }}
            />
            <small style={{ color: '#999', fontSize: '0.85rem' }}>
              Must be at least 6 characters
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
              Confirm New Password:
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: '#fff'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '15px',
              color: '#dc3545'
            }}>
              ❌ {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(40, 167, 69, 0.1)',
              border: '1px solid rgba(40, 167, 69, 0.3)',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '15px',
              color: '#28a745'
            }}>
              ✅ {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: 'none',
                background: loading ? '#666' : '#007bff',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default ChangePasswordModal;
