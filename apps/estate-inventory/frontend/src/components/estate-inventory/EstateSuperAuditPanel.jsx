import React, { useEffect, useState } from 'react';
import { listAudit, exportAudit } from '@shared/services/estateSuperAdminService.js';

const EstateSuperAuditPanel = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const result = await listAudit({ limit: 150 });
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load audit log.');
      setEntries([]);
      return;
    }
    setEntries(result.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setMessage('');
    const result = await exportAudit();
    setExporting(false);
    if (!result.success) {
      setError(result.error || 'Export failed.');
      return;
    }
    const payload = {
      exported_at: result.data.exported_at,
      exported_by: result.data.exported_by,
      chain_valid: result.data.chain_valid,
      entries: result.data.entries,
      manifest_hash: result.data.manifest_hash
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estate-operator-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(
      result.data.chain_valid
        ? `Export saved. Chain valid. Manifest ${String(result.data.manifest_hash || '').slice(0, 12)}…`
        : 'Export saved, but chain_valid is false — investigate before using as evidence.'
    );
    await load();
  };

  return (
    <section className="ei-super-panel">
      <div className="ei-super-toolbar">
        <p className="ei-settings-hint" style={{ margin: 0, flex: 1 }}>
          Sealed operator audit — separate from the PR activity log. Append-only with hash chain.
        </p>
        <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={() => load()}>
          Refresh
        </button>
        <button type="button" className="ei-btn ei-btn-small" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export court JSON'}
        </button>
      </div>

      {error ? <div className="ei-error">{error}</div> : null}
      {message ? <p className="ei-status">{message}</p> : null}
      {loading ? <p className="ei-status">Loading audit…</p> : null}

      <div className="ei-super-table-wrap">
        <table className="ei-super-table">
          <thead>
            <tr>
              <th>#</th>
              <th>When</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Reason</th>
              <th>Hash</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.sequence}</td>
                <td className="ei-super-muted">
                  {e.created_at ? new Date(e.created_at).toLocaleString() : '—'}
                </td>
                <td>
                  <code>{e.action}</code>
                </td>
                <td className="ei-super-muted">{e.actor_email || '—'}</td>
                <td>
                  {e.case_number || e.target_id || e.target_type || '—'}
                </td>
                <td>{e.reason || '—'}</td>
                <td className="ei-super-muted">
                  <code>{String(e.entry_hash || '').slice(0, 10)}…</code>
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 ? (
              <tr>
                <td colSpan={7}>No operator actions logged yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EstateSuperAuditPanel;
