import React, { useState } from 'react';
import { saveFeatures } from '../../services/itemsureOrgService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { FEATURES } from '../../utils/itemsureFeatures.js';
import { Card, ErrorNote } from './ItemsureUi.jsx';

/** "Simple mode": which optional parts of ItemSure this business uses. Hiding never deletes anything. */
export default function ItemsureFeatureSwitches() {
  const { organization, features, can, reload } = useItemsureWorkspace();
  const [draft, setDraft] = useState(features);
  const [notice, setNotice] = useState('');
  const save = useItemsureAction();
  const canEdit = can('organization.update') && organization.featuresSaved;
  const changed = FEATURES.some(({ key }) => draft[key] !== features[key]);

  const submit = async (event) => {
    event.preventDefault();
    setNotice('');
    if (await save.run(() => saveFeatures(organization.id, draft))) {
      await reload();
      setNotice('Saved.');
    }
  };

  return (
    <Card title="Features">
      <p className="isu-muted isu-small">
        Keep ItemSure simple by switching off what you don&apos;t use. Switching something off only hides it; nothing is deleted, and you can switch it back on any time.
      </p>
      {!organization.featuresSaved ? (
        <p className="isu-notice">These switches need a database update before they can be changed. Until then, everything stays switched on.</p>
      ) : null}
      <form className="isu-stack" onSubmit={submit}>
        <ErrorNote message={save.error} />
        {notice ? <p className="isu-notice" role="status">{notice}</p> : null}
        <ul className="isu-feature-list">
          {FEATURES.map(({ key, label, hint }) => (
            <li key={key}>
              <label className="isu-feature">
                <input
                  type="checkbox"
                  role="switch"
                  checked={draft[key]}
                  disabled={!canEdit}
                  onChange={(e) => {
                    setNotice('');
                    setDraft((d) => ({ ...d, [key]: e.target.checked }));
                  }}
                />
                <span>
                  <strong>{label}</strong>
                  <span className="isu-muted isu-small isu-feature-hint">{hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {canEdit ? (
          <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={save.busy || !changed}>
            {save.busy ? 'Saving…' : 'Save features'}
          </button>
        ) : organization.featuresSaved ? (
          <p className="isu-muted isu-small">Only the owner or an administrator can change these.</p>
        ) : null}
      </form>
    </Card>
  );
}
