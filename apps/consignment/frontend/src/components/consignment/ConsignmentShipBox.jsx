import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { currentUserId, onAuthChange, openHubLogin } from '../../services/consignmentAuctionService.js';
import { loadMyShipmentForItem } from '../../services/consignmentShippingService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { shipTotal, shipmentStatusLabel } from '../../utils/consignmentShipping.js';
import ConsignmentShipRequestModal from './ConsignmentShipRequestModal.jsx';
import './consignment-shipping.css';

const MY_ORDERS = `${CONSIGNMENT_PATH}/my-offers`;

/**
 * Item page: "Ships to buyers outside Colorado" with the request button. Only shown when shipping is on and the
 * item has a shipping price. auction.iWon comes from ConsignmentAuctionPanel.
 */
export default function ConsignmentShipBox({ item, auction, shipPrice, complaintDays }) {
  const [userId, setUserId] = useState(undefined);
  const [mine, setMine] = useState(null);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const loadMine = useCallback(async (id) => {
    setUserId(id);
    setMine(id ? await loadMyShipmentForItem(item.id, id) : null);
  }, [item.id]);

  useEffect(() => {
    let alive = true;
    currentUserId().then((id) => { if (alive) loadMine(id); });
    const off = onAuthChange((id) => { if (alive) loadMine(id); });
    return () => { alive = false; off(); };
  }, [loadMine]);

  const isAuction = item.sale_method === 'auction';
  const ship = formatDollars(shipPrice);

  if (mine) {
    return (
      <div className="cs-ship-box cs-ship-box-mine" role="status">
        <strong>🚚 {sent ? 'Shipping request sent.' : `Shipping to you · ${shipmentStatusLabel(mine.status)}`}</strong>
        <p>
          {isAuction && ['requested', 'invoiced'].includes(mine.status)
            ? 'You chose shipping, so you’ll pay online instead of at the register. ' : ''}
          {mine.status === 'requested' ? 'FRPL will email you a secure payment link. ' : ''}
          Follow it on <Link to={MY_ORDERS}>My offers &amp; orders</Link>.
        </p>
      </div>
    );
  }

  if (item.status !== 'available') return null;

  let price = null;
  let action = null;
  let lead = `Ships to buyers outside Colorado (lower 48): ${ship} shipping & handling.`;
  if (isAuction) {
    if (auction?.status === 'live') {
      lead = `Outside Colorado? The winner can have it shipped for ${ship} shipping & handling instead of picking it up.`;
    } else if (auction?.status === 'awaiting_payment' && auction.iWon) {
      price = Number(auction.winning_bid);
      lead = 'Outside Colorado? Have it shipped instead of picking it up.';
      action = 'Ship it to me';
    } else {
      return null;
    }
  } else {
    price = Number(item.selling_price);
    action = 'Buy & ship';
  }

  return (
    <div className="cs-ship-box">
      <strong>🚚 {lead}</strong>
      {price != null ? (
        <p>
          {formatDollars(price)} + {ship} = <strong>{formatDollars(shipTotal(price, shipPrice))}</strong>.
          {' '}No Colorado sales tax on orders shipped out of state. Pay online with a secure link from FRPL.
        </p>
      ) : (
        <p>No Colorado sales tax on orders shipped out of state.</p>
      )}
      {action ? (
        <button type="button" className="cs-btn-secondary" onClick={userId ? () => setOpen(true) : openHubLogin}>
          {userId ? action : `Log in to ${action.toLowerCase()}`}
        </button>
      ) : null}
      {open ? (
        <ConsignmentShipRequestModal
          item={item}
          itemPrice={price}
          shipPrice={shipPrice}
          complaintDays={complaintDays}
          isAuction={isAuction}
          onClose={(saved) => {
            setOpen(false);
            if (saved) { setSent(true); loadMine(userId); }
          }}
        />
      ) : null}
    </div>
  );
}
