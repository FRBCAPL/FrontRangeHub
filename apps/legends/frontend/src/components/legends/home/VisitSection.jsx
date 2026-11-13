import React from 'react';
import VisitFacts from '../VisitFacts.jsx';
import { SectionHeading } from '../LegendsUi.jsx';

export default function VisitSection() {
  return (
    <section className="lg-section lg-section--last" aria-labelledby="visit-heading">
      <div className="lg-visit-card">
        <SectionHeading id="visit-heading" eyebrow="Colorado Springs" title="Visit Legends" />
        <VisitFacts />
      </div>
    </section>
  );
}
