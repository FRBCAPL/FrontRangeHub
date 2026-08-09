import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { leaveCurrentEstateDestination } from '@shared/services/estateVaultSession.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  estateitCasePath,
  estateitPortalHomePath,
  formatEstateDisplayDate
} from '@shared/utils/estateInventoryConstants.js';
import { mapEstatePortalClosedError } from '@shared/utils/estatePortalClosedCopy.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import EstateBillingLockedGate from './EstateBillingLockedGate';
import FamilyUpdatePreviewModal from './FamilyUpdatePreviewModal';
import EstateReportPreviewModal from './EstateReportPreviewModal';
import EstateModalShell from './EstateModalShell';
import {
  EstateAuthPinInput,
  EstateAutofillTrap
} from './EstateAuthField';
import AdvisorChangePasswordModal from './AdvisorChangePasswordModal';
import './EstateInventoryApp.css';

const ADVISOR_ROLE_GUIDE = {
  title: 'Advisor (read-only) guide',
  summary:
    'Invited counsel or CPA: view published Family Updates, estate overview, and formal accounting. No inventory or ledger edits.',
  steps: [
    {
      heading: '1. Sign in with your invite PIN',
      body: 'Use the invite PIN the Personal Representative shared from Settings → Contacts. On first sign-in you will set your own password for next time.'
    },
    {
      heading: '2. Review Family Updates',
      body: 'Open published beneficiary reports the Personal Representative shared — download PDF/HTML for your file.'
    },
    {
      heading: '3. Overview and formal accounting',
      body: 'Use Estate overview for inventory and financial snapshot figures, and Formal accounting for a supporting schedule preview. These are not court e-filings.'
    }
  ],
  notes: 'If you lose your password, ask the Personal Representative for a new invite PIN.'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildAdvisorFormalHtml(pack) {
  const finance = pack?.finance || {};
  const summary = finance.success === false ? {} : finance;
  const rows = [
    ['Account assets', summary.account_assets_total],
    ['Funds available', summary.funds_available],
    ['Gross assets', summary.gross_assets],
    ['Account debts', summary.account_debts_total],
    ['Expenses', summary.expenses_total],
    ['PR advances / loans', summary.pr_loans_total],
    ['Total liabilities', summary.total_liabilities],
    ['Estate balance', summary.estate_balance],
    ['Paid sale proceeds', summary.paid_auction_sales],
    ['Outstanding bids', summary.outstanding_bids]
  ];
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label)}</td><td style="text-align:right">${escapeHtml(
          formatMoney(value)
        )}</td></tr>`
    )
    .join('');
  const estate = escapeHtml(pack?.estate_name || pack?.case_number || 'Estate');
  const caseLabel = escapeHtml(pack?.court_case_number || pack?.case_number || '');
  const when = escapeHtml(
    pack?.generated_at ? formatEstateDisplayDate(pack.generated_at) : new Date().toLocaleString()
  );
  const note = escapeHtml(
    pack?.disclaimer ||
      'Supporting documentation for counsel review. Not a court e-filing and not legal advice.'
  );
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Formal accounting — ${estate}</title>
<style>
  body{font-family:Georgia,serif;margin:2rem;color:#1a1a1a;line-height:1.45}
  h1{font-size:1.4rem;margin:0 0 .35rem}
  .meta{color:#555;margin:0 0 1.25rem;font-size:.95rem}
  table{width:100%;border-collapse:collapse;max-width:28rem}
  td{padding:.4rem .2rem;border-bottom:1px solid #ddd}
  .note{margin-top:1.5rem;font-size:.9rem;color:#444;max-width:36rem}
</style></head><body>
<h1>Formal accounting (supporting)</h1>
<p class="meta">${estate}${caseLabel ? ` · ${caseLabel}` : ''} · Generated ${when}</p>
<table><tbody>${body}</tbody></table>
<p class="note">${note}</p>
</body></html>`;
}

/**
 * Read-only Advisor portal for invited contacts (attorney, CPA, etc.).
 */
