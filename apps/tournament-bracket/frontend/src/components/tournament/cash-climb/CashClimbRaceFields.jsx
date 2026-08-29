import React from 'react';
import { RACE_TO_PRESETS, raceOptionLabel } from './cashClimbRace.js';

function RaceSelect({ id, label, mode, onMode, other, onOther }) {
  return (
    <label htmlFor={id}>
      {label}
      <select id={id} value={mode} onChange={(e) => onMode(e.target.value)}>
        {RACE_TO_PRESETS.map((n) => (
          <option key={n} value={n}>{raceOptionLabel(n)}</option>
        ))}
        <option value="other">Other…</option>
      </select>
      {mode === 'other' && (
        <input
          type="number"
          min="1"
          max="21"
          step="1"
          value={other}
          onChange={(e) => onOther(e.target.value)}
          placeholder="1–21"
          aria-label={`Custom ${label} race`}
        />
      )}
    </label>
  );
}

export default function CashClimbRaceFields({
  raceToMode,
  setRaceToMode,
  otherRaceTo,
  setOtherRaceTo,
  kohRaceToMode,
  setKohRaceToMode,
  otherKohRaceTo,
  setOtherKohRaceTo,
}) {
  return (
    <div className="cc-field-row">
      <RaceSelect
        id="cc-rr-race"
        label="Round robin"
        mode={raceToMode}
        onMode={setRaceToMode}
        other={otherRaceTo}
        onOther={setOtherRaceTo}
      />
      <RaceSelect
        id="cc-koh-race"
        label="King of the Hill"
        mode={kohRaceToMode}
        onMode={setKohRaceToMode}
        other={otherKohRaceTo}
        onOther={setOtherKohRaceTo}
      />
    </div>
  );
}
