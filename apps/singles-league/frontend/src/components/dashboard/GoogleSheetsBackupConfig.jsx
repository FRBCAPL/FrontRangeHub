import React, { useState, useEffect } from 'react';
import { 
  FaGoogle, 
  FaCog, 
  FaSync, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaPlus,
  FaTrash,
  FaQuestionCircle,
  FaLightbulb,
  FaArrowRight,
  FaArrowLeft,
  FaCopy,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { BACKEND_URL } from '@shared/config/config.js';

export default function GoogleSheetsBackupConfig({ backendUrl }) {
  const [config, setConfig] = useState({
    enabled: false,
    sheetId: '',
    sheetName: 'Player Backup',
    apiKey: '',
    backupFrequency: 'weekly',
    autoBackup: true
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [backupStatus, setBackupStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadConfig();
    loadBackupStatus();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/league-config`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.config) {
        const backupConfig = data.config.googleSheetsBackup || {};
        
        setConfig({
          enabled: backupConfig.enabled || false,
          sheetId: backupConfig.sheetId || '',
          sheetName: backupConfig.sheetName || 'Player Backup',
          apiKey: backupConfig.apiKey === '***CONFIGURED***' ? '' : (backupConfig.apiKey || ''),
          backupFrequency: backupConfig.backupFrequency || 'weekly',
          autoBackup: backupConfig.autoBackup !== undefined ? backupConfig.autoBackup : true
        });
        
        if (backupConfig.sheetId && backupConfig.apiKey === '***CONFIGURED***') {
          setBackupStatus(prev => ({
            ...prev,
            enabled: backupConfig.enabled,
            sheetId: backupConfig.sheetId,
            sheetName: backupConfig.sheetName,
            configured: true,
            frequency: backupConfig.backupFrequency,
            autoBackup: backupConfig.autoBackup,
            lastBackup: backupConfig.lastBackupDate
          }));
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadBackupStatus = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/league-config/backup/status`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBackupStatus(data.backup);
        }
      }
    } catch (error) {
      console.error('Error loading backup status:', error);
    }
  };

  const showMessage = (type, text) => {
    setMessageType(type);
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleInputChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (field === 'sheetId' || field === 'apiKey') {
      setTestResult(null);
    }
  };

  const testConnection = async () => {
    if (!config.sheetId || !config.apiKey) {
      showMessage('error', 'Please fill in both fields first');
      return;
    }

    setLoading(true);
    setTestResult(null);
    try {
      const response = await fetch(`${backendUrl}/api/league-config/backup/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: config.sheetId,
          apiKey: config.apiKey
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResult({
          success: true,
          message: `✅ Great! Connection successful!`
        });
        showMessage('success', 'Connection successful!');
      } else {
        setTestResult({
          success: false,
          message: `❌ Connection failed: ${data.error}`
        });
        showMessage('error', `Connection failed: ${data.error}`);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed - please check your internet'
      });
      showMessage('error', 'Connection test failed');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config.sheetId || !config.apiKey) {
      showMessage('error', 'Please fill in both fields');
      return;
    }

    if (!testResult?.success) {
      showMessage('error', 'Please test the connection first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/league-config/backup/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage('success', '✅ Backup setup complete!');
        loadBackupStatus();
        setCurrentStep(4);
      } else {
        showMessage('error', `Setup failed: ${data.error}`);
      }
    } catch (error) {
      showMessage('error', 'Failed to save configuration');
    }
    setLoading(false);
  };

  const runManualBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/league-config/backup/run`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `✅ Backup completed! ${data.count} players backed up.`);
        loadBackupStatus();
      } else {
        showMessage('error', `Backup failed: ${data.error}`);
      }
    } catch (error) {
      showMessage('error', 'Backup failed');
    }
    setLoading(false);
  };

  const getSheetUrl = (sheetId) => {
    return `https://docs.google.com/spreadsheets/d/${sheetId}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('success', 'Copied to clipboard!');
  };

  const renderStep1 = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
      <h2 style={{ color: 'white', marginBottom: '20px' }}>Backup Your League Data</h2>
      <p style={{ fontSize: '18px', color: 'white', marginBottom: '30px', lineHeight: '1.6', opacity: 0.9 }}>
        Keep a safe copy of all your player information in Google Sheets.<br/>
        It's free, secure, and takes just a few minutes to set up.
      </p>
      
             <div style={{ 
         background: '#ffffff', 
         padding: '20px', 
         borderRadius: '12px',
         marginBottom: '30px',
         border: '2px solid #e0e0e0',
         boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
       }}>
         <h4 style={{ color: '#1a1a1a', marginBottom: '15px' }}>What You'll Get:</h4>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
           <div style={{ textAlign: 'center', padding: '15px' }}>
             <div style={{ fontSize: '32px', marginBottom: '10px' }}>🛡️</div>
             <strong style={{ color: '#1a1a1a' }}>Data Safety</strong><br/>
             <small style={{ color: '#2c2c2c' }}>Backup copy of all player info</small>
           </div>
           <div style={{ textAlign: 'center', padding: '15px' }}>
             <div style={{ fontSize: '32px', marginBottom: '10px' }}>📱</div>
             <strong style={{ color: '#1a1a1a' }}>Easy Viewing</strong><br/>
             <small style={{ color: '#2c2c2c' }}>View data in Google Sheets</small>
           </div>
           <div style={{ textAlign: 'center', padding: '15px' }}>
             <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔄</div>
             <strong style={{ color: '#1a1a1a' }}>Auto Backup</strong><br/>
             <small style={{ color: '#2c2c2c' }}>Keeps data up to date</small>
           </div>
         </div>
       </div>

       <div style={{ 
         background: '#f8f9fa', 
         padding: '25px', 
         borderRadius: '12px',
         marginBottom: '30px',
         border: '2px solid #e0e0e0',
         boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
       }}>
         <h4 style={{ color: '#1a1a1a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
           <FaQuestionCircle /> Frequently Asked Questions
         </h4>
         <div style={{ display: 'grid', gap: '15px' }}>
           <div style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
             <strong style={{ color: '#1a1a1a', display: 'block', marginBottom: '8px' }}>Q: Is this free to use?</strong>
             <span style={{ color: '#2c2c2c' }}>A: Yes! Google Sheets is completely free. You only need a Google account.</span>
           </div>
           <div style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
             <strong style={{ color: '#1a1a1a', display: 'block', marginBottom: '8px' }}>Q: How often does it backup?</strong>
             <span style={{ color: '#2c2c2c' }}>A: By default, it backs up weekly, but you can run manual backups anytime.</span>
           </div>
           <div style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
             <strong style={{ color: '#1a1a1a', display: 'block', marginBottom: '8px' }}>Q: Is my data secure?</strong>
             <span style={{ color: '#2c2c2c' }}>A: Yes! Your API key only works with your specific Google Sheet and is stored securely.</span>
           </div>
           <div style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
             <strong style={{ color: '#1a1a1a', display: 'block', marginBottom: '8px' }}>Q: What if I change my mind?</strong>
             <span style={{ color: '#2c2c2c' }}>A: You can disable backup anytime, and your Google Sheet will remain as a backup copy.</span>
           </div>
         </div>
       </div>

      <button
        onClick={() => setCurrentStep(2)}
        style={{
          padding: '15px 30px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '0 auto'
        }}
      >
        Get Started <FaArrowRight />
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ padding: '30px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: 'white', marginBottom: '10px' }}>Step 1: Create a Google Sheet</h2>
        <p style={{ color: 'white', fontSize: '16px', opacity: 0.9 }}>First, let's create a place to store your backup data</p>
      </div>

      <div style={{ 
        background: '#ffffff', 
        padding: '25px', 
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaGoogle /> Create Your Google Sheet
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'center' }}>
          <div>
            <p style={{ marginBottom: '15px', color: '#1a1a1a' }}>
              <strong>1.</strong> Go to <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>Google Sheets</a>
            </p>
            <p style={{ marginBottom: '15px', color: '#1a1a1a' }}>
              <strong>2.</strong> Click "Blank" to create a new sheet
            </p>
            <p style={{ marginBottom: '15px', color: '#1a1a1a' }}>
              <strong>3.</strong> Give it a name like "League Backup" or "Player Data"
            </p>
            <p style={{ color: '#1a1a1a' }}>
              <strong>4.</strong> Copy the Sheet ID from the URL (we'll show you how)
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
            <button
              onClick={() => window.open('https://sheets.google.com', '_blank')}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Open Google Sheets
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        background: '#fff8dc', 
        padding: '20px', 
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #ffd700'
      }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '15px' }}>How to Find Your Sheet ID:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
          <div>
            <p style={{ marginBottom: '10px', color: '#1a1a1a' }}>
              <strong>Look at your Google Sheet URL:</strong>
            </p>
            <div style={{ 
              background: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '6px',
              border: '1px solid #dee2e6',
              fontFamily: 'monospace',
              fontSize: '14px',
              wordBreak: 'break-all',
              color: '#1a1a1a'
            }}>
              https://docs.google.com/spreadsheets/d/<span style={{ background: '#ffeb3b', padding: '2px 4px', borderRadius: '3px' }}>1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</span>/edit
            </div>
            <p style={{ marginTop: '10px', color: '#2c2c2c', fontSize: '14px' }}>
              Copy the highlighted part (the long string of letters and numbers)
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
            <p style={{ color: '#2c2c2c', fontSize: '14px' }}>
              It's the part between <code style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: '3px' }}>/d/</code> and <code style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: '3px' }}>/edit</code>
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#1a1a1a' }}>
          Paste Your Sheet ID Here:
        </label>
        <input
          type="text"
          value={config.sheetId}
          onChange={(e) => handleInputChange('sheetId', e.target.value)}
          placeholder="Example: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          style={{
            width: '100%',
            padding: '15px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            fontSize: '16px',
            boxSizing: 'border-box',
            color: '#1a1a1a',
            backgroundColor: '#ffffff'
          }}
        />
        {config.sheetId && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#2c2c2c' }}>
            <a 
              href={getSheetUrl(config.sheetId)} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#007bff', textDecoration: 'underline' }}
            >
              🔗 Open this sheet to verify
            </a>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentStep(1)}
          style={{
            padding: '12px 24px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaArrowLeft /> Back
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          disabled={!config.sheetId}
          style={{
            padding: '12px 24px',
            background: config.sheetId ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: config.sheetId ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Next <FaArrowRight />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ padding: '30px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: 'white', marginBottom: '10px' }}>Step 2: Get Your API Key</h2>
        <p style={{ color: 'white', fontSize: '16px', opacity: 0.9 }}>This allows the app to write to your Google Sheet (it's free and secure)</p>
      </div>

      <div style={{ 
        background: '#ffffff', 
        padding: '25px', 
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '20px' }}>Getting Your API Key (Takes 2 Minutes):</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'center' }}>
          <div>
            <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '2' }}>
              <li style={{ marginBottom: '10px', color: '#1a1a1a' }}>
                <strong>Go to</strong> <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>Google Cloud Console</a>
              </li>
              <li style={{ marginBottom: '10px', color: '#1a1a1a' }}>
                <strong>Click "Create Project"</strong> (or select an existing one)
              </li>
              <li style={{ marginBottom: '10px', color: '#1a1a1a' }}>
                <strong>Search for "Google Sheets API"</strong> and click "Enable"
              </li>
              <li style={{ marginBottom: '10px', color: '#1a1a1a' }}>
                <strong>Go to "Credentials"</strong> → "Create Credentials" → "API Key"
              </li>
              <li style={{ color: '#1a1a1a' }}>
                <strong>Copy the API key</strong> (it looks like: AIzaSyC...)
              </li>
            </ol>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔑</div>
            <button
              onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Open Google Cloud Console
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        background: '#e8f5e8', 
        padding: '20px', 
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #28a745'
      }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '15px' }}>🔒 Don't Worry About Security:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1a1a1a' }}>
          <li>Your API key only works with your specific Google Sheet</li>
          <li>It can't access any other files or data</li>
          <li>It's stored securely and encrypted</li>
          <li>You can delete it anytime from Google Cloud Console</li>
        </ul>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#1a1a1a' }}>
          Paste Your API Key Here:
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showApiKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder="Example: AIzaSyC..."
            style={{
              width: '100%',
              padding: '15px',
              paddingRight: '50px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: '#ffffff'
            }}
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            {showApiKey ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentStep(2)}
          style={{
            padding: '12px 24px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaArrowLeft /> Back
        </button>
        <button
          onClick={() => setCurrentStep(4)}
          disabled={!config.sheetId || !config.apiKey}
          style={{
            padding: '12px 24px',
            background: (config.sheetId && config.apiKey) ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (config.sheetId && config.apiKey) ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Test & Save <FaArrowRight />
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={{ padding: '30px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: 'white', marginBottom: '10px' }}>Step 3: Test & Save</h2>
        <p style={{ color: 'white', fontSize: '16px', opacity: 0.9 }}>Let's make sure everything works before saving</p>
      </div>

      <div style={{ 
        background: '#ffffff', 
        padding: '25px', 
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '20px' }}>Your Setup Summary:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <strong style={{ color: '#1a1a1a' }}>Sheet ID:</strong><br/>
            <code style={{ 
              background: '#f8f9fa', 
              padding: '5px 8px', 
              borderRadius: '4px',
              fontSize: '14px',
              wordBreak: 'break-all',
              color: '#1a1a1a',
              border: '1px solid #dee2e6'
            }}>
              {config.sheetId || 'Not set'}
            </code>
          </div>
          <div>
            <strong style={{ color: '#1a1a1a' }}>API Key:</strong><br/>
            <code style={{ 
              background: '#f8f9fa', 
              padding: '5px 8px', 
              borderRadius: '4px',
              fontSize: '14px',
              color: '#1a1a1a',
              border: '1px solid #dee2e6'
            }}>
              {config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'Not set'}
            </code>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={testConnection}
          disabled={loading || !config.sheetId || !config.apiKey}
          style={{
            width: '100%',
            padding: '15px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: (loading || !config.sheetId || !config.apiKey) ? 0.6 : 1
          }}
        >
          {loading ? <FaSync style={{ animation: 'spin 1s linear infinite' }} /> : <FaSync />}
          {loading ? 'Testing Connection...' : 'Test Connection'}
        </button>
        
        {testResult && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            borderRadius: '8px',
            background: testResult.success ? '#d4edda' : '#f8d7da',
            color: testResult.success ? '#155724' : '#721c24',
            border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {testResult.success ? <FaCheckCircle /> : <FaExclamationTriangle />}
            {testResult.message}
          </div>
        )}
      </div>

      {testResult?.success && (
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={saveConfig}
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? <FaSync style={{ animation: 'spin 1s linear infinite' }} /> : <FaCheckCircle />}
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentStep(3)}
          style={{
            padding: '12px 24px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaArrowLeft /> Back
        </button>
        {backupStatus?.configured && (
          <button
            onClick={() => setCurrentStep(5)}
            style={{
              padding: '12px 24px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Next <FaArrowRight />
          </button>
        )}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div style={{ padding: '30px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
      <h2 style={{ color: '#1a1a1a', marginBottom: '20px' }}>Setup Complete!</h2>
      <p style={{ fontSize: '18px', color: '#2c2c2c', marginBottom: '30px', lineHeight: '1.6' }}>
        Your Google Sheets backup is now configured and ready to use.
      </p>

      <div style={{ 
        background: '#e8f5e8', 
        padding: '25px', 
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #28a745'
      }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '20px' }}>✅ What's Working Now:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔄</div>
            <strong style={{ color: '#1a1a1a' }}>Auto Backup</strong><br/>
            <small style={{ color: '#2c2c2c' }}>Your data will be backed up automatically</small>
          </div>
          <div>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
            <strong style={{ color: '#1a1a1a' }}>Easy Viewing</strong><br/>
            <small style={{ color: '#2c2c2c' }}>View your data in Google Sheets anytime</small>
          </div>
          <div>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🛡️</div>
            <strong style={{ color: '#1a1a1a' }}>Data Safety</strong><br/>
            <small style={{ color: '#2c2c2c' }}>Your data is now safely backed up</small>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={runManualBackup}
          disabled={loading}
          style={{
            padding: '15px 30px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '0 auto'
          }}
        >
          {loading ? <FaSync style={{ animation: 'spin 1s linear infinite' }} /> : <FaSync />}
          {loading ? 'Running Backup...' : 'Run Your First Backup'}
        </button>
        <p style={{ marginTop: '10px', color: '#2c2c2c', fontSize: '14px' }}>
          This will copy all your current player data to your Google Sheet
        </p>
      </div>

      {backupStatus?.sheetId && (
        <div style={{ marginBottom: '30px' }}>
          <a 
            href={getSheetUrl(backupStatus.sheetId)} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              padding: '12px 24px',
              background: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px'
            }}
          >
            <FaExternalLinkAlt /> View Your Backup Sheet
          </a>
        </div>
      )}

      <div style={{ 
        background: '#fff8dc', 
        padding: '20px', 
        borderRadius: '12px',
        border: '2px solid #ffd700',
        textAlign: 'left'
      }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '15px' }}>💡 What Happens Next:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1a1a1a', lineHeight: '1.6' }}>
          <li>Your data will be backed up automatically</li>
          <li>You can view your data anytime in Google Sheets</li>
          <li>You can run manual backups whenever you want</li>
          <li>Your data is safe and secure</li>
        </ul>
      </div>
    </div>
  );

  const renderCurrentStatus = () => (
    <div style={{
      background: '#ffffff',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '2px solid #e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1a1a1a' }}>
        <FaInfoCircle /> Current Status
      </h4>
      {backupStatus ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#1a1a1a' }}>
          <div>
            <strong>Status:</strong> {backupStatus.enabled ? '✅ Enabled' : '❌ Disabled'}
          </div>
          <div>
            <strong>Last Backup:</strong> {backupStatus.lastBackup ? new Date(backupStatus.lastBackup).toLocaleString() : 'Never'}
          </div>
          {backupStatus.sheetId && (
            <>
              <div>
                <strong>Sheet:</strong> {backupStatus.sheetName || 'Player Backup'}
              </div>
              <div>
                <strong>Sheet ID:</strong> {backupStatus.sheetId.substring(0, 20)}...
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ color: '#2c2c2c', fontStyle: 'italic' }}>
          No backup configured
        </div>
      )}
             <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
         {backupStatus?.sheetId && (
           <a 
             href={getSheetUrl(backupStatus.sheetId)} 
             target="_blank" 
             rel="noopener noreferrer"
             style={{ 
               color: '#007bff', 
               textDecoration: 'none',
               display: 'inline-flex',
               alignItems: 'center',
               gap: '5px',
               padding: '8px 12px',
               border: '1px solid #007bff',
               borderRadius: '4px',
               fontSize: '14px'
             }}
           >
             <FaExternalLinkAlt /> View Backup Sheet
           </a>
         )}
         <button
           onClick={() => setCurrentStep(5)}
           disabled={!backupStatus?.configured}
           style={{
             padding: '8px 12px',
             background: backupStatus?.configured ? '#007bff' : '#ccc',
             color: 'white',
             border: 'none',
             borderRadius: '4px',
             cursor: backupStatus?.configured ? 'pointer' : 'not-allowed',
             fontSize: '14px',
             opacity: backupStatus?.configured ? 1 : 0.6
           }}
         >
           Manage Backup Settings
         </button>
       </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
          <FaGoogle /> Google Sheets Backup
        </h2>
        <p style={{ margin: 0, opacity: 0.9, color: 'white' }}>
          Keep your league data safe with automatic Google Sheets backup
        </p>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: messageType === 'success' ? '#d4edda' : '#f8d7da',
          color: messageType === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message}
        </div>
      )}

      {backupStatus?.configured && renderCurrentStatus()}

             {currentStep === 1 && renderStep1()}
       {currentStep === 2 && renderStep2()}
       {currentStep === 3 && renderStep3()}
       {currentStep === 4 && renderStep4()}
       {currentStep === 5 && renderStep5()}
    </div>
  );
}
