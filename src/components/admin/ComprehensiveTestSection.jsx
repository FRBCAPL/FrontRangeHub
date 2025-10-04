import React, { useState } from 'react';
import { BACKEND_URL } from '../../config.js';

const ComprehensiveTestSection = ({ backendUrl }) => {
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setError(null);
    setTestResults(null);

    try {
      // Call the comprehensive test endpoint
      const response = await fetch(`${backendUrl}/api/test/comprehensive-real-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('userToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setTestResults(results);
    } catch (err) {
      setError(err.message);
      console.error('Test execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const formatTestResults = (results) => {
    if (!results) return null;

    return (
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#1a1a1a', 
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        whiteSpace: 'pre-wrap',
        maxHeight: '600px',
        overflow: 'auto'
      }}>
        <h3 style={{ color: '#4CAF50', marginBottom: '15px' }}>🧪 Comprehensive Test Results</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Test Status:</strong> {results.success ? '✅ PASSED' : '❌ FAILED'}
        </div>
        
        {results.summary && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Summary:</strong><br/>
            {results.summary}
          </div>
        )}
        
        {results.details && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Details:</strong><br/>
            {results.details}
          </div>
        )}
        
        {results.errors && results.errors.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <strong style={{ color: '#ff6b6b' }}>Errors Found:</strong><br/>
            {results.errors.map((error, index) => (
              <div key={index} style={{ color: '#ff6b6b', marginLeft: '20px' }}>
                • {error}
              </div>
            ))}
          </div>
        )}
        
        {results.warnings && results.warnings.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <strong style={{ color: '#ffa726' }}>Warnings:</strong><br/>
            {results.warnings.map((warning, index) => (
              <div key={index} style={{ color: '#ffa726', marginLeft: '20px' }}>
                • {warning}
              </div>
            ))}
          </div>
        )}
        
        {results.fullOutput && (
          <div style={{ marginTop: '20px' }}>
            <strong>Full Test Output:</strong><br/>
            <div style={{ 
              backgroundColor: '#000', 
              padding: '10px', 
              borderRadius: '4px',
              marginTop: '10px',
              fontSize: '12px'
            }}>
              {results.fullOutput}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#2a2a2a', 
      borderRadius: '8px',
      margin: '20px 0'
    }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>
        🧪 Comprehensive Ladder Test Suite
      </h2>
      
      <p style={{ color: '#ccc', marginBottom: '20px' }}>
        This test simulates real user interactions with the ladder system, including:
        <br/>• User registration and login
        <br/>• Ladder signup and player management
        <br/>• Challenge creation and match reporting
        <br/>• Payment processing and admin functions
      </p>
      
      <button
        onClick={runComprehensiveTest}
        disabled={isRunning}
        style={{
          background: isRunning 
            ? 'linear-gradient(135deg, #666, #888)' 
            : 'linear-gradient(135deg, #ff6b35, #f7931e)',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          transition: 'all 0.3s ease'
        }}
      >
        {isRunning ? '🔄 Running Test...' : '🚀 Run Comprehensive Test'}
      </button>
      
      {error && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#ff4444', 
          color: 'white',
          borderRadius: '6px'
        }}>
          <strong>❌ Test Execution Error:</strong><br/>
          {error}
        </div>
      )}
      
      {testResults && formatTestResults(testResults)}
      
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#1a1a1a', 
        borderRadius: '6px',
        color: '#ccc',
        fontSize: '14px'
      }}>
        <strong>💡 Note:</strong> This test creates temporary test users and data. 
        The test data is automatically cleaned up after completion.
      </div>
    </div>
  );
};

export default ComprehensiveTestSection;
