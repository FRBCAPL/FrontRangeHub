import React from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { HOME_SELL_PITCH } from '../../data/consignmentHowItWorks.js';

/** Home page banner while the shop is still filling up: recruit sellers without pushing the new items far down. */
export default function ConsignmentHomeSellPitch() {
  return (
    <section className="cs-home-pitch" aria-labelledby="cs-home-pitch-title">
      <div className="cs-home-pitch-text">
        <h2 id="cs-home-pitch-title">{HOME_SELL_PITCH.title}</h2>
        <p className="cs-home-pitch-lede">{HOME_SELL_PITCH.lede}</p>
        <ul className="cs-home-pitch-points">
          {HOME_SELL_PITCH.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>
      <Link className="cs-btn cs-home-pitch-cta" to={`${CONSIGNMENT_PATH}/sell`}>{HOME_SELL_PITCH.cta}</Link>
    </section>
  );
}
