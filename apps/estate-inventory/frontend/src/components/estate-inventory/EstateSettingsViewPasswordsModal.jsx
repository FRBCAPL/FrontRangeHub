import React, { useEffect, useState } from 'react';
import EstateSettingsAccessPasswords from './EstateSettingsAccessPasswords';
import { EstateSettingsShell } from './EstateSettingsShell';

/**
 * Dedicated modal to view current shared / temp passwords for all login levels.
 */
const EstateSettingsViewPasswordsModal = ({ open, onClose, refreshKey = 0 }) => {
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLocalRefresh((k) => k + 1);
  }, [open, refreshKey]);

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Current passwords"
      titleId="ei-settings-view-pass-title"
      foot={
        <button type="button" className="ei-btn" onClick={onClose}>
          Back
        </button>
      }
    >
      <div className="ei-modal-body">
        <EstateSettingsAccessPasswords refreshKey={localRefresh} />
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsViewPasswordsModal;
