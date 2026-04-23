function updateTrialStatusInTabs(subscriptionStatus) {
    const isInTrial = subscriptionStatus?.isInTrial === true;
    const isLaunchPeriod = subscriptionStatus?.isLaunchPeriod === true;
    const trialEndDate = subscriptionStatus?.trialEndDate;
    
    // Remove any subscription info or plans that might have been accidentally added to other tabs
    const tabsToClean = ['profile-pane', 'financial-pane', 'sanction-pane'];
    tabsToClean.forEach(tabId => {
        const tabPane = document.getElementById(tabId);
        if (tabPane) {
            const subscriptionInfo = tabPane.querySelector('#subscriptionInfo');
            if (subscriptionInfo) subscriptionInfo.remove();
            const availablePlans = tabPane.querySelector('#availablePlans');
            if (availablePlans) availablePlans.remove();
            const subscriptionCards = tabPane.querySelectorAll('.subscription-plan-header, .card.border-0.shadow-sm');
            subscriptionCards.forEach(card => {
                if (card.querySelector('.subscription-plan-header') || card.textContent.includes('Usage & Limits') || card.textContent.includes('Available Upgrade Plans')) {
                    card.remove();
                }
            });
        }
    });
    
    const hasCash = typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP;
    const hasVenmo = typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO;
    const donationLine = (hasCash || hasVenmo)
        ? `<br><div class="text-center mt-2"><small style="color: #000000 !important;">Support us — scan to donate:</small><br>
           <span class="d-inline-flex align-items-center justify-content-center gap-2 mt-1">
             ${hasCash ? `<a href="https://cash.app/${String(DONATION_CASHAPP).replace(/^\$/, '')}" target="_blank" rel="noopener" title="Cash App ${String(DONATION_CASHAPP)}"><img src="images/cashapp-qr.png" alt="Cash App QR — donate" style="width: 56px; height: 56px; object-fit: contain;" class="rounded"></a>` : ''}
             ${hasVenmo ? `<a href="https://venmo.com/u/${String(DONATION_VENMO).replace(/^@/, '').replace(/^u\/?/i, '')}" target="_blank" rel="noopener" title="Venmo ${String(DONATION_VENMO)}"><img src="images/venmo-qr.png" alt="Venmo QR — donate" style="width: 56px; height: 56px; object-fit: contain;" class="rounded"></a>` : ''}
           </span></div>`
        : '';
    
    let statusHTML = '';
    if (isLaunchPeriod) {
        statusHTML = `
        <div class="trial-status-indicator alert alert-success mt-4 mb-0" style="background-color: #198754 !important; color: #ffffff !important; border-color: #198754 !important;">
            <i class="fas fa-unlock me-2" style="color: #ffffff !important;"></i>
            <strong style="color: #ffffff !important;">All features and limits are unlocked through end of March.</strong>
            <span style="color: #ffffff !important;"> Plan info coming soon.</span>
            <br><small style="color: #ffffff !important; opacity: 0.95;"><a href="#" onclick="switchProfileSettingsTab('subscription-pane'); return false;" style="color: #ffffff !important; text-decoration: underline;">View subscription details</a></small>${donationLine}
        </div>
    `;
    } else if (isInTrial && trialEndDate) {
        const endDate = new Date(trialEndDate);
        const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
        statusHTML = `
        <div class="trial-status-indicator alert alert-info mt-4 mb-0" style="background-color: #0dcaf0 !important; color: #000000 !important; border-color: #0dcaf0 !important;">
            <i class="fas fa-gift me-2" style="color: #000000 !important;"></i>
            <strong style="color: #000000 !important;">30-Day Enterprise Trial Active</strong>
            <span style="color: #000000 !important;">- ${daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Ending soon'}</span>
            <br><small style="color: #000000 !important;">You have unlimited access to all Enterprise features until ${endDate.toLocaleDateString()}. <a href="#" onclick="switchProfileSettingsTab('subscription-pane'); return false;" style="color: #000000 !important; text-decoration: underline;">View subscription details</a></small>${donationLine}
        </div>
    `;
    }
    
    if (!statusHTML) {
        document.querySelectorAll('.trial-status-indicator').forEach(el => el.remove());
        return;
    }
    
    tabsToClean.forEach(tabId => {
        const tabPane = document.getElementById(tabId);
        if (tabPane) {
            const existing = tabPane.querySelector('.trial-status-indicator');
            if (existing) existing.remove();
            tabPane.insertAdjacentHTML('beforeend', statusHTML);
        }
    });
}
