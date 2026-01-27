import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import { 
  FaDollarSign, 
  FaUsers, 
  FaTrophy, 
  FaChartLine,
  FaCreditCard,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa';

const MonetizationDashboard = () => {
  const [stats, setStats] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [prizePools, setPrizePools] = useState([]);
  const [expiringMemberships, setExpiringMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [statsResponse, membershipsResponse, prizePoolsResponse, expiringResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/monetization/stats`),
        fetch(`${BACKEND_URL}/api/monetization/memberships`),
        fetch(`${BACKEND_URL}/api/monetization/prize-pools`),
        fetch(`${BACKEND_URL}/api/monetization/memberships/expiring?days=7`)
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (membershipsResponse.ok) {
        const membershipsData = await membershipsResponse.json();
        setMemberships(membershipsData.memberships || []);
      }

      if (prizePoolsResponse.ok) {
        const prizePoolsData = await prizePoolsResponse.json();
        setPrizePools(prizePoolsData.prizePools || []);
      }

      if (expiringResponse.ok) {
        const expiringData = await expiringResponse.json();
        setExpiringMemberships(expiringData.expiringMemberships || []);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDistributePrizes = async (prizePoolId) => {
    if (!confirm('Are you sure you want to distribute prizes for this period? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/prize-pool/${prizePoolId}/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        alert('Prizes distributed successfully!');
        loadDashboardData(); // Reload data
      } else {
        const errorData = await response.json();
        alert(`Error distributing prizes: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error distributing prizes:', error);
      alert('Failed to distribute prizes');
    }
  };

  const handleRenewMembership = async (membershipId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/membership/${membershipId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        alert('Membership renewed successfully!');
        loadDashboardData(); // Reload data
      } else {
        const errorData = await response.json();
        alert(`Error renewing membership: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error renewing membership:', error);
      alert('Failed to renew membership');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '2rem' }} />
        <p>Loading monetization dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#ff6b6b' }}>
        <FaExclamationTriangle style={{ fontSize: '2rem', marginBottom: '1rem' }} />
        <p>{error}</p>
        <button 
          onClick={loadDashboardData}
          style={{
            background: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#e53e3e', marginBottom: '2rem', textAlign: 'center' }}>
        💰 Ladder Monetization Dashboard
      </h1>

      {/* Stats Overview */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <FaUsers style={{ fontSize: '2rem', color: '#4CAF50', marginBottom: '0.5rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Active Members</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50', margin: 0 }}>
              {stats.memberships?.active || 0}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#ccc', margin: '0.5rem 0 0 0' }}>
              Total: {stats.memberships?.total || 0}
            </p>
          </div>

          <div style={{
            background: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <FaDollarSign style={{ fontSize: '2rem', color: '#2196F3', marginBottom: '0.5rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Monthly Revenue</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3', margin: 0 }}>
              ${stats.memberships?.revenue || 0}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#ccc', margin: '0.5rem 0 0 0' }}>
              From memberships
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <FaTrophy style={{ fontSize: '2rem', color: '#FFC107', marginBottom: '0.5rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Prize Pool</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFC107', margin: 0 }}>
              ${stats.prizePools?.current || 0}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#ccc', margin: '0.5rem 0 0 0' }}>
              Current balance
            </p>
          </div>

          <div style={{
            background: 'rgba(156, 39, 176, 0.1)',
            border: '1px solid rgba(156, 39, 176, 0.3)',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <FaChartLine style={{ fontSize: '2rem', color: '#9C27B0', marginBottom: '0.5rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Total Distributed</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9C27B0', margin: 0 }}>
              ${stats.prizePools?.distributed || 0}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#ccc', margin: '0.5rem 0 0 0' }}>
              All time
            </p>
          </div>
        </div>
      )}

      {/* Expiring Memberships Alert */}
      {expiringMemberships.length > 0 && (
        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#FFC107', margin: '0 0 1rem 0' }}>
            <FaExclamationTriangle style={{ marginRight: '0.5rem' }} />
            Memberships Expiring Soon ({expiringMemberships.length})
          </h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {expiringMemberships.slice(0, 5).map((membership) => (
              <div key={membership._id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px'
              }}>
                <span style={{ color: '#fff' }}>
                  {membership.playerName} - {membership.tier} membership
                </span>
                <button
                  onClick={() => handleRenewMembership(membership._id)}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Renew
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prize Pools */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', marginBottom: '1rem' }}>
          <FaTrophy style={{ marginRight: '0.5rem' }} />
          Prize Pools
        </h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {prizePools.map((pool) => (
            <div key={pool._id} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#fff', margin: 0 }}>{pool.periodName}</h3>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: pool.status === 'active' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                  color: pool.status === 'active' ? '#4CAF50' : '#FFC107'
                }}>
                  {pool.status}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Total Collected:</span>
                  <p style={{ color: '#fff', fontWeight: 'bold', margin: '0.25rem 0' }}>${pool.totalCollected}</p>
                </div>
                <div>
                  <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Current Balance:</span>
                  <p style={{ color: '#4CAF50', fontWeight: 'bold', margin: '0.25rem 0' }}>${pool.currentBalance}</p>
                </div>
                <div>
                  <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Distributed:</span>
                  <p style={{ color: '#FFC107', fontWeight: 'bold', margin: '0.25rem 0' }}>${pool.totalDistributed}</p>
                </div>
              </div>

              {pool.status === 'calculating' && (
                <button
                  onClick={() => handleDistributePrizes(pool._id)}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Distribute Prizes
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Memberships */}
      <div>
        <h2 style={{ color: '#fff', marginBottom: '1rem' }}>
          <FaUsers style={{ marginRight: '0.5rem' }} />
          Recent Memberships
        </h2>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {memberships.slice(0, 10).map((membership) => (
            <div key={membership._id} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{ color: '#fff', margin: '0 0 0.25rem 0' }}>
                  {membership.playerName}
                </h4>
                <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
                  {membership.tier} membership - ${membership.amount}/month
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: membership.status === 'active' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                  color: membership.status === 'active' ? '#4CAF50' : '#FFC107'
                }}>
                  {membership.status}
                </span>
                <p style={{ color: '#ccc', margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                  Next billing: {new Date(membership.nextBillingDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonetizationDashboard;
