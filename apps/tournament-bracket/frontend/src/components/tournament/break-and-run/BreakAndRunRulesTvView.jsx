import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatMoney } from './breakAndRunEngine.js';
import {
  buildBreakAndRunPublicBoard,
  payoutRateTiles,
  resolveBreakAndRunDisplayEventId,
} from './breakAndRunDisplay.js';
import { USAPL_BREAK_AND_RUN_RULES, USAPL_BREAK_AND_RUN_TAGLINE } from './breakAndRunRules.js';
import { CALLED_BREAK_AND_RUN_RULES, CALLED_RULES_TAGLINE } from './breakAndRunCalledRules.js';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import Lines from './BreakAndRunRuleText.jsx';
import useBreakAndRunLive from './useBreakAndRunLive.js';
import './BreakAndRunTv.css';
import './BreakAndRunRulesTv.css';

const MIN_SCALE = 0.55;

/** Longer rules stay up longer: 12s base + reading time, capped at 40s. */
function dwellMs(rule) {
  const chars = `${rule?.title || ''} ${rule?.body || ''}`.length;
  return Math.min(40000, 12000 + chars * 45);
}

/** Shrinks the rule text until it fits the card (TVs vary a lot in size). */
function useFitScale(resetKey) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  const [resizeTick, setResizeTick] = useState(0);

  useLayoutEffect(() => {
    setScale(1);
  }, [resetKey, resizeTick]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight + 2 && scale > MIN_SCALE) {
      setScale((s) => Math.max(MIN_SCALE, Math.round((s - 0.05) * 100) / 100));
    }
  }, [scale, resetKey, resizeTick]);

  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return [ref, scale];
}

function QuickPanel({ board, tagline }) {
  return (
    <aside className="bnr-rtv-side" aria-label="Pot and values">
      {board ? (
        <section className="bnr-rtv-pot">
          <p className="bnr-tv-kicker">In the pot</p>
          <p className="bnr-rtv-pot-amount">{formatMoney(board.displayPot)}</p>
          <div className="bnr-rtv-rates">
            {payoutRateTiles(board).map((tile) => (
              <div key={tile.key} className={tile.highlight ? 'is-highlight' : undefined}>
                <span>{tile.label}</span>
                <strong>{formatMoney(tile.value)}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="bnr-rtv-tagline">
        <h2>The short version</h2>
        <p><Lines text={tagline} /></p>
      </section>
      <p className="bnr-rtv-entry">Entry is in person at the table</p>
    </aside>
  );
}

export default function BreakAndRunRulesTvView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId: routeId } = useParams();
  const eventId = resolveBreakAndRunDisplayEventId(routeId, location.pathname);
  const { tournament } = useBreakAndRunLive(eventId);
  const board = buildBreakAndRunPublicBoard(tournament);

  const flat = board?.payoutMode === 'flat';
  const rules = flat ? USAPL_BREAK_AND_RUN_RULES : CALLED_BREAK_AND_RUN_RULES;
  const tagline = flat ? USAPL_BREAK_AND_RUN_TAGLINE : CALLED_RULES_TAGLINE;

  const [index, setIndex] = useState(0);
  const safeIndex = rules.length ? index % rules.length : 0;
  const rule = rules[safeIndex];
  const [bodyRef, scale] = useFitScale(`${safeIndex}-${rules.length}`);

  const go = useCallback((delta) => {
    setIndex((i) => (i + delta + rules.length) % rules.length);
  }, [rules.length]);

  useEffect(() => {
    const timer = setTimeout(() => go(1), dwellMs(rule));
    return () => clearTimeout(timer);
  }, [safeIndex, rule, go]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const goBack = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    navigate('/tournament-bracket');
  };

  return (
    <div className="bnr-tv-shell">
      <div className="bnr-tv bnr-rtv">
        <header className="bnr-tv-header bnr-rtv-header">
          <BreakAndRunLogo size="header" className="bnr-tv-logo" />
          <div className="bnr-tv-title">
            <p className="bnr-tv-badge">Player rules</p>
            <h1>{board?.name || 'Front Range Pool League 10-Ball Break & Run'}</h1>
          </div>
          <div className="bnr-rtv-nav">
            <button type="button" className="bnr-tv-close" onClick={() => go(-1)} aria-label="Previous rule">‹ Prev</button>
            <button type="button" className="bnr-tv-close" onClick={() => go(1)} aria-label="Next rule">Next ›</button>
            <button type="button" className="bnr-tv-close" onClick={goBack}>Close</button>
          </div>
        </header>

        <div className="bnr-rtv-main">
          <section className="bnr-rtv-rule" aria-live="polite">
            <div className="bnr-rtv-rule-head">
              <span className="bnr-rtv-num">{safeIndex + 1}</span>
              <h2>{rule?.title}</h2>
            </div>
            <div
              ref={bodyRef}
              className="bnr-rtv-rule-body"
              style={{ '--bnr-rtv-scale': scale }}
              key={safeIndex}
            >
              <Lines text={rule?.body || ''} />
            </div>
          </section>
          <QuickPanel board={board} tagline={tagline} />
        </div>

        <footer className="bnr-rtv-footer">
          <ol className="bnr-rtv-dots" aria-label="Rules">
            {rules.map((r, i) => (
              <li key={r.title}>
                <button
                  type="button"
                  className={i === safeIndex ? 'is-current' : undefined}
                  onClick={() => setIndex(i)}
                  aria-label={`Rule ${i + 1}: ${r.title}`}
                />
              </li>
            ))}
          </ol>
          <span>Rule {safeIndex + 1} of {rules.length}</span>
        </footer>
      </div>
    </div>
  );
}
