import React, { useState } from 'react';
import {
  buildNoticeOfInventoryPortalSms,
  defaultFamilyPortalUrl,
  LOCKSMITH_ITEM_PRESET,
  prSelfAcquireHint
} from '@shared/utils/estateLegalOps.js';
import { CASE_NUMBER, estateDisplayCaseNumber } from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';

/**
 * Tuesday operational boundaries:
 * notice SMS copy, PR ≠ bidder reminder, locksmith first-entry shortcut.
 */
const EstateTuesdayOpsPanel = ({ onLogLocksmith, displayCaseNumber = null }) => {
  const { caseNumber } = useEstateCase();
  const activeCase = caseNumber || CASE_NUMBER;
  const caseLabel = estateDisplayCaseNumber(
    { court_case_number: displayCaseNumber, case_number: activeCase },
    activeCase
  );
  const [noticeText, setNoticeText] = useState(() =>
    buildNoticeOfInventoryPortalSms(defaultFamilyPortalUrl(activeCase), activeCase)
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
    const url = defaultFamilyPortalUrl(activeCase);
    setNoticeText(buildNoticeOfInventoryPortalSms(url, activeCase));
    setCopyStatus('Portal link refreshed from this device.');
  };

  return (
    <section className="ei-tuesday-ops" aria-label={`Tuesday legal ops · Case ${caseLabel}`}>
      <h2 className="ei-tuesday-ops-title">Tuesday legal ops</h2>
      <p className="ei-settings-hint">
        Operational boundaries for Case {caseLabel}. Code cannot replace the text you send or the
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
        <p className="ei-settings-hint">{prSelfAcquireHint(caseLabel)}</p>
      </div>

      <div className="ei-tuesday-ops-block">
        <h3>5 · Locksmith first entry</h3>
        <p className="ei-settings-hint">
          When the locksmith starts work, log the deadbolt install here. Photo + invoice notes go to
          admin Scene documentation under <strong>{LOCKSMITH_ITEM_PRESET.newCollectionName}</strong>{' '}
          — not heir inventory and not auction.
        </p>
        <button
          type="button"
          className="ei-btn ei-btn-small"
          onClick={() => onLogLocksmith?.()}
        >
          Start locksmith entry
        </button>
      </div>
    </section>
  );
};

export default EstateTuesdayOpsPanel;
