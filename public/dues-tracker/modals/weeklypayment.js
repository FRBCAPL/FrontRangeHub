// Standard payment method options (value and display label)
const STANDARD_PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'cashapp', label: 'CashApp' },
    { value: 'venmo', label: 'Venmo' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'zelle', label: 'Zelle' }
];

/** Returns full list of payment method options: standard + user's custom methods + Other */
function getPaymentMethodOptions() {
    const custom = (typeof currentOperator !== 'undefined' && currentOperator && Array.isArray(currentOperator.custom_payment_methods))
        ? currentOperator.custom_payment_methods
        : (currentOperator?.custom_payment_methods && typeof currentOperator.custom_payment_methods === 'object' && !Array.isArray(currentOperator.custom_payment_methods)
            ? [] : []);
    const customList = Array.isArray(custom) ? custom : [];
    const customOptions = customList.map(name => ({ value: String(name), label: String(name) }));
    return [...STANDARD_PAYMENT_METHODS, ...customOptions, { value: 'other', label: 'Other' }];
}

function populateWeeklyPaymentMethodDropdown() {
    const select = document.getElementById('weeklyPaymentMethod');
    if (!select) return;
    const options = getPaymentMethodOptions();
    select.innerHTML = '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    });
    if (typeof togglePaidByPlayerDropdown === 'function') togglePaidByPlayerDropdown();
}

if (typeof window !== 'undefined') {
    window.getPaymentMethodOptions = getPaymentMethodOptions;
    window.populateWeeklyPaymentMethodDropdown = populateWeeklyPaymentMethodDropdown;
}

