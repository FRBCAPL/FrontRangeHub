import React from 'react';
import { PageIntro } from '../LegendsUi.jsx';
import VisitFacts from '../VisitFacts.jsx';

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
