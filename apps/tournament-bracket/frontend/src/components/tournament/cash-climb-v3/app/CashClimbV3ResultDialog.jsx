import React, { useEffect, useState } from 'react';
import { matchOccupants } from '../cashClimbV3Progress.js';
import { previewCashClimbV3Result } from './cashClimbV3Play.js';
import { OUTCOME_OPTIONS, outcomeExplanation, submissionFrom } from './cashClimbV3Outcomes.js';
import { matchTitle, money, playerNameOf, resultText } from './cashClimbV3View.js';
import { entryLabel } from './cashClimbV3Earnings.js';
import CashClimbV3Dialog from './CashClimbV3Dialog.jsx';

const BLANK = { outcome: 'completed', winner: '', loserRacks: '', player: '', racks: ['', ''] };

/**
 * Result entry for a ready match: choose the outcome, review exactly what the engine will post (payouts,
 * automatic walkovers), then confirm. `onPost(submitted)` saves and returns (or resolves to) { status,
 * problems, refreshed }; `refreshed` means a newer copy from another device is now shown, so the review
 * starts again. `onOpen()` asks for the latest copy when the dialog opens. If the match gets a result from
 * another device meanwhile, the dialog says so and posts nothing.
 */
export default function CashClimbV3ResultDialog({ record, matchId, onPost, onClose, onOpen }) {
  const [form, setForm] = useState(BLANK);
  const [preview, setPreview] = useState(null);
  const [problems, setProblems] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { onOpen?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const match = record.event.matches[matchId];
  if (match.status !== 'open') {
    return (
      <CashClimbV3Dialog title={matchTitle(match)} onClose={onClose}>
        <p className="ccv3-problems" role="alert">
          This match already has a result from another device: {resultText(record, match)}. Nothing was posted from this tablet.
        </p>
        <div className="form-actions"><button type="button" className="btn-secondary" onClick={onClose}>Close</button></div>
      </CashClimbV3Dialog>
    );
  }
  const ids = matchOccupants(record.event, matchId).map((o) => o.id);
  const name = playerNameOf(record);
  const raceTo = record.event.config.raceTo;
  const rackOptions = Array.from({ length: raceTo }, (_, n) => n);
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setPreview(null); setProblems([]); };
  const submitted = submissionFrom(form, ids);

  const review = () => {
    const p = previewCashClimbV3Result(record, matchId, submitted);
    if (p.status !== 'ok') { setProblems(p.problems); return; }
    setPreview(p);
  };
  const post = async () => {
    if (busy) return;
    setBusy(true);
    const r = await onPost(submitted);
    if (r.status === 'ok') return;
    if (r.refreshed) setPreview(null);
    setProblems(r.problems);
    setBusy(false);
  };
  const playerSelect = (label, value, onChange) => (
    <label>{label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose player</option>
        {ids.map((id) => <option key={id} value={id}>{name(id)}</option>)}
      </select>
    </label>
  );
  const rackSelect = (label, value, onChange) => (
    <label>{label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Racks</option>
        {rackOptions.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
  const sections = preview ? [{ id: matchId, auto: null }, ...preview.autoResolved.map((a) => ({ id: a.id, auto: a }))] : [];

  return (
    <CashClimbV3Dialog title={`${matchTitle(match)}: ${ids.map(name).join(' vs ')}`} onClose={onClose} busy={busy}>
      {!preview ? (
        <div className="ccv3-form">
          <label>Outcome
            <select value={form.outcome} onChange={(e) => set({ ...BLANK, outcome: e.target.value })}>
              {OUTCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {form.outcome === 'completed' ? (
            <>
              {playerSelect(`Winner (reached ${raceTo})`, form.winner, (winner) => set({ winner }))}
              {rackSelect('Loser\'s racks', form.loserRacks, (loserRacks) => set({ loserRacks }))}
            </>
          ) : null}
          {form.outcome === 'forfeit' ? playerSelect('Player who forfeits', form.player, (player) => set({ player })) : null}
          {form.outcome === 'withdrawal' ? playerSelect('Player who withdraws', form.player, (player) => set({ player })) : null}
          {form.outcome.endsWith('withdrawal') ? ids.map((id, i) => (
            <React.Fragment key={id}>{rackSelect(`Racks won by ${name(id)} when play stopped`, form.racks[i], (v) => set({ racks: form.racks.map((x, j) => (j === i ? v : x)) }))}</React.Fragment>
          )) : null}
          <p className="cc-setup-note">{outcomeExplanation(match, form.outcome)}</p>
        </div>
      ) : (
        <div className="ccv3-review">
          <p><strong>{resultText(record, { result: preview.result })}</strong></p>
          <p className="cc-setup-note">{outcomeExplanation(match, preview.result.outcome)}</p>
          <h4>Payouts this posts</h4>
          {sections.map(({ id, auto }) => {
            const entries = preview.entries.filter((e) => e.matchId === id);
            return (
              <div key={id}>
                {auto ? <p className="cc-setup-note">Then automatically, {matchTitle(record.event.matches[id])}: {resultText(record, { result: { outcome: auto.status, winner: auto.winner } })}</p> : null}
                {entries.length ? (
                  <ul className="ccv3-entries">
                    {entries.map((e) => <li key={e.key}><span>{name(e.playerId)}: {entryLabel(e.type)}</span><strong>{money(e.cents)}</strong></li>)}
                  </ul>
                ) : <p className="cc-setup-note ccv3-muted">No payout.</p>}
              </div>
            );
          })}
          <p className="cc-setup-note ccv3-muted">Once posted, this result cannot be changed.</p>
        </div>
      )}
      {problems.length ? <ul className="ccv3-problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
      <div className="form-actions">
        {preview ? <button type="button" className="btn-secondary" onClick={() => setPreview(null)} disabled={busy}>Change</button>
          : <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>}
        {preview ? <button type="button" className="btn-primary" onClick={post} disabled={busy}>{busy ? 'Posting…' : 'Confirm and post result'}</button>
          : <button type="button" className="btn-primary" onClick={review}>Review result</button>}
      </div>
    </CashClimbV3Dialog>
  );
}
