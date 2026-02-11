function closeWeeklyPaymentModal() {
    const modalElement = document.getElementById('weeklyPaymentModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    
    if (modalInstance) {
        modalInstance.hide();
    } else {
        // If no instance exists, create one and hide it
        const newModalInstance = new bootstrap.Modal(modalElement);
        newModalInstance.hide();
    }
    
    // Restore week filter dropdown after modal closes
    setTimeout(() => {
        const weekFilter = document.getElementById('weekFilter');
        const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
        const divisionFilter = document.getElementById('divisionFilter');
        
        // Only show week filter if a division is selected
        if (divisionFilter && divisionFilter.value && divisionFilter.value !== 'all') {
            if (weekFilter) {
                weekFilter.style.display = 'block';
            }
            if (weekFilterLabel) {
                weekFilterLabel.style.display = 'block';
            }
        }
        
        // Reset the form state after closing
        const form = document.getElementById('weeklyPaymentForm');
        const successDiv = document.getElementById('weeklyPaymentSuccess');
        const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
        const saveButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-primary');
        const cancelButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-secondary');
        if (form) form.style.display = 'block';
        if (successDiv) successDiv.classList.add('d-none');
        if (modalFooter) modalFooter.style.display = '';
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.style.display = '';
        }
        if (cancelButton) {
            cancelButton.style.display = '';
        }
    }, 300);
}

// Individual Player Payment Functions
function populateIndividualPlayerPayments(team, teamDivision, week) {
    const container = document.getElementById('individualPaymentsList');
    if (!container) {
        console.warn('individualPaymentsList element not found');
        return;
    }
    container.innerHTML = '';
    
    if (!team.teamMembers || team.teamMembers.length === 0) {
        container.innerHTML = '<small class="text-muted">No team members found</small>';
        return;
    }
    
    // Calculate weekly team dues and per-player amount
    const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
    const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5;
    const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
    const weeklyTeamDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
    const perPlayerAmount = weeklyTeamDues / playersPerWeek;
    
    // Store weekly team dues for calculation
    const weeklyTeamDuesEl = document.getElementById('weeklyTeamDuesAmount');
    if (weeklyTeamDuesEl) {
        weeklyTeamDuesEl.textContent = weeklyTeamDues.toFixed(2);
    }
    
    // Create input for each player
    team.teamMembers.forEach((member, index) => {
        const playerName = formatPlayerName(member.name);
        const row = document.createElement('div');
        row.className = 'row mb-2 align-items-center';
        row.innerHTML = `
            <div class="col-6">
                <small>${playerName}</small>
            </div>
            <div class="col-6">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">$</span>
                    <input type="number" 
                           name="individualPayment" 
                           data-player="${playerName}" 
                           class="form-control form-control-sm" 
                           placeholder="${perPlayerAmount.toFixed(2)}" 
                           min="0" 
                           step="0.01"
                           oninput="updateIndividualPaymentsTotal()">
                </div>
            </div>
        `;
        container.appendChild(row);
    });
    
    updateIndividualPaymentsTotal();
}

function toggleIndividualPayments() {
    const checkbox = document.getElementById('enableIndividualPayments');
    const container = document.getElementById('individualPaymentsContainer');
    if (!checkbox || !container) return;
    if (checkbox.checked) {
        container.style.display = 'block';
        updateIndividualPaymentsTotal();
    } else {
        container.style.display = 'none';
    }
}

function updateIndividualPaymentsTotal() {
    const inputs = document.querySelectorAll('input[name="individualPayment"]');
    let total = 0;
    inputs.forEach(input => {
        const amount = parseFloat(input.value) || 0;
        total += amount;
    });

    const totalEl = document.getElementById('individualPaymentsTotal');
    if (totalEl) totalEl.textContent = total.toFixed(2);

    const weeklyTeamDuesEl = document.getElementById('weeklyTeamDuesAmount');
    if (!weeklyTeamDuesEl) return;
    const weeklyTeamDues = parseFloat(weeklyTeamDuesEl.textContent) || 0;
    const remaining = Math.max(0, weeklyTeamDues - total);

    const remainingEl = document.getElementById('remainingDuesBalance');
    if (remainingEl) {
        remainingEl.textContent = remaining.toFixed(2);
        const parent = remainingEl.parentElement;
        if (parent) {
            if (remaining === 0 && total > 0) {
                parent.className = 'text-success';
            } else if (total > 0 && total < weeklyTeamDues) {
                parent.className = 'text-warning';
            } else {
                parent.className = 'text-info';
            }
        }
    }
}

