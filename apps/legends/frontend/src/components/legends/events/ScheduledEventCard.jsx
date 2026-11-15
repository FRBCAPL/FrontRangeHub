import React from 'react';
import { Link } from 'react-router-dom';
import { eventCategoryLabel } from '../../../data/legendsEventCategories.js';
import { MoreLink } from '../LegendsUi.jsx';

function whenLabel(iso) {
  if (!iso) return 'Time TBA';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function ScheduledEventCard({ event }) {
  return (
    <Link to={`/legends/events/${event.slug}`} className="lg-card lg-card--link lg-card--solid">
      <p className="lg-eyebrow lg-eyebrow--tight">{eventCategoryLabel(event.category)}</p>
      <h3 className="lg-display lg-display--card lg-mt-2">{event.title}</h3>
      <p className="lg-card__muted lg-mt-2">{whenLabel(event.startsAt)}</p>
      {event.summary ? <p className="lg-card__copy lg-mt-3">{event.summary}</p> : null}
      <MoreLink />
    </Link>
  );
}
