import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrganization, listIndustries } from '../../services/itemsureOrgService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { Card, ErrorNote, Field, PageHead } from './ItemsureUi.jsx';

export default function ItemsureSetup() {
  const navigate = useNavigate();
  const { user, workspace, reload } = useItemsureWorkspace();
  const [industries, setIndustries] = useState(null);
  const [name, setName] = useState('');
  const [industryType, setIndustryType] = useState('general');
  const { busy, error, setError, run } = useItemsureAction();
  const hasOrganizations = (workspace?.memberships || []).length > 0;

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
      navigate(ITEMSURE_PATH);
    }
  };

  return (
    <div className="isu-page">
      <PageHead
        title={hasOrganizations ? 'Add another business' : 'Set up your business'}
        description="You will be the owner. You can add locations and items next."
      />
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