// Smart Builder Functions
let fargoTeamData = [];
let availableDivisions = [];

const FARGO_INSTRUCTIONS_STORAGE_KEY = 'duesTracker_fargoInstructionsDontShowAgain';

function shouldShowFargoInstructions() {
    return localStorage.getItem(FARGO_INSTRUCTIONS_STORAGE_KEY) !== 'true';
}

function showFargoInstructionsModal() {
    const el = document.getElementById('fargoInstructionsModal');
    if (!el) return;
    const check = document.getElementById('fargoInstructionsDontShowAgain');
    if (check) check.checked = false;
    if (!window.__fargoInstructionsListenerAttached) {
        window.__fargoInstructionsListenerAttached = true;
        el.addEventListener('hidden.bs.modal', function onFargoInstructionsHidden() {
            const cb = document.getElementById('fargoInstructionsDontShowAgain');
            if (cb && cb.checked) {
                localStorage.setItem(FARGO_INSTRUCTIONS_STORAGE_KEY, 'true');
            }
            if (typeof window.__fargoInstructionsOnDismiss === 'function') {
                window.__fargoInstructionsOnDismiss();
                window.__fargoInstructionsOnDismiss = null;
            }
        });
    }
    const m = bootstrap.Modal.getOrCreateInstance(el);
    m.show();
}

/** Optional onDismiss: called when the instructions modal is closed. Use to e.g. open Smart Builder after "Got it". */
function showFargoInstructionsModalWithCallback(onDismiss) {
    window.__fargoInstructionsOnDismiss = typeof onDismiss === 'function' ? onDismiss : null;
    showFargoInstructionsModal();
}

function dismissFargoInstructionsModal() {
    const el = document.getElementById('fargoInstructionsModal');
    if (!el) return;
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
}

