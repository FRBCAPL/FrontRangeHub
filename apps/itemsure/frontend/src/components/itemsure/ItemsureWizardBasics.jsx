import React, { useEffect, useMemo, useState } from 'react';
import ItemsureTabs from './ItemsureTabs.jsx';
import {
  WizardBasicsAbout,
  WizardBasicsBuy,
  WizardBasicsCount,
  basicsPanelForError,
} from './ItemsureWizardBasicsPanels.jsx';

/**
 * Step 1 split into short panels: About (name / category / brand), Counted in
 * (unit + portion), and Suppliers — so Edit Item stays skim-friendly.
 */
export default function ItemsureWizardBasics(props) {
  const { form, stepError = '' } = props;
  const showBuy = 'supplier_id' in form;
  const tabs = useMemo(() => [
    { id: 'about', label: 'About' },
    { id: 'count', label: 'Counted in' },
    ...(showBuy ? [{ id: 'buy', label: 'Suppliers' }] : []),
  ], [showBuy]);

  const [panel, setPanel] = useState('about');

  useEffect(() => {
    if (!stepError) return;
    const next = basicsPanelForError(stepError);
    if (next === 'buy' && !showBuy) return;
    setPanel(next);
  }, [stepError, showBuy]);

  useEffect(() => {
    if (panel === 'buy' && !showBuy) setPanel('about');
  }, [panel, showBuy]);

  return (
    <div className="isu-stack isu-wizard-basics">
      <ItemsureTabs
        label="Item details"
        tabs={tabs}
        selected={panel}
        onSelect={setPanel}
      />
      {panel === 'about' ? <WizardBasicsAbout {...props} /> : null}
      {panel === 'count' ? <WizardBasicsCount {...props} /> : null}
      {panel === 'buy' && showBuy ? <WizardBasicsBuy {...props} /> : null}
    </div>
  );
}
