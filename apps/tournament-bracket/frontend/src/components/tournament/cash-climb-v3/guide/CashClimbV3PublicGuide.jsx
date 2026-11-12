import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cashClimbV3Guide } from './cashClimbV3Guide.js';
import { cashClimbV3GuideHref } from './cashClimbV3GuideRoute.js';
import GuideFormatSwitch from '../../GuideFormatSwitch.jsx';
import GuideSections from '../../GuideSections.jsx';
import CashClimbV3Story from './CashClimbV3Story.jsx';
import '../../TournamentBracketApp.css';
import '../../cash-climb/CashClimbPublicGuide.css';

const lineClass = (line) => (/full entry fee back|pays the most/i.test(line) ? 'cc-guide-climb' : '');

/** Public "How Cash Climb works" page. `isTv` shows the short lines as a no-scroll projector board. */
export default function CashClimbV3PublicGuide({ isTv = false }) {
  const navigate = useNavigate();
  const guide = cashClimbV3Guide();

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
        {isTv ? null : <GuideFormatSwitch current="cash-climb-v3" />}
        <header className="cc-guide-hero">
          <p className="cc-guide-brand">Front Range Pool</p>
          <p className="cc-guide-kicker">Cash Climb</p>
          <h1>{guide.title}</h1>
          <p className="cc-guide-tagline">{guide.subtitle}</p>
          <div className="cc-guide-chips">{guide.chips.map((c) => <span key={c}>{c}</span>)}</div>
        </header>

        {isTv ? (
          <section className="cc-guide-stages" aria-label="Two steps">
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
        ) : null}

        {isTv ? (
          <div className="cc-guide-grid is-seven">
            {guide.sections.map((section) => (
              <article key={section.title} className="cc-guide-card">
                <h2>{section.title}</h2>
                {(section.tv || section.body).map((line) => <p key={line} className={lineClass(line)}>{line}</p>)}
              </article>
            ))}
          </div>
        ) : (
          <>
            <CashClimbV3Story story={guide.story} />
            <GuideSections
              journey={guide.journey}
              faq={guide.faq}
              details={guide.details}
              sections={guide.sections}
              rules={guide.rules}
              lineClass={lineClass}
            />
          </>
        )}

        {isTv ? null : (
          <footer className="cc-guide-foot">
            <p className="cc-guide-share">{cashClimbV3GuideHref()}</p>
            <button type="button" className="cc-guide-home" onClick={() => navigate('/')}>Back to home</button>
          </footer>
        )}
      </div>
    </div>
  );
}
