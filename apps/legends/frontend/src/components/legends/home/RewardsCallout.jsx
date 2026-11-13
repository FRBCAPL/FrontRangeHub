import React from 'react';
import { ButtonLink, Eyebrow } from '../LegendsUi.jsx';

export default function RewardsCallout() {
  return (
    <section className="lg-section" aria-labelledby="rewards-heading">
      <div className="lg-rewards">
        <div>
          <Eyebrow>Free membership</Eyebrow>
          <h2 id="rewards-heading" className="lg-display lg-display--section lg-mt-2">
            Legends Rewards
          </h2>
          <p className="lg-copy lg-mt-3 lg-max-xl">
            Join free with an email, a mobile number, or both. Members will be able to earn points, unlock achievements, and open member benefits. Rates and rewards will be posted when they launch.
          </p>
        </div>
        <ButtonLink to="/legends/rewards" size="lg">See Rewards</ButtonLink>
      </div>
    </section>
  );
}
