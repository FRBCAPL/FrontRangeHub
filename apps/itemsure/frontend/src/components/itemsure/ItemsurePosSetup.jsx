import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import usePosSetup from '../../hooks/usePosSetup.js';
import { setPosPour } from '../../services/itemsurePosService.js';
import { saveSizeAnswers } from '../../services/itemsureItemContentService.js';
import { saveStandardAmounts } from '../../services/itemsureStandardAmountService.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { Card, ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsurePosAmountReview from './ItemsurePosAmountReview.jsx';
import ItemsurePosSizeReview from './ItemsurePosSizeReview.jsx';
import ItemsureStandardAmounts from './ItemsureStandardAmounts.jsx';
import ItemsureCategoryAmounts from './ItemsureCategoryAmounts.jsx';
import { saveCategoryDefault } from '../../services/itemsureCategoryDefaultService.js';

const UNIT_WORD = { fl_oz: 'oz', ml: 'ml', base: 'whole' };

function Step({ done, children, action }) {
  return (
    <li className={`isu-pos-step${done ? ' is-done' : ''}`}>
      <span className="isu-pos-step-mark" aria-hidden="true">{done ? '\u2713' : '!'}</span>
      <span className="isu-pos-step-text">{children}</span>
      {action}
    </li>
  );
}

/**
 * Point of sale → Pour sizes: a short to-do list (by category, amounts, sizes, usual pours) with
 * ItemSure's guesses filled in, so people confirm instead of typing. `onChanged` runs after saves.
 */
export default function ItemsurePosSetup({ organizationId, canEdit, reloadKey, onChanged }) {
  const { summary, error: loadError, reload } = usePosSetup(organizationId, reloadKey);
  const [open, setOpen] = useState('');
  const [sizesNext, setSizesNext] = useState(false);
  const { busy, error, setError, run } = useItemsureAction();

  useEffect(() => {
    if (!sizesNext || !summary) return;
    setSizesNext(false);
    if (summary.sizes.length) setOpen('sizes');
  }, [sizesNext, summary]);

  if (loadError) return <Card title="Pour sizes"><ErrorNote message={loadError} /></Card>;
  if (!summary) return null;
  if (!summary.ready) {
    return (
      <Card title="Pour sizes">
        <p className="isu-muted">Pour sizes need a database update first. Nothing else is affected.</p>
      </Card>
    );
  }

  const close = () => {
    setOpen('');
    setError('');
  };
  const finish = async (ok, next) => {
    await reload();
    onChanged?.();
    if (ok) {
      setOpen('');
      if (next) setSizesNext(true);
    }
  };
  const saveAmounts = async (list) => {
    const ok = await run(async () => {
      for (const { row, amount, unit } of list) await setPosPour(organizationId, row.pos.external_id, row.item.id, amount, unit);
    });
    await finish(ok, true);
  };
  const saveSizes = async (list) => {
    const ok = await run(async () => {
      await saveSizeAnswers(organizationId, list);
    });
    await finish(ok, false);
  };
  const saveCategory = async (categoryId, value) => {
    const ok = await run(() => saveCategoryDefault(organizationId, categoryId, value));
    if (ok) {
      await reload();
      onChanged?.();
    }
    return ok;
  };
  const saveStandards = async (rows) => {
    const ok = await run(() => saveStandardAmounts(organizationId, summary.standardsSaved || [], rows));
    await finish(ok, false);
  };

  const guessed = summary.amounts.filter((a) => a.suggestion).length;
  const houseList = summary.standards.map((s) => `${s.keyword} ${s.unit === 'base' ? '= 1' : `${s.amount} ${UNIT_WORD[s.unit]}`}`).join(' · ');
  const allSet = !summary.amounts.length && !summary.sizes.length;
  const categorySet = Boolean(summary.defaults?.size);
  const { amounts: byCatAmounts, sizes: byCatSizes } = summary.byCategory;
  const coveredText = [
    `${byCatAmounts} amount${byCatAmounts === 1 ? '' : 's'}`,
    byCatSizes ? `${byCatSizes} size${byCatSizes === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' and ');

  return (
    <Card title="Pour sizes">
      <p className="isu-muted isu-small">How much each Clover sale uses. Set it once for a whole category; single drinks only need their own when they&apos;re different. ItemSure fills in its best guesses, so you mostly just check them.</p>
      <ol className="isu-pos-steps">
        {summary.categoryReady ? (
          <Step
            done={categorySet}
            action={canEdit ? (
              <button type="button" className={`isu-btn isu-btn--${categorySet ? 'ghost' : 'primary'} isu-btn--sm`} onClick={() => setOpen('categories')}>
                {categorySet ? 'Change' : 'Set by category'}
              </button>
            ) : null}
          >
            {categorySet
              ? <><strong>Pours by category</strong><span className="isu-muted isu-small"> · cover {coveredText}</span></>
              : <><strong>Set pours by category</strong><span className="isu-muted isu-small"> · quickest: Liquor 1.5 oz a drink, 750 ml bottles</span></>}
          </Step>
        ) : null}
        <Step
          done={!summary.amounts.length}
          action={summary.amounts.length && canEdit ? (
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => setOpen('amounts')}>Check them</button>
          ) : null}
        >
          {summary.amounts.length
            ? <><strong>{summary.amounts.length} pour size{summary.amounts.length === 1 ? '' : 's'} to check</strong><span className="isu-muted isu-small"> · {guessed} already guessed for you</span></>
            : <strong>Every linked drink has a pour size</strong>}
        </Step>
        <Step
          done={!summary.sizes.length}
          action={summary.sizes.length && canEdit ? (
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => setOpen('sizes')}>Set sizes</button>
          ) : null}
        >
          {summary.sizes.length
            ? <><strong>{summary.sizes.length} item{summary.sizes.length === 1 ? ' needs' : 's need'} a size</strong><span className="isu-muted isu-small"> · like how big a keg or bottle is, or how many come in a case</span></>
            : <strong>Every poured item has a size</strong>}
        </Step>
        <Step done action={canEdit ? <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setOpen('standards')}>Change</button> : null}>
          <strong>Usual pour sizes</strong><span className="isu-muted isu-small"> · used for guesses: {houseList}</span>
        </Step>
      </ol>
      {allSet ? <Link to={`${ITEMSURE_PATH}/sales-vs-counts`} className="isu-link">All set. See sales vs counts {'\u203A'}</Link> : null}

      <Modal open={open === 'amounts'} title="How much does each one sold use?" onClose={close} wide>
        {open === 'amounts' ? <ItemsurePosAmountReview rows={summary.amounts} piecesReady={summary.piecesReady} busy={busy} error={error} onSave={saveAmounts} onCancel={close} /> : null}
      </Modal>
      <Modal open={open === 'sizes'} title="Sizes and case counts" onClose={close} wide>
        {open === 'sizes' ? <ItemsurePosSizeReview rows={summary.sizes} busy={busy} error={error} onSave={saveSizes} onCancel={close} /> : null}
      </Modal>
      <Modal open={open === 'categories'} title="Pours by category" onClose={close} wide>
        {open === 'categories' ? (
          <ItemsureCategoryAmounts summary={summary} canEdit={canEdit} busy={busy} error={error} onSave={saveCategory} onClose={close} />
        ) : null}
      </Modal>
      <Modal open={open === 'standards'} title="Usual pour sizes" onClose={close}>
        {open === 'standards' ? (
          <ItemsureStandardAmounts standards={summary.standards} canSave={summary.standardsSaved !== null} busy={busy} error={error} onSave={saveStandards} onCancel={close} />
        ) : null}
      </Modal>
    </Card>
  );
}
