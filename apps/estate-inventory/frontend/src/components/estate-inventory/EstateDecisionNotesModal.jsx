import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatEstateDisplayDate } from '@shared/utils/estateInventoryConstants.js';

const TOPICS = [
  { value: 'sale_disposition', label: 'Sale / disposition' },
  { value: 'disputed_item', label: 'Disputed item' },
  { value: 'distribution_override', label: 'Distribution override' },
  { value: 'interim_distribution', label: 'Interim distribution' },
  { value: 'equalization', label: 'Equalization' },
  { value: 'general', label: 'General explanation' }
];

const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.value, t.label]));

/** Optional structured prompts — still saved as one text note (no new schema). */
const REASON_CHIPS = [
  { id: 'comps', label: 'Market / comps reviewed' },
  { id: 'offers', label: 'Multiple offers received' },
  { id: 'family', label: 'Family agreed' },
  { id: 'counsel', label: 'Counsel reviewed / approved' }
];

function topicLabel(value) {
  return TOPIC_LABELS[value] || value || 'Note';
}

/**
 * PR decision / explanation notes (activity-log based supporting trail).
 * Thin “why this sale/disposition?” capture — optional reason chips + free text.
 */
const EstateDecisionNotesModal = ({
  open,
  onClose,
  caseNumber,
  defaultTopic = 'general',
  relatedId = '',
  itemId = '',
  distributionId = '',
  itemName = '',
  promptMode = false,
  onMessage
}) => {
  const [topic, setTopic] = useState(defaultTopic);
  const [note, setNote] = useState('');
  const [chips, setChips] = useState(() => new Set());
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
    let notes = result.data || [];
    if (itemId) {
      notes = notes.filter((row) => String(row.metadata?.item_id || '') === String(itemId));
    } else if (distributionId) {
      notes = notes.filter(
        (row) => String(row.metadata?.distribution_id || '') === String(distributionId)
      );
    }
    setRows(notes);
  };

  useEffect(() => {
    if (!open) return;
    setTopic(defaultTopic || 'general');
    setNote('');
    setChips(new Set());
    setError('');
    load();
  }, [open, caseNumber, defaultTopic, itemId, distributionId]);

  if (!open) return null;

  const toggleChip = (id) => {
    setChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const composeNote = () => {
    const selected = REASON_CHIPS.filter((c) => chips.has(c.id)).map((c) => c.label);
    const body = String(note || '').trim();
    if (!selected.length) return body;
    const chipLine = selected.join('; ');
    return body ? `${chipLine}. ${body}` : chipLine;
  };

  const save = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    const composed = composeNote();
    if (composed.length < 3) {
      setBusy(false);
      setError('Add a short explanation, or tap at least one reason above.');
      return;
    }
    const result = await estateInventoryService.addDecisionNote({
      caseNumber,
      topic,
      note: composed,
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
    setChips(new Set());
    onMessage?.('Decision note saved to the administration trail.');
    if (promptMode) {
      onClose?.();
      return;
    }
    await load();
  };

  const contextLine = itemName
    ? `For “${itemName}”.`
    : distributionId
      ? 'For this distribution.'
      : null;

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
            <h3 id="ei-decision-notes-title">
              {promptMode ? 'Why this decision?' : 'Decision / explanation notes'}
            </h3>
            <p className="ei-settings-hint" style={{ margin: '0.2rem 0 0' }}>
              {promptMode
                ? 'Optional but protective — record why this sale or disposition was reasonable. Included in the administration chronology.'
                : 'Short supporting explanations for sales, disputed items, overrides, and distributions. Included in the activity chronology for counsel review.'}
              {contextLine ? ` ${contextLine}` : ''}
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
              <span className="ei-field-label" id="ei-decision-reasons-label">
                Reasons (optional)
              </span>
              <div
                className="ei-decision-reason-chips"
                role="group"
                aria-labelledby="ei-decision-reasons-label"
              >
                {REASON_CHIPS.map((chip) => {
                  const on = chips.has(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={`ei-decision-reason-chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleChip(chip.id)}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ei-field">
              <label htmlFor="ei-decision-note">Explanation</label>
              <textarea
                id="ei-decision-note"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  promptMode
                    ? 'e.g. Sold to John for $8,000 — KBB low retail range; three offers; siblings agreed…'
                    : 'Why this decision was made / how it was explained…'
                }
                maxLength={500}
              />
            </div>
            <div className="ei-btn-row">
              <button type="submit" className="ei-btn" disabled={busy}>
                {busy ? 'Saving…' : promptMode ? 'Save decision note' : 'Save note'}
              </button>
              {promptMode ? (
                <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
                  Skip for now
                </button>
              ) : null}
            </div>
          </form>
          {!promptMode ? (
            <>
              <h4 className="ei-settings-hint" style={{ marginTop: '1.25rem' }}>
                {itemId || distributionId ? 'Notes for this record' : 'Recent notes'}
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
                        {row.metadata?.topic
                          ? `${topicLabel(row.metadata.topic)}: `
                          : ''}
                        {row.metadata?.note || row.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EstateDecisionNotesModal;
