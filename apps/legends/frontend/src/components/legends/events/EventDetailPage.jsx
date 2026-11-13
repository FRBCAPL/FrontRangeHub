import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { findRecurring, weekdayPhrase } from '../../../data/legendsSchedule.js';
import { PageIntro } from '../LegendsUi.jsx';

export default function EventDetailPage() {
  const { slug } = useParams();
  const activity = findRecurring(slug);
  if (!activity) return <Navigate to="/legends/events" replace />;
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Recurring activity" title={activity.title}>
        <p className="lg-lede lg-mt-4">{activity.description}</p>
      </PageIntro>
      <dl className="lg-facts-list lg-mt-8">
        <div>
          <dt>Schedule</dt>
          <dd>{weekdayPhrase(activity.weekdays)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>Not published</dd>
        </div>
      </dl>
      <Link to="/legends/events" className="lg-text-link lg-mt-8">
        Back to events
      </Link>
    </article>
  );
}
