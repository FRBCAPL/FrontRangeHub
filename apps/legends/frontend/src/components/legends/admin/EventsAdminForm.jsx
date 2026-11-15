import React, { useEffect, useState } from 'react';
import { EVENT_CATEGORY_OPTIONS } from '../../../data/legendsEventCategories.js';
import {
  createAdminEvent,
  deleteAdminEvent,
  fetchAdminEvents,
  updateAdminEvent,
} from '../../../services/legendsEventsService.js';

const EMPTY = {
  title: '',
  summary: '',
  description: '',
  category: 'other',
  startsAt: '',
  endsAt: '',
  imageUrl: '',
  published: false,
};

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventsAdminForm() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    const data = await fetchAdminEvents();
    setEvents(data.events || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load events.');
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

  function startEdit(event) {
    setEditingId(event.id);
    setForm({
      title: event.title || '',
      summary: event.summary || '',
      description: event.description || '',
      category: event.category || 'other',
      startsAt: toLocalInput(event.startsAt),
      endsAt: toLocalInput(event.endsAt),
      imageUrl: event.imageUrl || '',
      published: Boolean(event.published),
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
      const payload = {
        ...form,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : '',
      };
      if (editingId) await updateAdminEvent(editingId, payload);
      else await createAdminEvent(payload);
      await reload();
      resetForm();
      setMessage(editingId ? 'Event updated.' : 'Event saved.');
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this event?')) return;
    setSaving(true);
    setError('');
    try {
      await deleteAdminEvent(id);
      if (editingId === id) resetForm();
      await reload();
      setMessage('Event deleted.');
    } catch (err) {
      setError(err.message || 'Delete failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="lg-card__muted">Loading events…</p>;

  return (
    <div className="lg-admin-form">
      <h2 className="lg-display lg-display--card">{editingId ? 'Edit event' : 'New event'}</h2>
      <p className="lg-card__muted lg-mt-2">One-time events only. Recurring karaoke and Sunday Nine Ball stay in the schedule.</p>
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-3">{message}</p> : null}

      <form className="lg-admin-form lg-mt-4" onSubmit={onSubmit}>
        <label className="lg-admin-form__label">
          Title
          <input value={form.title} onChange={(e) => setField('title', e.target.value)} required maxLength={120} />
        </label>
        <label className="lg-admin-form__label">
          Summary
          <input value={form.summary} onChange={(e) => setField('summary', e.target.value)} maxLength={300} />
        </label>
        <label className="lg-admin-form__label">
          Description
          <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={4} maxLength={5000} />
        </label>
        <label className="lg-admin-form__label">
          Category
          <select value={form.category} onChange={(e) => setField('category', e.target.value)}>
            {EVENT_CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="lg-admin-form__label">
          Starts
          <input type="datetime-local" value={form.startsAt} onChange={(e) => setField('startsAt', e.target.value)} />
        </label>
        <label className="lg-admin-form__label">
          Ends (optional)
          <input type="datetime-local" value={form.endsAt} onChange={(e) => setField('endsAt', e.target.value)} />
        </label>
        <label className="lg-admin-form__label">
          Image URL or /legends/ path
          <input value={form.imageUrl} onChange={(e) => setField('imageUrl', e.target.value)} maxLength={500} />
        </label>
        <label className="lg-admin-form__check">
          <input type="checkbox" checked={form.published} onChange={(e) => setField('published', e.target.checked)} />
          Publish on the public site
        </label>
        <div className="lg-admin-form__actions">
          <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update event' : 'Save event'}
          </button>
          {editingId ? (
            <button type="button" className="lg-btn lg-btn--secondary lg-btn--md" disabled={saving} onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <h3 className="lg-display lg-display--card lg-mt-10">All events</h3>
      <ul className="lg-admin-list lg-mt-4">
        {events.map((event) => (
          <li key={event.id} className="lg-admin-list__item">
            <div>
              <p className="lg-admin-list__title">{event.title}</p>
              <p className="lg-card__muted">
                {event.published ? 'Published' : 'Draft'}
                {event.slug ? ` · /legends/events/${event.slug}` : ''}
              </p>
            </div>
            <div className="lg-admin-list__actions">
              <button type="button" className="lg-btn lg-btn--quiet lg-btn--md" onClick={() => startEdit(event)}>Edit</button>
              <button type="button" className="lg-btn lg-btn--quiet lg-btn--md" onClick={() => onDelete(event.id)}>Delete</button>
            </div>
          </li>
        ))}
        {events.length === 0 ? <li className="lg-card__muted">No events yet.</li> : null}
      </ul>
    </div>
  );
}
