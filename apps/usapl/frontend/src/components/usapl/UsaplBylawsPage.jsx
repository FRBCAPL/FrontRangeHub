import React from 'react';
import { Link } from 'react-router-dom';
import { USAPL_LINKS } from '../../data/usaplConstants.js';
import UsaplBylawsViewer from './UsaplBylawsViewer.jsx';

export default function UsaplBylawsPage() {
  return (
    <div className="usapl-page usapl-bylaws-page">
      <p className="usapl-kicker">Front Range USA Pool League</p>
      <h1>Local by-laws</h1>
      <p className="usapl-lede">
       Please review and follow these by-laws.<br />
       Front Range USA Pool League follows the CSI rules and USAPL Handbook. <br />
       With minor modifications made for weekly play as outlined in these local by-laws.
      </p>
      <div className="usapl-bylaws-toolbar usapl-actions">
        <Link className="usapl-btn-secondary" to="/usapl/rules">Back to rules</Link>
        <button type="button" className="usapl-btn" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <UsaplBylawsViewer src={USAPL_LINKS.localBylaws} />
    </div>
  );
}
