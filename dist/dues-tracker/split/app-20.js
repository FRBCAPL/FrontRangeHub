function openPaymentModalFromHistory(teamId, week) {
    const paymentHistoryModalElement = document.getElementById('paymentHistoryModal');
    if (!paymentHistoryModalElement) {
        showWeeklyPaymentModal(teamId, week);
        return;
    }

    const openWeekly = () => {
        showWeeklyPaymentModal(teamId, week);
    };

    const instance = bootstrap.Modal.getInstance(paymentHistoryModalElement);
    if (instance) {
        paymentHistoryModalElement.addEventListener('hidden.bs.modal', openWeekly, { once: true });
        instance.hide();
    } else {
        // No instance (e.g. opened differently): hide via getOrCreateInstance, then open weekly
        const modal = bootstrap.Modal.getOrCreateInstance(paymentHistoryModalElement);
        paymentHistoryModalElement.addEventListener('hidden.bs.modal', openWeekly, { once: true });
        modal.hide();
    }
}

async function saveWeeklyPayment() {
    const paidEl = document.querySelector('input[name="weeklyPaid"]:checked');
    if (!paidEl) {
        showAlertModal('You are required to select a payment status (Paid, Bye week, Make up, or Unpaid) to save the payment.', 'warning', 'Payment Status Required');
        return;
    }
    const paid = paidEl.value;
    const paymentMethod = document.getElementById('weeklyPaymentMethod').value;
    const paymentDateInput = document.getElementById('weeklyPaymentDate');
    const paymentDate = paymentDateInput ? paymentDateInput.value : null; // Get date from input
    const amountSelect = document.getElementById('weeklyPaymentAmount');
    const amountRaw = amountSelect ? amountSelect.value : '';
    
    // If marked as paid, require a dues amount
    if (paid === 'true') {
        if (!amountRaw || isNaN(parseFloat(amountRaw)) || parseFloat(amountRaw) <= 0) {
            showAlertModal('Please select the dues amount paid for this week.', 'warning', 'Amount Required');
            if (amountSelect) {
                amountSelect.focus();
            }
            return;
        }
    }
    
    const amount = parseFloat(amountRaw || '0') || 0;
    const notes = document.getElementById('weeklyPaymentNotes').value;
    
    // Check if amount changed when editing an existing payment
    const isEditing = originalPaymentAmount !== null;
    const amountChanged = isEditing && Math.abs(amount - originalPaymentAmount) > 0.01; // Allow small rounding differences
    
    // Show appropriate message based on whether amount changed
    if (isEditing) {
        if (amountChanged) {
            // Amount changed - show warning that it will be recalculated (blocking)
            const confirmed = confirm('⚠️ WARNING: You are changing the payment amount.\n\nThis will recalculate totals and may affect financial reports.\n\nDo you want to continue?');
            if (!confirmed) {
                return; // User cancelled
            }
        } else {
            // Amount unchanged - inform user it won't affect calculations (non-blocking info)
            showAlertModal(
                'The payment amount has not changed. This edit will not affect calculations because the payment amount remains the same. Other changes (notes, payment method, etc.) will be saved.',
                'info',
                'Edit Notice'
            );
            // Continue with save (don't block)
        }
    }
    
    // Get "Paid By" player (required for non-cash payments)
    const paidByEl = document.getElementById('paidByPlayer');
    const paidBy = paidByEl ? paidByEl.value : '';
    const isCash = paymentMethod === 'cash';
    
    // Validate "Paid By" for non-cash payments
    if (!isCash && !paidBy) {
        showAlertModal('Please select which player made this payment. This is required for non-cash payment methods.', 'warning', 'Player Required');
        if (paidByEl) {
            paidByEl.focus();
        }
        return;
    }
    
    console.log('💾 Saving weekly payment - paymentDate:', paymentDate, 'paid:', paid, 'paidBy:', paidBy);
    
    // Collect selected sanction fee players
    const selectedBCAPlayers = [];
    const bcaCheckboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]:checked');
    bcaCheckboxes.forEach(checkbox => {
        selectedBCAPlayers.push(checkbox.value);
    });
    
    // Collect individual player payments only when toggle is on (they count toward this week's dues)
    const individualPayments = [];
    const enableIndividual = document.getElementById('enableIndividualPayments');
    if (enableIndividual && enableIndividual.checked) {
        const individualPaymentInputs = document.querySelectorAll('input[name="individualPayment"]');
        individualPaymentInputs.forEach(input => {
            const playerName = input.dataset.player;
            const paymentAmount = parseFloat(input.value) || 0;
            if (paymentAmount > 0 && playerName) {
                individualPayments.push({
                    playerName: playerName,
                    amount: paymentAmount
                });
            }
        });
    }

    try {
        const response = await apiCall(`/teams/${currentWeeklyPaymentTeamId}/weekly-payment`, {
            method: 'POST',
            body: JSON.stringify({
                week: currentWeeklyPaymentWeek,
                paid,
                paymentMethod,
                paymentDate: paymentDate || null, // Send payment date if provided, otherwise null (backend will handle)
                amount,
                notes,
                paidBy: paidBy || undefined, // Include paidBy if provided (optional for cash, required for others)
                bcaSanctionPlayers: selectedBCAPlayers,
                individualPayments: individualPayments.length > 0 ? individualPayments : undefined
            })
        });
        
        if (response.ok) {
            // Update global player status for players marked as paid in this payment
            // Since they're paying through weekly payment, mark as "Paid" (counts in totals)
            // This is different from the players modal where we ask - weekly payment = they're paying now
            if (paid === 'true' && selectedBCAPlayers && selectedBCAPlayers.length > 0) {
                for (const playerName of selectedBCAPlayers) {
                    try {
                        const normalizedName = playerName.trim();
                        // Mark as paid and clear previously sanctioned (since they're paying through weekly payment)
                        await apiCall(`/players/${encodeURIComponent(normalizedName)}/status`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                bcaSanctionPaid: true,
                                previouslySanctioned: false // Clear if they were marked as previously sanctioned
                            })
                        });
                    } catch (error) {
                        console.warn(`Failed to update global status for player "${playerName}":`, error);
                    }
                }
            }
            
            // Show success message in modal
            const successDiv = document.getElementById('weeklyPaymentSuccess');
            const successMessage = document.getElementById('weeklyPaymentSuccessMessage');
            const form = document.getElementById('weeklyPaymentForm');
            
            if (form) form.style.display = 'none';
            if (successDiv) {
                successDiv.classList.remove('d-none');
                if (successMessage) successMessage.textContent = 'Weekly payment saved successfully!';
            }
            
            const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
            if (modalFooter) modalFooter.style.display = 'none';
            
            const saveButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-success');
            const cancelButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-secondary');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.style.display = 'none';
            }
            if (cancelButton) cancelButton.style.display = 'none';
            
            const divisionFilterEl = document.getElementById('divisionFilter');
            const currentDivisionFilter = divisionFilterEl ? divisionFilterEl.value : 'all';
            
            loadData().then(() => {
                if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                    const df = document.getElementById('divisionFilter');
                    if (df) {
                        df.value = currentDivisionFilter;
                        if (typeof filterTeamsByDivision === 'function') filterTeamsByDivision();
                    }
                }
            });
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating weekly payment');
        }
    } catch (error) {
        alert('Error updating weekly payment. Please try again.');
    }
}

