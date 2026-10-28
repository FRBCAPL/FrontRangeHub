import React from 'react';

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Distinguishes values saved on the server from changes that exist only on this device. */
export default function ItemsureCountSaveBar({ summary, onRetry }) {
  let tone = 'saved';
  let text = 'All changes saved';
  let retry = false;

  if (summary.conflict) {
    tone = 'problem';
    text = `${plural(summary.conflict, 'item')} changed by someone else. Choose which value to keep.`;
  } else if (summary.invalid || summary.error) {
    tone = 'problem';
    text = `${plural(summary.invalid + summary.error, 'value')} could not be saved. Check the highlighted items.`;
    retry = summary.error > 0;
  } else if (summary.offline) {
    tone = 'offline';
    text = `${plural(summary.offline, 'change')} saved on this device only. ItemSure will retry when you are back online.`;
    retry = true;
  } else if (summary.saving) {
    tone = 'saving';
    text = 'Saving…';
  } else if (summary.pending) {
    tone = 'saving';
    text = `${plural(summary.pending, 'change')} waiting to save`;
  }

  return (
    <div className={`isu-count-savebar is-${tone}`} role="status" aria-live="polite">
      <span>{text}</span>
      {retry ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onRetry}>Retry now</button>
      ) : null}
    </div>
  );
}
