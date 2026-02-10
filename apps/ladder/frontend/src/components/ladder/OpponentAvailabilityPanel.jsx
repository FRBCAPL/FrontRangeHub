/*
 * OpponentAvailabilityPanel - Shows opponent's availability and locations
 * Used in LadderChallengeModal and PlayerStatsModal when viewing a challengeable player
 */
import React, { useState } from 'react';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const OpponentAvailabilityPanel = ({ opponent, opponentLabel = 'Opponent' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchAndShow = async () => {
    const email = opponent?.email;
    if (!email) {
      setError('No email for opponent');
      return;
    }
    if (profile) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await supabaseDataService.getUserProfileData(email);
      if (result.success && result.data?.profile) {
        setProfile(result.data.profile);
        setExpanded(true);
      } else {
        setError('Could not load profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const formatAvailability = (avail) => {
    if (!avail || typeof avail !== 'object' || Object.keys(avail).length === 0) {
      return 'Not set';
    }
    const lines = [];
    for (const day of DAY_ORDER) {
      const times = avail[day];
      if (times && Array.isArray(times) && times.length > 0) {
        lines.push(`${day}: ${times.join(', ')}`);
      }
    }
    return lines.length > 0 ? lines.join('\n') : 'Not set';
  };

  const formatLocations = (loc) => {
    if (!loc || (typeof loc === 'string' && !loc.trim())) return 'Not set';
    if (typeof loc === 'string') return loc.trim();
    if (Array.isArray(loc)) return loc.join(', ');
    return String(loc);
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <button
        type="button"
        onClick={fetchAndShow}
        disabled={loading || !opponent?.email}
        style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid rgba(16, 185, 129, 0.5)',
          color: '#10b981',
          padding: '8px 14px',
          borderRadius: '6px',
          fontSize: '0.9rem',
          cursor: loading || !opponent?.email ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          opacity: !opponent?.email ? 0.6 : 1
        }}
      >
        📅 {loading ? 'Loading...' : expanded && profile ? 'Hide availability & locations' : "View opponent's availability & locations"}
      </button>
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '6px' }}>{error}</div>}
      {expanded && profile && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.9rem'
          }}
        >
          <div style={{ marginBottom: '10px', color: '#10b981', fontWeight: 600 }}>
            📅 {opponent?.firstName || opponentLabel}'s Availability
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#e0e0e0', fontFamily: 'inherit', fontSize: '0.85rem' }}>
            {formatAvailability(profile.availability)}
          </pre>
          <div style={{ marginTop: '12px', marginBottom: '6px', color: '#10b981', fontWeight: 600 }}>
            📍 Preferred Locations
          </div>
          <div style={{ color: '#e0e0e0', fontSize: '0.85rem' }}>
            {formatLocations(profile.locations)}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            style={{
              marginTop: '10px',
              background: 'transparent',
              border: '1px solid #666',
              color: '#999',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Hide
          </button>
        </div>
      )}
    </div>
  );
};

export default OpponentAvailabilityPanel;
