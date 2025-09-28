import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '../modal/DraggableModal';
import { BACKEND_URL } from '../../config.js';

const ContactAdminModal = ({ isOpen, onClose }) => {
  const [selectedContactMethod, setSelectedContactMethod] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [error, setError] = useState('');

  const contactMethods = [
    {
      id: 'facebook',
      title: 'Facebook Group',
      description: 'Join our Facebook group for community support',
      details: 'The Ladder of Legends',
      icon: '📘',
      action: 'Join Group',
      color: '#1877F2'
    },
    {
      id: 'message',
      title: 'Send Message',
      description: 'Send a direct message to ladder admin',
      details: 'Get help with ladder issues, payments, or technical problems',
      icon: '💬',
      action: 'Send Message',
      color: '#8b5cf6'
    }
  ];

  const handleContactMethod = (method) => {
    setSelectedContactMethod(method.id);
    
    switch (method.id) {
      case 'facebook':
        // Open Facebook group (you'll need to replace with actual URL)
        window.open('https://facebook.com/groups/ladderoflegends', '_blank');
        break;
      case 'message':
        // Show message form - no action needed, form will be shown
        break;
      default:
        break;
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Get user info from localStorage
      const userData = localStorage.getItem('unifiedUserData');
      const user = userData ? JSON.parse(userData) : null;
      
      const messageData = {
        subject: subject.trim(),
        message: message.trim(),
        from: user ? `${user.firstName} ${user.lastName}` : 'Anonymous User',
        fromEmail: user ? user.email : 'unknown@email.com',
        type: 'ladder_admin_message'
      };

      // Send message to backend API
      const response = await fetch(`${BACKEND_URL}/api/ladder/admin-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      const result = await response.json();
      console.log('Message sent successfully:', result);

      setMessageSent(true);
      setSubject('');
      setMessage('');
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setMessageSent(false);
        setSelectedContactMethod('');
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title="📞 Contact Ladder Admin"
      maxWidth="600px"
      borderColor="#ffc107"
      textColor="#ffffff"
      glowColor="#ffc107"
      zIndex={100000}
      style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        color: '#ffffff'
      }}
    >
      <div style={{ padding: '20px' }}>
        <p style={{ color: '#e0e0e0', marginBottom: '20px', fontSize: '1rem', textAlign: 'center' }}>
          Need help with the ladder? Choose your preferred contact method below:
        </p>

         {!selectedContactMethod && (
           <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
             {contactMethods.map((method) => (
               <div
                 key={method.id}
                 style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   border: `2px solid ${method.color}40`,
                   borderRadius: '12px',
                   padding: '16px',
                   cursor: 'pointer',
                   transition: 'all 0.3s ease',
                   position: 'relative',
                   overflow: 'hidden'
                 }}
                 onMouseEnter={(e) => {
                   e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                   e.target.style.borderColor = `${method.color}80`;
                   e.target.style.transform = 'translateY(-2px)';
                 }}
                 onMouseLeave={(e) => {
                   e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                   e.target.style.borderColor = `${method.color}40`;
                   e.target.style.transform = 'translateY(0)';
                 }}
                 onClick={() => handleContactMethod(method)}
               >
                 <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                   <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>{method.icon}</span>
                   <h3 style={{ 
                     color: method.color, 
                     margin: 0, 
                     fontSize: '1.1rem',
                     fontWeight: 'bold'
                   }}>
                     {method.title}
                   </h3>
                 </div>
                 
                 <p style={{ 
                   color: '#e0e0e0', 
                   margin: '0 0 8px 0', 
                   fontSize: '0.9rem',
                   lineHeight: '1.4'
                 }}>
                   {method.description}
                 </p>
                 
                 <div style={{ 
                   color: '#ccc', 
                   fontSize: '0.85rem',
                   lineHeight: '1.3',
                   whiteSpace: 'pre-line'
                 }}>
                   {method.details}
                 </div>
                 
                 <div style={{
                   position: 'absolute',
                   top: '12px',
                   right: '12px',
                   background: method.color,
                   color: 'white',
                   padding: '4px 8px',
                   borderRadius: '4px',
                   fontSize: '0.75rem',
                   fontWeight: 'bold'
                 }}>
                   {method.action}
                 </div>
               </div>
             ))}
           </div>
         )}

         {/* Message Form */}
         {selectedContactMethod === 'message' && !messageSent && (
           <div style={{
             background: 'rgba(139, 92, 246, 0.1)',
             border: '1px solid rgba(139, 92, 246, 0.3)',
             borderRadius: '12px',
             padding: '20px',
             marginBottom: '20px'
           }}>
             <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
               <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>💬</span>
               <h3 style={{ 
                 color: '#8b5cf6', 
                 margin: 0, 
                 fontSize: '1.1rem',
                 fontWeight: 'bold'
               }}>
                 Send Message to Ladder Admin
               </h3>
             </div>

             <div style={{ marginBottom: '16px' }}>
               <label style={{ 
                 display: 'block', 
                 color: '#e0e0e0', 
                 marginBottom: '8px', 
                 fontSize: '0.9rem',
                 fontWeight: 'bold'
               }}>
                 Subject:
               </label>
               <input
                 type="text"
                 value={subject}
                 onChange={(e) => setSubject(e.target.value)}
                 placeholder="Brief description of your issue..."
                 style={{
                   width: '100%',
                   padding: '12px',
                   background: 'rgba(255, 255, 255, 0.1)',
                   border: '1px solid rgba(255, 255, 255, 0.2)',
                   borderRadius: '8px',
                   color: '#e0e0e0',
                   fontSize: '0.9rem',
                   boxSizing: 'border-box'
                 }}
               />
             </div>

             <div style={{ marginBottom: '16px' }}>
               <label style={{ 
                 display: 'block', 
                 color: '#e0e0e0', 
                 marginBottom: '8px', 
                 fontSize: '0.9rem',
                 fontWeight: 'bold'
               }}>
                 Message:
               </label>
               <textarea
                 value={message}
                 onChange={(e) => setMessage(e.target.value)}
                 placeholder="Describe your issue in detail..."
                 rows={4}
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

             {error && (
               <div style={{
                 background: 'rgba(244, 67, 54, 0.1)',
                 border: '1px solid rgba(244, 67, 54, 0.3)',
                 borderRadius: '8px',
                 padding: '12px',
                 marginBottom: '16px',
                 color: '#f44336',
                 fontSize: '0.9rem'
               }}>
                 {error}
               </div>
             )}

             <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
               <button
                 onClick={() => {
                   setSelectedContactMethod('');
                   setSubject('');
                   setMessage('');
                   setError('');
                 }}
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
                 Cancel
               </button>
               <button
                 onClick={handleSendMessage}
                 disabled={sending}
                 style={{
                   padding: '10px 20px',
                   background: sending ? 'rgba(139, 92, 246, 0.5)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                   color: 'white',
                   border: 'none',
                   borderRadius: '8px',
                   cursor: sending ? 'not-allowed' : 'pointer',
                   fontSize: '0.9rem',
                   fontWeight: 'bold',
                   opacity: sending ? 0.7 : 1
                 }}
               >
                 {sending ? 'Sending...' : 'Send Message'}
               </button>
             </div>
           </div>
         )}

         {/* Success Message */}
         {messageSent && (
           <div style={{
             background: 'rgba(76, 175, 80, 0.1)',
             border: '1px solid rgba(76, 175, 80, 0.3)',
             borderRadius: '12px',
             padding: '20px',
             marginBottom: '20px',
             textAlign: 'center'
           }}>
             <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✅</div>
             <h3 style={{ 
               color: '#4CAF50', 
               margin: '0 0 8px 0', 
               fontSize: '1.1rem',
               fontWeight: 'bold'
             }}>
               Message Sent Successfully!
             </h3>
             <p style={{ 
               color: '#e0e0e0', 
               margin: 0, 
               fontSize: '0.9rem'
             }}>
               Your message has been sent to the ladder admin. You'll receive a response soon.
             </p>
           </div>
         )}

        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem' }}>Common Issues:</h4>
          <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem' }}>
            <li><strong>BCA Sanctioning Status:</strong> If you're already sanctioned but showing as not sanctioned</li>
            <li><strong>Payment Issues:</strong> Problems with match fees or membership payments</li>
            <li><strong>Profile Problems:</strong> Issues with profile completion or approval</li>
            <li><strong>Match Disputes:</strong> Questions about match results or reporting</li>
            <li><strong>Technical Issues:</strong> App problems or bugs</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #ffc107, #ff9800)',
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

export default ContactAdminModal;
