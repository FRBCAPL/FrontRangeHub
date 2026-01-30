/* players */
function showPlayersView() {
    try {
        console.log('showPlayersView called');
        populatePlayersModal();
        
        // Auto-select the current division in the players modal (if filter exists)
        const currentDivisionFilter = document.getElementById('divisionFilter');
        const playersDivisionFilter = document.getElementById('playersDivisionFilter');
        
        if (currentDivisionFilter && playersDivisionFilter) {
            const selectedDivisionId = currentDivisionFilter.value;
            if (selectedDivisionId && selectedDivisionId !== 'all') {
                // Find the division name by ID
                const selectedDivision = divisions.find(d => d._id === selectedDivisionId);
                if (selectedDivision) {
                    playersDivisionFilter.value = selectedDivision.name;
                    // Apply the filter immediately
                    if (typeof filterPlayersTable === 'function') {
                        filterPlayersTable();
                    }
                }
            }
        }
        
        const playersModal = document.getElementById('playersModal');
        if (!playersModal) {
            console.error('playersModal element not found!');
            showAlertModal('Players modal not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        
        console.log('Showing players modal');
        new bootstrap.Modal(playersModal).show();
    } catch (error) {
        console.error('Error in showPlayersView:', error);
        showAlertModal('Error opening players view. Please try again.', 'error', 'Error');
    }
}

function populatePlayersModal() {
    try {
        // Populate division filter (if it exists)
        const divisionFilter = document.getElementById('playersDivisionFilter');
        if (divisionFilter) {
            divisionFilter.innerHTML = '<option value="all">All Divisions</option>';
            if (divisions && divisions.length > 0) {
                divisions.forEach(division => {
                    const option = document.createElement('option');
                    option.value = division.name;
                    option.textContent = division.name;
                    divisionFilter.appendChild(option);
                });
            }
        } else {
            console.log('playersDivisionFilter not found - division filter may not be in the modal');
        }
        
        // Populate players table
        populatePlayersTable();
    } catch (error) {
        console.error('Error in populatePlayersModal:', error);
        throw error; // Re-throw so showPlayersView can catch it
    }
}

function normStr(s) {
    return (s || '').trim().toLowerCase();
}

function populatePlayersTable() {
    const tbody = document.getElementById('playersTableBody');
    if (!tbody) {
        console.error('playersTableBody element not found!');
        return;
    }
    tbody.innerHTML = '';
    
    allPlayersData = [];
    const byPlayer = new Map();
    
    function addPlayer(team, player, isCaptain) {
        const rawName = (player.name || '').trim();
        if (!rawName) return;
        const key = normStr(player.name);
        const teamName = (team.teamName || team.name || '').trim();
        const teamId = team._id;
        let isSanctionPaid = !!player.bcaSanctionPaid;
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (isPaid && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) &&
                    payment.bcaSanctionPlayers.some(p => normStr(p) === key)) {
                    isSanctionPaid = true;
                }
            });
        }
        const entry = {
            teamId,
            team,
            teamName,
            division: (team.division || '').trim(),
            isCaptain,
            isSanctionPaid,
            previouslySanctioned: !!player.previouslySanctioned,
            teamPlayerName: (player.name || rawName).trim() || rawName,
            sanctionStartDate: player.sanctionStartDate || null,
            sanctionEndDate: player.sanctionEndDate || null
        };
        if (!byPlayer.has(key)) {
            byPlayer.set(key, {
                player: { name: rawName, email: player.email || '', phone: player.phone || '', isCaptain, previouslySanctioned: !!player.previouslySanctioned },
                playerName: rawName,
                teams: [teamName],
                divisions: team.division ? [team.division.trim()] : [],
                entries: [entry],
                isSanctionPaid,
                previouslySanctioned: !!player.previouslySanctioned,
                email: (player.email || '').trim() || '',
                phone: (player.phone || '').trim() || ''
            });
        } else {
            const rec = byPlayer.get(key);
            if (rec.entries.some(e => e.teamId === teamId)) return;
            rec.player.isCaptain = rec.player.isCaptain || isCaptain;
            rec.previouslySanctioned = rec.previouslySanctioned || !!player.previouslySanctioned;
            if (teamName && !rec.teams.includes(teamName)) rec.teams.push(teamName);
            if (team.division) {
                const d = (team.division || '').trim();
                if (d && !rec.divisions.includes(d)) rec.divisions.push(d);
            }
            rec.entries.push(entry);
            // Use global status - if player is paid on any team, they're paid globally
            // The backend merges global player status, so use the highest status (paid > pending)
            rec.isSanctionPaid = rec.isSanctionPaid || isSanctionPaid;
            // Previously sanctioned is also global - if marked on any team, it's global
            rec.previouslySanctioned = rec.previouslySanctioned || !!player.previouslySanctioned;
        }
    }
    
    console.log('populatePlayersTable: Processing', teams.length, 'teams');
    const capNorm = (t) => normStr(t.captainName);
    teams.forEach(team => {
        if (team.captainName) {
            const captainMember = team.teamMembers?.find(m => normStr(m.name) === capNorm(team));
            addPlayer(team, {
                name: team.captainName,
                email: team.captainEmail || '',
                phone: team.captainPhone || '',
                bcaSanctionPaid: captainMember ? captainMember.bcaSanctionPaid : false,
                previouslySanctioned: !!(captainMember ? captainMember.previouslySanctioned : team.captainPreviouslySanctioned)
            }, true);
        }
        if (team.teamMembers) {
            team.teamMembers.forEach(member => {
                if (normStr(member.name) === capNorm(team)) return;
                addPlayer(team, { ...member, previouslySanctioned: !!member.previouslySanctioned }, false);
            });
        }
    });
    
    byPlayer.forEach((rec) => {
        allPlayersData.push({
            player: rec.player,
            playerName: rec.playerName,
            teams: rec.teams,
            divisions: rec.divisions,
            entries: rec.entries,
            teamName: rec.teams[0] || '',
            division: rec.divisions[0] || '',
            isSanctionPaid: rec.isSanctionPaid,
            previouslySanctioned: rec.previouslySanctioned,
            email: rec.email,
            phone: rec.phone
        });
    });
    
    console.log('populatePlayersTable: Collected', allPlayersData.length, 'unique players');
    
    if (currentPlayersSortColumn) {
        sortPlayersTable(currentPlayersSortColumn, false);
    } else {
        renderPlayersTable(allPlayersData);
        updatePlayersSummaryCards(allPlayersData);
    }
}

