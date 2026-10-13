import React from 'react';
import './HomeDuezyBanner.css';

const POINTS = ['One tap per team', 'Who owes, at a glance', 'Group-chat reminders', 'Bookkeeping reports'];

/** Full-width Duezy strip between the featured cards and the smaller launcher sections. */
export default function HomeDuezyBanner({ onOpen, onWhatIs }) {
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn(e);
  };
  return (
    <section
      className="hdz"
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      role="button"
      tabIndex={0}
      aria-label="Open Duezy"
    >
      <div className="hdz-brand">
        <span className="hdz-icon" aria-hidden="true">💰</span>
        <div>
          <h3 className="hdz-title">Duezy</h3>
          <span className="hdz-eyebrow">Dues Made Easy<br />For Any & All League</span>
        </div>
      </div>
      <div className="hdz-body">
        <p className="hdz-pitch">League dues, without the spreadsheet.</p>
        <p className="hdz-sports">Pool, darts, bowling, cornhole, softball, trivia — any league that collects dues.</p>
        <ul className="hdz-points">
          {POINTS.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>
      <div className="hdz-actions">
        <button type="button" className="hdz-btn hdz-btn--ghost" onClick={stop(onWhatIs)}>What is it?</button>
        <button type="button" className="hdz-btn hdz-btn--primary" onClick={stop(onOpen)}>Try it free →</button>
      </div>
    </section>
  );
}
