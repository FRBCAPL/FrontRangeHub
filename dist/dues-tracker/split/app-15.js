function populateDivisionDropdown() {
    const divisionSelect = document.getElementById('fargoDivisionSelect');
    if (!divisionSelect) {
        console.error('fargoDivisionSelect element not found');
        return;
    }
    
    divisionSelect.innerHTML = '<option value="">Select a division...</option>';
    
    availableDivisions.forEach(division => {
        const option = document.createElement('option');
        option.value = division.id;
        option.textContent = division.name;
        divisionSelect.appendChild(option);
    });
    
    // Show the division selection section
    const fargoConfig = document.getElementById('fargoConfig');
    if (fargoConfig) fargoConfig.style.display = 'block';
}

function onDivisionSelected() {
    const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
    const fargoDivisionId = document.getElementById('fargoDivisionId');
    
    if (!fargoDivisionSelect) {
        console.error('fargoDivisionSelect element not found');
        return;
    }
    
    const selectedDivisionId = fargoDivisionSelect.value;
    const manualDivisionId = fargoDivisionId ? fargoDivisionId.value.trim() : '';
    
    // If a division is selected, automatically fetch teams
    if (selectedDivisionId) {
        // Store the division ID for fetching teams
        window.__lastFargoImport = window.__lastFargoImport || {};
        window.__lastFargoImport.divisionId = selectedDivisionId;
        
        // Automatically fetch teams for the selected division
        fetchSelectedDivisionTeams();
    }
}

// Add event listener for manual division ID input when modal opens
function setupManualDivisionIdListener() {
    const manualDivisionIdInput = document.getElementById('fargoDivisionId');
    if (manualDivisionIdInput) {
        const divisionId = manualDivisionIdInput.value.trim();
        
        if (divisionId) {
            // Store the division ID for fetching teams
            window.__lastFargoImport = window.__lastFargoImport || {};
            window.__lastFargoImport.divisionId = divisionId;
            
            // Fetch teams for the entered division ID
            fetchSelectedDivisionTeams();
        } else {
            showAlertModal('Please enter a Division ID', 'warning', 'Missing Division ID');
        }
    } else {
        console.error('fargoDivisionId input not found');
    }
}

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

