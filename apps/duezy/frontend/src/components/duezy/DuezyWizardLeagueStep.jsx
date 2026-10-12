import React from 'react';
import DuezySportPicker from './DuezySportPicker.jsx';
import DuezyStructurePicker from './DuezyStructurePicker.jsx';

/** Wizard step 1: the league itself — name, sport, one or several divisions, and how teams pay. */
export default function DuezyWizardLeagueStep({ league, structure, onChange, onStructure }) {
  return (
    <div className="dz-stack">
      <h2 className="dz-h2">What's your league called?</h2>
      <p className="dz-small dz-muted">
        The league is your whole organization. Already have one and just need another night or skill level?
        Use <strong>+ Add division</strong> under that league on your dashboard instead.
      </p>
      <label className="dz-field">
        <span>League name</span>
        <input value={league.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Tuesday Night Darts" maxLength={80} autoFocus />
      </label>
      <div className="dz-field">
        <span>What do you play?</span>
        <DuezySportPicker value={league.sport} onChange={(sport) => onChange({ sport })} />
      </div>
      <div className="dz-field">
        <span>How is your league set up?</span>
        <DuezyStructurePicker value={structure} onChange={onStructure} />
      </div>
      <p className="dz-small dz-muted">
        {structure === 'single'
          ? "Next you'll set up your division — its night, dues and dates."
          : "You'll name each division and pick its night in a couple of steps."}
      </p>
      <label className="dz-field">
        <span>Payment instructions for reminders <em className="dz-muted">(optional)</em></span>
        <input
          value={league.payment_note}
          onChange={(e) => onChange({ payment_note: e.target.value })}
          placeholder="e.g. Venmo @yourname or cash at the table"
          maxLength={300}
        />
        <small className="dz-small dz-muted">Added to the end of reminder texts so teams know how to pay you.</small>
      </label>
    </div>
  );
}
