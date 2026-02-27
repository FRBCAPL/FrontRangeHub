import React, { useState, useEffect, useMemo } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

/**
 * Normalize name for matching: lowercase, collapse spaces, trim.
 */
function normalizeName(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Parse one line: "Name\tFargo", "Name, Fargo", or "Name   Fargo".
 * Returns { name, fargo } or null if invalid.
 */
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let name = '';
  let fargoStr = '';
  if (trimmed.includes('\t')) {
    const idx = trimmed.indexOf('\t');
    name = trimmed.slice(0, idx).trim();
    fargoStr = trimmed.slice(idx + 1).trim();
  } else if (trimmed.includes(',')) {
    const idx = trimmed.indexOf(',');
    name = trimmed.slice(0, idx).trim();
    fargoStr = trimmed.slice(idx + 1).trim();
  } else {
    const match = trimmed.match(/^(.+?)\s+(\d+)\s*$/);
    if (match) {
      name = match[1].trim();
      fargoStr = match[2].trim();
    } else return null;
  }
  if (!name) return null;
  const fargo = fargoStr === '' || fargoStr.toLowerCase() === 'null' ? null : parseInt(fargoStr, 10);
  if (fargoStr !== '' && fargoStr.toLowerCase() !== 'null' && (isNaN(fargo) || fargo < 0)) return null;
  return { name, fargo };
}

/**
 * Simple similarity: share first word and last word, or one contains the other.
 */
function isCloseMatch(pastedName, playerFirst, playerLast) {
  const n = normalizeName(pastedName);
  const first = (playerFirst || '').trim().toLowerCase();
  const last = (playerLast || '').trim().toLowerCase();
  const full = `${first} ${last}`.trim();
  const fullReverse = `${last} ${first}`.trim();
  if (n === full || n === fullReverse) return true;
  const pastedParts = n.split(/\s+/).filter(Boolean);
  const firstMatch = pastedParts.some(p => first.startsWith(p) || p.startsWith(first) || first === p);
  const lastMatch = pastedParts.some(p => last.startsWith(p) || p.startsWith(last) || last === p);
  if (pastedParts.length >= 2 && firstMatch && lastMatch) return true;
  if (full && n.includes(full)) return true;
  if (full && full.includes(n)) return true;
  return false;
}

const LADDER_OPTIONS = [
  { name: '499-under', displayName: '499 & Under' },
  { name: '500-549', displayName: '500-549' },
  { name: '550-plus', displayName: '550+' }
];

/**
 * In-app bulk Fargo update: paste "Name\tFargo" or "Name, Fargo" lines,
 * match to ladder players (exact + close match), review/select, then apply.
 */
