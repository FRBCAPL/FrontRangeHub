async function loadAvailablePlans(currentTier) {
    console.log('loadAvailablePlans called with tier:', currentTier);
    
    // Helper function to find the element with retries
    // findAvailablePlansDiv -> modules/findavailableplansdiv.js

    
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
                            // estimateVisualWidth -> modules/estimatevisualwidth.js

                            
                            // Sort common features by visual width (shortest to longest)
                            // Manual override: "Payment management" should come after "Sanction fee tracking"
                            const commonFeatures = [
                                'Full dues tracking',
                                'Payment management',
                                'Sanction fee tracking',
                                'Team roster management',
                                'Financial breakdowns',
                                'Projection mode',
                                'Weekly payment tracking',
                                'Makeup match payments',
                                'Player status management'
                            ].sort((a, b) => {
                                // Manual ordering: Payment management after Sanction fee tracking
                                if (a === 'Payment management' && b === 'Sanction fee tracking') {
                                    return 1; // Payment management comes after
                                }
                                if (a === 'Sanction fee tracking' && b === 'Payment management') {
                                    return -1; // Sanction fee tracking comes before
                                }
                                
                                const widthA = estimateVisualWidth(a);
                                const widthB = estimateVisualWidth(b);
                                if (widthA !== widthB) {
                                    return widthA - widthB;
                                }
                                // If widths are equal, sort alphabetically
                                return a.localeCompare(b);
                            });
                            
                            // Features only include the common features (limits are shown separately)
                            let features = [...commonFeatures];
                            
                            // Add export/reporting feature for Pro and Enterprise plans only
                            if (tier === 'pro' || tier === 'enterprise') {
                                features.push('Data export & reporting');
                            }
                            
                            // Sort features again after adding export (to maintain visual width sorting)
                            features.sort((a, b) => {
                                // Keep export at the end
                                if (a === 'Data export & reporting') return 1;
                                if (b === 'Data export & reporting') return -1;
                                
                                // Manual ordering: Payment management after Sanction fee tracking
                                if (a === 'Payment management' && b === 'Sanction fee tracking') {
                                    return 1;
                                }
                                if (a === 'Sanction fee tracking' && b === 'Payment management') {
                                    return -1;
                                }
                                
                                const widthA = estimateVisualWidth(a);
                                const widthB = estimateVisualWidth(b);
                                if (widthA !== widthB) {
                                    return widthA - widthB;
                                }
                                return a.localeCompare(b);
                            });
                            const priceMonthly = plan.price_monthly != null ? parseFloat(plan.price_monthly) : (plan.price ? parseFloat(plan.price) : 0);
                            const priceYearly = plan.price_yearly != null ? parseFloat(plan.price_yearly) : null;
                            const badgeColor = tier === 'basic' ? 'primary' : 
                                             tier === 'pro' ? 'warning' : 'success';
                            const planName = plan.name || (tier.charAt(0).toUpperCase() + tier.slice(1));
                            const colSize = upgradePlans.length === 1 ? '12' : upgradePlans.length === 2 ? '6' : '4';
                            
                            return `
                                <div class="col-md-${colSize}">
                                    <div class="card h-100 border-2 ${tier === 'pro' ? 'border-warning shadow-sm' : ''}" data-plan-tier="${tier}">
                                        <div class="card-header bg-${badgeColor} text-white">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <h6 class="mb-0">
                                                    <i class="fas fa-star me-2"></i>${planName}
                                                </h6>
                                                <span class="badge bg-light text-dark plan-price-display" data-tier="${tier}" data-monthly="${priceMonthly}" data-yearly="${priceYearly != null ? priceYearly : ''}">${formatCurrency(priceMonthly)}/mo</span>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            ${(() => {
                                                // Use simple short descriptions based on tier
                                                let shortDesc = '';
                                                if (tier === 'basic' || tier === 'free') {
                                                    shortDesc = 'Great for small leagues';
                                                } else if (tier === 'pro') {
                                                    shortDesc = 'Best for growing leagues';
                                                } else if (tier === 'enterprise') {
                                                    shortDesc = 'Excellent for large & established leagues';
                                                }
                                                return shortDesc ? `<p class="text-muted small mb-3">${shortDesc}</p>` : '';
                                            })()}
                                            
                                            ${tier !== 'enterprise' ? `
                                            <div class="mb-3">
                                                <strong>Limits:</strong>
                                                <ul class="list-unstyled mt-2 mb-0 small">
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        ${plan.max_divisions === null || plan.max_divisions === undefined ? 'Unlimited' : plan.max_divisions} division${plan.max_divisions !== 1 ? 's' : ''}<br><span style="margin-left: 1.5rem;">(or ${Math.floor((plan.max_divisions || 0)/2)} double play)</span>
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Up to ${plan.max_teams === null || plan.max_teams === undefined ? 'Unlimited' : plan.max_teams} teams
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Up to ${plan.max_team_members === null || plan.max_team_members === undefined ? 'Unlimited' : plan.max_team_members} players
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        16 teams per division max
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        8 players per team roster
                                                    </li>
                                                </ul>
                                            </div>
                                            ` : `
                                            <div class="mb-3">
                                                <ul class="list-unstyled mt-2 mb-0 small">
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited divisions
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited teams
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited players
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited teams per division
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited rosters
                                                    </li>
                                                </ul>
                                            </div>
                                            `}
                                            
                                            ${features.length > 0 ? `
                                                <div class="mb-3">
                                                    <strong>Features:</strong>
                                                    <ul class="list-unstyled mt-2 mb-0 small">
                                                        ${features.map(feature => `
                                                            <li><i class="fas fa-check text-success me-2"></i>${typeof feature === 'string' ? feature : JSON.stringify(feature)}</li>
                                                        `).join('')}
                                                    </ul>
                                                </div>
                                            ` : ''}
                                            
                                            ${UPGRADES_DISABLED ? `
                                            <div class="p-2 mt-auto rounded bg-light text-dark small text-center">
                                                <i class="fas fa-envelope me-1"></i>Contact us to upgrade
                                            </div>
                                            ` : `
                                            <button class="btn btn-${badgeColor} w-100 mt-auto upgrade-plan-btn" data-tier="${tier}" data-plan-name="${(planName || '').replace(/"/g, '&quot;')}" onclick="upgradeToPlan('${tier}', '${planName.replace(/'/g, "\\'")}', this)">
                                                <i class="fas fa-arrow-up me-2"></i>Upgrade to ${planName}
                                            </button>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            `;
                        } catch (planError) {
                            console.error(`Error building HTML for plan ${index}:`, planError, plan);
                            return `<div class="col-12"><div class="alert alert-warning">Error displaying plan: ${planError.message}</div></div>`;
                        }
                    }).join('')}
                </div>
                ${((typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) || (typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO)) ? `
                <div class="alert alert-secondary mt-4 mb-0 text-center">
                    <h6 class="mb-2"><i class="fas fa-wallet me-2"></i>Or pay with Cash App or Venmo</h6>
                    <p class="small mb-2">Send the amount for your chosen plan (see above) via Cash App or Venmo. Include your <strong>email</strong> and <strong>plan name</strong> (e.g. Pro Monthly) in the payment note. We'll upgrade your account within 24–48 hours.</p>
                    <div class="small text-muted mb-2">Plan prices: ${upgradePlans.map(p => {
                        const name = p.name || ((p.tier || '').charAt(0).toUpperCase() + (p.tier || '').slice(1));
                        const mo = p.price_monthly != null ? formatCurrency(p.price_monthly) + '/mo' : null;
                        const yr = p.price_yearly != null ? formatCurrency(p.price_yearly) + '/yr' : null;
                        const parts = [mo, yr].filter(Boolean);
                        return name + ': ' + (parts.length ? parts.join(' or ') : '—');
                    }).join(' \u2022 ')}</div>
                    <div class="row g-3 mt-2 justify-content-center align-items-start">
                        ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) ? `
                        <div class="col-auto">
                            <div class="text-center">
                                <img src="images/cashapp-qr.png" alt="Cash App QR — pay for subscription" class="rounded" style="width: 120px; height: 120px; object-fit: contain;">
                                <div class="small mt-1 fw-semibold">${String(DONATION_CASHAPP)}</div>
                                <a class="btn btn-sm btn-success mt-1" href="https://cash.app/${String(DONATION_CASHAPP).replace(/^\$/, '')}" target="_blank" rel="noopener"><i class="fas fa-dollar-sign me-1"></i>Cash App</a>
                            </div>
                        </div>
                        ` : ''}
                        ${(typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                        <div class="col-auto">
                            <div class="text-center">
                                <img src="images/venmo-qr.png" alt="Venmo QR — pay for subscription" class="rounded" style="width: 120px; height: 120px; object-fit: contain;">
                                <div class="small mt-1 fw-semibold">${String(DONATION_VENMO)}</div>
                                <a class="btn btn-sm btn-primary mt-1" href="https://venmo.com/u/${String(DONATION_VENMO).replace(/^@/, '').replace(/^u\/?/i, '')}" target="_blank" rel="noopener">Venmo</a>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            `;
            
            console.log('Plans HTML generated, length:', plansHTML.length);
            console.log('Setting plans HTML, element exists:', !!availablePlansDiv);
            console.log('Plans HTML preview (first 500 chars):', plansHTML.substring(0, 500));
            
        } catch (htmlError) {
            console.error('Error generating plans HTML:', htmlError);
            plansHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Error displaying plans</strong>
                    <p class="mb-0 mt-2">${htmlError.message}</p>
                </div>
            `;
        }
        
        // Set the HTML (outside try/catch so it always runs)
        if (availablePlansDiv && plansHTML) {
            console.log('📝 Setting plans HTML, div exists:', !!availablePlansDiv, 'HTML length:', plansHTML.length);
            
            // CRITICAL: Ensure availablePlansDiv is in subscription-pane before setting HTML
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane && !subscriptionPane.contains(availablePlansDiv)) {
                console.error('⚠️ availablePlansDiv is NOT in subscription-pane! Moving it...');
                availablePlansDiv.remove();
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                } else if (subscriptionPane) {
                    subscriptionPane.appendChild(availablePlansDiv);
                }
            }
            
            // Set the plans HTML
            availablePlansDiv.innerHTML = plansHTML;
            console.log('✅ Plans HTML set successfully');

            // Billing toggle: sync plan prices when Monthly/Yearly changes
            // billingHandler -> modules/billinghandler.js

            if (availablePlansDiv._billingToggleHandler) {
                availablePlansDiv.removeEventListener('change', availablePlansDiv._billingToggleHandler);
            }
            availablePlansDiv._billingToggleHandler = billingHandler;
            availablePlansDiv.addEventListener('change', billingHandler);
            syncPlanPricesFromBillingToggle();
            
            // CRITICAL: Verify plans div is still in subscription-pane after setting HTML
            if (subscriptionPane && !subscriptionPane.contains(availablePlansDiv)) {
                console.error('⚠️ availablePlansDiv moved after setting HTML! Moving back...');
                availablePlansDiv.remove();
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                } else {
                    subscriptionPane.appendChild(availablePlansDiv);
                }
                // Re-set HTML since we moved it
                availablePlansDiv.innerHTML = plansHTML;
            }
            
            // CRITICAL: If div has no parent after setting HTML, reattach it
            if (!availablePlansDiv.parentElement) {
                console.error('⚠️ availablePlansDiv has no parent after setting HTML! Reattaching...');
                const subscriptionInfo = subscriptionPane?.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                    // Re-set HTML after reattaching
                    availablePlansDiv.innerHTML = plansHTML;
                } else if (subscriptionPane) {
                    subscriptionPane.appendChild(availablePlansDiv);
                    availablePlansDiv.innerHTML = plansHTML;
                }
            }
            
            // Verify plans HTML was actually set
            if (availablePlansDiv.innerHTML.length < 100) {
                console.error('⚠️ Plans HTML too short after setting! Re-setting...');
                availablePlansDiv.innerHTML = plansHTML;
            }
            
            // Ensure subscription pane is visible
            if (subscriptionPane) {
                subscriptionPane.classList.add('show', 'active');
                subscriptionPane.style.display = 'block';
                subscriptionPane.style.visibility = 'visible';
                console.log('✅ Final: subscription-pane classes:', subscriptionPane.className, 'display:', subscriptionPane.style.display);
            }
            
            // Immediately clean up any subscription content from other tabs (multiple times)
            cleanSubscriptionContentFromOtherTabs();
            setTimeout(() => {
                cleanSubscriptionContentFromOtherTabs();
                // Final verification
                const finalPlansDiv = document.getElementById('availablePlans');
                if (finalPlansDiv) {
                    console.log('✅ Final plans check - in subscription-pane:', subscriptionPane?.contains(finalPlansDiv), 'HTML length:', finalPlansDiv.innerHTML.length);
                }
            }, 50);
            setTimeout(() => cleanSubscriptionContentFromOtherTabs(), 200);
            
            // Force a reflow to ensure rendering
            availablePlansDiv.offsetHeight;
            
            // Immediately verify it was set
            const immediateCheck = document.getElementById('availablePlans');
            if (immediateCheck) {
                console.log('✅ Immediate verification - innerHTML length:', immediateCheck.innerHTML.length);
                console.log('✅ Immediate verification - div visible:', immediateCheck.offsetParent !== null);
                // Verify it's in subscription-pane
                const checkParent = immediateCheck.closest('.tab-pane');
                if (checkParent && checkParent.id !== 'subscription-pane') {
                    console.error('⚠️ availablePlans is in wrong tab!', checkParent.id);
                    immediateCheck.remove();
                    const subscriptionInfo = document.getElementById('subscriptionInfo');
                    if (subscriptionInfo) {
                        subscriptionInfo.appendChild(immediateCheck);
                    }
                }
                if (immediateCheck.innerHTML.length < 100) {
                    console.error('⚠️ Plans HTML too short, retrying...');
                    immediateCheck.innerHTML = plansHTML;
                }
            }
            
            // Also verify after a delay
            setTimeout(() => {
                const verifyDiv = document.getElementById('availablePlans');
                if (verifyDiv) {
                    console.log('✅ Delayed verification - innerHTML length:', verifyDiv.innerHTML.length);
                    console.log('✅ Delayed verification - div visible:', verifyDiv.offsetParent !== null);
                    // Final cleanup check
                    cleanSubscriptionContentFromOtherTabs();
                    if (verifyDiv.innerHTML.length < 100) {
                        console.error('⚠️ Plans HTML was not set correctly after delay! Retrying...');
                        verifyDiv.innerHTML = plansHTML;
                    }
                    
                    // Check if subscription pane is visible
                    const pane = document.getElementById('subscription-pane');
                    if (pane) {
                        console.log('✅ Subscription pane classes:', pane.className);
                        console.log('✅ Subscription pane visible:', pane.offsetParent !== null);
                        console.log('✅ Subscription pane display:', window.getComputedStyle(pane).display);
                    }
                } else {
                    console.error('❌ availablePlans div disappeared!');
                }
            }, 200);
            } else {
                console.error('❌ Cannot set plans HTML');
                console.error('  - availablePlansDiv exists:', !!availablePlansDiv);
                console.error('  - plansHTML length:', plansHTML ? plansHTML.length : 0);
                
                // Try multiple strategies to find or create the div
                let targetDiv = availablePlansDiv;
                
                if (!targetDiv) {
                    // Strategy 1: Find it in subscription pane
                    const subscriptionPane = document.getElementById('subscription-pane');
                    if (subscriptionPane) {
                        targetDiv = subscriptionPane.querySelector('#availablePlans');
                        console.log('Found via querySelector:', !!targetDiv);
                    }
                }
                
                if (!targetDiv) {
                    // Strategy 2: Find subscriptionInfo and check for availablePlans
                    const subscriptionInfo = document.getElementById('subscriptionInfo');
                    if (subscriptionInfo) {
                        targetDiv = subscriptionInfo.querySelector('#availablePlans');
                        console.log('Found in subscriptionInfo:', !!targetDiv);
                        
                        // If still not found, create it
                        if (!targetDiv && plansHTML) {
                            console.log('⚠️ Creating availablePlans div manually');
                            targetDiv = document.createElement('div');
                            targetDiv.id = 'availablePlans';
                            subscriptionInfo.appendChild(targetDiv);
                            console.log('✅ Created availablePlans div');
                        }
                    }
                }
                
                if (targetDiv && plansHTML) {
                    targetDiv.innerHTML = plansHTML;
                    console.log('✅ Set plans HTML in fallback location');
                } else {
                    console.error('❌ Could not find or create availablePlans div');
                    console.error('Subscription pane:', !!document.getElementById('subscription-pane'));
                    console.error('Subscription info:', !!document.getElementById('subscriptionInfo'));
                }
            }
        
    } catch (error) {
        console.error('❌ Error loading available plans:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            currentTier: currentTier,
            availablePlansDivExists: !!availablePlansDiv
        });
        
        // Try to show error in the div if it exists
        if (availablePlansDiv) {
            availablePlansDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Unable to load upgrade plans</strong>
                    <p class="mb-0 mt-2">${error.message || 'An error occurred while loading subscription plans.'}</p>
                    <small class="text-muted">Please check the browser console for more details or try refreshing the page.</small>
                </div>
            `;
        } else {
            // Try to find or create the div
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane) {
                const subscriptionInfo = subscriptionPane.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    let errorDiv = document.getElementById('availablePlans');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.id = 'availablePlans';
                        subscriptionInfo.appendChild(errorDiv);
                    }
                    errorDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Unable to load upgrade plans</strong>
                            <p class="mb-0 mt-2">${error.message || 'An error occurred while loading subscription plans.'}</p>
                        </div>
                    `;
                }
            }
        }
    }
}

