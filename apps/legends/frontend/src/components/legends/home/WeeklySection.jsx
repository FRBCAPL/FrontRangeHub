import React from 'react';
import { Link } from 'react-router-dom';
import { weekdayInTimeZone } from '../../../data/legendsSchedule.js';
import { orderWeeklyCards, runsTonight } from '../../../data/legendsWeekly.js';
import { MoreLink, SectionHeading } from '../LegendsUi.jsx';

export default function WeeklySection() {
  const weekday = weekdayInTimeZone(new Date());
  return (
    <section className="lg-section lg-section--weekly" aria-labelledby="weekly-heading">
      <SectionHeading id="weekly-heading" title="Legends Regulars" />
      <ul className="lg-grid lg-grid--3 lg-mt-6">
        {orderWeeklyCards(weekday).map((card) => {
          const tonight = runsTonight(card, weekday);
          return (
            <li key={card.key}>
              <Link to={card.to} className={`lg-card lg-card--link ${tonight ? 'lg-card--tonight' : ''}`}>
                <div className="lg-weekly__top">
                  <p className="lg-eyebrow lg-eyebrow--tight">{card.daysLabel}</p>
                  {tonight ? <span className="lg-tonight-tag">Tonight</span> : null}
                </div>
                <h3 className="lg-display lg-display--card lg-mt-2">{card.title}</h3>
                <p className="lg-card__copy lg-mt-3">{card.blurb}</p>
                <MoreLink />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
