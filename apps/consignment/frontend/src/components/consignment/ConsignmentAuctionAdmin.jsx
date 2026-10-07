import React, { useEffect, useState } from 'react';
import { AUCTION_STATUSES, itemLabel } from '../../data/consignmentConstants.js';
import {
  cancelAuction,
  convertToFixedPrice,
  loadAdminAuctions,
  returnToSeller,
} from '../../services/consignmentAuctionAdminService.js';
import ConsignmentAuctionAdminRow from './ConsignmentAuctionAdminRow.jsx';
import ConsignmentAuctionStartModal from './ConsignmentAuctionStartModal.jsx';
import ConsignmentAuctionPaidModal from './ConsignmentAuctionPaidModal.jsx';
import ConsignmentAuctionDefaultModal from './ConsignmentAuctionDefaultModal.jsx';
import ConsignmentSecondChanceModal from './ConsignmentSecondChanceModal.jsx';
import ConsignmentBidderStatusPanel from './ConsignmentBidderStatusPanel.jsx';
import ConsignmentAccountRequestsPanel from './ConsignmentAccountRequestsPanel.jsx';

const REFRESH_MS = 30000;

export default function ConsignmentAuctionAdmin({ settings, initialStatus }) {
  const [status, setStatus] = useState(initialStatus || 'live');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [relisting, setRelisting] = useState(null);
  const [paying, setPaying] = useState(null);
  const [unpaid, setUnpaid] = useState(null);
  const [secondChance, setSecondChance] = useState(null);
  const [bidderKey, setBidderKey] = useState(0);

  const refresh = () => loadAdminAuctions(status).then(setRows).catch((err) => setError(err.message));
  const closeWith = (setter) => (saved) => {
    setter(null);
    if (saved) {
      refresh();
      setBidderKey((k) => k + 1);
    }
  };

  useEffect(() => {
    setError('');
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [status]);

  const run = (fn, confirmText) => (auction) => {
    if (confirmText && !window.confirm(confirmText(auction))) return;
    fn(auction).then(refresh).catch((err) => setError(err.message));
  };

  const actions = {
    cancel: run(cancelAuction, (a) => `Cancel the auction for ${itemLabel(a.item)}? The item goes back to Pending.`),
    toFixed: run(convertToFixedPrice, (a) => `Move ${itemLabel(a.item)} to fixed price? It goes back to Pending so you can set a retail price with Approve.`),
    returned: run(returnToSeller, (a) => `Mark ${itemLabel(a.item)} as returned to the seller?`),
    relist: setRelisting,
    paid: setPaying,
    unpaid: setUnpaid,
    secondChance: setSecondChance,
  };

  return (
    <>
      <ConsignmentAccountRequestsPanel />
      <div className="cs-filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter auctions">
          {AUCTION_STATUSES.filter((s) => s.id !== 'draft').map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          <option value="all">All auctions</option>
        </select>
      </div>
      {error ? <p className="cs-error">{error}</p> : null}
      {!rows.length && !error ? <p className="cs-hint">No auctions here.</p> : null}
      {rows.length ? (
        <table className="cs-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Terms</th>
              <th>Bids</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => <ConsignmentAuctionAdminRow key={a.id} auction={a} actions={actions} />)}
          </tbody>
        </table>
      ) : null}
      {relisting ? (
        <ConsignmentAuctionStartModal
          item={relisting.item}
          settings={settings}
          isRelist
          previousReserve={relisting.opening_bid}
          onClose={closeWith(setRelisting)}
        />
      ) : null}
      {paying ? <ConsignmentAuctionPaidModal auction={paying} onClose={closeWith(setPaying)} /> : null}
      {unpaid ? <ConsignmentAuctionDefaultModal auction={unpaid} onClose={closeWith(setUnpaid)} /> : null}
      {secondChance ? <ConsignmentSecondChanceModal auction={secondChance} onClose={closeWith(setSecondChance)} /> : null}
      <ConsignmentBidderStatusPanel refreshKey={bidderKey} />
    </>
  );
}
