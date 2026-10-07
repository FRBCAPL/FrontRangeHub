import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CONSIGNMENT_DAYS,
  DEFAULT_CONSIGNMENT_FEE,
  EXPIRING_SOON_DAYS,
  itemLabel,
  PICKUP_GRACE_DAYS,
  STATUSES,
} from '../../data/consignmentConstants.js';
import {
  clearItemPhotos,
  loadAdminItems,
  loadSettings,
  markSold,
  purgeExpiredSoldPhotos,
  updateItem,
} from '../../services/consignmentService.js';
import ConsignmentAgreementSettings from './ConsignmentAgreementSettings.jsx';
import { expireOverdueItems } from '../../services/consignmentFeesService.js';
import { clearSellerPaid } from '../../services/consignmentPayoutService.js';
import ConsignmentSellerPaidModal from './ConsignmentSellerPaidModal.jsx';
import { consignmentTagPath } from '../../utils/consignmentPaths.js';
import ConsignmentAdminEditModal from './ConsignmentAdminEditModal.jsx';
import ConsignmentAdminRow from './ConsignmentAdminRow.jsx';
import ConsignmentRenewModal from './ConsignmentRenewModal.jsx';
import ConsignmentSoldModal from './ConsignmentSoldModal.jsx';
import ConsignmentAuctionAdmin from './ConsignmentAuctionAdmin.jsx';
import ConsignmentAuctionStartModal from './ConsignmentAuctionStartModal.jsx';

export default function ConsignmentAdmin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const linkedTab = params.get('tab') === 'auctions' ? 'auctions' : 'items';
  const linkedStatus = params.get('status');
  const [status, setStatus] = useState(linkedTab === 'items' && linkedStatus ? linkedStatus : 'pending');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [defaultFee, setDefaultFee] = useState(DEFAULT_CONSIGNMENT_FEE);
  const [consignmentDays, setConsignmentDays] = useState(CONSIGNMENT_DAYS);
  const [graceDays, setGraceDays] = useState(PICKUP_GRACE_DAYS);
  const [edit, setEdit] = useState(null);
  const [approving, setApproving] = useState(false);
  const [sold, setSold] = useState(null);
  const [renewing, setRenewing] = useState(null);
  const [payingSeller, setPayingSeller] = useState(null);
  const [auctioning, setAuctioning] = useState(null);
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState(linkedTab);

  // The Admin Inbox links here with ?tab= / ?status=; follow them even when already on this page.
  useEffect(() => {
    setTab(linkedTab);
    if (linkedTab === 'items' && linkedStatus) setStatus(linkedStatus);
  }, [linkedTab, linkedStatus]);

  const refresh = () => loadAdminItems(status).then(setRows).catch((err) => setError(err.message));

  useEffect(() => {
    setError('');
    refresh();
  }, [status]);

  useEffect(() => {
    loadSettings()
      .then((row) => {
        setSettings(row);
        if (row?.default_consignment_fee != null) setDefaultFee(Number(row.default_consignment_fee));
        if (row?.consignment_days) setConsignmentDays(Number(row.consignment_days));
        if (row?.pickup_grace_days != null) setGraceDays(Number(row.pickup_grace_days));
      })
      .catch((err) => setError(err.message));
    Promise.all([expireOverdueItems(), purgeExpiredSoldPhotos()])
      .then(([expired, purged]) => { if (expired || purged) refresh(); })
      .catch((err) => setError(err.message));
  }, []);

  const actions = {
    edit: (item) => { setApproving(false); setEdit(item); },
    approve: (item) => { setApproving(true); setEdit(item); },
    sold: setSold,
    renew: setRenewing,
    setStatus: (item, next) => setStatusOf(item, next).catch((err) => setError(err.message)),
    deletePhotos: (item) => deletePhotos(item),
    printTag: (item) => navigate(consignmentTagPath(item.item_number)),
    sellerPaid: setPayingSeller,
    auction: setAuctioning,
    undoSellerPaid: (item) => {
      if (!window.confirm(`Mark ${itemLabel(item)} as NOT paid to the seller?`)) return;
      clearSellerPaid(item.id).then(refresh).catch((err) => setError(err.message));
    },
  };

  const setStatusOf = async (item, next) => {
    await updateItem(item.id, { status: next });
    refresh();
  };

  const deletePhotos = async (item) => {
    const n = item.photo_urls?.length || 0;
    if (!window.confirm(`Delete ${n} photo${n === 1 ? '' : 's'} for ${itemLabel(item)}? This can't be undone.`)) return;
    try {
      await clearItemPhotos(item);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="cs-page">
      <h1>Consignment admin</h1>
      <p className="cs-lede">
        Approve listings, print tags, renew, and record sales. Listings run {consignmentDays} days;
        expired items have {graceDays} days for pickup. Seller contact never appears on the public shop.
      </p>
      <ConsignmentAgreementSettings settings={settings} onError={setError} />
      <div className="cs-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'items'} className={tab === 'items' ? 'active' : ''} onClick={() => setTab('items')}>
          Items
        </button>
        <button type="button" role="tab" aria-selected={tab === 'auctions'} className={tab === 'auctions' ? 'active' : ''} onClick={() => setTab('auctions')}>
          Auctions
        </button>
      </div>
      {tab === 'auctions' ? (
        <ConsignmentAuctionAdmin
          key={linkedTab === 'auctions' ? linkedStatus || '' : ''}
          settings={settings}
          initialStatus={linkedTab === 'auctions' ? linkedStatus : null}
        />
      ) : null}
      {tab === 'items' ? (
        <>
          <div className="cs-filters">
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
              <option value="all">All statuses</option>
              <option value="expiring">Expiring soon ({EXPIRING_SOON_DAYS} days)</option>
              <option value="seller_unpaid">Sold – owed to seller</option>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          {error ? <p className="cs-error">{error}</p> : null}
          <table className="cs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Seller</th>
                <th>Money</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <ConsignmentAdminRow key={item.id} item={item} graceDays={graceDays} actions={actions} />
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {auctioning ? (
        <ConsignmentAuctionStartModal
          item={auctioning}
          settings={settings}
          isRelist={Boolean(auctioning.auction && auctioning.auction.status !== 'cancelled')}
          onClose={(saved) => { setAuctioning(null); if (saved) refresh(); }}
        />
      ) : null}
      {edit ? (
        <ConsignmentAdminEditModal
          key={`${edit.id}-${approving}`}
          item={edit}
          approving={approving}
          defaultFee={defaultFee}
          consignmentDays={consignmentDays}
          onClose={() => { setEdit(null); refresh(); }}
          onSave={(patch) => updateItem(edit.id, patch)}
        />
      ) : null}
      {renewing ? (
        <ConsignmentRenewModal
          item={renewing}
          defaultFee={defaultFee}
          consignmentDays={consignmentDays}
          onClose={() => { setRenewing(null); refresh(); }}
        />
      ) : null}
      {payingSeller ? (
        <ConsignmentSellerPaidModal item={payingSeller} onClose={() => { setPayingSeller(null); refresh(); }} />
      ) : null}
      {sold ? (
        <ConsignmentSoldModal
          item={sold}
          onClose={() => setSold(null)}
          onSave={(vals) => markSold(sold, vals).then(refresh)}
        />
      ) : null}
    </div>
  );
}
