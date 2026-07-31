import React, { useMemo } from 'react';
import { buildDisclosureTimeline } from '@shared/utils/estateDisclosureTimeline.js';

/**
 * Family-facing staged disclosure timeline.
 * Explains where the estate is and why final accounting may not be ready yet.
 */
const HeirDisclosureTimeline = ({
  settings = {},
  items = [],
  distributions = []
}) => {
  const timeline = useMemo(
    () => buildDisclosureTimeline({ settings, items, distributions }),
    [settings, items, distributions]
  );

  if (!settings?.case_number && !settings?.id && !(items || []).length) return null;

  return (
    <section className="ei-disclosure-timeline" aria-labelledby="ei-disclosure-title">
      <div className="ei-accounts-section-head">
        <div>
          <h3 id="ei-disclosure-title">Disclosure timeline</h3>
          <p className="ei-settings-hint">
            Staged transparency — what has been disclosed and what still waits on the estate
            process.
          </p>
        </div>
      </div>

      <div className="ei-disclosure-why" role="status">
        <strong>Why final numbers may not appear yet</strong>
        <span>{timeline.whyNotFinal}</span>
      </div>

      <ol className="ei-disclosure-list">
        {timeline.events.map((event) => (
          <li key={event.key} className={`ei-disclosure-item is-${event.status}`}>
            <div className="ei-disclosure-when">{event.dateLabel || '—'}</div>
            <div>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default HeirDisclosureTimeline;
