import React from 'react';
import { showdownPublicHref, openShowdownTv } from '../public/showdownPublicRoutes.js';
import { openShowdownGuideTv } from '../public/showdownGuideRoute.js';
import { DEV_LIVE_WRITE_NOTE, ISOLATED_CLOUD_NOTE } from '../cloud/showdownCloudApi.js';

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

const ISOLATED_LABELS = {
  ...LABELS,
  idle: 'Checking the isolated test cloud\u2026',
  saving: 'Saving to the isolated test cloud\u2026',
  saved: 'Saved to the isolated test cloud',
  offline: 'Not saved to the isolated test cloud yet',
};

function when(at) {
  const d = new Date(at || '');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Cloud save status, retry, and the public / TV links for this event. `guideVersion` (1, 2 or 3; V3 when
 * `v3`) opens that version's guide; `isolated` says the isolated test cloud (development only) is answering
 * instead of the live database; `writesLive` (development build, preview off) warns that V1/V2 saves are
 * real writes to the live database.
 */
export default function ShowdownCloudBar({ eventId, status, sync, onRetry, onReupload, onOpenConflict, v3 = false, guideVersion = null, isolated = false, writesLive = false }) {
  const guide = guideVersion || (v3 ? 3 : null);
  const s = sync.status;
  const bad = ['offline', 'error', 'conflict', 'missing'].includes(s);
  const live = status !== 'setup';
  const labels = isolated ? ISOLATED_LABELS : LABELS;
  return (
    <div className={`sd-cloud-bar is-${s}`} role={bad ? 'alert' : 'status'}>
      <span className="sd-cloud-state">
        <strong>{labels[s] || s}</strong>
        {s === 'saved' && sync.savedAt ? ` \u00b7 ${when(sync.savedAt)}` : ''}
        {sync.message ? <small> {sync.message}</small> : null}
        {isolated ? <small> {ISOLATED_CLOUD_NOTE}</small> : null}
        {writesLive && !isolated && !v3 && s !== 'local-only' ? <small className="sd-cloud-live-warn"> {DEV_LIVE_WRITE_NOTE}</small> : null}
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
        <button type="button" className="sd-btn" onClick={() => openShowdownGuideTv({ version: guide })}>{guide ? `How V${guide} works TV` : 'How it works TV'}</button>
      </span>
    </div>
  );
}
