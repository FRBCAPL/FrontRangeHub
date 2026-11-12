import React from 'react';
import { createPortal } from 'react-dom';
import useGuideModal from './useGuideModal.js';
import './GuideDetailModal.css';

function ExampleTable({ example }) {
  return (
    <div className="tb-detail-example">
      <p className="tb-detail-example-title">{example.title}</p>
      <table>
        {example.head ? (
          <thead><tr>{example.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        ) : null}
        <tbody>
          {example.rows.map((row) => (
            <tr key={row.join('|')}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {example.note ? <p className="tb-detail-example-note">{example.note}</p> : null}
    </div>
  );
}

function Ladder({ ladder }) {
  const max = Math.max(...ladder.bars.map((b) => b.amount));
  return (
    <div className="tb-detail-ladder">
      <p className="tb-detail-example-title">{ladder.title}</p>
      <div className="tb-detail-ladder-bars">
        {ladder.bars.map((b) => (
          <div key={b.label} className="tb-detail-ladder-col">
            <span className="tb-detail-ladder-amount">{b.display ?? `$${b.amount}`}</span>
            <span className="tb-detail-ladder-bar" style={{ height: `${Math.max(12, Math.round((b.amount / max) * 110))}px` }} />
            <span className="tb-detail-ladder-label">{b.label}</span>
          </div>
        ))}
      </div>
      {ladder.note ? <p className="tb-detail-example-note">{ladder.note}</p> : null}
    </div>
  );
}

/** One card's details: the short answer, the rules for that step, and a worked example when there is one. */
export default function GuideDetailModal({ detail, title, onClose, onReadTopic }) {
  const closeRef = useGuideModal(onClose);

  return createPortal(
    <div className="tb-guide-modal-overlay" onClick={onClose}>
      <div
        className="tb-guide-modal is-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tb-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tb-guide-modal-head">
          {detail.icon ? <span className="tb-guide-modal-icon" aria-hidden="true">{detail.icon}</span> : null}
          <div className="tb-guide-modal-titles">
            <h2 id="tb-detail-title">{title || detail.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="tb-guide-modal-close" onClick={onClose} aria-label="Close">
            {'\u2715'}
          </button>
        </header>
        <div className="tb-guide-modal-body">
          <p className={`tb-detail-lead${detail.center ? ' is-center' : ''}`}>{detail.lead}</p>
          {detail.points?.length ? (
            <ul className="tb-detail-points">
              {detail.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          ) : null}
          {detail.example ? <ExampleTable example={detail.example} /> : null}
          {detail.ladder ? <Ladder ladder={detail.ladder} /> : null}
        </div>
        <footer className="tb-guide-modal-foot">
          {detail.topic && onReadTopic ? (
            <button type="button" className="tb-guide-modal-nav" onClick={() => onReadTopic(detail.topic)}>
              Full rules: {detail.topic}
            </button>
          ) : <span />}
          <button type="button" className="tb-guide-modal-nav is-next" onClick={onClose}>Got it</button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
