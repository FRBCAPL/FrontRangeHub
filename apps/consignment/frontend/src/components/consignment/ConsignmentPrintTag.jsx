import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { brandModelLabel, conditionLabel, CONSIGNMENT_PATH, itemLabel } from '../../data/consignmentConstants.js';
import { loadAdminItemByNumber, loadPublicItem } from '../../services/consignmentService.js';
import { itemPriceLabel } from '../../utils/consignmentMoney.js';
import { consignmentItemHref, consignmentTagItemNumber } from '../../utils/consignmentPaths.js';
import './consignment-print.css';

export default function ConsignmentPrintTag({ canAdmin = false }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const itemNumber = params.itemNumber || consignmentTagItemNumber(location.pathname);
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const href = itemNumber ? consignmentItemHref(itemNumber) : '';
  const qr = href
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(href)}`
    : '';

  useEffect(() => {
    if (!itemNumber) {
      setError('Missing item number.');
      return undefined;
    }
    let alive = true;
    const load = canAdmin ? loadAdminItemByNumber(itemNumber) : loadPublicItem(itemNumber);
    load
      .then((row) => {
        if (!alive) return;
        if (!row) setError('Item not found.');
        else setItem(row);
      })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [itemNumber, canAdmin]);

  if (error) return <div className="cs-print"><p>{error}</p></div>;
  if (!item) return <div className="cs-print"><p>Loading tag…</p></div>;

  return (
    <div className="cs-print">
      <div className="cs-print-bar">
        <button type="button" onClick={() => window.print()}>Print</button>
        <button type="button" onClick={() => navigate(`${CONSIGNMENT_PATH}/admin`)}>Back to admin</button>
      </div>
      <article className="cs-tag">
        <div className="cs-tag-id">{itemLabel(item)}</div>
        <h1>{item.name}</h1>
        <p>{brandModelLabel(item) ? `${brandModelLabel(item)} · ` : ''}{conditionLabel(item.condition)}</p>
        {item.specs ? <p>{item.specs}</p> : null}
        <p><strong>{itemPriceLabel(item)}</strong></p>
        <p>Available at Legends Brews & Cues</p>
        {item.sale_method === 'auction' ? null : (
          <p><strong>{item.allow_inspection ? 'Ask to inspect: ID held' : 'Display only'}</strong></p>
        )}
        <img src={qr} alt={`QR code for ${itemLabel(item)}`} />
        <p>{item.sale_method === 'auction' ? 'Scan to bid online' : 'Scan for photos & details'}</p>
      </article>
    </div>
  );
}
