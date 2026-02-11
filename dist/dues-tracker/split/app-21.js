                const secondOrgAmountType = operator.second_organization_amount_type || operator.secondOrganizationAmountType || 'perTeam';
                if (secondOrgAmountType === 'perPlayer' && secondOrgPerPlayerRadio) {
                    secondOrgPerPlayerRadio.checked = true;
                } else if (secondOrgPerTeamRadio) {
                    secondOrgPerTeamRadio.checked = true;
                }
                
                // Sanction fee fields
                const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
                const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
                const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
                if (sanctionFeeNameEl) sanctionFeeNameEl.value = operator.sanction_fee_name || 'Sanction Fee';
                if (sanctionFeeAmountEl) sanctionFeeAmountEl.value = operator.sanction_fee_amount || 25.00;
                if (sanctionFeePayoutAmountEl) sanctionFeePayoutAmountEl.value = operator.sanction_fee_payout_amount || 20.00;
                
                console.log('✅ All fields re-populated');
            }
        }, 200);
    } catch (error) {
        console.error('Error loading profile:', error);
        // Still show modal, but with current data if available
        console.log('Showing profile modal despite error');
        
        // Setup tab listeners
        try {
            if (typeof setupProfileSettingsTabListeners === 'function') {
                setupProfileSettingsTabListeners();
            }
            if (typeof switchProfileSettingsTab === 'function') {
                switchProfileSettingsTab('profile-pane');
            }
        } catch (e) {
            console.warn('Error setting up profile modal listeners in catch block:', e);
        }
        
        showModal(modalElement);
        
        // Setup tab listeners after modal is shown
        setTimeout(() => {
            if (typeof setupProfileSettingsTabListeners === 'function') {
                setupProfileSettingsTabListeners();
            }
        }, 100);
        if (currentOperator) {
            document.getElementById('profileName').value = currentOperator.name || '';
            document.getElementById('profileEmail').value = currentOperator.email || '';
            document.getElementById('profileOrganizationName').value = currentOperator.organization_name || '';
            document.getElementById('profilePhone').value = currentOperator.phone || '';
            
            const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
            const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
            const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
            if (sanctionFeeNameEl) sanctionFeeNameEl.value = currentOperator.sanction_fee_name || 'Sanction Fee';
            if (sanctionFeeAmountEl) sanctionFeeAmountEl.value = currentOperator.sanction_fee_amount || 25.00;
            if (sanctionFeePayoutAmountEl) sanctionFeePayoutAmountEl.value = currentOperator.sanction_fee_payout_amount || 20.00;
            updateSanctionFeeProfitDisplay();
        }
        // Load subscription information (with fallback, don't wait)
        loadSubscriptionInfo({ operator: currentOperator }).catch(err => {
            console.error('Failed to load subscription info in background:', err);
        });
        
        // Check export access after profile is loaded
        checkExportAccess();
        
        _profileModalData = { operator: currentOperator };
        // Ensure listeners are set up (will no-op if already done)
        setupProfileSettingsTabListeners();
        switchProfileSettingsTab('profile-pane');
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('profileModal'));
        modal.show();
    }
}

function setupProfileSettingsTabListeners() {
    if (_profileTabListenersSetup) return;
    const tabList = document.getElementById('profileTabs');
    if (!tabList) {
        console.error('profileTabs not found');
        return;
    }
    _profileTabListenersSetup = true;

    const map = {
        'profile-tab': 'profile-pane',
        'sanction-tab': 'sanction-pane',
        'financial-tab': 'financial-pane',
        'subscription-tab': 'subscription-pane'
    };

    const buttons = tabList.querySelectorAll('[role="tab"]');
    if (buttons.length === 0) return;
    
    buttons.forEach(btn => {
        if (!btn.id) return;
        console.log('Setting up tab listener for:', btn.id);
        // Remove any existing Bootstrap tab data attributes that might interfere
        btn.removeAttribute('data-bs-toggle');
        btn.removeAttribute('data-bs-target');
        // Remove any existing click handlers by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const updatedBtn = document.getElementById(btn.id);
        if (updatedBtn) {
            updatedBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Tab clicked:', this.id);
                const paneId = map[this.id];
                console.log('Switching to pane:', paneId);
                if (paneId) {
                    switchProfileSettingsTab(paneId);
                } else {
                    console.warn('No pane mapping found for tab:', this.id);
                }
            });
        }
    });
    console.log('Tab listeners setup complete');
}

// Load and display subscription information
// Function to add/update trial or launch-period status indicator in other tabs
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
            <strong style="color: #ffffff !important;">All features and limits are unlocked.</strong>
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

