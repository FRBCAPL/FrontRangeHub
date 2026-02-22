import React, { useState, useEffect } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

/**
 * In-app bulk Fargo update: paste "email, fargo" or "name, fargo" lines and apply.
 * Same-origin so it works on live (avoids ERR_BLOCKED_BY_RESPONSE from backend static page).
 */
export default function BulkFargoUpdateModal({ ladderName, onClose, onSuccess }) {
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [result, setResult] = useState({ applied: 0, skipped: 0, errors: [] });

  useEffect(() => {
    if (!ladderName) return;
    let cancelled = false;
    setLoadError('');
    (async () => {
      const res = await supabaseDataService.getLadderPlayersByNameIncludingInactive(ladderName);
      if (cancelled) return;
      if (!res.success) {
        setLoadError(res.error || 'Failed to load players');
        setPlayers([]);
        return;
      }
      setPlayers(res.data || []);
    })();
    return () => { cancelled = true; };
  }, [ladderName]);

  const handleApply = async () => {
    if (!ladderName || !pasteText.trim()) return;
    setLoading(true);
    setResult({ applied: 0, skipped: 0, errors: [] });

    const lines = pasteText.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const emailToUserId = {};
    const nameToUserId = {};
    for (const p of players) {
      const uid = p.user_id || p.users?.id;
      if (!uid) continue;
      const email = (p.users?.email || p.email || '').toLowerCase().trim();
      if (email) emailToUserId[email] = uid;
      const first = (p.users?.first_name || p.first_name || '').trim();
      const last = (p.users?.last_name || p.last_name || '').trim();
      const full = `${first} ${last}`.trim().toLowerCase();
      if (full) nameToUserId[full] = uid;
      if (first) nameToUserId[first.toLowerCase()] = uid;
    }

    let applied = 0;
    const errors = [];
    for (const line of lines) {
      const comma = line.indexOf(',');
      if (comma === -1) {
        errors.push(`Invalid line (expected "email or name, fargo"): ${line.slice(0, 50)}`);
        continue;
      }
      const identifier = line.slice(0, comma).trim();
      const fargoStr = line.slice(comma + 1).trim();
      const fargo = fargoStr === '' || fargoStr.toLowerCase() === 'null' ? null : parseInt(fargoStr, 10);
      if (fargoStr !== '' && fargoStr.toLowerCase() !== 'null' && (isNaN(fargo) || fargo < 0)) {
        errors.push(`Invalid Fargo value for "${identifier}": ${fargoStr}`);
        continue;
      }
      const key = identifier.toLowerCase();
      const userId = emailToUserId[key] ?? nameToUserId[key];
      if (!userId) {
        errors.push(`Player not found on this ladder: ${identifier}`);
        continue;
      }
      try {
        const updateRes = await supabaseDataService.updatePlayer(userId, {
          fargoRate: fargo,
          ladderName
        });
        if (updateRes && updateRes.success) applied++;
        else errors.push(`${identifier}: ${(updateRes && updateRes.error) || 'Update failed'}`);
      } catch (e) {
        errors.push(`${identifier}: ${e.message || String(e)}`);
      }
    }

    setResult({ applied, skipped: lines.length - applied - errors.length, errors });
    setLoading(false);
    if (applied > 0 && typeof onSuccess === 'function') onSuccess();
  };

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title={`Bulk Fargo Update — ${ladderName || 'Ladder'}`}
      maxWidth="560px"
    >
      <div style={{ padding: '8px 0' }}>
        <p style={{ margin: '0 0 10px 0', color: '#333', fontSize: '14px' }}>
          Paste one line per player: <strong>email, fargo</strong> or <strong>name, fargo</strong>. Example:
        </p>
        <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>
          {`player@example.com, 520\nJane Doe, 480`}
        </pre>
        {loadError && <p style={{ color: '#c0392b', marginBottom: '8px' }}>{loadError}</p>}
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="email or name, fargo (one per line)"
          rows={8}
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px', fontSize: '13px', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || !pasteText.trim() || !!loadError}
            style={{
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Applying…' : 'Apply updates'}
          </button>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
            Close
          </button>
        </div>
        {(result.applied > 0 || result.errors.length > 0) && (
          <div style={{ marginTop: '12px', padding: '8px', background: '#f9f9f9', borderRadius: '6px', fontSize: '13px' }}>
            <strong>Result:</strong> {result.applied} updated.
            {result.errors.length > 0 && (
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', maxHeight: '120px', overflow: 'auto' }}>
                {result.errors.slice(0, 15).map((err, i) => (
                  <li key={i} style={{ color: '#c0392b' }}>{err}</li>
                ))}
                {result.errors.length > 15 && <li>… and {result.errors.length - 15} more</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </DraggableModal>
  );
}
