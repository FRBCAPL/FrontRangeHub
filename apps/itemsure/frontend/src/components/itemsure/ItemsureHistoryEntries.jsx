import React from 'react';

const dayKey = (value) => new Date(value).toDateString();

function dayLabel(value) {
  const day = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === today.toDateString()) return 'Today';
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: day.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

const timeOf = (value) => new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** History entries grouped under day headings ("Today", "Yesterday", "Mon, Oct 26"), newest first. */
export default function ItemsureHistoryEntries({ entries }) {
  const days = [];
  for (const entry of entries) {
    const key = dayKey(entry.createdAt);
    if (days[days.length - 1]?.key !== key) days.push({ key, label: dayLabel(entry.createdAt), entries: [] });
    days[days.length - 1].entries.push(entry);
  }
  return (
    <div className="isu-history-days">
      {days.map((day) => (
        <div key={day.key}>
          <h3 className="isu-history-day">{day.label}</h3>
          <ul className="isu-activity">
            {day.entries.map((a) => (
              <li key={a.id}>
                <span>
                  {a.label}
                  {a.by ? <span className="isu-muted isu-small"> {'\u00b7'} by {a.by}</span> : null}
                </span>
                <time dateTime={a.createdAt}>{timeOf(a.createdAt)}</time>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
