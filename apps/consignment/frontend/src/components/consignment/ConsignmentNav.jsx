import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import ConsignmentHowItWorksModal from './ConsignmentHowItWorksModal.jsx';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';

export default function ConsignmentNav({ canAdmin = false }) {
  const [showHow, setShowHow] = useState(false);
  const { pathname } = useLocation();
  const closeHow = useCallback(() => setShowHow(false), []);
  return (
    <nav className="cs-nav" aria-label="FRPL Consignment">
      <NavLink to={`${CONSIGNMENT_PATH}/home`}>Home</NavLink>
      <NavLink to={CONSIGNMENT_PATH} end>Shop</NavLink>
      <NavLink to={`${CONSIGNMENT_PATH}/sell`}>Sell an item</NavLink>
      <NavLink to={`${CONSIGNMENT_PATH}/my-items`}>My items</NavLink>
      <ConsignmentContactButton className="cs-nav-link">Contact us</ConsignmentContactButton>
      {canAdmin ? <NavLink to={`${CONSIGNMENT_PATH}/admin`}>Admin</NavLink> : null}
      <button type="button" className="cs-nav-how" onClick={() => setShowHow(true)}>
        <span aria-hidden="true">?</span> How it works
      </button>
      {showHow ? createPortal(
        <div className="cs-portal">
          <ConsignmentHowItWorksModal
            initialTab={pathname.startsWith(`${CONSIGNMENT_PATH}/sell`) ? 'consign' : 'buying'}
            onClose={closeHow}
          />
        </div>,
        document.body,
      ) : null}
    </nav>
  );
}
