import React from 'react';
import { venueDateLabel } from '../../../services/legendsClock.js';
import TodayCard from '../today/TodayCard.jsx';

export default function HomeHero() {
  return (
    <section className="lg-hero">
      {/* On wide screens the photo keeps its 3:2 shape at full width, so vw offsets track the hanging lights. */}
      <div className="lg-hero__media">
        <div className="lg-hero__photo">
          <img src="/legends/venue-tables.jpg" alt="Blue pool tables lined up under the lights at Legends Brews & Cues" />
        </div>
        <div className="lg-hero__shade" />
        <div className="lg-hero__shade-top" />
        <div className="lg-hero__shade-bottom" />
      </div>
      <div className="lg-hero__inner">
        <div className="lg-hero__title">
          <p className="lg-hero__city">Colorado Springs</p>
          <h1 className="lg-display lg-hero__headline">Where legends play.</h1>
        </div>
        <div className="lg-hero__tonight">
          <h2 id="happening-heading" className="lg-display lg-display--section lg-glow">
            Tonight at Legends
          </h2>
          <p className="lg-hero__date lg-glow">{venueDateLabel(new Date())}</p>
        </div>
        {/* Card bottom is the photo's bottom edge; a taller card makes the photo taller. */}
        <div className="lg-hero__card" aria-labelledby="happening-heading">
          <TodayCard />
        </div>
      </div>
    </section>
  );
}
