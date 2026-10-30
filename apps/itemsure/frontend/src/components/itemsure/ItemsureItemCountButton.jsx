import React, { useCallback, useState } from 'react';
import { Modal } from './ItemsureUi.jsx';
import ItemsureQuickCount from './ItemsureQuickCount.jsx';
import ItemsureUndoBar from './ItemsureUndoBar.jsx';

/**
 * "Add to count" (or "✓ Counted" to edit) for one item while a count is open; nothing otherwise.
 * `item` needs id, name, unitName, base_unit_id, is_active. `counts` comes from useOpenCounts.
 */
export default function ItemsureItemCountButton({ organizationId, item, counts, keptAt, precision, can }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(null);
  const closeDone = useCallback(() => setDone(null), []);

  if (!counts.sessions.length || !item.is_active || !can('counts.edit')) return null;
  const waiting = counts.waitingFor(item.id);
  const counted = !waiting.length;

  return (
    <>
      <button
        type="button"
        className={counted ? 'isu-stockcard-counted' : 'isu-stockcard-edit is-count'}
        onClick={() => setOpen(true)}
        title={counted ? 'Edit the count' : undefined}
      >
        {counted ? '\u2713 Counted' : 'Add to count'}
      </button>
      <Modal open={open} title={counted ? 'Edit count' : 'Add to count'} onClose={() => setOpen(false)}>
        {open ? (
          <ItemsureQuickCount
            organizationId={organizationId}
            item={item}
            sessions={counts.sessions}
            startSessionId={waiting[0]?.id || counts.sessions[0]?.id}
            keptAt={keptAt}
            precision={precision}
            canAddItems={can('counts.create')}
            onCancel={() => setOpen(false)}
            onSaved={(result) => {
              counts.markCounted(result.sessionId, item.id, result.areaIds);
              setOpen(false);
              setDone({
                message: result.message,
                undo: async () => {
                  await result.undo();
                  await counts.reload();
                },
              });
            }}
          />
        ) : null}
      </Modal>
      <ItemsureUndoBar done={done} onClose={closeDone} />
    </>
  );
}
