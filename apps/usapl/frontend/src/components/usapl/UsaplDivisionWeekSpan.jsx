import React, { useEffect, useState } from 'react';
import {
  formatUsaplWeekday,
  usaplEndDateFromWeeks,
  usaplWeeksFromDates,
} from '../../data/usaplIncomeWeekSpan.js';

const MIN_WEEKS = 1;
const MAX_WEEKS = 52;

function weekCount(value) {
  const count = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(count) || count < MIN_WEEKS) return 0;
  return Math.min(MAX_WEEKS, count);
}

export default function UsaplDivisionWeekSpan({ playStarts = '', lastWeek = '', onChange }) {
  const derived = usaplWeeksFromDates(playStarts, lastWeek);
  const [lock, setLock] = useState(derived ? 'end' : 'weeks');
  const [weeksDraft, setWeeksDraft] = useState(derived ? String(derived) : '');

  useEffect(() => {
    if (lock === 'weeks') return;
    setWeeksDraft(derived ? String(derived) : '');
  }, [derived, lock]);

  const applyWeeks = (start, weeksValue) => {
    const count = weekCount(weeksValue);
    if (!start || !count) return;
    onChange({ playStarts: start, lastWeek: usaplEndDateFromWeeks(start, count) });
  };

  const weeksLabel = derived === 1 ? '1 weekly night' : (derived ? `${derived} weekly nights` : '');

  return (
    <div className="usapl-division-week-span">
      <div className="usapl-field">
        <label htmlFor="usapl-division-play-starts">Play starts</label>
        <input
          id="usapl-division-play-starts"
          type="date"
          value={playStarts}
          onChange={(event) => {
            const value = event.target.value;
            if (lock === 'weeks') {
              applyWeeks(value, weeksDraft);
              if (!weekCount(weeksDraft)) onChange({ playStarts: value, lastWeek });
              return;
            }
            onChange({ playStarts: value, lastWeek });
          }}
        />
        {playStarts ? (
          <span className="usapl-field-hint">{formatUsaplWeekday(playStarts)}</span>
        ) : (
          <span className="usapl-field-hint">First league night</span>
        )}
      </div>
      <div className="usapl-field">
        <label htmlFor="usapl-division-weeks">Weeks</label>
        <input
          id="usapl-division-weeks"
          type="number"
          min={MIN_WEEKS}
          max={MAX_WEEKS}
          step="1"
          value={weeksDraft}
          placeholder={playStarts ? 'e.g. 16' : ''}
          onChange={(event) => {
            const value = event.target.value;
            setLock('weeks');
            setWeeksDraft(value);
            applyWeeks(playStarts, value);
          }}
        />
        <span className="usapl-field-hint">
          {weeksLabel || (playStarts ? 'Number of weekly nights' : 'Pick a start date first')}
        </span>
      </div>
      <div className="usapl-field">
        <label htmlFor="usapl-division-last-week">Last week</label>
        <input
          id="usapl-division-last-week"
          type="date"
          value={lastWeek}
          min={playStarts || undefined}
          onChange={(event) => {
            const value = event.target.value;
            setLock('end');
            onChange({ playStarts, lastWeek: value });
          }}
        />
        {lastWeek ? (
          <span className="usapl-field-hint">{formatUsaplWeekday(lastWeek)}</span>
        ) : (
          <span className="usapl-field-hint">Last league night</span>
        )}
      </div>
    </div>
  );
}
