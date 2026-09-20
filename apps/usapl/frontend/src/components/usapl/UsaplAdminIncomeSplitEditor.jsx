import React from 'react';
import {
  centsToDollars,
  chartDollarsToCents,
  incomeSplitChipLabel,
  incomeSplitOptionKey,
} from '../../data/usaplIncomeProjection.js';
import { normalizeUsaplPlayType } from '../../data/usaplIncomePlayType.js';
import { oneMatchTeamDuesCents } from '../../data/usaplIncomeTeamSize.js';
import UsaplAdminIncomePlayType from './UsaplAdminIncomePlayType.jsx';
import UsaplAdminIncomePlayers from './UsaplAdminIncomePlayers.jsx';

function enteredCents(prize, csi, lo) {
  const parts = [prize, csi, lo].map(chartDollarsToCents);
  if (parts.some((part) => part == null)) return null;
  return parts[0] + parts[1] + parts[2];
}

export default function UsaplAdminIncomeSplitEditor({
  playerDues,
  playersPerTeam,
  playType,
  prize,
  csi,
  lo,
  savedSplits,
  message,
  busy,
  onClose,
  onPlayerDues,
  onPlayersPerTeam,
  onPlayType,
  onPrize,
  onCsi,
  onLo,
  onPick,
  onSave,
  onRemove,
}) {
  const selectedKey = incomeSplitOptionKey(
    Math.round(Number(playerDues) * 100),
    playType,
    playersPerTeam,
  );
  const alreadySaved = savedSplits.some((row) => (
    incomeSplitOptionKey(row.dues_cents, row.play_type, row.players) === selectedKey
  ));
  const playerDuesCents = Math.round(Number(playerDues) * 100);
  const matchDues = oneMatchTeamDuesCents(playerDuesCents, playersPerTeam);
  const typed = enteredCents(prize, csi, lo);
  const amountsEmpty = prize === '' && csi === '' && lo === '';
  let balance = '';
  let balanceTone = '';
  if (matchDues && typed != null) {
    const diff = matchDues - typed;
    if (diff === 0) {
      balance = `Adds up to ${centsToDollars(matchDues)}`;
      balanceTone = 'is-ok';
    } else if (diff > 0) {
      balance = `${centsToDollars(diff)} still needed`;
      balanceTone = 'is-short';
    } else {
      balance = `${centsToDollars(-diff)} too much`;
      balanceTone = 'is-over';
    }
  }
  return (
    <div
      className="usapl-income-setup-dialog"
      role="dialog"
      aria-labelledby="usapl-income-setup-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="usapl-income-setup-head">
        <h2 id="usapl-income-setup-title">Chart row</h2>
        {savedSplits.length ? (
          <button className="usapl-text-btn" type="button" onClick={onClose}>Close</button>
        ) : null}
      </div>
      <p className="usapl-income-setup-hint">
        Prize, CSI, and operator must equal team dues for one match.
        {normalizeUsaplPlayType(playType) === 'double'
          ? ' The calculator doubles the night after you save.'
          : ''}
      </p>
      {savedSplits.length ? (
        <div className="usapl-choice-row">
          {savedSplits.map((row) => {
            const key = incomeSplitOptionKey(row.dues_cents, row.play_type, row.players);
            return (
              <button
                key={key}
                type="button"
                className={`usapl-choice${key === selectedKey ? ' selected' : ''}`}
                onClick={() => onPick(row)}
              >
                {incomeSplitChipLabel(row)}
              </button>
            );
          })}
        </div>
      ) : null}
      {alreadySaved && amountsEmpty ? (
        <p className="usapl-note">This row is already saved. Close, or type new amounts to replace it.</p>
      ) : null}
      <form className="usapl-form usapl-income-split-form" onSubmit={onSave} autoComplete="off">
        <UsaplAdminIncomePlayType
          idPrefix="usapl-split"
          value={normalizeUsaplPlayType(playType)}
          onChange={onPlayType}
        />
        <UsaplAdminIncomePlayers
          idPrefix="usapl-split"
          value={playersPerTeam}
          onChange={onPlayersPerTeam}
        />
        <div className="usapl-field">
          <label htmlFor="usapl-split-dues">Player dues</label>
          <input
            id="usapl-split-dues"
            type="number"
            min="0.01"
            step="0.01"
            value={playerDues}
            onChange={(event) => onPlayerDues(event.target.value)}
            required
          />
        </div>
        {matchDues ? (
          <p className="usapl-income-split-eq">
            {centsToDollars(playerDuesCents)} × {playersPerTeam} players ={' '}
            <strong>{centsToDollars(matchDues)}</strong> to split
          </p>
        ) : null}
        <div className="usapl-field">
          <label htmlFor="usapl-split-prize">Prize fund</label>
          <input
            id="usapl-split-prize"
            type="number"
            min="0"
            step="0.01"
            value={prize}
            onChange={(event) => onPrize(event.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div className="usapl-field">
          <label htmlFor="usapl-split-csi">CSI</label>
          <input
            id="usapl-split-csi"
            type="number"
            min="0"
            step="0.01"
            value={csi}
            onChange={(event) => onCsi(event.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div className="usapl-field">
          <label htmlFor="usapl-split-lo">Operator</label>
          <input
            id="usapl-split-lo"
            type="number"
            min="0"
            step="0.01"
            value={lo}
            onChange={(event) => onLo(event.target.value)}
            autoComplete="off"
            required
          />
        </div>
        {balance ? (
          <p className={`usapl-income-split-balance ${balanceTone}`}>{balance}</p>
        ) : null}
        <div className="usapl-actions">
          <button className="usapl-btn" type="submit" disabled={busy}>Save</button>
          {alreadySaved ? (
            <button className="usapl-btn-secondary" type="button" disabled={busy} onClick={onRemove}>
              Remove
            </button>
          ) : null}
        </div>
      </form>
      {message ? <p className="usapl-note">{message}</p> : null}
    </div>
  );
}
