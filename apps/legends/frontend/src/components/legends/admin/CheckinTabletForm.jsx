import React, { useEffect, useRef, useState } from 'react';
import { adminCheckinByCode } from '../../../services/legendsCheckinService.js';

/**
 * Venue tablet: type or scan LG code. Submits automatically when a full code is entered.
 * Hub admin session required.
 */
export default function CheckinTabletForm() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [last, setLast] = useState(null);
  const inputRef = useRef(null);
  const submitting = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(raw) {
    const cleaned = String(raw || '')
      .trim()
      .toUpperCase();
    if (!/^LG-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(cleaned)) {
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await adminCheckinByCode(cleaned);
      setMessage(data.message);
      setLast(data);
      setCode('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err.message || 'Check-in failed.');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  function onChange(e) {
    const next = e.target.value.toUpperCase();
    setCode(next);
    if (/^LG-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(next.trim())) {
      submit(next);
    }
  }

  return (
    <div>
      <h2 className="lg-display lg-display--card">Check in</h2>
      <p className="lg-card__muted lg-mt-2">
        Venue tablet mode. Scan or type a membership QR/code — check-in happens automatically. Prefer CueSync/Clover
        tab opens when wired; this is the no-tab fallback.
      </p>
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-3">{message}</p> : null}
      <label className="lg-admin-form__label lg-mt-4">
        Membership code
        <input
          ref={inputRef}
          value={code}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit(code);
            }
          }}
          placeholder="LG-XXXX-XXXX"
          maxLength={20}
          autoComplete="off"
          autoCapitalize="characters"
          disabled={busy}
          className="lg-auth-code"
        />
      </label>
      {last?.member ? (
        <dl className="lg-facts-list lg-mt-6">
          <div>
            <dt>Name</dt>
            <dd>{last.member.displayName}</dd>
          </div>
          <div>
            <dt>Code</dt>
            <dd className="lg-member-card__code">{last.member.publicCode}</dd>
          </div>
          <div>
            <dt>Result</dt>
            <dd>{last.alreadyToday ? 'Already tonight' : 'New check-in'}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
