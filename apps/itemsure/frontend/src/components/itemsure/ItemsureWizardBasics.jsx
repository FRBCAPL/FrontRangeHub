import React, { useEffect, useMemo } from 'react';
import ItemsureTabs from './ItemsureTabs.jsx';
import {
  WizardBasicsAbout,
  WizardBasicsBuy,
  WizardBasicsCount,
  basicsPanelForError,
} from './ItemsureWizardBasicsPanels.jsx';

/** Panel ids in order for Add/Edit step 1. */
export function basicsPanels(showBuy) {
  return ['about', 'count', ...(showBuy ? ['buy'] : [])];
}

export { basicsPanelForError };

/**
 * Step 1 split into short panels: About (name / category / brand), Counted in
 * (unit + portion), and Suppliers — so Edit Item stays skim-friendly.
 * `panel` / `onPanel` are controlled by the wizard so Next/Back walk these panels.
 */
export default function ItemsureWizardBasics({ panel, onPanel, ...props }) {
  const { form, stepError = '' } = props;
  const showBuy = 'supplier_id' in form;
  const tabs = useMemo(() => [
    { id: 'about', label: 'About', tip: 'Name, brand, category, also found in' },
    { id: 'count', label: 'Counted in', tip: 'Unit, portions, and packaging' },
    ...(showBuy ? [{ id: 'buy', label: 'Suppliers', tip: 'Buy from, also from, and prices' }] : []),
  ], [showBuy]);

  useEffect(() => {
    if (!stepError) return;
    const next = basicsPanelForError(stepError);
    if (next === 'buy' && !showBuy) return;
    onPanel(next);
  }, [stepError, showBuy, onPanel]);

  useEffect(() => {
    if (panel === 'buy' && !showBuy) onPanel('about');
  }, [panel, showBuy, onPanel]);

  return (
    <div className="isu-stack isu-wizard-basics">
      <ItemsureTabs
        label="Item details"
        tabs={tabs}
        selected={panel}
        onSelect={onPanel}
      />
      {panel === 'about' ? <WizardBasicsAbout {...props} /> : null}
      {panel === 'count' ? <WizardBasicsCount {...props} /> : null}
      {panel === 'buy' && showBuy ? <WizardBasicsBuy {...props} /> : null}
    </div>
  );
}
