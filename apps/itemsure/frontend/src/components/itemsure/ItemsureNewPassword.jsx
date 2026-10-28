import React, { useState } from 'react';
import { updatePassword } from '../../services/itemsureAuthService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Field, Modal } from './ItemsureUi.jsx';

export default function ItemsureNewPassword({ onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, error, run } = useItemsureAction();

  const submit = async (event) => {
    event.preventDefault();
    const ok = await run(async () => {
      if (password.length < 8 || password.length > 72) throw new Error('Use a password between 8 and 72 characters.');
      if (password !== confirm) throw new Error('Those passwords do not match.');
      await updatePassword(password);
    });
    if (ok) onClose();
  };

  return (
    <Modal open title="Choose a new password" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <ErrorNote message={error} />
        <Field label="New password" hint="At least 8 characters.">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
          {busy ? 'Saving\u2026' : 'Save password'}
        </button>
      </form>
    </Modal>
  );
}
