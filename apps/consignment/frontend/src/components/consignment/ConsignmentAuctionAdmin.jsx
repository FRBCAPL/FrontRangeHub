import React, { useEffect, useRef, useState } from 'react';
import { AUCTION_STATUSES, itemLabel } from '../../data/consignmentConstants.js';
import {
  adminUpdateListing,
  auctionNotDelivered,
  cancelAuction,
  convertToFixedPrice,
  loadAdminAuctions,
  markAuctionDelivered,
  returnToSeller,
  setAuctionAtLegends,
} from '../../services/consignmentAuctionAdminService.js';
import ConsignmentListingEditModal from './ConsignmentListingEditModal.jsx';
import ConsignmentAuctionAdminRow from './ConsignmentAuctionAdminRow.jsx';
import ConsignmentAuctionStartModal from './ConsignmentAuctionStartModal.jsx';
import ConsignmentAuctionPaidModal from './ConsignmentAuctionPaidModal.jsx';
import ConsignmentAuctionDefaultModal from './ConsignmentAuctionDefaultModal.jsx';
import ConsignmentSecondChanceModal from './ConsignmentSecondChanceModal.jsx';
import useConsignmentConfirm from '../../hooks/useConsignmentConfirm.js';

const REFRESH_MS = 30000;

export default function ConsignmentAuctionAdmin({ settings, initialStatus }) {
  const [status, setStatus] = useState(initialStatus || 'live');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [relisting, setRelisting] = useState(null);
  const [paying, setPaying] = useState(null);
  const [unpaid, setUnpaid] = useState(null);
  const [secondChance, setSecondChance] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const { confirm } = useConsignmentConfirm();

  const statusRef = useRef(status);
  statusRef.current = status;
  const requestRef = useRef(0);
  const refresh = () => {
    const request = ++requestRef.current;
    return loadAdminAuctions(statusRef.current)
      .then((data) => { if (request === requestRef.current) setRows(data); })
      .catch((err) => { if (request === requestRef.current) setError(err.message); });
  };
  const closeWith = (setter) => (saved) => {
    setter(null);
    if (saved) refresh();
  };

  useEffect(() => {
    setError('');
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [status]);

  const run = (fn, question) => async (auction) => {
    if (question && !(await confirm(question(auction)))) return;
    fn(auction).then(refresh).catch((err) => setError(err.message));
  };

  const actions = {
    cancel: run(cancelAuction, (a) => ({
      title: `Cancel the auction for ${itemLabel(a.item)}?`,
      message: 'The item goes back to Pending.',
      confirmLabel: 'Cancel auction',
      cancelLabel: 'Keep it',
    })),
    toFixed: run(convertToFixedPrice, (a) => ({
      title: `Move ${itemLabel(a.item)} to fixed price?`,
      message: 'It goes back to Pending so you can set a retail price with Approve.',
      confirmLabel: 'Move to fixed price',
    })),
    returned: run(returnToSeller, (a) => ({ title: `Mark ${itemLabel(a.item)} as returned to the seller?`, confirmLabel: 'Returned' })),
    delivered: run(markAuctionDelivered, (a) => ({
      title: `${itemLabel(a.item)} is at Legends?`,
      message: `The winner’s ${settings?.auction_payment_days ?? 7}-day window to inspect and pay starts now. Let them know it’s ready.`,
      confirmLabel: 'It’s at Legends',
    })),
    notDelivered: run(auctionNotDelivered, (a) => ({
      title: `The seller didn’t deliver ${itemLabel(a.item)}?`,
      lines: [
        'The sale is cancelled; the winner owes nothing.',
        'The item is withdrawn and the listing fee is kept.',
        'The seller loses selling access.',
      ],
      confirmLabel: 'Not delivered',
    })),
    relist: setRelisting,
    confirmChoice: (a) => {
      if (a.seller_choice === 'relist') setRelisting({ ...a, sellerReserve: a.seller_choice_reserve });
      else if (a.seller_choice === 'fixed') actions.toFixed(a);
      else if (a.seller_choice === 'keep') actions.returned(a);
    },
    paid: setPaying,
    unpaid: setUnpaid,
    secondChance: setSecondChance,
    editListing: setEditingListing,
    atLegends: (a, atLegends) => {
      setError('');
      setRows((prev) => prev.map((r) => (r.id === a.id ? { ...r, delivered_at: atLegends ? new Date().toISOString() : null } : r)));
      setAuctionAtLegends(a, atLegends).catch((err) => setError(err.message)).finally(refresh);
    },
  };

  return (
    <>
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
          previouslyDelivered={Boolean(relisting.delivered_at)}
          sellerReserve={relisting.sellerReserve ?? null}
          onClose={closeWith(setRelisting)}
        />
      ) : null}
      {paying ? <ConsignmentAuctionPaidModal auction={paying} onClose={closeWith(setPaying)} /> : null}
      {unpaid ? <ConsignmentAuctionDefaultModal auction={unpaid} onClose={closeWith(setUnpaid)} /> : null}
      {secondChance ? <ConsignmentSecondChanceModal auction={secondChance} onClose={closeWith(setSecondChance)} /> : null}
      {editingListing ? (
        <ConsignmentListingEditModal
          item={editingListing.item}
          admin
          save={(changes) => adminUpdateListing(editingListing.item.id, changes)}
          onSaved={refresh}
          onClose={() => setEditingListing(null)}
        />
      ) : null}
    </>
  );
}
