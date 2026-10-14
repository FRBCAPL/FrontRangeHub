import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { statusText } from '../../utils/duezyHistory.js';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';
import { methodFrom } from '../../utils/duezyPayers.js';

const SHOW_MS = 12000;

/** "Sharks · week 3 · Paid $80 — Correct / Undo" for a few seconds after each payment tap. */
export default function DuezyUndoToast({ change, teams, onUndo, onDismiss, onCorrect }) {
  useEffect(() => {
    if (!change) return undefined;
    const t = setTimeout(onDismiss, SHOW_MS);
    return () => clearTimeout(t);
  }, [change, onDismiss]);

  if (!change) return null;
  const team = teams.find((x) => x.id === change.teamId);
  const what = statusText(change.entry.status, change.entry.amount);

  // .dz-main's entrance animation leaves a transform, which would pin position:fixed to the page instead of the screen.
  const host = document.querySelector('.dz-app') || document.body;
  return createPortal(
    <div className="dz-toast" role="status" aria-live="polite">
      <span className="dz-toast-text">
        <strong>{team?.name || 'Team'}</strong> · week {change.week} · {what}
        {change.entry.method ? ` · ${methodFrom(change.entry.method, change.entry.paid_by)}` : ''}
      </span>
      {onCorrect && hasRecordedEntry(change.entry) ? (
        <button type="button" className="dz-toast-link" onClick={() => onCorrect(change)}>Correct</button>
      ) : null}
      <button type="button" className="dz-toast-undo" onClick={onUndo}>Undo</button>
      <button type="button" className="dz-toast-close" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>,
    host
  );
}
