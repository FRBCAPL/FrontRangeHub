import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  ESTATE_CONTACT_CATEGORIES,
  contactCategoryLabel
} from '@shared/utils/estateContactTypes.js';
import { EstateSettingsShell } from './EstateSettingsShell';
import { useEstateCase } from './EstateCaseContext';
import GlossaryTerm from './GlossaryTerm';
import { generateAdvisorInvitePin } from '@shared/utils/estateInventoryConstants.js';

const BLANK = {
  category: 'attorney',
  customCategory: '',
  displayName: '',
  company: '',
  roleTitle: '',
  phone: '',
  email: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  notes: '',
  linkedSiblingKey: ''
};

function formatAddress(row) {
  return [
    row.address_line1,
    row.address_line2,
    [row.city, row.region].filter(Boolean).join(', '),
    row.postal_code
  ]
    .filter(Boolean)
    .join(' · ');
}

function groupContacts(rows) {
  const map = new Map();
  for (const row of rows) {
    const key =
      row.category === 'other'
        ? `other:${String(row.custom_category || 'Other').toLowerCase()}`
        : row.category || 'other';
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: contactCategoryLabel(row.category, row.custom_category),
        rows: []
      });
    }
    map.get(key).rows.push(row);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * PR contacts directory — list and add/edit are separate views (no mega-scroll form+list).
 */
