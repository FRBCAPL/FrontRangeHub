import React, { useCallback, useEffect, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';

function formatSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/** Private supporting statements for one listed account or debt. */
const LedgerAccountDocuments = ({ account, caseNumber, readOnly, onClose, onChanged }) => {
  const inputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [statementDate, setStatementDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    const result = await estateInventoryService.listEstateAccountDocuments(
      account.id,
      caseNumber
    );
    if (!result.success) {
      setError(result.error || 'Could not load statements.');
      setRows([]);
      return;
    }
    setRows(result.data || []);
  }, [account.id, caseNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (ev) => {
    ev.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.addEstateAccountDocument(account.id, {
      file,
      statementDate,
      notes,
      caseNumber
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not upload the statement.');
      return;
    }
    setFile(null);
    setStatementDate('');
    setNotes('');
    if (inputRef.current) inputRef.current.value = '';
    setInfo('Statement attached and fingerprinted.');
    await load();
    await onChanged?.();
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove “${row.file_name}” from the estate record?`)) return;
    setBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.deleteEstateAccountDocument(row.id, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not remove the statement.');
      return;
    }
    setInfo(result.warning || 'Statement removed.');
    await load();
    await onChanged?.();
  };

  return (
    <section className="ei-account-documents">
      <div className="ei-account-documents-head">
        <div>
          <h4>Statements · {account.account_name}</h4>
          <p className="ei-settings-hint">
            Private PDFs or photos. Each file gets a SHA-256 fingerprint for the court record.
          </p>
        </div>
        <button type="button" className="ei-btn ei-btn-small ei-btn-secondary" onClick={onClose}>
          Done
        </button>
      </div>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}

      {!readOnly ? (
        <form className="ei-account-document-form" onSubmit={upload}>
          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-account-statement-file">Statement image or PDF</label>
            <input
              ref={inputRef}
              id="ei-account-statement-file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(ev) => setFile(ev.target.files?.[0] || null)}
              required
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-account-statement-date">Statement date</label>
            <input
              id="ei-account-statement-date"
              type="date"
              value={statementDate}
              onChange={(ev) => setStatementDate(ev.target.value)}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-account-statement-notes">Notes (optional)</label>
            <input
              id="ei-account-statement-notes"
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              placeholder="e.g. Final statement received by mail"
            />
          </div>
          <button
            type="submit"
            className="ei-btn ei-btn-small ei-field-wide"
            disabled={busy || !file}
          >
            {busy ? 'Uploading…' : 'Attach statement'}
          </button>
        </form>
      ) : null}

      {rows.length ? (
        <ul className="ei-account-document-list">
          {rows.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.file_name}</strong>
                <span>
                  {row.statement_date || 'Date not entered'}
                  {formatSize(row.size_bytes) ? ` · ${formatSize(row.size_bytes)}` : ''}
                  {row.notes ? ` · ${row.notes}` : ''}
                </span>
                <code title={row.sha256_hash || 'Hash unavailable'}>
                  SHA-256: {row.sha256_hash || 'Unavailable'}
                </code>
              </div>
              <span className="ei-btn-row">
                {row.signed_url ? (
                  <a
                    className="ei-btn ei-btn-small ei-btn-secondary"
                    href={row.signed_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                ) : null}
                {!readOnly ? (
                  <button
                    type="button"
                    className="ei-btn ei-btn-small ei-btn-danger"
                    onClick={() => remove(row)}
                    disabled={busy}
                  >
                    Remove
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ei-settings-hint">No statements attached yet.</p>
      )}
    </section>
  );
};

export default LedgerAccountDocuments;
