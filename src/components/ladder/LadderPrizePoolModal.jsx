import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BACKEND_URL } from '../../config.js';

// Add CSS animation for pulse effect
const pulseAnimation = `
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.02); }
    100% { opacity: 1; transform: scale(1); }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseAnimation;
  document.head.appendChild(style);
}

const LadderPrizePoolModal = ({ isOpen, onClose, selectedLadder }) => {
  const [currentLadder, setCurrentLadder] = useState(selectedLadder);
  const [prizePoolData, setPrizePoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [winners, setWinners] = useState([]);
  const [seedFundingData, setSeedFundingData] = useState(null);
  const [showHistoricalPopup, setShowHistoricalPopup] = useState(false);
  const [showWinnersPopup, setShowWinnersPopup] = useState(false);
  const [ladderStandings, setLadderStandings] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setCurrentLadder(selectedLadder);
    }
  }, [isOpen, selectedLadder]);

  useEffect(() => {
    if (isOpen) {
      fetchPrizePoolData();
      fetchHistoricalData();
      fetchWinners();
      fetchSeedFunding();
      fetchLadderStandings();
      
      // Set up real-time updates every 30 seconds
      const interval = setInterval(() => {
        fetchPrizePoolData();
        fetchLadderStandings();
      }, 30000);
      
      // Add keyboard event listener for ESC key
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, currentLadder, onClose]);

  const fetchPrizePoolData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Connect to Real API - Fetch actual match data and prize pool
      const response = await fetch(`${BACKEND_URL}/api/ladder/prize-pool/${currentLadder}`);
      
      if (response.ok) {
        const data = await response.json();
        setPrizePoolData(data);
      } else {
        // Fallback to estimated data if API not available yet
        const estimatedData = calculateEstimatedPrizePool();
        setPrizePoolData(estimatedData);
      }
    } catch (error) {
      console.error('Error fetching prize pool data:', error);
      // Fallback to estimated data
      const estimatedData = calculateEstimatedPrizePool();
      setPrizePoolData(estimatedData);
      setError('Using estimated data - API connection failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/prize-pool/${currentLadder}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistoricalData(data);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const fetchWinners = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/prize-pool/${currentLadder}/winners`);
      if (response.ok) {
        const data = await response.json();
        console.log('Winners data received:', data);
        // Ensure we set an array even if the API returns null/undefined
        setWinners(Array.isArray(data) ? data : []);
      } else {
        console.log('No winners endpoint available, setting empty array');
        setWinners([]);
      }
    } catch (error) {
      console.error('Error fetching winners:', error);
      setWinners([]);
    }
  };

  const fetchSeedFunding = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/prize-pool/${currentLadder}/seed-funding`);
      if (response.ok) {
        const data = await response.json();
        console.log('Seed funding data received:', data);
        console.log('Next payout date:', data.nextPayoutDate);
        console.log('Next payout date type:', typeof data.nextPayoutDate);
        setSeedFundingData(data);
      } else {
        console.log('No seed funding endpoint available');
        setSeedFundingData(null);
      }
    } catch (error) {
      console.error('Error fetching seed funding:', error);
      setSeedFundingData(null);
    }
  };

  const fetchLadderStandings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/ladders/${currentLadder}/players`);
      if (response.ok) {
        const data = await response.json();
        console.log('Ladder standings received:', data);
        // Sort by position to get proper standings order
        const sortedData = data.sort((a, b) => a.position - b.position);
        setLadderStandings(sortedData);
      } else {
        console.log('No standings endpoint available');
        setLadderStandings([]);
      }
    } catch (error) {
      console.error('Error fetching ladder standings:', error);
      setLadderStandings([]);
    }
  };

  const calculateEstimatedPrizePool = () => {
    // Fallback calculation based on the new 3-month system
    const currentDate = new Date();
    const startOfPeriod = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 2) * 2, 1);
    const daysInPeriod = Math.floor((currentDate - startOfPeriod) / (1000 * 60 * 60 * 24));
    
    // Estimate based on 3 matches per week average
    const estimatedMatches = Math.floor((daysInPeriod / 7) * 3);
    const estimatedPrizePool = estimatedMatches * 3; // $3 per match to prize pool
    
    const nextDistribution = new Date(startOfPeriod);
    nextDistribution.setMonth(nextDistribution.getMonth() + 2);
    
    return {
      currentPrizePool: estimatedPrizePool,
      totalMatches: estimatedMatches,
      nextDistribution: nextDistribution.toISOString(),
      isEstimated: true
    };
  };

  const getLadderDisplayName = (ladderName) => {
    switch (ladderName) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      default: return ladderName;
    }
  };

  const handleLadderChange = (newLadder) => {
    setCurrentLadder(newLadder);
    setShowHistoricalPopup(false);
    setShowWinnersPopup(false);
    fetchSeedFunding();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="prize-pool-modal" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: -20,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div 
        className="prize-pool-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderRadius: '16px',
          padding: '0.1rem',
        maxWidth: '90vw',
        maxHeight: '100vh',
        width: '90vw',
        height: '100vh',
          overflow: 'auto',
          border: '2px solid #00ff00',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.5)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ 
          position: 'relative',
          marginBottom: '0.05rem',
          paddingBottom: '0.05rem',
          borderBottom: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: 'rgba(255, 68, 68, 0.2)',
              border: '1px solid #ff4444',
              color: '#ff4444',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              zIndex: 10
            }}
          >
            ✕ Close
          </button>
          <h2 style={{
            color: '#8b5cf6',
            margin: '0 0 0.5rem 0',
            fontSize: '1.2rem',
            textAlign: 'center',
            fontWeight: 'bold',
            marginTop: '1.7rem'
          }}>
            🏆  Prize Pool Tracker
          </h2>
          
          {/* Ladder Selector */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'left',
            gap: '0.4rem',
            marginTop: '0.8rem',
            flexWrap: 'wrap',
            paddingLeft: '2rem'
          }}>
            <label style={{ 
              color: '#ccc', 
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              Select Ladder:
            </label>
            <select 
              value={currentLadder} 
              onChange={(e) => handleLadderChange(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: '0.2rem 0.8rem',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                minWidth: '140px'
              }}
            >
              <option value="499-under">499 & Under</option>
              <option value="500-549">500-549</option>
              <option value="550-plus">550+</option>
            </select>
          </div>
          
          <div style={{
            marginTop: '1rem',
            textAlign: 'left',
            paddingRight: '60px',
            color: '#8b5cf6',
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>
            {getLadderDisplayName(currentLadder)} Ladder
          </div>
          
          {/* Live Update Indicator */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '60px',
            display: 'flex',
            alignItems: 'left',
            gap: '2px',
            fontSize: '0.8rem',
            color: '#00ff00'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00ff00',
              animation: 'pulse 2s infinite'
            }}></div>
            Live
          </div>
          
        
        </div>

        {/* Content */}
        <div className="modal-body">
          {loading && !prizePoolData ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: '#ccc', marginTop: '1rem' }}>Loading prize pool data...</p>
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '6px',
                  padding: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  color: '#ffc107'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Current Prize Pool Status */}
              <div style={{ marginBottom: '0.1rem' }}>
                <div style={{
                  background: 'rgba(0, 255, 0, 0.1)',
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '0.1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00' }}>
                    {formatCurrency(seedFundingData?.totalPrizePool || 0)}
                  </div>
                  <div style={{ color: '#ccc', fontSize: '1rem' }}>
                    Current Prize Pool
                  </div>
                {/* Show disclaimer only before Nov 1, 2025 */}
                {new Date() < new Date(2025, 10, 1) && (
                  <div style={{ 
                    color: '#ff0000', 
                    fontSize: '1rem', 
                    marginTop: '8px', 
                    fontWeight: 'bold',
                    textShadow: '0 0 8px rgba(255, 0, 0, 0.8)',
                    background: 'rgba(255, 0, 0, 0.1)',
                    border: '2px solid #ff0000',
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'center',
                    animation: 'pulse 2s infinite'
                  }}>
                    ⚠️ SIMULATION UNTIL NOV 1ST ⚠️<br/>
                    These amounts will NOT be paid out<br/>
                    Real prize fund starts Nov 1st
                  </div>
                )}
                  {prizePoolData?.isEstimated && (
                    <div style={{ color: '#ffc107', fontSize: '0.9rem', marginTop: '4px' }}>
                      (Estimated)
                    </div>
                  )}
                </div>
              </div>

              {/* Date Information */}
              {seedFundingData && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    Period Start: {new Date(seedFundingData.currentPeriodStart).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })} • Next Payout: {new Date(seedFundingData.nextPayoutDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </div>
                  <div style={{ color: '#8b5cf6', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Payouts and resets every 3 months
                  </div>
                </div>
              )}

              {/* Prize Pool Details */}
              <div style={{ marginBottom: '0.1rem' }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem', fontSize: '1.1rem', textAlign: 'center' }}>
                  Prize Pool Details
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gap: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ccc' }}>Total Matches:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      {prizePoolData?.totalMatches || 0}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ccc' }}>Next Distribution:</span>
                    <span style={{ color: '#fff' }}>
                      {prizePoolData?.nextDistribution ? formatDate(prizePoolData.nextDistribution) : 'TBD'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ccc' }}>Prize Split:</span>
                    <span style={{ color: '#fff' }}>
                      Climber + Top {seedFundingData?.payouts?.placesToPay || 1} Place{seedFundingData?.payouts?.placesToPay > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(0, 255, 0, 0.1)',
                    border: '1px solid rgba(0, 255, 0, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>Climber:</span>
                      <span style={{ 
                        color: '#ffffff', 
                        fontSize: '1.0rem', 
                        fontStyle: 'italic', 
                        fontWeight: 'bold',
                        textShadow: '-0.1px -0.1px 0rgb(5, 5, 5), 0.1px -0.1px 0rgb(10, 10, 10), -0.1px 0.1px 0 #ffffff, 0.1px 0.1px 0 #ffffff, 0 0 3px rgba(255, 255, 255, 0.93)'
                      }}>
                      {seedFundingData?.currentClimber ? 
                        `${seedFundingData.currentClimber.name} (+${seedFundingData.currentClimber.positionsClimbed})` : 
                        'No climber data yet'
                      }
                    </span>
                    <span style={{ color: '#00ff00', fontWeight: 'bold' }}>
                      {formatCurrency(seedFundingData?.payouts?.climber || 0)}
                    </span>
                  </div>
                  {/* Dynamic place payouts based on placesToPay */}
                  {seedFundingData?.payouts?.firstPlace !== undefined && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'rgba(0, 255, 0, 0.1)',
                      border: '1px solid rgba(0, 255, 0, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '1px'
                    }}>
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>1st Place:</span>
                      <span style={{ 
                        color: '#00ff88', 
                        fontSize: '1.1rem', 
                        fontStyle: 'italic', 
                        fontWeight: 'bold',
                        textShadow: '0 0 8px rgba(0, 255, 136, 0.5)',
                        background: 'linear-gradient(45deg, #00ff88, #00ffaa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>
                        {ladderStandings.length > 0 ? `${ladderStandings[0]?.firstName || ''} ${ladderStandings[0]?.lastName || ''}`.trim() || 'No player' : 'No players yet'}
                      </span>
                      <span style={{ color: '#00ff00', fontWeight: 'bold' }}>
                        {formatCurrency(seedFundingData?.payouts?.firstPlace || 0)}
                      </span>
                    </div>
                  )}
                  {seedFundingData?.payouts?.secondPlace !== undefined && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'rgba(0, 255, 0, 0.1)',
                      border: '1px solid rgba(0, 255, 0, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '1px'
                    }}>
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>2nd Place:</span>
                      <span style={{ 
                        color: '#ffd700', 
                        fontSize: '1.1rem', 
                        fontStyle: 'italic', 
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(255, 215, 0, 0.7)',
                        background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>
                        {ladderStandings.length > 1 ? `${ladderStandings[1]?.firstName || ''} ${ladderStandings[1]?.lastName || ''}`.trim() || 'No player' : 'No player'}
                      </span>
                      <span style={{ color: '#00ff00', fontWeight: 'bold' }}>
                        {formatCurrency(seedFundingData?.payouts?.secondPlace || 0)}
                      </span>
                    </div>
                  )}
                  {seedFundingData?.payouts?.thirdPlace !== undefined && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'rgba(0, 255, 0, 0.1)',
                      border: '1px solid rgba(0, 255, 0, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '1px'
                    }}>
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>3rd Place:</span>
                      <span style={{ 
                        color: '#c0c0c0', 
                        fontSize: '1.1rem', 
                        fontStyle: 'italic', 
                        fontWeight: 'bold',
                        textShadow: '0 0 8px rgba(192, 192, 192, 0.6)',
                        background: 'linear-gradient(45deg, #c0c0c0, #e8e8e8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>
                        {ladderStandings.length > 2 ? `${ladderStandings[2]?.firstName || ''} ${ladderStandings[2]?.lastName || ''}`.trim() || 'No player' : 'No player'}
                      </span>
                      <span style={{ color: '#00ff00', fontWeight: 'bold' }}>
                        {formatCurrency(seedFundingData?.payouts?.thirdPlace || 0)}
                      </span>
                    </div>
                  )}
                  {seedFundingData?.payouts?.fourthPlace !== undefined && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'rgba(0, 255, 0, 0.1)',
                      border: '1px solid rgba(0, 255, 0, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '1px'
                    }}>
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>4th Place:</span>
                      <span style={{ 
                        color: '#8b5cf6', 
                        fontSize: '1.1rem', 
                        fontStyle: 'italic', 
                        fontWeight: 'bold',
                        textShadow: '0 0 8px rgba(139, 92, 246, 0.6)',
                        background: 'linear-gradient(45deg, #8b5cf6, #a78bfa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>
                        {ladderStandings.length > 3 ? `${ladderStandings[3]?.firstName || ''} ${ladderStandings[3]?.lastName || ''}`.trim() || 'No player' : 'No player'}
                      </span>
                      <span style={{ color: '#00ff00', fontWeight: 'bold' }}>
                        {formatCurrency(seedFundingData?.payouts?.fourthPlace || 0)}
                      </span>
                    </div>
                  )}
                  
                  {/* Total Payout Verification */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(0, 255, 0, 0.05)',
                    border: '1px solid rgba(0, 255, 0, 0.2)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginTop: '4px'
                  }}>
                    <span style={{ color: '#00ff00', fontSize: '1rem', fontWeight: 'bold' }}>Total Payouts:</span>
                    <span style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {formatCurrency(
                        (seedFundingData?.payouts?.climber || 0) +
                        (seedFundingData?.payouts?.firstPlace || 0) +
                        (seedFundingData?.payouts?.secondPlace || 0) +
                        (seedFundingData?.payouts?.thirdPlace || 0) +
                        (seedFundingData?.payouts?.fourthPlace || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gap: '0.02rem', marginBottom: '0.1rem' }}>
                <button
                  onClick={() => setShowWinnersPopup(true)}
                  style={{
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    color: '#ffc107',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 193, 7, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 193, 7, 0.1)';
                  }}
                >
                  🏅 Show Winners
                </button>
                
                <button
                  onClick={() => setShowHistoricalPopup(true)}
                  style={{
                    background: 'rgba(0, 123, 255, 0.1)',
                    border: '1px solid rgba(0, 123, 255, 0.3)',
                    color: '#007bff',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(0, 123, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(0, 123, 255, 0.1)';
                  }}
                >
                  📊 Show History
                </button>
              </div>


            </>
          )}
        </div>
      </div>

      {/* Winners Popup Modal */}
      {showWinnersPopup && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '350px',
            width: '55%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '2px solid #00ff00',
            boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowWinnersPopup(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid rgba(255, 0, 0, 0.5)',
                color: '#ff4444',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 0, 0, 0.3)';
                e.target.style.borderColor = 'rgba(255, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 0, 0, 0.2)';
                e.target.style.borderColor = 'rgba(255, 0, 0, 0.5)';
              }}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{ 
                color: '#ffc107', 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.8rem',
                fontWeight: 'bold'
              }}>
                🏅 Recent Winners
              </h2>
              <p style={{ color: '#ccc', margin: 0, fontSize: '1rem' }}>
                {currentLadder} Ladder Prize Winners
              </p>
            </div>

            {/* Winners Content */}
            <div style={{ 
              background: 'rgba(255, 193, 7, 0.05)', 
              borderRadius: '12px', 
              padding: '1.5rem',
              border: '1px solid rgba(255, 193, 7, 0.2)'
            }}>
              {winners.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {winners.map((winner, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 193, 7, 0.1)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 193, 7, 0.1)';
                      e.target.style.borderColor = 'rgba(255, 193, 7, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.borderColor = 'rgba(255, 193, 7, 0.1)';
                    }}>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                          {winner.playerName}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '2px' }}>
                          {winner.category} • {formatDate(winner.date)}
                        </div>
                      </div>
                      <div style={{ 
                        color: '#ffc107', 
                        fontWeight: 'bold', 
                        fontSize: '1.2rem',
                        textAlign: 'right'
                      }}>
                        {formatCurrency(winner.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  color: '#ccc', 
                  fontStyle: 'italic', 
                  textAlign: 'center',
                  padding: '2rem',
                  fontSize: '1.1rem'
                }}>
                  🏆 No winners recorded yet
                  <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Winners will appear here after the first prize distribution
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ 
              marginTop: '1.5rem', 
              textAlign: 'center',
              color: '#888',
              fontSize: '0.9rem'
            }}>
              Prize distributions occur every 3 months
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* History Popup Modal */}
      {showHistoricalPopup && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '350px',
            width: '55%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '2px solid #00ff00',
            boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowHistoricalPopup(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid rgba(255, 0, 0, 0.5)',
                color: '#ff4444',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 0, 0, 0.3)';
                e.target.style.borderColor = 'rgba(255, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 0, 0, 0.2)';
                e.target.style.borderColor = 'rgba(255, 0, 0, 0.5)';
              }}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{ 
                color: '#007bff', 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.8rem',
                fontWeight: 'bold'
              }}>
                📊 Prize Pool History
              </h2>
              <p style={{ color: '#ccc', margin: 0, fontSize: '1rem' }}>
                {currentLadder} Ladder Historical Data
              </p>
            </div>

            {/* History Content */}
            <div style={{ 
              background: 'rgba(0, 123, 255, 0.05)', 
              borderRadius: '12px', 
              padding: '1.5rem',
              border: '1px solid rgba(0, 123, 255, 0.2)'
            }}>
              {historicalData.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {historicalData.map((period, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: period.isCurrent ? 'rgba(0, 123, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: period.isCurrent ? '1px solid rgba(0, 123, 255, 0.3)' : '1px solid rgba(0, 123, 255, 0.1)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(0, 123, 255, 0.15)';
                      e.target.style.borderColor = 'rgba(0, 123, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = period.isCurrent ? 'rgba(0, 123, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
                      e.target.style.borderColor = period.isCurrent ? 'rgba(0, 123, 255, 0.3)' : 'rgba(0, 123, 255, 0.1)';
                    }}>
                      <div>
                        <div style={{ 
                          color: period.isCurrent ? '#00ff00' : '#fff', 
                          fontWeight: 'bold', 
                          fontSize: '1.1rem' 
                        }}>
                          {period.period}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '2px' }}>
                          {period.matches} matches played
                        </div>
                      </div>
                      <div style={{ 
                        color: period.isCurrent ? '#00ff00' : '#007bff', 
                        fontWeight: 'bold', 
                        fontSize: '1.2rem',
                        textAlign: 'right'
                      }}>
                        {formatCurrency(period.prizePool)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  color: '#ccc', 
                  fontStyle: 'italic', 
                  textAlign: 'center',
                  padding: '2rem',
                  fontSize: '1.1rem'
                }}>
                  📊 No historical data available
                  <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Historical data will appear here after prize distributions
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ 
              marginTop: '1.5rem', 
              textAlign: 'center',
              color: '#888',
              fontSize: '0.9rem'
            }}>
              Prize pools reset every 3 months
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

export default LadderPrizePoolModal;
