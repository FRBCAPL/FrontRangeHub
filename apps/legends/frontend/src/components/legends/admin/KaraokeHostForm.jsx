import React, { useEffect, useState } from 'react';
import { fetchLegendsAdminContent, saveKaraokeHost } from '../../../services/legendsContentService.js';

const EMPTY = { name: '', role: 'Karaoke host', bio: '', photoSrc: '', photoAlt: '' };

export default function KaraokeHostForm() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLegendsAdminContent();
        if (!cancelled) setForm({ ...EMPTY, ...(data.karaokeHost || {}) });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await saveKaraokeHost(form);
      setForm({ ...EMPTY, ...(result.draft || form) });
      setMessage(
        result.karaokeHost
          ? 'Saved. The KJ is live on the Karaoke page.'
          : 'Saved as a draft. Add both a name and a bio to publish on the Karaoke page.',
      );
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function onClear() {
    if (!window.confirm('Clear the KJ from the public Karaoke page?')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await saveKaraokeHost(EMPTY);
      setForm(EMPTY);
      setMessage('KJ cleared from the public page.');
    } catch (err) {
      setError(err.message || 'Could not clear.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="lg-card__muted">Loading KJ…</p>;

  return (
    <form className="lg-admin-form" onSubmit={onSubmit}>
      <h2 className="lg-display lg-display--card">Meet the KJ</h2>
      <p className="lg-card__muted lg-mt-2">
        Name and bio are required to publish. Photo is optional — use a path like{' '}
        <code>/legends/kj.jpg</code> after you put the file in the public legends folder, or a full https image URL.
      </p>
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-3">{message}</p> : null}

      <label className="lg-admin-form__label lg-mt-6">
        Name
        <input value={form.name} onChange={(e) => setField('name', e.target.value)} maxLength={80} />
      </label>
      <label className="lg-admin-form__label">
        Role label
        <input value={form.role} onChange={(e) => setField('role', e.target.value)} maxLength={80} />
      </label>
      <label className="lg-admin-form__label">
        Bio
        <textarea value={form.bio} onChange={(e) => setField('bio', e.target.value)} rows={4} maxLength={2000} />
      </label>
      <label className="lg-admin-form__label">
        Photo URL or path
        <input
          value={form.photoSrc}
          onChange={(e) => setField('photoSrc', e.target.value)}
          placeholder="/legends/kj.jpg"
          maxLength={500}
        />
      </label>
      <label className="lg-admin-form__label">
        Photo alt text
        <input value={form.photoAlt} onChange={(e) => setField('photoAlt', e.target.value)} maxLength={200} />
      </label>

      <div className="lg-admin-form__actions lg-mt-6">
        <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={saving}>
          {saving ? 'Saving…' : 'Save KJ'}
        </button>
        <button type="button" className="lg-btn lg-btn--secondary lg-btn--md" disabled={saving} onClick={onClear}>
          Clear KJ
        </button>
      </div>
    </form>
  );
}
