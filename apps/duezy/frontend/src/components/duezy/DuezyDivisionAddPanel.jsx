import React from 'react';
import { divisionReady } from '../../utils/duezyDivisions.js';
import { canAddDivisions } from '../../utils/duezyBillingText.js';
import { divisionCostNote } from '../../utils/duezyPricingText.js';
import DuezyDivisionCard from './DuezyDivisionCard.jsx';
import DuezyTrialLimitNote from './DuezyTrialLimitNote.jsx';
import { seasonTerms } from '../../utils/duezyTerms.js';

/**
 * New-division form in Settings. For a league that has no division rows yet (`multi` false) it also
 * asks what to call the division its current teams are in, since adding one converts the league.
 */
export default function DuezyDivisionAddPanel({
  league, draft, setDraft, multi, index, currentName, setCurrentName, access, busy, onSave, onCancel,
}) {
  const allowed = canAddDivisions(access, 1);
  const canSave = divisionReady(draft) && (multi || currentName.trim()) && allowed;
  return (
    <section className="dz-card dz-stack">
      <div>
        <span className="dz-eyebrow">New division</span>
        <h2 className="dz-h3">Add a night, skill level or format</h2>
      </div>
      {!multi ? (
        <label className="dz-field">
          <span>First, name the division your current teams are in</span>
          <input value={currentName} onChange={(e) => setCurrentName(e.target.value)} placeholder={`e.g. ${league.play_day || 'Tuesday'} division`} maxLength={60} />
        </label>
      ) : null}
      <DuezyDivisionCard draft={draft} sport={league.sport} index={index} word={seasonTerms(league).one} defaultGrace={Number(league.grace_days) || 0} onChange={(c) => setDraft((p) => ({ ...p, ...c }))}>
        {!allowed ? <DuezyTrialLimitNote access={access} /> : null}
        {allowed && divisionCostNote(access) ? <p className="dz-bill-hint">{divisionCostNote(access)}</p> : null}
        <div className="dz-row">
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={onSave} disabled={!canSave || busy}>
            {busy ? 'Saving…' : 'Save division'}
          </button>
        </div>
      </DuezyDivisionCard>
    </section>
  );
}
