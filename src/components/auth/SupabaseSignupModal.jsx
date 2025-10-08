import React, { useState, useEffect } from 'react';
import DraggableModal from '../modal/DraggableModal';
import supabaseDataService from '../../services/supabaseDataService.js';

const SupabaseSignupModal = ({ isOpen, onClose, claimingPlayer = null }) => {
  console.log('🎯 SupabaseSignupModal: claimingPlayer prop:', claimingPlayer);
  const [step, setStep] = useState(claimingPlayer ? 'claim' : 'check'); // 'check', 'new', 'claim', 'success'
  console.log('🎯 SupabaseSignupModal: initial step set to:', claimingPlayer ? 'claim' : 'check');
  const [formData, setFormData] = useState({
    firstName: claimingPlayer?.firstName || '',
    lastName: claimingPlayer?.lastName || '',
    email: '',
    phone: '',
    fargoRate: claimingPlayer?.fargoRate || '400',
    ladderName: claimingPlayer?.ladderName || '499-under',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [existingPlayers, setExistingPlayers] = useState(null);

  // Update step and formData when claimingPlayer changes
  useEffect(() => {
    console.log('🎯 SupabaseSignupModal: useEffect triggered, claimingPlayer:', claimingPlayer);
    if (claimingPlayer) {
      console.log('🎯 SupabaseSignupModal: Setting step to claim');
      setStep('claim');
      setFormData({
        firstName: claimingPlayer.firstName || '',
        lastName: claimingPlayer.lastName || '',
        email: '',
        phone: '',
        fargoRate: claimingPlayer.fargoRate || '400',
        ladderName: claimingPlayer.ladderName || '499-under',
        message: ''
      });
    } else {
      console.log('🎯 SupabaseSignupModal: Setting step to check');
      setStep('check');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        fargoRate: '400',
        ladderName: '499-under',
        message: ''
      });
    }
  }, [claimingPlayer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckExisting = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.firstName || !formData.lastName) {
      setError('Please enter your first and last name');
      return;
    }

    setLoading(true);
    try {
      const result = await supabaseDataService.checkExistingPlayer(
        formData.firstName.trim(),
        formData.lastName.trim(),
        formData.email?.trim() || null
      );

      if (result.success) {
        if (result.hasUnifiedAccount) {
          setError('You already have an account! Please use the login page.');
        } else if (result.hasExistingPlayers && result.foundPlayers.length > 0) {
          setExistingPlayers(result.foundPlayers);
          setStep('claim');
          setSuccessMessage(`Found you on the ladder! Please enter your email to claim your position.`);
        } else {
          // No existing player, proceed to new signup
          setStep('new');
        }
      } else {
        setError(result.error || 'Error checking for existing player');
      }
    } catch (error) {
      setError('Error checking for existing player');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await supabaseDataService.createNewPlayerSignup({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        fargoRate: formData.fargoRate,
        ladderName: formData.ladderName,
        joinLadder: true
      });

      if (result.success) {
        setSuccessMessage(result.message);
        setStep('success');
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (error) {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPosition = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const result = await supabaseDataService.claimLadderPosition({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message
      });

      if (result.success) {
        setSuccessMessage(result.message);
        setStep('success');
      } else {
        setError(result.error || 'Claim failed');
      }
    } catch (error) {
      setError('Claim failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCheckStep = () => (
    <form onSubmit={handleCheckExisting} style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '20px' }}>Join the Ladder</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          First Name *
        </label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          required
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#2a2a2a',
            color: '#fff'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          Last Name *
        </label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          required
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#2a2a2a',
            color: '#fff'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          Email (optional at this step)
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          style={{
            width: '100%',
            padding: '10px',
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
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          color: '#dc3545'
        }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          background: 'rgba(40, 167, 69, 0.1)',
          border: '1px solid rgba(40, 167, 69, 0.3)',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          color: '#28a745'
        }}>
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: loading ? '#666' : '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem'
        }}
      >
        {loading ? 'Checking...' : 'Continue'}
      </button>
    </form>
  );

  const renderNewSignupStep = () => (
    <form onSubmit={handleNewSignup} style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '10px' }}>New Player Signup</h3>
      <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '0.9rem' }}>
        We didn't find you on the ladder. Let's create a new account!
      </p>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          Email *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#2a2a2a',
            color: '#fff'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          Phone
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#2a2a2a',
            color: '#fff'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          Fargo Rate (optional)
        </label>
        <input
          type="number"
          name="fargoRate"
          value={formData.fargoRate}
          onChange={handleInputChange}
          style={{
            width: '100%',
            padding: '10px',
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
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          color: '#dc3545'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setStep('check')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 2,
            padding: '12px',
            background: loading ? '#666' : '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </div>
    </form>
  );

  const renderClaimStep = () => (
    <form onSubmit={handleClaimPosition} style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '15px', textAlign: 'center' }}>
        🎯 Claim Your Ladder Position
      </h3>
      
      {claimingPlayer && (
        <div style={{ 
          background: 'rgba(76, 175, 80, 0.1)', 
          border: '2px solid #4CAF50', 
          borderRadius: '8px', 
          padding: '15px', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4CAF50', marginBottom: '5px' }}>
            {formData.firstName} {formData.lastName}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
            Position #{claimingPlayer.position} • {claimingPlayer.ladderName || '499-under'} Ladder
          </div>
          <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '5px' }}>
            Fargo: {claimingPlayer.fargoRate || 'N/A'}
          </div>
        </div>
      )}

      <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.5' }}>
        {claimingPlayer 
          ? 'Is this you? Enter your email below to claim this position and get full access to the ladder.' 
          : `Found: ${formData.firstName} ${formData.lastName}. Enter your email to claim your position.`}
      </p>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          Email *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#2a2a2a',
            color: '#fff'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          Phone
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#2a2a2a',
            color: '#fff'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
          Message to Admin (optional)
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleInputChange}
          rows="3"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#2a2a2a',
            color: '#fff',
            resize: 'vertical'
          }}
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid rgba(220, 53, 69, 0.3)',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          color: '#dc3545'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        {!claimingPlayer && (
          <button
            type="button"
            onClick={() => setStep('check')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 2,
            padding: '12px',
            background: loading ? '#666' : '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Claiming...' : 'Claim Position'}
        </button>
      </div>
    </form>
  );

  const renderSuccessStep = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
      <h3 style={{ color: '#4CAF50', marginBottom: '15px' }}>Success!</h3>
      <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6' }}>
        {successMessage}
      </p>
      <button
        onClick={onClose}
        style={{
          padding: '12px 24px',
          background: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Close
      </button>
    </div>
  );

  return (
        <DraggableModal
          open={isOpen}
          onClose={onClose}
          title={step === 'success' ? '' : '🎯 Join the Ladder'}
          maxWidth="800px"
        >
      {step === 'check' && renderCheckStep()}
      {step === 'new' && renderNewSignupStep()}
      {step === 'claim' && renderClaimStep()}
      {step === 'success' && renderSuccessStep()}
    </DraggableModal>
  );
};

export default SupabaseSignupModal;
