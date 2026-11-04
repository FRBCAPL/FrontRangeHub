import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { connectClover } from '../../services/itemsurePosService.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

/**
 * Connect Clover with a merchant ID and API token. The token goes straight to the server,
 * which checks it with Clover before saving; it is never shown again. `onConnected()` reloads.
 */
export default function ItemsurePosConnectForm({ organizationId, onConnected }) {
  const [form, setForm] = useState({ environment: 'production', merchantId: '', token: '' });
  const { busy, error, run } = useItemsureAction();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => connectClover(organizationId, form))) {
      setForm((f) => ({ ...f, token: '' }));
      await onConnected();
    }
  };

  return (
    <form className="isu-stack" onSubmit={submit} noValidate>
      <p className="isu-muted isu-small">
        ItemSure only reads from Clover (your items and sales) to help with stock. It never changes anything in Clover. Read-only token permissions are recommended.
      </p>
      <details className="isu-pos-help">
        <summary>Where do I find these?</summary>
        <ol>
          <li>Sign in to your Clover web dashboard.</li>
          <li><strong>Merchant ID:</strong> Account &amp; Setup → Merchants (also the code after <code>/m/</code> in the dashboard address).</li>
          <li><strong>API token:</strong> Account &amp; Setup → API Tokens → Create new token. Name it &ldquo;ItemSure&rdquo; and allow <em>Merchant: Read</em>, <em>Inventory: Read</em>, and <em>Orders: Read</em>.</li>
        </ol>
      </details>
      <Field label="Clover account">
        <select value={form.environment} onChange={set('environment')}>
          <option value="production">Live (my real Clover)</option>
          <option value="sandbox">Sandbox (test account)</option>
        </select>
      </Field>
      <Field label="Merchant ID">
        <input value={form.merchantId} onChange={set('merchantId')} maxLength={64} autoCapitalize="characters" autoComplete="off" spellCheck={false} />
      </Field>
      <Field label="API token" hint="Saved securely on the server. Nobody can see it again, including you.">
        <input type="password" value={form.token} onChange={set('token')} maxLength={4000} autoComplete="new-password" spellCheck={false} />
      </Field>
      <ErrorNote message={error} />
      <div>
        <button type="submit" className="isu-btn isu-btn--primary" disabled={busy || !form.merchantId.trim() || !form.token.trim()}>
          {busy ? 'Checking with Clover…' : 'Connect Clover'}
        </button>
      </div>
    </form>
  );
}
