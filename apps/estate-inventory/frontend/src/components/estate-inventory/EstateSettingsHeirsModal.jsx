import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  HEIR_ACCESS_TIER,
  HEIR_ACCESS_TIER_OPTIONS,
  generateHeirInviteCode,
  normalizeHeirAccessTier,
  normalizeFamilyFinancialVisibility,
  heirAdminLabel,
  isMemorandumOnlyHeir
} from '@shared/utils/estateInventoryConstants.js';
import { normalizeVisibilitySections } from '@shared/utils/estateVisibilitySections.js';
import { EstateSettingsShell } from './EstateSettingsShell';
import { useEstateCase } from './EstateCaseContext';
import EstateSettingsHeirPersonPage from './EstateSettingsHeirPersonPage';

const PAGE = {
  list: 'list',
  person: 'person',
  add: 'add'
};

const EstateSettingsHeirsModal = ({ open, onClose, onInvitePasswordSaved }) => {
  const { caseNumber } = useEstateCase();
  const [heirAccounts, setHeirAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [inviteByKey, setInviteByKey] = useState({});
  const [newHeirName, setNewHeirName] = useState('');
  const [newHeirTier, setNewHeirTier] = useState(HEIR_ACCESS_TIER.residual);
  const [newHeirInvite, setNewHeirInvite] = useState(() => generateHeirInviteCode());
  const [addingHeir, setAddingHeir] = useState(false);
  const [resettingKey, setResettingKey] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [lastIssued, setLastIssued] = useState(null);
  const [page, setPage] = useState(PAGE.list);
  const [personIndex, setPersonIndex] = useState(0);

  const refreshHeirs = async () => {
    const [listResult, passResult, contactsResult] = await Promise.all([
      estateInventoryService.listSiblingAccounts(caseNumber),
      estateInventoryService.getAccessPasswords(caseNumber),
      estateInventoryService.listEstateContacts(caseNumber)
    ]);
    const list = listResult.success ? listResult.data || [] : null;
    if (list) setHeirAccounts(list);
    if (passResult.success) {
      const map = {};
      (passResult.data?.heirs || []).forEach((h) => {
        if (h?.sibling_key) map[h.sibling_key] = h;
      });
      setInviteByKey(map);
    }
    if (contactsResult.success) setContacts(contactsResult.data || []);
    return list;
  };

  useEffect(() => {
    if (!open) return;
    setNewHeirName('');
    setNewHeirTier(HEIR_ACCESS_TIER.residual);
    setNewHeirInvite(generateHeirInviteCode());
    setAddingHeir(false);
    setResettingKey('');
    setError('');
    setInfo('');
    setLastIssued(null);
    setPage(PAGE.list);
    setPersonIndex(0);
    refreshHeirs();
  }, [open]);

  useEffect(() => {
    if (page !== PAGE.person) return;
    if (heirAccounts.length === 0) {
      setPage(PAGE.list);
      setPersonIndex(0);
      return;
    }
    if (personIndex > heirAccounts.length - 1) {
      setPersonIndex(heirAccounts.length - 1);
    }
  }, [heirAccounts, page, personIndex]);

  const goList = () => {
    setError('');
    setPage(PAGE.list);
  };

  const openPerson = (index) => {
    setError('');
    setInfo('');
    setPersonIndex(index);
    setPage(PAGE.person);
  };

  const goPrevPerson = () => {
    setError('');
    setInfo('');
    setPersonIndex((i) => Math.max(0, i - 1));
  };

  const goNextPerson = () => {
    setError('');
    setInfo('');
    setPersonIndex((i) => Math.min(heirAccounts.length - 1, i + 1));
  };

  const handleAddHeir = async (e) => {
    e?.preventDefault?.();
    const name = newHeirName.trim();
    const invite = (newHeirInvite || generateHeirInviteCode()).trim();
    if (name.length < 2) return;
    setAddingHeir(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.addHeir(name, newHeirTier, invite, caseNumber);
    setAddingHeir(false);
    if (!result.success) {
      setError(result.error || 'Could not add person.');
      return;
    }
    const display = result.data?.display_name || name;
    const siblingKey = String(result.data?.sibling_key || '').trim();
    setLastIssued({ name: display, code: invite });
    setNewHeirName('');
    setNewHeirTier(HEIR_ACCESS_TIER.residual);
    setNewHeirInvite(generateHeirInviteCode());
    setInfo(`Added ${display}. PIN: ${invite}`);
    onInvitePasswordSaved?.();
    const list = await refreshHeirs();
    const idx = (list || []).findIndex((h) => h.sibling_key === siblingKey);
    if (idx >= 0) {
      setPersonIndex(idx);
      setPage(PAGE.person);
      return;
    }
    setPage(PAGE.list);
  };

  const handleResetInvite = async (siblingKey, label) => {
    const code = generateHeirInviteCode();
    const ok = window.confirm(
      `Generate a new PIN for ${label}?\n\n` +
        `New PIN: ${code}\n\n` +
        'Share the new PIN with them only. Their old PIN will stop working.'
    );
    if (!ok) return;
    setResettingKey(siblingKey);
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirPersonInvitePassword(
      siblingKey,
      code,
      caseNumber
    );
    setResettingKey('');
    if (!result.success) {
      setError(result.error || `Could not set PIN for ${label}.`);
      return;
    }
    setLastIssued({ name: label, code });
    setInfo(`PIN updated for ${label}. New PIN: ${code}`);
    onInvitePasswordSaved?.();
    await refreshHeirs();
  };

  const handleHeirTierChange = async (siblingKey, label, nextTier) => {
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirAccessTier(
      siblingKey,
      nextTier,
      caseNumber
    );
    if (!result.success) {
      setError(result.error || `Could not update access for ${label}.`);
      await refreshHeirs();
      return;
    }
    setHeirAccounts((prev) =>
      prev.map((h) =>
        h.sibling_key === siblingKey
          ? {
              ...h,
              access_tier: normalizeHeirAccessTier(nextTier),
              can_browse_rooms:
                result.data?.can_browse_rooms != null
                  ? Boolean(result.data.can_browse_rooms)
                  : normalizeHeirAccessTier(nextTier) !== HEIR_ACCESS_TIER.memorandum,
              financial_visibility: normalizeFamilyFinancialVisibility(
                result.data?.financial_visibility ||
                  (normalizeHeirAccessTier(nextTier) === HEIR_ACCESS_TIER.memorandum
                    ? 'minimal'
                    : h.financial_visibility)
              ),
              visibility_sections: normalizeVisibilitySections(
                result.data?.visibility_sections ?? null,
                {
                  tier:
                    result.data?.financial_visibility ||
                    (normalizeHeirAccessTier(nextTier) === HEIR_ACCESS_TIER.memorandum
                      ? 'minimal'
                      : h.financial_visibility),
                  accessTier: nextTier
                }
              )
            }
          : h
      )
    );
    setInfo(`Updated access for ${label}.`);
  };

  const applyHeirVisibilityResult = (siblingKey, result, fallbackVis, accessTier) => {
    const saved = normalizeFamilyFinancialVisibility(
      result.data?.financial_visibility || fallbackVis
    );
    const sections = normalizeVisibilitySections(result.data?.visibility_sections, {
      tier: saved,
      accessTier: result.data?.access_tier || accessTier
    });
    setHeirAccounts((prev) =>
      prev.map((h) =>
        h.sibling_key === siblingKey
          ? {
              ...h,
              financial_visibility: saved,
              visibility_sections: sections,
              can_browse_rooms:
                result.data?.can_browse_rooms != null
                  ? Boolean(result.data.can_browse_rooms)
                  : Boolean(sections.rooms_inventory)
            }
          : h
      )
    );
  };

  const handleFinancialVisibilityChange = async (siblingKey, label, nextVisibility, memoOnly) => {
    if (memoOnly) return;
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirFinancialVisibility(
      siblingKey,
      nextVisibility,
      caseNumber
    );
    if (!result.success) {
      setError(result.error || `Could not update financial disclosure for ${label}.`);
      await refreshHeirs();
      return;
    }
    applyHeirVisibilityResult(siblingKey, result, nextVisibility);
    setInfo(`Updated disclosure preset for ${label}.`);
  };

  const handleVisibilitySectionsChange = async (
    siblingKey,
    label,
    nextSections,
    financialVisibility,
    accessTier
  ) => {
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirVisibilitySections(
      siblingKey,
      nextSections,
      caseNumber,
      financialVisibility
    );
    if (!result.success) {
      setError(result.error || `Could not update sections for ${label}.`);
      await refreshHeirs();
      return;
    }
    applyHeirVisibilityResult(siblingKey, result, financialVisibility, accessTier);
    setInfo(`Updated sections for ${label}.`);
  };

  const handleBrowseRoomsChange = async (siblingKey, label, checked) => {
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirCanBrowseRooms(
      siblingKey,
      checked,
      caseNumber
    );
    if (!result.success) {
      setError(result.error || `Could not update room browsing for ${label}.`);
      await refreshHeirs();
      return;
    }
    setHeirAccounts((prev) =>
      prev.map((h) =>
        h.sibling_key === siblingKey
          ? {
              ...h,
              can_browse_rooms:
                result.data?.can_browse_rooms != null
                  ? Boolean(result.data.can_browse_rooms)
                  : Boolean(checked)
            }
          : h
      )
    );
    setInfo(
      checked
        ? `${label} can browse rooms (view only).`
        : `${label} can no longer browse full rooms.`
    );
  };

  const handleRenameHeir = async (siblingKey, currentName) => {
    const next = window.prompt('Admin label for this person (your record name):', currentName || '');
    if (next == null) return;
    const name = next.trim();
    if (name.length < 2) {
      setError('Admin label must be at least 2 characters.');
      return;
    }
    setError('');
    setInfo('');
    const result = await estateInventoryService.renameHeir(siblingKey, name, caseNumber);
    if (!result.success) {
      setError(result.error || 'Could not rename.');
      return;
    }
    setInfo(`Updated admin label to ${result.data?.display_name || name}.`);
    await refreshHeirs();
  };

  const handleRemoveHeir = async (siblingKey, label) => {
    const ok = window.confirm(`Remove ${label} from the family portal?`);
    if (!ok) return;
    setError('');
    setInfo('');
    const result = await estateInventoryService.removeHeir(siblingKey, caseNumber);
    if (!result.success) {
      setError(result.error || `Could not remove ${label}.`);
      return;
    }
    setInfo(`Removed ${label}.`);
    await refreshHeirs();
    setPage(PAGE.list);
  };

  const inviteStatus = (siblingKey) => {
    const row = inviteByKey[siblingKey];
    if (!row) return 'PIN not loaded';
    if (row.invite_configured) return 'PIN ready';
    return 'Needs PIN';
  };

  const advisorsForHeir = (siblingKey) =>
    (contacts || []).filter((c) => c.linked_sibling_key === siblingKey);

  const activeHeir = page === PAGE.person ? heirAccounts[personIndex] : null;
  const personCount = heirAccounts.length;
  const personLabel = activeHeir ? heirAdminLabel(activeHeir) : '';

  const foot =
    page === PAGE.person && activeHeir ? (
      <>
        <button type="button" className="ei-btn ei-btn-secondary" onClick={goList}>
          All people
        </button>
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={goPrevPerson}
          disabled={personIndex <= 0}
        >
          Previous
        </button>
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={goNextPerson}
          disabled={personIndex >= personCount - 1}
        >
          Next
        </button>
        <button type="button" className="ei-btn" onClick={onClose}>
          Done
        </button>
      </>
    ) : page === PAGE.add ? (
      <>
        <button type="button" className="ei-btn ei-btn-secondary" onClick={goList}>
          Cancel
        </button>
        <button
          type="submit"
          form="ei-heir-add-form"
          className="ei-btn"
          disabled={addingHeir || newHeirName.trim().length < 2}
        >
          {addingHeir ? 'Adding…' : 'Add person'}
        </button>
      </>
    ) : (
      <>
        <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="ei-btn"
          onClick={() => {
            setError('');
            setInfo('');
            setPage(PAGE.add);
          }}
        >
          Add person
        </button>
      </>
    );

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title={
        page === PAGE.person && personLabel
          ? `Family / heirs · ${personLabel}`
          : page === PAGE.add
            ? 'Family / heirs · Add person'
            : 'Family / heirs'
      }
      titleId="ei-settings-heirs-title"
      wide
      extraClass="ei-modal-heirs-paged"
      foot={foot}
    >
      <div className="ei-modal-body ei-heir-modal-body">
        {page === PAGE.list ? (
          <section className="ei-heir-page" aria-labelledby="ei-heir-list-heading">
            <p className="ei-settings-hint">
              Open one person at a time to set access, disclosure, and portal sections. Each person
              signs in with a unique 6-digit PIN, then chooses the name family sees.
            </p>

            {lastIssued ? (
              <div className="ei-heir-issued" role="status">
                <strong>{lastIssued.name}</strong>
                <span className="ei-heir-issued-label">PIN</span>
                <code className="ei-heir-issued-code">{lastIssued.code}</code>
                <p className="ei-settings-hint" style={{ margin: '0.35rem 0 0' }}>
                  Share this PIN with them only. You can also find it later under View passwords.
                </p>
              </div>
            ) : null}

            <div className="ei-heir-list-head">
              <h4 id="ei-heir-list-heading" className="ei-settings-subhead">
                People
              </h4>
              {personCount > 0 ? (
                <span className="ei-heir-list-count">
                  {personCount} person{personCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>

            {personCount === 0 ? (
              <p className="ei-settings-hint">No people yet. Tap Add person to invite the first.</p>
            ) : (
              <ul className="ei-heir-pick-list" aria-label="People — open to edit">
                {heirAccounts.map((h, index) => {
                  const label = heirAdminLabel(h);
                  const tier = normalizeHeirAccessTier(h.access_tier);
                  const tierLabel =
                    HEIR_ACCESS_TIER_OPTIONS.find((o) => o.value === tier)?.label || tier;
                  const memoOnly = isMemorandumOnlyHeir(tier);
                  const vis = memoOnly
                    ? 'minimal'
                    : normalizeFamilyFinancialVisibility(h.financial_visibility);
                  const visLabel = vis.charAt(0).toUpperCase() + vis.slice(1);
                  return (
                    <li key={h.sibling_key}>
                      <button
                        type="button"
                        className="ei-heir-pick-card"
                        onClick={() => openPerson(index)}
                      >
                        <span className="ei-heir-pick-name">{label}</span>
                        <span className="ei-heir-pick-meta">
                          {tierLabel} · {visLabel} · {inviteStatus(h.sibling_key)}
                        </span>
                        <span className="ei-heir-pick-cta">Open</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {page === PAGE.person && activeHeir ? (
          <section className="ei-heir-page" aria-label={`Settings for ${personLabel}`}>
            <p className="ei-heir-person-pager" aria-live="polite">
              Person {personIndex + 1} of {personCount}
            </p>
            {lastIssued && lastIssued.name === personLabel ? (
              <div className="ei-heir-issued" role="status">
                <strong>{lastIssued.name}</strong>
                <span className="ei-heir-issued-label">PIN</span>
                <code className="ei-heir-issued-code">{lastIssued.code}</code>
              </div>
            ) : null}
            <EstateSettingsHeirPersonPage
              heir={activeHeir}
              inviteStatusLabel={inviteStatus(activeHeir.sibling_key)}
              advisors={advisorsForHeir(activeHeir.sibling_key)}
              resettingPin={resettingKey === activeHeir.sibling_key}
              onTierChange={handleHeirTierChange}
              onFinancialVisibilityChange={handleFinancialVisibilityChange}
              onVisibilitySectionsChange={handleVisibilitySectionsChange}
              onBrowseRoomsChange={handleBrowseRoomsChange}
              onResetInvite={handleResetInvite}
              onRename={handleRenameHeir}
              onRemove={handleRemoveHeir}
            />
          </section>
        ) : null}

        {page === PAGE.add ? (
          <section className="ei-heir-page" aria-labelledby="ei-heir-add-heading">
            <h4 id="ei-heir-add-heading" className="ei-settings-subhead">
              Add person
            </h4>
            <p className="ei-settings-hint">
              Admin label is only for your records (and memorandum matching). They choose their app
              name after signing in with the PIN.
            </p>
            <form id="ei-heir-add-form" className="ei-heir-add-page" onSubmit={handleAddHeir}>
              <div className="ei-field">
                <label htmlFor="ei-new-heir">Admin label</label>
                <input
                  id="ei-new-heir"
                  value={newHeirName}
                  onChange={(e) => setNewHeirName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  autoComplete="off"
                />
              </div>
              <div className="ei-field">
                <label htmlFor="ei-new-heir-tier">Access type</label>
                <select
                  id="ei-new-heir-tier"
                  value={newHeirTier}
                  onChange={(e) => setNewHeirTier(e.target.value)}
                >
                  {HEIR_ACCESS_TIER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} title={opt.hint}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="ei-field-hint">
                  {
                    HEIR_ACCESS_TIER_OPTIONS.find(
                      (o) => o.value === normalizeHeirAccessTier(newHeirTier)
                    )?.hint
                  }
                </p>
              </div>
              <div className="ei-heir-code-row">
                <div className="ei-heir-code-preview">
                  <span className="ei-heir-code-label">PIN (auto)</span>
                  <code className="ei-heir-issued-code">{newHeirInvite}</code>
                </div>
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small"
                  onClick={() => setNewHeirInvite(generateHeirInviteCode())}
                >
                  New PIN
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {error ? <div className="ei-error">{error}</div> : null}
        {info ? <p className="ei-status">{info}</p> : null}
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsHeirsModal;
