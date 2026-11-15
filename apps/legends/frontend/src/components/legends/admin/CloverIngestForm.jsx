import React, { useState } from 'react';
import { adminIngestCloverSale } from '../../../services/legendsCloverMatchService.js';

/** Staff/test: simulate a paid Clover sale so members can confirm a name match. */
export default function CloverIngestForm() {
  const [name, setName] = useState('');
  const [cloverCustomerId, setCloverCustomerId] = useState('');
  const [externalId, setExternalId] = useState(() => `test-${Date.now()}`);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const data = await adminIngestCloverSale({
        externalId: externalId.trim(),
        cardholderName: name.trim(),
        cloverCustomerId: cloverCustomerId.trim() || undefined,
      });
      setResult(data);
      setExternalId(`test-${Date.now()}`);
    } catch (err) {
      setError(err.message || 'Ingest failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lg-admin-form" onSubmit={onSubmit}>
      <h2 className="lg-display lg-display--card">Clover name match (test)</h2>
      <p className="lg-card__muted lg-mt-2">
        Simulates a paid sale with a cardholder name. Matching Legends members see “Was this you?” on My Legends. When
        your Clover integration is live, it should POST the same payload to{' '}
        <code>/api/legends-site/clover/ingest</code>.
      </p>
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {result ? (
        <p className="lg-admin-form__ok lg-mt-3">
          Outcome: <strong>{result.outcome}</strong>
          {result.proposalCount != null ? ` · ${result.proposalCount} proposal(s)` : ''}
          {result.publicCode ? ` · ${result.publicCode}` : ''}
        </p>
      ) : null}
      <label className="lg-admin-form__label lg-mt-4">
        Cardholder / customer name
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Jane Doe" />
      </label>
      <label className="lg-admin-form__label">
        Clover customer id (optional — from API, not the website UI)
        <input
          value={cloverCustomerId}
          onChange={(e) => setCloverCustomerId(e.target.value)}
          maxLength={120}
          placeholder="Leave blank if you only have a name"
        />
      </label>
      <label className="lg-admin-form__label">
        External sale / order id
        <input value={externalId} onChange={(e) => setExternalId(e.target.value)} required maxLength={120} />
      </label>
      <div className="lg-admin-form__actions">
        <button type="submit" className="lg-btn lg-btn--primary lg-btn--md" disabled={busy}>
          {busy ? 'Sending…' : 'Ingest test sale'}
        </button>
      </div>
    </form>
  );
}
