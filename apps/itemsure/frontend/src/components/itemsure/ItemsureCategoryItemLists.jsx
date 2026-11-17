import React, { useMemo } from 'react';
import {
  alsoFoundIn, categoryIcon, categoryPath, extraCategoryNames, groupBySubcategory, inCategory,
} from '../../utils/itemsureCategories.js';
import { groupByStatus, listTone } from '../../utils/itemsureItemLook.js';
import { detailsLine } from '../../utils/itemsureItemDetails.js';
import ItemsureItemGroups from './ItemsureItemGroups.jsx';
import ItemsureItemRow from './ItemsureItemRow.jsx';

function StatusList({ items, toneFor, titled, renderItem }) {
  return (
    <ItemsureItemGroups
      groups={groupByStatus(items, toneFor)}
      titled={titled}
      renderItem={renderItem}
    />
  );
}

/** Worst list tone in a bucket: Running Low > Top Off > All good. */
function attentionTone(items, toneFor) {
  let warn = false;
  let ok = false;
  for (const item of items) {
    const tone = toneFor(item);
    if (tone === 'danger') return 'danger';
    if (tone === 'warn') warn = true;
    else if (tone === 'ok') ok = true;
  }
  if (warn) return 'warn';
  if (ok) return 'ok';
  return '';
}

/**
 * Sort a subcategory bucket: main members first, Also-in after (still by status groups inside).
 * Status grouping re-sorts by name within tone; we keep also-in marked on the row only.
 */
function SubcategorySections({
  items, tree, category, toneFor, titled, renderItem,
}) {
  const buckets = useMemo(
    () => groupBySubcategory(tree, items, category),
    [tree, items, category],
  );

  if (!buckets.length) {
    return <StatusList items={items} toneFor={toneFor} titled={titled} renderItem={renderItem} />;
  }

  return (
    <div className="isu-item-sub-split isu-stack">
      {buckets.map((bucket) => {
        const badgeTone = attentionTone(bucket.items, toneFor);
        return (
          <details key={bucket.id} className="isu-item-sub-block">
            <summary className="isu-item-sub-heading">
              <span className="isu-item-sub-label">{bucket.label}</span>
              <span className={`isu-item-group-count${badgeTone ? ` is-${badgeTone}` : ''}`}>
                {bucket.items.length}
              </span>
            </summary>
            <StatusList
              items={bucket.items}
              toneFor={toneFor}
              titled
              renderItem={renderItem}
            />
          </details>
        );
      })}
    </div>
  );
}

/**
 * Inventory list for a category chip: one subcategory layout. Items whose main category
 * is here sit with those that only have this category/sub under Also in (those rows note
 * their real main category).
 */
export default function ItemsureCategoryItemLists({
  items, titled = false, tree, category,
  summaryFor, piecesFor, whereFor, stock, placesReady, suppliers, supplierFilter,
  needle, showDetails, openCounts, onCountItem,
}) {
  const toneFor = (item) => listTone(summaryFor(item.id), item.topoffPercent);
  const viewingCategory = Boolean(category) && tree.byId.has(category);

  // Within each status group, show main members before Also-in (stable for scanning).
  const ordered = useMemo(() => {
    if (!viewingCategory) return items;
    const main = [];
    const also = [];
    for (const item of items) {
      if (inCategory(tree, item, category)) main.push(item);
      else also.push(item);
    }
    return [...main, ...also];
  }, [items, viewingCategory, tree, category]);

  const row = (item, compact) => {
    const alsoHere = viewingCategory && alsoFoundIn(tree, item, category);
    return (
      <ItemsureItemRow
        key={item.id}
        item={item}
        compact={compact}
        icon={categoryIcon(tree, item.category_id)}
        summary={summaryFor(item.id)}
        pieces={piecesFor(item.id)}
        keptAt={stock || placesReady ? whereFor(item.id) : null}
        supplier={suppliers.supplierFor(item.id)}
        alsoIn={extraCategoryNames(tree, item)}
        showAlsoIn={!viewingCategory}
        listedUnder={alsoHere ? (categoryPath(tree, item.category_id) || item.categoryName || '') : ''}
        showSupplier={Boolean(supplierFilter) || (Boolean(needle) && suppliers.supplierNamesFor(item.id).some((n) => n.toLowerCase().includes(needle)))}
        details={showDetails ? detailsLine(item) : ''}
        onCount={item.is_active && openCounts.sessions.length ? () => onCountItem(item) : null}
        counted={item.is_active && openCounts.sessions.length > 0 && !openCounts.waitingFor(item.id).length}
      />
    );
  };

  return (
    <SubcategorySections
      items={ordered}
      tree={tree}
      category={category}
      toneFor={toneFor}
      titled={titled}
      renderItem={(item, compact) => row(item, compact)}
    />
  );
}
