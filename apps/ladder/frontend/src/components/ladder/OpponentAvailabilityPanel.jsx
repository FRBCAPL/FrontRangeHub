/*
 * OpponentAvailabilityPanel - Shows opponent's availability and locations
 * Used in LadderChallengeModal and PlayerStatsModal when viewing a challengeable player
 * Opens a modal instead of expanding inline
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const OpponentAvailabilityPanel = ({ opponent, opponentLabel = 'Opponent' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const parseAvailability = (avail) => {
    if (!avail) return [];
    if (typeof avail === 'string') {
      try {
        avail = JSON.parse(avail);
      } catch {
        return avail.trim() ? [avail.trim()] : [];
      }
    }
    if (typeof avail !== 'object' || Object.keys(avail).length === 0) return [];
    const entries = Object.entries(avail).filter(([, times]) => {
      if (!times) return false;
      if (Array.isArray(times)) return times.some((t) => String(t).trim());
      if (typeof times === 'string') return times.trim() !== '';
      return false;
    });
    if (entries.length === 0) return [];
    entries.sort((a, b) => {
      const ai = DAY_ORDER.indexOf(a[0]);
      const bi = DAY_ORDER.indexOf(b[0]);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return String(a[0]).localeCompare(b[0]);
    });
    const badges = [];
    for (const [day, times] of entries) {
      const arr = Array.isArray(times) ? times : [String(times)];
      for (const t of arr.filter(Boolean)) {
        badges.push(`${day}: ${String(t).trim()}`);
      }
    }
    return badges;
  };

  const parseLocations = (loc) => {
    if (!loc) return [];
    if (Array.isArray(loc)) return loc.map((l) => String(l).trim()).filter(Boolean);
    const s = String(loc).trim();
    if (!s) return [];
    if (s.includes('\n')) return s.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (s.includes(',')) return s.split(',').map((l) => l.trim()).filter(Boolean);
    return [s];
  };

  const openModal = async () => {
    const email = opponent?.email;
    if (!email) {
      setError('No email for opponent');
      return;
    }
    if (profile) {
      setModalOpen(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await supabaseDataService.getUserProfileData(email);
      if (result.success && result.data?.profile) {
        setProfile(result.data.profile);
        setModalOpen(true);
      } else {
        setError('Could not load profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginTop: 0 }}>
        <button
          type="button"
          onClick={openModal}
          disabled={loading || !opponent?.email}
          style={{
            width: '100%',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: loading || !opponent?.email ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: !opponent?.email ? 0.6 : 1
          }}
        >
          📅 {loading ? 'Loading...' : "View availability & locations"}
        </button>
        {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px' }}>{error}</div>}
      </div>

      {modalOpen && profile && createPortal(
        <DraggableModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`📅 ${opponentLabel}'s availability & locations`}
          maxWidth="420px"
          borderColor="rgba(255,255,255,0.15)"
          glowColor="rgba(16, 185, 129, 0.3)"
        >
          <div style={{
            padding: '16px 20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            margin: '0 4px'
          }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  📅 Availability
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {parseAvailability(profile.availability).length > 0 ? (
                    parseAvailability(profile.availability).map((slot, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e0e0e0',
                          fontSize: '0.9rem'
                        }}
                      >
                        {slot}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Not set</span>
                  )}
                </div>
              </div>
              <div style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  📍 Preferred locations
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {parseLocations(profile.locations).length > 0 ? (
                    parseLocations(profile.locations).map((loc, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e0e0e0',
                          fontSize: '0.9rem'
                        }}
                      >
                        {loc}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Not set</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              style={{
                marginTop: '16px',
                width: '100%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </DraggableModal>,
        document.body
      )}
    </>
  );
};

export default OpponentAvailabilityPanel;
