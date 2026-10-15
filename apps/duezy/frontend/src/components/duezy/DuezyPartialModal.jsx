import React from 'react';
import DuezyModal from './DuezyModal.jsx';
import DuezyPartialForm from './DuezyPartialForm.jsx';
import DuezyCorrectPayment from './DuezyCorrectPayment.jsx';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';

/** "Partial" chip on a team row: enter the amount paid, or correct an amount already recorded. */
export default function DuezyPartialModal({ league, team, dues, weekName, payment, onSetPayment, onAddPlayer, onClose }) {
  const setAndClose = async (entry) => {
    await onSetPayment(entry);
    onClose();
  };
  return (
    <DuezyModal title={`${team.name} · ${weekName}`} onClose={onClose} className="dz-partial-modal">
      <div className="dz-stack">
        {hasRecordedEntry(payment) ? (
          <DuezyCorrectPayment league={league} dues={dues} weekName={weekName} payment={payment} onSetPayment={setAndClose} startOpen />
        ) : (
          <DuezyPartialForm league={league} team={team} dues={dues} onSetPayment={setAndClose} onAddPlayer={onAddPlayer} />
        )}
      </div>
    </DuezyModal>
  );
}
