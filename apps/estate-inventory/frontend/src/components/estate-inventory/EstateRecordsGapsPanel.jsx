import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { ESTATE_SUPPORTING_DOCS_LABEL } from '@shared/utils/estateCompleteness.js';

const ACTION_FOR_KEY = {
  stale_balances: { label: 'Update accounts', tab: 'accounts' },
  expense_receipts: { label: 'Attach receipts', tab: 'expenses' },
  high_value_photos: { label: 'Add photos', kind: 'collections' },
  inventory_photos: { label: 'Browse inventory', kind: 'collections' },
  scene_photos: { label: 'Scene docs', kind: 'scenes' },
  acknowledgements: { label: 'Distributions', tab: 'distributions' },
  interim_distributions: { label: 'Distributions', tab: 'distributions' },
  auction_not_listed: { label: 'Inventory status', tab: 'inventory' },
  family_update: { label: 'Open Reports', kind: 'reports' },
  pending_review: { label: 'Review queue', kind: 'pending' },
  inventory_complete: { label: 'Progress / inventory', kind: 'settings_case' },
  letters: { label: 'Set Letters', kind: 'settings_case' }
};

/**
 * Daily “records gaps” strip — surfaces completeness exceptions on the home
 * screen so the PR does not wait until Reports to see incomplete evidence.
 */
const EstateRecordsGapsPanel = ({
  refreshKey = 0,
  isClosed = false,
  onOpenLedger,
  onOpenScenes,
  onOpenReports,
  onOpenPendingReview,
  onOpenSettingsSection,
  onSeeCollections
}) => {
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await estateInventoryService.getCompletenessCertificate();
      if (cancelled) return;
      if (!result.success) {
        setCertificate(null);
        if (!/estate_|schema cache|does not exist/i.test(result.error || '')) {
          setError(result.error || '');
        }
        return;
      }
      setError('');
      setCertificate(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!certificate && !error) {
    return (
      <section className="ei-records-gaps" aria-busy="true">
        <p className="ei-settings-hint">Checking administration records…</p>
      </section>
    );
  }
  if (!certificate) return error ? <div className="ei-error">{error}</div> : null;

  const exceptions = certificate.exceptions || [];
  if (!exceptions.length) {
    return (
      <section className="ei-records-gaps is-clear" aria-labelledby="ei-records-gaps-title">
        <div className="ei-accounts-section-head">
          <div>
            <h3 id="ei-records-gaps-title">Records gaps</h3>
            <p className="ei-settings-hint">{ESTATE_SUPPORTING_DOCS_LABEL}</p>
          </div>
        </div>
        <p className="ei-status">No blocking gaps on the supporting record right now.</p>
      </section>
    );
  }

  const runAction = (key) => {
    const meta = ACTION_FOR_KEY[key] || {};
    if (meta.tab) onOpenLedger?.(meta.tab);
    else if (meta.kind === 'scenes') onOpenScenes?.();
    else if (meta.kind === 'reports') onOpenReports?.();
    else if (meta.kind === 'pending') onOpenPendingReview?.();
    else if (meta.kind === 'settings_case') onOpenSettingsSection?.('case');
    else if (meta.kind === 'collections') onSeeCollections?.();
  };

  return (
    <section className="ei-records-gaps" aria-labelledby="ei-records-gaps-title">
      <div className="ei-accounts-section-head">
        <div>
          <h3 id="ei-records-gaps-title">Records gaps</h3>
          <p className="ei-settings-hint">
            {certificate.statusLabel}. {ESTATE_SUPPORTING_DOCS_LABEL}
          </p>
        </div>
        <strong className={certificate.filingReady ? 'ei-gap-pill is-ok' : 'ei-gap-pill is-warn'}>
          {certificate.blockingCount} blocking · {certificate.warningCount} warn
        </strong>
      </div>
      <ul className="ei-records-gaps-list">
        {exceptions.map((row) => {
          const meta = ACTION_FOR_KEY[row.key] || {};
          return (
            <li key={row.key} className={`is-${row.severity}`}>
              <div>
                <strong>{row.label}</strong>
                <span>{row.detail}</span>
              </div>
              {!isClosed && meta.label ? (
                <button
                  type="button"
                  className="ei-btn ei-btn-small ei-btn-secondary"
                  onClick={() => runAction(row.key)}
                >
                  {meta.label}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default EstateRecordsGapsPanel;
