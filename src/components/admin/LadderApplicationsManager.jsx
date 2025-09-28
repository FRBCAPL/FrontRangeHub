import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config.js';
import DraggableModal from '../modal/DraggableModal';
// Removed EmailJS import - now using Nodemailer backend

const LadderApplicationsManager = ({ onClose, onPlayerApproved }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [approvedCredentials, setApprovedCredentials] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/signup-applications/pending`);
      const data = await response.json();
      
      if (response.ok) {
        setApplications(data);
      } else {
        setError(data.message || 'Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId) => {
    try {
      setProcessing(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/signup-applications/${applicationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        // Try to send email notification using Nodemailer
        try {
          const emailData = {
            to_email: data.playerCreated?.email,
            to_name: `${data.playerCreated?.firstName} ${data.playerCreated?.lastName}`,
            pin: data.playerCreated?.pin,
            ladder_name: data.playerCreated?.ladderName || 'Ladder of Legends',
            position: data.playerCreated?.position,
            login_url: window.location.origin
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

  const handleReject = async (applicationId, reason) => {
    try {
      setProcessing(true);
      const response = await fetch(`${BACKEND_URL}/api/ladder/admin/signup-applications/${applicationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Refresh the applications list
        await fetchApplications();
        setSelectedApplication(null);
      } else {
        setError(data.message || 'Failed to reject application');
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

  return (
    <>
      <DraggableModal
        open={true}
        onClose={onClose}
        title="📋 Pending Ladder Applications"
        maxWidth="1200px"
        maxHeight="800px"
        borderColor="#8b5cf6"
        textColor="#ffffff"
        glowColor="#8b5cf6"
      >
        <div style={{ 
          display: 'flex', 
          height: '100%',
          gap: '1rem',
          padding: '1rem'
        }}>
          {/* Left Side - Applications List */}
          <div style={{ 
            flex: '1',
            minWidth: '500px'
          }}>
            {error && (
              <div style={{
                background: 'rgba(244, 67, 54, 0.2)',
                border: '1px solid rgba(244, 67, 54, 0.5)',
                color: '#ff6b6b',
                padding: '0.8rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '1rem'
              }}>
                {error}
              </div>
            )}

            {loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                color: '#fff',
                fontSize: '1.2rem'
              }}>
                Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                color: '#ccc',
                fontSize: '1.2rem'
              }}>
                No pending applications
              </div>
            ) : (
              <div>
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <h3 style={{ color: '#8b5cf6', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                    📊 {applications.length} Pending Application{applications.length !== 1 ? 's' : ''}
                  </h3>
                  <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
                    Click on an application to view details and take action
                  </p>
                </div>

                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {applications.map((app, index) => (
                    <div 
                      key={app._id} 
                      onClick={() => setSelectedApplication(app)}
                      style={{
                        background: selectedApplication?._id === app._id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: selectedApplication?._id === app._id ? '2px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                      }}
                    >
                      {/* Application Header */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <div>
                          <h4 style={{ 
                            color: '#fff', 
                            margin: '0 0 0.25rem 0', 
                            fontSize: '1.1rem',
                            fontWeight: 'bold'
                          }}>
                            {app.firstName} {app.lastName}
                          </h4>
                          <p style={{ 
                            color: '#ccc', 
                            margin: 0, 
                            fontSize: '0.85rem'
                          }}>
                            {app.email}
                          </p>
                        </div>
                        <div style={{
                          background: getStatusColor(app.status),
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          {getStatusText(app.status)}
                        </div>
                      </div>

                      {/* Application Details Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '0.75rem',
                        fontSize: '0.85rem'
                      }}>
                        <div>
                          <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            🎯 Experience
                          </div>
                          <div style={{ color: '#fff', textTransform: 'capitalize' }}>
                            {app.experience}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            🏆 League
                          </div>
                          <div style={{ 
                            color: app.currentLeague && app.currentLeague !== 'Not provided' ? '#4CAF50' : '#ff9800',
                            fontWeight: 'bold'
                          }}>
                            {app.currentLeague && app.currentLeague !== 'Not provided' ? (
                              `🏆 ${app.currentLeague}`
                            ) : (
                              '❌ No League'
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            💳 Payment
                          </div>
                          <div style={{ 
                            color: app.payNow ? '#4CAF50' : '#ff9800',
                            fontWeight: 'bold'
                          }}>
                            {app.payNow === undefined ? (
                              <div>
                                <div>⚠️ Unknown</div>
                                <div style={{ fontSize: '0.7rem', color: '#ccc' }}>Older App</div>
                              </div>
                            ) : app.payNow ? (
                              <div>
                                <div>✅ $5/month</div>
                                {app.paymentMethod && (
                                  <div style={{ fontSize: '0.7rem', color: '#ccc' }}>
                                    {app.paymentMethod === 'venmo' && '💜 Venmo'}
                                    {app.paymentMethod === 'cashapp' && '💚 Cash App'}
                                    {app.paymentMethod === 'creditCard' && '💳 Card'}
                                    {app.paymentMethod === 'applePay' && '🍎 Apple Pay'}
                                    {app.paymentMethod === 'googlePay' && '📱 Google Pay'}
                                    {app.paymentMethod === 'cash' && '💵 Cash'}
                                    {app.paymentMethod === 'check' && '📝 Check'}
                                    {!['venmo', 'cashapp', 'creditCard', 'applePay', 'googlePay', 'cash', 'check'].includes(app.paymentMethod) && app.paymentMethod}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '❌ Free'
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div style={{ 
                        marginTop: '0.75rem',
                        textAlign: 'center'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedApplication?._id === app._id) {
                              setSelectedApplication(null);
                            } else {
                              setSelectedApplication(app);
                            }
                          }}
                          disabled={processing}
                          style={{
                            padding: '0.5rem 1rem',
                            background: selectedApplication?._id === app._id ? 'rgba(244, 67, 54, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                            color: selectedApplication?._id === app._id ? '#ff6b6b' : '#8b5cf6',
                            border: selectedApplication?._id === app._id ? '1px solid #ff6b6b' : '1px solid #8b5cf6',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            minWidth: '120px'
                          }}
                        >
                          {selectedApplication?._id === app._id ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Application Details */}
          <div style={{ 
            flex: '1',
            minWidth: '500px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {selectedApplication ? (
              <div>
                <h3 style={{ 
                  color: '#fff', 
                  margin: '0 0 1.5rem 0',
                  fontSize: '1.3rem',
                  borderBottom: '2px solid #8b5cf6',
                  paddingBottom: '0.5rem'
                }}>
                  📄 {selectedApplication.firstName} {selectedApplication.lastName}
                </h3>
                
                {/* Application Details - Simplified Layout */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2rem',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Personal Info */}
                    <div>
                      <h4 style={{ 
                        color: '#8b5cf6', 
                        margin: '0 0 1rem 0', 
                        fontSize: '1rem',
                        borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                        paddingBottom: '0.5rem'
                      }}>
                        👤 Personal Information
                      </h4>
                      <div style={{ color: '#fff', lineHeight: '1.8' }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Name:</span> 
                          <span style={{ marginLeft: '0.5rem' }}>{selectedApplication.firstName} {selectedApplication.lastName}</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Email:</span> 
                          <span style={{ marginLeft: '0.5rem', color: '#ccc' }}>{selectedApplication.email}</span>
                        </div>
                        <div>
                          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Phone:</span> 
                          <span style={{ marginLeft: '0.5rem', color: '#ccc' }}>{selectedApplication.phone || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Skill Info */}
                    <div>
                      <h4 style={{ 
                        color: '#8b5cf6', 
                        margin: '0 0 1rem 0', 
                        fontSize: '1rem',
                        borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                        paddingBottom: '0.5rem'
                      }}>
                        🎯 Skill Information
                      </h4>
                      <div style={{ color: '#fff', lineHeight: '1.8' }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Experience:</span> 
                          <span style={{ marginLeft: '0.5rem', textTransform: 'capitalize' }}>{selectedApplication.experience}</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Fargo Rate:</span> 
                          <span style={{ marginLeft: '0.5rem', color: '#ccc' }}>{selectedApplication.fargoRate || 'Not provided'}</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>League:</span> 
                          <span style={{ 
                            marginLeft: '0.5rem',
                            color: selectedApplication.currentLeague && selectedApplication.currentLeague !== 'Not provided' ? '#4CAF50' : '#ff9800',
                            fontWeight: 'bold'
                          }}>
                            {selectedApplication.currentLeague && selectedApplication.currentLeague !== 'Not provided' ? 
                              `🏆 ${selectedApplication.currentLeague}` : 
                              '❌ Not provided'
                            }
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Current Ranking:</span> 
                          <span style={{ marginLeft: '0.5rem', color: '#ccc' }}>{selectedApplication.currentRanking || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: '1.5rem'
                  }}>
                    <h4 style={{ 
                      color: '#8b5cf6', 
                      margin: '0 0 1rem 0', 
                      fontSize: '1rem',
                      borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                      paddingBottom: '0.5rem'
                    }}>
                      💳 Payment Information
                    </h4>
                    <div style={{ color: '#fff', lineHeight: '1.8' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Payment Required:</span> 
                        <span style={{ 
                          marginLeft: '0.5rem',
                          color: selectedApplication.payNow ? '#4CAF50' : '#ff9800',
                          fontWeight: 'bold'
                        }}>
                          {selectedApplication.payNow ? '✅ Yes - $5/month' : '❌ No - Free Access'}
                        </span>
                      </div>
                      {selectedApplication.paymentMethod && (
                        <div>
                          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Payment Method:</span> 
                          <span style={{ 
                            marginLeft: '0.5rem',
                            color: '#4CAF50', 
                            fontWeight: 'bold'
                          }}>
                            {selectedApplication.paymentMethod === 'venmo' && '💜 Venmo'}
                            {selectedApplication.paymentMethod === 'cashapp' && '💚 Cash App'}
                            {selectedApplication.paymentMethod === 'creditCard' && '💳 Credit Card'}
                            {selectedApplication.paymentMethod === 'applePay' && '🍎 Apple Pay'}
                            {selectedApplication.paymentMethod === 'googlePay' && '📱 Google Pay'}
                            {selectedApplication.paymentMethod === 'cash' && '💵 Cash'}
                            {selectedApplication.paymentMethod === 'check' && '📝 Check'}
                            {!['venmo', 'cashapp', 'creditCard', 'applePay', 'googlePay', 'cash', 'check'].includes(selectedApplication.paymentMethod) && selectedApplication.paymentMethod}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedApplication.status === 'pending' && (
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: '1.5rem'
                  }}>
                    <h4 style={{ 
                      color: '#8b5cf6', 
                      margin: '0 0 1rem 0', 
                      fontSize: '1rem',
                      borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                      paddingBottom: '0.5rem'
                    }}>
                      🎯 Admin Actions
                    </h4>
                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}>
                      <button
                        onClick={() => handleReject(selectedApplication._id, 'Application rejected by admin')}
                        disabled={processing}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'rgba(244, 67, 54, 0.2)',
                          color: '#ff6b6b',
                          border: '1px solid #ff6b6b',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          minWidth: '120px'
                        }}
                      >
                        {processing ? '⏳ Processing...' : '❌ Reject'}
                      </button>
                      <button
                        onClick={() => handleApprove(selectedApplication._id)}
                        disabled={processing}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                          color: 'white',
                          border: '1px solid #8b5cf6',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          minWidth: '120px',
                          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                        }}
                      >
                        {processing ? '⏳ Processing...' : '✅ Approve'}
                      </button>
                    </div>
                    <p style={{ 
                      color: '#ccc', 
                      textAlign: 'center', 
                      margin: 0,
                      fontSize: '0.85rem',
                      fontStyle: 'italic'
                    }}>
                      Approving will also activate their unified account for league access
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                color: '#ccc',
                fontSize: '1.2rem',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👈</div>
                  <div>Select an application from the list to view details</div>
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
    </>
  );
};

export default LadderApplicationsManager;