function renderPlayersTable(playersToRender) {
    try {
        const tbody = document.getElementById('playersTableBody');
        if (!tbody) {
            console.error('playersTableBody element not found in renderPlayersTable!');
            return;
        }
        tbody.innerHTML = '';
        
        console.log('Rendering players table with', playersToRender.length, 'players');
        
        if (!playersToRender || playersToRender.length === 0) {
            console.warn('No players data to render');
            return;
        }
        
        playersToRender.forEach(playerData => {
        const { player, teams, divisions, entries, isSanctionPaid, previouslySanctioned } = playerData;
        const teamsDisplay = (teams && teams.length) ? teams.join(', ') : '-';
        const divisionsDisplay = (divisions && divisions.length) ? divisions.join(', ') : '-';
        
        // Use global player status (not team-specific) - status applies to player across all teams
        const globalSanctionPaid = isSanctionPaid;
        const globalPreviouslySanctioned = previouslySanctioned;
        
        // Show only ONE set of buttons per player (not per team)
        // Status is global - applies to player across all teams
        // Use the first team entry for the button data (any team will work since status is global)
        const firstEntry = entries && entries.length > 0 ? entries[0] : null;
        if (!firstEntry) {
            return; // Skip if no entries
        }
        
        const playerDisplayName = (firstEntry.teamPlayerName || player.name || '').replace(/"/g, '&quot;');
        const tooltipText = entries.length > 1 
            ? ` (Applies to all ${entries.length} teams)` 
            : '';
        
        // Escape player name for onclick handler
        const escapedPlayerName = (firstEntry.teamPlayerName || player.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedEmail = (playerData.email || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedPhone = (playerData.phone || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        // Get sanction dates from first entry (they're global per player)
        const sanctionStartDate = firstEntry.sanctionStartDate || null;
        const sanctionEndDate = firstEntry.sanctionEndDate || null;
        const startDateStr = sanctionStartDate ? `'${sanctionStartDate}'` : 'null';
        const endDateStr = sanctionEndDate ? `'${sanctionEndDate}'` : 'null';
        
        const actionsHtml = `
            <button class="btn btn-sm btn-primary edit-player-btn"
                    data-player-name="${playerDisplayName}"
                    data-player-email="${(playerData.email || '').replace(/"/g, '&quot;')}"
                    data-player-phone="${(playerData.phone || '').replace(/"/g, '&quot;')}"
                    data-is-sanction-paid="${globalSanctionPaid}"
                    data-previously-sanctioned="${globalPreviouslySanctioned}"
                    title="Edit player information and sanction status"
                    onclick="editPlayer('${escapedPlayerName}', '${escapedEmail}', '${escapedPhone}', ${globalSanctionPaid}, ${globalPreviouslySanctioned}, ${startDateStr}, ${endDateStr})">
                <i class="fas fa-edit"></i> Edit
            </button>`;
        
        console.log('Generated actionsHtml for player:', player.name, 'Length:', actionsHtml.length);
        
        const row = document.createElement('tr');
        const teamCountBadge = entries && entries.length > 1 
            ? `<br><span class="badge bg-secondary" title="On ${entries.length} teams">${entries.length} teams</span>` 
            : '';
        row.innerHTML = `
            <td><strong>${(player.name || '').replace(/</g, '&lt;')}${player.isCaptain ? ' (Captain)' : ''}</strong>${teamCountBadge}</td>
            <td>${(teamsDisplay || '-').replace(/</g, '&lt;')}</td>
            <td>${(divisionsDisplay || '-').replace(/</g, '&lt;')}</td>
            <td>
                <span class="badge ${isSanctionPaid ? 'bg-success' : (previouslySanctioned ? 'bg-info' : 'bg-warning')}">
                    ${isSanctionPaid ? 'Paid' : (previouslySanctioned ? 'Previously Sanctioned' : 'Pending')}
                </span>
            </td>
            <td>
                <span class="badge ${previouslySanctioned ? 'bg-info' : 'bg-secondary'}" title="${previouslySanctioned ? 'Paid elsewhere/earlier for current year (not counted in app totals)' : 'Not previously sanctioned'}">
                    ${previouslySanctioned ? 'Yes' : 'No'}
                </span>
            </td>
            <td>
                <div class="d-flex flex-wrap gap-1">${actionsHtml}</div>
            </td>
        `;
            tbody.appendChild(row);
        });
        
        console.log('Successfully rendered', playersToRender.length, 'player rows');
        
        // Add event listeners for the buttons
        document.querySelectorAll('.sanction-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const teamId = this.dataset.teamId;
                const playerName = this.dataset.playerName;
                const currentStatus = this.dataset.currentStatus === 'true';
                const isCaptain = this.dataset.isCaptain === 'true';
                toggleSanctionStatus(teamId, playerName, currentStatus, isCaptain);
            });
        });
        
        document.querySelectorAll('.previously-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const teamId = this.dataset.teamId;
                // Decode HTML entities (browser does this automatically for data attributes, but be explicit)
                let playerName = this.dataset.playerName;
                if (playerName) {
                    // Decode HTML entities if any
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = playerName;
                    playerName = tempDiv.textContent || tempDiv.innerText || playerName;
                }
                const currentStatus = this.dataset.currentStatus === 'true';
                const isCaptain = this.dataset.isCaptain === 'true';
                
                console.log('Previously button clicked:', { teamId, playerName, currentStatus, isCaptain });
                togglePreviouslySanctioned(teamId, playerName, currentStatus, isCaptain);
            });
        });
    } catch (error) {
        console.error('Error in renderPlayersTable:', error);
        throw error;
    }
}

