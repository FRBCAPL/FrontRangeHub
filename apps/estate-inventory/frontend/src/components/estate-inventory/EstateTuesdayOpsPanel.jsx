import React, { useMemo, useState } from 'react';
import {
  buildNoticeOfInventoryPortalSms,
  defaultFamilyPortalUrl,
  LOCKSMITH_ITEM_PRESET,
  PR_SELF_ACQUIRE_HINT
} from '@shared/utils/estateLegalOps.js';
import { CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';

/**
 * Tuesday operational boundaries for Case 26PR00440:
 * notice SMS copy, PR ≠ bidder reminder, locksmith first-entry shortcut.
 */
const EstateTuesdayOpsPanel = ({ onLogLocksmith }) => {
  const portalUrl = useMemo(() => defaultFamilyPortalUrl(), []);
  const [noticeText, setNoticeText] = useState(() =>
    buildNoticeOfInventoryPortalSms(portalUrl)
  );
  const [copyStatus, setCopyStatus] = useState('');

  const handleCopyNotice = async () => {
    setCopyStatus('');
    try {
      await navigator.clipboard.writeText(noticeText);
      setCopyStatus('Copied — paste into your Tuesday afternoon text to Matt and Karol.');
    } catch {
      setCopyStatus('Could not copy automatically — select the text and copy manually.');
    }
  };

  const refreshLink = () => {
    const url = defaultFamilyPortalUrl();
    setNoticeText(buildNoticeOfInventoryPortalSms(url));
    setCopyStatus('Portal link refreshed from this device.');
  };

  return (
    <section className="ei-tuesday-ops" aria-label={`Tuesday legal ops · Case ${CASE_NUMBER}`}>
      <h2 className="ei-tuesday-ops-title">Tuesday legal ops</h2>
      <p className="ei-settings-hint">
        Operational boundaries for Case {CASE_NUMBER}. Code cannot replace the text you send or the
        locksmith visit — these tools keep wording and first entries court-ready.
      </p>

      <div className="ei-tuesday-ops-block">
        <h3>3 · Notice of Inventory Portal</h3>
        <p className="ei-settings-hint">
          Send Tuesday afternoon after inventory has started (not when finished). Offering the paper
          path blocks “tech barrier” claims. Do not claim the inventory is complete.
        </p>
        <label className="ei-sr-only" htmlFor="ei-notice-sms">
          Notice SMS text
        </label>
        <textarea
          id="ei-notice-sms"
          className="ei-tuesday-ops-textarea"
          rows={8}
          value={noticeText}
          onChange={(e) => setNoticeText(e.target.value)}
        />
        <div className="ei-tuesday-ops-actions">
          <button type="button" className="ei-btn ei-btn-small" onClick={handleCopyNotice}>
            Copy notice text
          </button>
          <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={refreshLink}>
            Refresh portal link
          </button>
        </div>
        {copyStatus ? <p className="ei-status">{copyStatus}</p> : null}
      </div>

      <div className="ei-tuesday-ops-block">
        <h3>4 · PR is not a public bidder</h3>
        <p className="ei-settings-hint">{PR_SELF_ACQUIRE_HINT}</p>
      </div>

      <div className="ei-tuesday-ops-block">
        <h3>5 · Locksmith first entry</h3>
        <p className="ei-settings-hint">
          When the locksmith starts work, log this before other inventory. Photo the deadbolt install,
          put the invoice number in notes, status Secured — server stamps time/GPS.
        </p>
        <p className="ei-card-meta">
          Preset title: <strong>{LOCKSMITH_ITEM_PRESET.name}</strong>
        </p>
        <button
          type="button"
          className="ei-btn ei-btn-small"
          onClick={() => onLogLocksmith?.(LOCKSMITH_ITEM_PRESET)}
        >
          Start locksmith entry
        </button>
      </div>
    </section>
  );
};

export default EstateTuesdayOpsPanel;
