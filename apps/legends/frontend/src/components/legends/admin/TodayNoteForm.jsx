import React, { useEffect, useState } from 'react';
import { clearTodayNote, fetchLegendsAdminContent, saveTodayNote } from '../../../services/legendsContentService.js';

export default function TodayNoteForm() {
  const [body, setBody] = useState('');
  const [hideAfter, setHideAfter] = useState('');
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    const data = await fetchLegendsAdminContent();
    setActive(data.todayNote || null);
    if (data.todayNote?.body) setBody(data.todayNote.body);
  }

  useEffect(() => {
    let cancelled = false;
    reload()
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

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = { body };
      if (hideAfter) payload.hideAfter = new Date(hideAfter).toISOString();
      const data = await saveTodayNote(payload);
      setActive(data.todayNote);
      setMessage('Note is live on the Tonight card.');
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function onClear() {
    if (!window.confirm('Clear the tonight note now?')) return;
    setSaving(true);
    setError('');
    try {
      await clearTodayNote();
      setActive(null);
      setBody('');
      setMessage('Tonight note cleared.');
    } catch (err) {
      setError(err.message || 'Could not clear.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="lg-card__muted">Loading tonight note…</p>;

  return (
    <form className="lg-admin-form" onSubmit={onSubmit}>
      <h2 className="lg-display lg-display--card">Tonight note</h2>
      <p className="lg-card__muted lg-mt-2">
        Short staff message on the home Tonight card (closures, specials wording you have confirmed, etc.). Leave hide time blank to expire in 24 hours.
      </p>
      {active ? (
        <p className="lg-admin-form__ok lg-mt-3">
          Active until {new Date(active.expiresAt).toLocaleString()}
        </p>
      ) : (
        <p className="lg-card__muted lg-mt-3">No active note.</p>
      )}
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-3">{message}</p> : null}
      <label className="lg-admin-form__label lg-mt-4">
        Note
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={500} required />
      </label>
      <label className="lg-admin-form__label">
        Hide after (optional)
        <input type="datetime-local" value={hideAfter} onChange={(e) => setHideAfter(e.target.value)} />
      </label>
      <div className="lg-admin-form__actions">
        <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={saving}>
          {saving ? 'Saving…' : 'Publish note'}
        </button>
        <button type="button" className="lg-btn lg-btn--secondary lg-btn--md" disabled={saving} onClick={onClear}>
          Clear note
        </button>
      </div>
    </form>
  );
}