function sortPlayersTable(column, toggleDirection = true) {
    // Toggle sort direction if clicking the same column, otherwise default to ascending
    if (toggleDirection) {
        if (currentPlayersSortColumn === column) {
            currentPlayersSortDirection = currentPlayersSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentPlayersSortColumn = column;
            currentPlayersSortDirection = 'asc';
        }
    }
    
    // Get filtered players (apply division/status/search filters first)
    let playersToSort = [...allPlayersData];
    
    // Apply filters
    const divisionFilter = document.getElementById('playersDivisionFilter')?.value || 'all';
    const statusFilter = document.getElementById('playersStatusFilter')?.value || 'all';
    const searchTerm = (document.getElementById('playersSearchInput')?.value || '').toLowerCase();
    
    playersToSort = playersToSort.filter(playerData => {
        if (divisionFilter !== 'all') {
            const divs = playerData.divisions || (playerData.division ? [playerData.division] : []);
            if (!divs.length || !divs.includes(divisionFilter)) return false;
        }
        if (statusFilter !== 'all') {
            if (statusFilter === 'paid' && !playerData.isSanctionPaid) return false;
            if (statusFilter === 'pending' && (playerData.isSanctionPaid || playerData.previouslySanctioned)) return false;
            if (statusFilter === 'previously' && !playerData.previouslySanctioned) return false;
        }
        if (searchTerm && !(playerData.playerName || '').toLowerCase().includes(searchTerm)) return false;
        return true;
    });
    
    // Sort the players based on the selected column
    playersToSort.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
            case 'playerName':
                aValue = a.playerName || '';
                bValue = b.playerName || '';
                break;
            case 'teamName':
                aValue = (a.teams && a.teams.length) ? a.teams.join(', ') : (a.teamName || '');
                bValue = (b.teams && b.teams.length) ? b.teams.join(', ') : (b.teamName || '');
                break;
            case 'division':
                aValue = (a.divisions && a.divisions.length) ? a.divisions.join(', ') : (a.division || '');
                bValue = (b.divisions && b.divisions.length) ? b.divisions.join(', ') : (b.division || '');
                break;
            case 'email':
                aValue = a.email || '';
                bValue = b.email || '';
                break;
            case 'phone':
                aValue = a.phone || '';
                bValue = b.phone || '';
                break;
            case 'sanctionStatus': {
                // Sort by status: Pending (0) -> Previously (1) -> Paid (2)
                const getStatusRank = (playerData) => {
                    if (playerData.isSanctionPaid) {
                        return 2; // Paid
                    } else if (playerData.previouslySanctioned) {
                        return 1; // Previously
                    } else {
                        return 0; // Pending
                    }
                };
                aValue = getStatusRank(a);
                bValue = getStatusRank(b);
                
                // If same status, sort by player name
                if (aValue === bValue) {
                    aValue = a.playerName || '';
                    bValue = b.playerName || '';
                }
                break;
            }
            case 'previouslySanctioned': {
                // Sort by previously sanctioned: No (0) -> Yes (1)
                aValue = a.previouslySanctioned ? 1 : 0;
                bValue = b.previouslySanctioned ? 1 : 0;
                
                // If same, sort by player name
                if (aValue === bValue) {
                    aValue = a.playerName || '';
                    bValue = b.playerName || '';
                }
                break;
            }
            default:
                aValue = a.playerName || '';
                bValue = b.playerName || '';
        }
        
        // Compare values
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else {
            comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return currentPlayersSortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Update sort icons
    updatePlayersSortIcons(column);
    
    // Render the sorted players
    renderPlayersTable(playersToSort);
    
    // Update summary cards based on filtered/sorted data
    updatePlayersSummaryCards(playersToSort);
}

