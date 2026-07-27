import React from 'react';

export function EstateSettingsPasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  autoComplete
}) {
  return (
    <div className="ei-field">
      <label htmlFor={id}>{label}</label>
      <div className="ei-password-row">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

export function EstateSettingsShell({
  open,
  onClose,
  title,
  titleId,
  children,
  foot,
  wide = false
}) {
  if (!open) return null;

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`ei-modal ei-modal-settings${wide ? ' ei-modal-settings-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
        {foot ? <div className="ei-modal-foot ei-btn-row">{foot}</div> : null}
      </div>
    </div>
  );
}
