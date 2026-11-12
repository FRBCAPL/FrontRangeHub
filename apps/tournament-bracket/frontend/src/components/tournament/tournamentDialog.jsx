import React from 'react';
import { createRoot } from 'react-dom/client';
import { BreakAndRunConfirmDialog } from './break-and-run/BreakAndRunConfirmDialog.jsx';

/** Mounts the in-app dialog on document.body so any screen can await it like window.confirm. */
function openDialog(options) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.zIndex = '100000';
    document.body.appendChild(host);
    const root = createRoot(host);
    const close = (ok) => {
      root.unmount();
      host.remove();
      resolve(ok);
    };
    root.render(
      <BreakAndRunConfirmDialog
        {...options}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    );
  });
}

/** Resolves true when the operator confirms. */
export function askTournament({ title = 'Are you sure?', message = '', confirmLabel = 'OK', cancelLabel = 'Cancel', tone = 'go' } = {}) {
  return openDialog({ title, message, confirmLabel, cancelLabel, tone });
}

/** One-button notice; resolves when dismissed. */
export async function tellTournament({ title = 'Heads up', message = '', confirmLabel = 'OK' } = {}) {
  await openDialog({ title, message, confirmLabel, cancelLabel: null });
}
