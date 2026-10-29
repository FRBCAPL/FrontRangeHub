import React from 'react';
import { daysLeft, describeDays, describeRate, MIN_HISTORY_DAYS } from '../../utils/itemsureUsage.js';

/** "You use about 6 btl a week. At that rate it runs out in about 9 days." */
export default function ItemsureItemUsage({ usage, total, unit }) {
  if (!usage) return null;
  if (!usage.enough) {
    return <p className="isu-item-usage isu-muted isu-small">Usage estimates appear after about {MIN_HISTORY_DAYS} days of history.</p>;
  }
  const rate = describeRate(usage.total, unit);
  if (!rate) return <p className="isu-item-usage isu-muted isu-small">None used in the last 4 weeks.</p>;
  const left = describeDays(daysLeft(total, usage.total));
  return (
    <p className="isu-item-usage">
      You use <strong>{rate}</strong>.{left ? <> At that rate it runs out in <strong>{left}</strong>.</> : null}
    </p>
  );
}
