import React, { useEffect, useState } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import { fetchLegendsContent } from '../../../services/legendsContentService.js';
import { fetchLegendsAuthStatus } from '../../../services/legendsMemberService.js';
import { fetchLegendsSummary } from '../../../services/legendsTodayService.js';

/** Staff-facing integration flags. Never shows secrets. */
export default function AdminStatusPanel() {
  const [rows, setRows] = useState([
    ['Supabase content', null],
    ['CueSync live tables', null],
    ['Email OTP (Resend)', null],
    ['SMS OTP (Twilio)', null],
    ['OTP dev echo (local)', null],
    ['Rewards points ledger', false],
    ['Achievement awards', false],
    ['Clover live transactions', false],
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let contentOk = false;
      let cuesyncOk = false;
      let auth = { email: false, sms: false, devEcho: false };
      try {
        await fetchLegendsContent();
        contentOk = true;
      } catch {
        contentOk = false;
      }
      try {
        const summary = await fetchLegendsSummary();
        cuesyncOk = Boolean(summary);
      } catch {
        cuesyncOk = false;
      }
      try {
        const status = await fetchLegendsAuthStatus();
        auth = status.auth || auth;
      } catch {
        /* ignore */
      }
      if (cancelled) return;
      setRows([
        ['Supabase content', contentOk],
        ['CueSync live tables', cuesyncOk],
        [`Email OTP (${auth.emailProvider || 'none'})`, Boolean(auth.email)],
        ['SMS OTP (Twilio)', Boolean(auth.sms)],
        ['OTP dev echo (local)', Boolean(auth.devEcho)],
        ['Rewards points ledger', false],
        ['Achievement awards', false],
        ['Clover live transactions', false],
        ['Hub API', Boolean(BACKEND_URL)],
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 className="lg-display lg-display--card">Staff status</h2>
      <p className="lg-card__muted lg-mt-2">
        Shows whether a service is reachable. It does not show secrets. Clover purchases, point earning, and achievement
        awards are not running. Publishing an event does not create points.
      </p>
      <ul className="lg-status-list lg-mt-6">
        {rows.map(([label, on]) => (
          <li key={label} className="lg-status-list__row">
            <span>{label}</span>
            <span className={on ? 'is-on' : 'is-off'}>
              {on === null ? 'Checking…' : on ? 'Configured' : 'Not configured'}
            </span>
          </li>
        ))}
      </ul>
      <p className="lg-card__muted lg-mt-6">
        Check-ins: <code>legends-checkins-2026-11.sql</code>. Clover name→confirm link:{' '}
        <code>legends-clover-match-2026-11.sql</code>. Ingest paid sales at <code>POST /api/legends-site/clover/ingest</code>{' '}
        (webhook secret or hub admin). Members confirm on My Legends; then <code>clover_customer_id</code> auto check-ins
        next time. Fallbacks: tablet Check in, or “I’m here” inside the geofence.
      </p>
    </div>
  );
}
