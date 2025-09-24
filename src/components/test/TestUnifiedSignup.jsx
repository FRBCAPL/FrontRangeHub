import React, { useState } from 'react';
import UnifiedSignupModal from '../auth/UnifiedSignupModal.jsx';

const TestUnifiedSignup = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      background: '#1a1a1a',
      color: '#fff',
      minHeight: '100vh'
    }}>
      <h1>🧪 Unified Signup System Test</h1>
      
      <button
        onClick={() => setShowModal(true)}
        style={{
          background: 'linear-gradient(135deg, #4CAF50, #45a049)',
          color: 'white',
          border: 'none',
          padding: '1rem 2rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          margin: '1rem'
        }}
      >
        🚀 Test Unified Signup
      </button>

      <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px', margin: '2rem auto' }}>
        <h3>Test Scenarios:</h3>
        <ol>
          <li><strong>Existing Ladder Player:</strong> Use "Mark Lanoue" to test position claiming</li>
          <li><strong>New User:</strong> Use any new email to test registration</li>
          <li><strong>Existing League Player:</strong> Use existing email to test ladder access</li>
        </ol>
        
        <h3>Expected Results:</h3>
        <ul>
          <li>✅ Existing ladder players should be found and claimable</li>
          <li>✅ New users should be registered and pending approval</li>
          <li>✅ Duplicate emails should be rejected</li>
          <li>✅ All forms should validate required fields</li>
        </ul>
      </div>

      <UnifiedSignupModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(user) => {
          console.log('✅ Signup successful:', user);
          alert(`Signup successful! User: ${user.firstName} ${user.lastName}`);
        }}
      />
    </div>
  );
};

export default TestUnifiedSignup;
