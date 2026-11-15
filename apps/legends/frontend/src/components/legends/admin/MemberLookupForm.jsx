import React, { useState } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import { supabase } from '@shared/config/supabase.js';

export default function MemberLookupForm() {
  const [code, setCode] = useState('');
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMember(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('Please log in again.');
      const cleaned = code.trim().toUpperCase();
      const res = await fetch(`${BACKEND_URL}/api/legends-site/admin/members/by-code/${encodeURIComponent(cleaned)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Lookup failed.');
      setMember(json.member);
    } catch (err) {
      setError(err.message || 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="lg-admin-form" onSubmit={onSubmit}>
      <h2 className="lg-display lg-display--card">Member lookup</h2>
      <p className="lg-card__muted lg-mt-2">
        Look up a Legends Rewards card by code. This only identifies the membership — it does not redeem points or authorize a purchase.
      </p>
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      <label className="lg-admin-form__label lg-mt-4">
        Membership code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="LG-XXXX-XXXX"
          maxLength={20}
          required
        />
      </label>
      <div className="lg-admin-form__actions">
        <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={loading}>
          {loading ? 'Looking up…' : 'Look up'}
        </button>
      </div>
      {member ? (
        <dl className="lg-facts-list lg-mt-6">
          <div>
            <dt>Name</dt>
            <dd>{member.displayName}</dd>
          </div>
          <div>
            <dt>Code</dt>
            <dd className="lg-member-card__code">{member.publicCode}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{member.status}</dd>
          </div>
        </dl>
      ) : null}
    </form>
  );
}
