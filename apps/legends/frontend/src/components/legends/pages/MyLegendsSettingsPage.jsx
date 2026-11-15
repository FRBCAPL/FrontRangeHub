import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getLegendsSessionToken } from '../../../services/legendsSession.js';
import {
  fetchMyLegendsMembership,
  requestLegendsAuthCode,
  updateMyLegendsMembership,
  verifyLegendsAuthCode,
} from '../../../services/legendsMemberService.js';
import { useLegendsAdmin } from '../LegendsAdminContext.jsx';
import { PageIntro } from '../LegendsUi.jsx';

export default function MyLegendsSettingsPage() {
  const { isAuthenticated } = useLegendsAdmin();
  const canLoad = isAuthenticated || Boolean(getLegendsSessionToken());
  const [displayName, setDisplayName] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [publicCode, setPublicCode] = useState('');
  const [identifiers, setIdentifiers] = useState([]);
  const [hubLinked, setHubLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [addChannel, setAddChannel] = useState('email');
  const [addValue, setAddValue] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addStep, setAddStep] = useState('request');
  const [addDevCode, setAddDevCode] = useState('');
  const [addPending, setAddPending] = useState(false);

  useEffect(() => {
    if (!canLoad) return undefined;
    let cancelled = false;
    fetchMyLegendsMembership()
      .then((data) => {
        if (cancelled) return;
        setDisplayName(data.member.displayName || '');
        setMarketingConsent(Boolean(data.member.marketingConsent));
        setPublicCode(data.member.publicCode || '');
        setIdentifiers(data.identifiers || []);
        setHubLinked(Boolean(data.member.hubLinked));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canLoad]);

  if (!canLoad) return <Navigate to="/legends/my" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const data = await updateMyLegendsMembership({ displayName, marketingConsent });
      setDisplayName(data.member.displayName);
      setMarketingConsent(Boolean(data.member.marketingConsent));
      setMessage('Profile saved.');
    } catch (err) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function onAddRequest(e) {
    e.preventDefault();
    setAddPending(true);
    setError('');
    setMessage('');
    try {
      const data = await requestLegendsAuthCode({ channel: addChannel, value: addValue, intent: 'add' });
      setMessage(data.message || 'Enter the code we sent.');
      if (data.devCode) setAddDevCode(data.devCode);
      setAddStep('code');
    } catch (err) {
      setError(err.message || 'Could not send code.');
    } finally {
      setAddPending(false);
    }
  }

  async function onAddVerify(e) {
    e.preventDefault();
    setAddPending(true);
    setError('');
    setMessage('');
    try {
      const data = await verifyLegendsAuthCode({
        channel: addChannel,
        value: addValue,
        code: addCode,
        intent: 'add',
      });
      setMessage(data.message || 'Contact added.');
      setAddStep('request');
      setAddValue('');
      setAddCode('');
      setAddDevCode('');
      const refreshed = await fetchMyLegendsMembership();
      setIdentifiers(refreshed.identifiers || []);
    } catch (err) {
      setError(err.message || 'Could not verify contact.');
    } finally {
      setAddPending(false);
    }
  }

  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="My Legends" title="Profile">
        <p className="lg-lede lg-mt-4">
          Your membership code does not change. Display name is what shows on your card. Contacts are verified on this
          Legends membership only.
        </p>
      </PageIntro>
      {loading ? <p className="lg-card__muted lg-mt-6">Loading…</p> : null}
      {!loading ? (
        <>
          <form className="lg-admin-form lg-admin-panel lg-mt-8" onSubmit={onSubmit}>
            {error ? <p className="lg-admin-form__error" role="alert">{error}</p> : null}
            {message ? <p className="lg-admin-form__ok">{message}</p> : null}
            <label className="lg-admin-form__label">
              Display name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />
            </label>
            <p className="lg-card__muted">
              Membership code: <span className="lg-member-card__code">{publicCode}</span>
              {hubLinked ? ' · Hub linked' : ''}
            </p>
            <label className="lg-admin-form__check">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />
              Email/text me about Legends nights and offers
            </label>
            <div className="lg-admin-form__actions">
              <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
              <Link to="/legends/my" className="lg-btn lg-btn--secondary lg-btn--md">
                Back
              </Link>
            </div>
          </form>

          <section className="lg-admin-panel lg-mt-6">
            <h2 className="lg-display lg-display--card">Verified contacts</h2>
            {identifiers.length === 0 ? (
              <p className="lg-card__muted lg-mt-3">No email or phone on this membership yet.</p>
            ) : (
              <ul className="lg-bullets lg-mt-3">
                {identifiers.map((item) => (
                  <li key={item.id}>
                    {item.channel === 'email' ? 'Email' : 'Phone'}: {item.value}
                  </li>
                ))}
              </ul>
            )}

            <form className="lg-admin-form lg-mt-6" onSubmit={addStep === 'code' ? onAddVerify : onAddRequest}>
              <h3 className="lg-display lg-display--card">Add a contact</h3>
              {addDevCode ? (
                <p className="lg-admin-form__ok">
                  Development code: <strong>{addDevCode}</strong>
                </p>
              ) : null}
              {addStep === 'request' ? (
                <>
                  <fieldset className="lg-auth-channel">
                    <legend>Channel</legend>
                    <label className="lg-admin-form__check">
                      <input
                        type="radio"
                        checked={addChannel === 'email'}
                        onChange={() => setAddChannel('email')}
                      />
                      Email
                    </label>
                    <label className="lg-admin-form__check">
                      <input
                        type="radio"
                        checked={addChannel === 'phone'}
                        onChange={() => setAddChannel('phone')}
                      />
                      Phone
                    </label>
                  </fieldset>
                  <label className="lg-admin-form__label">
                    Value
                    <input value={addValue} onChange={(e) => setAddValue(e.target.value)} required />
                  </label>
                </>
              ) : (
                <label className="lg-admin-form__label">
                  6-digit code
                  <input
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    pattern="\d{6}"
                    required
                  />
                </label>
              )}
              <div className="lg-admin-form__actions">
                <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={addPending}>
                  {addPending ? 'Working…' : addStep === 'code' ? 'Confirm code' : 'Send code'}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </article>
  );
}
