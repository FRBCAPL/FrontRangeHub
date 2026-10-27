import React from 'react';
import { formatTournamentDate } from '../../cash-climb/cashClimbEngine.js';
import CashClimbV3StartView from './CashClimbV3StartView.jsx';
import CashClimbV3LiveView from './CashClimbV3LiveView.jsx';

const STATUS = { setup: 'Setup (not started)', 'in-progress': 'In progress', completed: 'Complete' };

/** A saved tournament: pre-start review, live play, or the settled (read-only) result. `cloudPanel`: sync status. */
export default function CashClimbV3EventView({ record, optimizerCurrent, cloudPanel = null, onBack, onRemove, onDeleteCloud, onEdit, onStart, onPost, onSettle, onRefresh }) {
  const { event, players } = record;
  const rules = event.config.rules || {};
  return (
    <div className="create-tournament-form cc-setup ccv3-event">
      <h3>{record.name}</h3>
      <p className="cc-setup-note">
        Cash Climb • {STATUS[record.status] || record.status}{record.tournamentDate ? ` • ${formatTournamentDate(record.tournamentDate)}` : ''}
      </p>
      {cloudPanel}
      <dl className="ccv3-facts">
        <dt>Players</dt><dd>{players.length}</dd>
        <dt>Entry fee</dt><dd>${event.config.entryFeeCents / 100}</dd>
        <dt>Added money</dt><dd>${event.config.addedMoneyCents / 100}</dd>
        <dt>Race to</dt><dd>{event.config.raceTo}</dd>
        {rules.game ? <><dt>Game</dt><dd>{rules.game}</dd></> : null}
        {rules.notes ? <><dt>House rules</dt><dd>{rules.notes}</dd></> : null}
      </dl>
      {!optimizerCurrent ? (
        <p className="cc-setup-note ccv3-muted">These payouts were locked by an earlier version of the payout calculator and are kept exactly as saved.</p>
      ) : null}
      {record.status === 'setup'
        ? <CashClimbV3StartView record={record} onEdit={onEdit} onStart={onStart} />
        : <CashClimbV3LiveView record={record} onPost={onPost} onSettle={onSettle} onRefresh={onRefresh} />}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
        {onRemove ? <button type="button" className="btn-secondary" onClick={onRemove}>Remove from this tablet</button> : null}
        {onDeleteCloud ? <button type="button" className="btn-secondary" onClick={onDeleteCloud}>Delete from cloud</button> : null}
      </div>
    </div>
  );
}
