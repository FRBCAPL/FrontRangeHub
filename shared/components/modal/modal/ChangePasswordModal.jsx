import React, { useState, useEffect } from 'react';
import DraggableModal from './DraggableModal';
import { supabase } from '@shared/config/supabase.js';
import supabaseAuthService from '@shared/services/services/supabaseAuthService.js';

const ChangePasswordModal = ({ isOpen, onClose, userEmail, onUserUpdate }) => {
  const [hasExistingPassword, setHasExistingPassword] = useState(null); // null = loading
  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'email'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alternateEmail, setAlternateEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authEmail = userEmail || alternateEmail;

  // Detect if user has email/password identity (vs OAuth-only like Google)
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNewEmail('');
    setConfirmNewEmail('');
    setAlternateEmail(userEmail || '');
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.identities?.length) {
        setHasExistingPassword(false);
        setAlternateEmail(user?.email || userEmail || '');
        return;
      }
      const hasEmailIdentity = user.identities.some(i => i.provider === 'email');
      setHasExistingPassword(hasEmailIdentity);
      setAlternateEmail(user?.email || userEmail || '');
    };
    setHasExistingPassword(null);
    setActiveTab('password');
    check();
  }, [isOpen, userEmail]);

  const handleAddAlternateLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!alternateEmail?.trim() || !newPassword || !confirmPassword) {
      setError('Email and password are required');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const result = await supabaseAuthService.addAlternateLogin(alternateEmail.trim(), newPassword);
      if (result.success) {
        setSuccess(result.message);
        setAlternateEmail('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (hasExistingPassword && !currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      if (hasExistingPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: currentPassword
        });
        if (signInError) {
          setError('Current password is incorrect');
          setLoading(false);
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError('Failed to update: ' + updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(hasExistingPassword ? 'Password changed successfully!' : 'Password set! You can now sign in with email and this password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError('An error occurred: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmedNew = newEmail?.trim();
    if (!trimmedNew || !confirmNewEmail?.trim()) {
      setError('New email and confirmation are required');
      return;
    }
    if (trimmedNew !== confirmNewEmail.trim()) {
      setError('Emails do not match');
      return;
    }
    if (trimmedNew === authEmail) {
      setError('New email is the same as current email');
      return;
    }
    if (!currentPassword) {
      setError('Current password is required to change email');
      return;
    }

    try {
      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: currentPassword
      });
      if (signInError) {
        setError('Current password is incorrect');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase.auth.updateUser({
        email: trimmedNew
      });

      if (updateError) {
        setError('Failed to update: ' + updateError.message);
        setLoading(false);
        return;
      }

      // Sync users table email for display
      if (user?.id) {
        await supabase.from('users').update({ email: trimmedNew }).eq('id', user.id);
      }

      setSuccess('Email updated! Use the new email for email/password sign-in. Google sign-in is unchanged.');
      setNewEmail('');
      setConfirmNewEmail('');
      setCurrentPassword('');
      setAlternateEmail(trimmedNew);
      onUserUpdate?.();
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError('An error occurred: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAddAlternate = hasExistingPassword === false;

  const inputStyle = {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #444',
    background: '#2a2a2a',
    color: '#fff'
  };

  const errorStyle = {
    background: 'rgba(220, 53, 69, 0.1)',
    border: '1px solid rgba(220, 53, 69, 0.3)',
    borderRadius: '4px',
    padding: '10px',
    marginBottom: '15px',
    color: '#dc3545'
  };

  const successStyle = {
    background: 'rgba(40, 167, 69, 0.1)',
    border: '1px solid rgba(40, 167, 69, 0.3)',
    borderRadius: '4px',
    padding: '10px',
    marginBottom: '15px',
    color: '#28a745'
  };

  const btnStyle = { flex: 1, padding: '10px', borderRadius: '4px', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title={isAddAlternate ? '🔐 Add Alternate Login' : '🔐 Login & Security'}
      maxWidth="400px"
    >
      <div style={{ padding: '20px' }}>
        <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.5 }}>
          {isAddAlternate
            ? 'Add an email and password so you can sign in either way. Your primary login (e.g. Google) stays the same.'
            : 'Manage your email/password login. Changes do not affect Google sign-in.'}
        </p>
        {hasExistingPassword === null ? (
          <p style={{ color: '#aaa', textAlign: 'center' }}>Loading...</p>
        ) : isAddAlternate ? (
          <form onSubmit={handleAddAlternateLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Alternate login email:</label>
              <input type="email" value={alternateEmail} onChange={(e) => setAlternateEmail(e.target.value)} placeholder="email@example.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Password:</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
              <small style={{ color: '#999', fontSize: '0.85rem' }}>Must be at least 6 characters</small>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Confirm Password:</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
            </div>
            {error && <div style={errorStyle}>❌ {error}</div>}
            {success && <div style={successStyle}>✅ {success}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={loading} style={{ ...btnStyle, background: loading ? '#666' : '#007bff' }}>{loading ? 'Adding...' : 'Add Alternate Login'}</button>
              <button type="button" onClick={onClose} style={{ ...btnStyle, background: 'transparent', border: '1px solid #444' }}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('password'); setError(''); setSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: activeTab === 'password' ? '1px solid #007bff' : '1px solid #444',
                  background: activeTab === 'password' ? 'rgba(0,123,255,0.2)' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('email'); setError(''); setSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: activeTab === 'email' ? '1px solid #007bff' : '1px solid #444',
                  background: activeTab === 'email' ? 'rgba(0,123,255,0.2)' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Change Email
              </button>
            </div>

            {activeTab === 'password' ? (
              <form onSubmit={handleChangePassword}>
                {hasExistingPassword && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Current Password:</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
                  </div>
                )}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>{hasExistingPassword ? 'New Password:' : 'Password:'}</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
                  <small style={{ color: '#999', fontSize: '0.85rem' }}>Must be at least 6 characters</small>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>{hasExistingPassword ? 'Confirm New Password:' : 'Confirm Password:'}</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
                </div>
                {error && <div style={errorStyle}>❌ {error}</div>}
                {success && <div style={successStyle}>✅ {success}</div>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={loading} style={{ ...btnStyle, background: loading ? '#666' : '#007bff' }}>
                    {loading ? (hasExistingPassword ? 'Changing...' : 'Setting...') : (hasExistingPassword ? 'Change Password' : 'Set Password')}
                  </button>
                  <button type="button" onClick={onClose} style={{ ...btnStyle, background: 'transparent', border: '1px solid #444' }}>Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangeEmail}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Current email (email/password login):</label>
                  <input type="email" value={authEmail} readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>New email:</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Confirm new email:</label>
                  <input type="email" value={confirmNewEmail} onChange={(e) => setConfirmNewEmail(e.target.value)} placeholder="new@example.com" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Current password:</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
                  <small style={{ color: '#999', fontSize: '0.85rem' }}>Required to verify your identity</small>
                </div>
                <p style={{ color: '#999', fontSize: '0.8rem', marginBottom: '16px' }}>
                  Only affects email/password sign-in. Google sign-in is unchanged.
                </p>
                {error && <div style={errorStyle}>❌ {error}</div>}
                {success && <div style={successStyle}>✅ {success}</div>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={loading} style={{ ...btnStyle, background: loading ? '#666' : '#007bff' }}>{loading ? 'Updating...' : 'Change Email'}</button>
                  <button type="button" onClick={onClose} style={{ ...btnStyle, background: 'transparent', border: '1px solid #444' }}>Cancel</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </DraggableModal>
  );
};

export default ChangePasswordModal;
