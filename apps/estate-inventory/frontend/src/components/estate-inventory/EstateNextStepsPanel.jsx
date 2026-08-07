import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildNoticeOfInventoryPortalSms,
  defaultFamilyPortalUrl
} from '@shared/utils/estateLegalOps.js';
import { buildWhatsNextSteps } from '@shared/utils/estatePrWorkflow.js';
import {
  isLocksmithMarkedNotNeeded
} from '@shared/utils/estateLocksmithPref.js';
import EstateModalShell from './EstateModalShell';
import EstateInlineLoading from './EstateInlineLoading';

/** Re-export for any older imports that expected buildSteps here. */
export { buildWhatsNextSteps as buildSteps } from '@shared/utils/estatePrWorkflow.js';

const EstateNextStepsPanel = ({
  settings,
  inventoryCount = 0,
  inventoryLoading = false,
  isClosed = false,
  homeData = null,
  homeLoading = false,
  onOpenSettingsSection,
  onCreateCollection,
  onAddItem,
  onOpenScenes,
  onOpenLedger,
  onLogLocksmith,
  onOpenClosing,
  onOpenReports,
  onMessage,
  refreshKey = 0
}) => {
  const [busyInvite, setBusyInvite] = useState(false);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState('now'); // 'now' | 'later'
  const [itemIndex, setItemIndex] = useState(0);
  const [locksmithNotNeeded, setLocksmithNotNeeded] = useState(() =>
    isLocksmithMarkedNotNeeded(settings?.case_number)
  );

  useEffect(() => {
    setLocksmithNotNeeded(isLocksmithMarkedNotNeeded(settings?.case_number));
  }, [settings?.case_number, refreshKey]);

  const waiting = Boolean(homeLoading || inventoryLoading);

  const heirCount = Number(homeData?.heirCount) || 0;
  const helperCount = Number(homeData?.helperCount) || 0;
  const itemCount = homeData?.itemSummary?.itemCount ?? homeData?.items?.length ?? 0;
  const sceneCount = homeData ? Number(homeData.activeSceneCount) || 0 : 0;
  const needsFamilyUpdate = Boolean(homeData?.needsFamilyUpdate);
  const familyUpdateStale = Boolean(homeData?.familyUpdateStale);

  const copyInvite = async () => {
    setBusyInvite(true);
    const caseNumber = settings?.case_number || '';
    const text = buildNoticeOfInventoryPortalSms(
      defaultFamilyPortalUrl(caseNumber),
      caseNumber
    );
    try {
      await navigator.clipboard.writeText(text);
      onMessage?.('Invite notice copied — paste into a text or email to family.');
    } catch {
      onMessage?.('Could not copy automatically. Open Family / heirs in Settings to share PINs.');
    }
    setBusyInvite(false);
  };

  const steps = waiting
    ? []
    : buildWhatsNextSteps({
        settings,
        inventoryCount,
        itemCount,
        heirCount,
        helperCount,
        sceneCount,
        isClosed,
        onOpenSettingsSection,
        onCreateCollection,
        onAddItem,
        onOpenScenes,
        onOpenLedger,
        onLogLocksmith,
        onCopyInvite: copyInvite,
        onOpenClosing,
        onOpenReports,
        needsFamilyUpdate,
        familyUpdateStale,
        locksmithNotNeeded
      });

  const doneBasics =
    Boolean(settings?.letters_issued_at) &&
    Number(inventoryCount) > 0 &&
    Number(heirCount) > 0 &&
    Number(sceneCount) > 0;

  const nowSteps = steps.filter((s) => s.status === 'active');
  const laterSteps = steps.filter((s) => s.status !== 'active');
  const pages = [
    nowSteps.length
      ? {
          id: 'now',
          label: 'Do this now',
          rows: nowSteps,
          blurb: 'Best next move for this estate right now.'
        }
      : null,
    laterSteps.length
      ? {
          id: 'later',
          label: 'Coming up',
          rows: laterSteps,
          blurb: 'Useful soon — after you clear what’s active.'
        }
      : null
  ].filter(Boolean);
  const activePage = pages.find((p) => p.id === page) || pages[0] || null;
  const hasMultiPages = pages.length > 1;
  const pageRows = activePage?.rows || [];
  const safeItemIndex = Math.min(itemIndex, Math.max(0, pageRows.length - 1));
  const activeStep = pageRows[safeItemIndex] || null;
  const hasMultiItems = pageRows.length > 1;

  useEffect(() => {
    if (!open) return;
    setPage(nowSteps.length ? 'now' : 'later');
    setItemIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setItemIndex(0);
  }, [page]);

  if (waiting) {
    return (
      <section className="ei-next-steps ei-next-steps-launch" aria-labelledby="ei-next-steps-title">
        <div className="ei-next-steps-head">
          <h2 id="ei-next-steps-title" className="ei-next-steps-title">
            What&apos;s next
          </h2>
        </div>
        <EstateInlineLoading label="Loading next steps…" />
      </section>
    );
  }

  const selectPage = (id) => {
    setPage(id);
    setItemIndex(0);
  };

  const openModal = () => {
    setPage(nowSteps.length ? 'now' : 'later');
    setItemIndex(0);
    setOpen(true);
  };

  const runAction = (step) => {
    setOpen(false);
    step?.onAction?.();
  };

  const opener = (
    <section className="ei-next-steps ei-next-steps-launch" aria-labelledby="ei-next-steps-title">
      <button
        type="button"
        className="ei-next-steps-open"
        onClick={openModal}
        aria-haspopup="dialog"
      >
        <div className="ei-next-steps-head">
          <h2 id="ei-next-steps-title" className="ei-next-steps-title">
            What&apos;s next
          </h2>
          {steps.length > 0 ? (
            <span className="ei-next-steps-count" aria-label={`${steps.length} suggested`}>
              {steps.length}
            </span>
          ) : null}
        </div>
        {steps.length > 0 ? (
          <ul className="ei-next-steps-cats" aria-hidden="true">
            {steps.map((step) => (
              <li
                key={step.key}
                className={`ei-next-steps-cat${step.status === 'active' ? ' is-active' : ''}`}
              >
                {step.title}
              </li>
            ))}
          </ul>
        ) : (
          <span className="ei-next-steps-open-hint">Tap to review</span>
        )}
      </button>
    </section>
  );

  const modal =
    open && activePage && activeStep ? (
      <EstateModalShell
        title="What's next"
        subtitle={
          doneBasics
            ? 'Core setup looks complete — one suggestion at a time.'
            : 'One step at a time — the list updates as you finish each one.'
        }
        onClose={() => setOpen(false)}
        className="ei-modal-next-steps"
        foot={
          <div className="ei-guide-page-foot">
            {hasMultiItems ? (
              <div className="ei-guide-page-nav" role="navigation" aria-label="Steps in category">
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small"
                  disabled={safeItemIndex <= 0}
                  onClick={() => setItemIndex((n) => Math.max(0, n - 1))}
                >
                  Previous
                </button>
                <span className="ei-guide-page-indicator">
                  {safeItemIndex + 1} / {pageRows.length}
                </span>
                <button
                  type="button"
                  className="ei-btn ei-btn-small"
                  disabled={safeItemIndex >= pageRows.length - 1}
                  onClick={() => setItemIndex((n) => Math.min(pageRows.length - 1, n + 1))}
                >
                  Next step
                </button>
              </div>
            ) : null}
            <button type="button" className="ei-btn ei-btn-secondary" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        }
      >
        {hasMultiPages ? (
          <div className="ei-guide-tabs" role="tablist" aria-label="Next step categories">
            {pages.map((p) => {
              const selected = p.id === activePage.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`ei-guide-tab${selected ? ' is-active' : ''}`}
                  onClick={() => selectPage(p.id)}
                >
                  <span>{p.label}</span>
                  <span className="ei-guide-tab-count">{p.rows.length}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="ei-guide-stack ei-guide-stack--paged" role="tabpanel">
          <section className="ei-guide-group" aria-label={activePage.label}>
            <p className="ei-guide-page-blurb">{activePage.blurb}</p>

            {hasMultiItems ? (
              <div className="ei-guide-dots" aria-hidden="true">
                {pageRows.map((step, i) => (
                  <button
                    key={step.key}
                    type="button"
                    className={`ei-guide-dot${i === safeItemIndex ? ' is-active' : ''}`}
                    aria-label={`Show step ${i + 1}`}
                    onClick={() => setItemIndex(i)}
                  />
                ))}
              </div>
            ) : null}

            <article
              className={`ei-guide-focus ei-guide-card ei-guide-card--next is-featured${
                activeStep.status === 'active' ? ' is-active' : ''
              }`}
            >
              <div className="ei-guide-focus-meta">
                <span
                  className={`ei-guide-card-badge${
                    activeStep.status === 'active' ? ' is-now' : ' is-later'
                  }`}
                >
                  {activeStep.status === 'active' ? 'Do this now' : 'Coming up'}
                </span>
                {hasMultiItems ? (
                  <span className="ei-guide-card-step">
                    {safeItemIndex + 1} of {pageRows.length}
                  </span>
                ) : null}
              </div>
              <h4 className="ei-guide-card-title">{activeStep.title}</h4>
              <p className="ei-guide-card-body">{activeStep.hint}</p>
              {activeStep.onAction || activeStep.dismissLabel ? (
                <div className="ei-guide-card-actions">
                  {activeStep.onAction ? (
                    <button
                      type="button"
                      className="ei-btn ei-guide-card-action"
                      onClick={() => runAction(activeStep)}
                      disabled={busyInvite && activeStep.key === 'invite'}
                    >
                      {activeStep.actionLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          </section>
        </div>
      </EstateModalShell>
    ) : null;

  if (typeof document !== 'undefined' && document.body && modal) {
    return (
      <>
        {opener}
        {createPortal(
          <div className="estate-inventory ei-modal-portal">{modal}</div>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      {opener}
      {modal}
    </>
  );
};

export default EstateNextStepsPanel;