async function loadSubscriptionInfo(profileData) {
    const subscriptionInfoDiv = document.getElementById('subscriptionInfo');
    if (!subscriptionInfoDiv) return;
    
    // Ensure subscription info is only in the subscription-pane
    const subscriptionPane = document.getElementById('subscription-pane');
    if (!subscriptionPane || !subscriptionPane.contains(subscriptionInfoDiv)) {
        console.error('⚠️ subscriptionInfo div is not in subscription-pane! Moving it...');
        // If it's in the wrong place, move it to the subscription pane
        if (subscriptionPane && subscriptionInfoDiv.parentElement !== subscriptionPane) {
            subscriptionPane.appendChild(subscriptionInfoDiv);
        }
    }
    
    // Preserve existing plans HTML if it exists and has content (not just loading spinner)
    const existingPlansDiv = document.getElementById('availablePlans');
    let preservedPlansHTML = null;
    if (existingPlansDiv && existingPlansDiv.innerHTML) {
        const htmlLength = existingPlansDiv.innerHTML.length;
        const hasSpinner = existingPlansDiv.innerHTML.includes('spinner-border');
        const hasPlansContent = existingPlansDiv.innerHTML.includes('Available Upgrade Plans') || 
                               existingPlansDiv.innerHTML.includes('Upgrade to');
        
        // Only preserve if it's actual content (has plans or is substantial content, not just a loading spinner)
        if (hasPlansContent || (htmlLength > 1000 && !hasSpinner)) {
            preservedPlansHTML = existingPlansDiv.innerHTML;
            console.log('💾 Preserving existing plans HTML, length:', preservedPlansHTML.length, 'hasPlansContent:', hasPlansContent);
        } else {
            console.log('⏭️ Not preserving - HTML length:', htmlLength, 'hasSpinner:', hasSpinner, 'hasPlansContent:', hasPlansContent);
        }
    }
    
    try {
        // Get subscription plan and usage from profile endpoint
        const response = await apiCall('/profile');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Failed to load subscription info:', errorData);
            throw new Error(errorData.message || 'Failed to load subscription info');
        }
        
        const data = await response.json();
        console.log('Subscription data received:', data);
        
        // Handle case where endpoint returns operator directly or in nested structure
        const operator = data.operator || currentOperator;
        const plan = data.subscriptionPlan || { tier: 'free', name: 'Basic', description: '2 divisions, up to 32 teams (16 per division), 8 players per team' };
        const usage = data.usage || { divisions: 0, teams: 0, teamMembers: 0 };
        const limits = data.limits || { divisions: null, teams: null, teamMembers: null };
        const subscriptionStatus = data.subscriptionStatus || {};
        
        // Format limits display
        const formatLimit = (value) => value === null ? 'Unlimited' : value;
        const formatUsage = (used, limit) => {
            if (limit === null) return { text: `${used} / Unlimited`, percentage: 0, colorClass: 'text-success' };
            const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
            const colorClass = percentage >= 90 ? 'text-danger' : percentage >= 70 ? 'text-warning' : 'text-success';
            return { text: `${used} / ${limit}`, percentage, colorClass };
        };
        
        const divisionsUsage = formatUsage(usage.divisions || 0, limits.divisions);
        const teamsUsage = formatUsage(usage.teams || 0, limits.teams);
        const membersUsage = formatUsage(usage.teamMembers || 0, limits.teamMembers);
        
        // Build division breakdown text
        const divisionBreakdown = usage.divisionsBreakdown || {};
        const totalDivisions = (divisionBreakdown.regular || 0) + (divisionBreakdown.doublePlay || 0);
        const divisionBreakdownText = totalDivisions > 0 
          ? `${totalDivisions} total (${divisionBreakdown.regular || 0} regular, ${divisionBreakdown.doublePlay || 0} double play)`
          : '0 divisions';
        
        // Check for trial and launch period
        const isInTrial = subscriptionStatus.isInTrial === true;
        const isLaunchPeriod = subscriptionStatus.isLaunchPeriod === true;
        const effectiveTier = subscriptionStatus.effectiveTier || plan.tier || 'free';
        const trialEndDate = subscriptionStatus.trialEndDate;
        
        // Update trial/launch status indicator in other tabs
        updateTrialStatusInTabs(subscriptionStatus);
        
        // Check export access after subscription info is loaded
        checkExportAccess();
        
        console.log('Subscription status:', {
            isInTrial,
            isLaunchPeriod,
            effectiveTier,
            actualTier: subscriptionStatus.tier || plan.tier,
            planTier: plan.tier
        });
        
        // Build subscription info HTML
        const planBadgeColor = effectiveTier === 'free' ? 'secondary' : 
                              effectiveTier === 'basic' ? 'primary' : 
                              effectiveTier === 'pro' ? 'warning' : 'success';
        
        // Get background color for header (Bootstrap colors)
        const bgColorMap = {
            'secondary': '#6c757d',
            'primary': '#0d6efd',
            'warning': '#ffc107',
            'success': '#198754'
        };
        const headerBgColor = bgColorMap[planBadgeColor] || '#6c757d';
        const headerTextColor = planBadgeColor === 'warning' ? '#000000' : '#ffffff'; // Warning is yellow, needs dark text
        
        // Format trial end date (not shown during launch period)
        let trialInfo = '';
        if (!isLaunchPeriod && isInTrial && trialEndDate) {
            const endDate = new Date(trialEndDate);
            const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
            trialInfo = `
                <div class="alert alert-info mb-0 mt-2" style="background-color: #0dcaf0 !important; color: #000000 !important; border-color: #0dcaf0 !important;">
                    <i class="fas fa-gift me-2" style="color: #000000 !important;"></i>
                    <strong style="color: #000000 !important;">30-Day Enterprise Trial Active!</strong>
                    <span style="color: #000000 !important;">${daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Ending soon'}</span>
                    <br><small style="color: #000000 !important;">You have unlimited access to all Enterprise features until ${endDate.toLocaleDateString()}</small>
                </div>
            `;
        }
        
        const planIcon = isLaunchPeriod ? 'unlock' : (isInTrial ? 'gift' : 'crown');
        const planTitle = isLaunchPeriod ? (plan.name || 'Launch period') : (isInTrial ? 'Enterprise (Trial)' : (plan.name || 'Basic'));
        const planSubtitle = isLaunchPeriod ? (plan.description || 'All features and limits unlocked. Plan info coming soon.') : (isInTrial ? 'Unlimited access during 30-day trial' : (effectiveTier === 'free' ? 'Free plan: ' : '') + (plan.description || '2 divisions, up to 32 teams (16 per division), 8 players per team'));
        const extraBadge = isLaunchPeriod ? '<span class="badge fs-6" style="background-color: #198754 !important; color: #fff !important;">LAUNCH</span>' : (isInTrial ? '<span class="badge fs-6" style="background-color: #0dcaf0 !important; color: #000000 !important;">TRIAL</span>' : '');
        
        const subscriptionHTML = `
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header subscription-plan-header" style="background-color: ${headerBgColor} !important; border-color: ${headerBgColor} !important;">
                    <div class="d-flex justify-content-between align-items-center" style="color: ${headerTextColor} !important;">
                        <div>
                            <h5 class="mb-0" style="color: ${headerTextColor} !important; font-weight: 600;">
                                <i class="fas fa-${planIcon} me-2" style="color: ${headerTextColor} !important;"></i>
                                ${isLaunchPeriod ? planTitle : (planTitle + (planTitle.toLowerCase().includes('plan') ? '' : ' Plan'))}
                            </h5>
                            <small style="color: ${headerTextColor} !important; display: block; margin-top: 4px; font-weight: 500; opacity: 1 !important;">${planSubtitle}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${extraBadge}
                            <span class="badge fs-6" style="background-color: #f8f9fa !important; color: #212529 !important;">${effectiveTier.toUpperCase()}</span>
                        </div>
                    </div>
                    ${trialInfo}
                </div>
                <div class="card-body">
                    <h6 class="mb-4">Usage & Limits</h6>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-sitemap text-primary me-2"></i>
                                            <strong>Divisions</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${divisionsUsage.colorClass}">${divisionsUsage.text}</span>
                                        ${divisionsUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${divisionsUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.divisions)}</small>
                                    ${totalDivisions > 0 ? `<br><small style="color: #adb5bd !important;"><i class="fas fa-info-circle me-1"></i>${divisionBreakdownText}<br><em>Double play = 2 slots</em></small>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-users text-success me-2"></i>
                                            <strong>Teams</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${teamsUsage.colorClass}">${teamsUsage.text}</span>
                                        ${teamsUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${teamsUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.teams)}</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-user-friends text-info me-2"></i>
                                            <strong>Players</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${membersUsage.colorClass}">${membersUsage.text}</span>
                                        ${membersUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${membersUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.teamMembers)}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${isLaunchPeriod ? `
                        <div class="alert alert-success mt-4 mb-3">
                            <i class="fas fa-unlock me-2"></i>
                            <strong>All features and limits are unlocked.</strong> Plan info coming soon.
                        </div>
                        ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) || (typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                        <div class="alert alert-secondary mt-3 mb-3 text-center">
                            <strong>Love the app?</strong> Support us with a donation — scan to donate or use the links below.
                            <div class="row g-3 mt-2 align-items-start justify-content-center">
                                ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) ? `
                                <div class="col-auto">
                                    <div class="text-center">
                                        <img src="images/cashapp-qr.png" alt="Cash App QR — donate ${String(DONATION_CASHAPP)}" class="rounded" style="width: 140px; height: 140px; object-fit: contain;">
                                        <div class="small mt-1 fw-semibold">${String(DONATION_CASHAPP)}</div>
                                        <a class="btn btn-sm btn-success mt-1" href="https://cash.app/${String(DONATION_CASHAPP).replace(/^\$/, '')}" target="_blank" rel="noopener"><i class="fas fa-dollar-sign me-1"></i>Cash App</a>
                                    </div>
                                </div>
                                ` : ''}
                                ${(typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                                <div class="col-auto">
                                    <div class="text-center">
                                        <img src="images/venmo-qr.png" alt="Venmo QR — donate ${String(DONATION_VENMO)}" class="rounded" style="width: 140px; height: 140px; object-fit: contain;">
                                        <div class="small mt-1 fw-semibold">${String(DONATION_VENMO)}</div>
                                        <a class="btn btn-sm btn-primary mt-1" href="https://venmo.com/u/${String(DONATION_VENMO).replace(/^@/, '').replace(/^u\/?/i, '')}" target="_blank" rel="noopener">Venmo</a>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading upgrade options...</p>
                            </div>
                        </div>
                    ` : effectiveTier === 'enterprise' && !isInTrial ? `
                        <div class="alert alert-success mt-4 mb-0">
                            <i class="fas fa-crown me-2"></i>
                            <strong>Enterprise Plan</strong> - You're on the highest tier with all features unlocked!
                        </div>
                    ` : effectiveTier === 'enterprise' && isInTrial ? `
                        <div class="alert alert-info mt-4 mb-3">
                            <i class="fas fa-gift me-2"></i>
                            <strong>Trial Active</strong> - Upgrade now to keep Enterprise features after your trial ends!
                        </div>
                        ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) || (typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                        <div class="alert alert-secondary mt-3 mb-3 text-center">
                            <strong>Love the app?</strong> Support us with a donation during your trial — scan to donate or use the links below.
                            <div class="row g-3 mt-2 align-items-start justify-content-center">
                                ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) ? `
                                <div class="col-auto">
                                    <div class="text-center">
                                        <img src="images/cashapp-qr.png" alt="Cash App QR — donate ${String(DONATION_CASHAPP)}" class="rounded" style="width: 140px; height: 140px; object-fit: contain;">
                                        <div class="small mt-1 fw-semibold">${String(DONATION_CASHAPP)}</div>
                                        <a class="btn btn-sm btn-success mt-1" href="https://cash.app/${String(DONATION_CASHAPP).replace(/^\$/, '')}" target="_blank" rel="noopener"><i class="fas fa-dollar-sign me-1"></i>Cash App</a>
                                    </div>
                                </div>
                                ` : ''}
                                ${(typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                                <div class="col-auto">
                                    <div class="text-center">
                                        <img src="images/venmo-qr.png" alt="Venmo QR — donate ${String(DONATION_VENMO)}" class="rounded" style="width: 140px; height: 140px; object-fit: contain;">
                                        <div class="small mt-1 fw-semibold">${String(DONATION_VENMO)}</div>
                                        <a class="btn btn-sm btn-primary mt-1" href="https://venmo.com/u/${String(DONATION_VENMO).replace(/^@/, '').replace(/^u\/?/i, '')}" target="_blank" rel="noopener">Venmo</a>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading upgrade options...</p>
                            </div>
                        </div>
                    ` : subscriptionStatus.tier === 'free' ? `
                        <div class="alert alert-warning mt-4 mb-3 d-flex align-items-center">
                            <i class="fas fa-rocket fa-2x me-3"></i>
                            <div>
                                <strong>Free Basic Plan</strong>
                                <p class="mb-1">You're on the free Basic plan: <strong>2 divisions</strong>, up to <strong>32 teams</strong> (16 per division), <strong>8 players per team</strong>.</p>
                                <p class="mb-0">Upgrade to unlock more features and higher limits!</p>
                            </div>
                        </div>
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading available plans...</p>
                            </div>
                        </div>
                    ` : `
                        <div class="alert alert-success mt-4 mb-3">
                            <i class="fas fa-check-circle me-2"></i>
                            <strong>Active Subscription</strong> - You have full access to all features in your plan.
                            ${operator.current_period_end ? `
                                <br><small class="mt-2 d-block">
                                    <i class="fas fa-calendar-alt me-1"></i>
                                    Next billing date: ${new Date(operator.current_period_end).toLocaleDateString()}
                                </small>
                            ` : ''}
                        </div>
                        ${operator.square_subscription_id ? `
                            <div class="mb-3">
                                <button class="btn btn-outline-danger btn-sm" onclick="cancelSubscription()" id="cancelSubscriptionBtn">
                                    <i class="fas fa-times-circle me-2"></i>Cancel Subscription
                                </button>
                                <small class="text-muted d-block mt-2">
                                    Your access will continue until ${operator.current_period_end ? new Date(operator.current_period_end).toLocaleDateString() : 'the end of your billing period'}.
                                </small>
                            </div>
                        ` : ''}
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading upgrade options...</p>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        // CRITICAL: Ensure subscription info is ONLY in subscription-pane before setting HTML
        const subscriptionPane = document.getElementById('subscription-pane');
        if (!subscriptionPane || !subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfo is not in subscription-pane! Moving it...');
            if (subscriptionPane) {
                // Remove from wherever it is
                if (subscriptionInfoDiv.parentElement) {
                    subscriptionInfoDiv.parentElement.removeChild(subscriptionInfoDiv);
                }
                // Add to subscription pane
                subscriptionPane.appendChild(subscriptionInfoDiv);
            }
        }
        
        // Remove any duplicate subscription info from other tabs BEFORE setting new content
        const allTabs = ['profile-pane', 'financial-pane', 'sanction-pane'];
        allTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) {
                // Remove any subscriptionInfo divs (shouldn't exist, but just in case)
                const duplicateSubscriptionInfo = tab.querySelector('#subscriptionInfo');
                if (duplicateSubscriptionInfo && duplicateSubscriptionInfo !== subscriptionInfoDiv) {
                    console.warn(`⚠️ Removing duplicate subscriptionInfo from ${tabId}`);
                    duplicateSubscriptionInfo.remove();
                }
                // Remove any availablePlans divs
                const duplicatePlans = tab.querySelector('#availablePlans');
                if (duplicatePlans) {
                    console.warn(`⚠️ Removing duplicate availablePlans from ${tabId}`);
                    duplicatePlans.remove();
                }
                // Remove subscription cards
                const subscriptionCards = tab.querySelectorAll('.card.border-0.shadow-sm');
                subscriptionCards.forEach(card => {
                    if (card.querySelector('.subscription-plan-header') || 
                        card.textContent.includes('Usage & Limits') || 
                        card.textContent.includes('Available Upgrade Plans')) {
                        console.warn(`⚠️ Removing subscription card from ${tabId}`);
                        card.remove();
                    }
                });
            }
        });
        
        // CRITICAL: Ensure subscriptionInfoDiv is ONLY in subscription-pane
        // First, remove it from anywhere else it might be
        if (subscriptionInfoDiv.parentElement && subscriptionInfoDiv.parentElement.id !== 'subscription-pane') {
            console.error('⚠️ subscriptionInfoDiv is in wrong parent! Moving it...');
            subscriptionInfoDiv.remove();
        }
        
        // Now ensure it's in subscription-pane
        if (!subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfoDiv is NOT in subscription-pane! Moving it...');
            if (subscriptionInfoDiv.parentElement) {
                subscriptionInfoDiv.parentElement.removeChild(subscriptionInfoDiv);
            }
            subscriptionPane.appendChild(subscriptionInfoDiv);
        }
        
        // BEFORE setting HTML, remove ALL subscription content from other tabs (but NOT from subscription-pane)
        cleanSubscriptionContentFromOtherTabs();
        
        // ALWAYS set the subscription HTML in subscription-pane (regardless of which tab is active)
        // Bootstrap tabs will hide it if subscription tab is not active
        subscriptionInfoDiv.innerHTML = subscriptionHTML;
        console.log('✅ Subscription HTML set in subscription-pane, length:', subscriptionHTML.length);
        console.log('✅ subscriptionInfoDiv parent:', subscriptionInfoDiv.parentElement?.id);
        console.log('✅ subscriptionPane contains subscriptionInfoDiv:', subscriptionPane.contains(subscriptionInfoDiv));
        
        // Verify it's still in the right place after setting HTML
        if (!subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfoDiv moved after setting HTML! Moving back...');
            subscriptionInfoDiv.remove();
            subscriptionPane.appendChild(subscriptionInfoDiv);
            // Re-set HTML since we moved it
            subscriptionInfoDiv.innerHTML = subscriptionHTML;
        }
        
        // DON'T store as pending - only set when subscription tab is active
        // window._pendingSubscriptionHTML = subscriptionHTML;
        window._pendingSubscriptionStatus = subscriptionStatus;
        
        // IMMEDIATELY clean up any subscription content from other tabs again (double-check)
        // But make sure we don't remove from subscription-pane
        setTimeout(() => {
            cleanSubscriptionContentFromOtherTabs();
            // Also verify availablePlans is in the right place
            const plansDiv = document.getElementById('availablePlans');
            if (plansDiv) {
                if (!subscriptionPane.contains(plansDiv)) {
                    console.error('⚠️ availablePlans is in wrong place! Moving to subscription-pane...');
                    plansDiv.remove();
                    subscriptionInfoDiv.appendChild(plansDiv);
                }
            }
            // Final verification that subscription content is visible in subscription-pane
            const finalCheck = document.getElementById('subscriptionInfo');
            if (finalCheck && subscriptionPane.contains(finalCheck)) {
                console.log('✅ Final check: subscriptionInfo is in subscription-pane, content length:', finalCheck.innerHTML.length);
            } else {
                console.error('❌ Final check FAILED: subscriptionInfo is NOT in subscription-pane!');
            }
        }, 100);
        
        // Update trial status in other tabs (only if in trial mode)
        updateTrialStatusInTabs(subscriptionStatus);
        
        // Verify the availablePlans div was created
        const verifyPlansDiv = document.getElementById('availablePlans');
        console.log('availablePlans div exists after setting HTML:', !!verifyPlansDiv);
        
        // Final verification: ensure plans div is ONLY in subscription-pane
        if (verifyPlansDiv) {
            const plansParent = verifyPlansDiv.closest('.tab-pane');
            if (plansParent && plansParent.id !== 'subscription-pane') {
                console.error('⚠️ availablePlans is in wrong tab! Moving to subscription-pane...');
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(verifyPlansDiv);
                }
            }
        }
        
        // If we preserved plans HTML, restore it now
        if (preservedPlansHTML && verifyPlansDiv) {
            console.log('🔄 Restoring preserved plans HTML, length:', preservedPlansHTML.length);
            
            // Force a re-render by toggling display (helps with Bootstrap tab visibility)
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane) {
                // Ensure the tab pane is visible (Bootstrap 5 uses 'show' and 'active' classes)
                subscriptionPane.classList.add('show', 'active');
                // Also ensure it's not hidden
                subscriptionPane.style.display = '';
                console.log('✅ Subscription pane classes:', subscriptionPane.className);
                console.log('✅ Subscription pane display:', window.getComputedStyle(subscriptionPane).display);
            }
            
            // Restore the HTML
            verifyPlansDiv.innerHTML = preservedPlansHTML;
            console.log('✅ Plans HTML restored, length:', verifyPlansDiv.innerHTML.length);
            
            // Force a reflow to ensure rendering
            verifyPlansDiv.offsetHeight;
            
            // Verify the plans are actually visible
            setTimeout(() => {
                const restoredDiv = document.getElementById('availablePlans');
                if (restoredDiv) {
                    console.log('✅ Verification - restored div innerHTML length:', restoredDiv.innerHTML.length);
                    console.log('✅ Verification - div is visible:', restoredDiv.offsetParent !== null);
                    console.log('✅ Verification - subscription pane is visible:', subscriptionPane?.offsetParent !== null);
                    console.log('✅ Verification - subscription pane display:', subscriptionPane ? window.getComputedStyle(subscriptionPane).display : 'N/A');
                    
                    // If still not visible, try to force it
                    if (restoredDiv.offsetParent === null && subscriptionPane) {
                        console.log('⚠️ Plans div not visible, forcing visibility...');
                        subscriptionPane.style.display = 'block';
                        subscriptionPane.style.visibility = 'visible';
                        subscriptionPane.style.opacity = '1';
                    }
                }
            }, 100);
            
            // Don't reload plans if we restored them
            return; // Exit early since plans are already loaded
        } else {
            // Load available plans (always show plans except for actual paid enterprise users)
            // For trial users (isInTrial = true), we still want to show plans so they can upgrade
            const actualTier = subscriptionStatus.tier || plan.tier || 'free'; // Their actual subscription tier (not trial)
            const shouldShowPlans = !isInTrial || actualTier !== 'enterprise'; // Show plans if in trial OR not on enterprise
            
            console.log('Subscription plan loading logic:', {
                actualTier,
                isInTrial,
                shouldShowPlans,
                effectiveTier,
                subscriptionStatus,
                plan,
                hasPlansDiv: !!verifyPlansDiv,
                preservedPlans: !!preservedPlansHTML
            });
            
            // Always try to load plans if not on enterprise (including trial users)
            // For free tier users (including those in trial), show upgrade plans
            if (actualTier !== 'enterprise' || isInTrial) {
                console.log('📦 Loading subscription plans for tier:', actualTier, 'isInTrial:', isInTrial);
                
                // Use a more reliable approach: wait for the div to exist, then load plans
                const loadPlansWhenReady = async () => {
                    let attempts = 0;
                    const maxAttempts = 15; // Increased attempts
                    
                    while (attempts < maxAttempts) {
                        // Make sure we're looking in the subscription-pane
                        const subscriptionPane = document.getElementById('subscription-pane');
                        const plansDiv = subscriptionPane ? subscriptionPane.querySelector('#availablePlans') : document.getElementById('availablePlans');
                        
                        if (plansDiv && subscriptionPane && subscriptionPane.contains(plansDiv)) {
                            console.log(`✅ Found availablePlans div in subscription-pane on attempt ${attempts + 1}`);
                            try {
                                await loadAvailablePlans(actualTier);
                                return; // Success, exit
                            } catch (err) {
                                console.error('❌ Error in loadAvailablePlans:', err);
                                return;
                            }
                        }
                        attempts++;
                        if (attempts % 3 === 0) {
                            console.log(`⏳ Waiting for availablePlans div in subscription-pane (attempt ${attempts}/${maxAttempts})...`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    
                    console.error('❌ availablePlans div not found in subscription-pane after', maxAttempts, 'attempts');
                    // Try one more time with loadAvailablePlans which has its own retry logic
                    try {
                        await loadAvailablePlans(actualTier);
                    } catch (err) {
                        console.error('❌ Final attempt to load plans failed:', err);
                    }
                };
                
                // Start loading plans after a short delay to ensure DOM is updated
                setTimeout(loadPlansWhenReady, 200);
            } else {
                console.log('⏭️ Skipping plan load - user is on enterprise tier and not in trial');
            }
        }
        
    } catch (error) {
        console.error('Error loading subscription info:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            profileData: profileData,
            hasAuthToken: !!authToken
        });
        
        // Show a user-friendly error message
        let errorMessage = error.message || 'Unable to load subscription information';
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = 'Please log in again to view subscription information.';
        } else if (errorMessage.includes('500') || errorMessage.includes('Server error')) {
            errorMessage = 'Server error. Please try again later or contact support.';
        }
        
        subscriptionInfoDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Unable to load subscription information</strong>
                <p class="mb-0 mt-2">${errorMessage}</p>
                <small class="text-muted">If this persists, please refresh the page and try again.</small>
            </div>
        `;
    }
}

