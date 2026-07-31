import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  signInEstateOwnerWithGoogle,
  signInEstateOwnerWithEmail,
  signUpEstateOwnerWithEmail,
  resendEstateOwnerConfirmation
} from '@shared/services/estateVaultAuth.js';
import { ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import EstateBrandTitle from './EstateBrandTitle';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateLegalDisclaimerGate from './EstateLegalDisclaimerGate';

/**
 * PR identity gate — Google or email/password (create account / sign in).
 */
const EstateOwnerSignIn = ({ onSignedIn }) => {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState('');
  const [resendBusy, setResendBusy] = useState(false);

  const isSignup = mode === 'signup';

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    setError('');
    setInfo('');
    const result = await signInEstateOwnerWithGoogle();
    if (!result.success) {
      setGoogleBusy(false);
      setError(result.error || 'Could not start Google sign-in.');
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');

    if (isSignup) {
      if (password.length < 8) {
        setBusy(false);
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setBusy(false);
        setError('Passwords do not match.');
        return;
      }
    }

    const result = isSignup
      ? await signUpEstateOwnerWithEmail(email, password)
      : await signInEstateOwnerWithEmail(email, password);

    setBusy(false);

    if (!result.success) {
      setError(result.error || 'Could not continue.');
      // An unconfirmed address is recoverable without retyping anything. Match
      // every phrasing the auth layer can produce ("confirm your address",
      // "confirm your email", "not confirmed") so the Resend button appears.
      if (/confirm your (email|address)|not confirmed/i.test(result.error || '')) {
        setPendingConfirmEmail(email.trim());
      }
      return;
    }

    if (result.data?.needsEmailConfirmation) {
      const confirmEmail = result.data.email || email.trim();
      // switchMode resets error/info, so apply the message after switching.
      switchMode('signin');
      if (result.data.emailSent === false) {
        setError(
          result.data.warning ||
            `Account created for ${confirmEmail}, but the confirmation email could not be sent. Use “Resend confirmation email” below, or continue with Google.`
        );
      } else {
        setInfo(
          `Account created for ${confirmEmail}. Check your inbox for a confirmation link, then come back here and choose Sign in.`
        );
      }
      setEmail(confirmEmail);
      setPendingConfirmEmail(confirmEmail);
      return;
    }

    onSignedIn?.(result.data);
  };

  const handleResend = async () => {
    setResendBusy(true);
    setError('');
    setInfo('');
    const result = await resendEstateOwnerConfirmation(pendingConfirmEmail || email);
    setResendBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not resend the email.');
      return;
    }
    setInfo(
      `If ${pendingConfirmEmail || email.trim()} has an account, a new link is on its way. It can take a minute — check spam too.`
    );
  };

  const disabled = busy || googleBusy || resendBusy;
  const showResend = !isSignup && Boolean(pendingConfirmEmail);
  const canSubmit =
    email.trim() &&
    password &&
    (!isSignup || (confirmPassword && password === confirmPassword && password.length >= 8));

  return (
    <EstateLegalDisclaimerGate>
    <div className="estate-inventory ei-landing ei-case-entry ei-owner-signin">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">Personal Representative</p>
        <EstateBrandTitle />
        <p className="ei-lede">
          {isSignup ? (
            <>
              Create your Personal Representative account.
              <br />
              Use this to open estates you manage — family still uses invite codes.
            </>
          ) : (
            <>
              Sign in to manage estates you already own.
              <br />
              New here? Switch to <strong>Create account</strong> below.
            </>
          )}
        </p>
      </header>

      <div className="ei-portal-card ei-owner-signin-card">
        {error ? <div className="ei-error">{error}</div> : null}
        {info ? <p className="ei-status">{info}</p> : null}

        <div
          className="ei-owner-mode-tabs"
          role="tablist"
          aria-label="Account options"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            className={`ei-owner-mode-tab${!isSignup ? ' is-active' : ''}`}
            onClick={() => switchMode('signin')}
            disabled={disabled}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            className={`ei-owner-mode-tab${isSignup ? ' is-active' : ''}`}
            onClick={() => switchMode('signup')}
            disabled={disabled}
          >
            Create account
          </button>
        </div>

        <div
          className={`ei-owner-mode-banner${isSignup ? ' is-signup' : ' is-signin'}`}
          role="status"
        >
          {isSignup ? (
            <>
              <strong>New account</strong>
              <span>
                Set up your Estate Vault login with Google or an email and password. This is not
                your estate admin PIN.
              </span>
            </>
          ) : (
            <>
              <strong>Returning PR</strong>
              <span>Use the same method you registered with.</span>
            </>
          )}
        </div>

        <button
          type="button"
          className={`ei-btn${isSignup ? ' ei-btn-signup' : ''}`}
          onClick={handleGoogle}
          disabled={disabled}
          style={{ width: '100%' }}
        >
          {googleBusy
            ? 'Redirecting…'
            : isSignup
              ? 'Create account with Google'
              : 'Continue with Google'}
        </button>
        <p className="ei-settings-hint" style={{ marginTop: '0.45rem' }}>
          {isSignup
            ? 'Fastest option — nothing new to remember.'
            : 'Create and Manage Estates with Google Sign In.'}
        </p>

        <div className="ei-owner-signin-divider" role="separator">
          <span>or use email</span>
        </div>

        <form className="ei-modal-form" onSubmit={handleEmailSubmit}>
          <div className="ei-field">
            <label htmlFor="ei-pr-email">{isSignup ? 'Email for your new account' : 'Email'}</label>
            <input
              id="ei-pr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={disabled}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-pr-password">
              {isSignup ? 'Create a password' : 'Password'}
            </label>
            <div className="ei-password-row">
              <input
                id="ei-pr-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={isSignup ? 8 : 1}
                disabled={disabled}
              />
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
                onClick={() => setShowPassword((v) => !v)}
                disabled={disabled}
              >
                {showPassword ? 'Hide' : 'See'}
              </button>
            </div>
            {isSignup ? (
              <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
                At least 8 characters. Separate from each estate’s admin PIN.
              </p>
            ) : null}
          </div>

          {isSignup ? (
            <div className="ei-field">
              <label htmlFor="ei-pr-password-confirm">Confirm password</label>
              <input
                id="ei-pr-password-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                disabled={disabled}
              />
            </div>
          ) : null}

          <button
            type="submit"
            className={`ei-btn${isSignup ? ' ei-btn-signup' : ''}`}
            disabled={disabled || !canSubmit}
            style={{ width: '100%' }}
          >
            {busy
              ? isSignup
                ? 'Creating account…'
                : 'Signing in…'
              : isSignup
                ? 'Create my PR account'
                : 'Sign in with email'}
          </button>
        </form>

        {showResend ? (
          <div className="ei-owner-resend">
            <p className="ei-settings-hint" style={{ margin: '0 0 0.4rem' }}>
              Didn’t get the confirmation email for {pendingConfirmEmail}?
            </p>
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              onClick={handleResend}
              disabled={disabled}
            >
              {resendBusy ? 'Sending…' : 'Resend confirmation email'}
            </button>
          </div>
        ) : null}

        <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
          <Link to={ESTATEIT_PATH}>Back to home</Link>
          {' · '}
          <Link to={`${ESTATEIT_PATH}/enter`}>Family / helper sign in</Link>
        </p>
      </div>

      <EstateSystemDisclaimer generic />
    </div>
    </EstateLegalDisclaimerGate>
  );
};

export default EstateOwnerSignIn;
