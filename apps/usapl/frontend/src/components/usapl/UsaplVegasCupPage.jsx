import React from 'react';
import { Link } from 'react-router-dom';

export default function UsaplVegasCupPage() {
  return (
    <div className="usapl-page">
      <h1>Vegas Cup</h1>
      <p className="usapl-lede">
        Win your division, then compete for a seeded spot toward the USAPL National Championships in Las Vegas.
      </p>

      <section className="usapl-card" style={{ marginTop: 16 }}>
        <h2>How teams get there</h2>
        <ul>
          <li>Division winners earn a seeded spot in the Vegas Cup Tournament.</li>
          <li>Double-play divisions send the 1st-place team from each format.</li>
          <li>Winning more than one division earns a higher seed.</li>
          <li>Standings live in the FargoRate app and on the divisions page.</li>
        </ul>
      </section>

      <section className="usapl-card" style={{ marginTop: 14 }}>
        <h2>Eligibility</h2>
        <p>All players must have 8 weeks played within a single session to qualify for Redemption, Vegas Cup, and USAPL Nationals.</p>
        <p>All players and teams remain eligible for Nationals regardless of Vegas Cup results.</p>
      </section>

      <section className="usapl-card" style={{ marginTop: 14 }}>
        <h2>Redemption Tournament</h2>
        <p>Teams that did not win a division can enter Redemption. Top placing teams advance to Vegas Cup.</p>
        <p>Divisions with 12+ teams may have their own Redemption. Smaller divisions may combine.</p>
        <p className="usapl-meta">Redemption: Dec 5–6, 2026 (if needed) · Vegas Cup: Dec 12–13, 2026 (if needed)</p>
        <p>Vegas Cup is modified double elimination. Default format is 8-ball unless noted.</p>
      </section>

      <div className="usapl-actions">
        <Link className="usapl-btn" to="/usapl/signup">Sign up</Link>
        <Link className="usapl-btn-secondary" to="/usapl/divisions">Divisions</Link>
      </div>
    </div>
  );
}
