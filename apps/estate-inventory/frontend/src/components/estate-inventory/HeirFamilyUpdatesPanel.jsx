import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  buildFamilyUpdateHtml,
  downloadFamilyUpdate
} from '@shared/utils/estateFamilyUpdate.js';
import { formatEstateDisplayDate } from '@shared/utils/estateInventoryConstants.js';
import EstateModalShell from './EstateModalShell';

function localReadKey(caseNumber, siblingKey) {
  return `ei-fu-read:${caseNumber || ''}:${siblingKey || 'heir'}`;
}

function loadLocalReads(caseNumber, siblingKey) {
  try {
    const raw = localStorage.getItem(localReadKey(caseNumber, siblingKey));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveLocalRead(caseNumber, siblingKey, updateId) {
  const set = loadLocalReads(caseNumber, siblingKey);
  set.add(String(updateId));
  try {
    localStorage.setItem(localReadKey(caseNumber, siblingKey), JSON.stringify([...set]));
  } catch {
    /* ignore quota */
  }
}

function isRowRead(row) {
  if (row?.is_read === true || row?.read_at) return true;
  return false;
}

/**
 * Heir Family Updates — compact launcher → list modal → report detail.
 * Per-heir read state from server (with localStorage fallback).
 */
const HeirFamilyUpdatesPanel = ({ caseNumber }) => {
  const [updates, setUpdates] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const siblingKeyFor = () => {
    const session = estateInventoryService.getStoredSiblingSession?.(caseNumber) || null;
    return session?.sibling_key || session?.siblingKey || '';
  };

  const mergeLocalReads = (rows) => {
    const local = loadLocalReads(caseNumber, siblingKeyFor());
    return (rows || []).map((row) => {
      const serverRead = isRowRead(row);
      const localRead = local.has(String(row.id));
      if (serverRead || localRead) {
        return { ...row, is_read: true, read_at: row.read_at || null };
      }
      return { ...row, is_read: false };
    });
  };

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
    setError('');
    setUpdates(mergeLocalReads(result.data || []));
  };

  useEffect(() => {
    load();
  }, [caseNumber]);

  const unreadCount = updates.filter((row) => !isRowRead(row)).length;
  const reportCount = updates.length;

  const markReadLocalAndState = (updateId) => {
    saveLocalRead(caseNumber, siblingKeyFor(), updateId);
    setUpdates((prev) =>
      prev.map((row) =>
        row.id === updateId ? { ...row, is_read: true, read_at: row.read_at || new Date().toISOString() } : row
      )
    );
  };

  const openUpdate = async (row) => {
    setBusyId(row.id);
    setError('');
    const result = await estateInventoryService.getPublishedFamilyUpdate(row.id, caseNumber);
    setBusyId(null);
    if (!result.success) {
      setError(result.error || 'Could not open that Family Update.');
      return;
    }
    markReadLocalAndState(row.id);
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

  const openList = () => setListOpen(true);
  const closeList = () => {
    setListOpen(false);
    setError('');
  };
  const closeActive = () => setActive(null);

  const emptyHint =
    'The Personal Representative has not published a Family Update yet. When they publish one from Reports, numbered reports will appear here.';

  const opener = (
    <section
      className={`ei-family-updates-panel ei-family-updates-launch${
        unreadCount > 0 ? ' has-unread' : ''
      }${reportCount === 0 && loaded ? ' is-empty' : ''}`}
      aria-labelledby="ei-family-updates-title"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={
        unreadCount > 0
          ? `Family Updates — ${reportCount} reports, ${unreadCount} unread. Open list.`
          : `Family Updates — ${reportCount} report${reportCount === 1 ? '' : 's'}. Open list.`
      }
      onClick={openList}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openList();
        }
      }}
    >
      <div className="ei-family-updates-launch-head">
        <h3 id="ei-family-updates-title">Family Updates</h3>
        {loaded && reportCount > 0 ? (
          <span className="ei-family-updates-count" aria-hidden="true">
            {reportCount}
          </span>
        ) : null}
        {unreadCount > 0 ? (
          <span
            className="ei-family-updates-unread-icon"
            title={`${unreadCount} unread`}
            aria-hidden="true"
          >
            <span className="ei-family-updates-unread-dot" />
            {unreadCount}
          </span>
        ) : null}
      </div>
      <p className="ei-family-updates-launch-hint">
        {!loaded
          ? 'Loading…'
          : reportCount === 0
            ? 'No reports published yet'
            : unreadCount > 0
              ? `${unreadCount} unread · tap to open`
              : 'All caught up · tap to browse'}
      </p>
    </section>
  );

  const listModal = listOpen ? (
    <EstateModalShell
      title="Family Updates"
      subtitle={
        reportCount === 0
          ? emptyHint
          : `${reportCount} report${reportCount === 1 ? '' : 's'}${
              unreadCount > 0 ? ` · ${unreadCount} unread` : ''
            }`
      }
      onClose={closeList}
      className="ei-modal-family-updates-list"
      compact
    >
      {error ? <div className="ei-error">{error}</div> : null}
      {!loaded ? <p className="ei-settings-hint">Loading Family Updates…</p> : null}
      {loaded && reportCount === 0 ? (
        <p className="ei-settings-hint">{emptyHint}</p>
      ) : (
        <ul className="ei-family-update-list">
          {updates.map((row) => {
            const digest = row.digest || {};
            const read = isRowRead(row);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`ei-family-update-card${read ? '' : ' is-unread'}`}
                  onClick={() => openUpdate(row)}
                  disabled={busyId === row.id}
                >
                  <span className="ei-family-update-card-top">
                    <strong>
                      {row.title || `Family Update #${row.update_number}`}
                    </strong>
                    {!read ? (
                      <span className="ei-family-update-unread-pill">Unread</span>
                    ) : (
                      <span className="ei-family-update-read-pill">Read</span>
                    )}
                  </span>
                  <span>
                    {row.published_at
                      ? formatEstateDisplayDate(row.published_at) ||
                        new Date(row.published_at).toLocaleDateString()
                      : '—'}
                    {digest.inventory
                      ? ` · ${digest.inventory.total || 0} items · ${
                          digest.inventory.distributed || 0
                        } distributed`
                      : ''}
                    {digest.auction ? ` · ${digest.auction.paid || 0} auction paid` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </EstateModalShell>
  ) : null;

  const detailModal = active ? (
    <EstateModalShell
      title={active.title || `Family Update #${active.update_number}`}
      subtitle={`Published ${
        active.published_at ? new Date(active.published_at).toLocaleString() : '—'
      }`}
      onClose={closeActive}
      className="ei-modal-settings ei-family-update-modal"
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-small" onClick={downloadActive}>
            Download full update
          </button>
          <button type="button" className="ei-btn ei-btn-small ei-btn-secondary" onClick={closeActive}>
            Back to list
          </button>
        </>
      }
    >
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
              <span>Sale / Auction</span>
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
              <strong>{formatMoney(active.package.digest.distributions?.cash)}</strong>
            </li>
          </ul>
          {active.package.whyNotFinal ? (
            <p className="ei-settings-hint">{active.package.whyNotFinal}</p>
          ) : null}
        </div>
      ) : null}
      <iframe
        className="ei-receipt-frame"
        title="Family Update"
        srcDoc={buildFamilyUpdateHtml({
          ...active.package,
          updateNumber: active.update_number
        })}
        sandbox=""
      />
    </EstateModalShell>
  ) : null;

  const portalContent =
    listModal || detailModal ? (
      <div className="estate-inventory ei-modal-portal">
        {listModal}
        {detailModal}
      </div>
    ) : null;

  if (typeof document !== 'undefined' && document.body && portalContent) {
    return (
      <>
        {opener}
        {createPortal(portalContent, document.body)}
      </>
    );
  }

  return (
    <>
      {opener}
      {portalContent}
    </>
  );
};

export default HeirFamilyUpdatesPanel;
