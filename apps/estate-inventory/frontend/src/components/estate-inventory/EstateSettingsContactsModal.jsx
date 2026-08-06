import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  ESTATE_CONTACT_CATEGORIES,
  contactCategoryLabel
} from '@shared/utils/estateContactTypes.js';
import { EstateSettingsShell } from './EstateSettingsShell';
import { useEstateCase } from './EstateCaseContext';

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
 * PR contacts directory — attorneys, vendors, banks, funeral home, custom roles.
 */
const EstateSettingsContactsModal = ({ open, onClose }) => {
  const { caseNumber } = useEstateCase();
  const [rows, setRows] = useState([]);
  const [siblings, setSiblings] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const refresh = async () => {
    const [contactsResult, siblingsResult] = await Promise.all([
      estateInventoryService.listEstateContacts(caseNumber),
      estateInventoryService.listSiblingAccounts(caseNumber)
    ]);
    if (contactsResult.success) setRows(contactsResult.data || []);
    else if (contactsResult.error) setError(contactsResult.error);
    if (siblingsResult.success) {
      setSiblings(siblingsResult.data || []);
    }
  };

  useEffect(() => {
    if (!open) return;
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

  const startEdit = (row) => {
    setEditingId(row.id);
    setError('');
    setInfo('');
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
    if (editingId === row.id) resetForm();
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

  if (!open) return null;

  return (
    <EstateSettingsShell
      open
      onClose={onClose}
      title="Contacts"
      titleId="ei-settings-contacts-title"
      foot={
        <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
          Back to settings
        </button>
      }
    >
      <div className="ei-modal-body">
        <p className="ei-settings-hint">
          Everyone involved in this estate — counsel, CPA, banks, utilities, auction, funeral home,
          and any custom role you need.
        </p>

        {error ? <div className="ei-error">{error}</div> : null}
        {info ? <p className="ei-status">{info}</p> : null}

        <section className="ei-ledger-compose" aria-labelledby="ei-contact-compose-title">
          <h4 id="ei-contact-compose-title" className="ei-ledger-compose-title">
            {editingId ? 'Edit contact' : 'Add contact'}
          </h4>
          <form className="ei-finance-expense-form ei-accounts-form" onSubmit={save}>
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
            <div className="ei-field">
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
              <div className="ei-field ei-field-wide">
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
              <input id="ei-contact-region" value={form.region} onChange={setField('region')} />
            </div>
            <div className="ei-field">
              <label htmlFor="ei-contact-zip">Postal code</label>
              <input
                id="ei-contact-zip"
                value={form.postalCode}
                onChange={setField('postalCode')}
              />
            </div>
            {siblings.length ? (
              <div className="ei-field">
                <label htmlFor="ei-contact-sibling">Link to heir / family account (optional)</label>
                <select
                  id="ei-contact-sibling"
                  value={form.linkedSiblingKey}
                  onChange={setField('linkedSiblingKey')}
                >
                  <option value="">Not linked</option>
                  {siblings.map((s) => (
                    <option key={s.sibling_key} value={s.sibling_key}>
                      {s.preferred_name || s.display_name || s.sibling_key}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="ei-field ei-field-wide">
              <label htmlFor="ei-contact-notes">Notes</label>
              <input
                id="ei-contact-notes"
                value={form.notes}
                onChange={setField('notes')}
                placeholder="Optional — e.g. referred by counsel"
              />
            </div>
            <div className="ei-btn-row ei-field-wide">
              <button type="submit" className="ei-btn ei-btn-small" disabled={busy}>
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add contact'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="ei-btn ei-btn-small ei-btn-secondary"
                  onClick={resetForm}
                  disabled={busy}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <div className="ei-field" style={{ maxWidth: '18rem', margin: '1rem 0 0.65rem' }}>
          <label htmlFor="ei-contact-filter">Search contacts</label>
          <input
            id="ei-contact-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Name, firm, phone…"
          />
        </div>

        {groups.length ? (
          groups.map((group) => (
            <section key={group.key} className="ei-accounts-section">
              <div className="ei-accounts-section-head">
                <h4>{group.label}</h4>
                <span className="ei-accounts-total">{group.rows.length}</span>
              </div>
              <ul className="ei-accounts-list">
                {group.rows.map((row) => (
                  <li key={row.id}>
                    <div className="ei-accounts-row-main">
                      <strong>{row.display_name}</strong>
                      {row.company || row.role_title ? (
                        <span className="ei-accounts-row-sub">
                          {[row.role_title, row.company].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                      {row.phone || row.email ? (
                        <span className="ei-accounts-row-sub">
                          {[row.phone, row.email].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                      {formatAddress(row) ? (
                        <span className="ei-accounts-row-sub">{formatAddress(row)}</span>
                      ) : null}
                      {row.website ? (
                        <span className="ei-accounts-row-sub">{row.website}</span>
                      ) : null}
                      {row.notes ? <span className="ei-accounts-row-sub">{row.notes}</span> : null}
                    </div>
                    <div className="ei-accounts-row-side">
                      <span className="ei-btn-row">
                        {row.phone ? (
                          <a className="ei-btn ei-btn-small ei-btn-secondary" href={`tel:${row.phone}`}>
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
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="ei-settings-hint">
            {rows.length
              ? 'No contacts match that search.'
              : 'No contacts yet — add the attorney, bank, funeral home, and anyone else you work with.'}
          </p>
        )}
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsContactsModal;
