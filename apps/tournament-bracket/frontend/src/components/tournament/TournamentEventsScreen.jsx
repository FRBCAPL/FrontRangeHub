import React from 'react';
import CashClimbSavedEvents from './cash-climb/CashClimbSavedEvents.jsx';

export default function TournamentEventsScreen({
  title,
  note,
  emptyMessage,
  events,
  onOpen,
  onRemove,
  onBack,
}) {
  return (
    <>
      <header className="tb-header">
        <h1>{title}</h1>
        <p>{note}</p>
      </header>
      <CashClimbSavedEvents
        title=""
        note=""
        emptyMessage={emptyMessage}
        events={events}
        onOpen={onOpen}
        onRemove={onRemove}
      />
      <div className="cc-format-grid">
        <button type="button" className="tb-btn-new" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  );
}
