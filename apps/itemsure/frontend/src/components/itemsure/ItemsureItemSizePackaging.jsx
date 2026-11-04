import React, { useState } from 'react';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemPackages from '../../hooks/useItemPackages.js';
import { unitAsks } from '../../utils/itemsureItemContent.js';
import { pluralUnit, singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureItemContentField from './ItemsureItemContentField.jsx';
import ItemsurePiecesField from './ItemsurePiecesField.jsx';
import ItemsurePackaging from './ItemsurePackaging.jsx';

/**
 * Right under what it's counted in, the question that fits it: "How much one bottle holds" for
 * bottles and kegs, "One case has ___" for cases and packs, nothing for each or pounds. Plus
 * packaging, which for cases and packs stays folded away unless it's already in use.
 */
export default function ItemsureItemSizePackaging({ form, setForm, unit, unitInfo, features, itemId, categorySize = null, categoryPieces = null, sizeHint = '' }) {
  const { organization } = useItemsureWorkspace();
  const packaging = useItemPackages(organization.id);
  const [openPackaging, setOpenPackaging] = useState(false);
  const asks = unitAsks(unit);
  const showSize = 'content_size' in form && asks === 'size';
  const showPieces = 'pieces' in form && asks === 'pieces';
  const showPackaging = Boolean(features?.packaging);
  if (!showSize && !showPieces && !showPackaging) return null;
  const unitName = singularUnit(unit?.name || 'unit').toLowerCase();
  const unitPlural = pluralUnit(unitName);
  const packages = (itemId && packaging.ready && packaging.packagesFor(itemId)) || [];
  const packagingInUse = packages.some((p) => p.is_active && Number(p.size) !== 1);
  const foldPackaging = showPieces && !packagingInUse && !openPackaging;

  return (
    <section className="isu-size-packaging" aria-label={showPieces ? `What's in a ${unitName}` : 'Size and packaging'}>
      <h3>{showPieces ? `What\u2019s in a ${unitName}` : 'Size and packaging'}</h3>
      {showSize ? <ItemsureItemContentField form={form} setForm={setForm} unit={unit} categorySize={categorySize} hint={sizeHint} /> : null}
      {showPieces ? (
        <ItemsurePiecesField
          unitName={unitName}
          value={form.pieces}
          onChange={(v) => setForm((f) => ({ ...f, pieces: v }))}
          about={sizeHint || form.name}
          fallback={categoryPieces ? { pieces: categoryPieces.pieces, from: categoryPieces.fromCategory } : null}
          hint={categoryPieces ? `Leave it blank to use ${categoryPieces.fromCategory}'s number.` : ''}
        />
      ) : null}
      {showPackaging ? (
        foldPackaging ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-size-packaging-more" onClick={() => setOpenPackaging(true)}>+ Buy it in a bigger pack? (like 1 pallet = 50 {unitPlural})</button>
        ) : itemId && packaging.ready ? (
          <ItemsurePackaging
            item={{ id: itemId, unitName: unitInfo.unitName, precision: unitInfo.precision }}
            packages={packages}
            onChanged={packaging.reload}
          />
        ) : !itemId ? (
          <p className="isu-muted isu-small">How many {unitPlural} come in a bigger pack can be added once the item is saved.</p>
        ) : null
      ) : null}
    </section>
  );
}
