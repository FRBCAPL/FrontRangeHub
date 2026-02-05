async function saveProfile() {
    const errorDiv = document.getElementById('profileError');
    const successDiv = document.getElementById('profileSuccess');
    
    if (!errorDiv || !successDiv) {
        console.error('❌ ERROR: Error or success div not found!');
        alert('Error: Could not find error/success message elements');
        return;
    }
    
    // Hide previous messages
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    try {
        const name = document.getElementById('profileName').value.trim();
        const organizationName = document.getElementById('profileOrganizationName').value.trim();
        const phone = document.getElementById('profilePhone').value.trim();
        const defaultDuesInput = document.getElementById('profileDefaultDues');
        const defaultDues = defaultDuesInput && defaultDuesInput.value ? parseFloat(defaultDuesInput.value) : null;
        const defaultPlayersPerWeekInput = document.getElementById('profileDefaultPlayersPerWeek');
        const defaultPlayersPerWeek = defaultPlayersPerWeekInput && defaultPlayersPerWeekInput.value ? parseInt(defaultPlayersPerWeekInput.value, 10) : null;
        const sanctionFeesEnabledInput = document.getElementById('profileSanctionFeesEnabled');
        const sanctionFeesEnabled = sanctionFeesEnabledInput ? sanctionFeesEnabledInput.checked : false;
        
        const sanctionFeeNameInput = document.getElementById('profileSanctionFeeName');
        const sanctionFeeAmountInput = document.getElementById('profileSanctionFeeAmount');
        const sanctionFeePayoutAmountInput = document.getElementById('profileSanctionFeePayoutAmount');
        const sanctionStartDateInput = document.getElementById('profileSanctionStartDate');
        const sanctionEndDateInput = document.getElementById('profileSanctionEndDate');
        
        const sanctionFeeName = sanctionFeeNameInput ? sanctionFeeNameInput.value.trim() : '';
        const sanctionFeeAmountValue = sanctionFeeAmountInput ? sanctionFeeAmountInput.value.trim() : '';
        const sanctionFeeAmount = sanctionFeeAmountValue ? parseFloat(sanctionFeeAmountValue) : null;
        const sanctionFeePayoutAmountValue = sanctionFeePayoutAmountInput ? sanctionFeePayoutAmountInput.value.trim() : '';
        const sanctionFeePayoutAmount = sanctionFeePayoutAmountValue ? parseFloat(sanctionFeePayoutAmountValue) : null;
        const sanctionStartDate = sanctionStartDateInput ? sanctionStartDateInput.value : null;
        const sanctionEndDate = sanctionEndDateInput ? sanctionEndDateInput.value : null;
        
        // Get calculation method
        const methodPercentageRadio = document.getElementById('methodPercentage');
        const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
        const calculationMethod = document.querySelector('input[name="calculationMethod"]:checked')?.value || 'percentage';
        const useDollarAmountsValue = calculationMethod === 'dollar';
        
        
        // Get financial breakdown configuration
        const prizeFundNameInput = document.getElementById('profilePrizeFundName');
        const prizeFundPercentInput = document.getElementById('profilePrizeFundPercentage');
        const prizeFundAmountInput = document.getElementById('profilePrizeFundAmount');
        const prizeFundAmountTypeInput = document.querySelector('input[name="prizeFundAmountType"]:checked');
        
        // Read org names from the tab that is active: dollar vs percentage (so edits in the visible tab are saved)
        const firstOrgNameInput = useDollarAmountsValue
            ? document.getElementById('profileFirstOrganizationNameDollar')
            : document.getElementById('profileFirstOrganizationName');
        const firstOrgPercentInput = document.getElementById('profileFirstOrganizationPercentage');
        const firstOrgAmountInput = document.getElementById('profileFirstOrganizationAmount');
        const firstOrgAmountTypeInput = document.querySelector('input[name="firstOrganizationAmountType"]:checked');
        
        const secondOrgNameInput = useDollarAmountsValue
            ? document.getElementById('profileSecondOrganizationNameDollar')
            : document.getElementById('profileSecondOrganizationName');
        const secondOrgPercentInput = document.getElementById('profileSecondOrganizationPercentage');
        const secondOrgAmountInput = document.getElementById('profileSecondOrganizationAmount');
        const secondOrgAmountTypeInput = document.querySelector('input[name="secondOrganizationAmountType"]:checked');
        
        const prizeFundName = prizeFundNameInput ? prizeFundNameInput.value.trim() : null;
        const prizeFundPercentValue = prizeFundPercentInput ? prizeFundPercentInput.value.trim() : '';
        const prizeFundPercent = prizeFundPercentValue ? parseFloat(prizeFundPercentValue) : null;
        const prizeFundAmountValue = prizeFundAmountInput ? prizeFundAmountInput.value.trim() : '';
        const prizeFundAmount = prizeFundAmountValue ? parseFloat(prizeFundAmountValue) : null;
        const prizeFundAmountType = prizeFundAmountTypeInput ? prizeFundAmountTypeInput.value : 'perTeam';
        
        const firstOrgName = firstOrgNameInput ? firstOrgNameInput.value.trim() : null;
        const firstOrgPercentValue = firstOrgPercentInput ? firstOrgPercentInput.value.trim() : '';
        const firstOrgPercent = firstOrgPercentValue ? parseFloat(firstOrgPercentValue) : null;
        const firstOrgAmountValue = firstOrgAmountInput ? firstOrgAmountInput.value.trim() : '';
        const firstOrgAmount = firstOrgAmountValue ? parseFloat(firstOrgAmountValue) : null;
        const firstOrgAmountType = firstOrgAmountTypeInput ? firstOrgAmountTypeInput.value : 'perTeam';
        
        const secondOrgName = secondOrgNameInput ? secondOrgNameInput.value.trim() : null;
        const secondOrgPercentValue = secondOrgPercentInput ? secondOrgPercentInput.value.trim() : '';
        const secondOrgPercent = secondOrgPercentValue ? parseFloat(secondOrgPercentValue) : null;
        const secondOrgAmountValue = secondOrgAmountInput ? secondOrgAmountInput.value.trim() : '';
        const secondOrgAmount = secondOrgAmountValue ? parseFloat(secondOrgAmountValue) : null;
        const secondOrgAmountType = secondOrgAmountTypeInput ? secondOrgAmountTypeInput.value : 'perTeam';
        
        
        if (!name) {
            throw new Error('Name is required');
        }
        
        // Build request body
        const requestBody = {
            name: name,
            organization_name: organizationName || null,
            phone: phone || null,
            defaultDuesPerPlayerPerMatch: defaultDues,
            defaultPlayersPerWeek: defaultPlayersPerWeek,
            sanctionFeesEnabled: sanctionFeesEnabled
        };

        // Save theme (per account)
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            requestBody.uiTheme = themeToggle.checked ? 'dark' : 'light';
        }
        
        // Only add sanction fee fields if name and collection amount are provided and valid
        if (sanctionFeeName && sanctionFeeAmountValue) {
            if (isNaN(sanctionFeeAmount) || sanctionFeeAmount < 0) {
                throw new Error('Sanction fee amount must be a valid positive number');
            }
            requestBody.sanctionFeeName = sanctionFeeName;
            requestBody.sanctionFeeAmount = sanctionFeeAmount;
            if (sanctionFeePayoutAmountValue && !isNaN(sanctionFeePayoutAmount) && sanctionFeePayoutAmount >= 0) {
                requestBody.sanctionFeePayoutAmount = sanctionFeePayoutAmount;
            }
            // Add sanction start/end dates if provided
            if (sanctionStartDate) {
                requestBody.sanctionStartDate = sanctionStartDate;
            }
            if (sanctionEndDate) {
                requestBody.sanctionEndDate = sanctionEndDate;
            }
        } else if (sanctionFeeName || sanctionFeeAmountValue) {
            // If only one field is provided, it's invalid
            if (isNaN(sanctionFeeAmount) || sanctionFeeAmount < 0) {
                throw new Error('Sanction fee amount must be a valid positive number');
            }
            requestBody.sanctionFeeName = sanctionFeeName;
            requestBody.sanctionFeeAmount = sanctionFeeAmount;
            
            // Add payout amount if provided (optional, defaults to 0 if not set)
            if (sanctionFeePayoutAmountValue && !isNaN(sanctionFeePayoutAmount) && sanctionFeePayoutAmount >= 0) {
                requestBody.sanctionFeePayoutAmount = sanctionFeePayoutAmount;
            }
            // Add sanction start/end dates if provided
            if (sanctionStartDate) {
                requestBody.sanctionStartDate = sanctionStartDate;
            }
            if (sanctionEndDate) {
                requestBody.sanctionEndDate = sanctionEndDate;
            }
            if (sanctionFeePayoutAmountValue) {
                if (isNaN(sanctionFeePayoutAmount) || sanctionFeePayoutAmount < 0) {
                    throw new Error('Sanction fee payout amount must be a valid positive number');
                }
                requestBody.sanctionFeePayoutAmount = sanctionFeePayoutAmount;
            }
        } else if (sanctionFeeName && !sanctionFeeAmountValue) {
            throw new Error('Sanction fee amount is required when sanction fee name is provided');
        } else if (!sanctionFeeName && sanctionFeeAmountValue) {
            throw new Error('Sanction fee name is required when sanction fee amount is provided');
        }
        
        // Add calculation method - SIMPLE: just send what user selected
        requestBody.useDollarAmounts = useDollarAmountsValue === true;
        
        const combineCheckEl = document.getElementById('profileCombinePrizeAndNationalCheck');
        if (combineCheckEl) {
            requestBody.combinePrizeAndNationalCheck = combineCheckEl.checked;
        }
        const periodTypeEl = document.getElementById('profileCombinedPaymentPeriodType');
        const anchorMonthEl = document.getElementById('profileCombinedPaymentAnchorMonth');
        const anchorWeekEl = document.getElementById('profileCombinedPaymentAnchorWeek');
        const anchorDateEl = document.getElementById('profileCombinedPaymentAnchorDate');
        if (periodTypeEl) {
            requestBody.combinedPaymentPeriodType = periodTypeEl.value || 'monthly';
            const type = (periodTypeEl.value || 'monthly').toLowerCase();
            if (type === 'monthly' && anchorMonthEl) requestBody.combinedPaymentAnchor = Math.min(28, Math.max(1, parseInt(anchorMonthEl.value, 10) || 1));
            else if (type === 'weekly' && anchorWeekEl) requestBody.combinedPaymentAnchor = Math.min(6, Math.max(0, parseInt(anchorWeekEl.value, 10) || 0));
            else if (type === 'bi-weekly' && anchorDateEl && anchorDateEl.value) requestBody.combinedPaymentAnchorDate = anchorDateEl.value;
        }
        
        // ALWAYS save prize fund name
        if (prizeFundNameInput && prizeFundName) {
            requestBody.prizeFundName = prizeFundName;
        }
        
        if (useDollarAmountsValue) {
            // Save dollar amount settings
            if (prizeFundAmountInput && prizeFundAmount !== null && prizeFundAmount !== undefined && !isNaN(prizeFundAmount) && prizeFundAmount >= 0) {
                requestBody.prizeFundAmount = prizeFundAmount;
                requestBody.prizeFundAmountType = prizeFundAmountType;
            }
            if (firstOrgNameInput !== null) {
                requestBody.firstOrganizationName = firstOrgName || '';
            }
            if (firstOrgAmountInput && firstOrgAmount !== null && firstOrgAmount !== undefined && !isNaN(firstOrgAmount) && firstOrgAmount >= 0) {
                requestBody.firstOrganizationAmount = firstOrgAmount;
                requestBody.firstOrganizationAmountType = firstOrgAmountType;
            }
            if (secondOrgNameInput !== null) {
                requestBody.secondOrganizationName = secondOrgName || '';
            }
            if (secondOrgAmountInput && secondOrgAmount !== null && secondOrgAmount !== undefined && !isNaN(secondOrgAmount) && secondOrgAmount >= 0) {
                requestBody.secondOrganizationAmount = secondOrgAmount;
                requestBody.secondOrganizationAmountType = secondOrgAmountType;
            }
        } else {
            // Save percentage settings
            if (prizeFundPercentInput && prizeFundPercent !== null && prizeFundPercent !== undefined && !isNaN(prizeFundPercent)) {
                if (prizeFundPercent < 0 || prizeFundPercent > 100) {
                    throw new Error('Prize fund percentage must be between 0 and 100');
                }
                requestBody.prizeFundPercentage = prizeFundPercent;
            }
            if (firstOrgNameInput !== null) {
                requestBody.firstOrganizationName = firstOrgName || '';
            }
            if (firstOrgPercentInput && firstOrgPercent !== null && firstOrgPercent !== undefined && !isNaN(firstOrgPercent)) {
                if (firstOrgPercent < 0 || firstOrgPercent > 100) {
                    throw new Error('First organization percentage must be between 0 and 100');
                }
                requestBody.firstOrganizationPercentage = firstOrgPercent;
            }
            if (secondOrgNameInput !== null) {
                requestBody.secondOrganizationName = secondOrgName || '';
            }
            if (secondOrgPercentInput && secondOrgPercent !== null && secondOrgPercent !== undefined && !isNaN(secondOrgPercent)) {
                if (secondOrgPercent < 0 || secondOrgPercent > 100) {
                    throw new Error('Second organization percentage must be between 0 and 100');
                }
                requestBody.secondOrganizationPercentage = secondOrgPercent;
            }
        }
        
        const response = await apiCall('/profile', {
            method: 'PUT',
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to update profile' }));
            console.error('❌ Profile save error:', errorData);
            throw new Error(errorData.message || errorData.error || 'Failed to update profile');
        }
        
        const data = await response.json();
        
        // Update current operator data
        if (data.operator) {
            currentOperator = data.operator;
            // Ensure saved org names and combine-check setting are on currentOperator
            if (firstOrgName !== undefined) currentOperator.first_organization_name = firstOrgName ?? '';
            if (secondOrgName !== undefined) currentOperator.second_organization_name = secondOrgName ?? '';
            const combineCheckEl = document.getElementById('profileCombinePrizeAndNationalCheck');
            if (combineCheckEl) currentOperator.combine_prize_and_national_check = combineCheckEl.checked;
            if (periodTypeEl) {
                currentOperator.combined_payment_period_type = periodTypeEl.value || data.operator?.combined_payment_period_type || 'monthly';
                const type = (periodTypeEl.value || 'monthly').toLowerCase();
                if (type === 'monthly' && anchorMonthEl) currentOperator.combined_payment_anchor = Math.min(28, Math.max(1, parseInt(anchorMonthEl.value, 10) || 1));
                else if (type === 'weekly' && anchorWeekEl) currentOperator.combined_payment_anchor = Math.min(6, Math.max(0, parseInt(anchorWeekEl.value, 10) || 0));
                else if (type === 'bi-weekly' && anchorDateEl && anchorDateEl.value) currentOperator.combined_payment_anchor_date = anchorDateEl.value;
                else currentOperator.combined_payment_anchor = data.operator?.combined_payment_anchor ?? 1;
            }
            localStorage.setItem('currentOperator', JSON.stringify(currentOperator));
            window.currentOperator = currentOperator;

            // CRITICAL: Update _savedUseDollarAmounts from the response
            const savedValue = data.operator.use_dollar_amounts === true || data.operator.use_dollar_amounts === 'true' || data.operator.use_dollar_amounts === 1;
            _savedUseDollarAmounts = savedValue;
            
            // Update branding with new organization name
            updateAppBranding(data.operator.organization_name || data.operator.name || 'Duezy');
            
            // Update sanction fee settings and financial breakdown settings
            updateSanctionFeeSettings();
            updateFinancialBreakdownSettings();
            
            // CRITICAL: Update the radio button to match what was JUST SAVED (from response)
            const methodPercentageRadio = document.getElementById('methodPercentage');
            const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
            if (methodPercentageRadio && methodDollarAmountRadio) {
                if (savedValue) {
                    methodDollarAmountRadio.checked = true;
                } else {
                    methodPercentageRadio.checked = true;
                }
            }
            
            toggleCalculationMethod(); // Refresh Active format indicator and hide "Save to change" if modal open

            // Explicitly update the UI visibility for sanction fees (double-check)
            const operatorData = data.operator || currentOperator;
            let isEnabled = false;
            if (operatorData.sanction_fees_enabled !== undefined && operatorData.sanction_fees_enabled !== null) {
                isEnabled = operatorData.sanction_fees_enabled === true || operatorData.sanction_fees_enabled === 'true';
            } else {
                // Backward compatibility: if they have a sanction fee amount set, default to enabled
                const hasAmount = operatorData.sanction_fee_amount && parseFloat(operatorData.sanction_fee_amount) > 0;
                isEnabled = hasAmount;
            }
            toggleSanctionFeeUI(isEnabled);
            
            // Refresh the UI to reflect new settings
            calculateFinancialBreakdown();
            
            // Refresh teams display if on teams view
            const teamsView = document.getElementById('teamsView');
            if (teamsView && teamsView.classList.contains('active')) {
                displayTeams(filteredTeams || teams || []);
            }
        }
        
        // Show success message
        successDiv.textContent = 'Profile updated successfully!';
        successDiv.classList.remove('hidden');
        
        // Hide modal after 2 seconds
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
            if (modal) {
                modal.hide();
                stopSubscriptionCleanup();
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        errorDiv.textContent = error.message || 'Failed to update profile. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}