// Define on window immediately so it's available for onclick and other scripts (script load order can vary)
window.showWeeklyPaymentModal = function showWeeklyPaymentModal(teamId, specificWeek, resetOnly) {
    if (specificWeek === undefined) specificWeek = null;
    if (resetOnly === undefined) resetOnly = false;
    console.log('showWeeklyPaymentModal called with teamId:', teamId, 'specificWeek:', specificWeek);
    
    if (!resetOnly) {
        // Hide week filter dropdown when modal opens to prevent z-index issues
        const weekFilter = document.getElementById('weekFilter');
        const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
        if (weekFilter) {
            weekFilter.style.display = 'none';
        }
        if (weekFilterLabel) {
            weekFilterLabel.style.display = 'none';
        }
    }
    
    // Find the team from the current teams array (which should be up-to-date after any recent updates)
    const team = teams.find(t => t._id === teamId);
    if (!team) {
        console.log('Team not found for ID:', teamId);
        return;
    }
    
    currentWeeklyPaymentTeamId = teamId;
    
    // Reset form for fresh entry (important when "Add another payment" is used)
    const formEl = document.getElementById('weeklyPaymentForm');
    if (formEl) formEl.reset();
    
    // Populate Method dropdown (standard + user custom methods + Other)
    populateWeeklyPaymentMethodDropdown();
    const otherWrap = document.getElementById('weeklyPaymentMethodOtherWrap');
    const otherNameInput = document.getElementById('weeklyPaymentMethodOtherName');
    if (otherWrap) otherWrap.style.display = 'none';
    if (otherNameInput) otherNameInput.value = '';
    
    // Use specific week if provided, otherwise get from dropdown
    let selectedWeek;
    if (specificWeek !== null && specificWeek !== undefined) {
        selectedWeek = parseInt(specificWeek) || 1;
        console.log(`Using specificWeek parameter: ${selectedWeek}`);
    } else {
        const weekFilter = document.getElementById('weekFilter');
        selectedWeek = weekFilter ? parseInt(weekFilter.value) : currentWeek;
        console.log(`Using weekFilter or currentWeek: ${selectedWeek}`);
    }
    
    // Ensure selectedWeek is a valid number
    if (isNaN(selectedWeek) || selectedWeek < 1) {
        selectedWeek = 1;
        console.warn(`Invalid selectedWeek, defaulting to 1`);
    }
    
    // Store the selected week for use in saveWeeklyPayment
    currentWeeklyPaymentWeek = selectedWeek;
    console.log(`Final selectedWeek: ${selectedWeek}, currentWeeklyPaymentWeek: ${currentWeeklyPaymentWeek}`);
    
    // Update modal title with team name and week dropdown
    const modalTitleTeamEl = document.getElementById('weeklyPaymentModalTeamName');
    const weekEl = document.getElementById('weeklyPaymentWeek');
    if (modalTitleTeamEl) {
        modalTitleTeamEl.textContent = team.teamName || '';
    }
    
    // Populate week dropdown and set selected value
    // Try to resolve division using name OR id so we always pick up the latest division settings
    const teamDivision = divisions.find(d =>
        d.name === team.division ||
        d._id === team.division ||
        d.id === team.division
    );
    if (weekEl && teamDivision) {
        const totalWeeks = teamDivision.totalWeeks || 20;
        weekEl.innerHTML = ''; // Clear existing options
        
        let startDate = null;
        if (teamDivision.startDate) {
            const [y, mo, d] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            startDate = new Date(y, mo - 1, d);
        }
        
        for (let week = 1; week <= totalWeeks; week++) {
            const option = document.createElement('option');
            option.value = String(week);
            let label = `Week ${week}`;
            if (startDate) {
                const weekDate = new Date(startDate);
                weekDate.setDate(startDate.getDate() + (week - 1) * 7);
                const m = String(weekDate.getMonth() + 1).padStart(2, '0');
                const day = String(weekDate.getDate()).padStart(2, '0');
                label = `Week ${week} (${m}/${day})`;
            }
            option.textContent = label;
            weekEl.appendChild(option);
        }
        
        // Set selected week (correct week when opened from payment history)
        // Ensure we set it as a string to match option values
        const weekValue = String(selectedWeek);
        weekEl.value = weekValue;
        
        // Verify it was set correctly (defensive check)
        if (weekEl.value !== weekValue) {
            console.warn(`Week dropdown value mismatch: expected ${weekValue}, got ${weekEl.value}. Trying selectedIndex.`);
            // Fallback: use selectedIndex
            const targetIndex = selectedWeek - 1; // options are 1-indexed, array is 0-indexed
            if (targetIndex >= 0 && targetIndex < weekEl.options.length) {
                weekEl.selectedIndex = targetIndex;
            }
        }
        console.log(`Set week dropdown to: ${weekEl.value} (selectedWeek: ${selectedWeek})`);
    } else if (weekEl) {
        // If no division found, try to set the value anyway (dropdown might have existing options)
        const weekValue = String(selectedWeek);
        weekEl.value = weekValue;
        console.log(`Set week dropdown (no division) to: ${weekEl.value} (selectedWeek: ${selectedWeek})`);
    }
    
    // Reset modal state - hide success message and show form
    const successDiv = document.getElementById('weeklyPaymentSuccess');
    const form = document.getElementById('weeklyPaymentForm');
    const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
    if (successDiv) successDiv.classList.add('d-none');
    if (form) form.style.display = 'block';
    if (modalFooter) modalFooter.style.display = '';
    const saveBtn = document.querySelector('#weeklyPaymentModal .modal-footer .btn-success');
    const cancelBtn = document.querySelector('#weeklyPaymentModal .modal-footer .btn-secondary');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.display = '';
    }
    if (cancelBtn) cancelBtn.style.display = '';
    
    // Populate the amount dropdown (teamDivision already found above)
    if (teamDivision) {
        populateWeeklyPaymentAmountDropdown(team, teamDivision);
        
        // Store weekly team dues for validation using the same division-level settings
        const duesRate = teamDivision.duesPerPlayerPerMatch ?? team.divisionDuesRate ?? 0;
        const individualDuesRate = parseFloat(duesRate) || 0;
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        currentWeeklyTeamDues = individualDuesRate * playersPerWeek * doublePlayMultiplier;
    }
    
    // Pre-fill amount with expected weekly team dues (first option) if no existing payment
    const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
    
    // Populate "Paid By" player dropdown
    populatePaidByPlayerDropdown(team);
    
    // Toggle paid by dropdown based on payment method
    togglePaidByPlayerDropdown();
    
    // Populate sanction fee player checkboxes
    populateBCASanctionPlayers(team);
    
    // Add event listeners to sanction player checkboxes for validation
    // Use event delegation since checkboxes are dynamically created
    const bcaSanctionContainer = document.getElementById('bcaSanctionPlayers');
    if (bcaSanctionContainer) {
        bcaSanctionContainer.addEventListener('change', function(e) {
            if (e.target.name === 'bcaSanctionPlayer') {
                validatePaymentAmount();
            }
        });
    }
    
    // Populate individual player payments section
    populateIndividualPlayerPayments(team, teamDivision, selectedWeek);
    
    // Calculate match date for the selected week based on division start date
    let matchDate = '';
    if (teamDivision && teamDivision.startDate) {
        const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        // Match date for week N is: startDate + (N - 1) * 7 days
        const matchDateObj = new Date(startDate);
        matchDateObj.setDate(startDate.getDate() + (selectedWeek - 1) * 7);
        // Format as YYYY-MM-DD for date input
        const yearStr = matchDateObj.getFullYear();
        const monthStr = String(matchDateObj.getMonth() + 1).padStart(2, '0');
        const dayStr = String(matchDateObj.getDate()).padStart(2, '0');
        matchDate = `${yearStr}-${monthStr}-${dayStr}`;
    }
    
    // Check if team has existing payment for this week
    const existingPayment = team.weeklyPayments?.find(p => p.week === selectedWeek);
    
    if (existingPayment) {
        // Populate with existing data
        const paidYesEl = document.getElementById('weeklyPaidYes');
        const paidByeEl = document.getElementById('weeklyPaidBye');
        const paidMakeupEl = document.getElementById('weeklyPaidMakeup');
        const paidPartialEl = document.getElementById('weeklyPaidPartial');
        const paidNoEl = document.getElementById('weeklyPaidNo');
        if (existingPayment.paid === 'true' && paidYesEl) {
            paidYesEl.checked = true;
        } else if (existingPayment.paid === 'bye' && paidByeEl) {
            paidByeEl.checked = true;
        } else if (existingPayment.paid === 'makeup' && paidMakeupEl) {
            paidMakeupEl.checked = true;
        } else if (existingPayment.paid === 'partial' && paidPartialEl) {
            paidPartialEl.checked = true;
        } else if (paidNoEl) {
            paidNoEl.checked = true;
        }
        
        const methodEl = document.getElementById('weeklyPaymentMethod');
        const existingMethod = existingPayment.paymentMethod || '';
        if (methodEl && existingMethod) {
            if (!Array.from(methodEl.options).some(o => o.value === existingMethod)) {
                const opt = document.createElement('option');
                opt.value = existingMethod;
                opt.textContent = existingMethod;
                methodEl.appendChild(opt);
            }
            methodEl.value = existingMethod;
        } else if (methodEl) {
            methodEl.value = existingMethod || 'cash';
        }
        document.getElementById('weeklyPaymentAmount').value = existingPayment.amount || '';
        document.getElementById('weeklyPaymentNotes').value = existingPayment.notes || '';
        document.getElementById('weeklyPaymentDate').value = existingPayment.paymentDate
            ? existingPayment.paymentDate.split('T')[0]
            : (matchDate || '');
        const paidByEl = document.getElementById('paidByPlayer');
        if (paidByEl && existingPayment.paidBy) {
            paidByEl.value = typeof existingPayment.paidBy === 'string'
                ? existingPayment.paidBy
                : (existingPayment.paidBy?.firstName && existingPayment.paidBy?.lastName
                    ? `${existingPayment.paidBy.firstName} ${existingPayment.paidBy.lastName}`.trim()
                    : '');
        }
        const existingAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(existingPayment) : (existingPayment.amount != null ? parseFloat(existingPayment.amount) : 0);
        originalPaymentAmount = existingAmt;
        togglePaidByPlayerDropdown();
        
        // Handle sanction fee players (new format) or bcaSanctionFee (old format)
        if (existingPayment.bcaSanctionPlayers && existingPayment.bcaSanctionPlayers.length > 0) {
            // New format: check the specific players
            existingPayment.bcaSanctionPlayers.forEach(playerName => {
                const checkbox = document.querySelector(`input[name="bcaSanctionPlayer"][value="${playerName}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } else if (existingPayment.bcaSanctionFee) {
            // Old format: check all players (migration)
            const checkboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]');
            checkboxes.forEach(checkbox => checkbox.checked = true);
        }
        
        // Load individual player payments if they exist
        const enableEl = document.getElementById('enableIndividualPayments');
        const containerEl = document.getElementById('individualPaymentsContainer');
        if (existingPayment.individualPayments && existingPayment.individualPayments.length > 0) {
            if (enableEl) enableEl.checked = true;
            if (containerEl) containerEl.style.display = 'block';
            existingPayment.individualPayments.forEach(payment => {
                const playerName = payment.playerName || payment.player_name || '';
                const row = Array.from(document.querySelectorAll('.individual-payment-row')).find(r => r.getAttribute('data-player') === playerName);
                if (row) {
                    const input = row.querySelector('input[name="individualPayment"]');
                    if (input) input.value = payment.amount || '';
                    const methodSelect = row.querySelector('select[name="individualPaymentMethod"]');
                    if (methodSelect) {
                        const method = payment.paymentMethod || payment.payment_method || 'cash';
                        methodSelect.value = method;
                        if (methodSelect.value !== method && !Array.from(methodSelect.options).some(o => o.value === method)) {
                            const opt = document.createElement('option');
                            opt.value = method;
                            opt.textContent = method;
                            methodSelect.appendChild(opt);
                            methodSelect.value = method;
                        }
                    }
                    const dateInput = row.querySelector('input[name="individualPaymentDate"]');
                    if (dateInput && (payment.paymentDate || payment.payment_date)) {
                        const d = payment.paymentDate || payment.payment_date;
                        dateInput.value = typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/) ? d.split('T')[0] : d;
                    }
                }
            });
            updateIndividualPaymentsTotal();
            if (typeof updateIndividualPaymentDateRequired === 'function') updateIndividualPaymentDateRequired();
        } else {
            if (enableEl) enableEl.checked = false;
            if (containerEl) containerEl.style.display = 'none';
        }
    } else {
        // Reset form (no default payment status — user must select explicitly)
        const formEl = document.getElementById('weeklyPaymentForm');
        if (formEl) {
            formEl.reset();
        }
        
        // Clear original payment amount (this is a new payment, not editing)
        originalPaymentAmount = null;
        
        // Clear "Paid By" dropdown
        const paidByEl = document.getElementById('paidByPlayer');
        if (paidByEl) {
            paidByEl.value = '';
        }
        
        // Toggle paid by dropdown based on default payment method (cash)
        togglePaidByPlayerDropdown();
        
        // Set default date to match date if available
        const dateEl = document.getElementById('weeklyPaymentDate');
        if (dateEl) {
            dateEl.value = matchDate || '';
        }
        
        // Clear all sanction fee player checkboxes
        const checkboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);

        // Reset individual payments toggle and hide container
        const enableEl = document.getElementById('enableIndividualPayments');
        const containerEl = document.getElementById('individualPaymentsContainer');
        if (enableEl) enableEl.checked = false;
        if (containerEl) containerEl.style.display = 'none';

        // Pre-select the base weekly dues amount if available
        const amountSelect = document.getElementById('weeklyPaymentAmount');
        if (amountSelect && amountSelect.options.length > 1) {
            // First option is placeholder, second option is base weekly dues
            amountSelect.selectedIndex = 1;
        }
    }

    // Always ensure team name is in modal title (same as set earlier; reinforce for resetOnly path)
    const titleEl = document.getElementById('weeklyPaymentModalTeamName');
    if (titleEl) titleEl.textContent = team.teamName || '';
    
    if (resetOnly) {
        // Form already populated; modal is already open
        return;
    }
    
    const modalElement = document.getElementById('weeklyPaymentModal');
    if (!modalElement) {
        console.error('weeklyPaymentModal element not found!');
        showAlertModal('Payment modal not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    
    // Add event listeners to handle week filter visibility
    modalElement.addEventListener('show.bs.modal', function() {
        // Hide week filter when modal is about to show
        const weekFilter = document.getElementById('weekFilter');
        const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
        if (weekFilter) {
            weekFilter.style.display = 'none';
        }
        if (weekFilterLabel) {
            weekFilterLabel.style.display = 'none';
        }
    });
    
    // Make date input clickable to open date picker and ensure week dropdown is set correctly
    modalElement.addEventListener('shown.bs.modal', function() {
        // Initialize tooltips for payment modal fields
        if (typeof initializeModalTooltips === 'function') {
            initializeModalTooltips(modalElement);
        }
        // Ensure week dropdown is set to the correct week (defensive check after modal is shown)
        const weekEl = document.getElementById('weeklyPaymentWeek');
        if (weekEl && currentWeeklyPaymentWeek) {
            const expectedValue = String(currentWeeklyPaymentWeek);
            if (weekEl.value !== expectedValue) {
                console.log(`Correcting week dropdown: was ${weekEl.value}, setting to ${expectedValue}`);
                weekEl.value = expectedValue;
                // If still not set, try selectedIndex
                if (weekEl.value !== expectedValue) {
                    const targetIndex = currentWeeklyPaymentWeek - 1;
                    if (targetIndex >= 0 && targetIndex < weekEl.options.length) {
                        weekEl.selectedIndex = targetIndex;
                        console.log(`Set week dropdown via selectedIndex: ${targetIndex}`);
                    }
                }
            }
        }
        
        const dateInput = document.getElementById('weeklyPaymentDate');
        if (dateInput) {
            // Add click handler to open date picker when clicking anywhere on the input
            dateInput.addEventListener('click', function() {
                this.focus();
                // For modern browsers, try to show the picker directly
                if (this.showPicker) {
                    try {
                        this.showPicker();
                    } catch (e) {
                        // showPicker() might not be supported, just focus is enough
                    }
                }
            });
        }
    });
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        // Restore week filter when modal is closed (if division is selected)
        setTimeout(() => {
            const divisionFilter = document.getElementById('divisionFilter');
            const weekFilter = document.getElementById('weekFilter');
            const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
            
            if (divisionFilter && divisionFilter.value && divisionFilter.value !== 'all') {
                if (weekFilter) {
                    weekFilter.style.display = 'block';
                }
                if (weekFilterLabel) {
                    weekFilterLabel.style.display = 'block';
                }
            }
        }, 100);
    });
    
    modal.show();
}

function weeklyPaymentAddAnother() {
    if (!currentWeeklyPaymentTeamId) return;
    const weeklyPaymentModal = document.getElementById('weeklyPaymentModal');
    if (weeklyPaymentModal) {
        const modalInstance = bootstrap.Modal.getInstance(weeklyPaymentModal);
        if (modalInstance) modalInstance.hide();
    }
    if (typeof showPaymentHistory === 'function') {
        setTimeout(() => showPaymentHistory(currentWeeklyPaymentTeamId), 300);
    }
}
