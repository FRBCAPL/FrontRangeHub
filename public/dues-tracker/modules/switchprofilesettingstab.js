function switchProfileSettingsTab(paneId) {
    console.log('switchProfileSettingsTab called with paneId:', paneId);
    
    // FIRST: Always clean subscription content from all non-subscription tabs
    cleanSubscriptionContentFromOtherTabs();
    
    // Also ensure subscriptionInfo is ONLY in subscription-pane
    const subscriptionInfoDiv = document.getElementById('subscriptionInfo');
    const subscriptionPane = document.getElementById('subscription-pane');
    if (subscriptionInfoDiv && subscriptionPane) {
        if (!subscriptionPane.contains(subscriptionInfoDiv)) {
            console.warn('⚠️ subscriptionInfo found outside subscription-pane during tab switch! Moving it...');
            subscriptionInfoDiv.remove();
            subscriptionPane.appendChild(subscriptionInfoDiv);
        }
    }
    
    const content = document.getElementById('profileTabContent');
    if (!content) {
        console.error('profileTabContent not found');
        return;
    }
    
    const panes = content.querySelectorAll('.tab-pane');
    const tabButtons = document.querySelectorAll('#profileTabs [role="tab"]');
    const paneMap = { 
        'profile-pane': 'profile-tab', 
        'sanction-pane': 'sanction-tab', 
        'financial-pane': 'financial-tab', 
        'subscription-pane': 'subscription-tab' 
    };

    // Debug: Log all panes found
    console.log('🔍 Found panes:', Array.from(panes).map(p => p.id));
    console.log('🔍 Looking for paneId:', paneId);

    // Hide all panes and show the selected one
    panes.forEach(p => {
        const show = p.id === paneId;
        console.log(`🔍 Checking pane ${p.id}: show=${show}, matches=${p.id === paneId}`);
        if (show) {
            p.classList.add('show', 'active');
            p.style.display = 'block';
            p.style.visibility = 'visible';
            p.removeAttribute('aria-hidden');
            console.log(`✅ Showing pane: ${p.id}, classes: ${p.className}, display: ${p.style.display}`);
            
            // CRITICAL: If showing a non-subscription tab, ensure no subscription content is visible
            if (p.id !== 'subscription-pane') {
                // Immediate cleanup when tab becomes visible
                const subscriptionInfo = p.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    console.warn(`🧹 Removing subscriptionInfo from ${p.id}`);
                    subscriptionInfo.remove();
                }
                const availablePlans = p.querySelector('#availablePlans');
                if (availablePlans) {
                    console.warn(`🧹 Removing availablePlans from ${p.id}`);
                    availablePlans.remove();
                }
                // Remove subscription cards immediately - but be VERY specific
                p.querySelectorAll('.card').forEach(card => {
                    // Only remove if it has VERY specific subscription indicators
                    const hasSubscriptionHeader = card.querySelector('.subscription-plan-header');
                    const hasAvailablePlansDiv = card.querySelector('#availablePlans');
                    const hasSubscriptionInfoDiv = card.querySelector('#subscriptionInfo');
                    
                    // Check text content for subscription-specific phrases (be very specific)
                    const cardText = card.textContent || '';
                    const hasUsageLimits = cardText.includes('Usage & Limits') && (cardText.includes('teams') || cardText.includes('divisions'));
                    const hasUpgradePlans = cardText.includes('Available Upgrade Plans') || cardText.includes('Upgrade Your Plan');
                    const hasTrialInfo = cardText.includes('Trial Active') || cardText.includes('30-Day Enterprise Trial');
                    
                    // Only remove if it's clearly a subscription card
                    if (hasSubscriptionHeader || hasAvailablePlansDiv || hasSubscriptionInfoDiv || 
                        (hasUsageLimits && hasUpgradePlans) || hasTrialInfo) {
                        console.warn(`🧹 Removing subscription card from ${p.id}`);
                        card.remove();
                    }
                });
                // Also run full cleanup
                setTimeout(() => {
                    cleanSubscriptionContentFromOtherTabs();
                }, 10);
            }
            
            // Verify data is still in fields when pane becomes visible
            if (p.id === 'financial-pane') {
                setTimeout(() => {
                    const prizeFundName = document.getElementById('profilePrizeFundName');
                    const prizeFundPercent = document.getElementById('profilePrizeFundPercentage');
                    if (prizeFundName) console.log('Financial pane - prizeFundName value:', prizeFundName.value);
                    if (prizeFundPercent) console.log('Financial pane - prizeFundPercent value:', prizeFundPercent.value);
                }, 50);
            }
            if (p.id === 'sanction-pane') {
                setTimeout(() => {
                    const sanctionFeeName = document.getElementById('profileSanctionFeeName');
                    const sanctionFeeAmount = document.getElementById('profileSanctionFeeAmount');
                    if (sanctionFeeName) console.log('Sanction pane - sanctionFeeName value:', sanctionFeeName.value);
                    if (sanctionFeeAmount) console.log('Sanction pane - sanctionFeeAmount value:', sanctionFeeAmount.value);
                }, 50);
            }
            } else {
                p.classList.remove('show', 'active');
                p.style.display = 'none';
                p.style.visibility = 'hidden';
                p.setAttribute('aria-hidden', 'true');
                
                // Clean up subscription content from hidden tabs (but don't break other content)
                if (p.id !== 'subscription-pane') {
                    // Only remove subscription-specific elements
                    const subscriptionInfo = p.querySelector('#subscriptionInfo');
                    if (subscriptionInfo) {
                        console.warn(`🧹 Removing subscriptionInfo from hidden tab: ${p.id}`);
                        subscriptionInfo.remove();
                    }
                    const availablePlans = p.querySelector('#availablePlans');
                    if (availablePlans) {
                        console.warn(`🧹 Removing availablePlans from hidden tab: ${p.id}`);
                        availablePlans.remove();
                    }
                } else {
                    // If hiding subscription-pane, DON'T clear content - just hide it
                    // Clearing would break the subscription tab when you switch back
                }
            }
    });
    
    // Update tab button states
    const targetTabId = paneMap[paneId];
    if (targetTabId) {
        tabButtons.forEach(btn => {
            const isActive = btn.id === targetTabId;
            if (isActive) {
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            }
        });
    }
    
    // Scroll modal dialog to top
    const dialog = content.closest('.modal-dialog');
    if (dialog) dialog.scrollTop = 0;
    
    // Re-populate fields when switching tabs to ensure data is visible
    if (_profileModalData && _profileModalData.operator) {
        const operator = _profileModalData.operator;
        console.log('Re-populating fields for tab:', paneId);
        
        // Always re-populate all fields when switching tabs to ensure they're visible
        setTimeout(() => {
            // Profile fields
            const nameEl = document.getElementById('profileName');
            const emailEl = document.getElementById('profileEmail');
            const orgNameEl = document.getElementById('profileOrganizationName');
            const phoneEl = document.getElementById('profilePhone');
            if (nameEl) nameEl.value = operator.name || '';
            if (emailEl) emailEl.value = operator.email || '';
            if (orgNameEl) orgNameEl.value = operator.organization_name || '';
            if (phoneEl) phoneEl.value = operator.phone || '';
            
            // Financial fields
            // Default Dues field
            const defaultDuesEl = document.getElementById('profileDefaultDues');
            if (defaultDuesEl) {
                defaultDuesEl.value = operator.default_dues_per_player_per_match || operator.defaultDuesPerPlayerPerMatch || '';
            }
            
            // Calculation method - SIMPLE: just read from database
            let useDollarAmountsValue = false;
            if (operator.use_dollar_amounts !== undefined && operator.use_dollar_amounts !== null) {
                useDollarAmountsValue = operator.use_dollar_amounts === true || operator.use_dollar_amounts === 'true' || operator.use_dollar_amounts === 1;
            } else if (operator.useDollarAmounts !== undefined && operator.useDollarAmounts !== null) {
                useDollarAmountsValue = operator.useDollarAmounts === true || operator.useDollarAmounts === 'true' || operator.useDollarAmounts === 1;
            }
            
            console.log('Tab switch: Setting calculation method, useDollarAmountsValue:', useDollarAmountsValue, 'from operator.use_dollar_amounts:', operator.use_dollar_amounts);
            
            // CRITICAL: Set the saved value FIRST so toggleCalculationMethod knows what the saved state is
            _savedUseDollarAmounts = useDollarAmountsValue;
            
            const methodPercentageRadio = document.getElementById('methodPercentage');
            const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
            if (methodPercentageRadio && methodDollarAmountRadio) {
                if (useDollarAmountsValue) {
                    methodDollarAmountRadio.checked = true;
                    console.log('Tab switch: Set method to: Dollar amount-based');
                } else {
                    methodPercentageRadio.checked = true;
                    console.log('Tab switch: Set method to: Percentage-based');
                }
                // Trigger toggle to show/hide the correct inputs
                if (typeof toggleCalculationMethod === 'function') {
                    console.log('Tab switch: Calling toggleCalculationMethod()');
                    toggleCalculationMethod();
                } else {
                    console.error('Tab switch: toggleCalculationMethod function not found!');
                }
            } else {
                console.error('Tab switch: Radio buttons not found!');
            }
            
            const prizeFundNameEl = document.getElementById('profilePrizeFundName');
            const prizeFundPercentEl = document.getElementById('profilePrizeFundPercentage');
            const prizeFundAmountEl = document.getElementById('profilePrizeFundAmount');
            if (prizeFundNameEl) prizeFundNameEl.value = operator.prize_fund_name || operator.prizeFundName || 'Prize Fund';
            if (prizeFundPercentEl) prizeFundPercentEl.value = operator.prize_fund_percentage || operator.prizeFundPercentage || 50.0;
            if (prizeFundAmountEl) prizeFundAmountEl.value = operator.prize_fund_amount || operator.prizeFundAmount || '';
            
            // Prize Fund Amount Type
            const prizeFundPerTeamRadio = document.getElementById('prizeFundPerTeam');
            const prizeFundPerPlayerRadio = document.getElementById('prizeFundPerPlayer');
            const prizeFundAmountType = operator.prize_fund_amount_type || operator.prizeFundAmountType || 'perTeam';
            if (prizeFundAmountType === 'perPlayer' && prizeFundPerPlayerRadio) {
                prizeFundPerPlayerRadio.checked = true;
            } else if (prizeFundPerTeamRadio) {
                prizeFundPerTeamRadio.checked = true;
            }
            
            const firstOrgNameEl = document.getElementById('profileFirstOrganizationName');
            const firstOrgNameDollarEl = document.getElementById('profileFirstOrganizationNameDollar');
            const firstOrgPercentEl = document.getElementById('profileFirstOrganizationPercentage');
            const firstOrgAmountEl = document.getElementById('profileFirstOrganizationAmount');
            const firstOrgNameValue = operator.first_organization_name || operator.firstOrganizationName || operator.league_manager_name || 'League Manager';
            if (firstOrgNameEl) firstOrgNameEl.value = firstOrgNameValue;
            if (firstOrgNameDollarEl) firstOrgNameDollarEl.value = firstOrgNameValue;
            if (firstOrgPercentEl) firstOrgPercentEl.value = operator.first_organization_percentage || operator.league_manager_percentage || operator.leagueManagerPercentage || 60.0;
            if (firstOrgAmountEl) firstOrgAmountEl.value = operator.first_organization_amount || operator.firstOrganizationAmount || '';
            
            // First Organization Amount Type
            const firstOrgPerTeamRadio = document.getElementById('firstOrgPerTeam');
            const firstOrgPerPlayerRadio = document.getElementById('firstOrgPerPlayer');
            const firstOrgAmountType = operator.first_organization_amount_type || operator.firstOrganizationAmountType || 'perTeam';
            if (firstOrgAmountType === 'perPlayer' && firstOrgPerPlayerRadio) {
                firstOrgPerPlayerRadio.checked = true;
            } else if (firstOrgPerTeamRadio) {
                firstOrgPerTeamRadio.checked = true;
            }
            
            const secondOrgNameEl = document.getElementById('profileSecondOrganizationName');
            const secondOrgNameDollarEl = document.getElementById('profileSecondOrganizationNameDollar');
            const secondOrgPercentEl = document.getElementById('profileSecondOrganizationPercentage');
            const secondOrgAmountEl = document.getElementById('profileSecondOrganizationAmount');
            const secondOrgNameValue = operator.second_organization_name || operator.secondOrganizationName || operator.usa_pool_league_name || 'Parent/National Organization';
            if (secondOrgNameEl) secondOrgNameEl.value = secondOrgNameValue;
            if (secondOrgNameDollarEl) secondOrgNameDollarEl.value = secondOrgNameValue;
            if (secondOrgPercentEl) secondOrgPercentEl.value = operator.second_organization_percentage || operator.usa_pool_league_percentage || operator.usaPoolLeaguePercentage || 40.0;
            if (secondOrgAmountEl) secondOrgAmountEl.value = operator.second_organization_amount || operator.secondOrganizationAmount || '';
            
            // Second Organization Amount Type
            const secondOrgPerTeamRadio = document.getElementById('secondOrgPerTeam');
            const secondOrgPerPlayerRadio = document.getElementById('secondOrgPerPlayer');
            const secondOrgAmountType = operator.second_organization_amount_type || operator.secondOrganizationAmountType || 'perTeam';
            if (secondOrgAmountType === 'perPlayer' && secondOrgPerPlayerRadio) {
                secondOrgPerPlayerRadio.checked = true;
            } else if (secondOrgPerTeamRadio) {
                secondOrgPerTeamRadio.checked = true;
            }
            
            // Combine prize fund and national org in one payment
            const combineCheckEl = document.getElementById('profileCombinePrizeAndNationalCheck');
            if (combineCheckEl) {
                const fromOperator = operator.combine_prize_and_national_check === true || operator.combine_prize_and_national_check === 'true' || operator.combinePrizeAndNationalCheck === true;
                const fromCurrent = typeof currentOperator !== 'undefined' && currentOperator && (currentOperator.combine_prize_and_national_check === true || currentOperator.combine_prize_and_national_check === 'true' || currentOperator.combinePrizeAndNationalCheck === true);
                combineCheckEl.checked = fromOperator || fromCurrent;
            }
            
            // Sanction fields
            const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
            const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
            const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
            if (sanctionFeeNameEl) sanctionFeeNameEl.value = operator.sanction_fee_name || 'Sanction Fee';
            if (sanctionFeeAmountEl) sanctionFeeAmountEl.value = operator.sanction_fee_amount || 25.00;
            if (sanctionFeePayoutAmountEl) sanctionFeePayoutAmountEl.value = operator.sanction_fee_payout_amount || 20.00;
        }, 50);
    }
    
    // Clean up subscription content from other tabs when switching (already done above, but do it again for safety)
    if (paneId !== 'subscription-pane') {
        cleanSubscriptionContentFromOtherTabs();
    }
    
    // Load subscription info if switching to subscription pane
    if (paneId === 'subscription-pane') {
        console.log('📋 Switching to subscription-pane');
        
        // FIRST: Aggressively clean subscription content from ALL other tabs
        cleanSubscriptionContentFromOtherTabs();
        
        // THEN: Ensure subscription-pane has show and active classes
        const subscriptionPane = document.getElementById('subscription-pane');
        if (subscriptionPane) {
            subscriptionPane.classList.add('show', 'active');
            subscriptionPane.style.display = 'block';
            subscriptionPane.style.visibility = 'visible';
            subscriptionPane.removeAttribute('aria-hidden');
            console.log('✅ Forced subscription-pane to show, classes:', subscriptionPane.className);
        }
        
        // Ensure other tabs are hidden
        const otherTabs = ['profile-pane', 'financial-pane', 'sanction-pane'];
        otherTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) {
                tab.classList.remove('show', 'active');
                tab.style.display = 'none';
                tab.style.visibility = 'hidden';
                tab.setAttribute('aria-hidden', 'true');
            }
        });
        
        // Clean again after ensuring visibility
        setTimeout(() => cleanSubscriptionContentFromOtherTabs(), 50);
        
        const sub = document.getElementById('subscriptionInfo');
        
        console.log('📋 subscriptionInfo exists:', !!sub);
        console.log('📋 subscriptionPane exists:', !!subscriptionPane);
        
        // Ensure subscriptionInfo is in subscription-pane
        if (sub && subscriptionPane && !subscriptionPane.contains(sub)) {
            console.warn('⚠️ subscriptionInfo not in subscription-pane! Moving it...');
            sub.remove();
            subscriptionPane.appendChild(sub);
        }
        
        const hasContent = sub && sub.innerHTML && sub.innerHTML.length > 200 && !sub.innerHTML.includes('Loading subscription information');
        console.log('📋 Has subscription content:', hasContent, 'Content length:', sub?.innerHTML?.length || 0);
        
        // ALWAYS load subscription info when subscription tab is clicked (don't rely on pending HTML)
        if (!hasContent) {
            console.log('📦 Loading subscription info for subscription tab');
            // Show loading spinner
            if (sub) {
                sub.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-muted mt-3">Loading subscription information...</p>
                    </div>
                `;
            }
            // Load subscription info
            if (_profileModalData) {
                loadSubscriptionInfo(_profileModalData).catch(e => console.error('Failed to load subscription info:', e));
            } else if (currentOperator) {
                loadSubscriptionInfo({ operator: currentOperator }).catch(e => console.error('Failed to load subscription info:', e));
            }
        } else {
            console.log('📋 Has content, verifying plans');
            // Has content, but verify plans are loaded
            setTimeout(() => {
                const plansDiv = document.getElementById('availablePlans');
                console.log('📋 Plans div check:', !!plansDiv, 'Length:', plansDiv?.innerHTML?.length || 0);
                if (plansDiv && (plansDiv.innerHTML.length < 100 || plansDiv.innerHTML.includes('Loading'))) {
                    // Plans div exists but is empty or just has spinner, try to load
                    const subscriptionStatus = window._pendingSubscriptionStatus || {};
                    const actualTier = subscriptionStatus.tier || 'free';
                    console.log('📦 Plans div exists but empty, loading plans for tier:', actualTier);
                    loadAvailablePlans(actualTier).catch(e => console.error('Failed to load plans:', e));
                }
            }, 200);
        }
    }
}
