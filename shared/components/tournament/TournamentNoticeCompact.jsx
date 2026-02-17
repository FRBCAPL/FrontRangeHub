import React, { useState, useEffect } from 'react';
import tournamentService from '@shared/services/services/tournamentService';

const LADDER_LABELS = {
  '499-under': '499 & Under',
  '500-549': '500-549',
  '550-plus': '550+',
  simulation: 'Simulation'
};

const TournamentNoticeCompact = ({
  ladderName,
  currentUser,
  refreshTrigger,
  onOpenRegistration,
  onOpenInfo
}) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!ladderName) {
      setLoading(false);
      setTournament(null);
      return;
    }
    const fetchTournament = async () => {
      setLoading(true);
      try {
        const result = await tournamentService.getUpcomingTournament(ladderName);
        if (result.success && result.data) {
          setTournament(result.data);
          if (currentUser?.email) {
            const regs = await tournamentService.getTournamentRegistrations(result.data.id);
            if (regs.success && regs.data) {
              const userReg = regs.data.find(
                r => r.email?.toLowerCase() === currentUser.email?.toLowerCase()
              );
              setIsRegistered(!!userReg);
            }
          }
        } else {
          setTournament(null);
        }
      } catch (err) {
        console.error('TournamentNoticeCompact fetch error:', err);
        setTournament(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTournament();
  }, [ladderName, refreshTrigger, currentUser?.email]);

  if (loading || !tournament) return null;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const daysUntil = Math.ceil((new Date(tournament.tournament_date) - new Date()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntil <= 7;
  const regCount = tournament.registrations?.length ?? tournament.total_players ?? 0;
  const ladderLabel = LADDER_LABELS[tournament.ladder_name] || tournament.ladder_name;
  const entryFee = Number(tournament.entry_fee) || 20;

  const handleClick = (e) => {
    e.preventDefault();
    if (onOpenRegistration) {
      onOpenRegistration(tournament);
    } else if (onOpenInfo) {
      onOpenInfo(tournament);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(255, 68, 68, 0.25) 0%, rgba(204, 0, 0, 0.2) 100%)'
          : 'linear-gradient(135deg, rgba(0, 255, 0, 0.15) 0%, rgba(0, 204, 0, 0.1) 100%)',
        border: isUrgent ? '1px solid rgba(255, 68, 68, 0.5)' : '1px solid rgba(0, 255, 0, 0.4)',
        borderRadius: '8px',
        padding: '0.5rem 0.85rem',
        marginBottom: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        minWidth: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.01)';
        e.currentTarget.style.boxShadow = isUrgent
          ? '0 2px 12px rgba(255, 68, 68, 0.3)'
          : '0 2px 12px rgba(0, 255, 0, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 auto', minWidth: 0 }}>
        <span style={{ fontSize: '1.1rem' }}>🏆</span>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
            {ladderLabel} Tournament
          </span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', marginLeft: '0.35rem' }}>
            {formatDate(tournament.tournament_date)}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
            • ${entryFee} entry
          </span>
          {regCount > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', marginLeft: '0.25rem' }}>
              • {regCount} registered
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {isRegistered && (
          <span style={{
            background: 'rgba(0,255,0,0.25)',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#4ade80'
          }}>
            ✓ Registered
          </span>
        )}
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', fontWeight: 500 }}>
          View / Register →
        </span>
      </div>
    </div>
  );
};

export default TournamentNoticeCompact;
