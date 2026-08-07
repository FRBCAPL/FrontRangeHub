import React from 'react';
import {
  HEIR_ACCESS_TIER_OPTIONS,
  FAMILY_FINANCIAL_VISIBILITY_OPTIONS,
  normalizeHeirAccessTier,
  normalizeFamilyFinancialVisibility,
  heirAdminLabel,
  heirPublicName,
  isMemorandumOnlyHeir
} from '@shared/utils/estateInventoryConstants.js';
import { visibilitySectionsForPreset } from '@shared/utils/estateVisibilitySections.js';
import HeirVisibilitySectionsEditor from './HeirVisibilitySectionsEditor';

/**
 * One-person settings card for Family / heirs modal.
 */
const EstateSettingsHeirPersonPage = ({
  heir,
  inviteStatusLabel,
  advisors = [],
  resettingPin = false,
  onTierChange,
  onFinancialVisibilityChange,
  onVisibilitySectionsChange,
  onBrowseRoomsChange,
  onResetInvite,
  onRename,
  onRemove
}) => {
  const adminLabel = heirAdminLabel(heir);
  const publicName = heirPublicName(heir);
  const preferred = String(heir.preferred_name || '').trim();
  const tier = normalizeHeirAccessTier(heir.access_tier);
  const memoOnly = isMemorandumOnlyHeir(tier);
  const browseOn = memoOnly ? Boolean(heir.can_browse_rooms) : true;
  const financialVis = memoOnly
    ? 'minimal'
    : normalizeFamilyFinancialVisibility(heir.financial_visibility);
  const sections = heir.visibility_sections || visibilitySectionsForPreset(financialVis, tier);

  return (
    <article className="ei-heir-person-card" aria-labelledby={`ei-heir-person-${heir.sibling_key}`}>
      <header className="ei-heir-person-card-head">
        <h4 id={`ei-heir-person-${heir.sibling_key}`} className="ei-heir-person-card-title">
          {adminLabel}
        </h4>
        <p className="ei-heir-invite-status">
          App name: {preferred ? preferred : 'Not set yet'}
          {preferred && preferred !== adminLabel ? ` · shows as ${publicName}` : ''}
        </p>
        <p className="ei-heir-invite-status">{inviteStatusLabel}</p>
        {advisors.length ? (
          <p className="ei-heir-invite-status">
            Advisor{advisors.length > 1 ? 's' : ''}:{' '}
            {advisors.map((c) => c.display_name).join(', ')}
          </p>
        ) : null}
      </header>

      <div className="ei-heir-person-card-body">
        <label className="ei-heir-tier-label" htmlFor={`ei-tier-${heir.sibling_key}`}>
          Access
          <select
            id={`ei-tier-${heir.sibling_key}`}
            className="ei-heir-tier-select"
            value={tier}
            onChange={(e) => onTierChange(heir.sibling_key, adminLabel, e.target.value)}
          >
            {HEIR_ACCESS_TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} title={opt.hint}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <p className="ei-settings-hint ei-heir-tier-hint">
          {HEIR_ACCESS_TIER_OPTIONS.find((o) => o.value === tier)?.hint}
        </p>

        <label className="ei-heir-tier-label" htmlFor={`ei-fin-vis-${heir.sibling_key}`}>
          Financial disclosure
          <select
            id={`ei-fin-vis-${heir.sibling_key}`}
            className="ei-heir-tier-select"
            value={financialVis}
            disabled={memoOnly}
            onChange={(e) =>
              onFinancialVisibilityChange(
                heir.sibling_key,
                adminLabel,
                e.target.value,
                memoOnly
              )
            }
          >
            {FAMILY_FINANCIAL_VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} title={opt.hint}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <p className="ei-settings-hint ei-heir-tier-hint">
          {memoOnly
            ? 'Specific Gift Recipients stay on Minimal finance. Portal tiles can still be customized.'
            : FAMILY_FINANCIAL_VISIBILITY_OPTIONS.find((o) => o.value === financialVis)?.hint}
        </p>

        <HeirVisibilitySectionsEditor
          siblingKey={heir.sibling_key}
          sections={sections}
          accessTier={tier}
          financialVisibility={financialVis}
          memoOnly={memoOnly}
          alwaysOpen
          onChange={(next) =>
            onVisibilitySectionsChange(
              heir.sibling_key,
              adminLabel,
              next,
              financialVis,
              tier
            )
          }
        />

        {memoOnly ? (
          <label className="ei-heir-browse-toggle" htmlFor={`ei-browse-${heir.sibling_key}`}>
            <input
              id={`ei-browse-${heir.sibling_key}`}
              type="checkbox"
              checked={browseOn}
              onChange={(e) =>
                onBrowseRoomsChange(heir.sibling_key, adminLabel, e.target.checked)
              }
            />
            <span>
              Allow browsing rooms / collections
              <em> (view only — cannot request items)</em>
            </span>
          </label>
        ) : (
          <p className="ei-settings-hint ei-heir-browse-always">
            Use the Rooms & inventory checkbox above to show or hide that portal tile.
          </p>
        )}
      </div>

      <div className="ei-heir-person-card-actions ei-btn-row">
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          disabled={resettingPin}
          onClick={() => onResetInvite(heir.sibling_key, adminLabel)}
        >
          {resettingPin ? 'Saving…' : 'New PIN'}
        </button>
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          onClick={() => onRename(heir.sibling_key, adminLabel)}
        >
          Edit label
        </button>
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          onClick={() => onRemove(heir.sibling_key, adminLabel)}
        >
          Remove
        </button>
      </div>
    </article>
  );
};

export default EstateSettingsHeirPersonPage;
