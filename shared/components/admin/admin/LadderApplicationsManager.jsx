import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { BACKEND_URL } from '@shared/config/config.js';
import { supabase } from '@shared/config/supabase.js';
// Removed EmailJS import - now using Nodemailer backend

/**
 * Check if a user signed up via OAuth
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user has OAuth providers
 */
const checkIfOAuthUser = async (userId) => {
  try {
    // Check if user has auth_provider set (stored when they sign up via OAuth)
    const { data: user, error } = await supabase
      .from('users')
      .select('auth_provider')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error checking OAuth user:', error);
      return false;
    }
    
    // If auth_provider is set and not 'email', they signed up via OAuth
    return user?.auth_provider && user.auth_provider !== 'email';
  } catch (error) {
    console.error('Error checking OAuth user:', error);
    return false;
  }
};

const MOBILE_BREAKPOINT = 768;

const LadderApplicationsManager = ({ onClose, onPlayerApproved, userToken }) => {
  const authToken = userToken || localStorage.getItem('authToken');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [approvedCredentials, setApprovedCredentials] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [selectedLadder, setSelectedLadder] = useState('499-under');
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    if (!mq) return;
    const handle = () => setIsMobile(mq.matches);
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const result = await supabaseDataService.getLadderApplications();
      
      if (result.success) {
        setApplications(result.applications);
      } else {
        setError(result.error || 'Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMatchAndLink = async (app) => {
    if (!app.ladderMatch) return;
    try {
      setProcessing(true);
      setError('');
      const result = await supabaseDataService.attachSignupToLadderPosition(app.id, app.ladderMatch);
      if (!result.success) {
        throw new Error(result.error);
      }
      const data = { success: true, playerCreated: result.user, ladderProfile: result.ladderProfile };
      const isOAuthUser = await checkIfOAuthUser(data.playerCreated?.id);
      if (!isOAuthUser) {
        try {
          await supabase.auth.resetPasswordForEmail(data.playerCreated?.email, {
            redirectTo: `${window.location.origin}/#/reset-password`
          });
        } catch (e) {
          console.error('Password reset email:', e);
        }
      }
      try {
        const emailData = {
          to_email: data.playerCreated?.email,
          to_name: `${data.playerCreated?.first_name || data.playerCreated?.firstName || ''} ${data.playerCreated?.last_name || data.playerCreated?.lastName || ''}`.trim(),
          ladder_name: data.ladderProfile?.ladder_name || '499-under',
          position: data.ladderProfile?.position || 'TBD',
          app_url: window.location.origin,
          isOAuthUser,
          authProvider: isOAuthUser ? (data.playerCreated?.auth_provider || 'oauth') : null
        };
        const r = await fetch(`${BACKEND_URL}/api/email/send-ladder-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailData)
        });
        setEmailStatus(r.ok ? 'sent' : 'failed');
      } catch (e) {
        setEmailStatus('failed');
      }
      setApprovedCredentials(data.playerCreated);
      setShowCredentialsModal(true);
      await fetchApplications();
      setSelectedApplication(null);
      if (onPlayerApproved) onPlayerApproved();
    } catch (err) {
      setError(err.message || 'Failed to link account.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      setProcessing(true);
      // Approve user and add to ladder
      const approveResult = await supabaseDataService.approveUser(userId);
      
      if (!approveResult.success) {
        throw new Error('Failed to approve user');
      }

      // Add to selected ladder
      const ladderResult = await supabaseDataService.addUserToLadder(userId, selectedLadder);
      
      if (!ladderResult.success) {
        throw new Error('Failed to add user to ladder');
      }

      const data = {
        success: true,
        playerCreated: approveResult.user,
        ladderProfile: ladderResult.ladderProfile
      };
      
      if (data.success) {
        // Check if user signed up via OAuth - if so, skip password reset
        const isOAuthUser = await checkIfOAuthUser(data.playerCreated?.id);
        
        if (!isOAuthUser) {
          // Only send password reset for non-OAuth users
          try {
            const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
              data.playerCreated?.email,
              {
                redirectTo: `${window.location.origin}/#/reset-password`
              }
            );
            if (resetError) {
              console.error('Failed to send password reset:', resetError);
            } else {
              console.log('📧 Password reset email sent successfully');
            }
          } catch (resetError) {
            console.error('Failed to send password reset:', resetError);
          }
        } else {
          console.log('✅ OAuth user detected - skipping password reset email');
        }

        // Try to send approval email notification using Nodemailer
        try {
          // Get auth provider info if OAuth user
          let authProvider = null;
          if (isOAuthUser) {
            authProvider = data.playerCreated?.auth_provider || 'oauth';
          }
          
          const emailData = {
            to_email: data.playerCreated?.email,
            to_name: `${data.playerCreated?.firstName} ${data.playerCreated?.lastName}`,
            ladder_name: data.ladderProfile?.ladder_name || '499-under',
            position: data.ladderProfile?.position || 'TBD',
            app_url: window.location.origin,
            isOAuthUser: isOAuthUser, // Pass OAuth status to email template
            authProvider: authProvider // Pass the OAuth provider (google, facebook, etc.)
          };

          console.log('📧 Attempting to send approval email with data:', emailData);

          const emailResponse = await fetch(`${BACKEND_URL}/api/email/send-ladder-approval`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
          });

          const emailResult = await emailResponse.json();
          console.log('📧 Email response:', emailResult);

          if (emailResponse.ok) {
            setEmailStatus('sent');
            console.log('📧 Ladder approval email sent successfully');
          } else {
            setEmailStatus('failed');
            console.error('📧 Email sending failed:', emailResult);
          }
        } catch (emailError) {
          console.error('📧 Email sending failed:', emailError);
          setEmailStatus('failed');
        }
        
        // Show credentials modal
        setApprovedCredentials(data.playerCreated);
        setShowCredentialsModal(true);
        
        // Refresh the applications list
        await fetchApplications();
        setSelectedApplication(null);
        
        // Notify parent component to refresh ladder data
        if (onPlayerApproved) {
          onPlayerApproved();
        }
      } else {
        setError(data.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      setError('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (userId, reason) => {
    try {
      setProcessing(true);
      const result = await supabaseDataService.rejectUser(userId);
      
      if (result.success) {
        // Refresh the applications list
        await fetchApplications();
        setSelectedApplication(null);
      } else {
        setError(result.error || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      setError('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffa726';
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      default: return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '⏳ Pending';
      case 'approved': return '✅ Approved';
      case 'rejected': return '❌ Rejected';
      default: return 'Unknown';
    }
  };

  return createPortal(
    <>
      <DraggableModal
      open={true}
      onClose={onClose}
      title="Pending Ladder Applications"
      maxWidth={isMobile ? '100vw' : '95vw'}
      maxHeight={isMobile ? '100dvh' : '95vh'}
      borderColor="#6366f1"
      textColor="#ffffff"
      glowColor="#6366f1"
      style={isMobile ? { width: '100%', height: '100%', maxHeight: '100dvh' } : { width: '95vw', height: '95vh' }}
    >
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          height: '100%',
          gap: isMobile ? '0' : '1.25rem',
          padding: isMobile ? '0.75rem' : '1.25rem',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Left Side - Applications List (hidden on mobile when detail is shown) */}
          <div style={{ 
            display: isMobile && selectedApplication ? 'none' : 'flex',
            flex: isMobile ? '1 1 auto' : '0 0 380px',
            minWidth: 0,
            minHeight: isMobile ? 0 : undefined,
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            {loading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                color: 'rgba(255,255,255,0.7)',
                fontSize: '1rem',
                gap: '0.75rem'
              }}>
                <div style={{ width: 28, height: 28, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                Loading applications…
              </div>
            ) : applications.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                color: 'rgba(255,255,255,0.5)',
                fontSize: '1rem',
                textAlign: 'center',
                padding: '1rem'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', opacity: 0.6 }}>✓</div>
                No pending applications
              </div>
            ) : (
              <>
                <div style={{
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', fontWeight: 600 }}>
                    {applications.length} pending
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.8rem' : '0.875rem', marginLeft: '0.5rem' }}>
                    — {isMobile ? 'tap one to review' : 'click one to review'}
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {applications.map((app) => {
                    const isSelected = selectedApplication?.id === app.id;
                    const hasLeague = app.currentLeague && app.currentLeague !== 'Not provided';
                    const paymentLabel = app.payNow === undefined ? 'Unknown' : app.payNow ? '$5/mo' : 'Free';
                    const paymentOk = app.payNow === true;
                    return (
                      <div 
                        key={app.id} 
                        onClick={() => setSelectedApplication(isSelected ? null : app)}
                        style={{
                          background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: isMobile ? '1rem 1rem' : '0.875rem 1rem',
                          marginBottom: isMobile ? '0.6rem' : '0.5rem',
                          cursor: 'pointer',
                          transition: 'background 0.2s, border-color 0.2s',
                          minHeight: isMobile ? 44 : undefined
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                          <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                            {app.firstName} {app.lastName}
                          </span>
                          <span style={{
                            background: 'rgba(251, 191, 36, 0.2)',
                            color: '#fcd34d',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}>
                            Pending
                          </span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                          {app.email}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {app.ladderMatch && (
                            <span style={{
                              background: 'rgba(251, 191, 36, 0.25)',
                              color: '#fcd34d',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }} title={`Match on ladder: #${app.ladderMatch.position} ${app.ladderMatch.ladder_name}`}>
                              ⚠️ Match on ladder
                            </span>
                          )}
                          {app.experience && (
                            <span style={{
                              background: 'rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.7)',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              textTransform: 'capitalize'
                            }}>
                              {app.experience}
                            </span>
                          )}
                          <span style={{
                            background: hasLeague ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.08)',
                            color: hasLeague ? '#86efac' : 'rgba(255,255,255,0.55)',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem'
                          }}>
                            {hasLeague ? 'League' : 'No league'}
                          </span>
                          <span style={{
                            background: paymentOk ? 'rgba(34, 197, 94, 0.2)' : app.payNow === undefined ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
                            color: paymentOk ? '#86efac' : app.payNow === undefined ? '#fcd34d' : 'rgba(255,255,255,0.55)',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem'
                          }}>
                            {paymentLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right Side - Application Details (on mobile, only when an app is selected) */}
          <div style={{ 
            display: isMobile && !selectedApplication ? 'none' : 'flex',
            flex: 1,
            minWidth: 0,
            minHeight: isMobile ? 0 : undefined,
            background: isMobile ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
            borderRadius: isMobile ? 0 : '12px',
            padding: isMobile ? '0.5rem 0 0' : '1.5rem',
            border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
            overflowY: 'auto',
            flexDirection: 'column',
            WebkitOverflowScrolling: 'touch'
          }}>
            {selectedApplication ? (
              <div>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setSelectedApplication(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '1rem',
                      padding: '0.5rem 0',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      minHeight: 44
                    }}
                  >
                    ← Back to list
                  </button>
                )}
                <h3 style={{ 
                  color: '#fff', 
                  margin: '0 0 1rem 0',
                  fontSize: isMobile ? '1.1rem' : '1.2rem',
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  paddingBottom: '0.75rem'
                }}>
                  {selectedApplication.firstName} {selectedApplication.lastName}
                </h3>

                {selectedApplication.ladderMatch && (
                  <div style={{
                    background: 'rgba(251, 191, 36, 0.15)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    color: '#fcd34d',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem'
                  }}>
                    <strong>⚠️ Match on ladder:</strong> A player named {selectedApplication.ladderMatch.existingName} is already on the ladder (position #{selectedApplication.ladderMatch.position}, {selectedApplication.ladderMatch.ladder_name}). This applicant may have signed up as new instead of claiming.
                  </div>
                )}
                
                {/* Application Details - Simplified Layout */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  padding: isMobile ? '1rem 1rem' : '1.25rem 1.5rem',
                  marginBottom: isMobile ? '1rem' : '1.5rem',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? '1rem' : '1.5rem 2rem',
                    marginBottom: isMobile ? '1rem' : '1.25rem'
                  }}>
                    {/* Personal Info */}
                    <div>
                      <h4 style={{ 
                        color: 'rgba(255,255,255,0.5)', 
                        margin: '0 0 0.75rem 0', 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}>
                        Personal info
                      </h4>
                      <div style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.7', fontSize: '0.9rem' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Name</span>
                          {selectedApplication.firstName} {selectedApplication.lastName}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Email</span>
                          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{selectedApplication.email}</span>
                        </div>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Phone</span>
                          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{selectedApplication.phone || '—'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Skill Info */}
                    <div>
                      <h4 style={{ 
                        color: 'rgba(255,255,255,0.5)', 
                        margin: '0 0 0.75rem 0', 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}>
                        Skill info
                      </h4>
                      <div style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.7', fontSize: '0.9rem' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Experience</span>
                          <span style={{ textTransform: 'capitalize' }}>{selectedApplication.experience}</span>
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Fargo</span>
                          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{selectedApplication.fargoRate || '—'}</span>
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>League</span>
                          <span style={{ 
                            color: selectedApplication.currentLeague && selectedApplication.currentLeague !== 'Not provided' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(255,255,255,0.5)'
                          }}>
                            {selectedApplication.currentLeague && selectedApplication.currentLeague !== 'Not provided' ? 
                              selectedApplication.currentLeague : 
                              'Not provided'
                            }
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Ranking</span>
                          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{selectedApplication.currentRanking || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '1.25rem'
                  }}>
                    <h4 style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      margin: '0 0 0.75rem 0', 
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}>
                      Payment
                    </h4>
                    <div style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.7', fontSize: '0.9rem' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Required</span>
                        <span style={{ color: selectedApplication.payNow ? 'rgba(34, 197, 94, 0.9)' : 'rgba(255,255,255,0.6)' }}>
                          {selectedApplication.payNow ? '$5/month' : 'Free'}
                        </span>
                      </div>
                      {selectedApplication.paymentMethod && (
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Method</span>
                          <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {selectedApplication.paymentMethod === 'venmo' && 'Venmo'}
                            {selectedApplication.paymentMethod === 'cashapp' && 'Cash App'}
                            {selectedApplication.paymentMethod === 'creditCard' && 'Credit Card'}
                            {selectedApplication.paymentMethod === 'applePay' && 'Apple Pay'}
                            {selectedApplication.paymentMethod === 'googlePay' && 'Google Pay'}
                            {selectedApplication.paymentMethod === 'cash' && 'Cash'}
                            {selectedApplication.paymentMethod === 'check' && 'Check'}
                            {!['venmo', 'cashapp', 'creditCard', 'applePay', 'googlePay', 'cash', 'check'].includes(selectedApplication.paymentMethod) && selectedApplication.paymentMethod}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(selectedApplication.status === 'pending' || selectedApplication.is_pending_approval) && (
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '1.25rem',
                    marginTop: '0.5rem'
                  }}>
                    <h4 style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      margin: '0 0 0.75rem 0', 
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}>
                      Actions
                    </h4>
                    
                    {/* Ladder Selection */}
                    <div style={{
                      marginBottom: '1rem',
                      padding: isMobile ? '1rem' : '0.875rem 1rem',
                      background: 'rgba(99, 102, 241, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                      <label style={{
                        display: 'block',
                        color: 'rgba(255,255,255,0.7)',
                        fontWeight: 500,
                        marginBottom: '0.5rem',
                        fontSize: isMobile ? '0.9rem' : '0.875rem'
                      }}>
                        Ladder to add player to
                      </label>
                      <select
                        value={selectedLadder}
                        onChange={(e) => setSelectedLadder(e.target.value)}
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.75rem 1rem' : '0.6rem 0.75rem',
                          minHeight: isMobile ? 44 : undefined,
                          background: 'rgba(0, 0, 0, 0.25)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          fontSize: isMobile ? '1rem' : '0.9rem'
                        }}
                      >
                        <option value="499-under">499 & Under</option>
                        <option value="500-549">500-549</option>
                        <option value="550-599">550-599</option>
                        <option value="600-plus">600+</option>
                        <option value="test-ladder">Test Ladder</option>
                      </select>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '0.5rem' : '0.75rem',
                      justifyContent: 'flex-start',
                      alignItems: 'stretch',
                      marginBottom: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      {selectedApplication.ladderMatch && (
                        <button
                          onClick={() => handleConfirmMatchAndLink(selectedApplication)}
                          disabled={processing}
                          style={{
                            padding: isMobile ? '0.85rem 1.25rem' : '0.65rem 1.25rem',
                            minHeight: isMobile ? 44 : undefined,
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#86efac',
                            border: '1px solid rgba(34, 197, 94, 0.5)',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: processing ? 'not-allowed' : 'pointer',
                            transition: 'opacity 0.2s',
                            minWidth: isMobile ? undefined : '180px'
                          }}
                        >
                          {processing ? '…' : '✓ Confirm match & link'}
                        </button>
                      )}
                      <button
                        onClick={() => handleReject(selectedApplication.id, 'Application rejected by admin')}
                        disabled={processing}
                        style={{
                          padding: isMobile ? '0.85rem 1.25rem' : '0.65rem 1.25rem',
                          minHeight: isMobile ? 44 : undefined,
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#fca5a5',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: processing ? 'not-allowed' : 'pointer',
                          transition: 'opacity 0.2s',
                          minWidth: isMobile ? undefined : '100px'
                        }}
                      >
                        {processing ? '…' : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleApprove(selectedApplication.id)}
                        disabled={processing}
                        style={{
                          padding: isMobile ? '0.85rem 1.25rem' : '0.65rem 1.25rem',
                          minHeight: isMobile ? 44 : undefined,
                          background: '#6366f1',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: processing ? 'not-allowed' : 'pointer',
                          transition: 'opacity 0.2s',
                          minWidth: isMobile ? undefined : '100px'
                        }}
                      >
                        {processing ? '…' : 'Approve'}
                      </button>
                    </div>
                    <p style={{ 
                      color: 'rgba(255,255,255,0.4)', 
                      margin: 0,
                      fontSize: '0.8rem'
                    }}>
                      Approving activates their account for league access.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.95rem',
                textAlign: 'center',
                padding: '2rem'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  fontSize: '1.75rem'
                }}>
                  📋
                </div>
                <div style={{ fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem' }}>
                  Select an application
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Review details, choose a ladder, then approve or reject.
                </div>
              </div>
            )}
          </div>
        </div>
      </DraggableModal>

      {/* Credentials Modal - Only this one remains as a separate modal */}
      {showCredentialsModal && approvedCredentials && (
        <DraggableModal
          open={showCredentialsModal}
          onClose={() => setShowCredentialsModal(false)}
          title="✅ Application Approved - Login Credentials"
          maxWidth="500px"
        >
          <div style={{ padding: '1rem' }}>
            <div style={{
              background: 'linear-gradient(45deg, #4CAF50, #45a049)',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>🎉 Application Approved!</h3>
              <p style={{ margin: 0, fontSize: '1rem' }}>
                Player has been added to the ladder and can now log in.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#2196F3', margin: '0 0 1rem 0' }}>📧 Login Credentials:</h4>
              <div style={{ color: '#ccc' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Email:</strong> {approvedCredentials.email}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>PIN:</strong> <span style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}>{approvedCredentials.pin}</span>
                </div>
              </div>
            </div>

            {emailStatus && (
              <div style={{
                background: emailStatus === 'sent' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                border: `1px solid ${emailStatus === 'sent' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
                color: emailStatus === 'sent' ? '#4CAF50' : '#ff6b6b',
                padding: '0.8rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {emailStatus === 'sent' ? '✅ Email notification sent successfully' : '❌ Failed to send email notification'}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <button
                onClick={() => setShowCredentialsModal(false)}
                style={{
                  padding: '0.8rem 1.5rem',
                  background: 'rgba(33, 150, 243, 0.2)',
                  color: '#2196F3',
                  border: '1px solid #2196F3',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </DraggableModal>
      )}
    </>,
    document.body
  );
};

export default LadderApplicationsManager;