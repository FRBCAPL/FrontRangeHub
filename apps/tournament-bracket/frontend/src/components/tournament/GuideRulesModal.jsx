import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useGuideModal from './useGuideModal.js';
import './GuideRulesModal.css';

const sectionId = (i) => `tb-rules-section-${i}`;

/** Every rule in one scrollable modal, with a contents bar that jumps to each section. */
export default function GuideRulesModal({
  rules, title = 'Full rules', startAt, onClose, lineClass = () => '', renderLine = (line) => line,
}) {
  const closeRef = useGuideModal(onClose);
  const bodyRef = useRef(null);

  const jumpTo = useCallback((i, smooth = true) => {
    const body = bodyRef.current;
    const el = body?.querySelector(`#${sectionId(i)}`);
    if (body && el) body.scrollTo({ top: el.offsetTop - 8, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    const i = rules.findIndex((s) => s.title === startAt);
    if (i > 0) jumpTo(i, false);
  }, [rules, startAt, jumpTo]);

  return createPortal(
    <div className="tb-guide-modal-overlay" onClick={onClose}>
      <div
        className="tb-guide-modal tb-rules-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tb-rules-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tb-guide-modal-head">
          <span className="tb-guide-modal-icon" aria-hidden="true">{'\u{1F4D6}'}</span>
          <div className="tb-guide-modal-titles">
            <h2 id="tb-rules-title">{title}</h2>
          </div>
          <button ref={closeRef} type="button" className="tb-guide-modal-close" onClick={onClose} aria-label="Close">
            {'\u2715'}
          </button>
        </header>
        <nav className="tb-rules-contents" aria-label="Rules contents">
          {rules.map((s, i) => (
            <button key={s.title} type="button" onClick={() => jumpTo(i)}>
              {s.icon ? <span aria-hidden="true">{s.icon} </span> : null}{s.title}
            </button>
          ))}
        </nav>
        <div ref={bodyRef} className="tb-guide-modal-body tb-rules-body" tabIndex={-1}>
          {rules.map((s, i) => (
            <section key={s.title} id={sectionId(i)} className="tb-rules-section" aria-labelledby={`${sectionId(i)}-title`}>
              <h3 id={`${sectionId(i)}-title`}>
                <span className="tb-rules-num">{i + 1}</span>
                {s.icon ? <span aria-hidden="true">{s.icon}</span> : null}
                <span>{s.title}</span>
              </h3>
              {s.body.map((line) => <p key={line} className={lineClass(line)}>{renderLine(line)}</p>)}
            </section>
          ))}
        </div>
        <footer className="tb-guide-modal-foot">
          <button type="button" className="tb-guide-modal-nav" onClick={() => jumpTo(0)}>
            {'\u2191'} Back to top
          </button>
          <button type="button" className="tb-guide-modal-nav is-next" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
