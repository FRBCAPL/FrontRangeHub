import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@shared/config/supabase.js';
import { MESSAGE_TOPICS } from '../../data/consignmentConstants.js';
import { sendConsignmentMessage } from '../../services/consignmentMessagesService.js';

async function signedInContact() {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  if (!user) return null;
  let name = [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ');
  try {
    const { data: row } = await supabase.from('users').select('first_name, last_name, phone').eq('id', user.id).maybeSingle();
    if (row) name = [row.first_name, row.last_name].filter(Boolean).join(' ') || name;
    return { name, email: user.email || '', phone: row?.phone || '' };
  } catch {
    return { name, email: user.email || '', phone: '' };
  }
}

/** Message FRPL about the consignment shop. itemNumber/topic pre-fill when opened from an item. */
export default function ConsignmentContactModal({ itemNumber = '', topic = 'other', onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic, itemNumber, message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    signedInContact().then((c) => {
      if (!alive || !c) return;
      setForm((prev) => ({
        ...prev,
        name: prev.name || c.name,
        email: prev.email || c.email,
        phone: prev.phone || c.phone,
      }));
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Enter your name.'); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError('Enter an email or phone number so FRPL can reply.'); return; }
    if (form.message.trim().length < 5) { setError('Write a short message.'); return; }
    setBusy(true);
    setError('');
    try {
      await sendConsignmentMessage(form);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="cs-portal">
      <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-contact-title" onClick={busy ? undefined : onClose}>
        <form className="cs-modal-card cs-form cs-contact" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
          <div className="cs-how-head">
            <h2 id="cs-contact-title">Contact FRPL</h2>
            <button type="button" className="cs-how-close" onClick={onClose} disabled={busy} aria-label="Close">×</button>
          </div>

          {sent ? (
            <>
              <p className="cs-lede">Thanks, your message is in. FRPL will get back to you by {form.email ? 'email' : 'phone'} soon.</p>
              <div className="cs-actions">
                <button type="button" className="cs-btn" onClick={onClose}>Done</button>
              </div>
            </>
          ) : (
            <>
              <p className="cs-hint">Questions about an item, bidding, selling or your payout? Send FRPL a message.</p>
              <div className="cs-field">
                <label htmlFor="cs-contact-name">Your name <span className="cs-req">*</span></label>
                <input id="cs-contact-name" value={form.name} onChange={set('name')} autoComplete="name" maxLength={120} />
              </div>
              <div className="cs-row">
                <div className="cs-field">
                  <label htmlFor="cs-contact-email">Email</label>
                  <input id="cs-contact-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" maxLength={200} />
                </div>
                <div className="cs-field">
                  <label htmlFor="cs-contact-phone">Phone</label>
                  <input id="cs-contact-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" maxLength={40} />
                </div>
              </div>
              <p className="cs-hint">Email or phone, at least one, so FRPL can reply.</p>
              <div className="cs-row">
                <div className="cs-field">
                  <label htmlFor="cs-contact-topic">About</label>
                  <select id="cs-contact-topic" value={form.topic} onChange={set('topic')}>
                    {MESSAGE_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="cs-field">
                  <label htmlFor="cs-contact-item">Item # (optional)</label>
                  <input id="cs-contact-item" value={form.itemNumber} onChange={set('itemNumber')} placeholder="e.g. C-0012" maxLength={40} />
                </div>
              </div>
              <div className="cs-field">
                <label htmlFor="cs-contact-msg">Message <span className="cs-req">*</span></label>
                <textarea id="cs-contact-msg" rows={5} value={form.message} onChange={set('message')} maxLength={4000} />
              </div>
              {error ? <p className="cs-error" role="alert">{error}</p> : null}
              <div className="cs-actions">
                <button type="submit" className="cs-btn" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
                <button type="button" className="cs-btn cs-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}
