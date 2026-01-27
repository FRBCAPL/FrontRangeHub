import React, { useState, useEffect } from 'react';

const TestEnvironmentAdmin = () => {
  const [status, setStatus] = useState(null);
  const [testPlayers, setTestPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState(null);

  const BACKEND_URL = 'http://localhost:8080';

  // Fetch test environment status
  const fetchStatus = async () => {
    try {
      console.log('Fetching test environment status from:', `${BACKEND_URL}/api/admin/test-environment/status`);
      const response = await fetch(`${BACKEND_URL}/api/admin/test-environment/status`);
      
      console.log('Response status:', response.status);
      
      if (response.status === 403) {
        setError('Test mode is disabled. Please set ADMIN_TEST_MODE=true in your environment variables.');
        return;
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setStatus(data);
      } else {
        setError(data.error || data.message || 'Failed to get status');
      }
    } catch (err) {
      console.error('Error fetching status:', err);
      setError(`Failed to connect to backend: ${err.message}`);
    }
  };

  // Fetch test players
  const fetchTestPlayers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/test-environment/players`);
      const data = await response.json();
      
      if (data.success) {
        setTestPlayers(data.players);
      } else {
        setError(data.error || 'Failed to get test players');
      }
    } catch (err) {
      setError('Failed to fetch test players');
    }
  };

  // Setup test environment
  const setupTestEnvironment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/test-environment/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchStatus();
        await fetchTestPlayers();
        setTestResults({ type: 'setup', message: `Created ${data.playersCreated} test players` });
      } else {
        setError(data.error || 'Failed to setup test environment');
      }
    } catch (err) {
      setError('Failed to setup test environment');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup test environment
  const cleanupTestEnvironment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/test-environment/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchStatus();
        setTestPlayers([]);
        setTestResults({ type: 'cleanup', message: `Deleted ${data.playersDeleted} players and ${data.matchesDeleted} matches` });
      } else {
        setError(data.error || 'Failed to cleanup test environment');
      }
    } catch (err) {
      setError('Failed to cleanup test environment');
    } finally {
      setLoading(false);
    }
  };

  // Test challenge match
  const testChallengeMatch = async (challengerPos, defenderPos) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/test-environment/test-challenge-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengerPosition: challengerPos,
          defenderPosition: defenderPos
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestPlayers(data.updatedLadder);
        setTestResults({ 
          type: 'challenge', 
          message: `Challenge match test completed - positions swapped`,
          result: data.matchResult
        });
      } else {
        setError(data.error || 'Failed to test challenge match');
      }
    } catch (err) {
      setError('Failed to test challenge match');
    } finally {
      setLoading(false);
    }
  };

  // Test fast track match
  const testFastTrackMatch = async (challengerPos, defenderPos) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/test-environment/test-fast-track-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengerPosition: challengerPos,
          defenderPosition: defenderPos
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestPlayers(data.updatedLadder);
        setTestResults({ 
          type: 'fasttrack', 
          message: `Fast track match test completed - player inserted at position ${defenderPos}`,
          result: data.matchResult
        });
      } else {
        setError(data.error || 'Failed to test fast track match');
      }
    } catch (err) {
      setError('Failed to test fast track match');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchTestPlayers();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#ffffff' }}>
      <h2 style={{ color: '#ff4444', marginBottom: '20px' }}>
        🧪 Test Environment Admin
      </h2>
      
      {/* Debug Info */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '20px',
        fontSize: '0.9rem'
      }}>
        <strong>Debug Info:</strong><br/>
        Backend URL: {BACKEND_URL}<br/>
        Loading: {loading ? 'Yes' : 'No'}<br/>
        Error: {typeof error === 'string' ? error : (error ? JSON.stringify(error) : 'None')}<br/>
        Status: {status ? 'Loaded' : 'Not loaded'}
      </div>

      {/* Status Card */}
      <div style={{
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid rgba(255, 68, 68, 0.3)',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#ff4444', marginBottom: '10px' }}>📊 Status</h3>
        {status ? (
          <div>
            <p><strong>Test Mode:</strong> {status.testMode ? '✅ Enabled' : '❌ Disabled'}</p>
            <p><strong>Test Ladder:</strong> {status.testLadder}</p>
            <p><strong>Test Players:</strong> {status.testPlayers}</p>
            <p><strong>Test Matches:</strong> {status.testMatches}</p>
            <p><strong>Setup Complete:</strong> {status.isSetup ? '✅ Yes' : '❌ No'}</p>
          </div>
        ) : (
          <p>Loading status...</p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: 'rgba(220, 38, 38, 0.1)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          color: '#dc2626'
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          color: '#16a34a'
        }}>
          <strong>✅ {testResults.type.toUpperCase()}:</strong> {testResults.message}
          {testResults.result && (
            <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
              <strong>Result:</strong> {JSON.stringify(testResults.result, null, 2)}
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={setupTestEnvironment}
          disabled={loading}
          style={{
            background: 'linear-gradient(45deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          🚀 Setup Test Environment
        </button>

        <button
          onClick={cleanupTestEnvironment}
          disabled={loading}
          style={{
            background: 'linear-gradient(45deg, #ef4444, #dc2626)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          🗑️ Cleanup Test Environment
        </button>

        <button
          onClick={() => {
            fetchStatus();
            fetchTestPlayers();
          }}
          disabled={loading}
          style={{
            background: 'linear-gradient(45deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Test Ladder Display */}
      {testPlayers.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#ff4444', marginBottom: '15px' }}>📊 Test Ladder</h3>
          
          <div style={{ marginBottom: '20px' }}>
            {testPlayers.map((player, index) => (
              <div key={player.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                borderRadius: '4px',
                marginBottom: '4px'
              }}>
                <span>
                  <strong>{player.position}.</strong> {player.firstName} {player.lastName}
                </span>
                <span style={{ color: '#888', fontSize: '0.9rem' }}>
                  Fargo: {player.fargoRate} | W:{player.wins} L:{player.losses}
                </span>
              </div>
            ))}
          </div>

          {/* Test Match Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '15px',
            marginTop: '20px'
          }}>
            {/* Challenge Match Tests */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '15px'
            }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '10px' }}>🥊 Challenge Match Tests</h4>
              <p style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#888' }}>
                Direct swap when challenger wins
              </p>
              <button
                onClick={() => testChallengeMatch(6, 1)}
                disabled={loading || testPlayers.length < 6}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginRight: '10px',
                  marginBottom: '5px'
                }}
              >
                Position 6 vs 1
              </button>
              <button
                onClick={() => testChallengeMatch(5, 2)}
                disabled={loading || testPlayers.length < 5}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginRight: '10px',
                  marginBottom: '5px'
                }}
              >
                Position 5 vs 2
              </button>
            </div>

            {/* Fast Track Match Tests */}
            <div style={{
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '8px',
              padding: '15px'
            }}>
              <h4 style={{ color: '#a855f7', marginBottom: '10px' }}>🚀 Fast Track Match Tests</h4>
              <p style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#888' }}>
                Insert challenger at defender's position
              </p>
              <button
                onClick={() => testFastTrackMatch(6, 3)}
                disabled={loading || testPlayers.length < 6}
                style={{
                  background: '#a855f7',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginRight: '10px',
                  marginBottom: '5px'
                }}
              >
                Position 6 → 3
              </button>
              <button
                onClick={() => testFastTrackMatch(5, 2)}
                disabled={loading || testPlayers.length < 5}
                style={{
                  background: '#a855f7',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginRight: '10px',
                  marginBottom: '5px'
                }}
              >
                Position 5 → 2
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Notice */}
      <div style={{
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '8px',
        padding: '15px',
        color: '#f59e0b'
      }}>
        <h4 style={{ marginBottom: '10px' }}>⚠️ Safety Notice</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Test environment uses separate ladder: <code>test-ladder-499-under</code></li>
          <li>Test players have "TestPlayer" names to avoid confusion</li>
          <li>Real ladder data is completely isolated and protected</li>
          <li>All test data can be safely deleted without affecting real players</li>
        </ul>
      </div>
    </div>
  );
};

export default TestEnvironmentAdmin;
