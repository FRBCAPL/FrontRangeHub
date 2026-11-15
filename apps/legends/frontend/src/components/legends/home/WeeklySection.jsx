import React from 'react';
import { Link } from 'react-router-dom';
import { weekdayInTimeZone } from '../../../data/legendsSchedule.js';
import { WEEKLY_CARDS, daysUntilWeekdays, orderWeeklyCards, runsTonight } from '../../../data/legendsWeekly.js';
import useNow from '../../../hooks/useNow.js';
import { karaokeCardState } from '../../../services/legendsKaraokeCard.js';
import { leagueCardState } from '../../../services/legendsLeagueCard.js';
import { MoreLink, SectionHeading } from '../LegendsUi.jsx';

/** Leagues follow CueSync; karaoke follows the weekly schedule; Nine Ball stays fixed. */
function cardView(card, weekday, league) {
  if (card.key === 'leagues') {
    return {
      tonight: league.tonight,
      tag: league.tag,
      blurb: league.blurb ?? card.blurb,
      daysAway: league.daysAway,
    };
  }
  if (card.key === 'karaoke') return karaokeCardState(card, weekday);
  const tonight = runsTonight(card, weekday);
  return {
    tonight,
    tag: tonight ? 'Tonight' : null,
    blurb: card.blurb,
    daysAway: daysUntilWeekdays(weekday, card.weekdays),
  };
}

export default function WeeklySection({ today }) {
  const now = useNow();
  const weekday = weekdayInTimeZone(now);
  const league = leagueCardState(today.summary, now);
  const views = new Map(WEEKLY_CARDS.map((card) => [card.key, cardView(card, weekday, league)]));

  return (
    <section className="lg-section lg-section--weekly" aria-labelledby="weekly-heading">
      <SectionHeading id="weekly-heading" title="Legends Regulars" />
      <ul className="lg-grid lg-grid--3 lg-mt-6">
        {orderWeeklyCards((card) => views.get(card.key).daysAway).map((card) => {
          const view = views.get(card.key);
          return (
            <li key={card.key}>
              <Link to={card.to} className={`lg-card lg-card--link ${view.tonight ? 'lg-card--tonight' : ''}`}>
                <div className="lg-weekly__top">
                  <p className="lg-eyebrow lg-eyebrow--tight">{card.daysLabel}</p>
                  {view.tag ? <span className={`lg-tonight-tag ${view.tonight ? '' : 'lg-tonight-tag--next'}`}>{view.tag}</span> : null}
                </div>
                <h3 className="lg-display lg-display--card lg-mt-2">{card.title}</h3>
                <p className="lg-card__copy lg-mt-3">{view.blurb}</p>
                <MoreLink />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
