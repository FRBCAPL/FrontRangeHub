import React, { useEffect, useState } from 'react';
import { fetchLegendsAdminContent, saveVisitFacts } from '../../../services/legendsContentService.js';

const EMPTY = { phone: '', facebookUrl: '', hoursText: '' };

export default function VisitFactsForm() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchLegendsAdminContent()
      .then((data) => {
        if (!cancelled) setForm({ ...EMPTY, ...(data.visitFacts || {}) });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await saveVisitFacts(form);
      setMessage('Visit facts saved. Empty fields stay unpublished on the site.');
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="lg-card__muted">Loading visit facts…</p>;

  return (
    <form className="lg-admin-form" onSubmit={onSubmit}>
      <h2 className="lg-display lg-display--card">Visit facts</h2>
      <p className="lg-card__muted lg-mt-2">
        Only fill in what Legends has confirmed. Leave blank to keep the “not published” wording.
      </p>
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-3">{message}</p> : null}
      <label className="lg-admin-form__label lg-mt-4">
        Phone
        <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="(719) 555-0100" maxLength={40} />
      </label>
      <label className="lg-admin-form__label">
        Facebook URL
        <input value={form.facebookUrl} onChange={(e) => setField('facebookUrl', e.target.value)} placeholder="https://facebook.com/…" maxLength={300} />
      </label>
      <label className="lg-admin-form__label">
        Hours (one line per day)
        <textarea
          value={form.hoursText}
          onChange={(e) => setField('hoursText', e.target.value)}
          rows={7}
          placeholder={'Mon–Thu: 11 AM – 12 AM\nFri–Sat: 11 AM – 2 AM\nSun: 11 AM – 12 AM'}
          maxLength={2000}
        />
      </label>
      <div className="lg-admin-form__actions">
        <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={saving}>
          {saving ? 'Saving…' : 'Save visit facts'}
        </button>
      </div>
    </form>
  );
}