// Function to handle plan upgrade
async function upgradeToPlan(planTier, planName, buttonElement) {
    const button = buttonElement || (window.event ? window.event.target.closest('button') : null);
    let originalText = '';
    if (button) {
        originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    }

    function restoreButton() {
        if (button) {
            button.disabled = false;
            const text = originalText || '<i class="fas fa-arrow-up me-2"></i>Upgrade to ' + (planName || '');
            button.innerHTML = text.replace('Processing...', '<i class="fas fa-arrow-up me-2"></i>Upgrade to ' + (planName || ''));
        }
    }

    var billingPeriod = 'monthly';
    var billingEl = document.querySelector('input[name="dues-tracker-billing"]:checked');
    if (billingEl && billingEl.value === 'yearly') {
        billingPeriod = 'yearly';
    }

    try {
        // Create checkout session
        console.log('🔄 Creating checkout session for plan:', planTier, 'billing:', billingPeriod);
        const response = await apiCall('/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ planTier: planTier, billingPeriod: billingPeriod })
        });

        console.log('📡 Checkout session response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            let errorData;
            let rawText = '';
            try {
                rawText = await response.text();
                console.log('📄 Raw error response text:', rawText.substring(0, 500));
                errorData = rawText ? JSON.parse(rawText) : { message: null };
            } catch (e) {
                console.error('❌ Failed to parse error response:', e);
                console.error('❌ Raw response text that failed to parse:', rawText.substring(0, 500));
                errorData = { message: null, rawText: rawText.substring(0, 200) };
            }

            const statusMsg = `Server returned ${response.status} ${response.statusText || ''}`.trim();
            const msg = errorData?.message || errorData?.rawText || statusMsg;

            console.error('❌ Checkout session failed:', {
                status: response.status,
                statusText: response.statusText,
                message: msg,
                errorData,
                rawText: rawText.substring(0, 200)
            });

            if (msg.includes('not available') || msg.includes('not configured')) {
                showAlertModal('Payment processing is not available yet. Please contact support to upgrade your plan.', 'warning', 'Payment Unavailable');
                restoreButton();
                return;
            }

            // Handle Square authorization errors
            if (msg.includes('could not be authorized') || msg.includes('authorization') || msg.includes('unauthorized')) {
                showAlertModal(
                    'Payment processing is currently unavailable due to a configuration issue. Please contact support with this error: "Square API authorization failed".',
                    'error',
                    'Payment Configuration Error'
                );
                restoreButton();
                return;
            }

            throw new Error(`${statusMsg}. ${msg ? `Details: ${msg}` : 'Please try again or contact support.'}`);
        }

        const data = await response.json().catch(() => null);
        if (!data) {
            throw new Error('Invalid response from server. Please try again.');
        }

        if (data.url) {
            window.location.href = data.url;
        } else if (data.sessionId) {
            window.location.href = `${window.location.origin}/dues-tracker?session_id=${data.sessionId}`;
        } else {
            throw new Error('No checkout URL or session ID received');
        }
    } catch (error) {
        console.error('Upgrade error:', error);
        showAlertModal(`Failed to start upgrade: ${error.message || 'Unknown error'}. Please try again or contact support.`, 'error', 'Upgrade Failed');
        restoreButton();
    }
}

