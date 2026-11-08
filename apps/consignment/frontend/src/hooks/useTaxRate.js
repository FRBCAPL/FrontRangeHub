import { useEffect, useState } from 'react';
import { loadPublicSettings } from '../services/consignmentSellerAccessService.js';
import { DEFAULT_TAX_RATE, normalizeTaxRate } from '../utils/consignmentTax.js';

let cached = null;
let pending = null;
const listeners = new Set();

/** One settings request per page load, shared by every price on the page. */
export function loadTaxRate() {
  if (cached != null) return Promise.resolve(cached);
  if (!pending) {
    pending = loadPublicSettings()
      .then((row) => normalizeTaxRate(row?.tax_rate))
      .catch(() => DEFAULT_TAX_RATE)
      .then((rate) => { cached = rate; pending = null; return rate; });
  }
  return pending;
}

/** After Admin → Settings saves a new rate. */
export function setTaxRate(rate) {
  cached = normalizeTaxRate(rate);
  listeners.forEach((fn) => fn(cached));
}

export default function useTaxRate() {
  const [rate, setRate] = useState(cached ?? DEFAULT_TAX_RATE);
  useEffect(() => {
    let alive = true;
    loadTaxRate().then((r) => { if (alive) setRate(r); });
    listeners.add(setRate);
    return () => { alive = false; listeners.delete(setRate); };
  }, []);
  return rate;
}
