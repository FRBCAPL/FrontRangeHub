import React from 'react';
import './cashClimbV3Story.css';

/** One player's night in dollars: the winning run on the left, what Sam takes home otherwise on the right. */
export default function CashClimbV3Story({ story }) {
  if (!story) return null;
  return (
    <section className="ccv3-story" aria-labelledby="ccv3-story-title">
      <header className="ccv3-story-head">
        <h2 id="ccv3-story-title">{story.title}</h2>
        <p>{story.setup}</p>
      </header>
      <div className="ccv3-story-cols">
        <div>
          <p className="ccv3-story-sub">If Sam keeps winning</p>
          <ol className="ccv3-story-run">
            {story.run.map((r) => (
              <li key={r.label}>
                <span>{r.label}</span>
                <strong>+${r.amount}</strong>
              </li>
            ))}
          </ol>
          <p className="ccv3-story-total">
            <span>Sam goes home with</span>
            <strong>${story.total}</strong>
          </p>
        </div>
        <div>
          <p className="ccv3-story-sub">If Sam loses along the way</p>
          <ul className="ccv3-story-ifs">
            {story.whatIf.map((r) => (
              <li key={r.label}>
                <span>{r.label}</span>
                <strong>${r.amount}</strong>
              </li>
            ))}
          </ul>
          <p className="ccv3-story-keep">Whatever happens, Sam keeps every dollar already won.</p>
        </div>
      </div>
      <p className="ccv3-story-note">{story.note}</p>
    </section>
  );
}
