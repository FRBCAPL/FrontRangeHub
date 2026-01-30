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
    const tbody = activeTeamsPreview.querySelector('tbody') || document.getElementById('teamsPreviewBody') || activeTeamsPreview;
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
    
    const isInHouse = document.getElementById('previewInHouseCheckbox')?.checked;
    const inHouseLocation = document.getElementById('previewInHouseLocation')?.value || '';
    
    fargoTeamData.forEach((team, index) => {
        if (team.location === undefined) team.location = '';
        const row = document.createElement('tr');
        const playerCount = team.playerCount || 1;
        const totalDues = previewDues;
        
        let playersInfo = '';
        if (team.players && team.players.length > 1) {
            const displayPlayers = team.players.slice(0, 3);
            const remainingCount = team.players.length - 3;
            playersInfo = remainingCount > 0 ? `${displayPlayers.join(', ')} +${remainingCount} more` : displayPlayers.join(', ');
        } else {
            playersInfo = 'No additional players';
        }
        
        const captainName = team.captain || 'Unknown Captain';
        const escapedCaptainName = captainName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const teamLocation = (isInHouse ? inHouseLocation : (team.location || '')).replace(/"/g, '&quot;');
        const locationCell = isInHouse
            ? `<span class="text-muted small">${teamLocation || '(set above)'}</span>`
            : `<input type="text" class="form-control form-control-sm" data-team-index="${index}" value="${teamLocation}" placeholder="e.g., Main St" oninput="if(typeof fargoTeamData!=='undefined'&&fargoTeamData[${index}])fargoTeamData[${index}].location=this.value">`;
        
        row.innerHTML = `
            <td style="width: 40px;">
                <input type="checkbox" class="team-checkbox" value="${index}" checked data-team-index="${index}" onchange="updateSelectedCount(); updateDivisionStats();">
            </td>
            <td style="width: 20%;"><strong>${(team.name || 'Unknown Team').replace(/</g, '&lt;')}</strong></td>
            <td style="width: 18%;">
                <span id="captain-display-${index}">${escapedCaptainName}</span>
                <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${index}, false)" title="Edit Captain" style="font-size: 0.85rem;">
                    <i class="fas fa-edit text-primary"></i>
                </button>
            </td>
            <td style="width: 22%;"><small class="text-muted">${playersInfo}</small></td>
            <td style="width: 18%; min-width: 100px;">${locationCell}</td>
            <td style="width: 12%; text-align: center;">
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
