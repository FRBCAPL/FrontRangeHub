import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { eventCategoryLabel } from '../../../data/legendsEventCategories.js';
import { findRecurring, weekdayPhrase } from '../../../data/legendsSchedule.js';
import { fetchPublishedEvent } from '../../../services/legendsEventsService.js';
import { PageIntro } from '../LegendsUi.jsx';

function whenLabel(iso) {
  if (!iso) return 'Not published';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function RecurringDetail({ activity }) {
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
          <dd>{activity.timeLabel ?? 'Not published'}</dd>
        </div>
      </dl>
      <Link to="/legends/events" className="lg-text-link lg-mt-8">
        Back to events
      </Link>
    </article>
  );
}

function OneTimeDetail({ event }) {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow={eventCategoryLabel(event.category)} title={event.title}>
        {event.summary ? <p className="lg-lede lg-mt-4">{event.summary}</p> : null}
        {event.description ? <p className="lg-copy lg-mt-4">{event.description}</p> : null}
      </PageIntro>
      {event.imageUrl ? (
        <figure className="lg-photo lg-photo--framed lg-mt-8">
          <img src={event.imageUrl} alt="" loading="lazy" />
        </figure>
      ) : null}
      <dl className="lg-facts-list lg-mt-8">
        <div>
          <dt>Starts</dt>
          <dd>{whenLabel(event.startsAt)}</dd>
        </div>
        {event.endsAt ? (
          <div>
            <dt>Ends</dt>
            <dd>{whenLabel(event.endsAt)}</dd>
          </div>
        ) : null}
      </dl>
      <Link to="/legends/events" className="lg-text-link lg-mt-8">
        Back to events
      </Link>
    </article>
  );
}

export default function EventDetailPage() {
  const { slug } = useParams();
  const recurring = findRecurring(slug);
  const [event, setEvent] = useState(null);
  const [loaded, setLoaded] = useState(Boolean(recurring));

  useEffect(() => {
    if (recurring) return undefined;
    let cancelled = false;
    fetchPublishedEvent(slug)
      .then((data) => {
        if (!cancelled) setEvent(data?.event || null);
      })
      .catch(() => {
        if (!cancelled) setEvent(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, recurring]);

  if (recurring) return <RecurringDetail activity={recurring} />;
  if (!loaded) return <p className="lg-page lg-card__muted">Loading…</p>;
  if (!event) return <Navigate to="/legends/events" replace />;
  return <OneTimeDetail event={event} />;
}
