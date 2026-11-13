import React from 'react';
import { activitiesOn, RECURRING_ACTIVITIES, WEEKDAY_LABELS, weekdayInTimeZone } from '../../../data/legendsSchedule.js';
import { PageIntro } from '../LegendsUi.jsx';
import RecurringCard from './ActivityCard.jsx';

export default function EventsPage() {
  const weekday = weekdayInTimeZone(new Date());
  const today = activitiesOn(weekday);
  return (
    <div className="lg-page">
      <PageIntro eyebrow="Events" title="What's happening">
        <p className="lg-copy lg-mt-4 lg-max-2xl">
          Recurring nights stay on the calendar. One-time events appear only after Legends staff publish them. Times that are not confirmed are left blank.
        </p>
      </PageIntro>

      <div className="lg-mt-10">
        <p className="lg-eyebrow">Today · {WEEKDAY_LABELS[weekday]}</p>
        <div className="lg-grid lg-grid--2 lg-mt-4">
          {today.map((activity) => (
            <RecurringCard key={activity.slug} activity={activity} featured />
          ))}
        </div>
        {today.length === 0 ? <p className="lg-card__muted lg-mt-4">Nothing recurring is marked for today. The weekly list is below.</p> : null}
      </div>

      <h2 className="lg-display lg-display--sub lg-mt-12">Recurring</h2>
      <div className="lg-grid lg-grid--2 lg-mt-4">
        {RECURRING_ACTIVITIES.map((activity) => (
          <RecurringCard key={activity.slug} activity={activity} />
        ))}
      </div>

      <h2 className="lg-display lg-display--sub lg-mt-12">Scheduled events</h2>
      <p className="lg-empty lg-mt-4">
        No one-time events are published yet. Recurring leagues, karaoke, and the Sunday tournament are listed above.
      </p>
    </div>
  );
}
