async function fetchSelectedDivisionTeams() {
    console.log('🚀 fetchSelectedDivisionTeams() STARTED');
    
    // Try to get division ID from various sources
    let selectedDivisionId = '';
    
    // Check fargoDivisionSelect (Smart Builder modal)
    const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
    if (fargoDivisionSelect && fargoDivisionSelect.value) {
        selectedDivisionId = fargoDivisionSelect.value;
    }
    
    // Check fargoDivisionId (manual input in Smart Builder)
    const fargoDivisionId = document.getElementById('fargoDivisionId');
    if (!selectedDivisionId && fargoDivisionId && fargoDivisionId.value.trim()) {
        selectedDivisionId = fargoDivisionId.value.trim();
    }
    
    // Check selectedDivision (if exists in other modals)
    if (!selectedDivisionId) {
        const selectedDivision = document.getElementById('selectedDivision');
        if (selectedDivision && selectedDivision.value) {
            selectedDivisionId = selectedDivision.value;
        }
    }
    
    // Check manualDivisionId (if exists in other modals)
    const manualDivisionId =
        document.getElementById('manualDivisionId')?.value?.trim() ||
        document.getElementById('manualDivisionId2')?.value?.trim() ||
        '';
    
    // Get URL from the correct input based on update mode (use same logic as fetchFargoDivisions)
    const updateModeRadios = document.querySelectorAll('input[name="updateMode"]:checked');
    const updateMode = updateModeRadios.length > 0 ? updateModeRadios[0].value : 'create';
    console.log('📋 fetchSelectedDivisionTeams updateMode:', updateMode);
    
    // Get all URL inputs (there might be multiple - one in smartBuilderModal, one in divisionManagementModal)
    const allCreateInputs = document.querySelectorAll('#fargoLeagueUrl');
    const allUpdateInputs = document.querySelectorAll('#fargoLeagueUrlUpdate');
    
    let fargoLeagueUrl = '';
    
    // Try to get URL from the visible/active input based on mode
    if (updateMode === 'update') {
        // Check all update inputs and use the first one with a value
        for (const input of allUpdateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in update input (fetchSelectedDivisionTeams):', value.substring(0, 50) + '...');
                break;
            }
        }
    } else {
        // Check all create inputs and use the first one with a value
        for (const input of allCreateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in create input (fetchSelectedDivisionTeams):', value.substring(0, 50) + '...');
                break;
            }
        }
    }
    
    // If still empty, try both types as fallback (check all inputs)
    if (!fargoLeagueUrl) {
        console.log('⚠️ No URL found in mode-specific input, trying all inputs (fetchSelectedDivisionTeams)...');
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
    
    console.log('Final fargoLeagueUrl length (fetchSelectedDivisionTeams):', fargoLeagueUrl.length);
    
    // If URL is empty, try to fall back to the last successfully parsed import IDs.
    // This prevents the "Missing URL" warning when data was already extracted.
    let urlParams;
    if (!fargoLeagueUrl) {
        const cached = window.__lastFargoImport || {};
        if (cached.leagueId) {
            urlParams = new URLSearchParams();
            urlParams.set('leagueId', cached.leagueId);
            if (cached.divisionIdFromUrl) urlParams.set('divisionId', cached.divisionIdFromUrl);
        } else {
            console.error('❌ No URL found in fetchSelectedDivisionTeams and no cached leagueId');
            showAlertModal('Please enter the FargoRate League Reports URL', 'warning', 'Missing URL');
            return;
        }
    }
    
    // Extract League ID and Division ID from the URL (if we didn't already build urlParams from cache)
    if (!urlParams) {
        try {
            urlParams = new URLSearchParams(new URL(fargoLeagueUrl).search);
        } catch (e) {
            console.error('❌ Invalid URL format:', e);
            showAlertModal('Invalid URL format. Please enter a valid FargoRate URL.', 'error', 'Invalid URL');
            return;
        }
    }
    
    const leagueId = urlParams.get('leagueId');
    const divisionIdFromUrl = urlParams.get('divisionId');

    // Keep cache up to date for subsequent steps
    window.__lastFargoImport = window.__lastFargoImport || {};
    window.__lastFargoImport.leagueId = leagueId || window.__lastFargoImport.leagueId || '';
    window.__lastFargoImport.divisionIdFromUrl = divisionIdFromUrl || window.__lastFargoImport.divisionIdFromUrl || '';
    
    console.log('📋 Extracted from URL - leagueId:', leagueId, 'divisionId:', divisionIdFromUrl);
    
    if (!leagueId) {
        showAlertModal('Could not extract League ID from the URL. Please make sure the URL is correct.', 'error', 'Invalid URL');
        return;
    }
    
    // Use division ID from URL first, then manual input, then selected division
    const divisionId = divisionIdFromUrl || manualDivisionId || selectedDivisionId;
    
    console.log('📋 Using divisionId:', divisionId, '(from URL:', !!divisionIdFromUrl, 'manual:', !!manualDivisionId, 'selected:', !!selectedDivisionId, ')');
    
    if (!divisionId || divisionId === 'manual') {
        showAlertModal('Please select a division, enter a division ID manually, or use a FargoRate URL that includes the divisionId parameter.', 'warning', 'Missing Division');
        return;
    }
    
    const requestBody = {
        leagueId: leagueId,
        divisionId: divisionId
    };
    
    console.log('📤 Fetching FargoRate data:');
    console.log('  League ID:', leagueId);
    console.log('  Division ID:', divisionId);
    console.log('  Source:', divisionIdFromUrl ? 'URL' : (manualDivisionId ? 'manual' : 'dropdown'));
    console.log('  Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('  API URL:', `${API_BASE_URL}/fargo-scraper/standings`);
    
    // Show loading indicator (already shown in fetchFargoDivisions, but ensure it's visible)
    const loadingSpinners = document.querySelectorAll('#fargoLoading');
    loadingSpinners.forEach(spinner => {
        spinner.classList.remove('d-none');
    });
    
    try {
        // Use the existing FargoRate scraper endpoint
        const response = await fetch(`${API_BASE_URL}/fargo-scraper/standings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📥 Fargo scraper response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.ok) {
            const data = await response.json();
            fargoTeamData = data.teams || [];
            
            console.log('Fetched FargoRate data for League:', leagueId, 'Division:', divisionId);
            console.log('Teams found:', fargoTeamData.length);
            console.log('Team data:', fargoTeamData);
            
            if (fargoTeamData.length > 0) {
                console.log('✅ Teams fetched successfully, updateMode:', updateMode);
                console.log('📊 About to show preview first, then settings, fargoTeamData length:', fargoTeamData.length);
                if (updateMode === 'update') {
                    // Show FargoRate teams preview first
                    console.log('📋 Showing FargoRate teams preview (update mode)');
                    showFargoTeamsPreview();
                } else {
                    // Show preview first, then division settings
                    console.log('📋 Showing preview first (create mode)');
                    showPreviewSection();
                    // After preview is shown, show division settings
                    setTimeout(() => {
                        showDivisionSettingsSection();
                        // Update stats after settings are shown - additional delay to ensure fields are ready
                        setTimeout(() => {
                            updateDivisionStats();
                        }, 150);
                    }, 100);
                }
            } else {
                showAlertModal('No teams found for the selected division.', 'warning', 'No Teams Found');
            }
        } else if (response.status === 404) {
            // Endpoint doesn't exist - show helpful message
            showAlertModal('The FargoRate scraper endpoint is not available. Please contact support to enable this feature, or use the manual division creation option.', 'warning', 'Feature Unavailable');
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('❌ Fargo scraper error:');
            console.error('  Status:', response.status);
            console.error('  Status Text:', response.statusText);
            console.error('  Error Data:', JSON.stringify(errorData, null, 2));
            console.error('  League ID:', leagueId);
            console.error('  Division ID:', divisionId);
            const errorMessage = errorData.message || 'Unknown error';
            let debugInfo = '';
            if (errorData.debug) {
                debugInfo = `\n\nDebug Information:\n`;
                debugInfo += `- HTML Length: ${errorData.debug.htmlLength || 'N/A'}\n`;
                debugInfo += `- Tables Found: ${errorData.debug.tablesFound || 'N/A'}\n`;
                if (errorData.debug.potentialTeamNames && errorData.debug.potentialTeamNames.length > 0) {
                    debugInfo += `- Potential Team Names Found: ${errorData.debug.potentialTeamNames.slice(0, 5).join(', ')}\n`;
                }
            }
            console.error('Full error details:', JSON.stringify(errorData, null, 2));
            showAlertModal(`Error fetching FargoRate data: ${errorMessage}${debugInfo}\n\nPlease check the browser console for more details.`, 'error', 'FargoRate Error');
        }
    } catch (error) {
        console.error('Error fetching FargoRate data:', error);
            showAlertModal('Error fetching FargoRate data. Please make sure the URL is correct and try again.', 'error', 'FargoRate Error');
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
    console.log('✅ fetchSelectedDivisionTeams() COMPLETED');
}
