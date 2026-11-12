import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import useGuideModal from './useGuideModal.js';

/** The guide tour: one topic's full text, with previous/next through every topic. */
export default function GuideTopicModal({ section, index, count, onPrev, onNext, onClose, lineClass = () => '', renderLine = (line) => line }) {
  const onKey = useCallback((e) => {
    if (e.key === 'ArrowLeft' && index > 0) onPrev();
    else if (e.key === 'ArrowRight' && index < count - 1) onNext();
  }, [index, count, onPrev, onNext]);
  const closeRef = useGuideModal(onClose, onKey);

  return createPortal(
    <div className="tb-guide-modal-overlay" onClick={onClose}>
      <div
        className="tb-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tb-guide-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tb-guide-modal-head">
          {section.icon ? <span className="tb-guide-modal-icon" aria-hidden="true">{section.icon}</span> : null}
          <div className="tb-guide-modal-titles">
            <p className="tb-guide-modal-count">Tour {'\u00B7'} {index + 1} of {count}</p>
            <h2 id="tb-guide-modal-title">{section.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="tb-guide-modal-close" onClick={onClose} aria-label="Close">
            {'\u2715'}
          </button>
        </header>
        <div className="tb-guide-modal-body">
          {section.body.map((line) => <p key={line} className={lineClass(line)}>{renderLine(line)}</p>)}
        </div>
        <footer className="tb-guide-modal-foot">
          <button type="button" className="tb-guide-modal-nav" onClick={onPrev} disabled={index === 0}>
            {'\u2190'} Previous
          </button>
          <button type="button" className="tb-guide-modal-nav is-next" onClick={index < count - 1 ? onNext : onClose}>
            {index < count - 1 ? <>Next {'\u2192'}</> : 'Done'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
