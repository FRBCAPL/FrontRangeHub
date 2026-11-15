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
            Join free with an email or mobile number — or use your hub login. You get an independent Legends membership and digital card. Points and rewards post here when Legends turns them on.
          </p>
        </div>
        <ButtonLink to="/legends/my?rewards=1" size="lg">My Legends Rewards</ButtonLink>
      </div>
    </section>
  );
}
