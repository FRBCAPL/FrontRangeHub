function showPermanentDeleteConfirmModal(team, teamId) {
    const modal = document.getElementById('permanentDeleteConfirmModal');
    const step1 = document.getElementById('permanentDeleteStep1');
    const step2 = document.getElementById('permanentDeleteStep2');
    const teamName1 = document.getElementById('permanentDeleteTeamName1');
    const teamName2 = document.getElementById('permanentDeleteTeamName2');
    const confirmBtn = document.getElementById('permanentDeleteConfirmBtn');
    const cancelBtn = document.getElementById('permanentDeleteCancelBtn');
    
    if (!modal || !step1 || !step2 || !teamName1 || !teamName2 || !confirmBtn || !cancelBtn) {
        // Fallback to browser confirm if modal elements not found
        const confirmed = confirm(`PERMANENTLY DELETE "${team.teamName}"?\n\n⚠️ WARNING: This will permanently delete the team and ALL associated data including:\n- Payment history\n- Team members\n- All records\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`);
        if (confirmed) {
            const doubleConfirmed = confirm(`FINAL CONFIRMATION:\n\nYou are about to PERMANENTLY DELETE "${team.teamName}".\n\nThis is your last chance to cancel.`);
            if (doubleConfirmed) {
                executePermanentDelete(team, teamId);
            }
        }
        return;
    }
    
    // Set team name in both steps
    teamName1.textContent = `"${team.teamName}"`;
    teamName2.textContent = `"${team.teamName}"`;
    
    // Reset to step 1
    step1.style.display = 'block';
    step2.style.display = 'none';
    confirmBtn.textContent = 'Continue to Final Confirmation';
    confirmBtn.onclick = () => {
        // Move to step 2
        step1.style.display = 'none';
        step2.style.display = 'block';
        confirmBtn.innerHTML = '<i class="fas fa-trash-alt me-2"></i>Yes, Delete Permanently';
        confirmBtn.onclick = () => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            executePermanentDelete(team, teamId);
        };
    };
    
    // Cancel button closes modal
    cancelBtn.onclick = () => {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    };
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Execute the permanent delete after confirmations
async function executePermanentDelete(team, teamId) {
    try {
        showLoadingMessage('Permanently deleting team...');
        
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'DELETE'
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            showAlertModal(`Team "${team.teamName}" has been permanently deleted.`, 'success', 'Success');
            
            // Close modals if open
            const addTeamModal = bootstrap.Modal.getInstance(document.getElementById('addTeamModal'));
            if (addTeamModal) addTeamModal.hide();
            
            // Reload data
            await loadData();
            
            // Refresh archived teams modal if it's open
            const archivedModal = document.getElementById('archivedTeamsModal');
            if (archivedModal && archivedModal.classList.contains('show')) {
                showArchivedTeamsModal();
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error deleting team.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error permanently deleting team:', error);
        showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
    }
}

// Render archived teams table
function renderArchivedTeamsTable(archivedTeamsToRender) {
    const tbody = document.getElementById('archivedTeamsTableBody');
    const noArchivedTeams = document.getElementById('noArchivedTeams');
    
    if (!tbody) {
        console.error('Archived teams table body not found!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (archivedTeamsToRender.length === 0) {
        if (noArchivedTeams) noArchivedTeams.style.display = 'block';
        tbody.innerHTML = '';
    } else {
        if (noArchivedTeams) noArchivedTeams.style.display = 'none';
        
        archivedTeamsToRender.forEach(team => {
            const row = document.createElement('tr');
            
            // Get division name
            const divisionName = team.division || 'No Division';
            
            // Get captain name
            const captainName = team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : 'N/A');
            const formattedCaptainName = captainName && captainName !== 'N/A' ? formatPlayerName(captainName) : captainName;
            
            // Get member count
            const memberCount = team.teamMembers ? team.teamMembers.length : 0;
            
            // Get archived date (if available)
            let archivedDate = '-';
            if (team.archivedAt) {
                try {
                    const date = new Date(team.archivedAt);
                    archivedDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                } catch (e) {
                    console.warn('Error formatting archived date:', e);
                }
            } else if (team.updatedAt) {
                // Fallback to updatedAt if archivedAt not available
                try {
                    const date = new Date(team.updatedAt);
                    archivedDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                } catch (e) {
                    console.warn('Error formatting updated date:', e);
                }
            }
            
            row.innerHTML = `
                <td><strong>${(team.teamName || '').replace(/</g, '&lt;')}</strong></td>
                <td>${(divisionName || '-').replace(/</g, '&lt;')}</td>
                <td>${(formattedCaptainName || '-').replace(/</g, '&lt;')}</td>
                <td>${memberCount}</td>
                <td><small class="text-muted">${archivedDate}</small></td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="restoreArchivedTeam('${team._id}')" title="Restore Team">
                        <i class="fas fa-undo me-1"></i>Restore
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="permanentlyDeleteTeam('${team._id}')" title="Permanently Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Show archived teams modal
async function showArchivedTeamsModal() {
    try {
        console.log('🔍 Showing archived teams modal. Current teams in memory:', teams.length);
        
        // Save current pagination state
        const savedPage = currentPage;
        const savedPerPage = teamsPerPage;
        const savedTeams = [...teams]; // Save current teams array
        
        // Load ALL teams (including archived) to get complete list
        await loadAllTeamsForArchivedModal();
        
        console.log('🔍 Total teams after loading all:', teams.length);
        console.log('🔍 Teams archive status:', teams.map(t => ({ 
            name: t.teamName, 
            isArchived: t.isArchived, 
            isActive: t.isActive 
        })));
        
        // Get all archived teams (explicitly check for isArchived === true)
        const archivedTeams = teams.filter(team => {
            const isArchived = team.isArchived === true;
            const isInactive = team.isActive === false;
            return isArchived || (isInactive && team.isArchived !== false);
        });
        
        console.log('🔍 Found archived teams:', archivedTeams.length, archivedTeams.map(t => t.teamName));
        
        // Cache the archived teams for sorting
        cachedArchivedTeams = [...archivedTeams];
        
        // Apply current sort if any
        let teamsToRender = [...cachedArchivedTeams];
        if (archivedTeamsSortColumn) {
            teamsToRender = sortArchivedTeamsData(teamsToRender, archivedTeamsSortColumn, archivedTeamsSortDirection);
        }
        
        // Render the table
        renderArchivedTeamsTable(teamsToRender);
        
        // Update sort icons
        updateArchivedTeamsSortIcons();
        
        // Show the modal
        const modal = document.getElementById('archivedTeamsModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            
            // Restore pagination state when modal is hidden
            modal.addEventListener('hidden.bs.modal', function restorePaginationState() {
                // Restore saved state
                currentPage = savedPage;
                teamsPerPage = savedPerPage;
                teams = savedTeams;
                
                // Reload the current page to restore main display
                loadTeams(savedPage, savedPerPage).then(() => {
                    const divisionFilterEl = document.getElementById('divisionFilter');
                    const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
                    if (selectedDivision && selectedDivision !== 'all') {
                        filterTeamsByDivision();
                    } else {
                        displayTeams(filteredTeams);
                    }
                });
                
                // Remove this listener after first use
                modal.removeEventListener('hidden.bs.modal', restorePaginationState);
            }, { once: true });
            
            bsModal.show();
        } else {
            console.error('Archived teams modal not found!');
            showAlertModal('Archived teams modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error showing archived teams:', error);
        showAlertModal('Error loading archived teams. Please try again.', 'error', 'Error');
    }
}

// Load all teams (including archived) for the archived teams modal
async function loadAllTeamsForArchivedModal() {
    try {
        // Load all teams including archived with a very high limit
        // Use includeArchived=true query parameter to get archived teams
        const response = await apiCall('/teams?page=1&limit=10000&includeArchived=true');
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading all teams for archived modal');
            return;
        }
        
        if (!response.ok) {
            console.warn('⚠️ Failed to load all teams for archived modal:', response.status);
            return;
        }
        
        const responseData = await response.json();
        
        // Handle both old format (array) and new format (object with pagination)
        let allTeamsData;
        if (Array.isArray(responseData)) {
            allTeamsData = responseData;
        } else {
            allTeamsData = responseData.teams || [];
        }
        
        // Store all teams (including archived) in the global teams array temporarily
        // This doesn't affect the main display since we filter in displayTeams()
        teams = allTeamsData;
        
        console.log('✅ Loaded all teams for archived modal:', allTeamsData.length, '(including archived)');
    } catch (error) {
        console.error('❌ Error loading all teams for archived modal:', error);
    }
}

// Sort archived teams
function sortArchivedTeams(column) {
    // Toggle sort direction if clicking the same column, otherwise default to ascending
    if (archivedTeamsSortColumn === column) {
        archivedTeamsSortDirection = archivedTeamsSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        archivedTeamsSortColumn = column;
        archivedTeamsSortDirection = 'asc';
    }
    
    // Sort the cached archived teams
    const sortedTeams = sortArchivedTeamsData([...cachedArchivedTeams], archivedTeamsSortColumn, archivedTeamsSortDirection);
    
    // Re-render the table
    renderArchivedTeamsTable(sortedTeams);
    
    // Update sort icons
    updateArchivedTeamsSortIcons();
}

// Sort archived teams data
function sortArchivedTeamsData(teamsToSort, column, direction) {
    const sorted = [...teamsToSort];
    sorted.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
            case 'teamName':
                aValue = (a.teamName || '').toLowerCase();
                bValue = (b.teamName || '').toLowerCase();
                break;
            case 'division':
                aValue = (a.division || 'No Division').toLowerCase();
                bValue = (b.division || 'No Division').toLowerCase();
                break;
            case 'captain': {
                const aCaptain = a.captainName || (a.teamMembers && a.teamMembers[0] ? a.teamMembers[0].name : 'N/A');
                const bCaptain = b.captainName || (b.teamMembers && b.teamMembers[0] ? b.teamMembers[0].name : 'N/A');
                aValue = (aCaptain || 'N/A').toLowerCase();
                bValue = (bCaptain || 'N/A').toLowerCase();
                break;
            }
            case 'members':
                aValue = (a.teamMembers ? a.teamMembers.length : 0);
                bValue = (b.teamMembers ? b.teamMembers.length : 0);
                break;
            case 'archivedDate': {
                // Sort by archived date (use archivedAt if available, otherwise updatedAt)
                const aDate = a.archivedAt ? new Date(a.archivedAt) : (a.updatedAt ? new Date(a.updatedAt) : new Date(0));
                const bDate = b.archivedAt ? new Date(b.archivedAt) : (b.updatedAt ? new Date(b.updatedAt) : new Date(0));
                aValue = aDate.getTime();
                bValue = bDate.getTime();
                break;
            }
            default:
                return 0;
        }
        
        // Compare values
        if (aValue < bValue) {
            return direction === 'asc' ? -1 : 1;
        } else if (aValue > bValue) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    return sorted;
}

// Update sort icons in archived teams table headers
function updateArchivedTeamsSortIcons() {
    // Reset all icons
    const columns = ['teamName', 'division', 'captain', 'members', 'archivedDate'];
    columns.forEach(col => {
        const icon = document.getElementById(`sortIcon-${col}`);
        if (icon) {
            icon.className = 'fas fa-sort text-muted';
        }
    });
    
    // Set icon for current sort column
    if (archivedTeamsSortColumn) {
        const icon = document.getElementById(`sortIcon-${archivedTeamsSortColumn}`);
        if (icon) {
            if (archivedTeamsSortDirection === 'asc') {
                icon.className = 'fas fa-sort-up text-primary';
            } else {
                icon.className = 'fas fa-sort-down text-primary';
            }
        }
    }
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

// Check if user has Pro or Enterprise plan
async function canExport() {
    try {
        const response = await apiCall('/profile');
        if (!response.ok) {
            return false;
        }
        
        const data = await response.json();
        const subscriptionStatus = data.subscriptionStatus || {};
        const plan = data.subscriptionPlan || {};
        const effectiveTier = subscriptionStatus.effectiveTier || plan.tier || subscriptionStatus.tier || 'free';
        
        // Allow export for pro and enterprise plans
        return effectiveTier === 'pro' || effectiveTier === 'enterprise';
    } catch (error) {
        console.error('Error checking export permission:', error);
        return false;
    }
}

// Check export access and show/hide export button
async function checkExportAccess() {
    try {
        // Find export button by onclick attribute or by text content
        const exportButton = document.querySelector('button[onclick*="showExportModal"]') || 
                            Array.from(document.querySelectorAll('button')).find(btn => 
                                btn.textContent.includes('Export') || btn.getAttribute('title') === 'Export Data'
                            );
        
        if (!exportButton) {
            console.log('Export button not found, will check again later');
            return;
        }
        
        const hasAccess = await canExport();
        if (!hasAccess) {
            exportButton.style.display = 'none';
            console.log('Export button hidden - user does not have Pro/Enterprise plan');
        } else {
            exportButton.style.display = '';
            console.log('Export button visible - user has Pro/Enterprise plan');
        }
    } catch (error) {
        console.error('Error checking export access:', error);
    }
}

// Get current subscription tier
async function getSubscriptionTier() {
    try {
        const response = await apiCall('/profile');
        if (!response.ok) {
            return 'free';
        }
        
        const data = await response.json();
        const subscriptionStatus = data.subscriptionStatus || {};
        const plan = data.subscriptionPlan || {};
        return subscriptionStatus.effectiveTier || plan.tier || subscriptionStatus.tier || 'free';
    } catch (error) {
        console.error('Error getting subscription tier:', error);
        return 'free';
    }
}

// Populate team filter options (filtered by export division selection)
