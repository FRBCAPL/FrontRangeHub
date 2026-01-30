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
            
            // Lock financial fields as read-only if user has saved settings (prevents accidental edits)
            if (typeof applyFinancialFieldsLockState === 'function') {
                applyFinancialFieldsLockState(operator);
            }
            
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
                
                if (typeof applyFinancialFieldsLockState === 'function') {
                    applyFinancialFieldsLockState(operator);
                }
                
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
