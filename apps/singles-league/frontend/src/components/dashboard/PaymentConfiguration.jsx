import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import { 
  FaCreditCard, 
  FaPaypal, 
  FaMoneyBillWave, 
  FaCheck, 
  FaApple, 
  FaGoogle,
  FaSave,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaMobile,
  FaDollarSign
} from 'react-icons/fa';

export default function PaymentConfiguration() {
  const [config, setConfig] = useState({
    registrationFee: 30,
    weeklyDues: 10,
    totalWeeks: 10,
    participationFee: 100,
    phase1Weeks: 6,
    penaltyStructure: {
      strike1: 5,
      strike2: 10,
      strike3: 0
    },
    paymentMethods: {
      venmo: {
        enabled: true,
        username: '',
        displayName: 'Venmo',
        instructions: 'Send payment to @username'
      },
      cashapp: {
        enabled: true,
        username: '',
        displayName: 'Cash App',
        instructions: 'Send payment to $username'
      },
      creditCard: {
        enabled: false,
        processor: 'square',
        displayName: 'Credit/Debit Card',
        instructions: 'Pay online using the link below',
        paymentLink: '',
        squareAppId: '',
        squareLocationId: ''
      },
      applePay: {
        enabled: false,
        displayName: 'Apple Pay',
        instructions: 'Pay using Apple Pay',
        paymentLink: ''
      },
      googlePay: {
        enabled: false,
        displayName: 'Google Pay',
        instructions: 'Pay using Google Pay',
        paymentLink: ''
      },
      cash: {
        enabled: true,
        displayName: 'Cash',
        instructions: 'Pay in person to league administrator'
      },
      check: {
        enabled: false,
        displayName: 'Check',
        instructions: 'Make check payable to [Payee Name]',
        payeeName: '',
        mailingAddress: ''
      }
    },
    additionalInstructions: '',
    contactInfo: {
      adminName: '',
      adminEmail: '',
      adminPhone: ''
    },
    currentSession: {
      name: 'Current Session',
      startDate: '',
      endDate: '',
      isActive: true
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSection, setSavingSection] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
     // Edit mode states for each section
   const [editModes, setEditModes] = useState({
     feeStructure: false,
     penaltyStructure: false,
     paymentMethods: false,
     additionalInstructions: false,
     contactInfo: false
   });

  useEffect(() => {
    loadPaymentConfig();
  }, []);

  const loadPaymentConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-config`);
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          // Ensure currentSession object exists
          const configWithDefaults = {
            ...data.config,
            penaltyStructure: {
              strike1: 5,
              strike2: 10,
              strike3: 0,
              ...data.config.penaltyStructure
            },
            currentSession: {
              name: 'Current Session',
              startDate: '',
              endDate: '',
              isActive: true,
              ...data.config.currentSession
            }
          };
          setConfig(configWithDefaults);
        }
      }
    } catch (error) {
      console.error('Error loading payment config:', error);
      setMessage({ type: 'error', text: 'Failed to load payment configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Payment configuration saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save payment configuration' });
      }
    } catch (error) {
      console.error('Error saving payment config:', error);
      setMessage({ type: 'error', text: 'Error saving payment configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSection = async (sectionName, sectionData) => {
    setSavingSection(sectionName);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          ...sectionData
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: `${sectionName} saved successfully!` });
                 // Close edit mode for the section that was just saved
         let sectionKey = null;
         if (sectionName === 'Fee Structure') sectionKey = 'feeStructure';
         else if (sectionName === 'Penalty Structure') sectionKey = 'penaltyStructure';
         else if (sectionName === 'Payment Methods') sectionKey = 'paymentMethods';
         else if (sectionName === 'Additional Instructions') sectionKey = 'additionalInstructions';
         else if (sectionName === 'Contact Information') sectionKey = 'contactInfo';
        
        if (sectionKey) {
          setEditModes(prev => ({
            ...prev,
            [sectionKey]: false
          }));
        }
      } else {
        setMessage({ type: 'error', text: `Failed to save ${sectionName}` });
      }
    } catch (error) {
      console.error(`Error saving ${sectionName}:`, error);
      setMessage({ type: 'error', text: `Error saving ${sectionName}` });
    } finally {
      setSavingSection('');
    }
  };

  const updatePaymentMethod = (methodKey, field, value) => {
    setConfig(prev => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [methodKey]: {
          ...prev.paymentMethods[methodKey],
          [field]: value
        }
      }
    }));
  };

  const updateContactInfo = (field, value) => {
    setConfig(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };

  const getMethodIcon = (methodKey) => {
    switch (methodKey) {
      case 'venmo': return <FaMobile />;
      case 'cashapp': return <FaDollarSign />;
      case 'paypal': return <FaPaypal />;
      case 'creditCard': return <FaCreditCard />;
      case 'applePay': return <FaApple />;
      case 'googlePay': return <FaGoogle />;
      case 'cash': return <FaMoneyBillWave />;
      case 'check': return <FaCheck />;
      default: return <FaCreditCard />;
    }
  };

  const toggleEditMode = (section) => {
    setEditModes(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const cancelEdit = (section) => {
    setEditModes(prev => ({
      ...prev,
      [section]: false
    }));
    // Reload the config to reset any unsaved changes
    loadPaymentConfig();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
        <p>Loading payment configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#e53e3e', marginBottom: '20px', textAlign: 'center' }}>
        💳 Payment Configuration
      </h2>
      
      {/* Message Display */}
      {message.text && (
        <div style={{
          padding: '10px 15px',
          borderRadius: '6px',
          marginBottom: '20px',
          background: message.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(229, 62, 62, 0.2)',
          border: `1px solid ${message.type === 'success' ? '#4CAF50' : '#e53e3e'}`,
          color: message.type === 'success' ? '#4CAF50' : '#e53e3e',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
          {message.text}
        </div>
      )}

      {/* League Fee Structure */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>League Fee Structure</h3>
          <button
            onClick={() => toggleEditMode('feeStructure')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: editModes.feeStructure ? '#ff9800' : '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {editModes.feeStructure ? '🔒 Cancel Edit' : '✏️ Edit'}
          </button>
        </div>
        
        <div style={{ 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.1)',
          background: editModes.feeStructure ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255,255,255,0.02)',
          opacity: editModes.feeStructure ? 1 : 0.8
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Registration Fee ($)</label>
              <input
                type="number"
                value={config.registrationFee}
                onChange={(e) => setConfig(prev => ({ ...prev, registrationFee: Number(e.target.value) }))}
                disabled={!editModes.feeStructure}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.feeStructure ? '#222' : '#333',
                  color: editModes.feeStructure ? '#fff' : '#888',
                  cursor: editModes.feeStructure ? 'text' : 'not-allowed'
                }}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Weekly Dues ($)</label>
              <input
                type="number"
                value={config.weeklyDues}
                onChange={(e) => setConfig(prev => ({ ...prev, weeklyDues: Number(e.target.value) }))}
                disabled={!editModes.feeStructure}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.feeStructure ? '#222' : '#333',
                  color: editModes.feeStructure ? '#fff' : '#888',
                  cursor: editModes.feeStructure ? 'text' : 'not-allowed'
                }}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Total Weeks</label>
              <input
                type="number"
                value={config.totalWeeks}
                onChange={(e) => setConfig(prev => ({ ...prev, totalWeeks: Number(e.target.value) }))}
                disabled={!editModes.feeStructure}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.feeStructure ? '#222' : '#333',
                  color: editModes.feeStructure ? '#fff' : '#888',
                  cursor: editModes.feeStructure ? 'text' : 'not-allowed'
                }}
                min="1"
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Participation Fee ($)</label>
              <div style={{ 
                padding: '8px 12px', 
                borderRadius: '6px', 
                border: '1px solid #444',
                background: '#333',
                color: '#4CAF50',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                ${config.registrationFee + (config.weeklyDues * config.totalWeeks)}
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                  Auto-calculated: ${config.registrationFee} + (${config.weeklyDues} × {config.totalWeeks})
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          background: 'rgba(76, 175, 80, 0.1)', 
          borderRadius: '6px',
          border: '1px solid #4CAF50'
        }}>
          <div style={{ color: '#4CAF50', fontSize: '14px' }}>
            <strong>Total Session Cost:</strong> ${config.registrationFee + (config.weeklyDues * config.totalWeeks)} 
            ({config.registrationFee} + {config.weeklyDues} × {config.totalWeeks} weeks)
          </div>
        </div>
        
        {/* Save/Cancel Buttons for Fee Structure */}
        {editModes.feeStructure && (
          <div style={{ marginTop: '15px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleSaveSection('Fee Structure', {
                registrationFee: config.registrationFee,
                weeklyDues: config.weeklyDues,
                totalWeeks: config.totalWeeks,
                participationFee: config.registrationFee + (config.weeklyDues * config.totalWeeks)
              })}
              disabled={savingSection === 'Fee Structure'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: savingSection === 'Fee Structure' ? '#666' : '#4CAF50',
                color: '#fff',
                cursor: savingSection === 'Fee Structure' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {savingSection === 'Fee Structure' ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
              {savingSection === 'Fee Structure' ? 'Saving...' : 'Save Fee Structure'}
            </button>
            <button
              onClick={() => cancelEdit('feeStructure')}
              disabled={savingSection === 'Fee Structure'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #666',
                background: 'transparent',
                color: '#ccc',
                cursor: savingSection === 'Fee Structure' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      

      {/* Penalty Structure */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Penalty Structure</h3>
          <button
            onClick={() => toggleEditMode('penaltyStructure')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: editModes.penaltyStructure ? '#ff9800' : '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {editModes.penaltyStructure ? '🔒 Cancel Edit' : '✏️ Edit'}
          </button>
        </div>
        
        <div style={{ 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.1)',
          background: editModes.penaltyStructure ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255,255,255,0.02)',
          opacity: editModes.penaltyStructure ? 1 : 0.8
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>1st Strike Fine ($)</label>
              <input
                type="number"
                value={config.penaltyStructure.strike1}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  penaltyStructure: {
                    ...prev.penaltyStructure,
                    strike1: Number(e.target.value)
                  }
                }))}
                disabled={!editModes.penaltyStructure}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.penaltyStructure ? '#222' : '#333',
                  color: editModes.penaltyStructure ? '#fff' : '#888',
                  cursor: editModes.penaltyStructure ? 'text' : 'not-allowed'
                }}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>2nd Strike Fine ($)</label>
              <input
                type="number"
                value={config.penaltyStructure.strike2}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  penaltyStructure: {
                    ...prev.penaltyStructure,
                    strike2: Number(e.target.value)
                  }
                }))}
                disabled={!editModes.penaltyStructure}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.penaltyStructure ? '#222' : '#333',
                  color: editModes.penaltyStructure ? '#fff' : '#888',
                  cursor: editModes.penaltyStructure ? 'text' : 'not-allowed'
                }}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>3rd Strike Fine ($)</label>
              <input
                type="number"
                value={config.penaltyStructure.strike3}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  penaltyStructure: {
                    ...prev.penaltyStructure,
                    strike3: Number(e.target.value)
                  }
                }))}
                disabled={!editModes.penaltyStructure}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.penaltyStructure ? '#222' : '#333',
                  color: editModes.penaltyStructure ? '#fff' : '#888',
                  cursor: editModes.penaltyStructure ? 'text' : 'not-allowed'
                }}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>
        
        {/* Save/Cancel Buttons for Penalty Structure */}
        {editModes.penaltyStructure && (
          <div style={{ marginTop: '15px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleSaveSection('Penalty Structure', {
                penaltyStructure: config.penaltyStructure
              })}
              disabled={savingSection === 'Penalty Structure'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: savingSection === 'Penalty Structure' ? '#666' : '#4CAF50',
                color: '#fff',
                cursor: savingSection === 'Penalty Structure' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {savingSection === 'Penalty Structure' ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
              {savingSection === 'Penalty Structure' ? 'Saving...' : 'Save Penalty Structure'}
            </button>
            <button
              onClick={() => cancelEdit('penaltyStructure')}
              disabled={savingSection === 'Penalty Structure'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #666',
                background: 'transparent',
                color: '#ccc',
                cursor: savingSection === 'Penalty Structure' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Payment Methods</h3>
          <button
            onClick={() => toggleEditMode('paymentMethods')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: editModes.paymentMethods ? '#ff9800' : '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {editModes.paymentMethods ? '🔒 Cancel Edit' : '✏️ Edit'}
          </button>
        </div>
        
        <div style={{ 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.1)',
          background: editModes.paymentMethods ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255,255,255,0.02)',
          opacity: editModes.paymentMethods ? 1 : 0.8
        }}>
          {Object.entries(config.paymentMethods).map(([methodKey, method]) => (
            <div key={methodKey} style={{ 
              marginBottom: '20px', 
              padding: '15px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {getMethodIcon(methodKey)}
                <h4 style={{ color: '#fff', margin: 0, flex: 1 }}>{method.displayName}</h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={(e) => updatePaymentMethod(methodKey, 'enabled', e.target.checked)}
                    disabled={!editModes.paymentMethods}
                    style={{ cursor: editModes.paymentMethods ? 'pointer' : 'not-allowed' }}
                  />
                  <span style={{ color: '#fff', fontSize: '14px' }}>Enabled</span>
                </label>
              </div>
              
              {method.enabled && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                  {methodKey === 'venmo' && (
                    <div>
                      <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Venmo Username</label>
                      <input
                        type="text"
                        value={method.username}
                        onChange={(e) => updatePaymentMethod(methodKey, 'username', e.target.value)}
                        disabled={!editModes.paymentMethods}
                        placeholder="@username"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #444',
                          background: editModes.paymentMethods ? '#222' : '#333',
                          color: editModes.paymentMethods ? '#fff' : '#888',
                          cursor: editModes.paymentMethods ? 'text' : 'not-allowed'
                        }}
                      />
                    </div>
                  )}
                  
                  {methodKey === 'cashapp' && (
                    <div>
                      <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Cash App Username</label>
                      <input
                        type="text"
                        value={method.username}
                        onChange={(e) => updatePaymentMethod(methodKey, 'username', e.target.value)}
                        disabled={!editModes.paymentMethods}
                        placeholder="$username"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #444',
                          background: editModes.paymentMethods ? '#222' : '#333',
                          color: editModes.paymentMethods ? '#fff' : '#888',
                          cursor: editModes.paymentMethods ? 'text' : 'not-allowed'
                        }}
                      />
                    </div>
                  )}
                  
                  {(methodKey === 'creditCard' || methodKey === 'applePay' || methodKey === 'googlePay') && (
                    <div>
                      <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Payment Link</label>
                      <input
                        type="url"
                        value={method.paymentLink}
                        onChange={(e) => updatePaymentMethod(methodKey, 'paymentLink', e.target.value)}
                        disabled={!editModes.paymentMethods}
                        placeholder="https://..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #444',
                          background: editModes.paymentMethods ? '#222' : '#333',
                          color: editModes.paymentMethods ? '#fff' : '#888',
                          cursor: editModes.paymentMethods ? 'text' : 'not-allowed'
                        }}
                      />
                    </div>
                  )}
                  
                  {methodKey === 'check' && (
                    <>
                      <div>
                        <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Payee Name</label>
                        <input
                          type="text"
                          value={method.payeeName}
                          onChange={(e) => updatePaymentMethod(methodKey, 'payeeName', e.target.value)}
                          disabled={!editModes.paymentMethods}
                          placeholder="Pay to the order of..."
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #444',
                            background: editModes.paymentMethods ? '#222' : '#333',
                            color: editModes.paymentMethods ? '#fff' : '#888',
                            cursor: editModes.paymentMethods ? 'text' : 'not-allowed'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Mailing Address</label>
                        <textarea
                          value={method.mailingAddress}
                          onChange={(e) => updatePaymentMethod(methodKey, 'mailingAddress', e.target.value)}
                          disabled={!editModes.paymentMethods}
                          placeholder="Mailing address for checks..."
                          rows="3"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #444',
                            background: editModes.paymentMethods ? '#222' : '#333',
                            color: editModes.paymentMethods ? '#fff' : '#888',
                            cursor: editModes.paymentMethods ? 'text' : 'not-allowed',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Instructions</label>
                    <textarea
                      value={method.instructions}
                      onChange={(e) => updatePaymentMethod(methodKey, 'instructions', e.target.value)}
                      disabled={!editModes.paymentMethods}
                      placeholder="Payment instructions..."
                      rows="2"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #444',
                        background: editModes.paymentMethods ? '#222' : '#333',
                        color: editModes.paymentMethods ? '#fff' : '#888',
                        cursor: editModes.paymentMethods ? 'text' : 'not-allowed',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Save/Cancel Buttons for Payment Methods */}
        {editModes.paymentMethods && (
          <div style={{ marginTop: '15px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleSaveSection('Payment Methods', {
                paymentMethods: config.paymentMethods
              })}
              disabled={savingSection === 'Payment Methods'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: savingSection === 'Payment Methods' ? '#666' : '#4CAF50',
                color: '#fff',
                cursor: savingSection === 'Payment Methods' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {savingSection === 'Payment Methods' ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
              {savingSection === 'Payment Methods' ? 'Saving...' : 'Save Payment Methods'}
            </button>
            <button
              onClick={() => cancelEdit('paymentMethods')}
              disabled={savingSection === 'Payment Methods'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #666',
                background: 'transparent',
                color: '#ccc',
                cursor: savingSection === 'Payment Methods' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Additional Instructions */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Additional Instructions</h3>
          <button
            onClick={() => toggleEditMode('additionalInstructions')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: editModes.additionalInstructions ? '#ff9800' : '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {editModes.additionalInstructions ? '🔒 Cancel Edit' : '✏️ Edit'}
          </button>
        </div>
        
        <div style={{ 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.1)',
          background: editModes.additionalInstructions ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255,255,255,0.02)',
          opacity: editModes.additionalInstructions ? 1 : 0.8
        }}>
          <textarea
            value={config.additionalInstructions}
            onChange={(e) => setConfig(prev => ({ ...prev, additionalInstructions: e.target.value }))}
            disabled={!editModes.additionalInstructions}
            placeholder="Enter any additional payment instructions or notes for players..."
            rows="4"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #444',
              background: editModes.additionalInstructions ? '#222' : '#333',
              color: editModes.additionalInstructions ? '#fff' : '#888',
              cursor: editModes.additionalInstructions ? 'text' : 'not-allowed',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
        
        {/* Save/Cancel Buttons for Additional Instructions */}
        {editModes.additionalInstructions && (
          <div style={{ marginTop: '15px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleSaveSection('Additional Instructions', {
                additionalInstructions: config.additionalInstructions
              })}
              disabled={savingSection === 'Additional Instructions'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: savingSection === 'Additional Instructions' ? '#666' : '#4CAF50',
                color: '#fff',
                cursor: savingSection === 'Additional Instructions' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {savingSection === 'Additional Instructions' ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
              {savingSection === 'Additional Instructions' ? 'Saving...' : 'Save Additional Instructions'}
            </button>
            <button
              onClick={() => cancelEdit('additionalInstructions')}
              disabled={savingSection === 'Additional Instructions'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #666',
                background: 'transparent',
                color: '#ccc',
                cursor: savingSection === 'Additional Instructions' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Contact Information</h3>
          <button
            onClick={() => toggleEditMode('contactInfo')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: editModes.contactInfo ? '#ff9800' : '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {editModes.contactInfo ? '🔒 Cancel Edit' : '✏️ Edit'}
          </button>
        </div>
        
        <div style={{ 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.1)',
          background: editModes.contactInfo ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255,255,255,0.02)',
          opacity: editModes.contactInfo ? 1 : 0.8
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Admin Name</label>
              <input
                type="text"
                value={config.contactInfo.adminName}
                onChange={(e) => updateContactInfo('adminName', e.target.value)}
                disabled={!editModes.contactInfo}
                placeholder="League Administrator Name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.contactInfo ? '#222' : '#333',
                  color: editModes.contactInfo ? '#fff' : '#888',
                  cursor: editModes.contactInfo ? 'text' : 'not-allowed'
                }}
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Admin Email</label>
              <input
                type="email"
                value={config.contactInfo.adminEmail}
                onChange={(e) => updateContactInfo('adminEmail', e.target.value)}
                disabled={!editModes.contactInfo}
                placeholder="admin@example.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.contactInfo ? '#222' : '#333',
                  color: editModes.contactInfo ? '#fff' : '#888',
                  cursor: editModes.contactInfo ? 'text' : 'not-allowed'
                }}
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Admin Phone</label>
              <input
                type="tel"
                value={config.contactInfo.adminPhone}
                onChange={(e) => updateContactInfo('adminPhone', e.target.value)}
                disabled={!editModes.contactInfo}
                placeholder="(555) 123-4567"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: editModes.contactInfo ? '#222' : '#333',
                  color: editModes.contactInfo ? '#fff' : '#888',
                  cursor: editModes.contactInfo ? 'text' : 'not-allowed'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Save/Cancel Buttons for Contact Information */}
        {editModes.contactInfo && (
          <div style={{ marginTop: '15px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleSaveSection('Contact Information', {
                contactInfo: config.contactInfo
              })}
              disabled={savingSection === 'Contact Information'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: savingSection === 'Contact Information' ? '#666' : '#4CAF50',
                color: '#fff',
                cursor: savingSection === 'Contact Information' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {savingSection === 'Contact Information' ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
              {savingSection === 'Contact Information' ? 'Saving...' : 'Save Contact Information'}
            </button>
            <button
              onClick={() => cancelEdit('contactInfo')}
              disabled={savingSection === 'Contact Information'}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #666',
                background: 'transparent',
                color: '#ccc',
                cursor: savingSection === 'Contact Information' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Save All Button */}
      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        border: '2px solid rgba(76, 175, 80, 0.3)', 
        borderRadius: '12px',
        background: 'rgba(76, 175, 80, 0.05)',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#4CAF50', marginBottom: '15px' }}>💾 Save All Changes</h3>
        <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '14px' }}>
          Use this button to save all configuration changes at once, or use the individual save buttons for each section above.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 30px',
            borderRadius: '8px',
            border: 'none',
            background: saving ? '#666' : 'linear-gradient(135deg, #4CAF50, #45a049)',
            color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '0 auto',
            boxShadow: saving ? 'none' : '0 4px 15px rgba(76, 175, 80, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!saving) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
            }
          }}
        >
          {saving ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
          {saving ? 'Saving All Changes...' : 'Save All Configuration'}
        </button>
      </div>
    </div>
  );
}
