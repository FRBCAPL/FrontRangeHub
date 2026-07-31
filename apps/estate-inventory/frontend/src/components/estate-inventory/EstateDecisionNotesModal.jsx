import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatEstateDisplayDate } from '@shared/utils/estateInventoryConstants.js';

const TOPICS = [
  { value: 'disputed_item', label: 'Disputed item' },
  { value: 'distribution_override', label: 'Distribution override' },
  { value: 'interim_distribution', label: 'Interim distribution' },
  { value: 'equalization', label: 'Equalization' },
  { value: 'general', label: 'General explanation' }
];

/**
 * PR decision / explanation notes (activity-log based supporting trail).
 */
const EstateDecisionNotesModal = ({
  open,
  onClose,
  caseNumber,
  defaultTopic = 'general',
  relatedId = '',
  itemId = '',
  distributionId = '',
  onMessage
}) => {
  const [topic, setTopic] = useState(defaultTopic);
  const [note, setNote] = useState('');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const result = await estateInventoryService.listDecisionNotes(caseNumber, 80);
    if (!result.success) {
      setRows([]);
      if (!/OS-quality|Unknown event/i.test(result.error || '')) {
        setError(result.error || '');
      }
      return;
    }
    setError('');
    setRows(result.data || []);
  };

  useEffect(() => {
    if (!open) return;
    setTopic(defaultTopic || 'general');
    setNote('');
    setError('');
    load();
  }, [open, caseNumber, defaultTopic]);

  if (!open) return null;

  const save = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    const result = await estateInventoryService.addDecisionNote({
      caseNumber,
      topic,
      note,
      relatedId,
      itemId,
      distributionId
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save decision note.');
      return;
    }
    setNote('');
    onMessage?.('Decision note saved to the administration trail.');
    await load();
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-decision-notes-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div>
            <h3 id="ei-decision-notes-title">Decision / explanation notes</h3>
            <p className="ei-settings-hint" style={{ margin: '0.2rem 0 0' }}>
              Short supporting explanations for disputed items, overrides, and interim
              distributions. Included in the activity chronology for counsel review.
            </p>
          </div>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          {error ? <div className="ei-error">{error}</div> : null}
          <form className="ei-modal-form" onSubmit={save}>
            <div className="ei-field">
              <label htmlFor="ei-decision-topic">Topic</label>
              <select
                id="ei-decision-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {TOPICS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="ei-field">
              <label htmlFor="ei-decision-note">Explanation</label>
              <textarea
                id="ei-decision-note"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this decision was made / how the override was explained to heirs…"
                required
                minLength={3}
                maxLength={500}
              />
            </div>
            <div className="ei-btn-row">
              <button type="submit" className="ei-btn" disabled={busy}>
                {busy ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </form>
          <h4 className="ei-settings-hint" style={{ marginTop: '1.25rem' }}>
            Recent notes
          </h4>
          {!rows.length ? (
            <p className="ei-settings-hint">No decision notes yet.</p>
          ) : (
            <ul className="ei-decision-notes-list">
              {rows.map((row) => (
                <li key={row.id}>
                  <strong>
                    {formatEstateDisplayDate(row.created_at) ||
                      String(row.created_at || '').slice(0, 10)}
                  </strong>
                  <span>
                    {row.metadata?.topic ? `${row.metadata.topic}: ` : ''}
                    {row.metadata?.note || row.summary}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstateDecisionNotesModal;
