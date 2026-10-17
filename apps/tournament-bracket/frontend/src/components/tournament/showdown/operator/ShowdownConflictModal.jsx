import React from 'react';
import { STATUS_LABELS } from './showdownView.js';

function Summary({ title, state, version }) {
  if (!state) return <div className="sd-conflict-copy"><h4>{title}</h4><p className="sd-note">Not available.</p></div>;
  const done = (state.matches || []).filter((m) => m.status === 'completed').length;
  const last = (state.audit || [])[state.audit.length - 1];
  return (
    <div className="sd-conflict-copy">
      <h4>{title}</h4>
      <p>{STATUS_LABELS[state.status] || state.status}{version ? ` \u00b7 cloud version ${version}` : ''}</p>
      <p>{done} of {(state.matches || []).length} matches finished</p>
      <p className="sd-note">Last change: {last ? `${last.action} at ${new Date(last.at).toLocaleTimeString()}` : 'none'}</p>
    </div>
  );
}

/** Two copies disagree. The operator picks one; the other is kept under conflict copies. */
export default function ShowdownConflictModal({ conflict, onChoose, onClose }) {
  if (!conflict) return null;
  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onClose}>
      <div className="cc-modal sd-score-modal" role="dialog" aria-modal="true" aria-labelledby="sd-conflict-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-conflict-title">This event was changed on another device</h2>
        <p className="sd-warn">The cloud has a different copy from this tablet. Pick the copy to keep running. The other copy is not deleted; it is kept on this tablet under conflict copies.</p>
        <div className="sd-conflict-grid">
          <Summary title="This tablet" state={conflict.local} />
          <Summary title="Cloud" state={conflict.cloud?.payload} version={conflict.cloud?.version} />
        </div>
        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onClose}>Decide later</button>
          <button type="button" className="sd-btn" disabled={!conflict.cloud?.payload} onClick={() => onChoose('cloud')}>Use the cloud copy</button>
          <button type="button" className="sd-btn sd-btn-primary" onClick={() => onChoose('tablet')}>Keep this tablet&rsquo;s copy</button>
        </div>
      </div>
    </div>
  );
}
