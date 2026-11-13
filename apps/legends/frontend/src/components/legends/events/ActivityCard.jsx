import React from 'react';
import { Link } from 'react-router-dom';
import { weekdayPhrase } from '../../../data/legendsSchedule.js';

export default function RecurringCard({ activity, featured = false }) {
  return (
    <article className={`lg-card lg-card--solid ${featured ? 'lg-card--featured' : ''}`}>
      <p className="lg-eyebrow lg-eyebrow--tight">Recurring · {weekdayPhrase(activity.weekdays)}</p>
      <h3 className="lg-display lg-display--card lg-mt-2">{activity.title}</h3>
      <p className="lg-card__copy lg-mt-3">{activity.summary}</p>
      <p className="lg-card__muted lg-mt-3">Time has not been published.</p>
      <Link to={`/legends/events/${activity.slug}`} className="lg-text-link">
        Details
      </Link>
    </article>
  );
}
