import React from 'react';
import DuezyModal from './DuezyModal.jsx';
import DuezyTeamDetail from './DuezyTeamDetail.jsx';

/**
 * Team window (tap a team's name or status): catch-up jumps, pay panel, season strip, history.
 * Settling a late/make-up week advances to the next; the modal stays open until dismissed.
 */
export default function DuezyTeamPayModal({
  league, team, week, dues, schedule, balance, paymentIndex, canEdit, canSavePlayers,
  onSetPayment, onSetWeekPayment, onAddPlayer, onEditTeam, onClose, correctKey = 0, focusWeek = null,
}) {
  const setWeekPayment = async (w, entry) => {
    if (w !== week) return onSetWeekPayment(w, entry);
    return onSetPayment(entry);
  };
  return (
    <DuezyModal title={team.name} onClose={onClose} className="dz-pay-modal">
      {team.captain ? <p className="dz-small dz-muted dz-pay-modal-sub">Captain: {team.captain}</p> : null}
      <DuezyTeamDetail
        league={league}
        team={team}
        week={week}
        dues={dues}
        schedule={schedule}
        balance={balance}
        paymentIndex={paymentIndex}
        onSetWeekPayment={setWeekPayment}
        onAddPlayer={onAddPlayer}
        onEditTeam={onEditTeam}
        canEdit={canEdit}
        canSavePlayers={canSavePlayers}
        correctKey={correctKey}
        focusWeek={focusWeek}
      />
    </DuezyModal>
  );
}
