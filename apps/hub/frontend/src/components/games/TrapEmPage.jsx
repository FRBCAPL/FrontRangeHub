import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as T from './trapEmContent.js';
import './TrapEmPage.css';
import TrapEmTableCard from './TrapEmTableCard.jsx';

/** Renders *text* as a gold highlight. */
function Highlight({ text }) {
  return String(text || '').split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part));
}

function ShareButton() {
  const [note, setNote] = useState('');
  const share = async () => {
    const url = T.trapEmHref();
    try {
      if (navigator.share) {
        await navigator.share({ title: `${T.TRAP_EM_TITLE} · 8-Ball`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote('Link copied');
    } catch {
      setNote(url);
    }
  };
  return (
    <button type="button" className="trapem-btn" onClick={share}>
      {note || 'Share this page'}
    </button>
  );
}

function PrintCardButton() {
  return (
    <button type="button" className="trapem-btn" onClick={() => window.print()}>
      Print table card
    </button>
  );
}

export default function TrapEmPage() {
  const navigate = useNavigate();
  const { search } = useLocation();

  // ?section=how|rules|strategy|win|format jumps to that heading (homepage shortcuts).
  useEffect(() => {
    const section = new URLSearchParams(search).get('section');
    if (!section) return undefined;
    const timer = setTimeout(() => {
      document.getElementById(`trapem-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${T.TRAP_EM_TITLE} · ${T.TRAP_EM_SUBTITLE}`;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="trapem-shell">
      <div className="trapem">
        <div className="trapem-bar" role="group" aria-label="Page navigation">
          <button type="button" onClick={() => navigate('/')}>Home</button>
        </div>

        <header className="trapem-hero">
          <div className="trapem-ball" aria-hidden="true"><span>8</span></div>
          <h1>{T.TRAP_EM_TITLE}</h1>
          <p className="trapem-sub">{T.TRAP_EM_SUBTITLE}</p>
          <p className="trapem-tagline">{T.TRAP_EM_TAGLINE}</p>
          <div className="trapem-actions">
            <ShareButton />
            <PrintCardButton />
          </div>
        </header>

        <section className="trapem-section">
          <p className="trapem-lead">{T.TRAP_EM_INTRO}</p>
        </section>

        <section className="trapem-section" aria-labelledby="trapem-how">
          <h2 id="trapem-how">{T.TRAP_EM_HOW_TITLE}</h2>
          <p className="trapem-note">{T.TRAP_EM_HOW_INTRO}</p>
          <blockquote className="trapem-rule">{T.TRAP_EM_CORE_RULE}</blockquote>
          <p className="trapem-note trapem-exception">{T.TRAP_EM_INNING_NOTE}</p>
          <p className="trapem-note trapem-exception">{T.TRAP_EM_CORE_EXCEPTION}</p>
          <div className="trapem-outcomes">
            {T.TRAP_EM_OUTCOMES.map((o) => (
              <div key={o.result} className={`trapem-outcome is-${o.tone}`}>
                <strong>{o.result}</strong>
                <span>{o.then}</span>
              </div>
            ))}
          </div>
          <p className="trapem-note">{T.TRAP_EM_HOW_OUTRO}</p>
        </section>

        <section className="trapem-section" aria-labelledby="trapem-rules">
          <h2 id="trapem-rules">{T.TRAP_EM_RULES_TITLE}</h2>
          <p className="trapem-note">{T.TRAP_EM_RULES_INTRO}</p>
          <div className="trapem-rules">
            {T.TRAP_EM_RULES.map((r, i) => (
              <details key={r.title}>
                <summary>
                  <span className="trapem-rule-num">{i + 1}</span>
                  {r.title}
                </summary>
                <p className="trapem-rule-body">{r.body}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="trapem-section" aria-labelledby="trapem-strategy">
          <h2 id="trapem-strategy">{T.TRAP_EM_STRATEGY_TITLE}</h2>
          <p>{T.TRAP_EM_STRATEGY_INTRO}</p>
          <div className="trapem-question">
            <p className="trapem-question-old">{T.TRAP_EM_OLD_QUESTION}</p>
            <p className="trapem-question-new"><Highlight text={T.TRAP_EM_NEW_QUESTION} /></p>
          </div>
          <ul className="trapem-tips">
            {T.TRAP_EM_STRATEGY_TIPS.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </section>

        <section className="trapem-section" aria-labelledby="trapem-win">
          <h2 id="trapem-win">{T.TRAP_EM_WIN_TITLE}</h2>
          <p>{T.TRAP_EM_WIN_BODY}</p>
          <div className="trapem-loss">
            <strong>{T.TRAP_EM_LOSS_TITLE}</strong>
            <ul>
              {T.TRAP_EM_LOSS.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <p className="trapem-note">{T.TRAP_EM_WIN_NOTE}</p>
        </section>

        <section className="trapem-section" aria-labelledby="trapem-format">
          <h2 id="trapem-format">{T.TRAP_EM_FORMAT_TITLE}</h2>
          <dl className="trapem-format">
            {T.TRAP_EM_FORMAT.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="trapem-actions">
            <PrintCardButton />
          </div>
        </section>

        <section className="trapem-remember" aria-label={T.TRAP_EM_REMEMBER_KICKER}>
          <p className="trapem-kicker">{T.TRAP_EM_REMEMBER_KICKER}</p>
          <p className="trapem-big">{T.TRAP_EM_REMEMBER_BIG}</p>
          <p className="trapem-motto">{T.TRAP_EM_REMEMBER_MOTTO}</p>
        </section>

        <footer className="trapem-foot">
          <p className="trapem-share">{T.trapEmHref()}</p>
          <div className="trapem-actions">
            <ShareButton />
            <PrintCardButton />
            <button type="button" className="trapem-btn" onClick={() => navigate('/')}>Back to home</button>
          </div>
        </footer>
      </div>
      <TrapEmTableCard />
    </div>
  );
}
