import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '../modal/DraggableModal';
import { BACKEND_URL } from '../../config.js';

const AdminMessagesModal = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: ''
  });
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch messages and stats
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.priority) queryParams.append('priority', filters.priority);

      const response = await fetch(`${BACKEND_URL}/api/ladder/admin-messages?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/admin-messages/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      fetchStats();
    }
  }, [isOpen, filters]);

  const handleMessageAction = async (messageId, action, additionalData = {}) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/admin-messages/${messageId}/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(additionalData)
      });

      if (response.ok) {
        await fetchMessages();
        await fetchStats();
        setSelectedMessage(null);
        setAdminNotes('');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Failed to update message'}`);
      }
    } catch (error) {
      console.error('Error updating message:', error);
      alert('Failed to update message');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#ffc107';
      case 'read': return '#17a2b8';
      case 'replied': return '#28a745';
      case 'resolved': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return createPortal(
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title="📬 Admin Messages"
      maxWidth="1000px"
      borderColor="#8b5cf6"
      textColor="#ffffff"
      glowColor="#8b5cf6"
      zIndex={100000}
      style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        color: '#ffffff'
      }}
    >
      <div style={{ padding: '20px' }}>
        {/* Stats Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#ffc107', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {stats.new || 0}
            </div>
            <div style={{ color: '#e0e0e0', fontSize: '0.8rem' }}>New</div>
          </div>
          <div style={{
            background: 'rgba(23, 162, 184, 0.1)',
            border: '1px solid rgba(23, 162, 184, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#17a2b8', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {stats.read || 0}
            </div>
            <div style={{ color: '#e0e0e0', fontSize: '0.8rem' }}>Read</div>
          </div>
          <div style={{
            background: 'rgba(40, 167, 69, 0.1)',
            border: '1px solid rgba(40, 167, 69, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#28a745', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {stats.replied || 0}
            </div>
            <div style={{ color: '#e0e0e0', fontSize: '0.8rem' }}>Replied</div>
          </div>
          <div style={{
            background: 'rgba(108, 117, 125, 0.1)',
            border: '1px solid rgba(108, 117, 125, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#6c757d', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {stats.resolved || 0}
            </div>
            <div style={{ color: '#e0e0e0', fontSize: '0.8rem' }}>Resolved</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '0.9rem'
            }}
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '0.9rem'
            }}
          >
            <option value="">All Types</option>
            <option value="ladder_admin_message">Ladder Admin</option>
            <option value="general_inquiry">General</option>
            <option value="technical_issue">Technical</option>
            <option value="payment_issue">Payment</option>
            <option value="other">Other</option>
          </select>

          <button
            onClick={() => setFilters({ status: '', type: '', priority: '' })}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#ccc',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Clear Filters
          </button>
        </div>

        {/* Messages List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#e0e0e0' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#e0e0e0' }}>
            No messages found
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {messages.map((message) => (
              <div
                key={message._id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onClick={() => setSelectedMessage(message)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ 
                    color: '#e0e0e0', 
                    margin: 0, 
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}>
                    {message.subject}
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      background: getStatusColor(message.status),
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      {message.status.toUpperCase()}
                    </span>
                    <span style={{
                      background: getPriorityColor(message.priority),
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      {message.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '8px' }}>
                  From: {message.from} ({message.fromEmail})
                </div>
                
                <div style={{ color: '#e0e0e0', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  {message.message.length > 100 
                    ? `${message.message.substring(0, 100)}...` 
                    : message.message
                  }
                </div>
                
                <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '8px' }}>
                  {formatDate(message.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100001
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
              border: '2px solid #8b5cf6',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: '#8b5cf6', margin: 0, fontSize: '1.2rem' }}>
                  Message Details
                </h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ccc',
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ color: '#e0e0e0', margin: '0 0 8px 0', fontSize: '1.1rem' }}>
                  {selectedMessage.subject}
                </h4>
                <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '12px' }}>
                  From: {selectedMessage.from} ({selectedMessage.fromEmail})
                </div>
                <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '16px' }}>
                  {formatDate(selectedMessage.createdAt)}
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '16px',
                  color: '#e0e0e0',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedMessage.message}
                </div>
              </div>

              {selectedMessage.adminNotes && (
                <div style={{ marginBottom: '16px' }}>
                  <h5 style={{ color: '#8b5cf6', margin: '0 0 8px 0', fontSize: '1rem' }}>
                    Admin Notes:
                  </h5>
                  <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#e0e0e0',
                    fontSize: '0.9rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedMessage.adminNotes}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  color: '#e0e0e0', 
                  marginBottom: '8px', 
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  Admin Notes:
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this message..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSelectedMessage(null)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    color: '#ccc',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}
                >
                  Close
                </button>
                
                {selectedMessage.status === 'new' && (
                  <button
                    onClick={() => handleMessageAction(selectedMessage._id, 'read')}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #17a2b8, #138496)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    Mark as Read
                  </button>
                )}
                
                <button
                  onClick={() => handleMessageAction(selectedMessage._id, 'replied', { 
                    repliedBy: 'Admin', 
                    adminNotes: adminNotes 
                  })}
                  disabled={actionLoading}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #28a745, #1e7e34)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  Mark as Replied
                </button>
                
                <button
                  onClick={() => handleMessageAction(selectedMessage._id, 'resolved', { 
                    adminNotes: adminNotes 
                  })}
                  disabled={actionLoading}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #6c757d, #545b62)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Close
          </button>
        </div>
      </div>
    </DraggableModal>,
    document.body
  );
};

export default AdminMessagesModal;