function showSmartBuilderModal(manualMode = false) {
    window.__smartBuilderManualMode = !!manualMode;
    console.log('Opening Smart Builder - manualMode:', manualMode, 'clearing previous data');
    
    const fargoScraperSection = document.getElementById('fargoScraperSection');
    const fargoConfig = document.getElementById('fargoConfig');
    const updateModeSection = document.getElementById('updateModeSection');
    const divisionSelectionSection = document.getElementById('divisionSelectionSection');
    const fargoTeamsSection = document.getElementById('fargoTeamsSection');
    const existingDivisionSection = document.getElementById('existingDivisionSection');
    const mergeConfirmationSection = document.getElementById('mergeConfirmationSection');
    const previewSection = document.getElementById('previewSection');
    const createSection = document.getElementById('createSection');
    const divisionSettingsSection = document.getElementById('divisionSettingsSection');
    const teamsSelectionSection = document.getElementById('teamsSelectionSection');
    const continueToPreviewContainer = document.getElementById('continueToPreviewContainer');
    const divisionStatsFooter = document.getElementById('divisionStatsFooter');
    const createTeamsBtn = document.getElementById('createTeamsBtn');
    const createDivisionManualBtn = document.getElementById('createDivisionManualBtn');
    const modalTitle = document.getElementById('smartBuilderModalTitle');
    
    if (fargoConfig) fargoConfig.style.display = 'none';
    if (updateModeSection) updateModeSection.style.display = 'none';
    if (divisionSelectionSection) divisionSelectionSection.style.display = 'none';
    if (fargoTeamsSection) fargoTeamsSection.style.display = 'none';
    if (existingDivisionSection) existingDivisionSection.style.display = 'none';
    if (mergeConfirmationSection) mergeConfirmationSection.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    if (createSection) createSection.style.display = 'none';
    if (divisionSettingsSection) divisionSettingsSection.style.display = 'none';
    
    if (manualMode) {
        if (fargoScraperSection) fargoScraperSection.style.display = 'none';
        if (teamsSelectionSection) teamsSelectionSection.style.display = 'none';
        if (continueToPreviewContainer) continueToPreviewContainer.style.display = 'none';
        if (divisionStatsFooter) divisionStatsFooter.style.display = 'none';
        if (createTeamsBtn) createTeamsBtn.style.display = 'none';
        if (createDivisionManualBtn) createDivisionManualBtn.style.display = 'inline-block';
        if (modalTitle) modalTitle.textContent = 'Create Division';
        if (divisionSettingsSection) {
            divisionSettingsSection.style.display = 'block';
            divisionSettingsSection.querySelector('h6').textContent = 'Division Settings';
        }
    } else {
        if (fargoScraperSection) fargoScraperSection.style.display = 'block';
        if (createDivisionManualBtn) createDivisionManualBtn.style.display = 'none';
        if (createTeamsBtn) createTeamsBtn.style.display = 'none';
        if (modalTitle) modalTitle.textContent = 'Smart Team Builder - Import from FargoRate';
    }
    
    // Remove any existing "Continue to Preview" button
    const continueBtn = document.getElementById('continueToPreviewBtn');
    if (continueBtn) {
        continueBtn.remove();
    }
    
    // Clear both URL inputs (create and update sections)
    const createUrlInput = document.getElementById('fargoLeagueUrl');
    const updateUrlInput = document.getElementById('fargoLeagueUrlUpdate');
    if (createUrlInput) createUrlInput.value = '';
    if (updateUrlInput) updateUrlInput.value = '';
    
    const selectedDivision = document.getElementById('selectedDivision');
    const manualDivisionIdInput = document.getElementById('manualDivisionId');
    const smartBuilderDivisionName = document.getElementById('smartBuilderDivisionName');
    
    if (selectedDivision) selectedDivision.value = '';
    if (manualDivisionIdInput) manualDivisionIdInput.value = '';
    if (smartBuilderDivisionName) smartBuilderDivisionName.value = '';
    // Reset all Smart Builder form fields to defaults (matching editor)
    // Set values in all instances (there might be duplicates in different modals)
    const allDuesPerPlayer = document.querySelectorAll('#duesPerPlayer');
    const allWeeklyDues = document.querySelectorAll('#smartBuilderWeeklyDues');
    const allPlayersPerWeek = document.querySelectorAll('#smartBuilderPlayersPerWeek');
    const allMatchesPerWeek = document.querySelectorAll('#smartBuilderMatchesPerWeek');
    const allTotalWeeks = document.querySelectorAll('#smartBuilderTotalWeeks');
    
    allDuesPerPlayer.forEach(input => input.value = '8');
    allWeeklyDues.forEach(s => { s.value = '8'; });
    allPlayersPerWeek.forEach(input => input.value = '5');
    allMatchesPerWeek.forEach(s => { s.value = '1'; });
    allTotalWeeks.forEach(select => select.value = '20');
    
    const matchesOtherWrap = document.getElementById('smartBuilderMatchesOtherWrap');
    const matchesOtherInput = document.getElementById('smartBuilderMatchesPerWeekOther');
    const playersOtherWrap = document.getElementById('smartBuilderPlayersOtherWrap');
    const playersOtherInput = document.getElementById('smartBuilderPlayersPerWeekOther');
    if (matchesOtherWrap) matchesOtherWrap.style.display = 'none';
    if (matchesOtherInput) { matchesOtherInput.value = ''; matchesOtherInput.required = false; }
    if (playersOtherWrap) playersOtherWrap.style.display = 'none';
    if (playersOtherInput) { playersOtherInput.value = ''; playersOtherInput.required = false; }
    if (typeof toggleSmartBuilderMatchesOther === 'function') toggleSmartBuilderMatchesOther();
    if (typeof toggleSmartBuilderPlayersOther === 'function') toggleSmartBuilderPlayersOther();
    
    // Set default start date to today
    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    // Set start date in all instances (there might be duplicates)
    const allStartDateInputs = document.querySelectorAll('#smartBuilderStartDate');
    allStartDateInputs.forEach(input => {
        input.value = startDateStr;
    });
    // Calculate end date (function will find the correct inputs)
    calculateSmartBuilderEndDate();
    
    // Reset double play
    document.getElementById('smartBuilderIsDoublePlay').checked = false;
    document.getElementById('smartBuilderDoublePlayOptions').style.display = 'none';
    
    // Clear previous FargoRate data
    fargoTeamData = [];
    
    // Clear division dropdown
    const divisionSelect = document.getElementById('fargoDivisionSelect');
    if (divisionSelect) {
        divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
    }
    
    const fargoDivisionIdInput = document.getElementById('fargoDivisionId');
    if (fargoDivisionIdInput) {
        fargoDivisionIdInput.value = '';
    }
    
    // Clear any existing preview tables
    const previewTable = document.getElementById('fargoTeamsPreviewBody');
    if (previewTable) {
        previewTable.innerHTML = '';
    }
    
    if (teamsSelectionSection && !manualMode) {
        teamsSelectionSection.style.display = 'none';
    }
    
    if (!manualMode && divisionSettingsSection) {
        divisionSettingsSection.style.display = 'none';
    }
    
    // Reset checkboxes and form fields
    const smartBuilderIsDoublePlay = document.getElementById('smartBuilderIsDoublePlay');
    if (smartBuilderIsDoublePlay) {
        smartBuilderIsDoublePlay.checked = false;
    }
    
    const smartBuilderDoublePlayOptions = document.getElementById('smartBuilderDoublePlayOptions');
    if (smartBuilderDoublePlayOptions) {
        smartBuilderDoublePlayOptions.style.display = 'none';
    }
    
    // Load existing divisions for the dropdown
    loadExistingDivisions();
    
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    if (!smartBuilderModal) {
        console.error('❌ Smart Builder modal not found!');
        showAlertModal('Smart Builder modal not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    const bsModal = new bootstrap.Modal(smartBuilderModal);

    const openSmartBuilderModal = () => {
        bsModal.show();
        console.log('✅ Smart Builder modal should now be visible');
    };

    if (!manualMode && typeof shouldShowFargoInstructions === 'function' && shouldShowFargoInstructions()) {
        console.log('✅ Showing FargoRate instructions first, then Smart Builder');
        if (typeof showFargoInstructionsModalWithCallback === 'function') {
            showFargoInstructionsModalWithCallback(openSmartBuilderModal);
        } else {
            openSmartBuilderModal();
        }
    } else {
        openSmartBuilderModal();
    }
}

function openSmartBuilder(manualMode) {
    const addDivisionModal = document.getElementById('addDivisionModal');
    const divisionManagementModal = document.getElementById('divisionManagementModal');
    if (addDivisionModal) {
        const b = bootstrap.Modal.getInstance(addDivisionModal);
        if (b) b.hide();
    }
    if (divisionManagementModal) {
        const b = bootstrap.Modal.getInstance(divisionManagementModal);
        if (b) b.hide();
    }
    setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        showSmartBuilderModal(!!manualMode);
    }, 300);
}

