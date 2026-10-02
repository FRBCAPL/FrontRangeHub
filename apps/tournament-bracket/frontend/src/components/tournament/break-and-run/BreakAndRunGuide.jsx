import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadOpenBreakAndRunPotSummary } from './breakAndRunCloud.js';
import { breakAndRunPhoneHash, buildBreakAndRunPublicBoard, payoutRateTiles } from './breakAndRunDisplay.js';
import {
  CALLED_BREAK_AND_RUN_FOOTER,
  CALLED_BREAK_AND_RUN_RULES,
} from './breakAndRunCalledRules.js';
import {
  GUIDE_QUICK_ANSWERS,
  breakAndRunGuideHref,
  formatDollars as formatMoney,
  guideExamples,
  guideSteps,
} from './breakAndRunGuide.js';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import Lines from './BreakAndRunRuleText.jsx';
import useBreakAndRunLiveNow from './useBreakAndRunLiveNow.js';
import './BreakAndRunGuide.css';

const REFRESH_MS = 60000;

function useLiveBoard() {
  const [tournament, setTournament] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.hidden) return;
      loadOpenBreakAndRunPotSummary()
        .then((pot) => { if (!cancelled) setTournament(pot); })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);
  const liveNow = useBreakAndRunLiveNow(tournament);
  return tournament ? buildBreakAndRunPublicBoard(tournament, { liveNow }) : null;
}

