import React from 'react';
import { showdownPublicHref, openShowdownTv } from '../public/showdownPublicRoutes.js';

const LABELS = {
  idle: 'Checking the cloud\u2026',
  saving: 'Saving to the cloud\u2026',
  saved: 'Saved to the cloud',
  offline: 'Not saved to the cloud yet',
  error: 'Cloud save problem',
  'local-only': 'Saved on this tablet only',
  conflict: 'Two different copies of this event',
  missing: 'Cloud copy removed',
};

function when(at) {
  const d = new Date(at || '');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Cloud save status, retry, and the public / TV links for this event. */
export default function ShowdownCloudBar({ eventId, status, sync, onRetry, onReupload, onOpenConflict }) {
  const s = sync.status;
  const bad = ['offline', 'error', 'conflict', 'missing'].includes(s);
  const live = status !== 'setup';
  return (
    <div className={`sd-cloud-bar is-${s}`} role={bad ? 'alert' : 'status'}>
      <span className="sd-cloud-state">
        <strong>{LABELS[s] || s}</strong>
        {s === 'saved' && sync.savedAt ? ` \u00b7 ${when(sync.savedAt)}` : ''}
        {sync.message ? <small> {sync.message}</small> : null}
      </span>
      <span className="sd-btn-row">
        {s === 'offline' || s === 'error' ? <button type="button" className="sd-btn" onClick={onRetry}>Retry now</button> : null}
        {s === 'conflict' ? <button type="button" className="sd-btn sd-btn-warn" onClick={onOpenConflict}>Choose a copy</button> : null}
        {s === 'missing' ? <button type="button" className="sd-btn" onClick={onReupload}>Save this tablet&rsquo;s copy to the cloud</button> : null}
        {live ? (
          <>
            <a className="sd-btn" href={showdownPublicHref(eventId)} target="_blank" rel="noreferrer">Player page</a>
            <button type="button" className="sd-btn" onClick={() => openShowdownTv(eventId, 'landscape')}>TV 16:9</button>
            <button type="button" className="sd-btn" onClick={() => openShowdownTv(eventId, 'portrait')}>TV 9:16</button>
          </>
        ) : null}
      </span>
    </div>
  );
}
