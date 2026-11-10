import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { loadAdminItemByNumber, loadPublicItem } from '../../services/consignmentService.js';
import useTaxRate from '../../hooks/useTaxRate.js';
import useTagShape from '../../hooks/useTagShape.js';
import { consignmentTagItemNumber, isConsignmentTagSheetPath } from '../../utils/consignmentPaths.js';
import ConsignmentTag from './ConsignmentTag.jsx';
import ConsignmentTagShapeToggle from './ConsignmentTagShapeToggle.jsx';
import ConsignmentTagSheet from './ConsignmentTagSheet.jsx';
import './consignment-print.css';

function SingleTag({ canAdmin }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const itemNumber = params.itemNumber || consignmentTagItemNumber(location.pathname);
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [shape, setShape] = useTagShape();
  const taxRate = useTaxRate();

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
        <ConsignmentTagShapeToggle value={shape} onChange={setShape} />
      </div>
      <p className="cs-print-help">Print at 100% scale (not “Fit to page”) so the tag comes out at its real size.</p>
      <ConsignmentTag item={item} rate={taxRate} shape={shape} />
    </div>
  );
}

/** Print page for one item's tag, or the multi-tag sheet at /consignment/tags. */
export default function ConsignmentPrintTag({ canAdmin = false }) {
  const location = useLocation();
  if (isConsignmentTagSheetPath(location.pathname)) return <ConsignmentTagSheet canAdmin={canAdmin} />;
  return <SingleTag canAdmin={canAdmin} />;
}
