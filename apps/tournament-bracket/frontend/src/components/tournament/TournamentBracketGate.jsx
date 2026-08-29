import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseLogin from '@shared/components/modal/modal/SupabaseLogin';
import {
  rememberLoginReturn,
  clearLoginReturn,
} from './tournamentOperators.js';
import './TournamentBracketApp.css';

/**
 * Cash Climb / open tournament is house-operator only.
 * TV display stays on a separate public route.
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

  if (isAuthenticated && adminLoading) {
    return (
      <div className="tournament-bracket-app">
        <header className="tb-header">
          <h1>Open Tournament</h1>
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
          <p>
            Cash Climb is a house format. Sign in with the operator account to run an event.
          </p>
          <button type="button" className="tb-btn-new" onClick={goHome}>
            Back to home
          </button>
        </header>
      </div>
    );
  }

  return (
    <div className="tournament-bracket-app">
      <header className="tb-header">
        <h1>Open Tournament</h1>
        <p>Operator sign-in is required to run Cash Climb or an elimination bracket.</p>
      </header>
      <section className="tb-gate-login" aria-labelledby="tb-gate-login-heading">
        <h2 id="tb-gate-login-heading" className="tb-gate-login-title">Sign in</h2>
        <SupabaseLogin compact onSuccess={handleLoginSuccess} />
      </section>
      <div className="tb-header">
        <button type="button" className="tb-btn-new" onClick={goHome}>
          Back to home
        </button>
      </div>
    </div>
  );
}
