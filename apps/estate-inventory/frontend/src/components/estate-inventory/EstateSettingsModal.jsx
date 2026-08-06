import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import EstateSettingsCaseModal from './EstateSettingsCaseModal';
import EstateSettingsAuctionModal from './EstateSettingsAuctionModal';
import EstateSettingsAdminPasswordModal from './EstateSettingsAdminPasswordModal';
import EstateSettingsHelpersModal from './EstateSettingsHelpersModal';
import EstateSettingsHeirsModal from './EstateSettingsHeirsModal';
import EstateSettingsViewPasswordsModal from './EstateSettingsViewPasswordsModal';
import EstateSettingsActivityModal from './EstateSettingsActivityModal';
import EstateSettingsRecordsModal from './EstateSettingsRecordsModal';
import EstateSettingsBillingModal from './EstateSettingsBillingModal';
import EstateSettingsContactsModal from './EstateSettingsContactsModal';
import { EstateSettingsShell } from './EstateSettingsShell';

/** Settings hub — grouped cards in a multi-column layout (not one long list). */
const SETTINGS_GROUPS = [
  {
    id: 'estate',
    title: 'Estate',
    items: [
      {
        id: 'case',
        label: 'Case settings',
        hint: 'Name, court case number, probate clock, family disclosure'
      },
      {
        id: 'auction',
        label: 'Sale / Auction',
        hint: 'Dates, pickup window, PR bid-block emails'
      },
      {
        id: 'contacts',
        label: 'Contacts',
        hint: 'Attorneys, CPA, banks, utilities, and more'
      }
    ]
  },
  {
    id: 'people',
    title: 'People & access',
    items: [
      {
        id: 'heirs',
        label: 'Family / heirs',
        hint: 'People, access tiers, and per-person PINs'
      },
      {
        id: 'helper',
        label: 'Helpers',
        hint: 'Named inventory assistants and PINs'
      },
      {
        id: 'admin',
        label: 'Admin PIN',
        hint: 'Executor / PR unlock password'
      },
      {
        id: 'passwords',
        label: 'View passwords',
        hint: 'Show admin, helper, and each person’s PIN'
      }
    ]
  },
  {
    id: 'account',
    title: 'Account & records',
    items: [
      {
        id: 'billing',
        label: 'Billing',
        hint: 'Trial, subscription, and renew for this estate'
      },
      {
        id: 'activity',
        label: 'Activity log',
        hint: 'Who signed in and key actions'
      },
      {
        id: 'records',
        label: 'Records & retention',
        hint: 'Close/reopen and review what is kept'
      }
    ]
  }
];

const ALL_SECTION_IDS = SETTINGS_GROUPS.flatMap((g) => g.items.map((s) => s.id));

/**
 * Settings menu — opens one focused section modal at a time.
 */
const EstateSettingsModal = ({ open, onClose, initialSettings, onSaved, initialSection = null }) => {
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
    if (initialSection && ALL_SECTION_IDS.includes(initialSection)) {
      setSection(initialSection);
    } else {
      setSection(null);
    }
  }, [open, initialSettings, initialSection]);

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
          wide
          extraClass="ei-settings-hub-modal"
          foot={
            <button type="button" className="ei-btn" onClick={onClose}>
              Close
            </button>
          }
        >
          <div className="ei-modal-body">
            <p className="ei-settings-intro">
              Choose a section. Each area saves on its own — money cards still edit from Financial
              Health on the admin home.
            </p>
            <div className="ei-settings-menu-columns" role="navigation" aria-label="Settings sections">
              {SETTINGS_GROUPS.map((group) => (
                <section key={group.id} className="ei-settings-menu-group" aria-labelledby={`ei-set-g-${group.id}`}>
                  <h4 id={`ei-set-g-${group.id}`} className="ei-settings-menu-group-title">
                    {group.title}
                  </h4>
                  <div className="ei-settings-menu-grid">
                    {group.items.map((s) => (
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
                </section>
              ))}
            </div>
          </div>
        </EstateSettingsShell>
      ) : null}

      <EstateSettingsContactsModal open={section === 'contacts'} onClose={closeSection} />
      <EstateSettingsViewPasswordsModal
        open={section === 'passwords'}
        onClose={closeSection}
        refreshKey={passwordRefreshKey}
      />
      <EstateSettingsBillingModal
        open={section === 'billing'}
        onClose={closeSection}
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
      <EstateSettingsHelpersModal
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
