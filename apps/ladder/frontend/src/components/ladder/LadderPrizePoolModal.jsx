import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';
import './LadderPrizePoolModal.css';

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

/** Prize pool placement rows: dark panel + light names for readability */
const PP_PLACEMENT_ROW = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
  background: 'rgba(10, 22, 16, 0.98)',
  border: '1px solid rgba(52, 211, 153, 0.45)',
  borderRadius: '8px',
  padding: '8px 10px',
  marginBottom: '1px',
};
const PP_PLACEMENT_RANK = {
  color: '#cbd5e1',
  fontSize: '0.85rem',
  fontWeight: 'bold',
  flexShrink: 0,
  minWidth: '4.25rem',
};
const PP_PLACEMENT_NAME = {
  flex: '1 1 auto',
  minWidth: 0,
  textAlign: 'center',
  color: '#f8fafc',
  fontSize: '1.05rem',
  fontWeight: 600,
  lineHeight: 1.35,
  textShadow: '0 1px 2px rgba(0,0,0,1), 0 0 1px rgba(0,0,0,1)',
};
const PP_PLACEMENT_AMT = {
  color: '#6ee7b7',
  fontWeight: 'bold',
  flexShrink: 0,
};

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
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  const [ladderStandings, setLadderStandings] = useState([]);
  const [periodMatchCountsByUser, setPeriodMatchCountsByUser] = useState({});

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)');
    if (!mq) return;
    const handle = () => setIsMobile(mq.matches);
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentLadder(selectedLadder);
    } else {
      setShowFeeDetails(false);
    }
  }, [isOpen, selectedLadder]);

  // Recalculate seed funding whenever prize pool data or ladder standings change
  useEffect(() => {
    if (prizePoolData) {
      fetchSeedFunding();
    }
  }, [prizePoolData, ladderStandings]);

  useEffect(() => {
    if (isOpen) {
      fetchPrizePoolData();
      fetchHistoricalData();
      fetchWinners();
      fetchLadderStandings();
      fetchPeriodMatchCounts();
      
      // Set up real-time updates every 30 seconds
      const interval = setInterval(() => {
        fetchPrizePoolData();
        fetchLadderStandings();
        fetchPeriodMatchCounts();
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
      
      // Calendar quarter for period display; no monthly ladder fee in prize math.
      // (1) Tournament $20 entry → $10 tournament prize pool, $5 ladder quarterly pool ($4 placement + $1 climber), $5 platform.
      // (2) Match reporting $10 standard → $5 to ladder pool ($4 placement + $1 climber), $5 platform; +late credited in full to pool; forfeit per rules.
      let phase, membershipFee, periodStartDate, nextPayoutDate, periodLengthMonths;
      const tournamentPlacementPerEntry = 4;
      const tournamentClimberPerEntry = 1;
      const tournamentEntryCount = prizePoolData?.tournamentEntryCount ?? Math.floor((prizePoolData?.tournamentSeedAmount ?? 0) / 5);

      phase = now < new Date(2026, 3, 1) ? 1 : 2; // Before Apr 1, 2026 vs live model
      membershipFee = 0;
      const currentMonth = now.getMonth();
      const periodStartMonth = Math.floor(currentMonth / 3) * 3;
      periodStartDate = new Date(now.getFullYear(), periodStartMonth, 1).toISOString();
      nextPayoutDate = new Date(now.getFullYear(), periodStartMonth + 3, 1).toISOString();
      periodLengthMonths = 3;

      const stdReportingCredited = 5; // prize-pool half of $10 standard credited per report
      const placementMatchContributions = completedMatches * 4;
      const climberMatchContributions = completedMatches * 1;
      const tournamentPlacement = tournamentEntryCount * tournamentPlacementPerEntry;
      const tournamentClimber = tournamentEntryCount * tournamentClimberPerEntry;
      const effectiveEntryCount = tournamentEntryCount > 0 ? tournamentEntryCount : 0;
      const effectiveTournamentPlacement = effectiveEntryCount * tournamentPlacementPerEntry;
      const effectiveTournamentClimber = effectiveEntryCount * tournamentClimberPerEntry;
      const totalClimberFund = climberMatchContributions + effectiveTournamentClimber;
      const membershipRevenue = 0;
      const matchReportingPoolSideEstimate = completedMatches * stdReportingCredited;
      const totalPlacementPool = effectiveTournamentPlacement + placementMatchContributions + membershipRevenue;
      
      const totalPrizePool = totalPlacementPool + totalClimberFund;
      
      // Calculate dynamic places to pay (15% of field, minimum 2)
      const placesToPay = Math.max(2, Math.ceil(activePlayerCount * 0.15));
      
      // Dynamic payout: descending weight. With 5+ places and 30+ players, boost 1st place (more top-loaded).
      const topBoost = (placesToPay >= 5 && activePlayerCount >= 30) ? 2 : 0; // +2 weight to 1st in larger fields
      const baseWeight = (placesToPay * (placesToPay + 1)) / 2;
      const totalWeight = baseWeight + topBoost;
      const payouts = { placesToPay, climber: Math.round(totalClimberFund), percentages: {} };
      let allocated = 0;
      for (let n = 1; n <= placesToPay; n++) {
        const weight = n === 1 ? (placesToPay - n + 1) + topBoost : (placesToPay - n + 1);
        const pct = weight / totalWeight;
        payouts.percentages[n] = Math.round(pct * 100);
        const amt = n < placesToPay
          ? Math.floor(totalPlacementPool * pct)
          : totalPlacementPool - allocated; // last place gets remainder (handles rounding)
        if (n === 1) payouts.firstPlace = amt;
        else if (n === 2) payouts.secondPlace = amt;
        else if (n === 3) payouts.thirdPlace = amt;
        else if (n === 4) payouts.fourthPlace = amt;
        else payouts[`place${n}`] = amt;
        allocated += amt;
      }
      
      const estimatedSeedData = {
        phase: phase,
        membershipFee: membershipFee,
        seedAmount: effectiveTournamentPlacement,
        seedAmountClimber: effectiveTournamentClimber,
        seedAmountFromEstimate: false,
        climberSeed: 0,
        totalPrizePool: totalPrizePool,
        totalPlacementPool: totalPlacementPool,
        totalClimberFund: totalClimberFund,
        matchReportingPoolSideEstimate,
        /** For UI: counts and per-unit $ that match the displayed tournament & match pool lines */
        tournamentEntriesUsed: effectiveEntryCount,
        tournamentLedgerPerEntry: 5,
        matchesUsedForMatchFees: completedMatches,
        matchLedgerPerMatch: stdReportingCredited,
        nextPayoutDate: nextPayoutDate,
        currentPeriodStart: periodStartDate,
        periodLengthMonths: periodLengthMonths,
        activePlayerCount: activePlayerCount,
        payouts: payouts,
        currentClimber: null
      };
      const climber = await supabaseDataService.getCurrentClimber(
        currentLadder,
        estimatedSeedData.payouts?.placesToPay ?? 4
      );
      if (climber?.name) {
        estimatedSeedData.currentClimber = climber;
      }
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

  const fetchPeriodMatchCounts = async () => {
    try {
      const result = await supabaseDataService.getQuarterMatchCountsForLadder(currentLadder);
      if (result?.success && result.data) {
        setPeriodMatchCountsByUser(result.data);
      } else {
        setPeriodMatchCountsByUser({});
      }
    } catch (error) {
      console.error('Error fetching period match counts:', error);
      setPeriodMatchCountsByUser({});
    }
  };

  const calculateEstimatedPrizePool = () => {
    // Fallback calculation based on the new 3-month system
    const currentDate = new Date();
    const startOfPeriod = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 2) * 2, 1);
    const daysInPeriod = Math.floor((currentDate - startOfPeriod) / (1000 * 60 * 60 * 24));
    
    // Estimate based on 3 matches per week average
    const estimatedMatches = Math.floor((daysInPeriod / 7) * 3);
    const estimatedPrizePool = estimatedMatches * 5; // ~$5 credited per standard report (4 placement + 1 climber from pool half)
    
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

  const getPlayerName = (player, fallback = 'No player') => {
    if (!player) return fallback;
    const first = player?.users?.first_name || player?.firstName || '';
    const last = player?.users?.last_name || player?.lastName || '';
    const name = `${first} ${last}`.trim();
    return name || fallback;
  };

  const getPlayerId = (player) => {
    if (!player) return null;
    return player.user_id || player.userId || player?.users?.id || player.id || null;
  };

  const formatPlayerWithMatchCount = (player, fallback = 'No player') => {
    const name = getPlayerName(player, fallback);
    if (!player) return name;
    const userId = getPlayerId(player);
    if (!userId) return `${name} (0 matches)`;
    const count = periodMatchCountsByUser?.[userId] || 0;
    return `${name} (${count} ${count === 1 ? 'match' : 'matches'})`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="prize-pool-modal ladder-prize-pool-modal" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        paddingTop: isMobile ? '52px' : '56px',
        paddingBottom: '20px',
        paddingLeft: isMobile ? '0.25rem' : '20px',
        paddingRight: isMobile ? '0.25rem' : '20px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="prize-pool-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderRadius: '16px',
          padding: '0.5rem 1rem',
          maxWidth: 'min(640px, 95vw)',
          maxHeight: '85vh',
          width: 'min(640px, 95vw)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
            color: '#fff',
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
            color: '#fff',
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

        {/* Content - scrollable */}
        <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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

              {/* Prize pool headline */}
              <div style={{ marginBottom: '0.1rem' }}>
                <div style={{
                  background: 'rgba(0, 255, 0, 0.1)',
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  borderRadius: '10px',
                  padding: '0.5rem 0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#00ff00' }}>
                    {formatCurrency(seedFundingData?.totalPrizePool || 0)}
                  </div>
                  <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                    {seedFundingData?.phase === 1 ? 'Quarterly prize pool estimate' : 'Estimated pool this quarter'}
                  </div>
                  <div style={{ 
                    color: '#aaa', 
                    fontSize: '0.75rem', 
                    marginTop: '6px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    textAlign: 'center'
                  }}>
                    <div>Placement<br /><span style={{ color: '#cfcfcf' }}>{formatCurrency(seedFundingData?.totalPlacementPool || 0)}</span></div>
                    <div>Climber<br /><span style={{ color: '#cfcfcf' }}>{formatCurrency(seedFundingData?.totalClimberFund || 0)}</span></div>
                  </div>
                  {seedFundingData?.phase === 1 && (
                    <div style={{ fontSize: '0.78rem', color: '#ff6b6b', marginTop: '8px', lineHeight: 1.35 }}>
                      Transition period: this view may include estimate math when tournament-seed data is not present.
                    </div>
                  )}
                  {seedFundingData?.phase === 2 && (
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '8px', lineHeight: 1.35 }}>
                     Quarterly payouts remain active under current ladder rules.
                    </div>
                  )}
                  {prizePoolData?.isEstimated && (
                    <div style={{ color: '#ffc107', fontSize: '0.8rem', marginTop: '4px' }}>Partial data — estimate</div>
                  )}
                </div>
              </div>

              {/* Date and Phase Information */}
              {seedFundingData && (
                <div style={{ marginBottom: '0.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.8rem' }}>
                  Quarter starts {new Date(seedFundingData.currentPeriodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}
                  Payout {new Date(seedFundingData.nextPayoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}
                  {seedFundingData.activePlayerCount} players
                  <div style={{ marginTop: '6px', color: '#fbbf24', fontSize: '0.75rem', lineHeight: 1.35, maxWidth: '24rem', marginLeft: 'auto', marginRight: 'auto' }}>
                    This period has <strong style={{ color: '#fde68a' }}>no tournament-added money</strong>; prize pool growth is from reported match fees.
                  </div>
                </div>
              )}

              {/* Prize Pool Details */}
              <div style={{ marginBottom: '0.1rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '0.45rem', fontSize: '1rem', textAlign: 'center' }}>
                  Prize Pool Breakdown
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '0.4rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                      <span style={{ color: '#ddd' }}>Tournament entries</span>
                      <span style={{ color: '#888', fontSize: '0.72rem', lineHeight: 1.35 }}>
                        {(() => {
                          const n = seedFundingData?.tournamentEntriesUsed ?? 0;
                          const r = seedFundingData?.tournamentLedgerPerEntry ?? 15;
                          const pre = seedFundingData?.seedAmountFromEstimate ? '~' : '';
                          const suf = seedFundingData?.seedAmountFromEstimate ? ' (est.)' : '';
                          const tot = (seedFundingData?.seedAmount || 0) + (seedFundingData?.seedAmountClimber || 0);
                          return `${pre}${n} × $${r} = ${formatCurrency(tot)}${suf}`;
                        })()}
                      </span>
                    </div>
                    <span style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatCurrency((seedFundingData?.seedAmount || 0) + (seedFundingData?.seedAmountClimber || 0))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                      <span style={{ color: '#ddd' }}>Match reporting fees</span>
                      <span style={{ color: '#888', fontSize: '0.72rem', lineHeight: 1.35 }}>
                        {(() => {
                          const n = seedFundingData?.matchesUsedForMatchFees ?? prizePoolData?.totalMatches ?? 0;
                          const r = seedFundingData?.matchLedgerPerMatch ?? 5;
                          const tot = seedFundingData?.matchReportingPoolSideEstimate ?? n * r;
                          return `${n} × $${r} = ${formatCurrency(tot)} (pool share per report)`;
                        })()}
                      </span>
                    </div>
                    <span style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatCurrency(seedFundingData?.matchReportingPoolSideEstimate ?? (prizePoolData?.totalMatches || 0) * 5)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFeeDetails((v) => !v)}
                    style={{
                      marginTop: '0.15rem',
                      width: '100%',
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.78rem',
                      color: '#7ecbff',
                      background: 'rgba(33, 150, 243, 0.12)',
                      border: '1px solid rgba(33, 150, 243, 0.35)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {showFeeDetails ? '▲ Hide how fees work' : '▼ How tournament & match fees work'}
                  </button>
                  {showFeeDetails && (
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#b0bec5',
                      lineHeight: 1.45,
                      padding: '8px 6px 4px',
                      textAlign: 'left'
                    }}>
                      <p style={{ margin: '0 0 8px' }}><strong style={{ color: '#eceff1' }}>Each ladder has its own tournament and prize pool. <br />
                       $20 tournament entry</strong> — $10 to tournament prize pool, $5 to ladder prize pool ($4 placement, $1 climber), $5 to platform.</p>
                      <p style={{ margin: 0 }}><strong style={{ color: '#eceff1' }}>$10 match report</strong> — $5 adds to this pool ($4 placement, $1 climber). $5 is platform.
                       Full late fees added to the pool; special forfeit amounts follow ladder rules.</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                    <span style={{ color: '#999', fontSize: '0.78rem' }}>Prizes</span>
                    <span style={{ color: '#ccc', fontSize: '0.8rem' }}>Climber + top {seedFundingData?.payouts?.placesToPay || 1}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(28, 18, 44, 0.98)',
                    border: '1px solid rgba(167, 139, 250, 0.45)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginBottom: '6px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', minWidth: 0 }}>
                      <span style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 'bold' }}>Climber</span>
                      <span style={{ color: '#a8a3b8', fontSize: '0.72rem' }}>
                        Biggest climb · outside top {seedFundingData?.payouts?.placesToPay || 4}
                      </span>
                      {seedFundingData?.currentClimber?.name && (
                        <span style={{ color: '#faf5ff', fontSize: '0.92rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                          Leader: {seedFundingData.currentClimber.name}
                          {seedFundingData.currentClimber.positionsClimbed > 0 && (
                            <span style={{ color: '#86efac' }}> (+{seedFundingData.currentClimber.positionsClimbed})</span>
                          )}
                          {typeof seedFundingData.currentClimber.matchCount === 'number' && (
                            <span style={{ color: '#cbd5e1' }}>
                              {' '}· {seedFundingData.currentClimber.matchCount} {seedFundingData.currentClimber.matchCount === 1 ? 'match' : 'matches'}
                            </span>
                          )}
                          {seedFundingData.currentClimber.eligibleForPrize === false && (
                            <span style={{ color: '#f59e0b' }}> · not prize-eligible yet</span>
                          )}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#e9d5ff', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}>
                      {formatCurrency(seedFundingData?.payouts?.climber || 0)}
                    </span>
                  </div>
                  
                  {/* Placement Awards Header */}
                  <div style={{ 
                    color: '#00ff88', 
                    fontSize: '0.9rem', 
                    fontWeight: 'bold',
                    marginTop: '0.5rem',
                    marginBottom: '0.25rem',
                    textAlign: 'center',
                    borderTop: '1px solid rgba(0, 255, 136, 0.3)',
                    paddingTop: '0.5rem'
                  }}>
                    Placement
                  </div>
                  <div style={{ margin: '0 0 0.35rem', color: '#9e9e9e', fontSize: '0.76rem', lineHeight: 1.35, textAlign: 'center' }}>
                    Eligibility: at least <strong style={{ color: '#cfd8dc' }}>2 completed matches</strong> in this prize pool period for placement prizes and the Climber award.
                  </div>
                  
                  {/* Dynamic place payouts based on placesToPay */}
                  {seedFundingData?.payouts?.firstPlace !== undefined && (
                    <div style={PP_PLACEMENT_ROW}>
                      <span style={PP_PLACEMENT_RANK}>1st · {seedFundingData?.payouts?.percentages?.[1] ?? 35}%</span>
                      <span style={PP_PLACEMENT_NAME}>
                        {ladderStandings.length > 0 ? formatPlayerWithMatchCount(ladderStandings[0], 'No player') : 'No players yet'}
                      </span>
                      <span style={PP_PLACEMENT_AMT}>
                        {formatCurrency(seedFundingData?.payouts?.firstPlace || 0)}
                      </span>
                    </div>
                  )}
                  {seedFundingData?.payouts?.secondPlace !== undefined && (
                    <div style={PP_PLACEMENT_ROW}>
                      <span style={PP_PLACEMENT_RANK}>2nd · {seedFundingData?.payouts?.percentages?.[2] ?? 30}%</span>
                      <span style={PP_PLACEMENT_NAME}>
                        {ladderStandings.length > 1 ? formatPlayerWithMatchCount(ladderStandings[1], 'No player') : 'No player'}
                      </span>
                      <span style={PP_PLACEMENT_AMT}>
                        {formatCurrency(seedFundingData?.payouts?.secondPlace || 0)}
                      </span>
                    </div>
                  )}
                  {seedFundingData?.payouts?.thirdPlace !== undefined && (
                    <div style={PP_PLACEMENT_ROW}>
                      <span style={PP_PLACEMENT_RANK}>3rd · {seedFundingData?.payouts?.percentages?.[3] ?? 20}%</span>
                      <span style={PP_PLACEMENT_NAME}>
                        {ladderStandings.length > 2 ? formatPlayerWithMatchCount(ladderStandings[2], 'No player') : 'No player'}
                      </span>
                      <span style={PP_PLACEMENT_AMT}>
                        {formatCurrency(seedFundingData?.payouts?.thirdPlace || 0)}
                      </span>
                    </div>
                  )}
                  {seedFundingData?.payouts?.fourthPlace !== undefined && (
                    <div style={PP_PLACEMENT_ROW}>
                      <span style={PP_PLACEMENT_RANK}>4th · {seedFundingData?.payouts?.percentages?.[4] ?? 10}%</span>
                      <span style={PP_PLACEMENT_NAME}>
                        {ladderStandings.length > 3 ? formatPlayerWithMatchCount(ladderStandings[3], 'No player') : 'No player'}
                      </span>
                      <span style={PP_PLACEMENT_AMT}>
                        {formatCurrency(seedFundingData?.payouts?.fourthPlace || 0)}
                      </span>
                    </div>
                  )}
                  {/* 5th place and beyond (when placesToPay > 4) */}
                  {[5, 6, 7, 8, 9, 10].map((n) => (
                    seedFundingData?.payouts?.[`place${n}`] !== undefined && n <= (seedFundingData?.payouts?.placesToPay ?? 0) && (
                      <div key={n} style={PP_PLACEMENT_ROW}>
                        <span style={PP_PLACEMENT_RANK}>{n}th · {seedFundingData?.payouts?.percentages?.[n] ?? 0}%</span>
                        <span style={PP_PLACEMENT_NAME}>
                          {ladderStandings.length >= n ? formatPlayerWithMatchCount(ladderStandings[n - 1], 'No player') : '—'}
                        </span>
                        <span style={PP_PLACEMENT_AMT}>
                          {formatCurrency(seedFundingData?.payouts?.[`place${n}`] || 0)}
                        </span>
                      </div>
                    )
                  ))}
                  
                  {/* Total Payout Verification */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(8, 18, 14, 0.98)',
                    border: '1px solid rgba(52, 211, 153, 0.35)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginTop: '4px'
                  }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 'bold' }}>Total payouts</span>
                    <span style={{ color: '#6ee7b7', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {formatCurrency(
                        (seedFundingData?.payouts?.climber || 0) +
                        (seedFundingData?.payouts?.firstPlace || 0) +
                        (seedFundingData?.payouts?.secondPlace || 0) +
                        (seedFundingData?.payouts?.thirdPlace || 0) +
                        (seedFundingData?.payouts?.fourthPlace || 0) +
                        Array.from({ length: (seedFundingData?.payouts?.placesToPay ?? 0) - 4 }, (_, i) => seedFundingData?.payouts?.[`place${5 + i}`] || 0).reduce((a, b) => a + b, 0)
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
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
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
                    padding: '10px 14px',
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

      {/* Winners Popup Modal - mobile optimized */}
      {showWinnersPopup && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: isMobile ? '52px 0.5rem 0.5rem' : '56px 1rem 1rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
          onClick={(e) => e.target === e.currentTarget && setShowWinnersPopup(false)}
        >
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: isMobile ? '8px' : '16px',
            padding: isMobile ? '0.75rem 0.85rem' : '2rem',
            maxWidth: '350px',
            width: isMobile ? '100%' : '55%',
            maxHeight: isMobile ? 'calc(100vh - 1rem)' : '80vh',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            border: '2px solid #00ff00',
            boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
            position: 'relative',
            margin: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowWinnersPopup(false)}
              style={{
                position: 'absolute',
                top: isMobile ? '0.5rem' : '1rem',
                right: isMobile ? '0.5rem' : '1rem',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid rgba(255, 0, 0, 0.5)',
                color: '#ff4444',
                borderRadius: '50%',
                width: isMobile ? 44 : 32,
                height: isMobile ? 44 : 32,
                minWidth: isMobile ? 44 : undefined,
                minHeight: isMobile ? 44 : undefined,
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.5)';
              }}
            >
              ×
            </button>

            <div style={{ marginBottom: isMobile ? '0.6rem' : '2rem', textAlign: 'center', paddingRight: isMobile ? '44px' : undefined }}>
              <h2 style={{
                color: '#ffc107',
                margin: '0 0 0.35rem 0',
                fontSize: isMobile ? '1.2rem' : '1.8rem',
                fontWeight: 'bold'
              }}>
                🏅 Recent Winners
              </h2>
              <p style={{ color: '#ccc', margin: 0, fontSize: isMobile ? '0.88rem' : '1rem' }}>
                {currentLadder} Ladder Prize Winners
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 193, 7, 0.05)',
              borderRadius: isMobile ? '8px' : '12px',
              padding: isMobile ? '0.6rem 0.75rem' : '1.5rem',
              border: '1px solid rgba(255, 193, 7, 0.2)',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              {winners.length > 0 ? (
                <div style={{ display: 'grid', gap: isMobile ? '0.5rem' : '1rem' }}>
                  {winners.map((winner, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: isMobile ? '8px 10px' : '12px 16px',
                        background: 'rgba(18, 16, 12, 0.92)',
                        borderRadius: isMobile ? '6px' : '8px',
                        border: '1px solid rgba(255, 193, 7, 0.22)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(32, 28, 18, 0.98)';
                        e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(18, 16, 12, 0.92)';
                        e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.22)';
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fafafa', fontWeight: 'bold', fontSize: isMobile ? '0.95rem' : '1.1rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                          {winner.playerName}
                        </div>
                        <div style={{ color: '#b8b3a8', fontSize: isMobile ? '0.8rem' : '0.9rem', marginTop: '2px' }}>
                          {winner.category} • {formatDate(winner.date)}
                        </div>
                      </div>
                      <div style={{ color: '#ffc107', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.2rem', textAlign: 'right', flexShrink: 0 }}>
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
                  padding: isMobile ? '1rem' : '2rem',
                  fontSize: isMobile ? '0.95rem' : '1.1rem'
                }}>
                  🏆 No winners recorded yet
                  <div style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Winners will appear here after the first prize distribution
                  </div>
                </div>
              )}
            </div>

            <div style={{
              marginTop: isMobile ? '0.5rem' : '1.5rem',
              textAlign: 'center',
              color: '#888',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              flexShrink: 0
            }}>
              Prize distributions occur every 3 months
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* History Popup Modal - mobile optimized */}
      {showHistoricalPopup && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: isMobile ? '52px 0.5rem 0.5rem' : '56px 1rem 1rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
          onClick={(e) => e.target === e.currentTarget && setShowHistoricalPopup(false)}
        >
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: isMobile ? '8px' : '16px',
            padding: isMobile ? '0.75rem 0.85rem' : '2rem',
            maxWidth: '350px',
            width: isMobile ? '100%' : '55%',
            maxHeight: isMobile ? 'calc(100vh - 1rem)' : '80vh',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            border: '2px solid #00ff00',
            boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
            position: 'relative',
            margin: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowHistoricalPopup(false)}
              style={{
                position: 'absolute',
                top: isMobile ? '0.5rem' : '1rem',
                right: isMobile ? '0.5rem' : '1rem',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid rgba(255, 0, 0, 0.5)',
                color: '#ff4444',
                borderRadius: '50%',
                width: isMobile ? 44 : 32,
                height: isMobile ? 44 : 32,
                minWidth: isMobile ? 44 : undefined,
                minHeight: isMobile ? 44 : undefined,
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.5)';
              }}
            >
              ×
            </button>

            <div style={{ marginBottom: isMobile ? '0.6rem' : '2rem', textAlign: 'center', paddingRight: isMobile ? '44px' : undefined }}>
              <h2 style={{
                color: '#007bff',
                margin: '0 0 0.35rem 0',
                fontSize: isMobile ? '1.2rem' : '1.8rem',
                fontWeight: 'bold'
              }}>
                📊 Prize Pool History
              </h2>
              <p style={{ color: '#ccc', margin: 0, fontSize: isMobile ? '0.88rem' : '1rem' }}>
                {currentLadder} Ladder Historical Data
              </p>
            </div>

            <div style={{
              background: 'rgba(0, 123, 255, 0.05)',
              borderRadius: isMobile ? '8px' : '12px',
              padding: isMobile ? '0.6rem 0.75rem' : '1.5rem',
              border: '1px solid rgba(0, 123, 255, 0.2)',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              {historicalData.length > 0 ? (
                <div style={{ display: 'grid', gap: isMobile ? '0.5rem' : '1rem' }}>
                  {historicalData.map((period, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: isMobile ? '8px 10px' : '12px 16px',
                        background: period.isCurrent ? 'rgba(0, 123, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: isMobile ? '6px' : '8px',
                        border: period.isCurrent ? '1px solid rgba(0, 123, 255, 0.3)' : '1px solid rgba(0, 123, 255, 0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 123, 255, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(0, 123, 255, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = period.isCurrent ? 'rgba(0, 123, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = period.isCurrent ? 'rgba(0, 123, 255, 0.3)' : 'rgba(0, 123, 255, 0.1)';
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          color: period.isCurrent ? '#00ff00' : '#fff',
                          fontWeight: 'bold',
                          fontSize: isMobile ? '0.95rem' : '1.1rem'
                        }}>
                          {period.period}
                        </div>
                        <div style={{ color: '#ccc', fontSize: isMobile ? '0.8rem' : '0.9rem', marginTop: '2px' }}>
                          {period.matches} matches played
                        </div>
                      </div>
                      <div style={{
                        color: period.isCurrent ? '#00ff00' : '#007bff',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '1rem' : '1.2rem',
                        textAlign: 'right',
                        flexShrink: 0
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
                  padding: isMobile ? '1rem' : '2rem',
                  fontSize: isMobile ? '0.95rem' : '1.1rem'
                }}>
                  📊 No historical data available
                  <div style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Historical data will appear here after prize distributions
                  </div>
                </div>
              )}
            </div>

            <div style={{
              marginTop: isMobile ? '0.5rem' : '1.5rem',
              textAlign: 'center',
              color: '#888',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              flexShrink: 0
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
