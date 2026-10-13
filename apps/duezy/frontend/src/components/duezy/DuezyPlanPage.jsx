import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useDuezyBilling from '../../hooks/useDuezyBilling.js';
import { finalizeCheckout, getBillingConfig } from '../../services/duezyBillingService.js';
import { TRIAL_DAYS, TRIAL_DIVISIONS } from '../../utils/duezyPricing.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyPlanStatus from './DuezyPlanStatus.jsx';
import DuezyPlanCheckout from './DuezyPlanCheckout.jsx';
import DuezyPlanTiers from './DuezyPlanTiers.jsx';
import DuezyPlanBreakdown from './DuezyPlanBreakdown.jsx';

export default function DuezyPlanPage() {
  const { access, refresh } = useDuezyBilling();
  const [params, setParams] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [interval, setBillingInterval] = useState('month');
  const [notice, setNotice] = useState('');

  useEffect(() => { getBillingConfig().then(setConfig).catch(() => setConfig({ configured: false })); }, []);

  useEffect(() => {
    const outcome = params.get('billing');
    const sessionId = params.get('session_id');
    if (!outcome) return;
    setParams({}, { replace: true });
    if (outcome === 'cancel') { setNotice('No changes made.'); return; }
    if (outcome === 'success' && sessionId) {
      setNotice('Finishing up…');
      finalizeCheckout(sessionId)
        .then(() => setNotice('You’re all set — thanks for subscribing!'))
        .catch(() => setNotice('Payment received. Your plan will show here in a minute.'))
        .finally(refresh);
    } else if (outcome === 'portal') {
      refresh();
    }
  }, [params, setParams, refresh]);

  const used = Math.max(1, Number(access?.divisions_used) || 1);

  return (
    <div className="dz-stack dz-stack--lg dz-plan">
      <Link to={DUEZY_PATH} className="dz-link dz-small">‹ All leagues</Link>
      <header className="dz-center dz-plan-head">
        <span className="dz-eyebrow">Billing</span>
        <h1 className="dz-h1">Simple pricing, by division</h1>
        <p className="dz-muted">
          {TRIAL_DAYS} days free for up to {TRIAL_DIVISIONS} divisions — no card needed.
          Unlimited leagues; you only pay for divisions.
        </p>
      </header>

      {notice ? <p className="dz-notice">{notice}</p> : null}
      <div className="dz-plan-top">
        <DuezyPlanStatus access={access} />
        <DuezyPlanCheckout access={access} config={config} used={used} interval={interval} onInterval={setBillingInterval} />
      </div>
      <DuezyPlanTiers used={used} interval={interval} />
      <DuezyPlanBreakdown />
    </div>
  );
}
