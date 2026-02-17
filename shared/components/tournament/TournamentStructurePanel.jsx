/**
 * Tournament Structure Panel - Admin view of full Cash Climb format, rules, and payouts
 * Uses shared/config/tournamentStructure.js as source of truth
 */

import React, { useState } from 'react';
import TOURNAMENT_STRUCTURE from '@shared/config/tournamentStructure';

const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const TournamentStructurePanel = () => {
  const [expanded, setExpanded] = useState(false);
  const { name, finalStageName, entryFee, entryFeeBreakdown, phase1, phase2, prizeDistribution, gameRules } = TOURNAMENT_STRUCTURE;

  return (
    <div style={{
      background: 'rgba(139, 92, 246, 0.08)',
      border: '1px solid rgba(139, 92, 246, 0.35)',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      overflow: 'hidden'
    }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '1rem 1.25rem',
          background: 'none',
          border: 'none',
          color: '#8b5cf6',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left'
        }}
      >
        <span>📋 {name} Tournament Structure & Rules</span>
        <span style={{ fontSize: '1.2rem' }}>{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', color: '#e0e0e0', fontSize: '0.95rem' }}>
          {/* Format */}
          <section style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#ffc107', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>🎯 Format</h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Tournament:</strong> {name}</p>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Phase 1:</strong> Round robin play continues until enough players are eliminated; when only a few remain, {finalStageName} begins</p>
              <p style={{ margin: 0 }}><strong>Phase 2:</strong> {finalStageName} (final round)</p>
            </div>
          </section>

          {/* Entry fee & prize pool */}
          <section style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#ffc107', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>💰 Entry Fee & Prize Pool</h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Entry Fee:</strong> {formatCurrency(entryFee)}</p>
              <p style={{ margin: '0 0 0.35rem 0' }}>
                <strong>Breakdown:</strong> {formatCurrency(entryFeeBreakdown.toTournament)} to tournament • {formatCurrency(entryFeeBreakdown.toLadderPlacement ?? 9)} placement + {formatCurrency(entryFeeBreakdown.toClimberSeed ?? 1)} climber (quarterly)
              </p>
              <p style={{ margin: 0 }}><strong>Prize Pool:</strong> Total from paid registrations (typically players × {formatCurrency(entryFeeBreakdown.toTournament)})</p>
            </div>
          </section>

          {/* Phase 1 Rules */}
          <section style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#ffc107', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Phase 1: {phase1.name}</h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}>{phase1.description}</p>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Elimination:</strong> {phase1.eliminationLosses} losses = eliminated</p>
              <p style={{ margin: 0 }}><strong>Phase 2 starts:</strong> When only 3, 4, or 6 players remain (threshold depends on total entries/field size), {finalStageName} begins</p>
            </div>
          </section>

          {/* Phase 2 Rules */}
          <section style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#ffc107', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Phase 2: {phase2.name}</h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}>{phase2.description}</p>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Elimination:</strong> {phase2.eliminationLosses} losses = eliminated</p>
              <p style={{ margin: 0 }}><strong>Start Thresholds (active players remaining):</strong></p>
              <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                {phase2.thresholds.map((t, i) => (
                  <li key={i}>
                    ≤{t.maxPlayers === Infinity ? '∞' : t.maxPlayers} total players → KOH starts at {t.threshold} players
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Prize distribution */}
          <section style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#ffc107', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Prize Distribution</h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Phase 1:</strong> Escalating payouts per round ({Math.round(prizeDistribution.finalRoundPercent * 100)}% reserved for final round)</p>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Phase 2 ({phase2.name}):</strong> Escalating match payouts; winner takes remaining pool + 1st place reserved amount</p>
              <p style={{ margin: 0 }}><strong>1st Place:</strong> Admin can reserve an amount in Create form; remainder goes to winner</p>
            </div>
          </section>

          {/* Game rules */}
          <section>
            <h4 style={{ color: '#ffc107', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Game Rules</h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Game:</strong> {gameRules.gameType}</p>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Race to:</strong> {gameRules.raceTo} games per match</p>
              <p style={{ margin: '0 0 0.35rem 0' }}><strong>Call shots:</strong> {gameRules.callShots ? 'Yes' : 'No'}</p>
              <p style={{ margin: 0 }}><strong>Rules:</strong> {gameRules.rulesNote}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default TournamentStructurePanel;
