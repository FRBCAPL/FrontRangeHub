import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import usePosModifiers from '../../hooks/usePosModifiers.js';
import { ruleText } from '../../utils/itemsurePosModifiers.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import { Card, ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsurePosModifierForm from './ItemsurePosModifierForm.jsx';

const SHOWN = 8;

const unitLabel = (rule, item) => {
  if (rule?.action !== 'item') return '';
  const name = singularUnit(item?.unitName || 'unit').toLowerCase();
  return { fl_oz: 'oz', ml: 'ml', base: rule.amount === 1 ? name : `${name}s`, piece: rule.amount === 1 ? 'single' : 'singles' }[rule.unit] || '';
};

/** Settings → Clover modifiers ("Double", "Add Red Bull"): what each one uses, for the sales reports. */
export default function ItemsurePosModifiers({ organizationId, canEdit }) {
  const { state, error, save } = usePosModifiers(organizationId);
  const [editing, setEditing] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [bulk, setBulk] = useState(false);
  const itemsById = useMemo(() => new Map((state?.items || []).map((i) => [i.id, i])), [state]);

  if (!state) return null;
  if (state.missing) {
    return (
      <Card title="Clover modifiers">
        <p className="isu-muted isu-small">Counting modifiers like Double or Add Red Bull needs a database update first. Nothing else is affected.</p>
      </Card>
    );
  }

  const describe = (rule) => ruleText(rule, itemsById.get(rule?.itemId)?.name, unitLabel(rule, itemsById.get(rule?.itemId)));
  const suggested = state.rows.filter((r) => !r.rule && r.guess);
  const unset = state.rows.filter((r) => !r.rule).length;
  const shown = showAll ? state.rows : state.rows.slice(0, SHOWN);
  const headline = !state.rows.length
    ? 'None yet'
    : unset
      ? `${state.rows.length} · ${unset} not set yet`
      : `${state.rows.length}`;
  const useAll = async () => {
    setBulk(true);
    for (const r of suggested) if (!(await save(r.id, r.guess))) break;
    setBulk(false);
  };

  return (
    <details className="isu-card isu-pos-mod-fold">
      <summary className="isu-pos-mod-summary">
        <h2>Clover modifiers</h2>
        <span className="isu-muted isu-small">{headline}</span>
      </summary>
      <div className="isu-pos-mod-body">
      <p className="isu-muted isu-small">
        Modifiers are the extras staff tap in Clover, like Double or Add Red Bull. Say what each one uses and the{' '}
        <Link to={`${ITEMSURE_PATH}/clover-sales`} className="isu-link">Clover sales</Link> and Sales vs counts pages count it too.
        This doesn&rsquo;t change stock or anything in Clover.
      </p>
      <ErrorNote message={error} />
      {!state.rows.length ? (
        <p className="isu-muted isu-small">
          No modifiers yet. They show up here once sales are brought in. For earlier dates, open Clover sales, pick the dates, and tap Bring in latest sales.
        </p>
      ) : null}
      {canEdit && suggested.length > 1 ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={bulk} onClick={useAll}>
          {bulk ? 'Saving…' : `Use all ${suggested.length} suggestions`}
        </button>
      ) : null}
      <ul className="isu-pos-mod-list">
        {shown.map((r) => (
          <li key={r.id} className="isu-pos-mod-row">
            <div className="isu-pos-mod-text">
              <strong>{r.name || 'Modifier'}</strong>
              <span className="isu-muted isu-small"> · {r.recent ? `used ${Math.round(r.recent)} times in the last 30 days` : 'not used in the last 30 days'}</span>
              <div className={r.rule ? 'isu-small' : 'isu-small isu-muted'}>{describe(r.rule)}</div>
              {!r.rule && r.guess ? <div className="isu-small isu-muted">Suggestion: {describe(r.guess)}</div> : null}
            </div>
            {canEdit ? (
              <div className="isu-pos-mod-actions">
                {!r.rule && r.guess ? (
                  <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={bulk} onClick={() => save(r.id, r.guess)}>Use suggestion</button>
                ) : null}
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={bulk} onClick={() => setEditing(r)}>{r.rule ? 'Change' : 'Set'}</button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {state.rows.length > SHOWN ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer' : `Show all ${state.rows.length}`}
        </button>
      ) : null}
      <p className="isu-muted isu-small">Modifiers count in the reports only. Taking sales off stock doesn&rsquo;t use them yet.</p>
      </div>
      <Modal open={Boolean(editing)} title={editing ? `${editing.name || 'Modifier'}` : ''} onClose={() => setEditing(null)}>
        {editing ? (
          <ItemsurePosModifierForm modifier={editing} items={state.items} onSave={(rule) => save(editing.id, rule)} onCancel={() => setEditing(null)} />
        ) : null}
      </Modal>
    </details>
  );
}
