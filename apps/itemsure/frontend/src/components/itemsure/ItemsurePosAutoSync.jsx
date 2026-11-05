import React, { useCallback, useEffect, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { getPosAutoStatus, setPosAutoSync } from '../../services/itemsurePosAutoService.js';
import { scheduleText, schedulerMissing, WEEKDAYS, zoneText } from '../../utils/itemsurePosSchedule.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { Card, ErrorNote } from './ItemsureUi.jsx';

const formFrom = (s) => ({ on: Boolean(s.on), frequency: s.frequency || 'weekly', weekday: s.weekday ?? 0, time: s.time || '23:00' });
const same = (a, b) => a.on === b.on && a.frequency === b.frequency && a.weekday === b.weekday && a.time === b.time;

/**
 * Settings → Point of sale: bring in Clover sales on a schedule (daily or weekly, any time, in the
 * Clover site's time zone). Shows the next and last import, problems, and a clear warning while
 * no scheduler is running. `siteKey` reloads it when the Clover site changes.
 */
export default function ItemsurePosAutoSync({ organizationId, canManage, siteKey }) {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(null);
  const { busy, error, run } = useItemsureAction();

  const load = useCallback(async () => {
    try {
      const s = await getPosAutoStatus(organizationId);
      setStatus(s);
      if (!s.missing) setForm(formFrom(s));
    } catch {
      setStatus({ failed: true });
    }
  }, [organizationId]);
  useEffect(() => {
    load();
  }, [load, siteKey]);

  if (!status || status.failed || (!status.missing && !status.connected)) return null;
  if (status.missing) {
    return (
      <Card title="Get new sales from Clover automatically">
        <p className="isu-muted">This needs a database update first. Nothing else is affected.</p>
      </Card>
    );
  }

  const saved = formFrom(status);
  const changed = form && !same(form, saved);
  const zone = zoneText(status.zone);
  const save = async () => {
    if (await run(() => setPosAutoSync(organizationId, form))) await load();
  };
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Card title="Get new sales from Clover automatically">
      <p className="isu-muted isu-small">
        ItemSure brings in your Clover sales on a schedule, so they&apos;re ready without pressing a button. It only reads from Clover and doesn&apos;t change stock.
      </p>

      {!status.location_id ? (
        <p className="isu-muted isu-small">Choose which site Clover sells from (above) first. Its time zone is used for the schedule.</p>
      ) : canManage && form ? (
        <div className="isu-pos-auto-form">
          <label className="isu-check">
            <input type="checkbox" checked={form.on} disabled={busy} onChange={(e) => set({ on: e.target.checked })} />
            <span>Bring in sales automatically</span>
          </label>
          {form.on ? (
            <>
              <div className="isu-tabs isu-pos-auto-often" role="radiogroup" aria-label="How often">
                {[['weekly', 'Weekly'], ['daily', 'Daily']].map(([id, label]) => (
                  <button key={id} type="button" role="radio" aria-checked={form.frequency === id} className={`isu-tab${form.frequency === id ? ' is-active' : ''}`} disabled={busy} onClick={() => set({ frequency: id })}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="isu-pos-auto-when">
                {form.frequency === 'weekly' ? (
                  <label>
                    <span>Day</span>
                    <select value={form.weekday} disabled={busy} onChange={(e) => set({ weekday: Number(e.target.value) })}>
                      {WEEKDAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
                    </select>
                  </label>
                ) : null}
                <label>
                  <span>Time</span>
                  <input type="time" value={form.time} disabled={busy} required onChange={(e) => set({ time: e.target.value || form.time })} />
                </label>
              </div>
              <p className="isu-small"><strong>{scheduleText(form)}</strong> <span className="isu-muted">({zone})</span></p>
            </>
          ) : null}
          {changed ? (
            <div className="isu-pos-actions">
              <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save schedule'}</button>
              <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setForm(saved)}>Cancel</button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="isu-small">{status.on ? <><strong>{scheduleText(saved)}</strong> <span className="isu-muted">({zone})</span></> : 'Off. Sales come in when someone brings them in.'}</p>
      )}
      <ErrorNote message={error} />

      {status.on ? (
        <div className="isu-pos-auto-status">
          {schedulerMissing(status) ? (
            <p className="isu-notice isu-notice--warn" role="status">
              Automatic imports are set up but not running yet. Until they are, sales only come in when someone brings them in.
            </p>
          ) : null}
          {status.paused ? (
            <p className="isu-error" role="alert">Paused: {status.error} Fix the Clover connection, then tap Test connection to start again.</p>
          ) : status.error ? (
            <p className="isu-notice isu-notice--warn">The last try didn&apos;t work: {status.error} It will try again.</p>
          ) : null}
          <p className="isu-small">
            {status.paused ? 'No more imports until it is fixed.' : schedulerMissing(status) ? `Would next run ${formatWhen(status.next_at)}.` : `Next: ${formatWhen(status.next_at)}.`}
          </p>
          <p className="isu-muted isu-small">
            {status.ok_at ? `Last brought in ${formatWhen(status.ok_at)}, with sales up to ${formatWhen(status.ok_through)}.` : 'Not brought in automatically yet.'}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
