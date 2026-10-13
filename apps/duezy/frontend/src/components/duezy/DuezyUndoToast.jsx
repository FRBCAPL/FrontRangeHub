import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { statusText } from '../../utils/duezyHistory.js';

const SHOW_MS = 7000;

/** "Sharks · week 3 · Paid $80 — Undo" for a few seconds after each payment tap. */
export default function DuezyUndoToast({ change, teams, onUndo, onDismiss }) {
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
        {change.entry.method ? ` · ${change.entry.method}` : ''}
      </span>
      <button type="button" className="dz-toast-undo" onClick={onUndo}>Undo</button>
      <button type="button" className="dz-toast-close" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>,
    host
  );
}
