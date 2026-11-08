import React from 'react';
import useTaxRate from '../../hooks/useTaxRate.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { salesTax, withTax } from '../../utils/consignmentTax.js';

/** Item / product page price: "$324.75 total" with "$300 + $24.75 tax" underneath. amount is before tax; children follow the breakdown. */
export default function ConsignmentTaxTotal({ amount, label = 'total', children = null }) {
  const rate = useTaxRate();
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
