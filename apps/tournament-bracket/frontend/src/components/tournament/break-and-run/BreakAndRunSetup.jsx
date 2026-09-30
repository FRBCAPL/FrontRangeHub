import React, { useMemo, useRef, useState } from 'react';
import BreakAndRunAddPlayerModal from './BreakAndRunAddPlayerModal.jsx';
import BreakAndRunRulesModal from './BreakAndRunRulesModal.jsx';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import { eventSnapshot, formatMoney, todayDateInput } from './breakAndRunEngine.js';
import { DEFAULT_EVENT_NAME, entryAmountToPot } from './breakAndRunPayout.js';
import { CALLED_PAYOUT_MODE, SEED_FLOOR } from './breakAndRunCalledPayout.js';
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
  const [startingSeed, setStartingSeed] = useState(String(SEED_FLOOR));
  const [players, setPlayers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const dateInputRef = useRef(null);

  const preview = useMemo(() => {
    const mFee = Number(memberFee) || 0;
    const oFee = Number(openFee) || 0;
    const seed = Number(startingSeed) || 0;
    const entries = players.reduce((sum, p) => sum + (isMemberEntry(p.entryKind) ? mFee : oFee), 0);
    return eventSnapshot({
      name,
      tournamentDate,
      memberFee: mFee,
      openFee: oFee,
      startingSeed: seed,
      payoutMode: CALLED_PAYOUT_MODE,
      players: players.map((p) => ({
        ...p,
        buyIns: 1,
        paidIn: isMemberEntry(p.entryKind) ? mFee : oFee,
      })),
      currentPot: entryAmountToPot(entries) + seed,
      grossCollected: entries + seed,
      totalPaidOut: 0,
    });
  }, [name, tournamentDate, memberFee, openFee, startingSeed, players]);

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
      payoutMode: CALLED_PAYOUT_MODE,
      players,
    });
  };

  return (
    <>
      <form className="create-tournament-form cc-setup bnr-setup" onSubmit={handleSubmit}>
        <BreakAndRunLogo size="header" className="bnr-setup-logo" />
        <p className="cc-setup-note">
          The whole pot is in play. Called balls pay pot ÷ 10, lucky balls pay a discounted value,
          and a Final 10 wins the pot. League seed keeps the pot at $100 or more.
          This starts the continuous Break & Run pot. For later nights, open this pot and use Start next session
          instead of creating another pot — that keeps payouts growing.
        </p>
        <button type="button" className="tb-btn-new" onClick={() => setShowRules(true)}>Player rules</button>
        <div className="cc-field-row">
          <label>
            Pot / event name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={DEFAULT_EVENT_NAME}
              required
            />
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
            League member / in an event that day ($)
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
              placeholder={String(SEED_FLOOR)}
            />
          </label>
        </div>
        <p className="players-count">
          League seed money. Whenever a payout drops the pot under $100, you will be asked to top it back up.
        </p>
        <div className="bnr-preview">
          <p><strong>Opening pot</strong> {formatMoney(preview.currentPot)}</p>
          <p>
            Called ball {formatMoney(preview.normalBall)}
            {' · '}
            lucky ball {formatMoney(preview.luckyBall)}
            {' · '}
            Final 10 wins {formatMoney(preview.finalTenPays)}
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
