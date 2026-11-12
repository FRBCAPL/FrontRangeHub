import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseLogin from '@shared/components/modal/modal/SupabaseLogin';
import {
  rememberLoginReturn,
  clearLoginReturn,
} from './tournamentOperators.js';
import { CASH_CLIMB_SUBMIT_HASH } from './cash-climb/cashClimbSubmit.js';
import { hasLocalTournamentWork, localTournamentWorkLabel } from './tournamentLocalWork.js';
import TournamentGuideLinks from './TournamentGuideLinks.jsx';
import './TournamentBracketApp.css';
import './TournamentHome.css';

function PublicLinks({ onSubmit, onHome }) {
  return (
    <>
      <section className="tb-hub-section" aria-labelledby="tb-gate-guides">
        <h2 id="tb-gate-guides">Player guides</h2>
        <p>How each format works. Read it here, or put it up on the TV.</p>
        <TournamentGuideLinks />
      </section>
      <section className="tb-hub-section" aria-labelledby="tb-gate-players">
        <h2 id="tb-gate-players">Playing tonight?</h2>
        <p>Report your match result here. No sign-in needed.</p>
        <div className="tb-hub-row">
          <button type="button" className="tb-btn-new" onClick={onSubmit}>Submit a result</button>
        </div>
      </section>
      <div className="tb-hub-back">
        <button type="button" className="tb-btn-new" onClick={onHome}>Back to home</button>
      </div>
    </>
  );
}

/**
 * Cash Climb / open tournament is house-operator only.
 * TV and the new-player guide stay on separate public routes.
 */
export default function TournamentBracketGate({ isAuthenticated, adminLoading, onLoginSuccess }) {
  const navigate = useNavigate();

  useEffect(() => {
    rememberLoginReturn('/tournament-bracket');
  }, []);

  const goHome = () => {
    clearLoginReturn();
    navigate('/');
  };

  const handleLoginSuccess = (nameOrUser, email, pin, userType) => {
    let name = nameOrUser;
    if (typeof nameOrUser === 'object' && nameOrUser !== null) {
      const u = nameOrUser;
      name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'User';
      email = u.email;
      pin = pin || 'supabase-auth';
      userType = userType || u.userType || 'user';
    }
    rememberLoginReturn('/tournament-bracket');
    onLoginSuccess(name, email, pin, userType);
    navigate('/tournament-bracket', { replace: true });
  };

  const localWork = hasLocalTournamentWork();
  const localLabel = localTournamentWorkLabel();
  const openSubmit = () => navigate(CASH_CLIMB_SUBMIT_HASH);

  if (isAuthenticated && adminLoading) {
    return (
      <div className="tournament-bracket-app">
        <header className="tb-header">
          <h1>Tournaments</h1>
          <p>Checking access…</p>
        </header>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="tournament-bracket-app">
        <header className="tb-header">
          <h1>Operator only</h1>
          <p>Only the house operator account can run tournaments. Players can still read the guides and report results below.</p>
        </header>
        <PublicLinks onSubmit={openSubmit} onHome={goHome} />
      </div>
    );
  }

  return (
    <div className="tournament-bracket-app">
      <header className="tb-header">
        <h1>Tournaments</h1>
        <p>
          {localWork
            ? `${localLabel} is still on this tablet. Sign in with the operator account to save it. Nothing you entered has been deleted.`
            : 'Running an event? Sign in with the operator account. Players can read the guides and report results below.'}
        </p>
      </header>
      {localWork ? (
        <p className="tb-gate-unsaved">
          After you sign in, this event will open again from this tablet and save to the database.
        </p>
      ) : null}
      <section className="tb-gate-login" aria-labelledby="tb-gate-login-heading">
        <h2 id="tb-gate-login-heading" className="tb-gate-login-title">Sign in</h2>
        <SupabaseLogin compact onSuccess={handleLoginSuccess} />
      </section>
      <PublicLinks onSubmit={openSubmit} onHome={goHome} />
    </div>
  );
}