function openSmartBuilderFromAddDivision() {
    openSmartBuilder(false);
}

async function fetchFargoDivisions() {
    // Check which section is active and get the URL from the correct input
    const updateModeRadios = document.querySelectorAll('input[name="updateMode"]:checked');
    const updateMode = updateModeRadios.length > 0 ? updateModeRadios[0].value : 'create';
    
    console.log('🔍 fetchFargoDivisions called, updateMode:', updateMode);
    
    // Get all URL inputs (there might be multiple - one in smartBuilderModal, one in divisionManagementModal)
    const allCreateInputs = document.querySelectorAll('#fargoLeagueUrl');
    const allUpdateInputs = document.querySelectorAll('#fargoLeagueUrlUpdate');
    
    console.log('Found create inputs:', allCreateInputs.length);
    console.log('Found update inputs:', allUpdateInputs.length);
    
    let fargoLeagueUrl = '';
    
    // Try to get URL from the visible/active input based on mode
    if (updateMode === 'update') {
        // Check all update inputs and use the first one with a value
        for (const input of allUpdateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in update input:', value.substring(0, 50) + '...');
                break;
            }
        }
    } else {
        // Check all create inputs and use the first one with a value
        for (const input of allCreateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in create input:', value.substring(0, 50) + '...');
                break;
            }
        }
    }
    
    // If still empty, try both types as fallback (check all inputs)
    if (!fargoLeagueUrl) {
        console.log('⚠️ No URL found in mode-specific input, trying all inputs...');
        for (const input of allCreateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in create input (fallback):', value.substring(0, 50) + '...');
                break;
            }
        }
        if (!fargoLeagueUrl) {
            for (const input of allUpdateInputs) {
                const value = input.value.trim();
                if (value) {
                    fargoLeagueUrl = value;
                    console.log('✅ Found URL in update input (fallback):', value.substring(0, 50) + '...');
                    break;
                }
            }
        }
    }
    
    console.log('Final fargoLeagueUrl length:', fargoLeagueUrl.length);
    
    if (!fargoLeagueUrl) {
        console.error('❌ No URL found in any input field');
        showAlertModal('Please enter the FargoRate League Reports URL', 'warning', 'Missing URL');
        return;
    }
    
    // Extract League ID and Division ID from the URL
    let leagueId, divisionId;
    try {
    const urlParams = new URLSearchParams(new URL(fargoLeagueUrl).search);
        leagueId = urlParams.get('leagueId');
        divisionId = urlParams.get('divisionId');
    } catch (urlError) {
        showAlertModal('Invalid URL format. Please enter a valid FargoRate URL.', 'error', 'Invalid URL');
        return;
    }

    // Cache the last successfully parsed IDs so follow-up actions
    // (like "Fetch teams for division") don't require re-entering the URL.
    window.__lastFargoImport = window.__lastFargoImport || {};
    window.__lastFargoImport.leagueId = leagueId || '';
    window.__lastFargoImport.divisionIdFromUrl = divisionId || '';
    
    if (!leagueId) {
        showAlertModal('Could not extract League ID from the URL. Please make sure the URL is correct.', 'warning', 'Invalid URL');
        return;
    }
    
    // Show loading indicator - find all spinners (there might be multiple)
    const loadingSpinners = document.querySelectorAll('#fargoLoading');
    const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
    
    // Show all loading indicators (simple loading message)
    loadingSpinners.forEach(spinner => {
        spinner.classList.remove('d-none');
        spinner.style.display = 'inline-flex';
        spinner.innerHTML = '<span class="small text-muted">Loading...</span>';
    });
    
    importButtons.forEach(btn => {
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.dataset.originalText = originalText;
        // Smaller spinner in button
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2" style="font-size: 0.875rem;"></i><span style="font-size: 0.875rem;">Importing...</span>';
    });
    
    // Show a status message
    showLoadingMessage('Fetching teams from FargoRate... This may take a moment.');
    
    // If divisionId is in the URL, automatically fetch teams directly
    if (divisionId) {
        console.log('✅ Division ID found in URL, fetching teams directly...');
        console.log('   Division ID:', divisionId);
        // Pre-fill the manual division ID field(s) (there are duplicates across modals/tabs)
        const manualDivInputs = document.querySelectorAll('#manualDivisionId, #manualDivisionId2');
        manualDivInputs.forEach(input => {
            try { input.value = divisionId; } catch (_) {}
        });
        // Hide division selection and fetch teams directly
        const divSelectionSection = document.getElementById('divisionSelectionSection');
        if (divSelectionSection) {
            divSelectionSection.style.display = 'none';
        }
        // Fetch teams using the extracted IDs
        try {
            await fetchSelectedDivisionTeams();
        } catch (error) {
            console.error('❌ Error in fetchSelectedDivisionTeams:', error);
            showAlertModal('Error fetching teams: ' + (error.message || 'Unknown error'), 'error', 'Fetch Error');
        } finally {
            // Hide all loading spinners and re-enable buttons
            const loadingSpinners = document.querySelectorAll('#fargoLoading');
            const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
            
            loadingSpinners.forEach(spinner => {
                spinner.classList.add('d-none');
                spinner.style.display = 'none';
                spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
            });
            
            importButtons.forEach(btn => {
                btn.disabled = false;
                if (btn.dataset.originalText) {
                    btn.innerHTML = btn.dataset.originalText;
                }
            });
            
            hideLoadingMessage();
        }
        return;
    }
    
    // If no divisionId, try to get divisions (though this endpoint returns empty)
    try {
        const response = await fetch(`${API_BASE_URL}/fargo-scraper/divisions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                leagueId: leagueId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            availableDivisions = data.divisions || [];
            
            if (availableDivisions.length > 0) {
                populateDivisionDropdown();
                const fargoConfig = document.getElementById('fargoConfig');
                if (fargoConfig) fargoConfig.style.display = 'block';
            } else {
                // No divisions returned, show manual entry
                const fargoConfig = document.getElementById('fargoConfig');
                if (fargoConfig) fargoConfig.style.display = 'block';
                const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
                if (fargoDivisionSelect) {
                    fargoDivisionSelect.innerHTML = '<option value="">Enter Division ID manually</option>';
                }
            }
        } else {
            // Show manual entry on error
            const fargoConfig = document.getElementById('fargoConfig');
            if (fargoConfig) fargoConfig.style.display = 'block';
            const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
            if (fargoDivisionSelect) {
                fargoDivisionSelect.innerHTML = '<option value="">Enter Division ID manually</option>';
            }
        }
    } catch (error) {
        console.error('Error fetching divisions:', error);
        // Show manual entry on error
        const fargoConfig = document.getElementById('fargoConfig');
        if (fargoConfig) fargoConfig.style.display = 'block';
        const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
        if (fargoDivisionSelect) {
            fargoDivisionSelect.innerHTML = '<option value="">Enter Division ID manually</option>';
        }
    } finally {
        // Hide all loading spinners and re-enable buttons
        const loadingSpinners = document.querySelectorAll('#fargoLoading');
        const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
        
        loadingSpinners.forEach(spinner => {
            spinner.classList.add('d-none');
            spinner.style.display = 'none';
            spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
        });
        
        importButtons.forEach(btn => {
            btn.disabled = false;
            if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        });
        
        hideLoadingMessage();
    }
}

