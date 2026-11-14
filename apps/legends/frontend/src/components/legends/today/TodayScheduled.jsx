import React from 'react';
import { Link } from 'react-router-dom';
import { TodayBadge } from './TodayMatches.jsx';

/** Scheduled nights that are not (yet) in CueSync, shown from the weekly schedule. */
export const SCHEDULED_TONIGHT = {
  karaoke: {
    heading: 'Karaoke tonight',
    lines: ['Karaoke starts at 8 PM.', 'Scan the QR code at Legends to sign up to sing.'],
    link: { to: '/legends/karaoke', label: 'Karaoke details' },
  },
  tournament: {
    heading: 'Nine Ball tonight',
    lines: ['Sunday Night Nine Ball starts at 6:30 PM.', 'Sign-ups from 3 PM, in person only. $20 entry.'],
    link: { to: '/legends/play/tournaments', label: 'Tournament details' },
  },
};

/** `withBadge` is off when the card heading already names this event. */
export default function TodayScheduled({ kind, withBadge }) {
  const item = SCHEDULED_TONIGHT[kind];
  return (
    <div className="lg-today__group lg-today__scheduled">
      {withBadge ? (
        <p>
          <TodayBadge>{item.heading}</TodayBadge>
        </p>
      ) : null}
      {item.lines.map((line, index) => (
        <p key={line} className={index === 0 ? 'lg-today__scheduled-line lg-glow' : 'lg-today__scheduled-sub'}>
          {line}
        </p>
      ))}
      <Link to={item.link.to} className="lg-today__scheduled-link">
        {item.link.label}
      </Link>
    </div>
  );
}
