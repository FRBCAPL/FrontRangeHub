import React from 'react';
import DuezySportPicker from './DuezySportPicker.jsx';
import DuezyDayPicker from './DuezyDayPicker.jsx';
import DuezyStructurePicker from './DuezyStructurePicker.jsx';

/** Wizard step 1: name, sport, single vs multiple divisions, and (single only) the night. */
export default function DuezyWizardLeagueStep({ league, structure, onChange, onStructure }) {
  return (
    <div className="dz-stack">
      <h2 className="dz-h2">What's your league called?</h2>
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
      {structure === 'single' ? (
        <div className="dz-field">
          <span>Night you play</span>
          <DuezyDayPicker value={league.play_day} onChange={(play_day) => onChange({ play_day })} />
        </div>
      ) : (
        <p className="dz-small dz-muted">You'll name each division and pick its night in a couple of steps.</p>
      )}
    </div>
  );
}
