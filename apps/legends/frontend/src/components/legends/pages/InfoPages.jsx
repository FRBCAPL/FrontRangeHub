import React from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../LegendsUi.jsx';
import VisitFacts from '../VisitFacts.jsx';

const KARAOKE_NIGHTS = [
  { day: 'Friday', slug: 'friday-karaoke' },
  { day: 'Saturday', slug: 'saturday-karaoke' },
];

export function KaraokePage() {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Nights" title="Karaoke" />
      <div className="lg-grid lg-grid--2 lg-mt-8">
        {KARAOKE_NIGHTS.map(({ day, slug }) => (
          <section key={slug} className="lg-card lg-card--solid">
            <h2 className="lg-display lg-display--card">{day}</h2>
            <p className="lg-card__copy lg-mt-2">Karaoke night. Start time is not published yet.</p>
            <Link to={`/legends/events/${slug}`} className="lg-text-link">
              {day} details
            </Link>
          </section>
        ))}
      </div>
      <p className="lg-card__muted lg-mt-8">
        Song lists, hosts, and drink specials will be added here when Legends has them. Nothing on this page is a promotion with a price.
      </p>
    </article>
  );
}

export function VisitPage() {
  return (
    <div className="lg-page">
      <div className="lg-visit-page">
        <div>
          <PageIntro eyebrow="The room" title="Visit Legends">
            <p className="lg-copy lg-mt-4 lg-max-xl">
              A pool hall and bar. Come for the tables. Stay for leagues, karaoke, darts, and whatever is on the televisions.
            </p>
          </PageIntro>
          <figure className="lg-photo lg-mt-8">
            <img src="/legends/venue-bar.jpg" alt="Pool tables beside the bar and televisions at Legends Brews & Cues" />
          </figure>
        </div>
        <div className="lg-visit-page__facts">
          <VisitFacts />
        </div>
      </div>
    </div>
  );
}

export function RewardsPage() {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Free" title="Legends Rewards">
        <p className="lg-lede lg-mt-4">
          Membership costs nothing. Sign up with an email, a mobile number, or both. Either verified contact can sign you in later.
        </p>
      </PageIntro>
      <ul className="lg-bullets lg-mt-6">
        <li>A digital membership card with a code that does not redeem anything by itself.</li>
        <li>Points from qualifying purchases and participation, once Legends approves the rules.</li>
        <li>Achievements that are separate from points and have no cash value.</li>
      </ul>
      <p className="lg-card__muted lg-mt-6">
        This site does not advertise a points rate, a free drink, or any other specific reward. Those decisions are not final.
      </p>
      <p className="lg-empty lg-mt-8">Sign-up is not open on this site yet.</p>
    </article>
  );
}
