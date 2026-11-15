import React from 'react';

export function RewardsPanel({ message }) {
  return (
    <section className="lg-panel">
      <h2 className="lg-display lg-display--card">Rewards</h2>
      <p className="lg-card__copy lg-mt-3">
        {message || 'Points are not connected yet. Qualifying purchases and redemptions will show here when Legends turns them on.'}
      </p>
      <dl className="lg-facts-list lg-mt-5">
        <div>
          <dt>Available points</dt>
          <dd>Not connected yet</dd>
        </div>
        <div>
          <dt>Recent activity</dt>
          <dd>No point activity on file.</dd>
        </div>
        <div>
          <dt>Available rewards</dt>
          <dd>No rewards have been published.</dd>
        </div>
        <div>
          <dt>Redemption history</dt>
          <dd>No redemptions on file.</dd>
        </div>
      </dl>
    </section>
  );
}

export function AchievementsPanel() {
  return (
    <section className="lg-panel">
      <h2 className="lg-display lg-display--card">Achievements</h2>
      <p className="lg-card__copy lg-mt-3">
        Achievements are separate from points and have no cash value. None are published yet.
      </p>
      <div className="lg-achieve-grid lg-mt-5">
        {['Pool', 'Tournaments', 'Visits', 'Arcade'].map((label) => (
          <article key={label} className="lg-achieve">
            <p className="lg-eyebrow lg-eyebrow--tight">Locked</p>
            <h3 className="lg-mt-1">{label}</h3>
            <p className="lg-card__muted lg-mt-1">Waiting for a published achievement.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