function updatePlayersSortIcons(activeColumn) {
    // Reset all sort icons in players table
    const sortIcons = document.querySelectorAll('#playersTable .sort-icon');
    sortIcons.forEach(icon => {
        icon.className = 'fas fa-sort sort-icon';
    });
    
    // Update active column icon
    const activeIcon = document.getElementById(`players-sort-icon-${activeColumn}`);
    if (activeIcon) {
        if (currentPlayersSortDirection === 'asc') {
            activeIcon.className = 'fas fa-sort-up sort-icon';
        } else {
            activeIcon.className = 'fas fa-sort-down sort-icon';
        }
    }
}

function filterPlayersTable() {
    // Re-apply sorting with current filters (sortPlayersTable handles filtering internally)
    if (currentPlayersSortColumn) {
        sortPlayersTable(currentPlayersSortColumn, false); // false = don't toggle, just re-apply sort with filters
    } else {
        // No sort, just apply filters and render
        const divisionFilter = document.getElementById('playersDivisionFilter')?.value || 'all';
        const statusFilter = document.getElementById('playersStatusFilter')?.value || 'all';
        const searchTerm = (document.getElementById('playersSearchInput')?.value || '').toLowerCase();
        
        let filteredPlayers = allPlayersData.filter(playerData => {
            if (divisionFilter !== 'all') {
                const divs = playerData.divisions || (playerData.division ? [playerData.division] : []);
                if (!divs.length || !divs.includes(divisionFilter)) return false;
            }
            if (statusFilter !== 'all') {
                if (statusFilter === 'paid' && !playerData.isSanctionPaid) return false;
                if (statusFilter === 'pending' && (playerData.isSanctionPaid || playerData.previouslySanctioned)) return false;
                if (statusFilter === 'previously' && !playerData.previouslySanctioned) return false;
            }
            if (searchTerm && !(playerData.playerName || '').toLowerCase().includes(searchTerm)) return false;
            return true;
        });
        
        renderPlayersTable(filteredPlayers);
        
        // Update summary cards based on filtered data
        updatePlayersSummaryCards(filteredPlayers);
    }
}

function updatePlayersSummaryCards(playersData) {
    let totalPlayers = playersData.length;
    let sanctionPaid = 0;
    let sanctionPending = 0;
    let previouslySanctioned = 0;
    let totalCollected = 0;
    
    playersData.forEach(playerData => {
        // "Previously Sanctioned" = paid elsewhere/earlier for current year (exempt from app totals)
        if (playerData.previouslySanctioned) {
            previouslySanctioned++;
            // Don't count in totals - they paid elsewhere/earlier
        } else if (playerData.isSanctionPaid) {
            // "Paid" = paid through this app/system (counts in totals)
            sanctionPaid++;
            totalCollected += sanctionFeeAmount;
        } else {
            // Neither paid nor previously sanctioned = pending
            sanctionPending++;
        }
    });
    
    // Update summary cards (if they exist)
    const totalPlayersCountEl = document.getElementById('totalPlayersCount');
    const sanctionPaidCountEl = document.getElementById('sanctionPaidCount');
    const sanctionPendingCountEl = document.getElementById('sanctionPendingCount');
    const previouslySanctionedCountEl = document.getElementById('previouslySanctionedCount');
    const sanctionFeesCollectedEl = document.getElementById('sanctionFeesCollected');
    
    if (totalPlayersCountEl) totalPlayersCountEl.textContent = totalPlayers;
    if (sanctionPaidCountEl) sanctionPaidCountEl.textContent = sanctionPaid;
    if (sanctionPendingCountEl) sanctionPendingCountEl.textContent = sanctionPending;
    if (previouslySanctionedCountEl) previouslySanctionedCountEl.textContent = previouslySanctioned;
    if (sanctionFeesCollectedEl) sanctionFeesCollectedEl.textContent = formatCurrency(totalCollected);
}

// Player Editor Functions
let currentEditingPlayerName = null;

