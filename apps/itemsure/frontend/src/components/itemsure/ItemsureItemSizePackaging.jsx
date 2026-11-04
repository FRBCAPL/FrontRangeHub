import React from 'react';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemPackages from '../../hooks/useItemPackages.js';
import { asksContent } from '../../utils/itemsureItemContent.js';
import { pluralUnit, singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureItemContentField from './ItemsureItemContentField.jsx';
import ItemsurePackaging from './ItemsurePackaging.jsx';

/** One place for "how much one holds" and "how many come in a case", right under what it's counted in. */
export default function ItemsureItemSizePackaging({ form, setForm, unit, unitInfo, features, itemId }) {
  const { organization } = useItemsureWorkspace();
  const packaging = useItemPackages(organization.id);
  const showSize = 'content_size' in form && asksContent(unit?.code);
  const showPackaging = Boolean(features?.packaging);
  if (!showSize && !showPackaging) return null;
  const unitPlural = pluralUnit(singularUnit(unit?.name || 'unit')).toLowerCase();

  return (
    <section className="isu-size-packaging" aria-label="Size and packaging">
      <h3>Size and packaging</h3>
      {showSize ? <ItemsureItemContentField form={form} setForm={setForm} unit={unit} /> : null}
      {showPackaging ? (
        itemId && packaging.ready ? (
          <ItemsurePackaging
            item={{ id: itemId, unitName: unitInfo.unitName, precision: unitInfo.precision }}
            packages={packaging.packagesFor(itemId)}
            onChanged={packaging.reload}
          />
        ) : !itemId ? (
          <p className="isu-muted isu-small">How many {unitPlural} come in a case can be added once the item is saved.</p>
        ) : null
      ) : null}
    </section>
  );
}
