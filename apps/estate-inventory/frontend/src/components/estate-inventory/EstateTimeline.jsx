import React, { useMemo } from 'react';
import { buildEstateTimeline } from '@shared/utils/estateTimeline.js';

/**
 * "Where am I in the process?" checklist for the executor. Read-only and
 * derived entirely from settings + counts — it never writes anything.
 */
const EstateTimeline = ({ settings, inventoryCount = 0, hasAuctionActivity = false }) => {
  const { steps, completedCount, totalCount } = useMemo(
    () => buildEstateTimeline({ settings: settings || {}, inventoryCount, hasAuctionActivity }),
    [settings, inventoryCount, hasAuctionActivity]
  );

  return (
    <section className="ei-timeline" aria-label="Estate progress">
      <div className="ei-timeline-head">
        <h3>Estate progress</h3>
        <span className="ei-timeline-progress">
          {completedCount} of {totalCount} milestones
        </span>
      </div>
      <ol className="ei-timeline-list">
        {steps.map((step) => (
          <li key={step.key} className={`ei-timeline-step is-${step.status}`}>
            <div className="ei-timeline-marker" aria-hidden="true">
              <span className="ei-timeline-dot">{step.status === 'done' ? '\u2713' : ''}</span>
            </div>
            <div className="ei-timeline-body">
              <span className="ei-timeline-title">{step.title}</span>
              {step.note ? <span className="ei-timeline-note">{step.note}</span> : null}
              {step.status === 'active' ? (
                <span className="ei-timeline-badge">You are here</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default EstateTimeline;