const EstateSettingsContactsModal = ({ open, onClose }) => {
  const { caseNumber } = useEstateCase();
  const [view, setView] = useState('list'); // list | form
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [portalPin, setPortalPin] = useState('');
  const [portalBusy, setPortalBusy] = useState(false);
  const [editingPortal, setEditingPortal] = useState({
    enabled: false,
    pinConfigured: false,
    pinPlain: '',
    passwordConfigured: false
  });
  const [siblings, setSiblings] = useState([]);

  const refresh = async () => {
    const [contactsResult, heirsResult] = await Promise.all([
      estateInventoryService.listEstateContacts(caseNumber),
      estateInventoryService.listSiblingAccounts(caseNumber)
    ]);
    if (contactsResult.success) setRows(contactsResult.data || []);
    else if (contactsResult.error) setError(contactsResult.error);
    if (heirsResult.success) setSiblings(heirsResult.data || []);
  };

  useEffect(() => {
    if (!open) return;
    setView('list');
    setForm(BLANK);
    setEditingId(null);
    setFilter('');
    setError('');
    setInfo('');
    refresh();
  }, [open, caseNumber]);

  const setField = (key) => (ev) => {
    const value = ev.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(BLANK);
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setPortalPin('');
    setEditingPortal({ enabled: false, pinConfigured: false, pinPlain: '', passwordConfigured: false });
    setError('');
    setInfo('');
    setView('form');
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setError('');
    setInfo('');
    setPortalPin('');
    setEditingPortal({
      enabled: Boolean(row.portal_enabled),
      pinConfigured: Boolean(row.pin_configured || (row.portal_enabled && row.pin_plain)),
      pinPlain: row.pin_plain || '',
      passwordConfigured: Boolean(row.password_configured)
    });
    setForm({
      category: row.category || 'other',
      customCategory: row.custom_category || '',
      displayName: row.display_name || '',
      company: row.company || '',
      roleTitle: row.role_title || '',
      phone: row.phone || '',
      email: row.email || '',
      website: row.website || '',
      addressLine1: row.address_line1 || '',
      addressLine2: row.address_line2 || '',
      city: row.city || '',
      region: row.region || '',
      postalCode: row.postal_code || '',
      notes: row.notes || '',
      linkedSiblingKey: row.linked_sibling_key || ''
    });
    setView('form');
  };

  const applyPortalResult = (data) => {
    setEditingPortal({
      enabled: Boolean(data?.portal_enabled),
      pinConfigured: Boolean(data?.pin_configured),
      pinPlain: data?.pin_plain || '',
      passwordConfigured: Boolean(data?.password_configured)
    });
    setPortalPin('');
  };

  const fillGeneratedPin = () => {
    setPortalPin(generateAdvisorInvitePin());
  };

  const enableOrResetPortalPin = async () => {
    if (!editingId) return;
    const pin = (portalPin.trim() || generateAdvisorInvitePin()).trim();
    const resetting = editingPortal.enabled;
    if (resetting) {
      const ok = window.confirm(
        `Generate a new invite PIN for “${form.displayName || 'this contact'}”?\n\n` +
          `New PIN: ${pin}\n\n` +
          'Their personal password (if any) will be cleared. They must sign in with this PIN and set a new password.'
      );
      if (!ok) return;
    }
    setPortalBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.setContactPortalPin({
      contactId: editingId,
      pin,
      enabled: true,
      caseNumber
    });
    setPortalBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not set advisor PIN.');
      return;
    }
    applyPortalResult(result.data);
    setInfo(
      `Invite PIN ready for ${form.displayName || 'the contact'}: ${
        result.data?.pin_plain || pin
      }. They sign in with this PIN once, then set their own password.`
    );
    await refresh();
  };

  const disablePortal = async () => {
    if (!editingId) return;
    if (
      !window.confirm(
        `Disable Advisor portal for “${form.displayName || 'this contact'}”? Their PIN will stop working.`
      )
    ) {
      return;
    }
    setPortalBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.setContactPortalPin({
      contactId: editingId,
      pin: '',
      enabled: false,
      caseNumber
    });
    setPortalBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not disable portal.');
      return;
    }
    applyPortalResult(result.data);
    setInfo('Advisor portal disabled for this contact.');
    await refresh();
  };

  const cancelForm = () => {
    resetForm();
    setError('');
    setView('list');
  };

  const save = async (ev) => {
    ev?.preventDefault?.();
    setBusy(true);
    setError('');
    setInfo('');
    const payload = { ...form, caseNumber };
    const result = editingId
      ? await estateInventoryService.updateEstateContact(editingId, payload)
      : await estateInventoryService.addEstateContact(payload);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save contact.');
      return;
    }
    setInfo(editingId ? 'Contact updated.' : `Added ${result.data?.display_name || 'contact'}.`);
    resetForm();
    setView('list');
    await refresh();
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove “${row.display_name}” from this estate’s contacts?`)) return;
    setBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.deleteEstateContact(row.id, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not remove contact.');
      return;
    }
    if (editingId === row.id) {
      resetForm();
      setView('list');
    }
    setInfo(`Removed ${row.display_name}.`);
    await refresh();
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.display_name,
        row.company,
        row.role_title,
        row.phone,
        row.email,
        row.category,
        row.custom_category,
        row.city,
        row.notes
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter]);

  const groups = useMemo(() => groupContacts(filtered), [filtered]);
  const isOther = form.category === 'other';
  const isForm = view === 'form';

  const siblingLabel = (key) => {
    if (!key) return '';
    const match = siblings.find((s) => s.sibling_key === key);
    if (!match) return key;
    return match.preferred_name || match.display_name || key;
  };

  if (!open) return null;

  return (
    <EstateSettingsShell
      open
      onClose={onClose}
      title={isForm ? (editingId ? 'Edit contact' : 'Add contact') : 'Contacts'}
      titleId="ei-settings-contacts-title"
      wide
      extraClass="ei-contacts-modal"
      foot={
        <>
          {isForm ? (
            <>
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                onClick={cancelForm}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="ei-contact-form"
                className="ei-btn"
                disabled={busy}
              >
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add contact'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
                Back to settings
              </button>
              <button type="button" className="ei-btn" onClick={openAdd}>
                Add contact
              </button>
            </>
          )}
        </>
      }
    >
      <div className="ei-modal-body">
        {error ? <div className="ei-error">{error}</div> : null}
        {info ? <p className="ei-status">{info}</p> : null}

        {isForm ? (
          <form id="ei-contact-form" className="ei-contacts-form" onSubmit={save}>
            <p className="ei-settings-hint ei-contacts-form-intro">
              Basics first — address and extras are optional below.
            </p>

            <div className="ei-contacts-form-grid">
              <div className="ei-field">
                <label htmlFor="ei-contact-category">Category</label>
                <select
                  id="ei-contact-category"
                  value={form.category}
                  onChange={setField('category')}
                >
                  {ESTATE_CONTACT_CATEGORIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {isOther ? (
                <div className="ei-field">
                  <label htmlFor="ei-contact-custom-cat">Custom category</label>
                  <input
                    id="ei-contact-custom-cat"
                    value={form.customCategory}
                    onChange={setField('customCategory')}
                    placeholder="e.g. Movers, Notary, HOA"
                    required
                  />
                </div>
              ) : (
                <div className="ei-field">
                  <label htmlFor="ei-contact-role">Role / title (optional)</label>
                  <input
                    id="ei-contact-role"
                    value={form.roleTitle}
                    onChange={setField('roleTitle')}
                    placeholder="e.g. Probate counsel"
                  />
                </div>
              )}
              <div className="ei-field ei-field-wide">
                <label htmlFor="ei-contact-name">Name</label>
                <input
                  id="ei-contact-name"
                  value={form.displayName}
                  onChange={setField('displayName')}
                  placeholder="Person or firm name"
                  required
                />
              </div>
              <div className="ei-field">
                <label htmlFor="ei-contact-company">Company (optional)</label>
                <input
                  id="ei-contact-company"
                  value={form.company}
                  onChange={setField('company')}
                  placeholder="Firm or business"
                />
              </div>
              {isOther ? (
                <div className="ei-field">
                  <label htmlFor="ei-contact-role-2">Role / title (optional)</label>
                  <input
                    id="ei-contact-role-2"
                    value={form.roleTitle}
                    onChange={setField('roleTitle')}
                    placeholder="e.g. Lead coordinator"
                  />
                </div>
              ) : null}
              <div className="ei-field">
                <label htmlFor="ei-contact-phone">Phone</label>
                <input
                  id="ei-contact-phone"
                  value={form.phone}
                  onChange={setField('phone')}
                  placeholder="Optional"
                />
              </div>
              <div className="ei-field">
                <label htmlFor="ei-contact-email">Email</label>
                <input
                  id="ei-contact-email"
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  placeholder="Optional"
                />
              </div>
            </div>

            <details className="ei-contacts-more">
              <summary>Address, website &amp; notes (optional)</summary>
              <div className="ei-contacts-form-grid">
                <div className="ei-field ei-field-wide">
                  <label htmlFor="ei-contact-web">Website</label>
                  <input
                    id="ei-contact-web"
                    value={form.website}
                    onChange={setField('website')}
                    placeholder="Optional"
                  />
                </div>
                <div className="ei-field ei-field-wide">
                  <label htmlFor="ei-contact-addr1">Address</label>
                  <input
                    id="ei-contact-addr1"
                    value={form.addressLine1}
                    onChange={setField('addressLine1')}
                    placeholder="Street (optional)"
                  />
                </div>
                <div className="ei-field ei-field-wide">
                  <label htmlFor="ei-contact-addr2">Address line 2</label>
                  <input
                    id="ei-contact-addr2"
                    value={form.addressLine2}
                    onChange={setField('addressLine2')}
                    placeholder="Suite, unit (optional)"
                  />
                </div>
                <div className="ei-field">
                  <label htmlFor="ei-contact-city">City</label>
                  <input id="ei-contact-city" value={form.city} onChange={setField('city')} />
                </div>
                <div className="ei-field">
                  <label htmlFor="ei-contact-region">State / region</label>
                  <input
                    id="ei-contact-region"
                    value={form.region}
                    onChange={setField('region')}
                  />
                </div>
                <div className="ei-field">
                  <label htmlFor="ei-contact-zip">Postal code</label>
                  <input
                    id="ei-contact-zip"
                    value={form.postalCode}
                    onChange={setField('postalCode')}
                  />
                </div>
                <div className="ei-field ei-field-wide">
                  <label htmlFor="ei-contact-notes">Notes</label>
                  <input
                    id="ei-contact-notes"
                    value={form.notes}
                    onChange={setField('notes')}
                    placeholder="Optional — e.g. referred by counsel"
                  />
                </div>
              </div>
            </details>

            {siblings.length ? (
              <div className="ei-field ei-field-wide" style={{ marginTop: '0.75rem' }}>
                <label htmlFor="ei-contact-sibling" className="ei-contacts-label-with-tip">
                  <span>Advisor for (optional)</span>
                  <GlossaryTerm termKey="contact_link_heir" iconOnly />
                </label>
                <select
                  id="ei-contact-sibling"
                  value={form.linkedSiblingKey || ''}
                  onChange={setField('linkedSiblingKey')}
                >
                  <option value="">Whole estate / not assigned to one person</option>
                  {siblings.map((s) => (
                    <option key={s.sibling_key} value={s.sibling_key}>
                      {s.preferred_name || s.display_name || s.sibling_key}
                    </option>
                  ))}
                </select>
                <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
                  Assign this contact as that person’s advisor (e.g. their attorney or CPA). Does not
                  change anyone’s PIN or portal access.
                </p>
              </div>
            ) : null}

            {editingId ? (
              <div className="ei-contacts-portal-block">
                <h4 className="ei-settings-subhead ei-contacts-label-with-tip">
                  <span>Advisor portal access</span>
                  <GlossaryTerm termKey="contact_advisor_portal" iconOnly />
                </h4>
                <p className="ei-settings-hint">
                  Generate an invite PIN and share it with this contact. They sign in once with that
                  PIN, then set their own password for next time.
                </p>
                {editingPortal.enabled && editingPortal.pinConfigured ? (
                  <p className="ei-status">
                    Portal on
                    {editingPortal.pinPlain ? (
                      <>
                        {' '}
                        · Invite PIN: <code>{editingPortal.pinPlain}</code>
                      </>
                    ) : (
                      ' · Invite PIN set'
                    )}
                    {editingPortal.passwordConfigured
                      ? ' · Personal password set'
                      : ' · Waiting for them to set a password'}
                  </p>
                ) : (
                  <p className="ei-settings-hint">Portal off — generate an invite PIN to invite.</p>
                )}
                <div className="ei-contacts-form-grid">
                  <div className="ei-field">
                    <label htmlFor="ei-contact-portal-pin">Invite PIN</label>
                    <div className="ei-password-row">
                      <input
                        id="ei-contact-portal-pin"
                        value={portalPin}
                        onChange={(e) => setPortalPin(e.target.value)}
                        placeholder="6-digit invite PIN"
                        autoComplete="off"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary ei-btn-small"
                        onClick={fillGeneratedPin}
                        disabled={portalBusy || busy}
                      >
                        Generate PIN
                      </button>
                    </div>
                  </div>
                </div>
                <div className="ei-btn-row" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="ei-btn"
                    onClick={enableOrResetPortalPin}
                    disabled={portalBusy || busy}
                  >
                    {portalBusy
                      ? 'Saving…'
                      : editingPortal.enabled
                        ? 'Save new invite PIN'
                        : 'Invite with this PIN'}
                  </button>
                  {editingPortal.enabled ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-secondary"
                      onClick={disablePortal}
                      disabled={portalBusy || busy}
                    >
                      Disable portal
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="ei-settings-hint">
                Save the contact first, then you can invite them to the Advisor portal with a PIN.
              </p>
            )}
          </form>
        ) : (
          <>
            <div className="ei-contacts-list-head">
              <p className="ei-settings-hint" style={{ margin: 0 }}>
                Counsel, CPA, banks, utilities, auction, funeral home, and custom roles. Invite
                attorney/CPA contacts to a read-only Advisor portal from Edit.
              </p>
              <div className="ei-field ei-contacts-search">
                <label htmlFor="ei-contact-filter">Search</label>
                <input
                  id="ei-contact-filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Name, firm, phone…"
                />
              </div>
            </div>

            {groups.length ? (
              <div className="ei-contacts-groups">
                {groups.map((group) => (
                  <section key={group.key} className="ei-contacts-group">
                    <div className="ei-contacts-group-head">
                      <h4>{group.label}</h4>
                      <span className="ei-contacts-group-count">{group.rows.length}</span>
                    </div>
                    <ul className="ei-contacts-ul">
                      {group.rows.map((row) => (
                        <li key={row.id} className="ei-contacts-card">
                          <div className="ei-contacts-card-main">
                            <strong>{row.display_name}</strong>
                            {row.company || row.role_title ? (
                              <span className="ei-contacts-card-sub">
                                {[row.role_title, row.company].filter(Boolean).join(' · ')}
                              </span>
                            ) : null}
                            {row.phone || row.email ? (
                              <span className="ei-contacts-card-sub">
                                {[row.phone, row.email].filter(Boolean).join(' · ')}
                              </span>
                            ) : null}
                            {formatAddress(row) ? (
                              <span className="ei-contacts-card-sub">{formatAddress(row)}</span>
                            ) : null}
                            {row.linked_sibling_key ? (
                              <span className="ei-contacts-card-sub">
                                Advisor for {siblingLabel(row.linked_sibling_key)}
                              </span>
                            ) : null}
                            {row.portal_enabled ? (
                              <span className="ei-contacts-card-sub ei-contacts-portal-badge">
                                Advisor portal on
                                {row.pin_plain ? ` · invite ${row.pin_plain}` : ''}
                                {row.password_configured
                                  ? ' · password set'
                                  : ' · needs password setup'}
                              </span>
                            ) : null}
                          </div>
                          <div className="ei-contacts-card-actions">
                            {row.phone ? (
                              <a
                                className="ei-btn ei-btn-small ei-btn-secondary"
                                href={`tel:${row.phone}`}
                              >
                                Call
                              </a>
                            ) : null}
                            {row.email ? (
                              <a
                                className="ei-btn ei-btn-small ei-btn-secondary"
                                href={`mailto:${row.email}`}
                              >
                                Email
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className="ei-btn ei-btn-small ei-btn-secondary"
                              onClick={() => startEdit(row)}
                              disabled={busy}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ei-btn ei-btn-small ei-btn-danger"
                              onClick={() => remove(row)}
                              disabled={busy}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p className="ei-settings-hint">
                {rows.length
                  ? 'No contacts match that search.'
                  : 'No contacts yet — tap Add contact for counsel, bank, funeral home, and anyone else you work with.'}
              </p>
            )}
          </>
        )}
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsContactsModal;
