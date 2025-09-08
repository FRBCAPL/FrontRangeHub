import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config.js';
import DraggableModal from '../modal/DraggableModal';
import emailjs from 'emailjs-com';

const LadderApplicationsManager = ({ onClose }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [approvedCredentials, setApprovedCredentials] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);

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
        // Send email using EmailJS
        try {
          const emailResult = await emailjs.send(
            'service_l5q2047', // Same service ID as singles league
            'template_ladder_approval', // You'll need to create this template
            {
              to_email: data.playerCreated.email,
              to_name: `${data.playerCreated.firstName} ${data.playerCreated.lastName}`,
              email: data.playerCreated.email,
              pin: data.playerCreated.pin,
              ladder_name: data.playerCreated.ladderName,
              position: data.playerCreated.position,
              login_url: 'https://newapp-1-ic1v.onrender.com' // Your app URL
            },
            'g6vqrOs_Jb6LL1VCZ' // Same user ID as singles league
          );
          
          console.log('📧 Email sent successfully!', emailResult);
          setEmailStatus('sent');
        } catch (emailError) {
          console.error('📧 Email sending failed:', emailError);
          setEmailStatus('failed');
        }
        
        // Show credentials modal
        setApprovedCredentials(data.playerCreated);
        setShowCredentialsModal(true);
        
        // Refresh the applications list
        await fetchApplications();
        setShowDetailsModal(false);
        setSelectedApplication(null);
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
        setShowDetailsModal(false);
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
    <DraggableModal
      open={true}
      onClose={onClose}
      title="📋 Pending Ladder Applications"
      maxWidth="900px"
    >
      <div style={{ padding: '1rem' }}>
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
            textAlign: 'center',
            padding: '2rem',
            color: '#ccc',
            fontSize: '1.1rem'
          }}>
            Loading applications...
          </div>
        ) : applications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#ccc',
            fontSize: '1.1rem'
          }}>
            No pending ladder applications found.
          </div>
        ) : (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto',
              gap: '1rem',
              padding: '0.8rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              color: '#fff'
            }}>
              <div>Name</div>
              <div>Email</div>
              <div>Experience</div>
              <div>League</div>
              <div>Payment</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {applications.map((app) => (
              <div key={app._id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto',
                gap: '1rem',
                padding: '0.8rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>
                  {app.firstName} {app.lastName}
                </div>
                <div style={{ color: '#ccc' }}>{app.email}</div>
                <div style={{ color: '#ccc', textTransform: 'capitalize' }}>
                  {app.experience}
                </div>
                <div style={{ 
                  color: app.currentLeague && app.currentLeague !== 'Not provided' ? '#4CAF50' : '#ff9800',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}>
                  {app.currentLeague && app.currentLeague !== 'Not provided' ? (
                    <div style={{ fontSize: '0.8rem' }}>
                      🏆 {app.currentLeague}
                    </div>
                  ) : (
                    <div>
                      ❌ No League
                    </div>
                  )}
                </div>
                <div style={{ 
                  color: app.payNow ? '#4CAF50' : (app.payNow === undefined ? '#ff9800' : '#ff9800'),
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}>
                  {app.payNow === undefined ? (
                    <div style={{ color: '#ff9800' }}>
                      <div>⚠️ Unknown</div>
                      <div style={{ fontSize: '0.7rem' }}>Older App</div>
                    </div>
                  ) : app.payNow ? (
                    <div>
                      <div>✅ $5/month</div>
                      {app.paymentMethod && (
                        <div style={{ fontSize: '0.75rem', color: '#ccc' }}>
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
                <div style={{ 
                  color: getStatusColor(app.status),
                  fontWeight: 'bold'
                }}>
                  {getStatusText(app.status)}
                </div>
                <div>
                  <button
                    onClick={() => handleViewDetails(app)}
                    disabled={processing}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(33, 150, 243, 0.2)',
                      color: '#2196F3',
                      border: '1px solid #2196F3',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {showDetailsModal && selectedApplication && (
        <DraggableModal
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={`📄 Application Details - ${selectedApplication.firstName} ${selectedApplication.lastName}`}
          maxWidth="600px"
        >
          <div style={{ padding: '1rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <strong style={{ color: '#2196F3' }}>Personal Information:</strong>
                <div style={{ marginTop: '0.5rem', color: '#ccc' }}>
                  <div><strong>Name:</strong> {selectedApplication.firstName} {selectedApplication.lastName}</div>
                  <div><strong>Email:</strong> {selectedApplication.email}</div>
                  <div><strong>Phone:</strong> {selectedApplication.phone || 'Not provided'}</div>
                </div>
              </div>
              
              <div>
                <strong style={{ color: '#2196F3' }}>Skill Information:</strong>
                <div style={{ marginTop: '0.5rem', color: '#ccc' }}>
                  <div><strong>Experience:</strong> {selectedApplication.experience}</div>
                  <div><strong>Fargo Rate:</strong> {selectedApplication.fargoRate || 'Not provided'}</div>
                  <div><strong>League Divisions:</strong> 
                    {selectedApplication.currentLeague && selectedApplication.currentLeague !== 'Not provided' ? (
                      <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                        {selectedApplication.currentLeague}
                      </span>
                    ) : (
                      <span style={{ color: '#ff9800' }}>Not provided</span>
                    )}
                  </div>
                  <div><strong>Current Ranking:</strong> {selectedApplication.currentRanking || 'Not provided'}</div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <strong style={{ color: '#2196F3' }}>Payment Information:</strong>
              <div style={{ marginTop: '0.5rem', color: '#ccc' }}>
                <div><strong>Payment Required:</strong> 
                  <span style={{ 
                    color: selectedApplication.payNow ? '#4CAF50' : '#ff9800',
                    fontWeight: 'bold',
                    marginLeft: '0.5rem'
                  }}>
                    {selectedApplication.payNow ? '✅ Yes - $5/month' : '❌ No - Free Access'}
                  </span>
                </div>
                {selectedApplication.payNow && selectedApplication.paymentMethod && (
                  <div><strong>Payment Method:</strong> 
                    <span style={{ 
                      color: '#4CAF50',
                      fontWeight: 'bold',
                      marginLeft: '0.5rem'
                    }}>
                      {selectedApplication.paymentMethod === 'venmo' && '💜 Venmo'}
                      {selectedApplication.paymentMethod === 'cashapp' && '💚 Cash App'}
                      {selectedApplication.paymentMethod === 'creditCard' && '💳 Credit/Debit Card'}
                      {selectedApplication.paymentMethod === 'applePay' && '🍎 Apple Pay'}
                      {selectedApplication.paymentMethod === 'googlePay' && '📱 Google Pay'}
                      {selectedApplication.paymentMethod === 'cash' && '💵 Cash'}
                      {selectedApplication.paymentMethod === 'check' && '📝 Check'}
                      {!['venmo', 'cashapp', 'creditCard', 'applePay', 'googlePay', 'cash', 'check'].includes(selectedApplication.paymentMethod) && selectedApplication.paymentMethod}
                    </span>
                  </div>
                )}
                {selectedApplication.payNow && !selectedApplication.paymentMethod && (
                  <div style={{ color: '#ff6b6b' }}>
                    <strong>⚠️ Payment method not specified</strong>
                  </div>
                )}
                {selectedApplication.payNow === undefined && selectedApplication.paymentMethod === undefined && (
                  <div style={{ color: '#ff9800' }}>
                    <strong>⚠️ Payment information not available (older application)</strong>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <strong style={{ color: '#2196F3' }}>Application Status:</strong>
              <div style={{ 
                color: getStatusColor(selectedApplication.status),
                fontWeight: 'bold',
                marginTop: '0.5rem'
              }}>
                {getStatusText(selectedApplication.status)}
              </div>
              {selectedApplication.status === 'rejected' && selectedApplication.rejectionReason && (
                <div style={{ color: '#ff6b6b', marginTop: '0.5rem' }}>
                  <strong>Reason:</strong> {selectedApplication.rejectionReason}
                </div>
              )}
            </div>

            {selectedApplication.status === 'pending' && (
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => handleReject(selectedApplication._id, 'Application rejected by admin')}
                  disabled={processing}
                  style={{
                    padding: '0.8rem 1.5rem',
                    background: 'rgba(244, 67, 54, 0.2)',
                    color: '#ff6b6b',
                    border: '2px solid #ff6b6b',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {processing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => handleApprove(selectedApplication._id)}
                  disabled={processing}
                  style={{
                    padding: '0.8rem 1.5rem',
                    background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                    color: 'white',
                    border: '2px solid #4CAF50',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {processing ? 'Processing...' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        </DraggableModal>
      )}

      {/* Credentials Modal */}
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
                    fontFamily: 'monospace',
                    fontSize: '1.1rem'
                  }}>{approvedCredentials.pin}</span>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Ladder:</strong> {approvedCredentials.ladderName}
                </div>
                <div>
                  <strong>Position:</strong> #{approvedCredentials.position}
                </div>
              </div>
            </div>

            {emailStatus === 'sent' && (
              <div style={{
                background: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ color: '#4CAF50', margin: '0 0 0.5rem 0' }}>✅ Email Sent Successfully!</h4>
                <p style={{ color: '#ccc', margin: 0 }}>
                  An approval email with login credentials has been automatically sent to {approvedCredentials.email}
                </p>
              </div>
            )}
            
            {emailStatus === 'failed' && (
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ color: '#FFC107', margin: '0 0 0.5rem 0' }}>⚠️ Email Not Sent:</h4>
                <p style={{ color: '#ccc', margin: 0 }}>
                  Please manually send these credentials to {approvedCredentials.email} via email
                </p>
              </div>
            )}
            
            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#FFC107', margin: '0 0 0.5rem 0' }}>⚠️ Important:</h4>
              <ul style={{ color: '#ccc', margin: 0, paddingLeft: '1.5rem' }}>
                <li>Player can log in using the unified login system</li>
                <li>League app will recognize their ladder account</li>
                <li>They can access both league and ladder features</li>
                <li>Keep these credentials secure</li>
              </ul>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setShowCredentialsModal(false)}
                style={{
                  padding: '0.8rem 2rem',
                  background: 'linear-gradient(45deg, #2196F3, #1976D2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </DraggableModal>
      )}
    </DraggableModal>
  );
};

export default LadderApplicationsManager;
