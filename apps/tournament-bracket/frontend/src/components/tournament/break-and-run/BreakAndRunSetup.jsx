import React, { useMemo, useRef, useState } from 'react';
import BreakAndRunAddPlayerModal from './BreakAndRunAddPlayerModal.jsx';
import BreakAndRunRulesModal from './BreakAndRunRulesModal.jsx';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import { eventSnapshot, formatMoney, todayDateInput } from './breakAndRunEngine.js';
import { DEFAULT_EVENT_NAME } from './breakAndRunPayout.js';
import '../CreateTournamentForm.css';
import '../cash-climb/CashClimb.css';
import './BreakAndRun.css';

function isMemberEntry(kind) {
  return kind === 'member' || kind === 'tournament' || kind === 'usapl';
}

export default function BreakAndRunSetup({ onStart, onCancel }) {
  const [name, setName] = useState(DEFAULT_EVENT_NAME);
  const [tournamentDate, setTournamentDate] = useState(todayDateInput);
  const [memberFee, setMemberFee] = useState('10');
  const [openFee, setOpenFee] = useState('20');
  const [startingSeed, setStartingSeed] = useState('');
  const [reserve, setReserve] = useState('');
  const [players, setPlayers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const dateInputRef = useRef(null);

  const preview = useMemo(() => {
    const mFee = Number(memberFee) || 0;
    const oFee = Number(openFee) || 0;
    const seed = Number(startingSeed) || 0;
    const held = Number(reserve) || 0;
    const entries = players.reduce((sum, p) => sum + (isMemberEntry(p.entryKind) ? mFee : oFee), 0);
    return eventSnapshot({
      name,
      tournamentDate,
      memberFee: mFee,
      openFee: oFee,
      startingSeed: seed,
      reserve: held,
      players: players.map((p) => ({
        ...p,
        buyIns: 1,
        paidIn: isMemberEntry(p.entryKind) ? mFee : oFee,
      })),
      currentPot: entries + seed,
      grossCollected: entries + seed,
      totalPaidOut: 0,
    });
  }, [name, tournamentDate, memberFee, openFee, startingSeed, reserve, players]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tournamentDate) {
      alert('Pick the start date.');
      return;
    }
    onStart({
      name: name.trim() || DEFAULT_EVENT_NAME,
      startDate: tournamentDate,
      tournamentDate,
      memberFee: Number(memberFee) || 0,
      openFee: Number(openFee) || 0,
      startingSeed: Number(startingSeed) || 0,
      reserve: Number(reserve) || 0,
      players,
    });
  };

  return (
    <>
      <form className="create-tournament-form cc-setup bnr-setup" onSubmit={handleSubmit}>
        <BreakAndRunLogo size="header" className="bnr-setup-logo" />
        <p className="cc-setup-note">
          Payable pot = pot − reserve, then ÷ 10 per ball. Reserve stays until you change it.
        </p>
        <button type="button" className="tb-btn-new" onClick={() => setShowRules(true)}>Player rules</button>
        <div className="cc-field-row">
          <label>
            Event name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="cc-date-field">
            Start date
            <input
              ref={dateInputRef}
              type="date"
              value={tournamentDate}
              onChange={(e) => setTournamentDate(e.target.value)}
              onClick={() => dateInputRef.current?.showPicker?.()}
              required
            />
          </label>
        </div>
        <div className="cc-field-row">
          <label>
            Member / that day’s tournament ($)
            <input type="number" min="0" step="0.01" value={memberFee} onChange={(e) => setMemberFee(e.target.value)} />
          </label>
          <label>
            All other players ($)
            <input type="number" min="0" step="0.01" value={openFee} onChange={(e) => setOpenFee(e.target.value)} />
          </label>
        </div>
        <div className="cc-field-row">
          <label>
            Starting seed ($)
            <input
              type="number"
              min="0"
              step="0.01"
              value={startingSeed}
              onChange={(e) => setStartingSeed(e.target.value)}
              placeholder="One-time"
            />
          </label>
          <label>
            Reserve held ($)
            <input
              type="number"
              min="0"
              step="0.01"
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
              placeholder="Not paid on turns"
            />
          </label>
        </div>
        <p className="players-count">Seed is one-time. Reserve is withheld from ball math and can be changed later.</p>
        <div className="bnr-preview">
          <p><strong>Opening pot</strong> {formatMoney(preview.currentPot)}</p>
          <p>
            Payable {formatMoney(preview.payablePot)}
            {' · '}
            reserve {formatMoney(preview.reserve)}
            {' · '}
            per ball {formatMoney(preview.perBall)}
            {' · '}
            early 10 {formatMoney(preview.earlyTenPays)}
          </p>
          <p>Seed {formatMoney(preview.startingSeed)} · entries {formatMoney(preview.entryFees)}</p>
        </div>
        <label>
          Players
          <div className="players-section">
            <button type="button" className="add-player-btn" onClick={() => setShowAdd(true)}>
              + Add Player
            </button>
            {players.length > 0 && (
              <ul className="players-list">
                {players.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="player-list-item">
                    <span className="player-list-name">
                      {p.name}
                      <span className="player-list-detail">
                        {' · '}
                        {isMemberEntry(p.entryKind) ? formatMoney(Number(memberFee) || 0) : formatMoney(Number(openFee) || 0)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="player-list-remove"
                      onClick={() => setPlayers((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove ${p.name}`}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="players-count">
              {players.length} player{players.length !== 1 ? 's' : ''} · you can add more after it starts.
            </p>
          </div>
        </label>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Back</button>
          <button type="submit" className="btn-primary">Open the pot</button>
        </div>
      </form>
      <BreakAndRunAddPlayerModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        memberFee={Number(memberFee) || 0}
        openFee={Number(openFee) || 0}
        onAdd={(p) => setPlayers((prev) => [...prev, p])}
      />
      {showRules ? <BreakAndRunRulesModal onClose={() => setShowRules(false)} /> : null}
    </>
  );
}
