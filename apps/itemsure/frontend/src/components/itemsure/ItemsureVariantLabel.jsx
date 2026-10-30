import React, { useState } from 'react';
import { saveVariantLabel } from '../../services/itemsureOrgService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { defaultVariantLabel, VARIANT_LABEL_CHOICES, variantLabelFor } from '../../utils/itemsureItemDetails.js';
import { Card, ErrorNote, Field } from './ItemsureUi.jsx';

const OWN = '__own__';

/** Settings → Features: what this business calls the second item detail (Model, Style, ...). */
export default function ItemsureVariantLabel() {
  const { organization, can, reload } = useItemsureWorkspace();
  const current = variantLabelFor(organization);
  const fallback = defaultVariantLabel(organization.industryType);
  const [choice, setChoice] = useState(VARIANT_LABEL_CHOICES.includes(current) ? current : OWN);
  const [own, setOwn] = useState(VARIANT_LABEL_CHOICES.includes(current) ? '' : current);
  const [notice, setNotice] = useState('');
  const save = useItemsureAction();
  const canEdit = can('organization.update');
  const wanted = choice === OWN ? own.trim() : choice;

  if (!canEdit) {
    return (
      <Card title="Item details">
        <p className="isu-muted isu-small">Items have a <strong>Brand</strong> and a <strong>{current}</strong>. Only the owner or an administrator can rename it.</p>
      </Card>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setNotice('');
    if (await save.run(() => saveVariantLabel(organization.id, wanted === fallback ? '' : wanted))) {
      await reload();
      setNotice('Saved.');
    }
  };

  return (
    <Card title="Item details">
      <form className="isu-stack" onSubmit={submit}>
        <p className="isu-muted isu-small">
          Every item can have a <strong>Brand</strong> and one more detail. Choose the word that fits your business; it is used everywhere in ItemSure.
        </p>
        <ErrorNote message={save.error} />
        {notice ? <p className="isu-notice" role="status">{notice}</p> : null}
        <Field label="Call the second detail" hint={`The usual word for ${organization.industryName || 'your business'} is ${fallback}.`}>
          <select value={choice} onChange={(e) => { setNotice(''); setChoice(e.target.value); }}>
            {VARIANT_LABEL_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value={OWN}>My own word…</option>
          </select>
        </Field>
        {choice === OWN ? (
          <Field label="Your word">
            <input value={own} onChange={(e) => { setNotice(''); setOwn(e.target.value); }} maxLength={30} placeholder="For example: Color" autoFocus />
          </Field>
        ) : null}
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={save.busy || !wanted || wanted === current}>
          {save.busy ? 'Saving…' : 'Save name'}
        </button>
      </form>
    </Card>
  );
}
