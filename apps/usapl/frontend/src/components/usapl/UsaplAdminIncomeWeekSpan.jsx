import React, { useEffect, useState } from 'react';
import {
  formatUsaplWeekday,
  usaplEndDateFromWeeks,
  usaplWeeksFromDates,
} from '../../data/usaplIncomeWeekSpan.js';
import UsaplIncomeStepper from './UsaplIncomeStepper.jsx';

export default function UsaplAdminIncomeWeekSpan({ weeks, min = 1, max = 36, onWeeks }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [lock, setLock] = useState('weeks');

  useEffect(() => {
    if (!start || lock !== 'weeks') return;
    const next = usaplEndDateFromWeeks(start, weeks);
    setEnd(next);
  }, [start, weeks, lock]);

  const setWeeksFromEnd = (startYmd, endYmd) => {
    const count = usaplWeeksFromDates(startYmd, endYmd);
    if (!count) return;
    onWeeks(String(Math.min(max, Math.max(min, count))));
  };

  return (
    <>
      <UsaplIncomeStepper
        id="usapl-income-weeks"
        label="Weeks"
        value={weeks}
        min={min}
        max={max}
        onChange={(value) => {
          setLock('weeks');
          onWeeks(value);
        }}
      />
      <div className="usapl-field usapl-income-week-date">
        <label htmlFor="usapl-income-start">Start</label>
        <input
          id="usapl-income-start"
          type="date"
          value={start}
          onChange={(event) => {
            const value = event.target.value;
            setStart(value);
            if (!value) return;
            if (lock === 'end' && end) setWeeksFromEnd(value, end);
          }}
        />
        {start ? <span className="usapl-field-hint">{formatUsaplWeekday(start)}</span> : null}
      </div>
      <div className="usapl-field usapl-income-week-date">
        <label htmlFor="usapl-income-end">End</label>
        <input
          id="usapl-income-end"
          type="date"
          value={end}
          min={start || undefined}
          disabled={!start}
          onChange={(event) => {
            const value = event.target.value;
            setLock('end');
            setEnd(value);
            if (start && value) setWeeksFromEnd(start, value);
          }}
        />
        {end ? <span className="usapl-field-hint">{formatUsaplWeekday(end)}</span> : (
          <span className="usapl-field-hint">{start ? 'Last league night' : 'Pick a start date'}</span>
        )}
      </div>
    </>
  );
}
