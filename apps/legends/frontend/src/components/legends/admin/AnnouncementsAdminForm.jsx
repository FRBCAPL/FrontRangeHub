import React, { useEffect, useState } from 'react';
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  fetchAdminAnnouncements,
  updateAdminAnnouncement,
} from '../../../services/legendsEventsService.js';

const EMPTY = { title: '', body: '', href: '', published: false };

export default function AnnouncementsAdminForm() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    const data = await fetchAdminAnnouncements();
    setItems(data.announcements || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load announcements.');
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

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      body: item.body || '',
      href: item.href || '',
      published: Boolean(item.published),
    });
    setMessage('');
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (editingId) await updateAdminAnnouncement(editingId, form);
      else await createAdminAnnouncement(form);
      await reload();
      resetForm();
      setMessage(editingId ? 'Announcement updated.' : 'Announcement saved.');
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this announcement?')) return;
    setSaving(true);
    setError('');
    try {
      await deleteAdminAnnouncement(id);
      if (editingId === id) resetForm();
      await reload();
      setMessage('Announcement deleted.');
    } catch (err) {
      setError(err.message || 'Delete failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="lg-card__muted">Loading announcements…</p>;

  return (
    <div className="lg-admin-form">
      <h2 className="lg-display lg-display--card">{editingId ? 'Edit announcement' : 'Announcement'}</h2>
      <p className="lg-card__muted lg-mt-2">Published announcements show near the top of the Legends home page.</p>
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-3">{message}</p> : null}

      <form className="lg-admin-form lg-mt-4" onSubmit={onSubmit}>
        <label className="lg-admin-form__label">
          Title
          <input value={form.title} onChange={(e) => setField('title', e.target.value)} required maxLength={120} />
        </label>
        <label className="lg-admin-form__label">
          Body
          <textarea value={form.body} onChange={(e) => setField('body', e.target.value)} required rows={3} maxLength={2000} />
        </label>
        <label className="lg-admin-form__label">
          Link (optional, /legends… or https)
          <input value={form.href} onChange={(e) => setField('href', e.target.value)} placeholder="/legends/events" maxLength={300} />
        </label>
        <label className="lg-admin-form__check">
          <input type="checkbox" checked={form.published} onChange={(e) => setField('published', e.target.checked)} />
          Show on the homepage
        </label>
        <div className="lg-admin-form__actions">
          <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Save announcement'}
          </button>
          {editingId ? (
            <button type="button" className="lg-btn lg-btn--secondary lg-btn--md" disabled={saving} onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <h3 className="lg-display lg-display--card lg-mt-10">All announcements</h3>
      <ul className="lg-admin-list lg-mt-4">
        {items.map((item) => (
          <li key={item.id} className="lg-admin-list__item">
            <div>
              <p className="lg-admin-list__title">{item.title}</p>
              <p className="lg-card__muted">{item.published ? 'Published' : 'Draft'}</p>
            </div>
            <div className="lg-admin-list__actions">
              <button type="button" className="lg-btn lg-btn--quiet lg-btn--md" onClick={() => startEdit(item)}>Edit</button>
              <button type="button" className="lg-btn lg-btn--quiet lg-btn--md" onClick={() => onDelete(item.id)}>Delete</button>
            </div>
          </li>
        ))}
        {items.length === 0 ? <li className="lg-card__muted">No announcements yet.</li> : null}
      </ul>
    </div>
  );
}