// Load and display available subscription plans
async function loadAvailablePlans(currentTier) {
    console.log('loadAvailablePlans called with tier:', currentTier);
    
    // Helper function to find the element with retries
    const findAvailablePlansDiv = async (maxRetries = 10, delay = 200) => {
        for (let i = 0; i < maxRetries; i++) {
            const div = document.getElementById('availablePlans');
            if (div) {
                console.log(`✅ Found availablePlans div on attempt ${i + 1}`);
                // Check if it's actually in the DOM and accessible
                const isInDOM = div.offsetParent !== null || div.closest('#subscription-pane') !== null;
                console.log('Div is in DOM:', isInDOM, 'Parent:', div.parentElement?.id);
                return div;
            }
            if (i < maxRetries - 1) {
                console.log(`⏳ availablePlans div not found, waiting ${delay}ms (attempt ${i + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return null;
    };
    
    // Try to find the element - MUST be in subscription-pane
    const subscriptionPane = document.getElementById('subscription-pane');
    let availablePlansDiv = null;
    
    // First, try to find it in subscription-pane specifically
    if (subscriptionPane) {
        availablePlansDiv = subscriptionPane.querySelector('#availablePlans');
        if (availablePlansDiv) {
            console.log('✅ Found availablePlans in subscription-pane');
        }
    }
    
    // If not found, try the general find function
    if (!availablePlansDiv) {
        availablePlansDiv = await findAvailablePlansDiv();
    }
    
    // If still not found, check if it's in the wrong place
    if (!availablePlansDiv) {
        console.error('❌ availablePlans div not found after all retries');
        console.error('Subscription pane exists:', !!subscriptionPane);
        console.error('Subscription pane visible:', subscriptionPane?.offsetParent !== null);
        console.error('Subscription pane innerHTML length:', subscriptionPane?.innerHTML?.length || 0);
        
        // Try multiple strategies to find it
        if (subscriptionPane) {
            // Strategy 1: Query within subscription pane
            const foundInPane = subscriptionPane.querySelector('#availablePlans');
            console.log('Found in subscription pane query:', !!foundInPane);
            if (foundInPane) {
                availablePlansDiv = foundInPane;
                console.log('✅ Using found element from querySelector');
            } else {
                // Strategy 2: Check subscriptionInfo
                const subscriptionInfo = subscriptionPane.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    const foundInInfo = subscriptionInfo.querySelector('#availablePlans');
                    console.log('Found in subscriptionInfo:', !!foundInInfo);
                    if (foundInInfo) {
                        availablePlansDiv = foundInInfo;
                        console.log('✅ Using found element from subscriptionInfo');
                    } else {
                        // Strategy 3: Check if subscriptionInfo has the HTML but div isn't created yet
                        console.log('SubscriptionInfo innerHTML length:', subscriptionInfo.innerHTML.length);
                        console.log('SubscriptionInfo contains "availablePlans":', subscriptionInfo.innerHTML.includes('availablePlans'));
                        
                        // If subscriptionInfo exists but availablePlans doesn't, the HTML might not have been set yet
                        // Wait a bit more and try again
                        console.log('⏳ Waiting for subscription HTML to be set...');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const retryDiv = document.getElementById('availablePlans');
                        if (retryDiv) {
                            availablePlansDiv = retryDiv;
                            console.log('✅ Found after additional wait');
                        }
                    }
                }
            }
        }
        
        if (!availablePlansDiv) {
            console.error('❌ Still cannot find availablePlans div after all strategies');
            console.error('Available IDs in subscription pane:', Array.from(subscriptionPane?.querySelectorAll('[id]') || []).map(el => el.id));
            return;
        }
    }
    
    console.log('✅ Using availablePlans div:', availablePlansDiv);
    console.log('Div parent:', availablePlansDiv.parentElement?.id || 'none');
    console.log('Div is in DOM:', availablePlansDiv.offsetParent !== null || availablePlansDiv.closest('#subscription-pane') !== null);
    
    // CRITICAL: If div has no parent, it's detached - reattach it
    if (!availablePlansDiv.parentElement) {
        console.error('⚠️ availablePlansDiv has no parent! Reattaching...');
        const subscriptionInfo = subscriptionPane?.querySelector('#subscriptionInfo');
        if (subscriptionInfo) {
            subscriptionInfo.appendChild(availablePlansDiv);
            console.log('✅ Reattached availablePlansDiv to subscriptionInfo');
        } else if (subscriptionPane) {
            subscriptionPane.appendChild(availablePlansDiv);
            console.log('✅ Reattached availablePlansDiv to subscriptionPane');
        }
    }
    
    // Ensure subscription pane is visible
    if (subscriptionPane) {
        subscriptionPane.classList.add('show', 'active');
        subscriptionPane.style.display = 'block';
        subscriptionPane.style.visibility = 'visible';
        console.log('✅ Ensured subscription-pane is visible, classes:', subscriptionPane.className);
    }
    
    // TEMPORARY: Hide subscription plans until launch (USAPL operators try & donate)
    // Set PLANS_HIDE_DAYS = 0 to show plans immediately; plans are not deleted, only hidden.
    const hidePlansEnabled = typeof PLANS_LAUNCH_DATE !== 'undefined' && PLANS_LAUNCH_DATE &&
        typeof PLANS_HIDE_DAYS !== 'undefined' && PLANS_HIDE_DAYS > 0;
    if (hidePlansEnabled) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [y, m, d] = PLANS_LAUNCH_DATE.split('-').map(Number);
        const launchDate = new Date(y, m - 1, d);
        launchDate.setHours(0, 0, 0, 0);
        const shouldHidePlans = today.getTime() < launchDate.getTime();
        if (shouldHidePlans) {
            const msUntilLaunch = launchDate.getTime() - today.getTime();
            const daysRemaining = Math.max(0, Math.ceil(msUntilLaunch / (1000 * 60 * 60 * 24)));
            const launchDateFormatted = launchDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            availablePlansDiv.innerHTML = `
                <div class="alert alert-info text-center py-4 mx-auto" style="max-width: 32rem;">
                    <i class="fas fa-unlock fa-2x mb-3 text-success"></i>
                    <h5 class="mb-2">All Features &amp; Limits Unlocked</h5>
                    <p class="mb-2"><strong>Plan info coming soon.</strong> We're in an early-access period for USAPL operators. Try the app, and donate if you'd like to support us.</p>
                    <p class="mb-0 small text-muted">
                        <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left</strong> until subscription plans are available (${launchDateFormatted}).
                    </p>
                    <p class="mt-3 mb-0 small">
                        <i class="fas fa-heart text-danger me-1"></i>
                        <strong>Love the app?</strong> Use the donation options above during this period.
                    </p>
                </div>
            `;
            console.log(`📅 Plans hidden: ${daysRemaining} days remaining until plans are shown`);
            return;
        }
    }
    
    try {
        console.log('Loading subscription plans for tier:', currentTier);
        const response = await apiCall('/subscription-plans');
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to load subscription plans:', response.status, errorText);
            throw new Error(`Failed to load subscription plans: ${response.status}`);
        }
        
        const plansData = await response.json();
        console.log('Subscription plans response:', plansData);
        
        // Handle both array and object responses
        const plans = Array.isArray(plansData) ? plansData : (plansData.plans || plansData.data || []);
        
        if (!Array.isArray(plans) || plans.length === 0) {
            console.warn('No plans found in response:', plansData);
            availablePlansDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No subscription plans are currently available. Please check back later.
                </div>
            `;
            return;
        }
        
        console.log('Processing plans:', plans);
        
        // Filter out the current tier and free tier, sort by price
        const upgradePlans = plans
            .filter(p => {
                const tier = p.tier || p.subscription_tier;
                const isActive = p.is_active !== false && p.is_active !== 'false';
                return tier !== currentTier && tier !== 'free' && isActive;
            })
            .sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0));
        
        console.log('Upgrade plans after filtering:', upgradePlans);
        console.log('availablePlansDiv element:', availablePlansDiv);
        
        if (upgradePlans.length === 0) {
            console.log('No upgrade plans, showing message');
            availablePlansDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No upgrade plans available at this time.
                </div>
            `;
            return;
        }
        
        // Build plans display
        console.log('Building plans HTML for', upgradePlans.length, 'plans');
        console.log('Plans data:', upgradePlans);
        
        let plansHTML = '';
        try {
            plansHTML = `
                <h6 class="mb-3 mt-4">
                    <i class="fas fa-arrow-up me-2"></i>Available Upgrade Plans
                </h6>
                <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <span class="text-muted small">Billing:</span>
                    <div class="btn-group btn-group-sm" role="group">
                        <input type="radio" class="btn-check" name="dues-tracker-billing" id="dt-billing-monthly" value="monthly" checked>
                        <label class="btn btn-outline-secondary" for="dt-billing-monthly">Monthly</label>
                        <input type="radio" class="btn-check" name="dues-tracker-billing" id="dt-billing-yearly" value="yearly">
                        <label class="btn btn-outline-secondary" for="dt-billing-yearly">Yearly</label>
                    </div>
                    <small class="text-muted">Save with yearly</small>
                </div>
                <p class="small text-muted mb-3 d-flex align-items-center gap-1">
                    <i class="fas fa-lock" aria-hidden="true"></i>
                    <span>Plan upgrades paid by card are processed securely by Square.</span>
                </p>
                <div class="row g-3" id="dues-upgrade-plans-row">
                    ${upgradePlans.map((plan, index) => {
                        try {
                            const tier = plan.tier || plan.subscription_tier || 'unknown';
                            
                            // Generate features based on actual plan limits (not from database)
                            const maxDivisions = plan.max_divisions;
                            const maxTeams = plan.max_teams;
                            const maxTeamMembers = plan.max_team_members;
                            
                            // All plans include the same features - only limits differ
                            // Estimate visual width for sorting (wide chars like W, M count more; narrow like i, l count less)
