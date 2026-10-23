import React from 'react';
import ConsignmentAccountRequestsPanel from './ConsignmentAccountRequestsPanel.jsx';
import ConsignmentSellersPanel from './ConsignmentSellersPanel.jsx';
import ConsignmentBidderStatusPanel from './ConsignmentBidderStatusPanel.jsx';

/** Admin People tab: new account approvals, seller access, and bidders with unpaid wins. */
export default function ConsignmentPeoplePanel() {
  return (
    <>
      <ConsignmentAccountRequestsPanel />
      <ConsignmentSellersPanel defaultOpen />
      <ConsignmentBidderStatusPanel />
    </>
  );
}