// Profile & Settings Functions

/** Manual tab switch for Profile & Settings modal (avoids Bootstrap tab visibility issues). */
let _profileModalData = null;
let _profileTabListenersSetup = false;

// Function to aggressively clean subscription content from non-subscription tabs
function cleanSubscriptionContentFromOtherTabs() {
    const subscriptionPane = document.getElementById('subscription-pane');
    const nonSubscriptionTabs = ['profile-pane', 'financial-pane', 'sanction-pane'];
    
    // FIRST: Ensure subscription-pane is the ONLY place with subscription content
    // Remove subscriptionInfo and availablePlans from ANYWHERE except subscription-pane
    const allSubscriptionInfo = document.querySelectorAll('#subscriptionInfo');
    const allAvailablePlans = document.querySelectorAll('#availablePlans');
    
    allSubscriptionInfo.forEach(el => {
        if (!subscriptionPane || !subscriptionPane.contains(el)) {
            console.warn(`🧹 Removing subscriptionInfo from wrong location:`, el.parentElement?.id || 'unknown');
            el.remove();
        }
    });
    
    allAvailablePlans.forEach(el => {
        if (!subscriptionPane || !subscriptionPane.contains(el)) {
            console.warn(`🧹 Removing availablePlans from wrong location:`, el.parentElement?.id || 'unknown');
            el.remove();
        }
    });
    
    // Now clean each non-subscription tab - ONLY remove subscription-specific elements
    nonSubscriptionTabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (!tab) return;
        
        // DON'T hide tabs here - that's handled by the tab switching logic
        // Only remove subscription-specific content
        
        // Remove subscriptionInfo div (should never be in other tabs)
        const subscriptionInfo = tab.querySelector('#subscriptionInfo');
        if (subscriptionInfo) {
            console.warn(`🧹 Removing subscriptionInfo from ${tabId}`);
            subscriptionInfo.remove();
        }
        
        // Remove availablePlans div (should never be in other tabs)
        const availablePlans = tab.querySelector('#availablePlans');
        if (availablePlans) {
            console.warn(`🧹 Removing availablePlans from ${tabId}`);
            availablePlans.remove();
        }
        
        // Remove subscription cards - but be VERY specific to avoid removing legitimate cards
        const allCards = tab.querySelectorAll('.card');
        allCards.forEach(card => {
            // Skip if card is in subscription-pane (shouldn't happen, but double-check)
            if (subscriptionPane && subscriptionPane.contains(card)) {
                return;
            }
            
            // Only remove if it has VERY specific subscription indicators
            const hasSubscriptionHeader = card.querySelector('.subscription-plan-header');
            const hasAvailablePlansDiv = card.querySelector('#availablePlans');
            const hasSubscriptionInfoDiv = card.querySelector('#subscriptionInfo');
            
            // Check text content for subscription-specific phrases (be very specific)
            const cardText = card.textContent || '';
            const hasUsageLimits = cardText.includes('Usage & Limits') && cardText.includes('teams') && cardText.includes('divisions');
            const hasUpgradePlans = cardText.includes('Available Upgrade Plans') || cardText.includes('Upgrade Your Plan');
            const hasTrialInfo = cardText.includes('Trial Active') || cardText.includes('30-Day Enterprise Trial');
            
            // Only remove if it's clearly a subscription card
            if (hasSubscriptionHeader || hasAvailablePlansDiv || hasSubscriptionInfoDiv || 
                (hasUsageLimits && hasUpgradePlans) || hasTrialInfo) {
                console.warn(`🧹 Removing subscription card from ${tabId}`);
                card.remove();
            }
        });
        
        // Remove subscription-plan-header divs
        const subscriptionDivs = tab.querySelectorAll('.subscription-plan-header');
        subscriptionDivs.forEach(div => {
            if (!subscriptionPane || !subscriptionPane.contains(div)) {
                console.warn(`🧹 Removing subscription div from ${tabId}`);
                div.remove();
            }
        });
    });
}

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

