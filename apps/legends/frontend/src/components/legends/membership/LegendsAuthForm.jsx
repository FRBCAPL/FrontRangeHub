import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestLegendsAuthCode, verifyLegendsAuthCode } from '../../../services/legendsMemberService.js';

/** Next-style email/phone OTP for independent Legends membership. */
export default function LegendsAuthForm({ intent = 'join', nextPath = '/legends/my' }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [channel, setChannel] = useState('email');
  const [value, setValue] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onRequest(e) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    setDevCode('');
    try {
      const data = await requestLegendsAuthCode({ channel, value, intent });
      setMessage(data.message || 'Enter the code we sent.');
      if (data.devCode) setDevCode(data.devCode);
      setStep('code');
    } catch (err) {
      setError(err.message || 'Could not send code.');
    } finally {
      setPending(false);
    }
  }

  async function onVerify(e) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    try {
      const data = await verifyLegendsAuthCode({
        channel,
        value,
        code,
        intent,
        displayName: intent === 'join' ? displayName : undefined,
        marketingConsent: intent === 'join' ? marketingConsent : undefined,
      });
      setMessage(data.message || 'Signed in.');
      setStep('done');
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not verify code.');
    } finally {
      setPending(false);
    }
  }

  if (step === 'done') {
    return <p className="lg-admin-form__ok">{message || 'Signed in.'}</p>;
  }

  return (
    <form className="lg-admin-form lg-admin-panel" onSubmit={step === 'code' ? onVerify : onRequest}>
      {error ? <p className="lg-admin-form__error" role="alert">{error}</p> : null}
      {message ? <p className="lg-card__muted">{message}</p> : null}
      {devCode ? (
        <p className="lg-admin-form__ok">
          Development code: <strong className="lg-member-card__code">{devCode}</strong>
        </p>
      ) : null}

      {step === 'request' ? (
        <>
          <fieldset className="lg-auth-channel">
            <legend>How should we reach you?</legend>
            <label className="lg-admin-form__check">
              <input type="radio" name="channel" checked={channel === 'email'} onChange={() => setChannel('email')} />
              Email
            </label>
            <label className="lg-admin-form__check">
              <input type="radio" name="channel" checked={channel === 'phone'} onChange={() => setChannel('phone')} />
              Mobile phone
            </label>
          </fieldset>
          <label className="lg-admin-form__label">
            {channel === 'email' ? 'Email' : 'Mobile number'}
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="username"
              required
              placeholder={channel === 'email' ? 'you@example.com' : '(719) 555-0100'}
            />
          </label>
          {intent === 'join' ? (
            <>
              <label className="lg-admin-form__label">
                Display name <span className="lg-card__muted">(optional)</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
              </label>
              <label className="lg-admin-form__check">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                />
                Send me occasional news from Legends. Membership does not require this.
              </label>
            </>
          ) : null}
        </>
      ) : (
        <label className="lg-admin-form__label">
          6-digit code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            required
            className="lg-auth-code"
          />
        </label>
      )}

      <div className="lg-admin-form__actions">
        <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={pending}>
          {pending ? 'Working…' : step === 'code' ? 'Confirm code' : 'Send code'}
        </button>
        {step === 'code' ? (
          <button
            type="button"
            className="lg-btn lg-btn--quiet lg-btn--md"
            disabled={pending}
            onClick={() => {
              setStep('request');
              setCode('');
              setDevCode('');
              setMessage('');
            }}
          >
            Use a different contact
          </button>
        ) : null}
      </div>
    </form>
  );
}
