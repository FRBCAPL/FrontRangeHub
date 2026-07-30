import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import EstateSettingsCaseModal from './EstateSettingsCaseModal';
import EstateSettingsAuctionModal from './EstateSettingsAuctionModal';
import EstateSettingsAdminPasswordModal from './EstateSettingsAdminPasswordModal';
import EstateSettingsHelperPasswordModal from './EstateSettingsHelperPasswordModal';
import EstateSettingsHeirsModal from './EstateSettingsHeirsModal';
import EstateSettingsViewPasswordsModal from './EstateSettingsViewPasswordsModal';
import EstateSettingsActivityModal from './EstateSettingsActivityModal';
import EstateSettingsRecordsModal from './EstateSettingsRecordsModal';
import { EstateSettingsShell } from './EstateSettingsShell';

const SECTIONS = [
  {
    id: 'passwords',
    label: 'View passwords',
    hint: 'Show admin, helper, and each person’s PIN'
  },
  {
    id: 'activity',
    label: 'Activity log',
    hint: 'Who signed in and key actions on this estate'
  },
  {
    id: 'records',
    label: 'Records & retention',
    hint: 'Close/reopen the estate and review what records are kept'
  },
  {
    id: 'case',
    label: 'Estate & probate',
    hint: 'Estate name, optional court case number, and probate window'
  },
  {
    id: 'auction',
    label: 'Auction',
    hint: 'Start/end dates, pickup window, and PR bid-block emails'
  },
  {
    id: 'admin',
    label: 'Admin password',
    hint: 'Executor / PR unlock password'
  },
  {
    id: 'helper',
    label: 'Helper password',
    hint: 'Shared password for inventory assistants'
  },
  {
    id: 'heirs',
    label: 'Family / heirs',
    hint: 'People, access tiers, admin labels, and per-person PINs'
  }
];

/**
 * Settings menu — opens one focused section modal at a time (no long scroll form).
 */
const EstateSettingsModal = ({ open, onClose, initialSettings, onSaved }) => {
  const [section, setSection] = useState(null);
  const [settings, setSettings] = useState(initialSettings || null);
  const [passwordRefreshKey, setPasswordRefreshKey] = useState(0);

  React.useEffect(() => {
    if (!open) {
      setSection(null);
      return;
    }
    setSettings(initialSettings || null);
    setPasswordRefreshKey((k) => k + 1);
  }, [open, initialSettings]);

  const handleSaved = (data) => {
    if (data) setSettings(data);
    onSaved?.(data);
  };

  const handlePasswordSaved = () => {
    setPasswordRefreshKey((k) => k + 1);
  };

  const closeSection = () => setSection(null);

  if (!open) return null;

  return (
    <>
      {!section ? (
        <EstateSettingsShell
          open
          onClose={onClose}
          title="Estate settings"
          titleId="ei-settings-menu-title"
          foot={
            <button type="button" className="ei-btn" onClick={onClose}>
              Close
            </button>
          }
        >
          <div className="ei-modal-body">
            <p className="ei-settings-intro">
              Choose a section to open. Each area saves on its own — financial cards still edit from
              the Financial Health Snapshot on the admin home.
            </p>
            <div className="ei-settings-menu-grid" role="navigation" aria-label="Settings sections">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="ei-action ei-settings-menu-card"
                  onClick={() => setSection(s.id)}
                >
                  <span className="ei-action-label">{s.label}</span>
                  <span className="ei-action-hint">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </EstateSettingsShell>
      ) : null}

      <EstateSettingsViewPasswordsModal
        open={section === 'passwords'}
        onClose={closeSection}
        refreshKey={passwordRefreshKey}
      />
      <EstateSettingsActivityModal open={section === 'activity'} onClose={closeSection} />
      <EstateSettingsRecordsModal
        open={section === 'records'}
        onClose={closeSection}
        settings={settings}
        onChanged={async () => {
          const result = await estateInventoryService.getSettings(settings?.case_number);
          if (result.success) handleSaved(result.data);
        }}
      />
      <EstateSettingsCaseModal
        open={section === 'case'}
        onClose={closeSection}
        initialSettings={settings}
        onSaved={handleSaved}
      />
      <EstateSettingsAuctionModal
        open={section === 'auction'}
        onClose={closeSection}
        initialSettings={settings}
        onSaved={handleSaved}
      />
      <EstateSettingsAdminPasswordModal
        open={section === 'admin'}
        onClose={closeSection}
        onSaved={handlePasswordSaved}
      />
      <EstateSettingsHelperPasswordModal
        open={section === 'helper'}
        onClose={closeSection}
        onSaved={handlePasswordSaved}
      />
      <EstateSettingsHeirsModal
        open={section === 'heirs'}
        onClose={closeSection}
        onInvitePasswordSaved={handlePasswordSaved}
      />
    </>
  );
};

export default EstateSettingsModal;
