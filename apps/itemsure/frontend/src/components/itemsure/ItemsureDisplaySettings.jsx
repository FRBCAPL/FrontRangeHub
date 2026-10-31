import React from 'react';
import useCompactView from '../../hooks/useCompactView.js';
import { Card } from './ItemsureUi.jsx';

/** Settings → Your profile: how ItemSure looks on this device. */
export default function ItemsureDisplaySettings() {
  const [compact, setCompact] = useCompactView();
  return (
    <Card title="Display">
      <label className="isu-feature">
        <input type="checkbox" role="switch" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
        <span>
          <strong>Compact view</strong>
          <span className="isu-muted isu-small isu-feature-hint">
            Smaller headings and tighter spacing, so more items fit on screen. Handy on a computer. Only changes this device.
          </span>
        </span>
      </label>
    </Card>
  );
}
