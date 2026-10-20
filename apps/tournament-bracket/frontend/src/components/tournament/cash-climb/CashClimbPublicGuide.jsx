import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cashClimbNewPlayerGuide } from './cashClimbNewPlayerGuide.js';
import { cashClimbGuideHref } from './cashClimbGuideRoute.js';
import '../TournamentBracketApp.css';
import './CashClimbPublicGuide.css';

function lineClass(line) {
  if (/house rule/i.test(line)) return 'cc-guide-callout';
  if (/the climb/i.test(line)) return 'cc-guide-climb';
  if (/not the same/i.test(line)) return 'cc-guide-callout is-board';
  return '';
}

export default function CashClimbPublicGuide() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTv = searchParams.get('tv') === '1';
  const guide = cashClimbNewPlayerGuide();

  useEffect(() => {
    document.title = isTv ? 'How Cash Climb works — TV' : (guide.title || 'How Cash Climb works');
    if (!isTv) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [guide.title, isTv]);

  return (
    <div className={`cc-public-guide-shell${isTv ? ' is-tv' : ''}`}>
      <div className="cc-public-guide">
        <header className="cc-guide-hero">
          <p className="cc-guide-brand">Front Range Pool</p>
          <p className="cc-guide-kicker">Cash Climb</p>
          <h1>{guide.title}</h1>
          {guide.subtitle ? <p className="cc-guide-tagline">{guide.subtitle}</p> : null}
          <div className="cc-guide-chips">
            <span>Round robin</span>
            <span>3 losses out</span>
            <span>King of the Hill</span>
            <span>Winner stays</span>
            <span>CSI rules</span>
          </div>
        </header>

        <section className="cc-guide-stages" aria-label="Two stages">
          <article className="cc-guide-stage">
            <span className="cc-guide-stage-label">Stage 1</span>
            <h2>Round robin</h2>
            <p>Keep playing until you take 3 losses. Then you are out.</p>
            <p className="cc-guide-stage-meta">Usually 1 game</p>
          </article>
          <div className="cc-guide-stage-join" aria-hidden="true">
            <span>Then</span>
          </div>
          <article className="cc-guide-stage is-koh">
            <span className="cc-guide-stage-label">Stage 2</span>
            <h2>King of the Hill</h2>
            <p>Winner stays. 2 losses and you are out.</p>
            <p className="cc-guide-stage-meta">Usually race to 2</p>
          </article>
        </section>

        <div className="cc-guide-grid">
          {guide.sections.map((section) => (
            <article key={section.title} className="cc-guide-card">
              <h2>{section.title}</h2>
              {section.body.map((line) => (
                <p key={line} className={lineClass(line)}>{line}</p>
              ))}
            </article>
          ))}
        </div>

        {isTv ? null : (
          <footer className="cc-guide-foot">
            <p className="cc-guide-share">{cashClimbGuideHref()}</p>
            <button type="button" className="cc-guide-home" onClick={() => navigate('/')}>
              Back to home
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
