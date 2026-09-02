import React from 'react';

export default function UsaplPlayerFields({ title, player, onChange, requiredName = false }) {
  const set = (key) => (event) => onChange({ ...player, [key]: event.target.value });

  return (
    <div className="usapl-player-card">
      {title ? <h3 style={{ margin: '0 0 10px', color: 'var(--usapl-red)' }}>{title}</h3> : null}
      <div className="usapl-player-grid">
        <div className="usapl-field">
          <label>First name{requiredName ? ' *' : ''}</label>
          <input value={player.firstName} onChange={set('firstName')} autoComplete="given-name" required={requiredName} />
        </div>
        <div className="usapl-field">
          <label>MI</label>
          <input value={player.middleInitial} onChange={set('middleInitial')} maxLength={2} />
        </div>
        <div className="usapl-field">
          <label>Last name{requiredName ? ' *' : ''}</label>
          <input value={player.lastName} onChange={set('lastName')} autoComplete="family-name" required={requiredName} />
        </div>
        <div className="usapl-field">
          <label>Email</label>
          <input type="email" value={player.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div className="usapl-field">
          <label>Phone</label>
          <input type="tel" value={player.phone} onChange={set('phone')} autoComplete="tel" />
        </div>
        <div className="usapl-field">
          <label>Address</label>
          <input value={player.address} onChange={set('address')} autoComplete="street-address" />
        </div>
        <div className="usapl-field">
          <label>City</label>
          <input value={player.city} onChange={set('city')} autoComplete="address-level2" />
        </div>
        <div className="usapl-field">
          <label>State</label>
          <input value={player.state} onChange={set('state')} autoComplete="address-level1" />
        </div>
        <div className="usapl-field">
          <label>ZIP</label>
          <input value={player.zip} onChange={set('zip')} autoComplete="postal-code" />
        </div>
      </div>
    </div>
  );
}
