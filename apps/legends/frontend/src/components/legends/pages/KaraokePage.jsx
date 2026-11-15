import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KARAOKE_HOST,
  KARAOKE_HOW_IT_WORKS,
  KARAOKE_START,
  karaokeHostReady,
  karaokeNightLabel,
} from '../../../data/legendsKaraoke.js';
import { weekdayInTimeZone } from '../../../data/legendsSchedule.js';
import { WEEKLY_CARDS, daysUntilWeekdays } from '../../../data/legendsWeekly.js';
import useNow from '../../../hooks/useNow.js';
import { fetchLegendsContent } from '../../../services/legendsContentService.js';
import { PageIntro } from '../LegendsUi.jsx';

const karaokeCard = WEEKLY_CARDS.find((card) => card.key === 'karaoke');

function MeetTheKj({ host }) {
  if (karaokeHostReady(host)) {
    return (
      <section className="lg-kj lg-mt-12">
        <h2 className="lg-display lg-display--sub">Meet the KJ</h2>
        <div className="lg-kj__card lg-mt-6">
          {host.photoSrc ? (
            <img className="lg-kj__photo" src={host.photoSrc} alt={host.photoAlt || host.name} loading="lazy" />
          ) : null}
          <div>
            <p className="lg-eyebrow lg-eyebrow--tight">{host.role || 'Karaoke host'}</p>
            <h3 className="lg-display lg-display--card lg-mt-2">{host.name}</h3>
            <p className="lg-copy lg-mt-3">{host.bio}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="lg-mt-12">
      <h2 className="lg-display lg-display--sub">Meet the KJ</h2>
      <p className="lg-empty lg-mt-6">
        Host details will be added here when Legends has a name and photo ready to publish.
      </p>
    </section>
  );
}

export default function KaraokePage() {
  const now = useNow();
  const weekday = weekdayInTimeZone(now);
  const daysAway = daysUntilWeekdays(weekday, karaokeCard.weekdays);
  const when = karaokeNightLabel(weekday, daysAway);
  const lede =
    daysAway === 0
      ? `Karaoke is on tonight, starting at ${KARAOKE_START}.`
      : `Next karaoke night is ${when} at ${KARAOKE_START}. Fridays and Saturdays every weekend.`;

  const [host, setHost] = useState(KARAOKE_HOST);

  useEffect(() => {
    let cancelled = false;
    fetchLegendsContent()
      .then((data) => {
        if (!cancelled && data?.karaokeHost) setHost(data.karaokeHost);
      })
      .catch(() => {
        /* Keep the static fallback / empty host. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Fridays & Saturdays" title="Karaoke">
        <p className="lg-lede lg-mt-4">{lede}</p>
      </PageIntro>

      <dl className="lg-facts-list lg-mt-8">
        <div>
          <dt>Nights</dt>
          <dd>Friday and Saturday</dd>
        </div>
        <div>
          <dt>Starts</dt>
          <dd>{KARAOKE_START}</dd>
        </div>
        <div>
          <dt>Next up</dt>
          <dd className="lg-capitalize">{when}</dd>
        </div>
      </dl>

      <h2 className="lg-display lg-display--sub lg-mt-12">How it works</h2>
      <ol className="lg-steps lg-mt-6">
        {KARAOKE_HOW_IT_WORKS.map((step, index) => (
          <li key={step}>
            <span className="lg-steps__num" aria-hidden="true">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="lg-card__muted lg-mt-4">
        Song lists and the live rotation stay in the karaoke app at the bar. This page does not show who is up next.
      </p>

      <MeetTheKj host={host} />

      <div className="lg-link-row lg-mt-12">
        <Link to="/legends/events/friday-karaoke">Friday details</Link>
        <Link to="/legends/events/saturday-karaoke">Saturday details</Link>
        <Link to="/legends/events">All events</Link>
      </div>
    </article>
  );
}
