import React from 'react';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';

export default function ConsignmentBetaBanner() {
  return (
    <div className="cs-beta" role="status">
      <span className="cs-beta-tag">Beta</span>
      <p>
        Buying, bidding and selling are open. Spot a problem?{' '}
        <ConsignmentContactButton className="cs-link-btn" topic="problem">Let FRPL know</ConsignmentContactButton>.
      </p>
    </div>
  );
}
