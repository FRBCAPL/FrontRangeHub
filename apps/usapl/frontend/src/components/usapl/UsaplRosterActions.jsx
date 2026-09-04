import React from 'react';

export default function UsaplRosterActions({
  step,
  inRoster,
  canAddAnother,
  hasNextPlayer,
  lastMainStep,
  mode,
  playersLength,
  submitting,
  onBack,
  onCancel,
  onAddAnother,
  onSave,
}) {
  return (
    <div className="usapl-actions usapl-signup-actions">
      {step > 0 || inRoster ? (
        <button className="usapl-btn-secondary" type="button" onClick={onBack}>
          Back
        </button>
      ) : null}
      <button className="usapl-btn-secondary" type="button" onClick={onCancel}>
        Cancel
      </button>
      {inRoster && canAddAnother ? (
        <button className="usapl-btn-secondary" type="button" onClick={onAddAnother}>
          Add another player
        </button>
      ) : null}
      {inRoster ? (
        hasNextPlayer ? (
          <button className="usapl-btn" type="submit">Next player</button>
        ) : (
          <button className="usapl-btn" type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit roster'}
          </button>
        )
      ) : lastMainStep && mode === 'new' ? (
        <>
          <button className="usapl-btn-secondary" type="button" onClick={onSave} disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit roster'}
          </button>
          <button className="usapl-btn" type="submit">Add players</button>
        </>
      ) : lastMainStep && mode === 'update' ? (
        <button className="usapl-btn" type="submit">
          {playersLength ? 'Review players' : 'Add players'}
        </button>
      ) : lastMainStep ? (
        <button className="usapl-btn" type="submit">Add player</button>
      ) : (
        <button className="usapl-btn" type="submit">Next</button>
      )}
    </div>
  );
}
