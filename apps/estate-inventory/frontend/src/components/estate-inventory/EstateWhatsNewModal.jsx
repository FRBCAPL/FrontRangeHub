import React, { useMemo } from 'react';
import {
  ESTATEIT_WHATS_NEW,
  ESTATEIT_WHATS_NEW_ENABLED,
  getWhatsNewItemsForRole,
  markWhatsNewSeen
} from '@shared/utils/estateWhatsNew.js';

/**
 * Manual What’s new — open from EV Menu only (no auto-popup).
 * Gated by ESTATEIT_WHATS_NEW_ENABLED in estateWhatsNew.js.
 */
const EstateWhatsNewModal = ({
  role = 'all',
  open: openProp = false,
  onOpenChange = null
}) => {
  const items = useMemo(() => getWhatsNewItemsForRole(role), [role]);
  const open = ESTATEIT_WHATS_NEW_ENABLED && Boolean(openProp);

  if (!open || !items.length) return null;

  const dismiss = () => {
    markWhatsNewSeen(ESTATEIT_WHATS_NEW.id);
    onOpenChange?.(false);
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="ei-modal ei-modal-settings ei-whats-new-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-whats-new-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-whats-new-title">{ESTATEIT_WHATS_NEW.title}</h3>
          <button type="button" className="ei-modal-close" onClick={dismiss} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          {ESTATEIT_WHATS_NEW.dateLabel ? (
            <p className="ei-whats-new-date">{ESTATEIT_WHATS_NEW.dateLabel}</p>
          ) : null}
          {ESTATEIT_WHATS_NEW.intro ? (
            <p className="ei-settings-intro">{ESTATEIT_WHATS_NEW.intro}</p>
          ) : null}
          <ul className="ei-whats-new-list">
            {items.map((item) => (
              <li key={item.text}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstateWhatsNewModal;
