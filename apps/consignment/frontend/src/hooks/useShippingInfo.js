import { useEffect, useState } from 'react';
import { SHIPPING_OFF, loadShippingInfo } from '../services/consignmentShippingService.js';

/** { enabled, complaintDays }: whether out-of-state shipping is switched on (Admin → Settings). */
export default function useShippingInfo() {
  const [info, setInfo] = useState(SHIPPING_OFF);
  useEffect(() => {
    let alive = true;
    loadShippingInfo().then((next) => { if (alive) setInfo(next); });
    return () => { alive = false; };
  }, []);
  return info;
}