const AdvisorPortal = () => {
  const navigate = useNavigate();
  const { caseNumber } = useEstateCase();
  const caseHome = estateitCasePath(caseNumber);
  const advisorHome = estateitPortalHomePath(caseNumber, 'advisor');
  const [session, setSession] = useState(() =>
    estateInventoryService.getStoredAdvisorSession(caseNumber)
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null); // updates | overview | formal
  const [updates, setUpdates] = useState([]);
  const [activeUpdate, setActiveUpdate] = useState(null);
  const [overview, setOverview] = useState(null);
  const [formalPreview, setFormalPreview] = useState(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showWhatIsVault, setShowWhatIsVault] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(() =>
    Boolean(estateInventoryService.getStoredAdvisorSession(caseNumber)?.must_change_password)
  );
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    estateInventoryService.setActiveEstateCase(caseNumber);
    const stored = estateInventoryService.getStoredAdvisorSession(caseNumber);
    setSession(stored);
    setMustChangePassword(Boolean(stored?.must_change_password));
  }, [caseNumber]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    estateInventoryService.setActiveEstateCase(caseNumber);
    const result = await estateInventoryService.loginWithEstateAccessCode({
      caseNumber,
      code: password
    });
    setBusy(false);
    if (!result.success || result.data?.role !== 'advisor') {
      setError(
        result.data?.role && result.data.role !== 'advisor'
          ? 'That code belongs to another role. Use the matching portal, or ask the PR for your advisor invite PIN.'
          : mapEstatePortalClosedError(result.error, 'advisor') ||
              result.error ||
              'Could not sign in.'
      );
      return;
    }
    const next = estateInventoryService.getStoredAdvisorSession(caseNumber) || result.data;
    setSession(next);
    setMustChangePassword(Boolean(next?.must_change_password));
    setPassword('');
  };

  const handleLogout = async () => {
    estateInventoryService.clearAdvisorSession();
    setSession(null);
    setPanel(null);
    setUpdates([]);
    setOverview(null);
    setFormalPreview(null);
    const path = await leaveCurrentEstateDestination();
    navigate(path);
  };

  const openUpdates = async () => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.advisorListFamilyUpdates(session?.token);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not load Family Updates.');
      if (/expired|sign in/i.test(result.error || '')) {
        estateInventoryService.clearAdvisorSession();
        setSession(null);
      }
      return;
    }
    setUpdates(result.data || []);
    setPanel('updates');
  };

  const openUpdateDetail = async (row) => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.advisorGetFamilyUpdate(row.id, session?.token);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not open that Family Update.');
      return;
    }
    setPanel(null);
    setActiveUpdate(result.data);
  };

  const openOverview = async () => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.advisorGetOverview(session?.token);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not load overview.');
      if (/expired|sign in/i.test(result.error || '')) {
        estateInventoryService.clearAdvisorSession();
        setSession(null);
      }
      return;
    }
    setOverview(result.data);
    setPanel('overview');
  };

  const openFormal = async () => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.advisorGetFormalAccounting(session?.token);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not build formal accounting.');
      if (/expired|sign in/i.test(result.error || '')) {
        estateInventoryService.clearAdvisorSession();
        setSession(null);
      }
      return;
    }
    const pack = result.data || {};
    setFormalPreview({
      title: 'Formal accounting',
      subtitle: `${pack.estate_name || caseNumber} · counsel preview`,
      html: buildAdvisorFormalHtml(pack),
      filenameBase: `formal-accounting-${pack.case_number || caseNumber || 'estate'}`
    });
  };

  const summary = overview?.summary || {};
  const inventory = overview?.inventory || {};

  if (!session) {
    return (
      <EstateBillingLockedGate caseNumber={caseNumber} roleLabel="The advisor portal">
        <div className="estate-inventory ei-portal">
          <EstateNav
            variant="helper"
            roleGuide={ADVISOR_ROLE_GUIDE}
            title="Advisor login"
            crumbs={[
              { label: 'Home', to: advisorHome },
              { label: 'Advisor' }
            ]}
            onOpenWhatsNew={() => setShowWhatsNew(true)}
            onOpenWhatIsVault={() => setShowWhatIsVault(true)}
            onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
            onOpenFaq={() => setShowFaq(true)}
          />
          <p className="ei-lede" style={{ marginBottom: '1rem' }}>
            First visit: sign in with the <strong>invite PIN</strong> from the Personal
            Representative, then set your own password. Later visits: use your personal password.
          </p>
          <form className="ei-portal-card" onSubmit={handleLogin} autoComplete="off">
            <EstateAutofillTrap />
            <div className="ei-field">
              <label htmlFor="adv-case">Case number</label>
              <input
                id="adv-case"
                value={caseNumber}
                readOnly
                tabIndex={-1}
                className="ei-input-readonly"
              />
            </div>
            <div className="ei-field">
              <label htmlFor="adv-pass">Invite PIN or password</label>
              <div className="ei-password-row">
                <EstateAuthPinInput
                  id="adv-pass"
                  name="estate_vault_advisor_pin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  revealed={showPassword}
                  required
                />
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Hide' : 'See PIN'}
                </button>
              </div>
            </div>
            {error ? <div className="ei-error">{error}</div> : null}
            <button type="submit" className="ei-btn" disabled={busy || !password.trim()}>
              {busy ? 'Signing in…' : 'Enter advisor portal'}
            </button>
            <p className="ei-settings-hint" style={{ marginTop: '0.75rem' }}>
              Prefer the home page? Go to{' '}
              <Link to="/estateit/enter">Family · heirs · helpers</Link> and use the same code.
            </p>
          </form>
          <EstateSystemDisclaimer />
          <EstateWhatsNewModal
            role="all"
            open={showWhatsNew}
            onOpenChange={setShowWhatsNew}
          />
          <EstateWhatIsVaultModal open={showWhatIsVault} onClose={() => setShowWhatIsVault(false)} />
          <EstateLegalDisclaimerModal
            open={showLegalDisclaimer}
            onClose={() => setShowLegalDisclaimer(false)}
          />
          <EstateFaqModal open={showFaq} onClose={() => setShowFaq(false)} />
        </div>
      </EstateBillingLockedGate>
    );
  }

  if (session && mustChangePassword) {
    return (
      <EstateBillingLockedGate caseNumber={caseNumber} roleLabel="The advisor portal">
        <div className="estate-inventory ei-portal">
          <EstateNav
            variant="helper"
            roleGuide={ADVISOR_ROLE_GUIDE}
            title="Advisor setup"
            crumbs={[
              { label: 'Home', to: advisorHome },
              { label: 'Advisor' }
            ]}
            onLeaveEstate={handleLogout}
            extraRight={
              <button type="button" className="ei-nav-icon-btn" onClick={handleLogout}>
                Leave estate
              </button>
            }
          />
          <AdvisorChangePasswordModal
            open
            required
            onChanged={() => {
              setMustChangePassword(false);
              setSession(estateInventoryService.getStoredAdvisorSession(caseNumber));
            }}
          />
        </div>
      </EstateBillingLockedGate>
    );
  }

  return (
    <EstateBillingLockedGate caseNumber={caseNumber} roleLabel="The advisor portal">
      <div className="estate-inventory ei-portal">
        <EstateNav
          variant="helper"
          roleGuide={ADVISOR_ROLE_GUIDE}
          title="Advisor"
          crumbs={[
            { label: 'Home', to: advisorHome },
            { label: 'Advisor' }
          ]}
          onLeaveEstate={handleLogout}
          onOpenWhatsNew={() => setShowWhatsNew(true)}
          onOpenWhatIsVault={() => setShowWhatIsVault(true)}
          onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
          onOpenFaq={() => setShowFaq(true)}
          extraRight={
            <>
              <button
                type="button"
                className="ei-nav-icon-btn"
                onClick={() => setShowChangePassword(true)}
              >
                Change password
              </button>
              <button type="button" className="ei-nav-icon-btn" onClick={handleLogout}>
                Leave estate
              </button>
            </>
          }
        />

        <header className="ei-portal-card" style={{ marginBottom: '1rem' }}>
          <p className="ei-eyebrow">Read-only</p>
          <h2 style={{ margin: '0 0 0.35rem' }}>
            {session.display_name || 'Advisor'}
            {session.category ? (
              <span className="ei-settings-hint" style={{ fontWeight: 400 }}>
                {' '}
                · {session.category}
              </span>
            ) : null}
          </h2>
          <p className="ei-settings-hint" style={{ margin: 0 }}>
            View Family Updates, estate overview, and formal accounting. You cannot change inventory
            or ledger entries.
          </p>
        </header>

        {error ? <div className="ei-error">{error}</div> : null}

        <div className="ei-landing-roles" role="navigation" aria-label="Advisor sections">
          <button type="button" className="ei-landing-role" onClick={openUpdates} disabled={busy}>
            <span className="ei-landing-role-eyebrow">Reports</span>
            <span className="ei-landing-role-title">Family Updates</span>
            <span className="ei-landing-role-hint">
              Published beneficiary updates from the Personal Representative.
            </span>
            <span className="ei-landing-role-go" aria-hidden="true">
              Open →
            </span>
          </button>
          <button type="button" className="ei-landing-role" onClick={openOverview} disabled={busy}>
            <span className="ei-landing-role-eyebrow">Summary</span>
            <span className="ei-landing-role-title">Estate overview</span>
            <span className="ei-landing-role-hint">
              Inventory counts and financial snapshot for counsel.
            </span>
            <span className="ei-landing-role-go" aria-hidden="true">
              Open →
            </span>
          </button>
          <button type="button" className="ei-landing-role" onClick={openFormal} disabled={busy}>
            <span className="ei-landing-role-eyebrow">Accounting</span>
            <span className="ei-landing-role-title">Formal accounting</span>
            <span className="ei-landing-role-hint">
              Supporting schedule preview — review with counsel before any filing.
            </span>
            <span className="ei-landing-role-go" aria-hidden="true">
              Preview →
            </span>
          </button>
        </div>

        <EstateSystemDisclaimer />

        {panel === 'updates' ? (
          <EstateModalShell title="Family Updates" onClose={() => setPanel(null)} compact>
            {(updates || []).length === 0 ? (
              <p className="ei-settings-hint">
                No Family Updates have been published yet for this estate.
              </p>
            ) : (
              <ul className="ei-contacts-ul">
                {updates.map((row) => (
                  <li key={row.id} className="ei-contacts-card">
                    <div className="ei-contacts-card-main">
                      <strong>{row.title || `Family Update #${row.update_number}`}</strong>
                      <span className="ei-contacts-card-sub">
                        {row.published_at
                          ? formatEstateDisplayDate(row.published_at)
                          : 'Published'}
                      </span>
                    </div>
                    <div className="ei-contacts-card-actions">
                      <button
                        type="button"
                        className="ei-btn ei-btn-small"
                        onClick={() => openUpdateDetail(row)}
                        disabled={busy}
                      >
                        Open
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </EstateModalShell>
        ) : null}

        {panel === 'overview' && overview ? (
          <EstateModalShell title="Estate overview" onClose={() => setPanel(null)} compact>
            <p className="ei-settings-hint">{overview.note}</p>
            <h4 className="ei-settings-subhead">Inventory</h4>
            <p>
              Total {inventory.total ?? 0} · Active {inventory.active ?? 0} · Distributed{' '}
              {inventory.distributed ?? 0}
            </p>
            <h4 className="ei-settings-subhead">Financial snapshot</h4>
            <dl className="ei-access-pass-list">
              {[
                ['Account assets', summary.account_assets_total],
                ['Funds available', summary.funds_available],
                ['Gross assets', summary.gross_assets],
                ['Debts', summary.account_debts_total],
                ['Expenses', summary.expenses_total],
                ['Estate balance', summary.estate_balance]
              ].map(([label, value]) => (
                <div key={label} className="ei-access-pass-row">
                  <span className="ei-access-pass-label">{label}</span>
                  <code className="ei-access-pass-value">{formatMoney(value)}</code>
                </div>
              ))}
            </dl>
          </EstateModalShell>
        ) : null}

        <FamilyUpdatePreviewModal
          open={Boolean(activeUpdate)}
          pack={activeUpdate}
          title={activeUpdate?.title || 'Family Update'}
          subtitle={
            activeUpdate?.published_at
              ? `Published ${formatEstateDisplayDate(activeUpdate.published_at)}`
              : null
          }
          onClose={() => {
            setActiveUpdate(null);
            setPanel('updates');
          }}
        />

        <EstateReportPreviewModal
          open={Boolean(formalPreview)}
          title={formalPreview?.title}
          subtitle={formalPreview?.subtitle}
          html={formalPreview?.html}
          filenameBase={formalPreview?.filenameBase}
          onClose={() => setFormalPreview(null)}
        />

        <AdvisorChangePasswordModal
          open={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          onChanged={() => {
            setShowChangePassword(false);
            setSession(estateInventoryService.getStoredAdvisorSession(caseNumber));
          }}
        />

        <EstateWhatsNewModal role="all" open={showWhatsNew} onOpenChange={setShowWhatsNew} />
        <EstateWhatIsVaultModal open={showWhatIsVault} onClose={() => setShowWhatIsVault(false)} />
        <EstateLegalDisclaimerModal
          open={showLegalDisclaimer}
          onClose={() => setShowLegalDisclaimer(false)}
        />
        <EstateFaqModal open={showFaq} onClose={() => setShowFaq(false)} />
      </div>
    </EstateBillingLockedGate>
  );
};

export default AdvisorPortal;
