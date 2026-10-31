import React, { useState } from 'react';
import { updateProfileName } from '../../services/itemsureOrgService.js';
import { sendReset } from '../../services/itemsureAuthService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { Card, ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureDisplaySettings from './ItemsureDisplaySettings.jsx';

/** Settings → Your profile: name, sign-in email, password reset, and display on this device. */
export default function ItemsureSettingsProfile() {
  const { user, workspace, reload } = useItemsureWorkspace();
  const [name, setName] = useState(workspace?.fullName || '');
  const [notice, setNotice] = useState('');
  const save = useItemsureAction();
  const reset = useItemsureAction();

  return (
    <div className="isu-stack">
      <Card>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setNotice('');
            if (await save.run(() => updateProfileName(user.id, name))) {
              await reload();
              setNotice('Saved.');
            }
          }}
          noValidate
        >
          <ErrorNote message={save.error || reset.error} />
          {notice ? <p className="isu-notice" role="status">{notice}</p> : null}
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
          </Field>
          <p className="isu-muted isu-small">Signed in as {workspace?.email || user.email}</p>
          <div className="isu-card-actions">
            <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={save.busy}>Save name</button>
            <button
              type="button"
              className="isu-btn isu-btn--ghost isu-btn--sm"
              disabled={reset.busy}
              onClick={async () => {
                setNotice('');
                if (await reset.run(() => sendReset(user.email))) setNotice('A password reset link was sent to your email.');
              }}
            >
              Email me a password reset link
            </button>
          </div>
        </form>
      </Card>
      <ItemsureDisplaySettings />
    </div>
  );
}
