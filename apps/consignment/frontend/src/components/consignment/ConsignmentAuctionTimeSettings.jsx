import React, { useEffect, useState } from 'react';
import { saveAuctionEndHour } from '../../services/consignmentService.js';
import { auctionEndFrom, auctionEndHour, formatDateTime, formatEndHour } from '../../utils/consignmentAuctionDates.js';
import { shopParts, shopTime } from '../../utils/consignmentTimeZone.js';
import { ConsignmentSettingsSaveBar } from './ConsignmentSettingsSection.jsx';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** Admin → Settings: the Colorado hour every auction ends. Applies to auctions started after saving. */
export default function ConsignmentAuctionTimeSettings({ settings, onError, onSaved }) {
  const [baseline, setBaseline] = useState(() => auctionEndHour(settings));
  const [hour, setHour] = useState(baseline);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const columnMissing = settings && !('auction_end_hour' in settings);

  useEffect(() => {
    const next = auctionEndHour(settings);
    setBaseline(next);
    setHour(next);
  }, [settings?.auction_end_hour]);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      await saveAuctionEndHour(hour);
      setBaseline(hour);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const today = shopParts();
  const exampleStart = shopTime(today.year, today.month, today.day, 2, 0);

  return (
    <>
      <div className="cs-set-group">
        <label className="cs-set-inline" htmlFor="cs-auction-end-hour">
          Auctions end at:
          <select
            id="cs-auction-end-hour"
            value={hour}
            onChange={(e) => { setHour(Number(e.target.value)); setSaved(false); }}
          >
            {HOURS.map((h) => <option key={h} value={h}>{formatEndHour(h)}</option>)}
          </select>
          Colorado time
        </label>
        <p className="cs-set-example">
          Example: a 7-day auction started {formatDateTime(exampleStart)} ends{' '}
          <strong>{formatDateTime(auctionEndFrom(exampleStart, 7, hour))}</strong>.
        </p>
        <p className="cs-hint">
          Sellers pick 7 or 14 days. The auction ends at this time on the last day, and bids in the final minutes still extend it.
          Changing it only affects auctions started afterward.
        </p>
        {columnMissing ? (
          <p className="cs-error">Run supabase-migrations/consignment-auction-length-2026-11.sql in Supabase before saving.</p>
        ) : null}
      </div>
      <ConsignmentSettingsSaveBar
        dirty={hour !== baseline}
        busy={busy}
        saved={saved}
        onSave={save}
        onReset={() => setHour(baseline)}
      />
    </>
  );
}