function editPlayer(playerName, email = '', phone = '', isSanctionPaid = false, previouslySanctioned = false, sanctionStartDate = null, sanctionEndDate = null) {
    try {
        // Decode HTML entities if any
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = playerName;
        const decodedPlayerName = tempDiv.textContent || tempDiv.innerText || playerName;
        
        currentEditingPlayerName = decodedPlayerName;
        
        // Populate the form
        const nameEl = document.getElementById('editPlayerName');
        const emailEl = document.getElementById('editPlayerEmail');
        const phoneEl = document.getElementById('editPlayerPhone');
        const sanctionPaidEl = document.getElementById('editPlayerSanctionPaid');
        const previouslySanctionedEl = document.getElementById('editPlayerPreviouslySanctioned');
        const sanctionDatesContainer = document.getElementById('editPlayerSanctionDatesContainer');
        const sanctionStartDateEl = document.getElementById('editPlayerSanctionStartDate');
        const sanctionEndDateEl = document.getElementById('editPlayerSanctionEndDate');
        const sanctionExpiredEl = document.getElementById('editPlayerSanctionExpired');
        
        if (!nameEl || !emailEl || !phoneEl || !sanctionPaidEl || !previouslySanctionedEl) {
            console.error('Edit player form elements not found!');
            showAlertModal('Player editor form not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        
        nameEl.value = decodedPlayerName;
        emailEl.value = email || '';
        phoneEl.value = phone || '';
        
        // Remove existing event listeners by cloning and replacing BEFORE setting values
        // This prevents programmatic changes from triggering the confirmation modal
        const newSanctionPaidEl = sanctionPaidEl.cloneNode(true);
        sanctionPaidEl.parentNode.replaceChild(newSanctionPaidEl, sanctionPaidEl);
        
        // Get the updated element reference
        const updatedSanctionPaidEl = document.getElementById('editPlayerSanctionPaid');
        
        // Set checkbox values AFTER cloning (so change events won't fire from programmatic setting)
        updatedSanctionPaidEl.checked = isSanctionPaid;
        previouslySanctionedEl.checked = previouslySanctioned;
        
        // Show/hide and populate sanction date fields
        if (sanctionDatesContainer && sanctionStartDateEl && sanctionEndDateEl && sanctionExpiredEl) {
            if (isSanctionPaid) {
                sanctionDatesContainer.style.display = 'block';
                
                // Populate dates if available, otherwise set default to current calendar year
                if (sanctionStartDate && sanctionEndDate) {
                    const startDate = new Date(sanctionStartDate);
                    const endDate = new Date(sanctionEndDate);
                    const now = new Date();
                    const isExpired = now > endDate;
                    
                    // Format dates for input fields (YYYY-MM-DD)
                    sanctionStartDateEl.value = startDate.toISOString().split('T')[0];
                    sanctionEndDateEl.value = endDate.toISOString().split('T')[0];
                    sanctionExpiredEl.style.display = isExpired ? 'block' : 'none';
                } else {
                    // Set default to current calendar year (or next year if Oct-Dec)
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    let sanctionYear = now.getFullYear();
                    if (currentMonth >= 9) {
                        sanctionYear = now.getFullYear() + 1;
                    }
                    sanctionStartDateEl.value = `${sanctionYear}-01-01`;
                    sanctionEndDateEl.value = `${sanctionYear}-12-31`;
                    sanctionExpiredEl.style.display = 'none';
                }
            } else {
                sanctionDatesContainer.style.display = 'none';
                sanctionStartDateEl.value = '';
                sanctionEndDateEl.value = '';
                sanctionExpiredEl.style.display = 'none';
            }
        }
        
        // Add event listener to show/hide date fields when sanction paid checkbox changes
        const updateDateFieldsVisibility = () => {
            if (sanctionDatesContainer) {
                sanctionDatesContainer.style.display = sanctionPaidEl.checked ? 'block' : 'none';
                if (sanctionPaidEl.checked && sanctionStartDateEl && !sanctionStartDateEl.value) {
                    // Set default dates if none exist
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    let sanctionYear = now.getFullYear();
                    if (currentMonth >= 9) {
                        sanctionYear = now.getFullYear() + 1;
                    }
                    sanctionStartDateEl.value = `${sanctionYear}-01-01`;
                    sanctionEndDateEl.value = `${sanctionYear}-12-31`;
                }
            }
        };
        
        // Add event listeners for sanction paid checkbox (already cloned above)
        updatedSanctionPaidEl.addEventListener('change', async (event) => {
            console.log('Sanction paid checkbox change event fired, checked:', updatedSanctionPaidEl.checked);
            // Store the original checked state
            const wasChecked = updatedSanctionPaidEl.checked;
            
            // Handle the confirmation modal (this will uncheck if needed)
            await handleSanctionPaidChange(event);
            
            // After confirmation modal is handled, update date fields visibility based on final state
            // Use a small delay to ensure the checkbox state is set by the modal handlers
            setTimeout(() => {
                updateDateFieldsVisibility();
            }, 100);
        });
        
        // Show the modal
        const modal = document.getElementById('editPlayerModal');
        if (modal) {
            new bootstrap.Modal(modal).show();
        } else {
            console.error('editPlayerModal not found!');
            showAlertModal('Player editor modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error opening player editor:', error);
        showAlertModal('Error opening player editor. Please try again.', 'error', 'Error');
    }
}

// Handle change event for "Sanction Fee Paid" checkbox
async function handleSanctionPaidChange(event) {
    // Get checkbox directly from DOM to ensure we have the right element
    const checkbox = document.getElementById('editPlayerSanctionPaid');
    const previouslySanctionedEl = document.getElementById('editPlayerPreviouslySanctioned');
    
    if (!checkbox) {
        console.error('Sanction paid checkbox not found');
        return;
    }
    
    if (!previouslySanctionedEl) {
        console.error('Previously sanctioned checkbox not found');
        return;
    }
    
    // If being checked, show confirmation modal
    if (checkbox.checked) {
        console.log('Sanction paid checkbox checked - showing confirmation modal');
        // Temporarily uncheck to prevent accidental submission
        checkbox.checked = false;
        
        // Get player name and fee amount
        const playerName = document.getElementById('editPlayerName')?.value || currentEditingPlayerName || 'this player';
        const feeAmount = formatCurrency(sanctionFeeAmount);
        
        // Populate confirmation modal
        const amountEl = document.getElementById('confirmSanctionFeeAmount');
        const nameEl = document.getElementById('confirmSanctionPlayerName');
        if (amountEl) amountEl.textContent = feeAmount;
        if (nameEl) nameEl.textContent = playerName;
        
        // Show the confirmation modal
        const confirmModal = document.getElementById('sanctionFeeConfirmModal');
        if (!confirmModal) {
            console.error('Sanction fee confirmation modal not found');
            // Fallback to simple confirm
            const addToTotals = confirm(`Add ${feeAmount} sanction fee for "${playerName}" to the total sanction fees collected?`);
            if (addToTotals) {
                checkbox.checked = true;
                previouslySanctionedEl.checked = false;
            }
            return;
        }
        
        console.log('Showing sanction fee confirmation modal');
        
        // Check if Bootstrap is available
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
            console.error('Bootstrap Modal not available');
            // Fallback to simple confirm
            const addToTotals = confirm(`Should ${feeAmount} sanction fee for "${playerName}" be calculated (included in totals)?\n\nClick OK to calculate it, or Cancel to mark as "Previously Sanctioned" (not calculated).`);
            if (addToTotals) {
                checkbox.checked = true;
                previouslySanctionedEl.checked = false;
            } else {
                checkbox.checked = false;
                previouslySanctionedEl.checked = true;
            }
            return;
        }
        
        const modal = new bootstrap.Modal(confirmModal);
        
        // Remove existing event listeners by cloning buttons
        const addToTotalsBtn = document.getElementById('sanctionConfirmAddToTotalsBtn');
        const paidElsewhereBtn = document.getElementById('sanctionConfirmPaidElsewhereBtn');
        const cancelBtn = document.getElementById('sanctionConfirmCancelBtn');
        
        const newAddToTotalsBtn = addToTotalsBtn.cloneNode(true);
        addToTotalsBtn.parentNode.replaceChild(newAddToTotalsBtn, addToTotalsBtn);
        
        const newPaidElsewhereBtn = paidElsewhereBtn.cloneNode(true);
        paidElsewhereBtn.parentNode.replaceChild(newPaidElsewhereBtn, paidElsewhereBtn);
        
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Get the updateDateFieldsVisibility function reference
        const sanctionDatesContainer = document.getElementById('editPlayerSanctionDatesContainer');
        const sanctionStartDateEl = document.getElementById('editPlayerSanctionStartDate');
        const updateDateFields = () => {
            if (sanctionDatesContainer) {
                sanctionDatesContainer.style.display = checkbox.checked ? 'block' : 'none';
                if (checkbox.checked && sanctionStartDateEl && !sanctionStartDateEl.value) {
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    let sanctionYear = now.getFullYear();
                    if (currentMonth >= 9) {
                        sanctionYear = now.getFullYear() + 1;
                    }
                    sanctionStartDateEl.value = `${sanctionYear}-01-01`;
                    const sanctionEndDateEl = document.getElementById('editPlayerSanctionEndDate');
                    if (sanctionEndDateEl) {
                        sanctionEndDateEl.value = `${sanctionYear}-12-31`;
                    }
                }
            }
        };
        
        // Add new event listeners
        document.getElementById('sanctionConfirmAddToTotalsBtn').addEventListener('click', () => {
            modal.hide();
            checkbox.checked = true;
            previouslySanctionedEl.checked = false;
            updateDateFields();
        });
        
        document.getElementById('sanctionConfirmPaidElsewhereBtn').addEventListener('click', () => {
            modal.hide();
            checkbox.checked = false;
            previouslySanctionedEl.checked = true;
            updateDateFields();
        });
        
        document.getElementById('sanctionConfirmCancelBtn').addEventListener('click', () => {
            modal.hide();
            checkbox.checked = false;
            previouslySanctionedEl.checked = false;
            updateDateFields();
        });
        
        modal.show();
        console.log('Sanction fee confirmation modal should now be visible');
    } else {
        // Being unchecked - if "Previously Sanctioned" is also checked, ask what to do
        if (previouslySanctionedEl.checked) {
            // Both are being unchecked - that's fine, just let it happen
            // (user might want to clear both statuses)
        }
        console.log('Sanction paid checkbox unchecked');
    }
}

async function savePlayerChanges() {
    if (!currentEditingPlayerName) {
        showAlertModal('No player selected for editing.', 'error', 'Error');
        return;
    }
    
    try {
        const email = document.getElementById('editPlayerEmail').value.trim();
        const phone = document.getElementById('editPlayerPhone').value.trim();
        const isSanctionPaid = document.getElementById('editPlayerSanctionPaid').checked;
        const previouslySanctioned = document.getElementById('editPlayerPreviouslySanctioned').checked;
        const sanctionStartDateEl = document.getElementById('editPlayerSanctionStartDate');
        const sanctionEndDateEl = document.getElementById('editPlayerSanctionEndDate');
        
        // Build update object
        const updates = {
            email: email || null,
            phone: phone || null,
            bcaSanctionPaid: isSanctionPaid,
            previouslySanctioned: previouslySanctioned
        };
        
        // Add sanction dates if provided
        if (isSanctionPaid && sanctionStartDateEl && sanctionEndDateEl) {
            const startDate = sanctionStartDateEl.value;
            const endDate = sanctionEndDateEl.value;
            if (startDate && endDate) {
                updates.sanctionStartDate = startDate;
                updates.sanctionEndDate = endDate;
            }
        }
        
        // Make API call to update player
        const response = await apiCall(`/players/${encodeURIComponent(currentEditingPlayerName)}/status`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        
        if (response.ok) {
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('editPlayerModal')).hide();
            
            // Reload data to reflect changes
            await loadData();
            
            // Refresh players modal if it's open
            if (document.getElementById('playersModal') && document.getElementById('playersModal').classList.contains('show')) {
                populatePlayersModal();
            }
            
            showAlertModal('Player updated successfully!', 'success', 'Success');
        } else {
            const error = await response.json();
            showAlertModal(error.message || 'Error updating player', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error saving player changes:', error);
        showAlertModal('Error saving player changes. Please try again.', 'error', 'Error');
    }
}

async function toggleSanctionStatus(teamId, playerName, currentStatus, isCaptain) {
    // Normalize the player name
    const normalizedPlayerName = playerName.trim();
    const newStatus = !currentStatus;
    
    console.log('toggleSanctionStatus called:', { teamId, playerName: normalizedPlayerName, currentStatus, newStatus, isCaptain });
    
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found:', teamId);
            alert('Team not found');
            return;
        }
        
        // If marking as paid, show popup asking if it should be added to totals
        if (newStatus) {
            // Store the update data for use in the modal callbacks
            window.pendingSanctionUpdate = {
                playerName: normalizedPlayerName,
                teamId: teamId,
                isCaptain: isCaptain,
                captainEmail: isCaptain ? (team.captainEmail || '') : undefined,
                captainPhone: isCaptain ? (team.captainPhone || '') : undefined
            };
            
            // Show the confirmation modal
            document.getElementById('confirmPlayerName').textContent = normalizedPlayerName;
            document.getElementById('confirmFeeAmount').textContent = formatCurrency(sanctionFeeAmount);
            const modal = new bootstrap.Modal(document.getElementById('sanctionPaymentConfirmModal'));
            modal.show();
            
            // Set up modal button handlers (remove old ones first)
            const addToTotalsBtn = document.getElementById('confirmAddToTotalsBtn');
            const paidElsewhereBtn = document.getElementById('confirmPaidElsewhereBtn');
            
            // Remove existing event listeners by cloning and replacing
            const newAddToTotalsBtn = addToTotalsBtn.cloneNode(true);
            addToTotalsBtn.parentNode.replaceChild(newAddToTotalsBtn, addToTotalsBtn);
            
            const newPaidElsewhereBtn = paidElsewhereBtn.cloneNode(true);
            paidElsewhereBtn.parentNode.replaceChild(newPaidElsewhereBtn, paidElsewhereBtn);
            
            // Add new event listeners
            newAddToTotalsBtn.addEventListener('click', async () => {
                modal.hide();
                await processSanctionPayment(true);
            });
            
            newPaidElsewhereBtn.addEventListener('click', async () => {
                modal.hide();
                await processSanctionPayment(false);
            });
            
            // Return early - the modal handlers will continue the process
            return;
        } else {
            // Marking as unpaid - clear both statuses
            const updates = {
                bcaSanctionPaid: false,
                previouslySanctioned: false,
                email: isCaptain ? (team.captainEmail || '') : undefined,
                phone: isCaptain ? (team.captainPhone || '') : undefined
            };
            
            const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(normalizedPlayerName)}/status`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            if (!globalUpdateResponse.ok) {
                const errorData = await globalUpdateResponse.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Failed to update global player status:', errorData);
                alert(`Failed to update sanction status: ${errorData.message || 'Unknown error'}`);
                return;
            }
            
            // Continue with reload and refresh
            await refreshPlayersTableAfterUpdate();
        }
        
        console.log('Global player status updated successfully - status will sync to all teams');
        
        // Continue with reload and refresh
        await refreshPlayersTableAfterUpdate();
    } catch (error) {
        console.error('Error updating sanction status:', error);
        alert('Error updating sanction status');
    }
}

// Helper function to process sanction payment based on user's choice
async function processSanctionPayment(addToTotals) {
    if (!window.pendingSanctionUpdate) {
        console.error('No pending sanction update found');
        return;
    }
    
    const { playerName, isCaptain, captainEmail, captainPhone } = window.pendingSanctionUpdate;
    delete window.pendingSanctionUpdate;
    
    try {
        if (addToTotals) {
            // Mark as paid and it will count in totals
            const updates = {
                bcaSanctionPaid: true,
                previouslySanctioned: false, // Clear previously sanctioned if marking as paid
                email: captainEmail,
                phone: captainPhone
            };
            
            const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(playerName)}/status`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            if (!globalUpdateResponse.ok) {
                const errorData = await globalUpdateResponse.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Failed to update global player status:', errorData);
                alert(`Failed to update sanction status: ${errorData.message || 'Unknown error'}`);
                return;
            }
        } else {
            // User chose "Paid Elsewhere" - mark as previously sanctioned (paid elsewhere/earlier)
            const updates = {
                bcaSanctionPaid: false, // Don't show as paid
                previouslySanctioned: true, // Mark as previously sanctioned (paid elsewhere)
                email: captainEmail,
                phone: captainPhone
            };
            
            const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(playerName)}/status`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            if (!globalUpdateResponse.ok) {
                const errorData = await globalUpdateResponse.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Failed to update global player status:', errorData);
                alert(`Failed to update sanction status: ${errorData.message || 'Unknown error'}`);
                return;
            }
        }
        
        console.log('Global player status updated successfully - status will sync to all teams');
        
        // Continue with reload and refresh
        await refreshPlayersTableAfterUpdate();
    } catch (error) {
        console.error('Error processing sanction payment:', error);
        alert('Error updating sanction status');
    }
}

// Helper function to refresh players table after status update
async function refreshPlayersTableAfterUpdate() {
    // Reload data to get updated status across all teams
    await loadData();
    
    // Preserve current filters
    const currentDivisionFilter = document.getElementById('playersDivisionFilter')?.value || 'all';
    const currentStatusFilter = document.getElementById('playersStatusFilter')?.value || 'all';
    const currentSearch = document.getElementById('playersSearchInput')?.value || '';
    const currentSortCol = currentPlayersSortColumn;
    const currentSortDir = currentPlayersSortDirection;
    
    // Re-populate the players table
    populatePlayersTable();
    
    // Restore filters and sort
    if (currentDivisionFilter && currentDivisionFilter !== 'all') {
        const filterEl = document.getElementById('playersDivisionFilter');
        if (filterEl) filterEl.value = currentDivisionFilter;
    }
    if (currentStatusFilter && currentStatusFilter !== 'all') {
        const statusFilterEl = document.getElementById('playersStatusFilter');
        if (statusFilterEl) statusFilterEl.value = currentStatusFilter;
    }
    if (currentSearch) {
        const searchEl = document.getElementById('playersSearchInput');
        if (searchEl) searchEl.value = currentSearch;
    }
    
    // Re-apply filters and sort
    if (currentSortCol) {
        currentPlayersSortColumn = currentSortCol;
        currentPlayersSortDirection = currentSortDir;
        sortPlayersTable(currentSortCol, false);
    } else {
        filterPlayersTable();
    }
}

async function togglePreviouslySanctioned(teamId, playerName, currentStatus, isCaptain) {
    // Normalize the player name (trim whitespace, handle HTML entities)
    const normalizedPlayerName = playerName.trim();
    const newStatus = !currentStatus;
    
    console.log('togglePreviouslySanctioned called:', { teamId, playerName: normalizedPlayerName, currentStatus, isCaptain });
    
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found:', teamId);
            alert('Team not found');
            return;
        }
        
        // "Previously Sanctioned" = paid elsewhere/earlier for current year
        // Should NOT show as "Paid" and should NOT add to totals
        const updates = {
            previouslySanctioned: newStatus,
            bcaSanctionPaid: false, // Always clear "Paid" when marking as previously sanctioned
            email: isCaptain ? (team.captainEmail || '') : undefined,
            phone: isCaptain ? (team.captainPhone || '') : undefined
        };
        
        // Update player status globally (across all teams) using the new API endpoint
        const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(normalizedPlayerName)}/status`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        
        if (!globalUpdateResponse.ok) {
            const errorData = await globalUpdateResponse.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Failed to update global player status:', errorData);
            alert(`Failed to update previously sanctioned status: ${errorData.message || 'Unknown error'}`);
            return;
        }
        
        console.log('Global player status updated successfully - status will sync to all teams');
        
        // Continue with reload and refresh
        await refreshPlayersTableAfterUpdate();
    } catch (error) {
        console.error('Error updating previously sanctioned status:', error);
        alert('Error updating previously sanctioned status');
    }
}

