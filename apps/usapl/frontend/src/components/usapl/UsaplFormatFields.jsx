import React from 'react';
import { USAPL_GAME_FORMATS } from '../../data/usaplFormat.js';

function FormatSelect({ label, choice, other, onChoice, onOther }) {
  return (
    <div className="usapl-field">
      <label>{label}</label>
      <select value={choice} onChange={(e) => onChoice(e.target.value)}>
        {USAPL_GAME_FORMATS.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
        <option value="Other">Other</option>
      </select>
      {choice === 'Other' ? (
        <input
          value={other}
          onChange={(e) => onOther(e.target.value)}
          placeholder="Enter format"
          required
        />
      ) : null}
    </div>
  );
}

export default function UsaplFormatFields({ playType, formatA, formatB, formatOtherA, formatOtherB, onChange }) {
  const set = (patch) => onChange({ playType, formatA, formatB, formatOtherA, formatOtherB, ...patch });
  const double = playType === 'double';

  return (
    <>
      <div className="usapl-field">
        <label>Play type</label>
        <div className="usapl-choice-row">
          <button
            type="button"
            className={`usapl-choice ${playType === 'single' ? 'selected' : ''}`}
            onClick={() => set({ playType: 'single' })}
          >
            Single play
          </button>
          <button
            type="button"
            className={`usapl-choice ${double ? 'selected' : ''}`}
            onClick={() => set({ playType: 'double', formatB: formatB || '10-ball' })}
          >
            Double play
          </button>
        </div>
      </div>
      <div className={double ? 'usapl-player-grid' : undefined}>
        <FormatSelect
          label={double ? 'First format' : 'Format'}
          choice={formatA}
          other={formatOtherA}
          onChoice={(value) => set({ formatA: value })}
          onOther={(value) => set({ formatOtherA: value })}
        />
        {double ? (
          <FormatSelect
            label="Second format"
            choice={formatB}
            other={formatOtherB}
            onChoice={(value) => set({ formatB: value })}
            onOther={(value) => set({ formatOtherB: value })}
          />
        ) : null}
      </div>
    </>
  );
}
