import React from 'react';
import GuideSections from '../../../GuideSections.jsx';

function FieldTable({ rows }) {
  return (
    <article className="cc-guide-card">
      <h2>Who makes the playoffs</h2>
      <table className="cc-guide-table">
        <thead><tr><th>Players</th><th>Qualify</th><th>Byes</th></tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r.entrants}><td>{r.entrants}</td><td>{r.qualifiers}</td><td>{r.byes || '\u2013'}</td></tr>)}
        </tbody>
      </table>
    </article>
  );
}

const lineClass = (line) => (/not the same/i.test(line) ? 'cc-guide-callout is-board' : '');

/**
 * One payout version's explanation. Guides with card details (V3 on a phone or tablet) use the step-by-step
 * layout; the TV board and older versions keep the stages and the card grid.
 */
export default function ShowdownGuideBody({ guide, isTv = false }) {
  const hero = (
    <header className="cc-guide-hero">
      <p className="cc-guide-brand">Front Range Pool</p>
      <p className="cc-guide-kicker">{guide.kicker || `Cash Climb Showdown ${guide.code}`}</p>
      <h1>{guide.title}</h1>
      <p className="cc-guide-tagline">{guide.subtitle}</p>
      <div className="cc-guide-chips">{guide.chips.map((c) => <span key={c}>{c}</span>)}</div>
    </header>
  );
  if (guide.details && !isTv) {
    return (
      <>
        {hero}
        <GuideSections journey={guide.journey} faq={guide.faq} details={guide.details} sections={guide.sections} lineClass={lineClass} />
        <div className="sd-guide-field">
          <FieldTable rows={guide.fieldTable} />
        </div>
      </>
    );
  }
  return (
    <>
      {hero}

      <section className="cc-guide-stages" aria-label="Two stages">
        {guide.stages.map((st, i) => (
          <React.Fragment key={st.title}>
            {i ? <div className="cc-guide-stage-join" aria-hidden="true"><span>Then</span></div> : null}
            <article className={`cc-guide-stage${i ? ' is-koh' : ''}`}>
              <span className="cc-guide-stage-label">{st.label}</span>
              <h2>{st.title}</h2>
              <p>{st.text}</p>
              <p className="cc-guide-stage-meta">{st.meta}</p>
            </article>
          </React.Fragment>
        ))}
      </section>

      <div className="cc-guide-grid is-seven">
        {guide.sections.map((section) => (
          <article key={section.title} className="cc-guide-card">
            <h2>{section.title}</h2>
            {(isTv && section.tv ? section.tv : section.body).map((line) => <p key={line} className={lineClass(line)}>{line}</p>)}
          </article>
        ))}
        <FieldTable rows={guide.fieldTable} />
      </div>
    </>
  );
}
