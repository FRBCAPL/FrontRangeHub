import React, { useEffect, useState } from 'react';

/** Captures beforeinstallprompt so phones can add Legends to the home screen. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('lg-install-dismissed') === '1');

  useEffect(() => {
    function onPrompt(event) {
      event.preventDefault();
      setDeferred(event);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (hidden || !deferred) return null;

  async function onInstall() {
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  function onDismiss() {
    sessionStorage.setItem('lg-install-dismissed', '1');
    setHidden(true);
  }

  return (
    <div className="lg-install" role="region" aria-label="Install Legends">
      <p className="lg-install__copy">Install Legends on your phone for a faster, app-like shortcut.</p>
      <div className="lg-install__actions">
        <button type="button" className="lg-btn lg-btn--primary lg-btn--md" onClick={onInstall}>
          Install
        </button>
        <button type="button" className="lg-btn lg-btn--quiet lg-btn--md" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
