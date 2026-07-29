import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signOutEstateOwner } from '@shared/services/estateVaultAuth.js';
import { ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import EstateBrandTitle from './EstateBrandTitle';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateSuperEstatesPanel from './EstateSuperEstatesPanel';
import EstateSuperUsersPanel from './EstateSuperUsersPanel';
import EstateSuperAuditPanel from './EstateSuperAuditPanel';
import './EstateInventoryApp.css';

const TABS = [
  { id: 'estates', label: 'Estates' },
  { id: 'users', label: 'Owners' },
  { id: 'audit', label: 'Operator audit' }
];

/**
 * Super Admin console shell after allowlist gate.
 */
const EstateSuperHome = ({ session }) => {
  const [tab, setTab] = useState('estates');

  return (
    <div className="estate-inventory ei-landing ei-super">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">Super Admin</p>
        <EstateBrandTitle />
        <p className="ei-lede">
          Operator console for <strong>{session?.email}</strong>.
          <br />
          Every major action is sealed in the operator audit log (not the PR activity log).
        </p>
      </header>

      <div className="ei-portal-card ei-super-card">
        <div className="ei-owner-mode-tabs" role="tablist" aria-label="Super Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`ei-owner-mode-tab${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'estates' ? <EstateSuperEstatesPanel /> : null}
        {tab === 'users' ? <EstateSuperUsersPanel /> : null}
        {tab === 'audit' ? <EstateSuperAuditPanel /> : null}

        <p className="ei-settings-hint" style={{ marginTop: '1rem' }}>
          <Link to={ESTATEIT_PATH}>Estate Vault home</Link>
          {' · '}
          <Link to={`${ESTATEIT_PATH}/owner`}>My estates</Link>
          {' · '}
          <button
            type="button"
            className="ei-linkish"
            onClick={() => signOutEstateOwner().then(() => window.location.reload())}
          >
            Sign out
          </button>
        </p>
      </div>

      <EstateSystemDisclaimer generic />
    </div>
  );
};

export default EstateSuperHome;
