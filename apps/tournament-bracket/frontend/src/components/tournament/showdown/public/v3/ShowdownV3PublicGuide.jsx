import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showdownV3Guide } from './showdownV3Guide.js';
import { showdownGuideHref } from '../showdownGuideRoute.js';
import { SHOWDOWN_PUBLIC_HASH } from '../showdownPublicRoutes.js';
import '../../../TournamentBracketApp.css';
import '../../../cash-climb/CashClimbPublicGuide.css';

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

/** Public "How Showdown V3 works" page. `isTv` makes it a no-scroll board readable across a room. */
export default function ShowdownV3PublicGuide({ isTv = false }) {
  const navigate = useNavigate();
  const guide = showdownV3Guide();

  useEffect(() => {
    document.title = isTv ? `${guide.title} \u2014 TV` : guide.title;
    if (!isTv) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [guide.title, isTv]);

  return (
    <div className={`cc-public-guide-shell${isTv ? ' is-tv' : ''}`}>
      <div className="cc-public-guide">
        <header className="cc-guide-hero">
          <p className="cc-guide-brand">Front Range Pool</p>
          <p className="cc-guide-kicker">Cash Climb Showdown V3</p>
          <h1>{guide.title}</h1>
          <p className="cc-guide-tagline">{guide.subtitle}</p>
          <div className="cc-guide-chips">{guide.chips.map((c) => <span key={c}>{c}</span>)}</div>
        </header>

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
              {(isTv && section.tv ? section.tv : section.body).map((line) => <p key={line}>{line}</p>)}
            </article>
          ))}
          <FieldTable rows={guide.fieldTable} />
        </div>

        {isTv ? null : (
          <footer className="cc-guide-foot">
            <p className="cc-guide-share">{showdownGuideHref({ v3: true })}</p>
            <button type="button" className="cc-guide-home" onClick={() => navigate(SHOWDOWN_PUBLIC_HASH)}>Follow a Showdown</button>
            <button type="button" className="cc-guide-home" onClick={() => navigate('/')}>Back to home</button>
          </footer>
        )}
      </div>
    </div>
  );
}