function ShareButton() {
  const [note, setNote] = useState('');
  const share = async () => {
    const url = breakAndRunGuideHref();
    try {
      if (navigator.share) {
        await navigator.share({ title: '10-Ball Break & Run', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote('Link copied');
    } catch {
      setNote(url);
    }
  };
  return (
    <button type="button" className="bnr-guide-btn" onClick={share}>
      {note || 'Share this page'}
    </button>
  );
}

function LivePot({ board, onWatch }) {
  return (
    <section className="bnr-guide-live" aria-label="Current pot">
      <div className="bnr-guide-live-head">
        <span className={`bnr-guide-status${board.sessionOpen ? ' is-live' : ''}`}>
          {board.sessionOpen ? 'Live now' : 'Pot carries to next session'}
        </span>
        {board.sessionOpen && board.sessionVenue ? <span>at {board.sessionVenue}</span> : null}
      </div>
      <p className="bnr-guide-kicker">In the pot right now</p>
      <p className="bnr-guide-pot">{formatMoney(board.displayPot)}</p>
      <div className="bnr-guide-rates">
        {payoutRateTiles(board).map((tile) => (
          <div key={tile.key} className={tile.highlight ? 'is-highlight' : undefined}>
            <span>{tile.label}</span>
            <strong>{formatMoney(tile.value)}</strong>
          </div>
        ))}
      </div>
      {board.sessionOpen ? (
        <button type="button" className="bnr-guide-btn is-primary" onClick={onWatch}>
          Watch it live
        </button>
      ) : null}
    </section>
  );
}

export default function BreakAndRunGuide() {
  const navigate = useNavigate();
  const board = useLiveBoard();
  const examples = guideExamples(board?.payoutMode === 'called-ball' ? board.displayPot : undefined);
  const steps = guideSteps({
    memberFee: board?.memberFee ?? 10,
    openFee: board?.openFee ?? 20,
    perBall: examples.perBall,
    luckyBall: examples.luckyBall,
  });

  useEffect(() => {
    document.title = 'How the 10-Ball Break & Run works';
  }, []);

  const watchLive = () => board?.id && navigate(breakAndRunPhoneHash(board.id));
  const scrollToRules = () => document.getElementById('bnr-guide-rules')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="bnr-guide-shell">
      <div className="bnr-guide">
        <div className="bnr-guide-bar" role="group" aria-label="Page navigation">
          <button type="button" onClick={() => navigate('/')}>Home</button>
        </div>
        <header className="bnr-guide-hero">
          <BreakAndRunLogo size="header" className="bnr-guide-logo" />
          <p className="bnr-guide-kicker">Front Range Pool League</p>
          <h1>10-Ball Break &amp; Run</h1>
          <p className="bnr-guide-tagline">One rack. One growing pot. Run out and it’s all yours.</p>
          <div className="bnr-guide-chips">
            <span>{formatMoney(board?.memberFee ?? 10)} members · {formatMoney(board?.openFee ?? 20)} open</span>
            <span>Called shots</span>
            <span>Cash out anytime</span>
            <span>Final 10 wins the pot</span>
          </div>
          <div className="bnr-guide-actions">
            <button type="button" className="bnr-guide-btn" onClick={scrollToRules}>Official rules</button>
            <ShareButton />
          </div>
        </header>

        {board ? <LivePot board={board} onWatch={watchLive} /> : null}

        <section className="bnr-guide-section" aria-labelledby="bnr-guide-steps-title">
          <h2 id="bnr-guide-steps-title">How it works</h2>
          <ol className="bnr-guide-steps">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="bnr-guide-step-num" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bnr-guide-section" aria-labelledby="bnr-guide-values-title">
          <h2 id="bnr-guide-values-title">What each ball pays</h2>
          <p className="bnr-guide-note">
            Values are locked at the start of each attempt and grow with the pot.
            {board ? ' These use the pot right now.' : ` Shown here with a ${formatMoney(examples.pot)} pot.`}
          </p>
          <div className="bnr-guide-values">
            <div>
              <span>Called ball</span>
              <strong>{formatMoney(examples.perBall)}</strong>
              <small>Pot ÷ 10</small>
            </div>
            <div>
              <span>Break / lucky ball</span>
              <strong>{formatMoney(examples.luckyBall)}</strong>
              <small>25% of a called ball · $5–$20</small>
            </div>
            <div>
              <span>Early 10</span>
              <strong>Bank + 25%</strong>
              <small>of what’s left in the pot</small>
            </div>
            <div className="is-highlight">
              <span>Final 10</span>
              <strong>{formatMoney(examples.pot)}</strong>
              <small>The whole pot</small>
            </div>
          </div>
        </section>

        <section className="bnr-guide-section" aria-labelledby="bnr-guide-examples-title">
          <h2 id="bnr-guide-examples-title">Examples · {formatMoney(examples.pot)} pot</h2>
          <div className="bnr-guide-examples">
            {examples.items.map((item) => (
              <article key={item.title} className={`bnr-guide-example is-${item.tone}`}>
                <h3>{item.title}</h3>
                <p>{item.setup}</p>
                {item.bonus > 0 ? (
                  <p className="bnr-guide-example-math">
                    {formatMoney(item.bank)} bank + {formatMoney(item.bonus)} bonus
                  </p>
                ) : null}
                <p className="bnr-guide-example-result">
                  {item.payout > 0 ? `Takes home ${formatMoney(item.payout)}` : 'Takes home $0 — can rebuy'}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bnr-guide-section" aria-labelledby="bnr-guide-faq-title">
          <h2 id="bnr-guide-faq-title">Quick answers</h2>
          <dl className="bnr-guide-faq">
            {GUIDE_QUICK_ANSWERS.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="bnr-guide-rules" className="bnr-guide-section" aria-labelledby="bnr-guide-rules-title">
          <h2 id="bnr-guide-rules-title">Official rules</h2>
          <p className="bnr-guide-note">Tap a rule to read it.</p>
          <div className="bnr-guide-rules">
            {CALLED_BREAK_AND_RUN_RULES.map((rule, i) => (
              <details key={rule.title}>
                <summary>
                  <span className="bnr-guide-rule-num">{i + 1}</span>
                  {rule.title}
                </summary>
                <div className="bnr-guide-rule-body"><Lines text={rule.body} /></div>
              </details>
            ))}
          </div>
          <p className="bnr-guide-note">{CALLED_BREAK_AND_RUN_FOOTER}</p>
        </section>

        <footer className="bnr-guide-foot">
          <p className="bnr-guide-share">{breakAndRunGuideHref()}</p>
          <div className="bnr-guide-actions">
            {board?.sessionOpen ? (
              <button type="button" className="bnr-guide-btn is-primary" onClick={watchLive}>Watch it live</button>
            ) : null}
            <button type="button" className="bnr-guide-btn" onClick={() => navigate('/')}>Back to home</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
