import React from 'react';
import { ButtonLink, Eyebrow } from '../LegendsUi.jsx';

export default function RoomBand() {
  return (
    <section className="lg-room" aria-labelledby="room-heading">
      <div className="lg-room__inner">
        <div>
          <Eyebrow>The room</Eyebrow>
          <h2 id="room-heading" className="lg-display lg-display--section lg-mt-2">
            Built for pool.
          </h2>
          <p className="lg-copy lg-mt-4 lg-max-md">
            A pool hall and bar on Hancock Expressway in Colorado Springs. Tables, leagues, tournaments, karaoke, and a bar under one roof.
          </p>
          <div className="lg-actions lg-mt-6">
            <ButtonLink to="/legends/visit" variant="secondary">Plan your visit</ButtonLink>
            <ButtonLink to="/legends/events" variant="quiet">See events</ButtonLink>
          </div>
        </div>
        <figure className="lg-photo lg-photo--framed">
          <img src="/legends/venue-bar.jpg" alt="The bar, televisions, and pool tables at Legends" loading="lazy" />
        </figure>
      </div>
    </section>
  );
}
