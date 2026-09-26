import React, { useMemo, useState } from 'react';
import { formatMoney } from './breakAndRunMath.js';
import { isPlayerInSession } from './breakAndRunEngine.js';
import '../AddPlayerModal.css';
import './BreakAndRun.css';

function capitalizeName(value) {
  return String(value || '').replace(/(^|\s)(\S)/g, (_, space, letter) => space + letter.toUpperCase());
}

function entryLabel(player) {
  return player?.entryKind === 'member' || player?.entryKind === 'tournament' || player?.entryKind === 'usapl'
    ? 'Member / tournament'
    : 'Open';
}

function playerFee(tournament, player, memberRate, openFee) {
  const kind = String(player?.entryKind || '').toLowerCase();
  const member = kind === 'member' || kind === 'tournament' || kind === 'usapl';
  return member ? memberRate : openFee;
}

/**
 * Add to this session: pick from pot roster (join + fee) or create a new name.
 */
export default function BreakAndRunAddPlayerModal({
  isOpen,
  onClose,
  onAdd,
  onJoin,
  tournament = null,
  memberFee = 10,
  openFee = 20,
  tournamentFee,
}) {
  const memberRate = Number.isFinite(Number(memberFee)) ? Number(memberFee) : Number(tournamentFee) || 10;
  const openRate = Number(openFee) || 0;
  const [name, setName] = useState('');
  const [entryKind, setEntryKind] = useState('open');
  const [filter, setFilter] = useState('');

  const available = useMemo(() => {
    const roster = tournament?.players || [];
    return roster
      .filter((p) => !isPlayerInSession(tournament, p.id))
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [tournament]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return available;
    return available.filter((p) => String(p.name || '').toLowerCase().includes(q));
  }, [available, filter]);

  const reset = () => {
    setName('');
    setEntryKind('open');
    setFilter('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = capitalizeName(name).trim();
    if (!trimmedName) {
      alert('Please enter a name.');
      return;
    }
    onAdd({ name: trimmedName, entryKind });
    reset();
    onClose();
  };

  const handleJoin = (player) => {
    onJoin?.(player);
    // Keep modal open so operator can add several people; clear filter only.
    setFilter('');
  };

  if (!isOpen) return null;

  return (
    <div className="add-player-modal-overlay" onClick={handleClose}>
      <div
        className="add-player-modal bnr-add-session-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add player to this session"
      >
        <div className="add-player-modal-header">
          <h3>{tournament ? 'Add to this session' : 'Add Player'}</h3>
          <button type="button" className="add-player-modal-close" onClick={handleClose} aria-label="Close">&times;</button>
        </div>

        <div className="bnr-add-session-body">
          {tournament ? (
            <section className="bnr-add-roster" aria-label="Pot roster">
              <h4>From the pot roster</h4>
              <p className="cc-setup-note">
                Players already on this pot. Joining buys into this session and puts them on the active list.
              </p>
              {available.length ? (
                <>
                  <label className="bnr-add-filter">
                    Search roster
                    <input
                      type="search"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Type a name"
                    />
                  </label>
                  <ul className="bnr-add-roster-list">
                    {filtered.map((p) => {
                      const fee = playerFee(tournament, p, memberRate, openRate);
                      return (
                        <li key={p.id}>
                          <div>
                            <strong>{p.name}</strong>
                            <span>{entryLabel(p)} · won {formatMoney(p.won)}</span>
                          </div>
                          <button
                            type="button"
                            className="tb-btn-new"
                            onClick={() => handleJoin(p)}
                          >
                            Join{fee > 0 ? ` ${formatMoney(fee)}` : ''}
                          </button>
                        </li>
                      );
                    })}
                    {!filtered.length ? (
                      <li className="bnr-add-roster-empty">No names match that search.</li>
                    ) : null}
                  </ul>
                </>
              ) : (
                <p className="cc-setup-note">Everyone on the roster is already in this session.</p>
              )}
            </section>
          ) : null}

          <section className="bnr-add-new" aria-label="New player">
            {tournament ? <h4>New player</h4> : null}
            <form onSubmit={handleSubmit} className="add-player-modal-form">
              <label>
                Name <span className="required">*</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(capitalizeName(e.target.value))}
                  placeholder="Player name"
                />
              </label>
              <p className="cc-setup-note">Entry goes into the pot. Each entry is one attempt.</p>
              <label className="cc-winner-pick">
                <input
                  type="radio"
                  name="bnr-entry"
                  checked={entryKind === 'member'}
                  onChange={() => setEntryKind('member')}
                />
                USAPL member or that day’s tournament · {formatMoney(memberRate)}
              </label>
              <label className="cc-winner-pick">
                <input
                  type="radio"
                  name="bnr-entry"
                  checked={entryKind === 'open'}
                  onChange={() => setEntryKind('open')}
                />
                All other players · {formatMoney(openRate)}
              </label>
              <div className="add-player-modal-actions">
                <button type="button" className="btn-secondary" onClick={handleClose}>Done</button>
                <button type="submit" className="btn-primary">Add new player</button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
