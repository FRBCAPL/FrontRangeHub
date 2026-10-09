import React, { useCallback, useState } from 'react';
import ConsignmentContactModal from './ConsignmentContactModal.jsx';

/** A button that opens the Contact FRPL window. Pass className to style it like a link or button. */
export default function ConsignmentContactButton({ children = 'Contact FRPL', className = 'cs-btn cs-btn-secondary', itemNumber, topic }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open ? <ConsignmentContactModal itemNumber={itemNumber} topic={topic} onClose={close} /> : null}
    </>
  );
}
