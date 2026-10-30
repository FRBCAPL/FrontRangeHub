import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { PageHead } from './ItemsureUi.jsx';
import ItemsureHistorySections from './ItemsureHistorySections.jsx';
import ItemsureHistoryList from './ItemsureHistoryList.jsx';

/** Organization-wide history of changes, in sections; ?kind= opens one kind in full. */
export default function ItemsureActivity() {
  const { organization } = useItemsureWorkspace();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind');
  const open = (id) => setParams({ kind: id });
  const back = () => setParams({});

  return (
    <div className="isu-page">
      <PageHead title="History" description="Every change made in your business. Tap a section to see all of that kind." />
      {kind ? (
        <ItemsureHistoryList organizationId={organization.id} kindId={kind} onOpen={open} onBack={back} />
      ) : (
        <ItemsureHistorySections organizationId={organization.id} onOpen={open} />
      )}
    </div>
  );
}
