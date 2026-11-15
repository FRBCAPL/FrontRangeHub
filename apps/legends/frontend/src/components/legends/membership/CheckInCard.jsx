import React, { useEffect, useState } from 'react';
import { fetchMyCheckins, selfCheckin } from '../../../services/legendsCheckinService.js';

function sourceLabel(source) {
  if (source === 'clover_tab') return 'Tab at Legends';
  if (source === 'tablet') return 'Venue scan';
  if (source === 'geo_self') return 'Checked in at venue';
  return source || 'Visit';
}

/** Phone “I’m here” (geofenced) + today’s status. Tab check-ins arrive from CueSync later. */
export default function CheckInCard({ onUpdated }) {
  const [today, setToday] = useState(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    const data = await fetchMyCheckins();
    setToday(data.today);
    setCheckedInToday(Boolean(data.checkedInToday));
    setTodayCheckin(data.todayCheckin || null);
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    reload().catch((err) => {
      if (!cancelled) setError(err.message || 'Could not load check-in status.');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCheckIn() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!navigator.geolocation) {
        throw new Error('This device cannot share location. Use a tab at the bar, or the venue tablet.');
      }
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        });
      });
      const data = await selfCheckin(pos.coords.latitude, pos.coords.longitude);
      setMessage(data.message || 'Checked in.');
      setCheckedInToday(true);
      setTodayCheckin(data.checkin);
      const list = await reload();
      onUpdated?.(list);
    } catch (err) {
      const geoDenied = err?.code === 1 || /denied/i.test(String(err?.message || ''));
      setError(
        geoDenied
          ? 'Location permission is needed to check in without a tab. You can still check in when a tab opens at the bar.'
          : err.message || 'Could not check in.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lg-panel">
      <h2 className="lg-display lg-display--card">Tonight</h2>
      <p className="lg-card__copy lg-mt-3">
        Opening a tab at Legends will check you in automatically when CueSync is wired. If you are here without a tab,
        check in on your phone while at the venue.
      </p>
      {today ? <p className="lg-card__muted lg-mt-2">Denver date: {today}</p> : null}
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-3">{message}</p> : null}
      {checkedInToday ? (
        <p className="lg-admin-form__ok lg-mt-4">
          Checked in
          {todayCheckin?.source ? ` · ${sourceLabel(todayCheckin.source)}` : ''}
          {todayCheckin?.checkedInAt
            ? ` · ${new Date(todayCheckin.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : ''}
        </p>
      ) : (
        <button type="button" className="lg-btn lg-btn--primary lg-btn--md lg-mt-4" disabled={busy} onClick={onCheckIn}>
          {busy ? 'Checking…' : "I'm here — check in"}
        </button>
      )}
    </section>
  );
}

export function ActivityPanel({ checkins = null, loading = false }) {
  return (
    <section className="lg-panel">
      <h2 className="lg-display lg-display--card">Your activity</h2>
      <p className="lg-card__copy lg-mt-3">Recent Legends visits. Tournament and arcade history will join this list later.</p>
      {loading ? <p className="lg-card__muted lg-mt-4">Loading…</p> : null}
      {!loading && (!checkins || checkins.length === 0) ? (
        <p className="lg-empty lg-mt-4">No check-ins yet. Open a tab or use I’m here at the venue.</p>
      ) : null}
      {!loading && checkins?.length ? (
        <ul className="lg-checkin-list lg-mt-4">
          {checkins.map((row) => (
            <li key={row.id} className="lg-checkin-list__row">
              <span>{sourceLabel(row.source)}</span>
              <span className="lg-card__muted">
                {row.checkedInAt
                  ? new Date(row.checkedInAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : row.checkinDate}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
