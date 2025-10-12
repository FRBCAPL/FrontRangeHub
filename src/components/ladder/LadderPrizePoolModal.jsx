import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabaseDataService } from '../../services/supabaseDataService.js';

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

  // Recalculate seed funding whenever prize pool data or ladder standings change
  useEffect(() => {
    if (prizePoolData && ladderStandings.length > 0) {
      fetchSeedFunding();
    }
  }, [prizePoolData, ladderStandings]);

  useEffect(() => {
    if (isOpen) {
      fetchPrizePoolData();
      fetchHistoricalData();
      fetchWinners();
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
      
      // Use Supabase data service
      console.log('🎯 Prize Pool: Fetching data for ladder:', currentLadder);
      const result = await supabaseDataService.getPrizePoolData(currentLadder);
      console.log('🎯 Prize Pool: Supabase result:', result);
      
      if (result.success) {
        console.log('🎯 Prize Pool: Setting prize pool data:', result.data);
        setPrizePoolData(result.data);
      } else {
        console.log('🎯 Prize Pool: Supabase query failed, using estimated data');
        // Fallback to estimated data if Supabase query fails
        const estimatedData = calculateEstimatedPrizePool();
        setPrizePoolData(estimatedData);
        setError('Using estimated data - Supabase query failed');
      }
    } catch (error) {
      console.error('Error fetching prize pool data:', error);
      // Fallback to estimated data
      const estimatedData = calculateEstimatedPrizePool();
      setPrizePoolData(estimatedData);
      setError('Using estimated data - Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const result = await supabaseDataService.getPrizePoolHistory(currentLadder);
      if (result.success) {
        setHistoricalData(result.data);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const fetchWinners = async () => {
    try {
      const result = await supabaseDataService.getPrizePoolWinners(currentLadder);
      if (result.success) {
        console.log('Winners data received:', result.data);
        // Ensure we set an array even if the API returns null/undefined
        setWinners(Array.isArray(result.data) ? result.data : []);
      } else {
        console.log('No winners data available, setting empty array');
        setWinners([]);
      }
    } catch (error) {
      console.error('Error fetching winners:', error);
      setWinners([]);
    }
  };

  const fetchSeedFunding = async () => {
    try {
      const now = new Date();
      const activePlayerCount = ladderStandings.length || 25; // Use actual count or default to 25
      const completedMatches = prizePoolData?.totalMatches || 0;
      
      // Determine current phase and calculate accordingly
      let phase, membershipFee, placementSeedPerPlayer, climberSeedPerPlayer, periodStartDate, nextPayoutDate, periodLengthMonths;
      
      if (now < new Date(2025, 10, 1)) { // Before Nov 1, 2025 (month 10 = November)
        // Phase 1: Testing phase - show Phase 3 simulation
        phase = 1;
        membershipFee = 0; // Free during testing
        placementSeedPerPlayer = 7; // Show Phase 3 amounts
        climberSeedPerPlayer = 1;
        periodStartDate = new Date(2025, 8, 1).toISOString(); // Sept 1, 2025
        nextPayoutDate = new Date(2025, 10, 1).toISOString(); // Nov 1, 2025 (no real payout)
        periodLengthMonths = 2;
      } else if (now < new Date(2026, 0, 1)) { // Nov 1, 2025 - Dec 31, 2025 (month 0 = January)
        // Phase 2: 2-month trial launch
        phase = 2;
        membershipFee = 5;
        placementSeedPerPlayer = 2.50;
        climberSeedPerPlayer = 0.50;
        periodStartDate = new Date(2025, 10, 1).toISOString(); // Nov 1, 2025
        nextPayoutDate = new Date(2026, 0, 1).toISOString(); // Jan 1, 2026
        periodLengthMonths = 2;
      } else {
        // Phase 3: Full launch with 3-month periods
        phase = 3;
        membershipFee = 10;
        placementSeedPerPlayer = 7;
        climberSeedPerPlayer = 1;
        // Calculate current 3-month period (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
        const currentMonth = now.getMonth();
        const periodStartMonth = Math.floor(currentMonth / 3) * 3;
        periodStartDate = new Date(now.getFullYear(), periodStartMonth, 1).toISOString();
        nextPayoutDate = new Date(now.getFullYear(), periodStartMonth + 3, 1).toISOString();
        periodLengthMonths = 3;
      }
      
      // Calculate funds
      const placementSeed = activePlayerCount * placementSeedPerPlayer;
      const climberSeed = activePlayerCount * climberSeedPerPlayer;
      const climberMatchBonus = completedMatches * 0.50;
      const totalClimberFund = climberSeed + climberMatchBonus;
      
      const membershipRevenue = activePlayerCount * membershipFee * periodLengthMonths;
      const matchContributions = completedMatches * 2.50; // $2.50 per match to placement pool
      const totalPlacementPool = placementSeed + membershipRevenue + matchContributions;
      
      const totalPrizePool = totalPlacementPool + totalClimberFund;
      
      // Calculate dynamic places to pay (15% of field, minimum 2)
      const placesToPay = Math.max(2, Math.ceil(activePlayerCount * 0.15));
      
      // Define payout percentages for top 4 (40%, 30%, 20%, 10%)
      const payouts = {
        placesToPay: placesToPay,
        climber: Math.round(totalClimberFund),
        firstPlace: placesToPay >= 1 ? Math.round(totalPlacementPool * 0.40) : 0,
        secondPlace: placesToPay >= 2 ? Math.round(totalPlacementPool * 0.30) : 0,
        thirdPlace: placesToPay >= 3 ? Math.round(totalPlacementPool * 0.20) : 0,
        fourthPlace: placesToPay >= 4 ? Math.round(totalPlacementPool * 0.10) : 0
      };
      
      const estimatedSeedData = {
        phase: phase,
        membershipFee: membershipFee,
        seedAmount: placementSeed,
        climberSeed: climberSeed,
        totalPrizePool: totalPrizePool,
        totalPlacementPool: totalPlacementPool,
        totalClimberFund: totalClimberFund,
        nextPayoutDate: nextPayoutDate,
        currentPeriodStart: periodStartDate,
        periodLengthMonths: periodLengthMonths,
        activePlayerCount: activePlayerCount,
        payouts: payouts,
        currentClimber: null // Will be calculated from ladder position changes
      };
      console.log('Seed funding data (calculated):', estimatedSeedData);
      setSeedFundingData(estimatedSeedData);
    } catch (error) {
      console.error('Error fetching seed funding:', error);
      setSeedFundingData(null);
    }
  };

  const fetchLadderStandings = async () => {
    try {
      const result = await supabaseDataService.getLadderPlayersByName(currentLadder);
      if (result.success) {
        console.log('Ladder standings received:', result.data);
        // Sort by position to get proper standings order
        const sortedData = result.data.sort((a, b) => a.position - b.position);
        console.log('🎯 Prize Pool: Top 3 players:', sortedData.slice(0, 3));
        setLadderStandings(sortedData);
      } else {
        console.log('No standings data available');
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
                    Total Prize Pool
                  </div>
                  <div style={{ 
                    color: '#aaa', 
                    fontSize: '0.75rem', 
                    marginTop: '6px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px',
                    textAlign: 'left'
                  }}>
                    <div>🏆 Placement Pool: {formatCurrency(seedFundingData?.totalPlacementPool || 0)}</div>
                    <div>🚀 Climber Fund: {formatCurrency(seedFundingData?.totalClimberFund || 0)}</div>
                  </div>
                {/* Show disclaimer based on phase */}
                {seedFundingData?.phase === 1 && (
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
                    ⚠️ TESTING PHASE - FREE UNTIL NOV 1ST ⚠️<br/>
                    These amounts will NOT be paid out<br/>
                    Prize pool resets Nov 1st when $5/month membership begins<br/>
                    <span style={{ fontSize: '0.85rem', color: '#ffc107' }}>
                      (Prize pools funded by tournament entries and match fees)
                    </span>
                  </div>
                )}
                {seedFundingData?.phase === 2 && (
                  <div style={{ 
                    color: '#ffc107', 
                    fontSize: '0.9rem', 
                    marginTop: '8px',
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '6px',
                    padding: '6px',
                    textAlign: 'center'
                  }}>
                    🎉 2-MONTH TRIAL PERIOD 🎉<br/>
                    $5/month membership • First payout Jan 1, 2026<br/>
                    Prize pools funded by tournaments ($20 entry: $10 to ladder prize pool)
                  </div>
                )}
                  {prizePoolData?.isEstimated && (
                    <div style={{ color: '#ffc107', fontSize: '0.9rem', marginTop: '4px' }}>
                      (Estimated)
                    </div>
                  )}
                </div>
              </div>

              {/* Date and Phase Information */}
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
                  <div style={{ color: '#8b5cf6', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '4px' }}>
                    {seedFundingData.periodLengthMonths}-month period • 
                    {seedFundingData.membershipFee > 0 
                      ? ` ${formatCurrency(seedFundingData.membershipFee)}/month membership` 
                      : ' FREE membership (testing)'}
                  </div>
                  <div style={{ 
                    color: '#999', 
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    display: 'inline-block'
                  }}>
                    {seedFundingData.activePlayerCount} active players
                  </div>
                </div>
              )}

              {/* Prize Pool Details */}
              <div style={{ marginBottom: '0.1rem' }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem', fontSize: '1.1rem', textAlign: 'center' }}>
                  Revenue Breakdown
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gap: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '1rem',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '6px',
                    padding: '8px'
                  }}>
                    <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Tournament Entries ($10 ea):</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      {formatCurrency((seedFundingData?.seedAmount || 0) + (seedFundingData?.climberSeed || 0))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ccc' }}>Match Contributions ($3 ea):</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      {formatCurrency((prizePoolData?.totalMatches || 0) * 3)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{ color: '#ccc' }}>Completed Matches:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      {prizePoolData?.totalMatches || 0}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#aaa', 
                    fontStyle: 'italic',
                    marginTop: '0.5rem',
                    padding: '8px',
                    background: 'rgba(33, 150, 243, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(33, 150, 243, 0.2)'
                  }}>
                    💡 Prize pools funded by: Match fees ($3 per match) + Tournament entries ($20 entry: $10 to ladder prize pool, $10 to tournament payout)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ccc' }}>Awards:</span>
                    <span style={{ color: '#fff' }}>
                      Climber + Top {seedFundingData?.payouts?.placesToPay || 1}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>🚀 Climber Award:</span>
                      <span style={{ color: '#999', fontSize: '0.7rem', fontStyle: 'italic' }}>
                        (Most improved, not in top {seedFundingData?.payouts?.placesToPay || 4})
                      </span>
                    </div>
                    <span style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {formatCurrency(seedFundingData?.payouts?.climber || 0)}
                    </span>
                  </div>
                  
                  {/* Placement Awards Header */}
                  <div style={{ 
                    color: '#00ff88', 
                    fontSize: '0.95rem', 
                    fontWeight: 'bold',
                    marginTop: '0.5rem',
                    marginBottom: '0.25rem',
                    textAlign: 'center',
                    borderTop: '1px solid rgba(0, 255, 136, 0.3)',
                    paddingTop: '0.5rem'
                  }}>
                    🏆 Placement Awards
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
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>1st Place (40%):</span>
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
                        {ladderStandings.length > 0 ? `${ladderStandings[0]?.users?.first_name || ladderStandings[0]?.firstName || ''} ${ladderStandings[0]?.users?.last_name || ladderStandings[0]?.lastName || ''}`.trim() || 'No player' : 'No players yet'}
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
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>2nd Place (30%):</span>
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
                        {ladderStandings.length > 1 ? `${ladderStandings[1]?.users?.first_name || ladderStandings[1]?.firstName || ''} ${ladderStandings[1]?.users?.last_name || ladderStandings[1]?.lastName || ''}`.trim() || 'No player' : 'No player'}
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
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>3rd Place (20%):</span>
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
                        {ladderStandings.length > 2 ? `${ladderStandings[2]?.users?.first_name || ladderStandings[2]?.firstName || ''} ${ladderStandings[2]?.users?.last_name || ladderStandings[2]?.lastName || ''}`.trim() || 'No player' : 'No player'}
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
                      <span style={{ color: '#ccc', fontSize: '1rem', fontWeight: 'bold' }}>4th Place (10%):</span>
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
                        {ladderStandings.length > 3 ? `${ladderStandings[3]?.users?.first_name || ladderStandings[3]?.firstName || ''} ${ladderStandings[3]?.users?.last_name || ladderStandings[3]?.lastName || ''}`.trim() || 'No player' : 'No player'}
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
