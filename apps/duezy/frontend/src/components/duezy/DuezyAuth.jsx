import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DuezyAuthPitch from './DuezyAuthPitch.jsx';
import DuezyAuthFeatures from './DuezyAuthFeatures.jsx';
import DuezyAuthShowcase from './DuezyAuthShowcase.jsx';
import DuezyAuthScreens from './DuezyAuthScreens.jsx';
import DuezyAuthPricing from './DuezyAuthPricing.jsx';
import DuezyAuthForm from './DuezyAuthForm.jsx';
import DuezyModal from './DuezyModal.jsx';

const TITLES = { signup: 'Start your free trial', login: 'Welcome back', reset: 'Reset your password' };
const AUTH_MODES = ['signup', 'login'];

/**
 * Signed-out home: landing page (hero, features, sample + what it handles, real screenshots, pricing). Sign-in lives in a popup opened
 * by the hero / header buttons via ?auth=signup|login, so any page can link straight to it.
 */
export default function DuezyAuth({ initialError = '' }) {
  const [params, setParams] = useSearchParams();
  const asked = params.get('auth');
  const mode = AUTH_MODES.includes(asked) ? asked : initialError ? 'login' : '';
  const [title, setTitle] = useState('');

  const open = (next) => {
    setTitle('');
    setParams((prev) => { const p = new URLSearchParams(prev); p.set('auth', next); return p; });
  };
  const close = () => setParams((prev) => { const p = new URLSearchParams(prev); p.delete('auth'); return p; }, { replace: true });

  return (
    <div className="dz-land">
      <DuezyAuthPitch onStart={() => open('signup')} onLogin={() => open('login')} />
      <DuezyAuthFeatures />
      <DuezyAuthShowcase />
      <DuezyAuthScreens />
      <div className="dz-land-pricing"><DuezyAuthPricing /></div>
      <section className="dz-land-final">
        <h2>Ready for a season without the spreadsheet?</h2>
        <button type="button" className="dz-btn dz-btn--primary dz-land-cta" onClick={() => open('signup')}>Start free — 30 days</button>
        <small className="dz-muted">No card needed. Takes about two minutes.</small>
      </section>

      {mode ? (
        <DuezyModal title={TITLES[title || mode]} onClose={close} className="dz-auth-modal">
          <DuezyAuthForm key={mode} initialMode={mode} initialError={initialError} onModeChange={setTitle} />
        </DuezyModal>
      ) : null}
    </div>
  );
}
