import React from 'react';
import { displayQuantity, displaySigned } from '../../utils/itemsureQuantity.js';

const BLOCKED_TEXT = {
  superseded: 'A newer approved count already covers this item here.',
  history_conflict: 'This item has inventory history here but no balance. An administrator needs to review it.',
  moved_during_count: 'Stock changed while this item was being counted, edited, or synced, so the count can\u2019t be matched to a moment in time.',
  negative: 'Stock recorded after this count would take it below zero from the counted quantity.',
  unit_changed: 'The item\u2019s unit changed after it was counted.',
};

function Line({ line, areaName, showExpected }) {
  const unit = line.unit_symbol || line.unit_name;
  return (
    <li className="isu-approval-item">
      <div className="isu-approval-line">
        <div>
          <strong>{line.item_name}</strong>
          <p className="isu-muted isu-small">{areaName(line.storage_area_id)}</p>
        </div>
        <div className="isu-approval-figures">
          <span>Counted {displayQuantity(line.counted)} {unit}</span>
          {showExpected ? <span className="isu-muted">Expected {displayQuantity(line.expected)}</span> : null}
          {showExpected ? <span className="isu-count-total">Variance {displaySigned(line.variance)}</span> : null}
        </div>
      </div>
      {line.moved_after_cutoff ? (
        <p className="isu-muted isu-small">Stock changed here after this was counted. Those changes are kept.</p>
      ) : null}
      {line.mixed_area ? (
        <p className="isu-notice isu-notice--warn isu-small">
          {line.storage_area_id
            ? 'This item also has stock under \u201cNo specific area\u201d here.'
            : 'This item also has stock in named storage areas here.'}{' '}
          Each place keeps its own balance, so check it was counted in the right place.
        </p>
      ) : null}
      {line.blocked_reason ? <p className="isu-error isu-small">{BLOCKED_TEXT[line.blocked_reason] || 'This line can\u2019t be approved.'}</p> : null}
    </li>
  );
}

function Group({ title, note, lines, areaName, showExpected = true }) {
  if (!lines.length) return null;
  return (
    <section className="isu-approval-group">
      <h3>{title} <span className="isu-badge">{lines.length}</span></h3>
      {note ? <p className="isu-muted isu-small">{note}</p> : null}
      <ul className="isu-count-breakdown">
        {lines.map((line) => <Line key={line.entry_id} line={line} areaName={areaName} showExpected={showExpected} />)}
      </ul>
    </section>
  );
}

export default function ItemsureCountApprovalLines({ groups, untouched, omittedCount, areaName }) {
  return (
    <div className="isu-stack">
      <Group title="Needs attention" lines={groups.blocked} areaName={areaName} />
      <Group
        title="Opening balances"
        note="First approved count here. These quantities become the starting balance."
        lines={groups.opening}
        areaName={areaName}
        showExpected={false}
      />
      <Group title="Counted more than expected" lines={groups.increase} areaName={areaName} />
      <Group title="Counted less than expected" note="Unexplained differences are recorded as count adjustments." lines={groups.decrease} areaName={areaName} />
      <Group title="Matches expected" lines={groups.unchanged} areaName={areaName} />

      {untouched.length ? (
        <section className="isu-approval-group">
          <h3>Set up but not counted <span className="isu-badge">{untouched.length}</span></h3>
          <p className="isu-muted isu-small">These balances stay as they are.</p>
          <ul className="isu-count-breakdown">
            {untouched.map((b) => (
              <li key={`${b.item_id}:${b.storage_area_id || ''}`}>
                <span>{b.item_name} {'\u00b7'} {areaName(b.storage_area_id)}</span>
                <span>{displayQuantity(b.quantity)} {b.unit_symbol}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {omittedCount ? (
        <p className="isu-muted isu-small">
          {omittedCount} item{omittedCount === 1 ? ' was' : 's were'} not counted. Not counted is never treated as zero.
        </p>
      ) : null}
    </div>
  );
}
