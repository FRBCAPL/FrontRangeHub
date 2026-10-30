import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { listItemSuppliers, listSuppliers, setSupplierActive } from '../../services/itemsureSupplierService.js';
import ItemsureSupplierItems from './ItemsureSupplierItems.jsx';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureSupplierCard from './ItemsureSupplierCard.jsx';
import ItemsureSupplierForm from './ItemsureSupplierForm.jsx';

const matches = (s, text) =>
  [s.name, s.contact_name, s.phone, s.email, s.account_number, s.notes].some((v) => (v || '').toLowerCase().includes(text));

/** The business's suppliers: contacts, account numbers, and ordering notes. */
export default function ItemsureSuppliers() {
  const { organization, can } = useItemsureWorkspace();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | supplier
  const [viewing, setViewing] = useState(null);
  const [itemCounts, setItemCounts] = useState(null); // Map(supplierId -> count), null until items have suppliers
  const { busy, error, setError, run } = useItemsureAction();
  const navigate = useNavigate();
  const canManage = can('suppliers.manage');
  const canManageItems = can('items.manage');
  const closeViewing = useCallback(() => setViewing(null), []);

  const refresh = useCallback(async () => {
    try {
      const [list, links] = await Promise.all([listSuppliers(organization.id), listItemSuppliers(organization.id)]);
      setData(list);
      if (links) {
        const counts = new Map();
        for (const supplierId of links.values()) if (supplierId) counts.set(supplierId, (counts.get(supplierId) || 0) + 1);
        setItemCounts(counts);
      } else {
        setItemCounts(null);
      }
    } catch (e) {
      setData({ suppliers: [], missing: false });
      setError(e.message);
    }
  }, [organization.id, setError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const archivedCount = (data?.suppliers || []).filter((s) => !s.is_active).length;
  const shown = useMemo(() => {
    const text = search.trim().toLowerCase();
    return (data?.suppliers || []).filter((s) => (showArchived || s.is_active) && (!text || matches(s, text)));
  }, [data, search, showArchived]);

  const toggle = (supplier) =>
    run(async () => {
      await setSupplierActive(organization.id, supplier.id, !supplier.is_active);
      await refresh();
    });
  const close = useCallback(() => setEditing(null), []);
  const saved = async () => {
    setEditing(null);
    await refresh();
  };

  return (
    <div className="isu-page">
      <PageHead
        title="Suppliers"
        description="Who you buy from, how to reach them, and how they like to take orders."
        action={canManage && data && !data.missing ? (
          <button type="button" className="isu-btn isu-btn--primary" onClick={() => setEditing('new')}>Add supplier</button>
        ) : null}
      />
      <ErrorNote message={error} />
      {data === null ? <p className="isu-muted">Loading…</p> : null}

      {data?.missing ? (
        <div className="isu-card isu-empty">
          <h2>Almost ready</h2>
          <p className="isu-muted">Suppliers need a database update before they can be used. Nothing else is affected.</p>
        </div>
      ) : null}

      {data && !data.missing && data.suppliers.length === 0 ? (
        <div className="isu-card isu-empty">
          <h2>No suppliers yet</h2>
          <p className="isu-muted">
            {canManage ? 'Add the companies you order from, with their phone, email, and your account number.' : 'No suppliers have been added yet.'}
          </p>
        </div>
      ) : null}

      {data && data.suppliers.length > 0 ? (
        <>
          <div className="isu-supplier-tools">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers" aria-label="Search suppliers" />
            {archivedCount ? (
              <label className="isu-check">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Show archived ({archivedCount})
              </label>
            ) : null}
          </div>
          {shown.length === 0 ? <p className="isu-muted">No suppliers match.</p> : null}
          <div className="isu-supplier-grid">
            {shown.map((s) => (
              <ItemsureSupplierCard
                key={s.id}
                supplier={s}
                canManage={canManage}
                busy={busy}
                onEdit={setEditing}
                onToggle={toggle}
                itemCount={itemCounts?.get(s.id) || 0}
                onShowItems={itemCounts ? setViewing : null}
                onAddItem={itemCounts && canManageItems ? (sup) => navigate(`${ITEMSURE_PATH}/items/new?supplier=${sup.id}&from=suppliers`) : null}
              />
            ))}
          </div>
        </>
      ) : null}

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Add supplier' : editing ? `Edit ${editing.name}` : ''} onClose={close}>
        {editing ? (
          <ItemsureSupplierForm
            key={editing === 'new' ? 'new' : editing.id}
            organizationId={organization.id}
            supplier={editing === 'new' ? null : editing}
            onSaved={saved}
            onCancel={close}
          />
        ) : null}
      </Modal>

      <Modal open={Boolean(viewing)} title={viewing ? `Items from ${viewing.name}` : ''} onClose={closeViewing}>
        {viewing ? <ItemsureSupplierItems organizationId={organization.id} supplier={viewing} canManageItems={canManageItems} /> : null}
      </Modal>
    </div>
  );
}
