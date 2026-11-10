import React from 'react';
import { ACTION_TABS, ITEM_STATUS_TABS } from '../../utils/consignmentAdminItemTabs.js';
import './consignment-item-tabs.css';

/** Admin → Items: one button per status with its count. counts: { [id]: n } (missing while loading). */
export default function ConsignmentItemStatusTabs({ value, counts = {}, onChange }) {
  return (
    <div className="cs-status-tabs" role="tablist" aria-label="Item status">
      {ITEM_STATUS_TABS.map((t) => {
        const n = counts[t.id];
        const alert = ACTION_TABS.has(t.id) && n > 0;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={value === t.id}
            title={t.hint}
            className={`cs-status-tab${value === t.id ? ' active' : ''}${alert ? ' alert' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span>{t.label}</span>
            {n == null ? null : <span className="cs-status-count">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
