import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConsignmentConfirmContext, confirmOptions } from '../../hooks/useConsignmentConfirm.js';
import ConsignmentConfirmModal from './ConsignmentConfirmModal.jsx';

/** Shows one confirm dialog at a time for useConsignmentConfirm. A new request cancels any dialog still open. */
export default function ConsignmentConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const openRef = useRef(null);
  const idRef = useRef(0);

  const finish = useCallback((value) => {
    const open = openRef.current;
    if (!open) return;
    openRef.current = null;
    setDialog(null);
    open.resolve(value);
  }, []);

  const show = useCallback((options, withInput) => new Promise((resolve) => {
    if (openRef.current) finish(openRef.current.withInput ? null : false);
    idRef.current += 1;
    const next = { ...confirmOptions(options), withInput, resolve, id: idRef.current };
    openRef.current = next;
    setDialog(next);
  }), [finish]);

  useEffect(() => () => {
    const open = openRef.current;
    if (open) open.resolve(open.withInput ? null : false);
  }, []);

  const api = useMemo(() => ({
    confirm: (options) => show(options, false),
    prompt: (options) => show(options, true),
  }), [show]);

  return (
    <ConsignmentConfirmContext.Provider value={api}>
      {children}
      {dialog ? <ConsignmentConfirmModal key={dialog.id} dialog={dialog} onDone={finish} /> : null}
    </ConsignmentConfirmContext.Provider>
  );
}
