import React from 'react';
import useTaxRate from '../../hooks/useTaxRate.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { salesTax, withTax } from '../../utils/consignmentTax.js';

/**
 * Item / product page price: "$324.75 total" with "$300 + $24.75 tax" underneath, or "$300 tax included" when the
 * seller/admin priced it with tax in. amount is before tax; children follow the second line.
 */
export default function ConsignmentTaxTotal({ amount, label = 'total', included = false, children = null }) {
  const rate = useTaxRate();
  if (included) {
    return (
      <div className="cs-price cs-tax-total">
        <p className="cs-tax-total-main"><strong>{formatDollars(withTax(amount, rate))}</strong> tax included</p>
        {children ? <p className="cs-tax-total-sub">{children}</p> : null}
      </div>
    );
  }
  return (
    <div className="cs-price cs-tax-total">
      <p className="cs-tax-total-main">
        <strong>{formatDollars(withTax(amount, rate))}</strong> {label}
      </p>
      <p className="cs-tax-total-sub">
        {formatDollars(amount)} + {formatDollars(salesTax(amount, rate))} tax
        {children}
      </p>
    </div>
  );
}
