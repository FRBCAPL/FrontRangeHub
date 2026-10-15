import React from 'react';
import DuezySportPicker from './DuezySportPicker.jsx';
import DuezyStructurePicker from './DuezyStructurePicker.jsx';
import DuezySeasonFields from './DuezySeasonFields.jsx';

/**
 * Wizard step 1: the league (the organization) — name, sport, one or several divisions, and how teams pay.
 * nameOnly: a sample test league only needs a name; the database fills in the rest.
 */
export default function DuezyWizardLeagueStep({ league, structure, onChange, onStructure, nameOnly = false }) {
  if (nameOnly) {
    return (
      <label className="dz-field">
        <span>Test league name</span>
        <input value={league.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={80} autoFocus />
      </label>
    );
  }
  return (
    <div className="dz-stack">
      <h2 className="dz-h2">What's your league called?</h2>
      <p className="dz-small dz-muted">
        Your <strong>league</strong> is your organization — APA of Denver, Front Range BCAPL, Tuesday Night Darts.
        Inside it, <strong>divisions</strong> are groups of teams that play each other on the same night, format, dues and
        schedule. Each division plays in <strong>seasons</strong> (or sessions). Already have this league and just need another
        night or format? Use <strong>+ Add division</strong> on its dashboard card instead.
      </p>
      <label className="dz-field">
        <span>League (organization) name</span>
        <input value={league.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. APA of Denver" maxLength={80} autoFocus />
      </label>
      <DuezySeasonFields value={league} onChange={onChange} />
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
