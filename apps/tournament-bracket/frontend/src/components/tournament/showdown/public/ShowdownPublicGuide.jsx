import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showdownNewPlayerGuide } from '../showdownNewPlayerGuide.js';
import { showdownGuideHref } from './showdownGuideRoute.js';
import { SHOWDOWN_PUBLIC_HASH } from './showdownPublicRoutes.js';
import GuideFormatSwitch from '../../GuideFormatSwitch.jsx';
import '../../TournamentBracketApp.css';
import '../../cash-climb/CashClimbPublicGuide.css';

function FieldTable({ rows }) {
  return (
    <article className="cc-guide-card">
      <h2>Who makes the playoffs</h2>
      <table className="cc-guide-table">
        <thead>
          <tr><th>Players</th><th>Qualify</th><th>Byes</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.entrants}><td>{r.entrants}</td><td>{r.qualifiers}</td><td>{r.byes || '\u2013'}</td></tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

/** Public "How Cash Climb Showdown works" page. `tv` makes it a no-scroll projector board. */
export default function ShowdownPublicGuide({ isTv = false }) {
  const navigate = useNavigate();
  const guide = showdownNewPlayerGuide();

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
        {isTv ? null : <GuideFormatSwitch current="showdown" />}
        <header className="cc-guide-hero">
          <p className="cc-guide-brand">Front Range Pool</p>
          <p className="cc-guide-kicker">Cash Climb Showdown</p>
          <h1>{guide.title}</h1>
          <p className="cc-guide-tagline">{guide.subtitle}</p>
          <div className="cc-guide-chips">
            <span>2 qualifying matches</span>
            <span>Playoff bracket</span>
            <span>Top seeds get byes</span>
            <span>Every match win pays</span>
          </div>
        </header>

        <section className="cc-guide-stages" aria-label="Two stages">
          <article className="cc-guide-stage">
            <span className="cc-guide-stage-label">Stage 1</span>
            <h2>Qualifying</h2>
            <p>Play the two players next to you in the circle. Every win pays.</p>
            <p className="cc-guide-stage-meta">Race to {guide.qualifyingRaceTo} games</p>
          </article>
          <div className="cc-guide-stage-join" aria-hidden="true">
            <span>Then</span>
          </div>
          <article className="cc-guide-stage is-koh">
            <span className="cc-guide-stage-label">Stage 2</span>
            <h2>Playoffs</h2>
            <p>The top of the standings play single elimination for the rest of the pool.</p>
            <p className="cc-guide-stage-meta">Race to {guide.playoffRaceTo} games</p>
          </article>
        </section>

        <div className="cc-guide-grid is-seven">
          {guide.sections.map((section) => (
            <article key={section.title} className="cc-guide-card">
              <h2>{section.title}</h2>
              {(isTv && section.tv ? section.tv : section.body).map((line) => (
                <p key={line} className={/not the same/i.test(line) ? 'cc-guide-callout is-board' : ''}>{line}</p>
              ))}
            </article>
          ))}
          <FieldTable rows={guide.fieldTable} />
        </div>

        {isTv ? null : (
          <footer className="cc-guide-foot">
            <p className="cc-guide-share">{showdownGuideHref()}</p>
            <button type="button" className="cc-guide-home" onClick={() => navigate(SHOWDOWN_PUBLIC_HASH)}>
              Follow a Showdown
            </button>
            <button type="button" className="cc-guide-home" onClick={() => navigate('/')}>
              Back to home
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
