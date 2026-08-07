import React, { useEffect, useRef, useState } from 'react';

/**
 * Hidden traps Chrome fills instead of the real estate PIN / name fields.
 */
export function EstateAutofillTrap() {
  return (
    <div className="ei-autofill-trap" aria-hidden="true">
      <label>
        Username
        <input type="text" name="username" autoComplete="username" tabIndex={-1} defaultValue="" />
      </label>
      <label>
        Current password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          tabIndex={-1}
          defaultValue=""
        />
      </label>
    </div>
  );
}

const AUTH_FIELD_DATA = {
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other'
};

function useDelayedUnlock(autoFocus) {
  const ref = useRef(null);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    // Always unlock after a short delay so autofill skips the first pass,
    // but Playwright / real typing can still edit fields that are not autoFocused.
    const t = window.setTimeout(() => {
      setLocked(false);
      if (autoFocus) {
        window.requestAnimationFrame(() => {
          ref.current?.focus({ preventScroll: true });
        });
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [autoFocus]);

  return { ref, locked, setLocked };
}

/**
 * Name / text field that resists browser password-manager autofill.
 */
export function EstateAuthTextInput({
  id,
  name,
  value,
  onChange,
  onFocus,
  placeholder,
  required,
  minLength,
  autoFocus,
  disabled,
  type = 'text',
  inputMode,
  className = ''
}) {
  const { ref, locked, setLocked } = useDelayedUnlock(autoFocus);

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={onChange}
      onFocus={(e) => {
        setLocked(false);
        onFocus?.(e);
      }}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      disabled={disabled}
      className={className}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      readOnly={locked}
      {...AUTH_FIELD_DATA}
    />
  );
}

/**
 * PIN / access-code field. Uses text + CSS masking so Chrome does not treat it as a password.
 */
export function EstateAuthPinInput({
  id,
  name,
  value,
  onChange,
  onFocus,
  placeholder,
  required,
  minLength,
  autoFocus,
  disabled,
  revealed = false,
  inputMode = 'text',
  className = ''
}) {
  const { ref, locked, setLocked } = useDelayedUnlock(autoFocus);

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type="text"
      inputMode={inputMode}
      value={value}
      onChange={onChange}
      onFocus={(e) => {
        setLocked(false);
        onFocus?.(e);
      }}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      disabled={disabled}
      className={`ei-auth-pin${revealed ? ' is-revealed' : ''}${className ? ` ${className}` : ''}`}
      autoComplete="one-time-code"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      readOnly={locked}
      {...AUTH_FIELD_DATA}
    />
  );
}
