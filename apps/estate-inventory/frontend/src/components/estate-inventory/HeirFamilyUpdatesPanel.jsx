import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  buildFamilyUpdateHtml,
  downloadFamilyUpdate
} from '@shared/utils/estateFamilyUpdate.js';

/**
 * Heir-facing published Family Update history.
 */
const HeirFamilyUpdatesPanel = ({ caseNumber }) => {
  const [updates, setUpdates] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const result = await estateInventoryService.listPublishedFamilyUpdates(caseNumber);
    setLoaded(true);
    if (!result.success) {
      if (/estate_heir_list_family_updates|schema cache|does not exist/i.test(result.error || '')) {
        setUpdates([]);
        return;
      }
      setError(result.error || 'Could not load Family Updates.');
      return;
    }
    setUpdates(result.data || []);
  };

  useEffect(() => {
    load();
  }, [caseNumber]);

  const openUpdate = async (row) => {
    setBusyId(row.id);
    setError('');
    const result = await estateInventoryService.getPublishedFamilyUpdate(row.id, caseNumber);
    setBusyId(null);
    if (!result.success) {
      setError(result.error || 'Could not open that Family Update.');
      return;
    }
    setActive(result.data);
  };

  const downloadActive = () => {
    if (!active?.package) return;
    const pack = {
      ...active.package,
      updateNumber: active.update_number
    };
    const result = downloadFamilyUpdate(pack);
    if (!result.success) setError(result.error);
  };

  if (loaded && !updates.length && !error) {
    return (
      <section className="ei-family-updates-panel" aria-labelledby="ei-family-updates-title">
        <div className="ei-accounts-section-head">
          <div>
            <h3 id="ei-family-updates-title">Family Updates</h3>
            <p className="ei-settings-hint">
              The Personal Representative has not published a Family Update yet. When they do,
              numbered reports will appear here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ei-family-updates-panel" aria-labelledby="ei-family-updates-title">
      <div className="ei-accounts-section-head">
        <div>
          <h3 id="ei-family-updates-title">Family Updates</h3>
          <p className="ei-settings-hint">
            Numbered reports published by the Personal Representative — staged communication, not
            live bank access.
          </p>
        </div>
      </div>

      {error ? <div className="ei-error">{error}</div> : null}
      {!loaded ? <p className="ei-settings-hint">Loading Family Updates…</p> : null}

      <ul className="ei-family-update-list">
        {updates.map((row) => {
          const digest = row.digest || {};
          return (
            <li key={row.id}>
              <button
                type="button"
                className="ei-family-update-card"
                onClick={() => openUpdate(row)}
                disabled={busyId === row.id}
              >
                <strong>
                  {row.title || `Family Update #${row.update_number}`}
                </strong>
                <span>
                  {row.published_at
                    ? new Date(row.published_at).toLocaleDateString()
                    : '—'}
                  {digest.inventory
                    ? ` · ${digest.inventory.total || 0} items · ${
                        digest.inventory.distributed || 0
                      } distributed`
                    : ''}
                  {digest.auction
                    ? ` · ${digest.auction.paid || 0} auction paid`
                    : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {active ? (
        <div className="ei-modal-backdrop" role="presentation" onClick={() => setActive(null)}>
          <div
            className="ei-modal ei-modal-settings ei-family-update-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ei-fu-active-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ei-modal-head">
              <div>
                <h3 id="ei-fu-active-title">
                  {active.title || `Family Update #${active.update_number}`}
                </h3>
                <p className="ei-settings-hint" style={{ margin: '0.2rem 0 0' }}>
                  Published{' '}
                  {active.published_at
                    ? new Date(active.published_at).toLocaleString()
                    : '—'}
                </p>
              </div>
              <button
                type="button"
                className="ei-modal-close"
                onClick={() => setActive(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="ei-modal-body">
              {active.pr_note ? (
                <p className="ei-status">
                  <strong>Note from PR:</strong> {active.pr_note}
                </p>
              ) : null}
              {active.package?.digest ? (
                <div className="ei-transparency-section">
                  <h4>At a glance</h4>
                  <ul className="ei-transparency-lines">
                    <li>
                      <span>Inventory</span>
                      <strong>
                        {active.package.digest.inventory?.total || 0} recorded ·{' '}
                        {active.package.digest.inventory?.distributed || 0} distributed
                      </strong>
                    </li>
                    <li>
                      <span>Auction</span>
                      <strong>
                        {active.package.digest.auction?.paid || 0} paid ·{' '}
                        {active.package.digest.auction?.pendingPayment || 0} pending
                      </strong>
                    </li>
                    <li>
                      <span>Claims window</span>
                      <strong>
                        {active.package.digest.claims?.windowEndLabel ||
                          active.package.digest.claims?.note ||
                          '—'}
                      </strong>
                    </li>
                    <li>
                      <span>Cash distributed (activity)</span>
                      <strong>
                        {formatMoney(active.package.digest.distributions?.cash)}
                      </strong>
                    </li>
                  </ul>
                  {active.package.whyNotFinal ? (
                    <p className="ei-settings-hint">{active.package.whyNotFinal}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="ei-btn-row" style={{ marginBottom: '0.75rem' }}>
                <button type="button" className="ei-btn ei-btn-small" onClick={downloadActive}>
                  Download full update
                </button>
                <button
                  type="button"
                  className="ei-btn ei-btn-small ei-btn-secondary"
                  onClick={() => setActive(null)}
                >
                  Close
                </button>
              </div>
              <iframe
                className="ei-receipt-frame"
                title="Family Update"
                srcDoc={buildFamilyUpdateHtml({
                  ...active.package,
                  updateNumber: active.update_number
                })}
                sandbox=""
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default HeirFamilyUpdatesPanel;
