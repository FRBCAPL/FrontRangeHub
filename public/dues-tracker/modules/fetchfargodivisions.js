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
