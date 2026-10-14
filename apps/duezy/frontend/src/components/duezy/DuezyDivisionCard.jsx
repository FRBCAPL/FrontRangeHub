import React from 'react';
import { money, weeklyDues } from '../../utils/duezyMath.js';
import DuezyDuesFields from './DuezyDuesFields.jsx';
import DuezyDayPicker from './DuezyDayPicker.jsx';
import DuezyScheduleFields from './DuezyScheduleFields.jsx';
import DuezySessionLabelField from './DuezySessionLabelField.jsx';

/** One division's name, session, night, dues, team size, weeks and dates. Used by the wizard and settings. */
export default function DuezyDivisionCard({ draft, sport, index, word = 'season', defaultGrace = 0, onChange, onRemove, children }) {
  const perTeam = weeklyDues(draft);
  return (
    <div className="dz-div-edit">
      <div className="dz-row">
        <span className="dz-div-edit-num">Division {index + 1}</span>
        {onRemove ? (
          <button type="button" className="dz-link dz-link--danger dz-small" onClick={onRemove}>Remove</button>
        ) : null}
      </div>
      <label className="dz-field">
        <span>Division name</span>
        <input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={index === 0 ? 'e.g. Tuesday 8-Ball' : 'e.g. Thursday 9-Ball'}
          maxLength={60}
        />
      </label>
      <DuezySessionLabelField value={draft.session_label} onChange={(session_label) => onChange({ session_label })} word={word} />
      <div className="dz-field">
        <span>Night they play</span>
        <DuezyDayPicker value={draft.play_day} onChange={(play_day) => onChange({ play_day })} label={`Night for division ${index + 1}`} />
      </div>
      <DuezyDuesFields league={{ ...draft, sport }} onChange={onChange} showTeamSize />
      {perTeam > 0 ? (
        <p className="dz-small dz-muted">
          Each team pays <strong>{money(perTeam)}</strong> per week · {money(perTeam * (Number(draft.total_weeks) || 0))} for the {word}
        </p>
      ) : null}
      <DuezyScheduleFields value={draft} onChange={onChange} graceMode="override" defaultGrace={defaultGrace} />
      {children}
    </div>
  );
}