async function showProfileModal() {
    console.log('showProfileModal called');
    const modalElement = document.getElementById('profileModal');
    if (!modalElement) {
        console.error('profileModal element not found');
        return;
    }
    
    try {
        // Load current profile data
        const response = await apiCall('/profile');
        if (!response.ok) {
            throw new Error('Failed to load profile');
        }
        
        const data = await response.json();
        console.log('Profile API response:', data);
        const operator = data.operator || currentOperator;
        
        if (!operator) {
            console.error('No operator data found in response');
            return;
        }
        
        console.log('Loading operator data:', operator);
        console.log('Operator fields:', {
            name: operator.name,
            email: operator.email,
            organization_name: operator.organization_name,
            phone: operator.phone,
            prize_fund_name: operator.prize_fund_name,
            prize_fund_percentage: operator.prize_fund_percentage,
            prize_fund_amount: operator.prize_fund_amount,
            default_dues_per_player_per_match: operator.default_dues_per_player_per_match,
            use_dollar_amounts: operator.use_dollar_amounts,
            first_organization_name: operator.first_organization_name,
            first_organization_percentage: operator.first_organization_percentage,
            first_organization_amount: operator.first_organization_amount,
            second_organization_name: operator.second_organization_name,
            second_organization_percentage: operator.second_organization_percentage,
            second_organization_amount: operator.second_organization_amount,
            sanction_fee_name: operator.sanction_fee_name,
            sanction_fee_amount: operator.sanction_fee_amount
        });
        
        if (operator) {
            // Populate form fields
            const nameEl = document.getElementById('profileName');
            const emailEl = document.getElementById('profileEmail');
            const orgNameEl = document.getElementById('profileOrganizationName');
            const phoneEl = document.getElementById('profilePhone');
            
            if (nameEl) {
                nameEl.value = operator.name || '';
                console.log('Set profileName to:', nameEl.value);
            } else {
                console.error('profileName element not found');
            }
            
            if (emailEl) {
                emailEl.value = operator.email || '';
                console.log('Set profileEmail to:', emailEl.value);
            } else {
                console.error('profileEmail element not found');
            }
            
            if (orgNameEl) {
                orgNameEl.value = operator.organization_name || '';
                console.log('Set profileOrganizationName to:', orgNameEl.value);
            } else {
                console.error('profileOrganizationName element not found');
            }
            
            if (phoneEl) {
                phoneEl.value = operator.phone || '';
                console.log('Set profilePhone to:', phoneEl.value);
            } else {
                console.warn('profilePhone element not found (may be optional)');
            }
            
            // Populate default dues field
            const defaultDuesInput = document.getElementById('profileDefaultDues');
            if (defaultDuesInput) {
                const defaultDuesValue = operator.default_dues_per_player_per_match || operator.defaultDuesPerPlayerPerMatch || '';
                defaultDuesInput.value = defaultDuesValue;
                console.log('Set profileDefaultDues to:', defaultDuesValue, 'from operator:', operator.default_dues_per_player_per_match);
            } else {
                console.error('profileDefaultDues element not found');
            }

            // Theme toggle (local setting)
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.checked = getEffectiveTheme() === 'dark';
            }
            
            // Populate sanction fee toggle and fields
            const sanctionFeesEnabledEl = document.getElementById('profileSanctionFeesEnabled');
            if (sanctionFeesEnabledEl) {
                // If sanction_fees_enabled is explicitly set, use it
                // Otherwise, default to true if sanction_fee_amount is set (backward compatibility)
                let isEnabled = false;
                if (operator.sanction_fees_enabled !== undefined && operator.sanction_fees_enabled !== null) {
                    isEnabled = operator.sanction_fees_enabled === true || operator.sanction_fees_enabled === 'true';
                } else {
                    // Backward compatibility: if they have a sanction fee amount set, default to enabled
                    const hasAmount = operator.sanction_fee_amount && parseFloat(operator.sanction_fee_amount) > 0;
                    isEnabled = hasAmount;
                }
                sanctionFeesEnabledEl.checked = isEnabled;
                // Add event listener to toggle visibility of sanction fee settings
                // Remove any existing listeners first
                const newToggle = sanctionFeesEnabledEl.cloneNode(true);
                sanctionFeesEnabledEl.parentNode.replaceChild(newToggle, sanctionFeesEnabledEl);
                
                const updatedToggle = document.getElementById('profileSanctionFeesEnabled');
                updatedToggle.addEventListener('change', function() {
                    const container = document.getElementById('sanctionFeeSettingsContainer');
                    if (container) {
                        container.style.display = this.checked ? '' : 'none';
                    }
                    // Also update the global UI visibility - checked means enabled, so show UI
                    const isEnabled = this.checked;
                    sanctionFeesEnabled = isEnabled;
                    toggleSanctionFeeUI(isEnabled);
                });
                // Set initial visibility
                const container = document.getElementById('sanctionFeeSettingsContainer');
                if (container) {
                    container.style.display = updatedToggle.checked ? '' : 'none';
                }
                // Set initial UI visibility - checked means enabled, so show UI
                const initialEnabled = updatedToggle.checked;
                sanctionFeesEnabled = initialEnabled;
                toggleSanctionFeeUI(initialEnabled);
            }
            
            console.log('Populating sanction fee fields...');
            const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
            const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
            const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
            
            const sanctionFeeNameValue = operator.sanction_fee_name || 'Sanction Fee';
            const sanctionFeeAmountValue = operator.sanction_fee_amount || 25.00;
            const sanctionFeePayoutAmountValue = operator.sanction_fee_payout_amount || 20.00;
            
            if (sanctionFeeNameEl) {
                sanctionFeeNameEl.value = sanctionFeeNameValue;
                console.log('Set profileSanctionFeeName to:', sanctionFeeNameValue);
            } else {
                console.error('profileSanctionFeeName element not found');
            }
            
            if (sanctionFeeAmountEl) {
                sanctionFeeAmountEl.value = sanctionFeeAmountValue;
                console.log('Set profileSanctionFeeAmount to:', sanctionFeeAmountValue);
            } else {
                console.error('profileSanctionFeeAmount element not found');
            }
            
            if (sanctionFeePayoutAmountEl) {
                sanctionFeePayoutAmountEl.value = sanctionFeePayoutAmountValue;
                console.log('Set profileSanctionFeePayoutAmount to:', sanctionFeePayoutAmountValue);
            } else {
                console.error('profileSanctionFeePayoutAmount element not found');
            }
            
            // Set calculation method (percentage or dollar amount) - SIMPLE: just read from database
            let useDollarAmountsValue = false;
            if (operator.use_dollar_amounts !== undefined && operator.use_dollar_amounts !== null) {
                useDollarAmountsValue = operator.use_dollar_amounts === true || operator.use_dollar_amounts === 'true' || operator.use_dollar_amounts === 1;
            } else if (operator.useDollarAmounts !== undefined && operator.useDollarAmounts !== null) {
                useDollarAmountsValue = operator.useDollarAmounts === true || operator.useDollarAmounts === 'true' || operator.useDollarAmounts === 1;
            }
            
            console.log('Loading calculation method from database:', {
                use_dollar_amounts: operator.use_dollar_amounts,
                resolved: useDollarAmountsValue
            });
            
            _savedUseDollarAmounts = useDollarAmountsValue;
            const methodPercentageRadio = document.getElementById('methodPercentage');
            const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
            if (methodPercentageRadio && methodDollarAmountRadio) {
                if (useDollarAmountsValue) {
                    methodDollarAmountRadio.checked = true;
                    console.log('Set radio to: Dollar amount-based');
                } else {
                    methodPercentageRadio.checked = true;
                    console.log('Set radio to: Percentage-based');
                }
                // CRITICAL: Call toggleCalculationMethod AFTER setting radio and _savedUseDollarAmounts
                toggleCalculationMethod(); // Show/hide inputs, update Active format & "Save to change" message
            } else {
                console.error('Radio buttons not found for calculation method!');
            }
            
            // Populate financial breakdown fields (with backward compatibility)
            console.log('Populating financial breakdown fields...');
            const prizeFundNameEl = document.getElementById('profilePrizeFundName');
            const prizeFundPercentEl = document.getElementById('profilePrizeFundPercentage');
            const prizeFundAmountEl = document.getElementById('profilePrizeFundAmount');
            
            if (!prizeFundNameEl) console.error('profilePrizeFundName element not found');
            if (!prizeFundPercentEl) console.error('profilePrizeFundPercentage element not found');
            if (!prizeFundAmountEl) console.error('profilePrizeFundAmount element not found');
            const prizeFundPerTeamRadio = document.getElementById('prizeFundPerTeam');
            const prizeFundPerPlayerRadio = document.getElementById('prizeFundPerPlayer');
            
            const firstOrgNameEl = document.getElementById('profileFirstOrganizationName');
            const firstOrgNameDollarEl = document.getElementById('profileFirstOrganizationNameDollar');
            const firstOrgPercentEl = document.getElementById('profileFirstOrganizationPercentage');
            const firstOrgAmountEl = document.getElementById('profileFirstOrganizationAmount');
            const firstOrgPerTeamRadio = document.getElementById('firstOrgPerTeam');
            const firstOrgPerPlayerRadio = document.getElementById('firstOrgPerPlayer');
            
            const secondOrgNameEl = document.getElementById('profileSecondOrganizationName');
            const secondOrgNameDollarEl = document.getElementById('profileSecondOrganizationNameDollar');
            const secondOrgPercentEl = document.getElementById('profileSecondOrganizationPercentage');
            const secondOrgAmountEl = document.getElementById('profileSecondOrganizationAmount');
            const secondOrgPerTeamRadio = document.getElementById('secondOrgPerTeam');
            const secondOrgPerPlayerRadio = document.getElementById('secondOrgPerPlayer');
            
            // Support both new and old field names for backward compatibility
            const prizeFundNameValue = operator.prize_fund_name || operator.prizeFundName || 'Prize Fund';
            const prizeFundPercentValue = operator.prize_fund_percentage || operator.prizeFundPercentage || 50.0;
            const prizeFundAmountValue = operator.prize_fund_amount || operator.prizeFundAmount || '';
            
            console.log('Financial fields from operator:', {
                prize_fund_name: operator.prize_fund_name,
                prize_fund_percentage: operator.prize_fund_percentage,
                prize_fund_amount: operator.prize_fund_amount,
                first_organization_amount: operator.first_organization_amount,
                second_organization_amount: operator.second_organization_amount,
                use_dollar_amounts: operator.use_dollar_amounts,
                prizeFundName: operator.prizeFundName,
                prizeFundPercentage: operator.prizeFundPercentage,
                prizeFundAmount: operator.prizeFundAmount,
                firstOrganizationAmount: operator.firstOrganizationAmount,
                secondOrganizationAmount: operator.secondOrganizationAmount,
                useDollarAmounts: operator.useDollarAmounts
            });
            console.log('Full operator object keys:', Object.keys(operator));
            
            if (prizeFundNameEl) {
                prizeFundNameEl.value = prizeFundNameValue;
                console.log('Set profilePrizeFundName to:', prizeFundNameValue);
            } else {
                console.error('profilePrizeFundName element not found');
            }
            if (prizeFundPercentEl) {
                prizeFundPercentEl.value = prizeFundPercentValue;
                console.log('Set profilePrizeFundPercentage to:', prizeFundPercentValue);
            } else {
                console.error('profilePrizeFundPercentage element not found');
            }
            if (prizeFundAmountEl) {
                prizeFundAmountEl.value = prizeFundAmountValue;
                console.log('Set profilePrizeFundAmount to:', prizeFundAmountValue, '(raw operator value:', operator.prize_fund_amount, operator.prizeFundAmount, ')');
            } else {
                console.error('profilePrizeFundAmount element not found');
            }
            const prizeFundAmountType = operator.prize_fund_amount_type || operator.prizeFundAmountType || 'perTeam';
            if (prizeFundAmountType === 'perPlayer' && prizeFundPerPlayerRadio) {
                prizeFundPerPlayerRadio.checked = true;
            } else if (prizeFundPerTeamRadio) {
                prizeFundPerTeamRadio.checked = true;
            }
            
            const firstOrgNameValue = operator.first_organization_name || operator.firstOrganizationName || 
                                      operator.league_manager_name || 'League Manager';
            if (firstOrgNameEl) {
                firstOrgNameEl.value = firstOrgNameValue;
                console.log('Set profileFirstOrganizationName to:', firstOrgNameValue);
            } else {
                console.error('profileFirstOrganizationName element not found');
            }
            if (firstOrgNameDollarEl) {
                firstOrgNameDollarEl.value = firstOrgNameValue;
                console.log('Set profileFirstOrganizationNameDollar to:', firstOrgNameValue);
            } else {
                console.warn('profileFirstOrganizationNameDollar element not found (may be optional)');
            }
            
            const firstOrgPercentValue = operator.first_organization_percentage || 
                                        operator.league_manager_percentage || operator.leagueManagerPercentage || 60.0;
            if (firstOrgPercentEl) {
                firstOrgPercentEl.value = firstOrgPercentValue;
                console.log('Set profileFirstOrganizationPercentage to:', firstOrgPercentValue);
            } else {
                console.error('profileFirstOrganizationPercentage element not found');
            }
            
            const firstOrgAmountValue = operator.first_organization_amount || operator.firstOrganizationAmount || '';
            if (firstOrgAmountEl) {
                firstOrgAmountEl.value = firstOrgAmountValue;
                console.log('Set profileFirstOrganizationAmount to:', firstOrgAmountValue);
            } else {
                console.warn('profileFirstOrganizationAmount element not found (may be optional)');
            }
            const firstOrgAmountType = operator.first_organization_amount_type || operator.firstOrganizationAmountType || 'perTeam';
            if (firstOrgAmountType === 'perPlayer' && firstOrgPerPlayerRadio) {
                firstOrgPerPlayerRadio.checked = true;
            } else if (firstOrgPerTeamRadio) {
                firstOrgPerTeamRadio.checked = true;
            }
            
            const secondOrgNameValue = operator.second_organization_name || operator.secondOrganizationName || 
                                      operator.usa_pool_league_name || 'Parent/National Organization';
            if (secondOrgNameEl) {
                secondOrgNameEl.value = secondOrgNameValue;
                console.log('Set profileSecondOrganizationName to:', secondOrgNameValue);
            } else {
                console.error('profileSecondOrganizationName element not found');
            }
            if (secondOrgNameDollarEl) {
                secondOrgNameDollarEl.value = secondOrgNameValue;
                console.log('Set profileSecondOrganizationNameDollar to:', secondOrgNameValue);
            } else {
                console.warn('profileSecondOrganizationNameDollar element not found (may be optional)');
            }
            
            const secondOrgPercentValue = operator.second_organization_percentage || 
                                         operator.usa_pool_league_percentage || operator.usaPoolLeaguePercentage || 40.0;
            if (secondOrgPercentEl) {
                secondOrgPercentEl.value = secondOrgPercentValue;
                console.log('Set profileSecondOrganizationPercentage to:', secondOrgPercentValue);
            } else {
                console.error('profileSecondOrganizationPercentage element not found');
            }
            
            const secondOrgAmountValue = operator.second_organization_amount || operator.secondOrganizationAmount || '';
            if (secondOrgAmountEl) {
                secondOrgAmountEl.value = secondOrgAmountValue;
                console.log('Set profileSecondOrganizationAmount to:', secondOrgAmountValue);
            } else {
                console.warn('profileSecondOrganizationAmount element not found (may be optional)');
            }
            const secondOrgAmountType = operator.second_organization_amount_type || operator.secondOrganizationAmountType || 'perTeam';
            if (secondOrgAmountType === 'perPlayer' && secondOrgPerPlayerRadio) {
                secondOrgPerPlayerRadio.checked = true;
            } else if (secondOrgPerTeamRadio) {
                secondOrgPerTeamRadio.checked = true;
            }
            
            // Update dynamic labels
            updateFinancialBreakdownFormLabels();
            
            // Update profit display and add event listeners for real-time calculation
            updateSanctionFeeProfitDisplay();
            if (sanctionFeeAmountEl) {
                sanctionFeeAmountEl.removeEventListener('input', updateSanctionFeeProfitDisplay);
                sanctionFeeAmountEl.addEventListener('input', updateSanctionFeeProfitDisplay);
            }
            if (sanctionFeePayoutAmountEl) {
                sanctionFeePayoutAmountEl.removeEventListener('input', updateSanctionFeeProfitDisplay);
                sanctionFeePayoutAmountEl.addEventListener('input', updateSanctionFeeProfitDisplay);
            }
            
            // Hide error/success messages
            document.getElementById('profileError').classList.add('hidden');
            document.getElementById('profileSuccess').classList.add('hidden');
        }
        
        // DON'T load subscription info here - only load when subscription tab is clicked
        // This prevents subscription content from appearing in other tabs
        console.log('📦 Subscription info will load when subscription tab is clicked');
        
        _profileModalData = data;
        // Ensure listeners are set up (will no-op if already done)
        try {
            if (typeof setupProfileSettingsTabListeners === 'function') {
                setupProfileSettingsTabListeners();
            }
            // Set initial tab to profile-pane
            if (typeof switchProfileSettingsTab === 'function') {
                switchProfileSettingsTab('profile-pane');
            }
        } catch (e) {
            console.warn('Error setting up profile modal listeners:', e);
        }
        
        // Initialize tooltips before showing modal
        initializeProfileTooltips();
        
        // Show modal first, then ensure data is visible
        console.log('Attempting to show profileModal');
        showModal(modalElement);
        
        // Start periodic cleanup when modal opens
        startSubscriptionCleanup();
        
        // Stop cleanup when modal closes
        modalElement.addEventListener('hidden.bs.modal', function() {
            stopSubscriptionCleanup();
        }, { once: true });
        
        // Setup tab listeners after modal is shown (in case DOM wasn't ready)
        setTimeout(() => {
            // Event delegation is already set up on document level
            // Just ensure button is clickable (CSS should handle this, but double-check)
            const saveProfileButton = document.getElementById('saveProfileButton');
            if (saveProfileButton) {
                const computedStyle = window.getComputedStyle(saveProfileButton);
                // CRITICAL FIX: Force pointer-events to auto if it's none
                if (computedStyle.pointerEvents === 'none') {
                    saveProfileButton.style.pointerEvents = 'auto';
                }
                // Ensure button is not disabled
                if (saveProfileButton.disabled) {
                    saveProfileButton.disabled = false;
                }
            }
            
            // Initialize tooltips after modal is shown
            initializeProfileTooltips();
            
            if (typeof setupProfileSettingsTabListeners === 'function') {
                setupProfileSettingsTabListeners();
            }
            // Re-populate ALL fields after modal is shown to ensure they're visible
            // This ensures data persists even if modal was reset
            if (operator) {
                console.log('Re-populating ALL fields after modal shown...');
                
                // Profile fields
                const nameEl = document.getElementById('profileName');
                const emailEl = document.getElementById('profileEmail');
                const orgNameEl = document.getElementById('profileOrganizationName');
                const phoneEl = document.getElementById('profilePhone');
                if (nameEl) nameEl.value = operator.name || '';
                if (emailEl) emailEl.value = operator.email || '';
                if (orgNameEl) orgNameEl.value = operator.organization_name || '';
                if (phoneEl) phoneEl.value = operator.phone || '';
                
                // Financial breakdown fields - ALL of them
                // Default Dues field
                const defaultDuesEl = document.getElementById('profileDefaultDues');
                if (defaultDuesEl) {
                    const defaultDuesValue = operator.default_dues_per_player_per_match || operator.defaultDuesPerPlayerPerMatch || '';
                    defaultDuesEl.value = defaultDuesValue;
                    console.log('Re-populating profileDefaultDues to:', defaultDuesValue);
                } else {
                    console.error('profileDefaultDues element not found during re-population');
                }
                
                // Update calculation method FIRST (before populating fields) - SIMPLE: just read from database
                let useDollarAmountsValue = false;
                if (operator.use_dollar_amounts !== undefined && operator.use_dollar_amounts !== null) {
                    useDollarAmountsValue = operator.use_dollar_amounts === true || operator.use_dollar_amounts === 'true' || operator.use_dollar_amounts === 1;
                } else if (operator.useDollarAmounts !== undefined && operator.useDollarAmounts !== null) {
                    useDollarAmountsValue = operator.useDollarAmounts === true || operator.useDollarAmounts === 'true' || operator.useDollarAmounts === 1;
                }
                
                console.log('Re-populating: Setting calculation method, useDollarAmountsValue:', useDollarAmountsValue, 'from operator.use_dollar_amounts:', operator.use_dollar_amounts);
                
                // CRITICAL: Set the saved value FIRST so toggleCalculationMethod knows what the saved state is
                _savedUseDollarAmounts = useDollarAmountsValue;
                
                const methodPercentageRadio = document.getElementById('methodPercentage');
                const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
                if (methodPercentageRadio && methodDollarAmountRadio) {
                    if (useDollarAmountsValue) {
                        methodDollarAmountRadio.checked = true;
                        console.log('Set method to: Dollar amount-based');
                    } else {
                        methodPercentageRadio.checked = true;
                        console.log('Set method to: Percentage-based');
                    }
                    // Trigger toggle to show/hide the correct inputs
                    if (typeof toggleCalculationMethod === 'function') {
                        console.log('Calling toggleCalculationMethod()');
                        toggleCalculationMethod();
                    } else {
                        console.error('toggleCalculationMethod function not found!');
                    }
                } else {
                    console.error('Radio buttons not found! methodPercentageRadio:', !!methodPercentageRadio, 'methodDollarAmountRadio:', !!methodDollarAmountRadio);
                }
                
                console.log('Re-populating financial fields, operator data:', {
                    prize_fund_name: operator.prize_fund_name,
                    prize_fund_percentage: operator.prize_fund_percentage,
                    prize_fund_amount: operator.prize_fund_amount,
                    use_dollar_amounts: operator.use_dollar_amounts
                });
                
                const prizeFundNameEl = document.getElementById('profilePrizeFundName');
                const prizeFundPercentEl = document.getElementById('profilePrizeFundPercentage');
                const prizeFundAmountEl = document.getElementById('profilePrizeFundAmount');
                if (prizeFundNameEl) {
                    prizeFundNameEl.value = operator.prize_fund_name || operator.prizeFundName || 'Prize Fund';
                    console.log('Re-populated profilePrizeFundName to:', prizeFundNameEl.value);
                } else {
                    console.error('profilePrizeFundName element not found during re-population');
                }
                if (prizeFundPercentEl) {
                    prizeFundPercentEl.value = operator.prize_fund_percentage || operator.prizeFundPercentage || 50.0;
                    console.log('Re-populated profilePrizeFundPercentage to:', prizeFundPercentEl.value);
                } else {
                    console.error('profilePrizeFundPercentage element not found during re-population');
                }
                if (prizeFundAmountEl) {
                    const prizeFundAmountValue = operator.prize_fund_amount || operator.prizeFundAmount || '';
                    prizeFundAmountEl.value = prizeFundAmountValue;
                    console.log('Re-populated profilePrizeFundAmount to:', prizeFundAmountValue, '(raw operator:', operator.prize_fund_amount, operator.prizeFundAmount, ')');
                } else {
                    console.error('profilePrizeFundAmount element not found during re-population');
                }
                
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