function showPreviewSection() {
    console.log('🔍 showPreviewSection() called');
    
    // Find the visible preview section (could be in smartBuilderModal or divisionManagementModal)
    const previewSections = document.querySelectorAll('#previewSection');
    const createSections = document.querySelectorAll('#createSection');
    const teamsPreviews = document.querySelectorAll('#teamsPreview');
    
    console.log('Found preview sections:', previewSections.length);
    console.log('Found create sections:', createSections.length);
    console.log('Found teams previews:', teamsPreviews.length);
    
    // Find which modal is currently visible/open
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    const divisionModal = document.getElementById('divisionManagementModal');
    
    let activePreviewSection = null;
    let activeCreateSection = null;
    let activeTeamsPreview = null;
    
    // Check if divisionManagementModal is open and visible (LMS/CSI tab)
    const isDivisionModalOpen = divisionModal && (
        divisionModal.classList.contains('show') || 
        window.getComputedStyle(divisionModal).display !== 'none' ||
        divisionModal.offsetParent !== null
    );
    
    if (isDivisionModalOpen) {
        console.log('✅ Division Management Modal is open');
        // Find preview section within divisionManagementModal (LMS/CSI tab content)
        const lmsTabPane = document.getElementById('lms-csi-pane');
        if (lmsTabPane) {
            console.log('✅ Found LMS/CSI tab pane, active:', lmsTabPane.classList.contains('active'));
            // Check if LMS tab is active (Bootstrap uses 'active' class on tab-pane)
            if (lmsTabPane.classList.contains('active') || lmsTabPane.classList.contains('show')) {
                activePreviewSection = lmsTabPane.querySelector('#previewSection');
                activeCreateSection = lmsTabPane.querySelector('#createSection');
                activeTeamsPreview = lmsTabPane.querySelector('#teamsPreview');
                console.log('Found preview in LMS tab:', !!activePreviewSection);
                console.log('Found create in LMS tab:', !!activeCreateSection);
                console.log('Found teams preview in LMS tab:', !!activeTeamsPreview);
            } else {
                console.log('⚠️ LMS tab pane exists but is not active');
            }
        } else {
            console.log('⚠️ Could not find lms-csi-pane element');
        }
    }
    // Check if smartBuilderModal is open and visible
    else if (smartBuilderModal && (smartBuilderModal.classList.contains('show') || smartBuilderModal.style.display !== 'none')) {
        console.log('✅ Smart Builder Modal is open');
        // Find preview section within smartBuilderModal
        activePreviewSection = smartBuilderModal.querySelector('#previewSection');
        activeCreateSection = smartBuilderModal.querySelector('#createSection');
        activeTeamsPreview = smartBuilderModal.querySelector('#teamsPreview');
    }
    
    // Fallback: search within any visible modal
    if (!activePreviewSection || !activeTeamsPreview) {
        console.log('⚠️ Trying fallback: searching within visible modals');
        // Try to find elements within the divisionManagementModal regardless of tab state
        if (divisionModal) {
            const fallbackPreview = divisionModal.querySelector('#previewSection');
            const fallbackCreate = divisionModal.querySelector('#createSection');
            const fallbackTeams = divisionModal.querySelector('#teamsPreview');
            if (fallbackPreview && !activePreviewSection) {
                console.log('✅ Found preview section in division modal (fallback)');
                activePreviewSection = fallbackPreview;
            }
            if (fallbackCreate && !activeCreateSection) {
                activeCreateSection = fallbackCreate;
            }
            if (fallbackTeams && !activeTeamsPreview) {
                console.log('✅ Found teams preview in division modal (fallback)');
                activeTeamsPreview = fallbackTeams;
            }
        }
    }
    
    // Final fallback: use first available if we still couldn't find the active one
    if (!activePreviewSection && previewSections.length > 0) {
        console.log('⚠️ Using final fallback: first preview section');
        activePreviewSection = previewSections[0];
    }
    if (!activeCreateSection && createSections.length > 0) {
        activeCreateSection = createSections[0];
    }
    if (!activeTeamsPreview && teamsPreviews.length > 0) {
        console.log('⚠️ Using final fallback: first teams preview');
        activeTeamsPreview = teamsPreviews[0];
    }
    
    if (activePreviewSection) {
        console.log('✅ Showing preview section');
        activePreviewSection.style.display = 'block';
    } else {
        console.error('❌ Could not find preview section');
    }
    if (activeCreateSection) {
        console.log('✅ Showing create section');
        activeCreateSection.style.display = 'block';
    } else {
        console.error('❌ Could not find create section');
    }
    
    // Populate the teams preview table
    if (!activeTeamsPreview) {
        console.error('❌ Could not find teamsPreview element');
        return;
    }
    
    console.log('✅ Found teams preview, populating with', fargoTeamData.length, 'teams');
    const tbody = activeTeamsPreview;
    tbody.innerHTML = '';
    
    // Find the active modal to get the correct field instances (same pattern as createTeamsAndDivision)
    const activeModal = document.querySelector('.modal.show');
    const searchContainer = activeModal || document;
    
    // Get duesPerPlayer from active modal (same pattern as createTeamsAndDivision)
    const duesPerPlayerField = searchContainer.querySelector('#duesPerPlayer') ||
                               document.getElementById('duesPerPlayer');
    const duesPerPlayer = parseInt(duesPerPlayerField?.value || '8') || 8;
    
    const playersPerWeek = 5; // Default, matches division creation
    const doublePlayMultiplier = 1; // Default to single play
    const weeklyTeamDues = duesPerPlayer * playersPerWeek * doublePlayMultiplier;
    
    // For preview, assume 1 week (division just created = today's date = 1 week)
    // Actual dues will be calculated based on division start date when teams are created
    const previewWeeks = 1;
    const previewDues = weeklyTeamDues * previewWeeks;
    
        fargoTeamData.forEach((team, index) => {
            const row = document.createElement('tr');
            const playerCount = team.playerCount || 1;
            // Note: This is just a preview. Actual dues will be calculated based on weeks passed
            const totalDues = previewDues; // Same for all teams (based on weeks, not player count)
            
            // Show additional players if available (compact format)
            let playersInfo = '';
            if (team.players && team.players.length > 1) {
                // Show first 3 players, then count
                const displayPlayers = team.players.slice(0, 3);
                const remainingCount = team.players.length - 3;
                if (remainingCount > 0) {
                    playersInfo = `${displayPlayers.join(', ')} +${remainingCount} more`;
                } else {
                    playersInfo = displayPlayers.join(', ');
                }
            } else {
                playersInfo = 'No additional players';
            }
            
            const captainName = team.captain || 'Unknown Captain';
            const escapedCaptainName = captainName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            row.innerHTML = `
                <td style="width: 40px;">
                    <input type="checkbox" class="team-checkbox" value="${index}" checked data-team-index="${index}" onchange="updateSelectedCount(); updateDivisionStats();">
                </td>
                <td style="width: 25%;"><strong>${(team.name || 'Unknown Team').replace(/</g, '&lt;')}</strong></td>
                <td style="width: 20%;">
                    <span id="captain-display-${index}">${escapedCaptainName}</span>
                    <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${index})" title="Edit Captain" style="font-size: 0.85rem;">
                        <i class="fas fa-edit text-primary"></i>
                    </button>
                </td>
                <td style="width: 30%;"><small class="text-muted">${playersInfo}</small></td>
                <td style="width: 10%; text-align: center;">
                    <span class="badge bg-info me-1">${playerCount}</span>
                    <strong>$${totalDues}</strong>
                </td>
            `;
            tbody.appendChild(row);
        });
    
    // Update counts and division name when preview is shown
    updateSelectedCount();
    
    // Also set up listeners for division name fields in case they weren't set up yet
    setupDivisionNameListeners();
    
    // Set up listener for dues field changes to update preview
    setupDuesFieldListener();
    
    // Show the import button (reuse smartBuilderModal variable declared earlier in function)
    let createTeamsBtn = null;
    
    if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
        createTeamsBtn = smartBuilderModal.querySelector('#createTeamsBtn');
    }
    
    // Fallback: search globally
    if (!createTeamsBtn) {
        createTeamsBtn = document.getElementById('createTeamsBtn');
    }
    
    if (createTeamsBtn) {
        createTeamsBtn.style.display = 'inline-block';
        console.log('✅ Import button shown in showPreviewSection');
    } else {
        console.warn('⚠️ createTeamsBtn not found in showPreviewSection');
    }
    
    // Update division stats in footer after preview is shown
    updateDivisionStats();
}

// Function to set up event listener for dues field changes