export default function BulkFargoUpdateModal({ ladderName, onClose, onSuccess }) {
  const [selectedLadder, setSelectedLadder] = useState(ladderName || '499-under');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState('paste'); // 'paste' | 'review' | 'result'
  const [parsedRows, setParsedRows] = useState([]); // { pastedName, fargo, selectedUserId, candidates }
  const [result, setResult] = useState({ applied: 0, skipped: 0, errors: [] });

  useEffect(() => {
    setSelectedLadder(prev => ladderName && ladderName !== prev ? ladderName : prev);
  }, [ladderName]);

  useEffect(() => {
    if (!selectedLadder) return;
    let cancelled = false;
    setLoadError('');
    (async () => {
      const res = await supabaseDataService.getLadderPlayersByNameIncludingInactive(selectedLadder);
      if (cancelled) return;
      if (!res.success) {
        setLoadError(res.error || 'Failed to load players');
        setPlayers([]);
        return;
      }
      setPlayers(res.data || []);
    })();
    return () => { cancelled = true; };
  }, [selectedLadder]);

  const playerOptions = useMemo(() => {
    return (players || []).map(p => {
      const uid = p.user_id || p.users?.id;
      const first = (p.users?.first_name ?? p.first_name ?? '').trim();
      const last = (p.users?.last_name ?? p.last_name ?? '').trim();
      const displayName = `${first} ${last}`.trim() || 'Unknown';
      const position = p.position != null ? p.position : null;
      const currentFargo = p.fargo_rate != null && p.fargo_rate !== '' ? p.fargo_rate : null;
      const lmsName = (p.lms_name ?? '').trim() || null;
      return { userId: uid, displayName, first, last, position, currentFargo, lmsName };
    }).filter(p => p.userId);
  }, [players]);

  /** Treat LMS name as "first last" for close matching (split on first space). */
  function isCloseMatchLms(pastedName, lmsNameStr) {
    if (!lmsNameStr || !pastedName) return false;
    const parts = normalizeName(lmsNameStr).split(/\s+/).filter(Boolean);
    if (parts.length === 0) return false;
    const lmsFirst = parts[0];
    const lmsLast = parts.slice(1).join(' ');
    return isCloseMatch(pastedName, lmsFirst, lmsLast);
  }

  const parseAndMatch = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      const { name: pastedName, fargo } = parsed;
      const n = normalizeName(pastedName);

      const candidates = [];
      for (const p of playerOptions) {
        const pFull = normalizeName(`${p.first} ${p.last}`);
        const lmsNorm = p.lmsName ? normalizeName(p.lmsName) : '';
        if (pFull === n) {
          candidates.push({ userId: p.userId, displayName: p.displayName, matchType: 'exact', position: p.position, currentFargo: p.currentFargo });
        } else if (p.lmsName && lmsNorm === n) {
          candidates.push({ userId: p.userId, displayName: p.displayName, matchType: 'lms_exact', position: p.position, currentFargo: p.currentFargo });
        } else if (isCloseMatch(pastedName, p.first, p.last)) {
          candidates.push({ userId: p.userId, displayName: p.displayName, matchType: 'close', position: p.position, currentFargo: p.currentFargo });
        } else if (p.lmsName && isCloseMatchLms(pastedName, p.lmsName)) {
          candidates.push({ userId: p.userId, displayName: p.displayName, matchType: 'lms_close', position: p.position, currentFargo: p.currentFargo });
        }
      }
      const fallbackCandidates = playerOptions.map(p => ({ userId: p.userId, displayName: p.displayName, matchType: 'none', position: p.position, currentFargo: p.currentFargo }));
      const selectedUserId = candidates.find(c => c.matchType === 'exact')?.userId
        ?? candidates.find(c => c.matchType === 'lms_exact')?.userId
        ?? candidates[0]?.userId
        ?? null;
      rows.push({
        pastedName,
        fargo,
        selectedUserId,
        candidates: candidates.length ? candidates : fallbackCandidates
      });
    }
    setParsedRows(rows);
    setStep('review');
  };

  const setRowSelection = (rowIndex, userId) => {
    setParsedRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, selectedUserId: userId || null } : row));
  };

  const handleApply = async () => {
    if (!selectedLadder) return;
    setLoading(true);
    setResult({ applied: 0, skipped: 0, errors: [] });
    const errors = [];
    let applied = 0;
    for (const row of parsedRows) {
      if (!row.selectedUserId) {
        errors.push(`No player selected: ${row.pastedName}`);
        continue;
      }
      try {
        const updateRes = await supabaseDataService.updatePlayer(row.selectedUserId, {
          fargoRate: row.fargo,
          ladderName: selectedLadder
        });
        if (updateRes && updateRes.success) applied++;
        else errors.push(`${row.pastedName}: ${(updateRes && updateRes.error) || 'Update failed'}`);
      } catch (e) {
        errors.push(`${row.pastedName}: ${e.message || String(e)}`);
      }
    }
    setResult({ applied, skipped: parsedRows.length - applied - errors.length, errors });
    setLoading(false);
    setStep('result');
    if (applied > 0 && typeof onSuccess === 'function') onSuccess();
  };

  const backToPaste = () => {
    setStep('paste');
    setParsedRows([]);
    setResult({ applied: 0, skipped: 0, errors: [] });
  };

  const onLadderChange = (e) => {
    const next = e.target.value;
    setSelectedLadder(next);
    if (step === 'review') {
      setStep('paste');
      setParsedRows([]);
    }
  };

  const text = { color: '#e2e2e2' };
  const textMuted = { color: '#aaa' };
  const blockBg = { background: '#1e1e2e', color: '#e2e2e2' };
  const inputBg = { background: '#2d2d3d', color: '#e2e2e2', border: '1px solid rgba(255,255,255,0.15)' };
  const ladderLabel = LADDER_OPTIONS.find(o => o.name === selectedLadder)?.displayName || selectedLadder;

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title={`Bulk Fargo Update — ${ladderLabel}`}
      maxWidth="780px"
      maxHeight="90vh"
    >
      <div style={{ padding: '8px 0', ...blockBg }}>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ ...text, fontSize: '14px', fontWeight: 600 }}>Ladder:</span>
          <select
            value={selectedLadder}
            onChange={onLadderChange}
            style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '14px', ...inputBg }}
          >
            {LADDER_OPTIONS.map(opt => (
              <option key={opt.name} value={opt.name}>{opt.displayName}</option>
            ))}
          </select>
        </div>
        {step === 'paste' && (
          <>
            <p style={{ margin: '0 0 8px 0', ...text, fontSize: '14px' }}>
              Paste one line per player. Supported formats:
            </p>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px', ...textMuted, fontSize: '13px' }}>
              <li><strong>Name tab Fargo</strong> (e.g. from spreadsheet): <code style={{ color: '#e2e2e2', background: '#2d2d3d', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>Alex Smith	560</code></li>
              <li><strong>Name, Fargo</strong>: <code style={{ color: '#e2e2e2', background: '#2d2d3d', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>Alex Smith, 560</code></li>
              <li><strong>Name space Fargo</strong>: <code style={{ color: '#e2e2e2', background: '#2d2d3d', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>Alex Smith 560</code></li>
            </ul>
            <pre style={{ background: '#2d2d3d', color: '#c8c8c8', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              {`Alex Smith\t560\nJordan Lee\t543\nSam Taylor\t530`}
            </pre>
            {loadError && <p style={{ color: '#ff6b6b', marginBottom: '8px' }}>{loadError}</p>}
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste names and Fargo ratings (one per line)"
              rows={10}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px', fontSize: '13px', resize: 'vertical', ...inputBg }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={parseAndMatch}
                disabled={!pasteText.trim() || !!loadError}
                style={{
                  background: 'linear-gradient(135deg, #3498db, #2980b9)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Parse & match to ladder
              </button>
              <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#e2e2e2', background: '#2d2d3d', border: '1px solid rgba(255,255,255,0.2)' }}>
                Close
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <p style={{ margin: '0 0 10px 0', ...text, fontSize: '14px' }}>
              Confirm or select the ladder player for each row. Shown: current rank and Fargo, then new Fargo. Exact matches are pre-selected.
            </p>
            <div style={{ maxHeight: '50vh', overflow: 'auto', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', background: '#252535' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', ...text }}>
                <thead>
                  <tr style={{ background: '#2d2d3d' }}>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#e2e2e2' }}>Pasted name</th>
                    <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#e2e2e2' }}>Current #</th>
                    <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#e2e2e2' }}>Current Fargo</th>
                    <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#e2e2e2' }}>New Fargo</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#e2e2e2' }}>Match to ladder player</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => {
                    const selectedCandidate = row.candidates.find(c => c.userId === row.selectedUserId);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: i % 2 === 0 ? '#252535' : '#2a2a3a' }}>
                        <td style={{ padding: '8px', color: '#e2e2e2' }}>{row.pastedName}</td>
                        <td style={{ padding: '8px', color: '#e2e2e2', textAlign: 'center' }}>{selectedCandidate?.position != null ? `#${selectedCandidate.position}` : '—'}</td>
                        <td style={{ padding: '8px', color: '#e2e2e2', textAlign: 'center' }}>{selectedCandidate?.currentFargo != null ? selectedCandidate.currentFargo : '—'}</td>
                        <td style={{ padding: '8px', color: '#e2e2e2', textAlign: 'center', fontWeight: 600 }}>{row.fargo ?? '—'}</td>
                        <td style={{ padding: '8px' }}>
                          <select
                            value={row.selectedUserId || ''}
                            onChange={(e) => setRowSelection(i, e.target.value || null)}
                            style={{ width: '100%', minWidth: '160px', maxWidth: '220px', padding: '6px 8px', borderRadius: '4px', ...inputBg }}
                          >
                            <option value="">— Skip / no match —</option>
                            {row.candidates.map((c, j) => (
                              <option key={j} value={c.userId}>
                                {c.matchType === 'exact' ? '✓ ' : c.matchType === 'lms_exact' ? '✓ (LMS) ' : c.matchType === 'close' ? '~ ' : c.matchType === 'lms_close' ? '~ (LMS) ' : ''}{c.displayName}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleApply}
                disabled={loading || parsedRows.every(r => !r.selectedUserId)}
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
              <button type="button" onClick={backToPaste} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#e2e2e2', background: '#2d2d3d', border: '1px solid rgba(255,255,255,0.2)' }}>
                Back to paste
              </button>
              <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#e2e2e2', background: '#2d2d3d', border: '1px solid rgba(255,255,255,0.2)' }}>
                Close
              </button>
            </div>
          </>
        )}

        {step === 'result' && (
          <>
            <div style={{ marginBottom: '12px', padding: '12px', background: '#2d2d3d', color: '#e2e2e2', borderRadius: '6px', fontSize: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <strong>Result:</strong> {result.applied} updated.
              {result.errors.length > 0 && (
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', maxHeight: '140px', overflow: 'auto' }}>
                  {result.errors.slice(0, 20).map((err, i) => (
                    <li key={i} style={{ color: '#ff6b6b' }}>{err}</li>
                  ))}
                  {result.errors.length > 20 && <li style={{ color: '#e2e2e2' }}>… and {result.errors.length - 20} more</li>}
                </ul>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={backToPaste} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#e2e2e2', background: '#2d2d3d', border: '1px solid rgba(255,255,255,0.2)' }}>
                Paste more
              </button>
              <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#e2e2e2', background: '#2d2d3d', border: '1px solid rgba(255,255,255,0.2)' }}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </DraggableModal>
  );
}
