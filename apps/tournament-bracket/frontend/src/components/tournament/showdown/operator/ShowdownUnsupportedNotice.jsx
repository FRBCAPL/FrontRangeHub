import React from 'react';

/**
 * Shown instead of every event screen when this build cannot run the event's format.
 * Nothing here edits or saves the event; setting it aside only moves the tablet copy to Past events.
 */
export default function ShowdownUnsupportedNotice({ state, message, onSetAside, onLeave }) {
  return (
    <div className="sd-app">
      <section className="sd-panel" role="alert" aria-label="Update required">
        <h3>{state.name}</h3>
        <p className="sd-error">Update required. {message}</p>
        <p className="sd-note">Nothing on this tablet or in the cloud has been changed.</p>
        <div className="sd-btn-row">
          <button type="button" className="sd-btn" onClick={() => window.location.reload()}>Reload to update</button>
          <button type="button" className="sd-btn sd-btn-quiet" onClick={onSetAside}>Move to Past events</button>
          <button type="button" className="sd-btn sd-btn-quiet" onClick={onLeave}>Tournaments menu</button>
        </div>
      </section>
    </div>
  );
}
