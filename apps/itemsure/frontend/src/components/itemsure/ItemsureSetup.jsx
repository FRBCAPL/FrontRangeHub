import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrganization, listIndustries } from '../../services/itemsureOrgService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, sites } from '../../data/itemsureTerms.js';
import { Card, ErrorNote, Field, PageHead } from './ItemsureUi.jsx';
import ItemsureLevelsExplainer from './ItemsureLevelsExplainer.jsx';
import { ArchivedBusinesses } from './ItemsureBusinessArchive.jsx';

export default function ItemsureSetup() {
  const navigate = useNavigate();
  const { user, workspace, reload } = useItemsureWorkspace();
  const [industries, setIndustries] = useState(null);
  const [name, setName] = useState('');
  const [industryType, setIndustryType] = useState('general');
  const { busy, error, setError, run } = useItemsureAction();
  const hasOrganizations = (workspace?.memberships || []).length > 0;
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    listIndustries()
      .then(setIndustries)
      .catch((e) => {
        setIndustries([]);
        setError(e.message);
      });
  }, [setError]);

  const submit = async (event) => {
    event.preventDefault();
    const ok = await run(() => createOrganization(user.id, { name, industryType }));
    if (ok) {
      await reload();
      navigate(ITEMSURE_PATH, hasOrganizations ? { state: { newBusiness: name.trim() } } : undefined);
    }
  };

  if (hasOrganizations && !confirmed) {
    return (
      <div className="isu-page">
        <PageHead title="Create a separate business?" />
        <div className="isu-card isu-empty isu-setup-confirm">
          <p>
            This makes a <strong>brand-new business</strong> with its own {sites}, items, and stock. You&apos;ll be switched to it, and
            your current business stays exactly as it is. You can switch back any time from the business name at the top of the page.
          </p>
          <p className="isu-muted">
            Just adding a bar, store, warehouse, or van to <strong>{workspace.organization?.name || 'your business'}</strong>? Add a {site} instead.
          </p>
          <div className="isu-quickcount-actions">
            <button type="button" className="isu-btn isu-btn--primary" onClick={() => navigate(`${ITEMSURE_PATH}/locations`)}>Add a {site}</button>
            <button type="button" className="isu-btn isu-btn--ghost" onClick={() => setConfirmed(true)}>Yes, create a new business</button>
          </div>
        </div>
        <ItemsureLevelsExplainer focus="business" open />
      </div>
    );
  }

  return (
    <div className="isu-page">
      <PageHead
        title={hasOrganizations ? 'Add another business' : 'Set up your business'}
        description={hasOrganizations
          ? `A separate business with its own ${sites} and items. You will be the owner.`
          : `You will be the owner. You can add ${sites} and items next.`}
      />
      {!hasOrganizations && (workspace?.archived || []).length ? (
        <Card title="Bring back a business">
          <ArchivedBusinesses />
        </Card>
      ) : null}
      <Card>
        <form onSubmit={submit} noValidate>
          <ErrorNote message={error} />
          <Field label="Business name">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="organization" />
          </Field>
          <Field label="Industry" hint="A label for future templates. Every industry uses the same inventory records.">
            <select value={industryType} onChange={(e) => setIndustryType(e.target.value)} disabled={!industries?.length}>
              {(industries || []).map((i) => (
                <option key={i.code} value={i.code}>{i.name}</option>
              ))}
            </select>
          </Field>
          {industries && industries.length === 0 && !error ? (
            <p className="isu-hint">No industries found. Apply the ItemSure seed migration.</p>
          ) : null}
          <button type="submit" className="isu-btn isu-btn--primary" disabled={busy || !industries?.length}>
            {busy ? 'Creating\u2026' : 'Create business'}
          </button>
        </form>
      </Card>
    </div>
  );
}
