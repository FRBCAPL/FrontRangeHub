/*
 * Front Range Pool Hub - Prize Pool Management System
 * Copyright (c) 2025 FRBCAPL
 * All rights reserved.
 * 
 * This component contains proprietary prize pool algorithms and
 * tournament financial management logic that are confidential trade secrets.
 * 
 * Prize pool innovations protected by copyright:
 * - Automated prize distribution calculations
 * - Real-time prize pool tracking
 * - Tournament fee allocation algorithms
 * - Multi-tier prize structure management
 * 
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config.js';

const LadderPrizePoolTracker = ({ selectedLadder }) => {
  const [prizePoolData, setPrizePoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [winners, setWinners] = useState([]);
  const [showHistorical, setShowHistorical] = useState(false);
  const [showWinners, setShowWinners] = useState(false);

  useEffect(() => {
    fetchPrizePoolData();
    fetchHistoricalData();
    fetchWinners();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchPrizePoolData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedLadder]);

  const fetchPrizePoolData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Connect to Real API - Fetch actual match data and prize pool
      const response = await fetch(`${BACKEND_URL}/api/ladder/prize-pool/${selectedLadder}`);
      
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
      const response = await fetch(`${BACKEND_URL}/api/ladder/prize-pool/${selectedLadder}/history`);
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
      const response = await fetch(`${BACKEND_URL}/api/ladder/prize-pool/${selectedLadder}/winners`);
      if (response.ok) {
        const data = await response.json();
        setWinners(data);
      }
    } catch (error) {
      console.error('Error fetching winners:', error);
    }
  };

  const calculateEstimatedPrizePool = () => {
    // Fallback calculation based on the new bi-monthly system
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

  if (loading && !prizePoolData) {
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        <div className="loading-spinner"></div>
        <p style={{ color: '#ccc', marginTop: '1rem' }}>Loading prize pool data...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.8)',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'relative'
    }}>
      {/* Live Update Indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
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

      <h3 style={{
        color: '#ff4444',
        margin: '0 0 1rem 0',
        fontSize: '1.4rem',
        textAlign: 'center'
      }}>
        🏆 {getLadderDisplayName(selectedLadder)} Prize Pool
      </h3>

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
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          background: 'rgba(255, 68, 68, 0.1)',
          border: '1px solid rgba(255, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff4444' }}>
            {formatCurrency(prizePoolData?.currentPrizePool || 0)}
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
            Current Prize Pool
          </div>
          {prizePoolData?.isEstimated && (
            <div style={{ color: '#ffc107', fontSize: '0.8rem', marginTop: '4px' }}>
              (Estimated)
            </div>
          )}
        </div>
      </div>

      {/* Prize Pool Details */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
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
            <span style={{ color: '#fff' }}>50% 1st Place, 50% Most Improved</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <button
          onClick={() => setShowWinners(!showWinners)}
          style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            color: '#ffc107',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          🏅 {showWinners ? 'Hide' : 'Show'} Winners
        </button>
        
        <button
          onClick={() => setShowHistorical(!showHistorical)}
          style={{
            background: 'rgba(0, 123, 255, 0.1)',
            border: '1px solid rgba(0, 123, 255, 0.3)',
            color: '#007bff',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          📊 {showHistorical ? 'Hide' : 'Show'} History
        </button>
      </div>

      {/* Winners Section */}
      {showWinners && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 193, 7, 0.05)', borderRadius: '8px' }}>
          <h4 style={{ color: '#ffc107', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
            🏅 Recent Winners
          </h4>
          {winners.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {winners.slice(0, 5).map((winner, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px'
                }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>
                      {winner.playerName}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.8rem' }}>
                      {winner.category} - {formatDate(winner.date)}
                    </div>
                  </div>
                  <div style={{ color: '#ffc107', fontWeight: 'bold' }}>
                    {formatCurrency(winner.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#ccc', fontStyle: 'italic', textAlign: 'center' }}>
              No winners recorded yet
            </div>
          )}
        </div>
      )}

      {/* Historical Data Section */}
      {showHistorical && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0, 123, 255, 0.05)', borderRadius: '8px' }}>
          <h4 style={{ color: '#007bff', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
            📊 Prize Pool History
          </h4>
          {historicalData.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {historicalData.slice(0, 5).map((period, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px'
                }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>
                      {period.period}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.8rem' }}>
                      {period.matches} matches
                    </div>
                  </div>
                  <div style={{ color: '#007bff', fontWeight: 'bold' }}>
                    {formatCurrency(period.prizePool)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#ccc', fontStyle: 'italic', textAlign: 'center' }}>
              No historical data available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LadderPrizePoolTracker;
