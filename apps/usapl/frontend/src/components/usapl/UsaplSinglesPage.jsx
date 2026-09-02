import React from 'react';
import { Link } from 'react-router-dom';

export default function UsaplSinglesPage() {
  return (
    <div className="usapl-page">
      <h1>FRBCAPL Singles</h1>
      <p className="usapl-lede">Singles Division Bylaws — 499 &amp; Under.</p>
      <section className="usapl-card" style={{ marginTop: 16 }}>
        <h2>499 &amp; Under singles</h2>
        <p>
          This is the Front Range BCA Pool League singles division for players 499 Fargo and under.
          Use league signup if you want to join, or contact the office with questions about bylaws and session dates.
        </p>
        <div className="usapl-actions">
          <Link className="usapl-btn" to="/usapl/signup?kind=individual&division=bcapl-singles">Join singles</Link>
          <Link className="usapl-btn-secondary" to="/usapl">Back to league home</Link>
        </div>
      </section>
    </div>
  );
}