// Make upgradeToPlan available globally
window.upgradeToPlan = upgradeToPlan;

async function cancelSubscription() {
    const confirmed = confirm('Are you sure you want to cancel your subscription? Your access will continue until the end of your current billing period.');
    if (!confirmed) return;

    const button = document.getElementById('cancelSubscriptionBtn');
    const originalText = button ? button.innerHTML : '';
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Canceling...';
    }

    try {
        const response = await apiCall('/cancel-subscription', {
            method: 'POST'
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            let errorMessage = 'Failed to cancel subscription.';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage = `Server returned ${response.status}. ${errorText.slice(0, 100)}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        showAlertModal(
            data.message || 'Subscription canceled. Your access will continue until the end of your billing period.',
            'info',
            'Subscription Canceled'
        );

        // Refresh subscription info
        await fetchOperatorProfile();
        if (currentOperator) {
            await loadSubscriptionInfo({ operator: currentOperator });
        }
    } catch (error) {
        console.error('Cancel subscription error:', error);
        showAlertModal(
            error.message || 'Failed to cancel subscription. Please try again or contact support.',
            'error',
            'Cancel Failed'
        );
        if (button && originalText) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}

// Make cancelSubscription available globally
window.cancelSubscription = cancelSubscription;

// saveProfile -> modules/saveprofile.js


// Periodic cleanup to ensure subscription content stays only in subscription tab
let subscriptionCleanupInterval = null;
function startSubscriptionCleanup() {
    if (subscriptionCleanupInterval) return; // Already running
    
    subscriptionCleanupInterval = setInterval(() => {
        // Only run if profile modal is open
        const profileModal = document.getElementById('profileModal');
        if (profileModal && profileModal.classList.contains('show')) {
            // Aggressively clean other tabs (but NEVER touch subscription-pane)
            cleanSubscriptionContentFromOtherTabs();
            
            // Also ensure only the active tab is visible
            const activeTab = document.querySelector('#profileTabContent .tab-pane.show.active');
            if (activeTab && activeTab.id !== 'subscription-pane') {
                // If a non-subscription tab is active, make sure subscription content is cleaned
                cleanSubscriptionContentFromOtherTabs();
            }
            
            // Also verify subscriptionInfo is in the right place (but don't remove if it's there)
            const subscriptionInfo = document.getElementById('subscriptionInfo');
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionInfo && subscriptionPane) {
                // Only move if it's NOT in subscription-pane
                if (!subscriptionPane.contains(subscriptionInfo)) {
                    console.warn('🧹 Periodic cleanup: Moving subscriptionInfo to subscription-pane');
                    subscriptionInfo.remove();
                    subscriptionPane.appendChild(subscriptionInfo);
                }
                // If subscriptionInfo is empty or just has loading spinner, and we have pending HTML, load it
                const hasContent = subscriptionInfo.innerHTML && subscriptionInfo.innerHTML.length > 200 && !subscriptionInfo.innerHTML.includes('Loading subscription information');
                if (!hasContent && window._pendingSubscriptionHTML) {
                    console.log('📦 Periodic cleanup: Loading pending subscription HTML');
                    subscriptionInfo.innerHTML = window._pendingSubscriptionHTML;
                }
            }
            
            // Verify availablePlans is in the right place (but don't remove if it's there)
            const availablePlans = document.getElementById('availablePlans');
            if (availablePlans && subscriptionPane) {
                // Only move if it's NOT in subscription-pane
                if (!subscriptionPane.contains(availablePlans)) {
                    console.warn('🧹 Periodic cleanup: Moving availablePlans to subscription-pane');
                    availablePlans.remove();
                    if (subscriptionInfo) {
                        subscriptionInfo.appendChild(availablePlans);
                    } else {
                        subscriptionPane.appendChild(availablePlans);
                    }
                }
            }
        } else {
            // Modal closed, stop cleanup
            if (subscriptionCleanupInterval) {
                clearInterval(subscriptionCleanupInterval);
                subscriptionCleanupInterval = null;
            }
        }
    }, 500); // Check every 500ms
}

function stopSubscriptionCleanup() {
    if (subscriptionCleanupInterval) {
        clearInterval(subscriptionCleanupInterval);
        subscriptionCleanupInterval = null;
    }
}

// Function to initialize Bootstrap tooltips
function initializeProfileTooltips() {
    // Check if Bootstrap is available
    const Bootstrap = getBootstrap();
    if (!Bootstrap || !Bootstrap.Tooltip) {
        console.warn('Bootstrap Tooltip not available');
        return;
    }
    
    // Initialize all tooltips in the profile modal
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        // Destroy existing tooltip if it exists
        const existingTooltip = Bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
        // Create new tooltip
        try {
            new Bootstrap.Tooltip(tooltipTriggerEl);
        } catch (e) {
            console.warn('Failed to initialize tooltip:', e);
        }
    });
}

// initializeModalTooltips -> modules/initializemodaltooltips.js


// Verify Bootstrap is loaded after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const Bootstrap = getBootstrap();
    if (!Bootstrap) {
        console.error('Bootstrap is not loaded! Modals will not work.');
        console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('bootstrap')));
    } else {
        console.log('Bootstrap loaded successfully:', Bootstrap);
        
        // Initialize tooltips on page load
        initializeProfileTooltips();
    }
    
    // Verify checkPasswordStrength is accessible
    if (typeof window.checkPasswordStrength !== 'function') {
        console.error('checkPasswordStrength is not accessible on window object!');
    }
    
    // Attach functions to window (all functions should be defined by now)
    console.log('Attaching functions to window...');
    if (typeof showAddTeamModal === 'function') {
        window.showAddTeamModal = showAddTeamModal;
        console.log('  ✓ showAddTeamModal attached');
    } else {
        console.warn('  ✗ showAddTeamModal not found');
    }
    
    if (typeof showDivisionManagement === 'function') {
        window.showDivisionManagement = showDivisionManagement;
        console.log('  ✓ showDivisionManagement attached');
    } else {
        console.warn('  ✗ showDivisionManagement not found');
    }
    
    if (typeof showProfileModal === 'function') {
        window.showProfileModal = showProfileModal;
        console.log('  ✓ showProfileModal attached');
    } else {
        console.warn('  ✗ showProfileModal not found');
    }
    if (typeof showDonateModal === 'function') {
        window.showDonateModal = showDonateModal;
    }
    
    if (typeof showPlayersView === 'function') {
        window.showPlayersView = showPlayersView;
        console.log('  ✓ showPlayersView attached');
    }
    
    if (typeof showWeeklyPaymentModal === 'function') {
        window.showWeeklyPaymentModal = showWeeklyPaymentModal;
        console.log('  ✓ showWeeklyPaymentModal attached');
    } else {
        console.warn('  ✗ showWeeklyPaymentModal not found');
    }
    
    if (typeof addTeam === 'function') {
        window.addTeam = addTeam;
        console.log('  ✓ addTeam attached');
    }
    
    if (typeof logout === 'function') {
        window.logout = logout;
        console.log('  ✓ logout attached');
    }
    if (typeof getAdminPageUrl === 'function') {
        window.getAdminPageUrl = getAdminPageUrl;
    }
    
    if (typeof signInWithGoogle === 'function') {
        window.signInWithGoogle = signInWithGoogle;
        console.log('  ✓ signInWithGoogle attached');
    }
    
    if (typeof signUpWithGoogle === 'function') {
        window.signUpWithGoogle = signUpWithGoogle;
        console.log('  ✓ signUpWithGoogle attached');
    }
    
    if (typeof saveProfile === 'function') {
        window.saveProfile = saveProfile;
        console.log('  ✓ saveProfile attached');
    } else {
        console.warn('  ✗ saveProfile not found');
    }
    
    if (typeof addTeamMember === 'function') {
        window.addTeamMember = addTeamMember;
        console.log('  ✓ addTeamMember attached');
    } else {
        console.warn('  ✗ addTeamMember not found');
    }
    
    if (typeof removeMember === 'function') {
        window.removeMember = removeMember;
        console.log('  ✓ removeMember attached');
    } else {
        console.warn('  ✗ removeMember not found');
    }
    
    // Verify modal functions are accessible
    console.log('Verifying modal functions:');
    console.log('  showAddTeamModal:', typeof window.showAddTeamModal);
    console.log('  showDivisionManagement:', typeof window.showDivisionManagement);
    console.log('  showProfileModal:', typeof window.showProfileModal);
    console.log('  showWeeklyPaymentModal:', typeof window.showWeeklyPaymentModal);
    console.log('  addTeam:', typeof window.addTeam);
    console.log('  saveProfile:', typeof window.saveProfile);
    console.log('  addTeamMember:', typeof window.addTeamMember);
    console.log('  removeMember:', typeof window.removeMember);
    
    if (typeof editPlayer === 'function') {
        window.editPlayer = editPlayer;
        console.log('  ✓ editPlayer attached');
    }
    
    if (typeof savePlayerChanges === 'function') {
        window.savePlayerChanges = savePlayerChanges;
        console.log('  ✓ savePlayerChanges attached');
    }
    
    if (typeof handleSanctionPaidChange === 'function') {
        window.handleSanctionPaidChange = handleSanctionPaidChange;
        console.log('  ✓ handleSanctionPaidChange attached');
    }
    
    if (typeof removeTeamFromDivision === 'function') {
        window.removeTeamFromDivision = removeTeamFromDivision;
        console.log('  ✓ removeTeamFromDivision attached');
    }
    
    // Attach pagination functions
    if (typeof goToPage === 'function') {
        window.goToPage = goToPage;
        console.log('  ✓ goToPage attached');
    }
    
    if (typeof changeTeamsPerPage === 'function') {
        window.changeTeamsPerPage = changeTeamsPerPage;
        console.log('  ✓ changeTeamsPerPage attached');
    }
    
    if (typeof archiveTeam === 'function') {
        window.archiveTeam = archiveTeam;
        console.log('  ✓ archiveTeam attached');
    }
    
    if (typeof permanentlyDeleteTeam === 'function') {
        window.permanentlyDeleteTeam = permanentlyDeleteTeam;
        console.log('  ✓ permanentlyDeleteTeam attached');
    }
    
    if (typeof showArchivedTeamsModal === 'function') {
        window.showArchivedTeamsModal = showArchivedTeamsModal;
        console.log('  ✓ showArchivedTeamsModal attached');
    }
    
    if (typeof sortArchivedTeams === 'function') {
        window.sortArchivedTeams = sortArchivedTeams;
        console.log('  ✓ sortArchivedTeams attached');
    }
    
    if (typeof restoreArchivedTeam === 'function') {
        window.restoreArchivedTeam = restoreArchivedTeam;
        console.log('  ✓ restoreArchivedTeam attached');
    }
    
    if (typeof showHelpModal === 'function') {
        window.showHelpModal = showHelpModal;
        console.log('  ✓ showHelpModal attached');
    }
    
    if (typeof showExportModal === 'function') {
        window.showExportModal = showExportModal;
        console.log('  ✓ showExportModal attached');
    }
    
    if (typeof executeExport === 'function') {
        window.executeExport = executeExport;
        console.log('  ✓ executeExport attached');
    }
    if (typeof updateExportTeamFilterOptions === 'function') {
        window.updateExportTeamFilterOptions = updateExportTeamFilterOptions;
    }
    
    if (typeof downloadBackup === 'function') {
        window.downloadBackup = downloadBackup;
        console.log('  ✓ downloadBackup attached');
    }
    
    if (typeof deleteDivision === 'function') {
        window.deleteDivision = deleteDivision;
        console.log('  ✓ deleteDivision attached');
    }
    
    if (typeof showSmartBuilderModal === 'function') {
        window.showSmartBuilderModal = showSmartBuilderModal;
        console.log('  ✓ showSmartBuilderModal attached');
    }
    
    if (typeof openSmartBuilder === 'function') {
        window.openSmartBuilder = openSmartBuilder;
        console.log('  ✓ openSmartBuilder attached');
    }
    if (typeof openSmartBuilderFromAddDivision === 'function') {
        window.openSmartBuilderFromAddDivision = openSmartBuilderFromAddDivision;
        console.log('  ✓ openSmartBuilderFromAddDivision attached');
    }
    if (typeof createDivisionFromManualBuilder === 'function') {
        window.createDivisionFromManualBuilder = createDivisionFromManualBuilder;
        console.log('  ✓ createDivisionFromManualBuilder attached');
    }
    if (typeof toggleSmartBuilderMatchesOther === 'function') {
        window.toggleSmartBuilderMatchesOther = toggleSmartBuilderMatchesOther;
    }
    if (typeof toggleSmartBuilderPlayersOther === 'function') {
        window.toggleSmartBuilderPlayersOther = toggleSmartBuilderPlayersOther;
    }
    
    if (typeof fetchFargoDivisions === 'function') {
        window.fetchFargoDivisions = fetchFargoDivisions;
        console.log('  ✓ fetchFargoDivisions attached');
    }
    
    if (typeof setupManualDivisionIdListener === 'function') {
        window.setupManualDivisionIdListener = setupManualDivisionIdListener;
        console.log('  ✓ setupManualDivisionIdListener attached');
    }
    
    if (typeof onDivisionSelected === 'function') {
        window.onDivisionSelected = onDivisionSelected;
        console.log('  ✓ onDivisionSelected attached');
    }
    
    console.log('Global functions attached to window object');
    
    // CRITICAL: Set up event delegation on document for save button (works even if button is replaced)
    document.addEventListener('click', function(e) {
        const target = e.target.closest('#saveProfileButton');
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.saveProfile === 'function') {
                window.saveProfile().catch(err => {
                    console.error('❌ Error in saveProfile:', err);
                    alert('Error saving: ' + err.message);
                });
            } else {
                console.error('❌ window.saveProfile not available!');
                alert('Error: Save function not available. Please refresh the page.');
            }
            return false;
        }
    }, true); // Use capture phase to catch it early
});
