import React from 'react';
import { PageHead } from './ItemsureUi.jsx';
import ItemsureSettingsPos from './ItemsureSettingsPos.jsx';

/** More → Clover → Clover setup: connect, match buttons, pours, add-ons, and stock take-off. */
export default function ItemsureCloverSetup() {
  return (
    <div className="isu-page">
      <PageHead
        title="Clover setup"
        description="Connect Clover, match its buttons to your stock, and choose how sales come off inventory."
      />
      <ItemsureSettingsPos />
    </div>
  );
}
