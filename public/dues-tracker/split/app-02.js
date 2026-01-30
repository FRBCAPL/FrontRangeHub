function toggleSanctionFeeUI(show) {
    // Sanction fee card
    const sanctionFeesCard = document.getElementById('sanctionFeesCard');
    if (sanctionFeesCard) {
        sanctionFeesCard.style.display = show ? '' : 'none';
    }
    
    // Sanction fee column header in main table
    const sanctionFeesTableHeader = document.getElementById('sanctionFeesTableHeader');
    const sanctionFeesTableHeaderCell = sanctionFeesTableHeader ? sanctionFeesTableHeader.closest('th') : null;
    if (sanctionFeesTableHeaderCell) {
        sanctionFeesTableHeaderCell.style.display = show ? '' : 'none';
    }
    
    // Sanction fee column cells in table rows
    document.querySelectorAll('td[data-sanction-status]').forEach(cell => {
        cell.style.display = show ? '' : 'none';
    });
    
    // Sanction fee section in weekly payment modal
    const bcaSanctionPlayersSection = document.getElementById('bcaSanctionPlayers');
    if (bcaSanctionPlayersSection) {
        const parentSection = bcaSanctionPlayersSection.closest('.mb-3');
        if (parentSection) {
            parentSection.style.display = show ? '' : 'none';
        }
    }
    
    // Sanction fee label and help text in weekly payment modal
    const sanctionFeeLabel = document.getElementById('sanctionFeeLabel');
    if (sanctionFeeLabel) {
        const labelSection = sanctionFeeLabel.closest('.sanction-fee-label-section') || sanctionFeeLabel;
        labelSection.style.display = show ? '' : 'none';
    }
    
    // Sanction fee columns in payment history modal (if they exist)
    const paymentHistoryTable = document.querySelector('#paymentHistoryModal table');
    if (paymentHistoryTable) {
        const headers = paymentHistoryTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                paymentHistoryTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
    
    // Sanction fee columns in edit team modal payment history (if they exist)
    const editTeamPaymentHistoryTable = document.querySelector('#addTeamModal table');
    if (editTeamPaymentHistoryTable) {
        const headers = editTeamPaymentHistoryTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                editTeamPaymentHistoryTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
    
    // Sanction status columns in edit team modal team members table
    const editTeamMembersTable = document.querySelector('#addTeamModal #teamMembersContainer table');
    if (editTeamMembersTable) {
        const headers = editTeamMembersTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                editTeamMembersTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
}

// Function to update financial breakdown settings from operator data
function updateFinancialBreakdownSettings() {
    if (currentOperator) {
        // Load calculation method (percentage or dollar amount)
        useDollarAmounts = currentOperator.use_dollar_amounts || currentOperator.useDollarAmounts || false;
        _savedUseDollarAmounts = useDollarAmounts;
        
        // Load financial breakdown percentages and names from operator profile
        // Support both new field names and old field names for backward compatibility
        prizeFundPercentage = parseFloat(currentOperator.prize_fund_percentage || currentOperator.prizeFundPercentage);
        prizeFundName = currentOperator.prize_fund_name || currentOperator.prizeFundName || 'Prize Fund';
        firstOrganizationPercentage = parseFloat(currentOperator.first_organization_percentage || currentOperator.league_manager_percentage || currentOperator.leagueManagerPercentage);
        firstOrganizationName = currentOperator.first_organization_name || currentOperator.firstOrganizationName || 
                                currentOperator.league_manager_name || 'League Manager';
        secondOrganizationPercentage = parseFloat(currentOperator.second_organization_percentage || currentOperator.usa_pool_league_percentage || currentOperator.usaPoolLeaguePercentage);
        secondOrganizationName = currentOperator.second_organization_name || currentOperator.secondOrganizationName || 
                                currentOperator.usa_pool_league_name || 'Parent/National Organization';
        
        // Load dollar amount settings
        prizeFundAmount = currentOperator.prize_fund_amount || currentOperator.prizeFundAmount || null;
        prizeFundAmountType = currentOperator.prize_fund_amount_type || currentOperator.prizeFundAmountType || 'perTeam';
        firstOrganizationAmount = currentOperator.first_organization_amount || currentOperator.firstOrganizationAmount || null;
        firstOrganizationAmountType = currentOperator.first_organization_amount_type || currentOperator.firstOrganizationAmountType || 'perTeam';
        secondOrganizationAmount = currentOperator.second_organization_amount || currentOperator.secondOrganizationAmount || null;
        secondOrganizationAmountType = currentOperator.second_organization_amount_type || currentOperator.secondOrganizationAmountType || 'perTeam';
        
        // Validate percentages (must be valid numbers)
        if (isNaN(prizeFundPercentage)) prizeFundPercentage = 50.0;
        if (isNaN(firstOrganizationPercentage)) firstOrganizationPercentage = 60.0;
        if (isNaN(secondOrganizationPercentage)) secondOrganizationPercentage = 40.0;
        
        // Update UI labels dynamically
        updateFinancialBreakdownLabels();
        
        console.log('✅ Financial breakdown settings updated:', { 
            useDollarAmounts,
            prizeFundPercentage, 
            prizeFundName,
            prizeFundAmount,
            prizeFundAmountType,
            firstOrganizationPercentage,
            firstOrganizationName,
            firstOrganizationAmount,
            firstOrganizationAmountType,
            secondOrganizationPercentage,
            secondOrganizationName,
            secondOrganizationAmount,
            secondOrganizationAmountType
        });
    }
}

// Toggle between percentage and dollar amount input methods
function toggleCalculationMethod() {
    try {
        const method = document.querySelector('input[name="calculationMethod"]:checked')?.value;
        const selectedDollar = method === 'dollar';
        const percentageInputs = document.getElementById('percentageInputs');
        const dollarAmountInputs = document.getElementById('dollarAmountInputs');
        const activeFormatLabel = document.getElementById('activeFormatLabel');
        const saveToChangeMsg = document.getElementById('saveToChangeFormatMsg');

        // Show/hide inputs based on selected option
        if (selectedDollar) {
            if (percentageInputs) percentageInputs.style.display = 'none';
            if (dollarAmountInputs) dollarAmountInputs.style.display = 'block';
        } else {
            if (percentageInputs) percentageInputs.style.display = 'block';
            if (dollarAmountInputs) dollarAmountInputs.style.display = 'none';
        }

        // "Active format" always reflects saved preference (never changes until Save)
        if (activeFormatLabel) {
            activeFormatLabel.textContent = _savedUseDollarAmounts ? 'Dollar amounts' : 'Percentage';
        }

        // Show "Save to change preference" only when selected differs from saved
        if (saveToChangeMsg) {
            saveToChangeMsg.style.display = selectedDollar !== _savedUseDollarAmounts ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error in toggleCalculationMethod:', error);
    }
}

// Track saved division calculation method (similar to _savedUseDollarAmounts for profile)
let _savedDivisionUseDollarAmounts = false;

// Toggle between percentage and dollar amount input methods for division editor
// Clear all division financial breakdown fields to use operator defaults
function clearDivisionFinancialBreakdown() {
    const divisionPrizeFundPercentEl = document.getElementById('divisionPrizeFundPercentage');
    const divisionFirstOrgPercentEl = document.getElementById('divisionFirstOrgPercentage');
    const divisionSecondOrgPercentEl = document.getElementById('divisionSecondOrgPercentage');
    const divisionPrizeFundAmountEl = document.getElementById('divisionPrizeFundAmount');
    const divisionFirstOrgAmountEl = document.getElementById('divisionFirstOrganizationAmount');
    const divisionSecondOrgAmountEl = document.getElementById('divisionSecondOrganizationAmount');
    
    const divisionMethodPercentage = document.getElementById('divisionMethodPercentage');
    const divisionMethodDollarAmount = document.getElementById('divisionMethodDollarAmount');
    const operatorUsesDollarAmounts = currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false;
    
    const methodNeedsSave = operatorUsesDollarAmounts !== _savedDivisionUseDollarAmounts;
    const hasFieldValues = 
        (divisionPrizeFundPercentEl && divisionPrizeFundPercentEl.value.trim()) ||
        (divisionFirstOrgPercentEl && divisionFirstOrgPercentEl.value.trim()) ||
        (divisionSecondOrgPercentEl && divisionSecondOrgPercentEl.value.trim()) ||
        (divisionPrizeFundAmountEl && divisionPrizeFundAmountEl.value.trim()) ||
        (divisionFirstOrgAmountEl && divisionFirstOrgAmountEl.value.trim()) ||
        (divisionSecondOrgAmountEl && divisionSecondOrgAmountEl.value.trim());
    const needsSave = methodNeedsSave || hasFieldValues;
    
    if (divisionPrizeFundPercentEl) divisionPrizeFundPercentEl.value = '';
    if (divisionFirstOrgPercentEl) divisionFirstOrgPercentEl.value = '';
    if (divisionSecondOrgPercentEl) divisionSecondOrgPercentEl.value = '';
    if (divisionPrizeFundAmountEl) divisionPrizeFundAmountEl.value = '';
    if (divisionFirstOrgAmountEl) divisionFirstOrgAmountEl.value = '';
    if (divisionSecondOrgAmountEl) divisionSecondOrgAmountEl.value = '';
    
    // Set the radio buttons to match operator default
    if (operatorUsesDollarAmounts) {
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = true;
        if (divisionMethodPercentage) divisionMethodPercentage.checked = false;
    } else {
        if (divisionMethodPercentage) divisionMethodPercentage.checked = true;
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = false;
    }
    
    toggleDivisionCalculationMethod();
    const saveToChangeMsg = document.getElementById('divisionSaveToChangeFormatMsg');
    if (saveToChangeMsg) saveToChangeMsg.style.display = needsSave ? 'block' : 'none';
    showAlertModal('Distribution cleared. Division will use your default settings from Profile & Settings.', 'success', 'Defaults Restored');
}

function toggleDivisionCalculationMethod() {
    const method = document.querySelector('input[name="divisionCalculationMethod"]:checked')?.value;
    const selectedDollar = method === 'dollar';
    const percentageInputs = document.getElementById('divisionPercentageInputs');
    const dollarAmountInputs = document.getElementById('divisionDollarAmountInputs');
    const activeFormatLabel = document.getElementById('divisionActiveFormatLabel');
    const saveToChangeMsg = document.getElementById('divisionSaveToChangeFormatMsg');
    
    // Show/hide inputs based on selected option (user can edit either)
    if (selectedDollar) {
        if (percentageInputs) percentageInputs.style.display = 'none';
        if (dollarAmountInputs) dollarAmountInputs.style.display = 'block';
    } else {
        if (percentageInputs) percentageInputs.style.display = 'block';
        if (dollarAmountInputs) dollarAmountInputs.style.display = 'none';
    }
    
    // "Active format" always reflects saved preference (never changes until Save)
    if (activeFormatLabel) {
        activeFormatLabel.textContent = _savedDivisionUseDollarAmounts ? 'Dollar Amount' : 'Percentage';
    }
    
    // Show "Save to change preference" only when selected differs from saved
    if (saveToChangeMsg) {
        const needsSave = selectedDollar !== _savedDivisionUseDollarAmounts;
        saveToChangeMsg.style.display = needsSave ? 'block' : 'none';
        console.log('[toggleDivisionCalculationMethod] selectedDollar:', selectedDollar, 'saved:', _savedDivisionUseDollarAmounts, 'needsSave:', needsSave);
    }
}

function updateDivisionFinancialLabels() {
    const pf = (typeof prizeFundName !== 'undefined' ? prizeFundName : 'Prize Fund') || 'Prize Fund';
    const o1 = (typeof firstOrganizationName !== 'undefined' ? firstOrganizationName : 'League Manager') || 'League Manager';
    const o2 = (typeof secondOrganizationName !== 'undefined' ? secondOrganizationName : 'Parent/National Org') || 'Parent/National Org';
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('divisionPrizeFundPctLabel', pf + ' %');
    set('divisionFirstOrgPctLabel', o1 + ' %');
    set('divisionSecondOrgPctLabel', o2 + ' %');
    set('divisionPrizeFundDollarLabel', pf + ' $');
    set('divisionFirstOrgDollarLabel', o1 + ' $');
    set('divisionSecondOrgDollarLabel', o2 + ' $');
}

// Function to update all UI labels that reference financial breakdown categories
function updateFinancialBreakdownLabels() {
    // Update financial breakdown card labels
    const prizeFundLabel = document.querySelector('label[for="totalPrizeFund"]') || 
                          document.querySelector('#totalPrizeFund')?.parentElement?.querySelector('h6');
    // Only update actual <label> elements so we don't overwrite card titles with buttons/chevrons
    if (prizeFundLabel && prizeFundLabel.tagName === 'LABEL' && prizeFundLabel.textContent) {
        prizeFundLabel.textContent = prizeFundLabel.textContent.replace(/Prize Fund|Total Prize Fund/i, prizeFundName);
    }
    
    const firstOrgLabel = document.querySelector('label[for="totalLeagueManager"]') || 
                         document.querySelector('#totalLeagueManager')?.parentElement?.querySelector('h6');
    if (firstOrgLabel && firstOrgLabel.tagName === 'LABEL' && firstOrgLabel.textContent) {
        firstOrgLabel.textContent = firstOrgLabel.textContent.replace(/League Manager|Total League Manager/i, firstOrganizationName);
    }
    
    // Update second organization label in financial breakdown card
    const secondOrgCardLabel = document.getElementById('secondOrgCardLabel');
    if (secondOrgCardLabel) {
        secondOrgCardLabel.textContent = secondOrganizationName;
    }
    
    // Also update any other labels that might reference the second organization
    const secondOrgLabel = document.querySelector('label[for="totalUSAPoolLeague"]') || 
                          document.querySelector('#totalUSAPoolLeague')?.parentElement?.querySelector('h6');
    if (secondOrgLabel && secondOrgLabel.tagName === 'LABEL' && secondOrgLabel.textContent && secondOrgLabel.id !== 'secondOrgCardLabel') {
        secondOrgLabel.textContent = secondOrgLabel.textContent.replace(/USA Pool League|Total USA Pool League|CSI/i, secondOrganizationName);
    }
}

// Function to update form labels dynamically based on input values
function updateFinancialBreakdownFormLabels() {
    const prizeFundNameInput = document.getElementById('profilePrizeFundName');
    const firstOrgNameInput = document.getElementById('profileFirstOrganizationName');
    const secondOrgNameInput = document.getElementById('profileSecondOrganizationName');
    
    const prizeFundLabel = document.getElementById('prizeFundLabel');
            const firstOrgLabel = document.getElementById('firstOrgLabel');
            const secondOrgLabel = document.getElementById('secondOrgLabel');
            
            if (prizeFundNameInput && prizeFundLabel) {
                prizeFundNameInput.addEventListener('input', function() {
                    prizeFundLabel.textContent = this.value || 'Prize Fund';
                });
                prizeFundLabel.textContent = prizeFundNameInput.value || 'Prize Fund';
            }
            
            if (firstOrgNameInput && firstOrgLabel) {
                firstOrgNameInput.addEventListener('input', function() {
                    firstOrgLabel.textContent = this.value || 'Local League/Organization';
                });
                firstOrgLabel.textContent = firstOrgNameInput.value || 'Local League/Organization';
            }
            
            if (secondOrgNameInput && secondOrgLabel) {
                // Keep the label as "Parent/National Organization" to match the field label above
                // Don't update it with the actual organization name value
                secondOrgLabel.textContent = 'Parent/National Organization';
            }
}

// Calculate profit per player (collection - payout)
function getSanctionFeeProfitPerPlayer() {
    return sanctionFeeAmount - sanctionFeePayoutAmount;
}

// Function to update sanction fee profit display in profile modal
function updateSanctionFeeProfitDisplay() {
    const collectionEl = document.getElementById('profileSanctionFeeAmount');
    const payoutEl = document.getElementById('profileSanctionFeePayoutAmount');
    const profitDisplayEl = document.getElementById('sanctionFeeProfitDisplay');
    
    if (collectionEl && payoutEl && profitDisplayEl) {
        const collection = parseFloat(collectionEl.value) || 0;
        const payout = parseFloat(payoutEl.value) || 0;
        const profit = collection - payout;
        profitDisplayEl.textContent = profit.toFixed(2);
        
        // Color code the profit (green if positive, red if negative)
        if (profit > 0) {
            profitDisplayEl.parentElement.className = 'alert alert-success mb-0';
        } else if (profit < 0) {
            profitDisplayEl.parentElement.className = 'alert alert-danger mb-0';
        } else {
            profitDisplayEl.parentElement.className = 'alert alert-info mb-0';
        }
    }
}

// Function to update all UI labels that reference sanction fees
function updateSanctionFeeLabels() {
    // Update payment modal label
    const span = document.getElementById('sanctionFeeLabelText');
    const fallback = document.getElementById('sanctionFeeLabel');
    const target = span || fallback;
    if (target) {
        target.textContent = `${sanctionFeeName} (${formatCurrency(sanctionFeeAmount)} per player)`;
    }
    
    // Update help text with detailed breakdown
    const sanctionFeeHelpText = document.getElementById('sanctionFeeHelpText');
    if (sanctionFeeHelpText) {
        const profit = getSanctionFeeProfitPerPlayer();
        sanctionFeeHelpText.innerHTML = `Select which players this payment includes ${sanctionFeeName.toLowerCase()} for<br>
            <small class="text-muted">
                <strong>Collection:</strong> ${formatCurrency(sanctionFeeAmount)}/player | 
                <strong>Payout:</strong> ${formatCurrency(sanctionFeePayoutAmount)}/player | 
                <strong>Profit:</strong> ${formatCurrency(profit)}/player
            </small>`;
    }
    
    // Update financial breakdown card title
    const sanctionFeesCardTitle = document.getElementById('sanctionFeesCardTitle');
    if (sanctionFeesCardTitle) {
        sanctionFeesCardTitle.textContent = sanctionFeeName;
    }
    
    // Update table header title (preserve sort icon)
    const sanctionFeesTableHeader = document.getElementById('sanctionFeesTableHeader');
    if (sanctionFeesTableHeader) {
        // Find the span wrapper that contains the text and sort icon
        const headerSpan = sanctionFeesTableHeader.querySelector('span.d-inline-flex');
        if (headerSpan) {
            // Get the sort icon to preserve it
            const sortIcon = headerSpan.querySelector('.sort-icon');
            if (sortIcon) {
                // Update the span content but keep the icon
                headerSpan.innerHTML = sanctionFeeName + ' ';
                headerSpan.appendChild(sortIcon);
            } else {
                // No icon found, just update text
                headerSpan.textContent = sanctionFeeName;
            }
        } else {
            // Fallback: if no span wrapper, just update textContent (old structure)
            sanctionFeesTableHeader.textContent = sanctionFeeName;
        }
    }
    
    // Update financial breakdown card subtitle
    const sanctionFeesCardSubtitle = document.getElementById('sanctionFeesCardSubtitle');
    if (sanctionFeesCardSubtitle) {
        sanctionFeesCardSubtitle.textContent = `${formatCurrency(sanctionFeeAmount)} per player per year`;
    }
    
    // Update players modal title
    const playersModalTitle = document.getElementById('playersModalTitle');
    if (playersModalTitle) {
        playersModalTitle.textContent = `${sanctionFeeName} Status`;
    }
    
    // Update tooltips for sanction status buttons
    const sanctionStatusTooltips = document.querySelectorAll('[data-sanction-status-tooltip]');
    sanctionStatusTooltips.forEach(element => {
        element.setAttribute('title', `${sanctionFeeName} Status: Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned`);
    });
    
    // Update tooltips in team member rows (dynamically created)
    // This will be called when team members are added
    
    // Update help text in team member status
    const sanctionStatusHelpText = document.getElementById('sanctionStatusHelpText');
    if (sanctionStatusHelpText) {
        sanctionStatusHelpText.textContent = `Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned`;
    }
}

// Function to get division color class
// Generate a consistent color class for each division based on its name
