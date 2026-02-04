/* divisions */

// Cache for plan limits (set when profile/subscription loads). undefined = not loaded, 0 = unlimited, >0 = limit
let _cachedTeamsPerDivision = undefined;

async function getTeamsPerDivisionFromPlan() {
    if (_cachedTeamsPerDivision !== undefined) return _cachedTeamsPerDivision;
    try {
        const res = typeof apiCall === 'function' ? await apiCall('/profile') : null;
        if (!res || !res.ok) { _cachedTeamsPerDivision = 16; return 16; }
        const data = await res.json();
        const limits = data?.limits || {};
        const teams = limits.teams;
        const divisions = limits.divisions;
        if (teams != null && divisions != null && divisions > 0) {
            _cachedTeamsPerDivision = Math.floor(teams / divisions);
        } else {
            _cachedTeamsPerDivision = 0;
        }
        return _cachedTeamsPerDivision;
    } catch (e) {
        console.warn('Could not fetch plan limits for team capacity:', e);
        _cachedTeamsPerDivision = 16;
        return 16;
    }
}

function setCachedTeamsPerDivision(value) {
    _cachedTeamsPerDivision = value;
}
if (typeof window !== 'undefined') {
    window.getTeamsPerDivisionFromPlan = getTeamsPerDivisionFromPlan;
    window.setCachedTeamsPerDivision = setCachedTeamsPerDivision;
}

function showDivisionManagement() {
    console.log('showDivisionManagement called');
    divisionsTableShowArchived = false;
    document.getElementById('divisionsTabActive')?.classList.add('active');
    document.getElementById('divisionsTabArchived')?.classList.remove('active');
    loadDivisions();
    displayDivisions(divisionsTableSortColumn, divisionsTableSortDir, false);
    updateDivisionsTableSortIcons(divisionsTableSortColumn, divisionsTableSortDir);
    const modalElement = document.getElementById('divisionManagementModal');
    if (!modalElement) {
        console.error('divisionManagementModal element not found');
        return;
    }
    const Bootstrap = getBootstrap();
    if (Bootstrap) {
        const modalInstance = Bootstrap.Modal.getOrCreateInstance(modalElement);
        modalElement.addEventListener('shown.bs.modal', function() {
            setupArchiveDivisionModalHandlers();
            setupDivisionNameListeners();
            setupDatePickerHandlers();
            const updateModeRadios = modalElement.querySelectorAll('input[name="updateMode"]:checked');
            const updateMode = updateModeRadios.length > 0 ? updateModeRadios[0].value : 'create';
            const createContainers = modalElement.querySelectorAll('#fargoUrlCreateContainer');
            const updateContainers = modalElement.querySelectorAll('#fargoUrlUpdateContainer');
            createContainers.forEach(container => {
                container.style.display = updateMode === 'create' ? 'block' : 'none';
            });
            updateContainers.forEach(container => {
                container.style.display = updateMode === 'update' ? 'block' : 'none';
            });
            calculateSmartBuilderEndDate();
        }, { once: true });
        modalInstance.show();
    } else {
        showModal(modalElement);
    }
}

async function showDivisionsTab(tab) {
    divisionsTableShowArchived = (tab === 'archived');
    document.getElementById('divisionsTabActive').classList.toggle('active', !divisionsTableShowArchived);
    document.getElementById('divisionsTabArchived').classList.toggle('active', divisionsTableShowArchived);
    if (divisionsTableShowArchived) {
        try {
            const res = await apiCall('/divisions?archivedOnly=true');
            archivedDivisionsList = res.ok ? await res.json() : [];
        } catch (e) {
            archivedDivisionsList = [];
        }
    }
    displayDivisions(divisionsTableSortColumn, divisionsTableSortDir, divisionsTableShowArchived);
    updateDivisionsTableSortIcons(divisionsTableSortColumn, divisionsTableSortDir);
}

if (typeof window !== 'undefined') window.showDivisionManagement = showDivisionManagement;

function getTeamCountForDivision(division) {
    if (!teams || !Array.isArray(teams)) return 0;
    const divName = (division.name || '').trim();
    if (!divName) return 0;
    return teams.filter(t => {
        if (t.isArchived) return false;
        const tDiv = (t.division || '').trim();
        if (!tDiv) return false;
        if (tDiv === divName) return true;
        if (tDiv.toLowerCase() === divName.toLowerCase()) return true;
        if (division.isDoublePlay && division.name) {
            const formatted = `${division.firstDivisionName || ''} - ${division.firstDivisionGameType || ''} / ${division.secondDivisionName || ''} - ${division.secondDivisionGameType || ''}`.trim();
            if (tDiv === formatted || tDiv.toLowerCase() === formatted.toLowerCase()) return true;
        }
        return false;
    }).length;
}

let divisionsTableSortColumn = 'name';
let divisionsTableSortDir = 'asc';
let divisionsTableShowArchived = false;
let archivedDivisionsList = [];

function sortDivisionsTable(column) {
    if (divisionsTableSortColumn === column) {
        divisionsTableSortDir = divisionsTableSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        divisionsTableSortColumn = column;
        divisionsTableSortDir = 'asc';
    }
    displayDivisions(column, divisionsTableSortDir, divisionsTableShowArchived);
    updateDivisionsTableSortIcons(column, divisionsTableSortDir);
}
if (typeof window !== 'undefined') {
    window.showDivisionsTab = showDivisionsTab;
    window.sortDivisionsTable = sortDivisionsTable;
}

function updateDivisionsTableSortIcons(activeColumn, dir) {
    const headers = document.querySelectorAll('#divisionManagementModal .divisions-sortable');
    headers.forEach(th => {
        const col = th.getAttribute('data-sort');
        const icon = th.querySelector('i');
        if (!icon) return;
        icon.className = 'fas ms-1 opacity-50 ' + (col === activeColumn
            ? (dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down')
            : 'fa-sort');
    });
}

function displayDivisions(sortColumn, sortDir, showArchivedDivisions) {
    const tbody = document.getElementById('divisionsTable');
    tbody.innerHTML = '';
    
    // Filter: temp divisions, and by archived state
    const isArchived = (d) => d.isArchived === true || d.isArchived === 'true';
    const sourceList = showArchivedDivisions ? archivedDivisionsList : divisions;
    let activeDivisions = (sourceList || []).filter(division => {
        if (division._id && division._id.startsWith('temp_')) return false;
        if (division.id && division.id.startsWith('temp_')) return false;
        if (!division.isActive && division.description === 'Temporary') return false;
        if (showArchivedDivisions) return isArchived(division);
        return !isArchived(division);
    });

    // Sort if requested
    if (sortColumn && sortDir) {
        const getVal = (d, col) => {
            if (col === 'name') return (d.name || '').toLowerCase();
            if (col === 'teams') return getTeamCountForDivision(d);
            if (col === 'gameType') return (d.isDoublePlay ? 'double' : 'regular');
            if (col === 'startDate') return (d.startDate || '').split('T')[0] || '';
            if (col === 'endDate') return (d.endDate || '').split('T')[0] || '';
            if (col === 'totalWeeks') return (d.totalWeeks != null && d.totalWeeks > 0) ? d.totalWeeks : 9999;
            if (col === 'matchesPerWeek') return (d.matchesPerWeek != null && d.matchesPerWeek !== '') ? Number(d.matchesPerWeek) : -1;
            if (col === 'weeklyDues') return parseFloat(d.duesPerPlayerPerMatch) || 0;
            return '';
        };
        activeDivisions = [...activeDivisions].sort((a, b) => {
            const va = getVal(a, sortColumn);
            const vb = getVal(b, sortColumn);
            const cmp = typeof va === 'number' && typeof vb === 'number'
                ? va - vb
                : String(va).localeCompare(String(vb), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }
    
    activeDivisions.forEach(division => {
        const row = document.createElement('tr');
        const divId = division._id || division.id;
        const teamCount = getTeamCountForDivision(division);

        // Format division name for display (especially for double play)
        let displayName = division.name;
        if (division.isDoublePlay) {
            const divider = ' / ';
            if (division.name.includes(divider)) {
                const parts = division.name.split(divider);
                if (parts.length === 2) {
                    displayName = `${parts[0].trim()} / ${parts[1].trim()}`;
                }
            }
        }

        // Format dates (YYYY-MM-DD or ISO string -> display format)
        const formatDate = (d) => {
            if (!d) return '';
            const str = typeof d === 'string' ? d.split('T')[0] : d;
            if (!str) return '';
            const [y, m, day] = str.split('-');
            if (!y || !m || !day) return str;
            const date = new Date(y, m - 1, day);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };
        const startDateStr = formatDate(division.startDate) || '';
        const endDateStr = formatDate(division.endDate) || '';
        const totalWeeksDisplay = division.totalWeeks != null && division.totalWeeks > 0 ? division.totalWeeks : 'Unlimited';
        const matchesPerWeek = division.matchesPerWeek != null ? division.matchesPerWeek : '';
        const duesAmount = (division.duesPerPlayerPerMatch != null && !isNaN(division.duesPerPlayerPerMatch))
            ? '$' + parseFloat(division.duesPerPlayerPerMatch).toFixed(2) : '-';

        const badgeColor = division.color || (typeof getDivisionColor === 'function' ? getDivisionColor(division.name) : '#0dcaf0');
        const badgeStyle = badgeColor ? `style="background-color: ${badgeColor} !important; color: white !important; border: none;"` : '';
        const dpBadge = `<span class="badge" ${badgeStyle}>${division.isDoublePlay ? 'Double Play' : 'Regular'}</span>`;

        let gameTypesStr = '';
        if (division.isDoublePlay && division.name && division.name.includes(' / ')) {
            const parts = division.name.split(' / ');
            const types = parts.map(p => {
                const idx = p.lastIndexOf(' - ');
                return idx >= 0 ? p.substring(idx + 3).trim() : p.trim();
            }).filter(Boolean);
            gameTypesStr = types.length ? types.join(', ') : (division.name || '-');
        } else {
            const gt = division.gameType || (division.name && division.name.includes(' - ') ? division.name.split(' - ').pop().trim() : '');
            gameTypesStr = gt || '-';
        }

        row.innerHTML = `
            <td><strong>${displayName}</strong><br>${dpBadge}</td>
            <td>${teamCount}</td>
            <td><small>${gameTypesStr}</small></td>
            <td>${startDateStr}</td>
            <td>${endDateStr}</td>
            <td>${totalWeeksDisplay}</td>
            <td>${matchesPerWeek}</td>
            <td><span class="badge bg-success">${duesAmount}</span></td>
            <td><span class="badge ${(division.isArchived === true || division.isArchived === 'true') ? 'bg-secondary' : 'bg-success'}">${(division.isArchived === true || division.isArchived === 'true') ? 'Archived' : 'Active'}</span></td>
            <td>
                <div class="d-flex flex-column gap-1 align-items-center">
                    <div class="d-flex flex-nowrap align-items-center justify-content-center gap-1">
                        ${showArchivedDivisions
                            ? `<button class="btn btn-sm btn-success" onclick="restoreDivision('${divId}')" title="Restore"><i class="fas fa-undo"></i></button>
                               <button class="btn btn-sm btn-danger" onclick="deleteDivision('${divId}')" title="Delete"><i class="fas fa-trash"></i></button>`
                            : `<button class="btn btn-sm btn-warning" onclick="editDivision('${divId}')" title="Edit division"><i class="fas fa-edit"></i></button>
                               <button class="btn btn-sm btn-outline-primary" onclick="editDivision('${divId}')" title="Edit schedule (start date, weeks, matches)"><i class="fas fa-calendar-alt"></i></button>
                               <button class="btn btn-sm btn-outline-secondary" onclick="archiveDivision('${divId}')" title="Archive"><i class="fas fa-archive"></i></button>`}
                    </div>
                    ${showArchivedDivisions ? '' : `
                    <div class="d-flex flex-nowrap align-items-center justify-content-center gap-1">
                        <button class="btn btn-sm btn-outline-info" onclick="copyDivision('${divId}')" title="Copy"><i class="fas fa-copy"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDivision('${divId}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>`}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateDivisionDetailsTitle() {
    const titleEl = document.getElementById('divisionDetailsTabTitle');
    if (!titleEl) return;
    const isDoublePlay = document.getElementById('isDoublePlay')?.checked || false;
    if (isDoublePlay) {
        const fn = (document.getElementById('firstDivisionName')?.value || '').trim();
        const fg = (document.getElementById('firstDivisionGameType')?.value || document.getElementById('gameType')?.value || '').trim();
        const sn = (document.getElementById('secondDivisionName')?.value || '').trim();
        const sg = (document.getElementById('secondGameType')?.value || '').trim();
        if (fn && fg && sn && sg) {
            titleEl.textContent = `${fn} - ${fg} / ${sn} - ${sg}`;
        } else {
            titleEl.textContent = (fn || sn) ? 'Editing division...' : 'New Division';
        }
    } else {
        const name = (document.getElementById('divisionName')?.value || '').trim();
        const gt = (document.getElementById('gameType')?.value || '').trim();
        titleEl.textContent = name ? (gt ? `${name} - ${gt}` : name) : 'New Division';
    }
}
if (typeof window !== 'undefined') window.updateDivisionDetailsTitle = updateDivisionDetailsTitle;

function toggleDoublePlayOptions() {
    const isDoublePlay = document.getElementById('isDoublePlay')?.checked || false;
    const doublePlayOptions = document.getElementById('doublePlayOptions');
    const regularDivisionFields = document.getElementById('regularDivisionFields');
    const regularDivisionNameFields = document.getElementById('regularDivisionNameFields');
    const doublePlayDivisionNameFields = document.getElementById('doublePlayDivisionNameFields');
    const regularMatchesWrapper = document.getElementById('regularMatchesPerWeekWrapper');
    const matchesPerWeek = document.getElementById('matchesPerWeek');
    const divisionName = document.getElementById('divisionName');
    const firstGameType = document.getElementById('firstGameType');
    const gameType = document.getElementById('gameType');
    const firstDivisionName = document.getElementById('firstDivisionName');
    const firstDivisionGameType = document.getElementById('firstDivisionGameType');
    const secondDivisionName = document.getElementById('secondDivisionName');
    const secondDivisionGameType = document.getElementById('secondDivisionGameType');
    const secondGameType = document.getElementById('secondGameType');
    const firstMatchesPerWeek = document.getElementById('firstMatchesPerWeek');
    const secondMatchesPerWeek = document.getElementById('secondMatchesPerWeek');
    
    if (isDoublePlay) {
        // Hide regular division fields
        if (regularDivisionFields) regularDivisionFields.style.display = 'none';
        if (regularDivisionNameFields) regularDivisionNameFields.style.display = 'none';
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'none';
        if (matchesPerWeek) matchesPerWeek.required = false;
        if (divisionName) divisionName.required = false;
        if (firstGameType) firstGameType.required = false;
        if (gameType) gameType.required = false;
        
        // Show double play name fields
        if (doublePlayDivisionNameFields) doublePlayDivisionNameFields.style.display = 'block';
        if (doublePlayOptions) doublePlayOptions.style.display = 'block';
        if (firstDivisionName) firstDivisionName.required = true;
        if (firstDivisionGameType) { firstDivisionGameType.required = true; }
        else if (gameType) gameType.required = true;
        if (secondDivisionName) secondDivisionName.required = true;
        if (secondDivisionGameType) { secondDivisionGameType.required = true; }
        else if (secondGameType) secondGameType.required = true;
        if (firstMatchesPerWeek) firstMatchesPerWeek.required = true;
        if (secondMatchesPerWeek) secondMatchesPerWeek.required = true;
    } else {
        // Show regular division fields
        if (regularDivisionFields) regularDivisionFields.style.display = 'block';
        if (regularDivisionNameFields) regularDivisionNameFields.style.display = 'block';
        if (doublePlayDivisionNameFields) doublePlayDivisionNameFields.style.display = 'none';
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'block';
        if (matchesPerWeek) matchesPerWeek.required = true;
        if (divisionName) divisionName.required = true;
        if (firstGameType) firstGameType.required = true;
        if (gameType) gameType.required = true;
        
        // Hide and clear double play fields
        if (doublePlayOptions) doublePlayOptions.style.display = 'none';
        if (firstDivisionName) { firstDivisionName.required = false; firstDivisionName.value = ''; }
        if (firstDivisionGameType) { firstDivisionGameType.required = false; firstDivisionGameType.value = ''; }
        if (secondDivisionName) { secondDivisionName.required = false; secondDivisionName.value = ''; }
        if (secondDivisionGameType) { secondDivisionGameType.required = false; secondDivisionGameType.value = ''; }
        if (secondGameType) secondGameType.required = false;
        if (firstMatchesPerWeek) { firstMatchesPerWeek.required = false; if (firstMatchesPerWeek.value) firstMatchesPerWeek.value = '5'; }
        if (secondMatchesPerWeek) { secondMatchesPerWeek.required = false; if (secondMatchesPerWeek.value) secondMatchesPerWeek.value = '5'; }
    }
    if (typeof updateDivisionDetailsTitle === 'function') updateDivisionDetailsTitle();
}

function updateGameTypeOptions() {
    // Check if we're in double play mode or regular mode
    const isDoublePlay = document.getElementById('isDoublePlay')?.checked || false;
    
    if (isDoublePlay) {
        // Handle double play division game types (addDivisionModal uses firstDivisionGameType + secondGameType)
        const firstDivisionGameType = document.getElementById('firstDivisionGameType') || document.getElementById('gameType');
        const secondDivisionGameType = document.getElementById('secondDivisionGameType') || document.getElementById('secondGameType');
        
        if (!firstDivisionGameType || !secondDivisionGameType) return;
        
        const firstValue = firstDivisionGameType.value;
        const secondValue = secondDivisionGameType.value;
    const allOptions = ['8-ball', '9-ball', '10-ball'];
    
        // Update first division game type dropdown
        firstDivisionGameType.innerHTML = '<option value="">Select Game Type</option>';
    allOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (option === secondValue && firstValue !== option) {
            optionElement.disabled = true;
        }
            firstDivisionGameType.appendChild(optionElement);
    });
        if (firstValue) firstDivisionGameType.value = firstValue;
    
        // Update second division game type dropdown
        secondDivisionGameType.innerHTML = '<option value="">Select Game Type</option>';
    allOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (option === firstValue && secondValue !== option) {
            optionElement.disabled = true;
        }
            secondDivisionGameType.appendChild(optionElement);
        });
        if (secondValue) secondDivisionGameType.value = secondValue;
    } else {
        // Handle regular division game types (addDivisionModal uses gameType)
        const firstGameType = document.getElementById('firstGameType') || document.getElementById('gameType');
        
        if (!firstGameType) return;
        
        // For regular divisions, just ensure the dropdown has all options
        const firstValue = firstGameType.value;
        const allOptions = ['8-ball', '9-ball', '10-ball'];
        
        // Only update if not already populated (to avoid clearing user selection)
        if (firstGameType.options.length <= 4) {
            firstGameType.innerHTML = '<option value="">Select Game Type</option>';
            allOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                firstGameType.appendChild(optionElement);
            });
            if (firstValue) firstGameType.value = firstValue;
        }
    }
}

function showAddDivisionModal() {
    currentDivisionId = null;
    document.getElementById('addDivisionModalTitle').textContent = 'Add New Division';
    const titleEl = document.getElementById('divisionDetailsTabTitle');
    if (titleEl) titleEl.textContent = 'New Division';
    const saveBtn = document.getElementById('saveDivisionBtn');
    if (saveBtn) {
        saveBtn.textContent = 'Add Division';
        saveBtn.setAttribute('onclick', 'addDivision()');
        saveBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Add Division';
    }
    document.getElementById('addDivisionForm').reset();
    const doublePlayOpts = document.getElementById('doublePlayOptions');
    if (doublePlayOpts) doublePlayOpts.style.display = 'none';
    const dpNameFields = document.getElementById('doublePlayDivisionNameFields');
    if (dpNameFields) dpNameFields.style.display = 'none';
    const regNameFields = document.getElementById('regularDivisionNameFields');
    if (regNameFields) regNameFields.style.display = 'block';
    const currentTeamsEl = document.getElementById('divisionCurrentTeamsCount');
    if (currentTeamsEl) currentTeamsEl.textContent = '0';
    (async () => {
        const cap = await getTeamsPerDivisionFromPlan();
        const capEl = document.getElementById('divisionTeamCapacityDisplay');
        if (capEl) capEl.textContent = cap === 0 ? 'Unlimited' : cap.toString();
    })();

    // Reset division color to first unused color
    const colorInput = document.getElementById('divisionColor');
    if (colorInput) {
        const defaultColor = typeof getUnusedDivisionColor === 'function' ? getUnusedDivisionColor() : '#0dcaf0';
        colorInput.value = defaultColor;
        const hexSpan = document.getElementById('divisionColorHex');
        if (hexSpan) hexSpan.textContent = colorInput.value;
    }
    // Reset calculation method to percentage
    const divisionMethodPercentage = document.getElementById('divisionMethodPercentage');
    const divisionMethodDollarAmount = document.getElementById('divisionMethodDollarAmount');
    if (divisionMethodPercentage) divisionMethodPercentage.checked = true;
    if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = false;
    
    // Reset saved method for new divisions (will use operator default)
    _savedDivisionUseDollarAmounts = currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false;
    
    toggleDivisionCalculationMethod();
    
    const divisionPrizeFundPercentEl = document.getElementById('divisionPrizeFundPercentage');
    const divisionFirstOrgPercentEl = document.getElementById('divisionFirstOrgPercentage');
    const divisionSecondOrgPercentEl = document.getElementById('divisionSecondOrgPercentage');
    const divisionPrizeFundAmountEl = document.getElementById('divisionPrizeFundAmount');
    const divisionFirstOrgAmountEl = document.getElementById('divisionFirstOrganizationAmount');
    const divisionSecondOrgAmountEl = document.getElementById('divisionSecondOrganizationAmount');
    if (divisionPrizeFundPercentEl) divisionPrizeFundPercentEl.value = '';
    if (divisionFirstOrgPercentEl) divisionFirstOrgPercentEl.value = '';
    if (divisionSecondOrgPercentEl) divisionSecondOrgPercentEl.value = '';
    if (divisionPrizeFundAmountEl) divisionPrizeFundAmountEl.value = '';
    if (divisionFirstOrgAmountEl) divisionFirstOrgAmountEl.value = '';
    if (divisionSecondOrgAmountEl) divisionSecondOrgAmountEl.value = '';
    
    const detailsTab = document.getElementById('division-details-tab');
    if (detailsTab && typeof bootstrap !== 'undefined') new bootstrap.Tab(detailsTab).show();
    
    updateDivisionFinancialLabels();
    
    // Set default dues per player per match from operator profile
    const duesEl = document.getElementById('divisionWeeklyDues');
    if (duesEl && currentOperator && currentOperator.default_dues_per_player_per_match) {
        duesEl.value = currentOperator.default_dues_per_player_per_match;
    } else if (duesEl) {
        duesEl.value = ''; // Reset if no default
    }
    // Set default players per week from operator profile
    const playersPerWeekEl = document.getElementById('playersPerWeek');
    if (playersPerWeekEl && currentOperator && (currentOperator.default_players_per_week != null || currentOperator.defaultPlayersPerWeek != null)) {
        const ppw = currentOperator.default_players_per_week ?? currentOperator.defaultPlayersPerWeek;
        playersPerWeekEl.value = String(ppw);
    } else if (playersPerWeekEl) {
        playersPerWeekEl.value = '5'; // Form default when no operator default
    }
    
    if (typeof resetDivisionFinancialLockState === 'function') resetDivisionFinancialLockState();
    const weekPlayDatesSection = document.getElementById('weekPlayDatesSection');
    if (weekPlayDatesSection) weekPlayDatesSection.style.display = 'none';
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
}

function editDivision(divisionId) {
    try {
        const division = divisions.find(d => d._id === divisionId);
        if (!division) {
            console.error('Division not found:', divisionId);
            return;
        }
    
    currentDivisionId = divisionId;
    document.getElementById('addDivisionModalTitle').textContent = 'Edit Division';
    const titleEl = document.getElementById('divisionDetailsTabTitle');
    if (titleEl) titleEl.textContent = division.name || 'Edit Division';
    const saveBtn = document.getElementById('saveDivisionBtn');
    if (saveBtn) {
        saveBtn.textContent = 'Update Division';
        saveBtn.setAttribute('onclick', 'updateDivision()');
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Division';
    }
    
    // Populate form with division data
    // Set division name
    const divisionNameEl = document.getElementById('divisionName');
    if (divisionNameEl) {
        // For double play divisions, parse the combined name into two separate division names
        if (division.isDoublePlay) {
            // For double play, we'll parse the name below
            // Don't set it here yet
        } else {
            // For regular divisions, extract just the name (remove game type if embedded)
            let divisionName = division.name || '';
            console.log('Setting division name:', divisionName, 'for division:', division);
            // Check if name contains " - " which might indicate game type is embedded
            if (divisionName.includes(' - ') && !divisionName.includes(' / ')) {
                // Extract just the name part before " - " (but only if it's not double play format)
                const dashIndex = divisionName.indexOf(' - ');
                divisionName = divisionName.substring(0, dashIndex).trim();
                console.log('Extracted division name (removed game type):', divisionName);
            }
            divisionNameEl.value = divisionName;
            console.log('Division name field value set to:', divisionNameEl.value);
        }
    } else {
        console.error('divisionName element not found!');
    }
    
    // Set game type (if field exists)
    // Try to extract game type from division name or use stored gameType field
    const gameTypeEl = document.getElementById('gameType');
    if (gameTypeEl) {
        let gameType = division.gameType || '';
        console.log('Initial gameType from division:', gameType);
        
        // If no gameType field, try to extract from name for regular divisions
        if (!gameType && !division.isDoublePlay && division.name) {
            // Check if name contains " - " with game type
            if (division.name.includes(' - ') && !division.name.includes(' / ')) {
                const parts = division.name.split(' - ');
                if (parts.length > 1) {
                    // Get the part after " - " which should be the game type
                    gameType = parts[1].trim();
                    console.log('Extracted gameType from name:', gameType);
                }
            }
        }
        
        if (gameType) {
            gameTypeEl.value = gameType;
            console.log('Game type field value set to:', gameTypeEl.value);
        } else {
            console.log('No game type found to set');
        }
    } else {
        console.error('gameType element not found!');
    }
    
    // Set matches per week (if field exists)
    const matchesPerWeekEl = document.getElementById('matchesPerWeek');
    if (matchesPerWeekEl && division.matchesPerWeek !== undefined) {
        matchesPerWeekEl.value = division.matchesPerWeek.toString();
    }
    
    // Set dues per player (may be divisionWeeklyDues or duesPerPlayerPerMatch)
    const duesPerPlayerEl = document.getElementById('divisionWeeklyDues') || document.getElementById('duesPerPlayerPerMatch');
    if (duesPerPlayerEl && division.duesPerPlayerPerMatch !== undefined) {
        duesPerPlayerEl.value = division.duesPerPlayerPerMatch.toString();
    }
    
    // Set players per week (if field exists)
    const playersPerWeekEl = document.getElementById('playersPerWeek');
    if (playersPerWeekEl && division.playersPerWeek !== undefined) {
        playersPerWeekEl.value = (division.playersPerWeek || 5).toString();
    }
    
    // Show current teams in division (actual count, read-only)
    const currentTeamsEl = document.getElementById('divisionCurrentTeamsCount');
    if (currentTeamsEl) {
        const count = typeof getTeamCountForDivision === 'function' ? getTeamCountForDivision(division) : 0;
        currentTeamsEl.textContent = count.toString();
    }
    
    // Set total weeks
    const totalWeeksEl = document.getElementById('totalWeeks');
    if (totalWeeksEl && division.totalWeeks !== undefined) {
        totalWeeksEl.value = division.totalWeeks.toString();
    }
    // Parse dates correctly to avoid timezone issues
    const startDateInput = document.getElementById('divisionStartDate');
    if (startDateInput) {
        if (division.startDate) {
            const startDateStr = division.startDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
            startDateInput.value = startDateStr;
        } else {
            startDateInput.value = '';
        }
    }
    
    const endDateInput = document.getElementById('divisionEndDate');
    if (endDateInput) {
        if (division.endDate) {
            const endDateStr = division.endDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
            endDateInput.value = endDateStr;
        } else {
            endDateInput.value = '';
        }
    }
    
    // Show day of the week if start date exists (parse correctly to avoid timezone issues)
    if (division.startDate) {
        // Parse date string correctly to avoid timezone issues
        const dateStr = division.startDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
        const [year, month, day] = dateStr.split('-').map(Number);
        const start = new Date(year, month - 1, day); // month is 0-indexed
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[start.getDay()];
        const startDayNameEl = document.getElementById('startDayName');
        const startDateDayEl = document.getElementById('startDateDay');
        if (startDayNameEl) startDayNameEl.textContent = dayName;
        if (startDateDayEl) startDateDayEl.style.display = 'block';
    }
    
    // Set double play checkbox (if field exists) and toggle fields visibility
    const isDoublePlayEl = document.getElementById('isDoublePlay');
    if (isDoublePlayEl) {
        isDoublePlayEl.checked = division.isDoublePlay || false;
        // Call toggle function to show/hide the appropriate fields based on checkbox state
        toggleDoublePlayOptions();
    }
    
    // Set division description (if field exists)
    const divisionDescriptionEl = document.getElementById('divisionDescription');
    if (divisionDescriptionEl) {
        divisionDescriptionEl.value = division.description || '';
    }
    
    // Set division color (use stored color or generate default)
    const divisionColorInput = document.getElementById('divisionColor');
    if (divisionColorInput) {
        if (division.color) {
            divisionColorInput.value = division.color;
        } else {
            // Generate default color based on division name
            divisionColorInput.value = getDivisionColor(division.name);
        }
        const hexSpan = document.getElementById('divisionColorHex');
        if (hexSpan) hexSpan.textContent = divisionColorInput.value;
    }

    // Matches/week (new - default to 5 for backwards compatibility)
    const matchesPerWeekField = document.getElementById('matchesPerWeek');
    if (matchesPerWeekField) matchesPerWeekField.value = String(division.matchesPerWeek || 5);
    const firstMatchesField = document.getElementById('firstMatchesPerWeek');
    const secondMatchesField = document.getElementById('secondMatchesPerWeek');
    if (firstMatchesField) firstMatchesField.value = String(division.firstMatchesPerWeek || 5);
    if (secondMatchesField) secondMatchesField.value = String(division.secondMatchesPerWeek || 5);
    
    // Set calculation method based on division settings
    // Check if division has explicit setting (not null/undefined)
    const divisionHasExplicitSetting = (division.use_dollar_amounts !== undefined && division.use_dollar_amounts !== null) ||
                                       (division.useDollarAmounts !== undefined && division.useDollarAmounts !== null);
    
    // Get the division's setting (or operator default if not explicitly set)
    const divisionUsesDollarAmounts = divisionHasExplicitSetting
        ? (division.use_dollar_amounts !== undefined && division.use_dollar_amounts !== null
            ? division.use_dollar_amounts
            : division.useDollarAmounts)
        : (currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false);
    
    // Track saved method for active format indicator
    // If division has explicit setting, use it. Otherwise, it's using operator default (so saved = operator default)
    _savedDivisionUseDollarAmounts = divisionHasExplicitSetting
        ? (division.use_dollar_amounts !== undefined && division.use_dollar_amounts !== null
            ? division.use_dollar_amounts
            : division.useDollarAmounts)
        : (currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false);
    
    const divisionMethodPercentage = document.getElementById('divisionMethodPercentage');
    const divisionMethodDollarAmount = document.getElementById('divisionMethodDollarAmount');
    if (divisionUsesDollarAmounts) {
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = true;
        if (divisionMethodPercentage) divisionMethodPercentage.checked = false;
    } else {
        if (divisionMethodPercentage) divisionMethodPercentage.checked = true;
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = false;
    }
    toggleDivisionCalculationMethod();
    
    const divisionPrizeFundPercentEl = document.getElementById('divisionPrizeFundPercentage');
    const divisionFirstOrgPercentEl = document.getElementById('divisionFirstOrgPercentage');
    const divisionSecondOrgPercentEl = document.getElementById('divisionSecondOrgPercentage');
    const divisionPrizeFundAmountEl = document.getElementById('divisionPrizeFundAmount');
    const divisionPrizeFundAmountTypePerTeam = document.getElementById('divisionPrizeFundPerTeam');
    const divisionPrizeFundAmountTypePerPlayer = document.getElementById('divisionPrizeFundPerPlayer');
    const divisionFirstOrgAmountEl = document.getElementById('divisionFirstOrganizationAmount');
    const divisionFirstOrgAmountTypePerTeam = document.getElementById('divisionFirstOrgPerTeam');
    const divisionFirstOrgAmountTypePerPlayer = document.getElementById('divisionFirstOrgPerPlayer');
    const divisionSecondOrgAmountEl = document.getElementById('divisionSecondOrganizationAmount');
    const divisionSecondOrgAmountTypePerTeam = document.getElementById('divisionSecondOrgPerTeam');
    const divisionSecondOrgAmountTypePerPlayer = document.getElementById('divisionSecondOrgPerPlayer');
    
    if (divisionPrizeFundPercentEl) divisionPrizeFundPercentEl.value = division.prize_fund_percentage ?? division.prizeFundPercentage ?? '';
    if (divisionFirstOrgPercentEl) divisionFirstOrgPercentEl.value = division.first_organization_percentage ?? division.firstOrganizationPercentage ?? '';
    if (divisionSecondOrgPercentEl) divisionSecondOrgPercentEl.value = division.second_organization_percentage ?? division.secondOrganizationPercentage ?? '';
    if (divisionPrizeFundAmountEl) {
        divisionPrizeFundAmountEl.value = division.prize_fund_amount ?? division.prizeFundAmount ?? '';
        const t = division.prize_fund_amount_type ?? division.prizeFundAmountType ?? 'perTeam';
        if (t === 'perPlayer') {
            if (divisionPrizeFundAmountTypePerPlayer) divisionPrizeFundAmountTypePerPlayer.checked = true;
            if (divisionPrizeFundAmountTypePerTeam) divisionPrizeFundAmountTypePerTeam.checked = false;
        } else {
            if (divisionPrizeFundAmountTypePerTeam) divisionPrizeFundAmountTypePerTeam.checked = true;
            if (divisionPrizeFundAmountTypePerPlayer) divisionPrizeFundAmountTypePerPlayer.checked = false;
        }
    }
    if (divisionFirstOrgAmountEl) {
        divisionFirstOrgAmountEl.value = division.first_organization_amount ?? division.firstOrganizationAmount ?? '';
        const t = division.first_organization_amount_type ?? division.firstOrganizationAmountType ?? 'perTeam';
        if (t === 'perPlayer') {
            if (divisionFirstOrgAmountTypePerPlayer) divisionFirstOrgAmountTypePerPlayer.checked = true;
            if (divisionFirstOrgAmountTypePerTeam) divisionFirstOrgAmountTypePerTeam.checked = false;
        } else {
            if (divisionFirstOrgAmountTypePerTeam) divisionFirstOrgAmountTypePerTeam.checked = true;
            if (divisionFirstOrgAmountTypePerPlayer) divisionFirstOrgAmountTypePerPlayer.checked = false;
        }
    }
    if (divisionSecondOrgAmountEl) {
        divisionSecondOrgAmountEl.value = division.second_organization_amount ?? division.secondOrganizationAmount ?? '';
        const t = division.second_organization_amount_type ?? division.secondOrganizationAmountType ?? 'perTeam';
        if (t === 'perPlayer') {
            if (divisionSecondOrgAmountTypePerPlayer) divisionSecondOrgAmountTypePerPlayer.checked = true;
            if (divisionSecondOrgAmountTypePerTeam) divisionSecondOrgAmountTypePerTeam.checked = false;
        } else {
            if (divisionSecondOrgAmountTypePerTeam) divisionSecondOrgAmountTypePerTeam.checked = true;
            if (divisionSecondOrgAmountTypePerPlayer) divisionSecondOrgAmountTypePerPlayer.checked = false;
        }
    }
    
    if (typeof applyDivisionFinancialFieldsLockState === 'function') {
        applyDivisionFinancialFieldsLockState(division);
    }
    
    const detailsTab = document.getElementById('division-details-tab');
    if (detailsTab && typeof bootstrap !== 'undefined') new bootstrap.Tab(detailsTab).show();
    
    // Handle double play options for editing
    // Note: toggleDoublePlayOptions() is called above when setting the checkbox,
    // but we also need to ensure fields are visible before setting their values
    if (division.isDoublePlay) {
        // Ensure double play options are visible
        const doublePlayOptions = document.getElementById('doublePlayOptions');
        if (doublePlayOptions) doublePlayOptions.style.display = 'block';
        const regularDivisionFields = document.getElementById('regularDivisionFields');
        if (regularDivisionFields) regularDivisionFields.style.display = 'none';
        const regularMatchesWrapper = document.getElementById('regularMatchesPerWeekWrapper');
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'none';
        
        // For double-play, stored format is "First Name - First Game Type / Second Name - Second Game Type"
        // Parse to extract name and game type for each division
        let firstDivisionName = '';
        let firstDivisionGameType = '';
        let secondDivisionName = '';
        let secondDivisionGameType = '';
        
        console.log('Parsing double play division name:', division.name);
        const divider = ' / ';
        if (division.name.includes(divider)) {
            // Format: "First Name - First Game Type / Second Name - Second Game Type"
            const parts = division.name.split(divider);
            console.log('Split into parts:', parts);
            if (parts.length === 2) {
                // Parse first division: "Name - Game Type"
                const firstDashIndex = parts[0].indexOf(' - ');
                console.log('First part:', parts[0], 'dash index:', firstDashIndex);
                if (firstDashIndex > -1) {
                    firstDivisionName = parts[0].substring(0, firstDashIndex).trim();
                    firstDivisionGameType = parts[0].substring(firstDashIndex + 3).trim();
                    console.log('Parsed first division - Name:', firstDivisionName, 'Game Type:', firstDivisionGameType);
                }
                
                // Parse second division: "Name - Game Type"
                const secondDashIndex = parts[1].indexOf(' - ');
                console.log('Second part:', parts[1], 'dash index:', secondDashIndex);
                if (secondDashIndex > -1) {
                    secondDivisionName = parts[1].substring(0, secondDashIndex).trim();
                    secondDivisionGameType = parts[1].substring(secondDashIndex + 3).trim();
                    console.log('Parsed second division - Name:', secondDivisionName, 'Game Type:', secondDivisionGameType);
                }
            }
        } else if (division.name.includes(' - ') && division.name.includes(' & ')) {
            // Old format: "Base Name - Game Type 1 & Game Type 2"
            const dashIndex = division.name.indexOf(' - ');
            const baseName = division.name.substring(0, dashIndex).trim();
            const gameTypes = division.name.substring(dashIndex + 3).trim();
            const gameParts = gameTypes.split(' & ');
            if (gameParts.length === 2) {
                firstDivisionName = baseName;
                firstDivisionGameType = gameParts[0].trim();
                secondDivisionName = baseName;
                secondDivisionGameType = gameParts[1].trim();
            }
        }
        
        // Set separate name and game type fields for double play
        const firstDivisionNameEl = document.getElementById('firstDivisionName');
        const firstDivisionGameTypeEl = document.getElementById('firstDivisionGameType');
        const secondDivisionNameEl = document.getElementById('secondDivisionName');
        const secondGameTypeEl = document.getElementById('secondGameType');
        
        if (firstDivisionNameEl) firstDivisionNameEl.value = firstDivisionName || '';
        if (firstDivisionGameTypeEl && firstDivisionGameType) firstDivisionGameTypeEl.value = firstDivisionGameType;
        if (secondDivisionNameEl) secondDivisionNameEl.value = secondDivisionName || '';
        if (secondGameTypeEl && secondDivisionGameType) secondGameTypeEl.value = secondDivisionGameType;
        
        // Update game type options to prevent duplicates
        updateGameTypeOptions();
    } else {
        const doublePlayOptions = document.getElementById('doublePlayOptions');
        if (doublePlayOptions) doublePlayOptions.style.display = 'none';
        const regularDivisionFields = document.getElementById('regularDivisionFields');
        if (regularDivisionFields) regularDivisionFields.style.display = 'block';
        const regularMatchesWrapper = document.getElementById('regularMatchesPerWeekWrapper');
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'block';
    }
    
    updateDivisionFinancialLabels();
    // Set title again after all fields are populated (toggleDoublePlayOptions overwrote it earlier)
    const titleElFinal = document.getElementById('divisionDetailsTabTitle');
    if (titleElFinal) titleElFinal.textContent = division.name || 'Edit Division';
    // Show and populate "Play dates by week" when editing (so user can change only dates)
    const weekPlayDatesSection = document.getElementById('weekPlayDatesSection');
    if (weekPlayDatesSection) {
        weekPlayDatesSection.style.display = 'block';
        renderWeekPlayDatesTable(division);
    }
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
    } catch (error) {
        console.error('Error in editDivision:', error);
        showAlertModal('Error loading division data. Please try again.', 'error', 'Error');
    }
}

async function addDivision() {
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    let divisionName = '';
    
    // Format division name for double play - combine name and game type for each division
    if (isDoublePlay) {
        const firstDivisionNameEl = document.getElementById('firstDivisionName');
        const firstDivisionGameTypeEl = document.getElementById('firstDivisionGameType') || document.getElementById('gameType');
        const secondDivisionNameEl = document.getElementById('secondDivisionName');
        const secondDivisionGameTypeEl = document.getElementById('secondDivisionGameType') || document.getElementById('secondGameType');
        const firstDivisionName = (firstDivisionNameEl?.value || '').trim();
        const firstDivisionGameType = (firstDivisionGameTypeEl?.value || '').trim();
        const secondDivisionName = (secondDivisionNameEl?.value || '').trim();
        const secondDivisionGameType = (secondDivisionGameTypeEl?.value || '').trim();
        
        if (!firstDivisionName) {
            showAlertModal('Please enter a First Division Name for double-play divisions', 'warning', 'Missing Field');
            return;
        }
        
        if (!firstDivisionGameType) {
            showAlertModal('Please select a First Division Game Type', 'warning', 'Missing Field');
            return;
        }
        
        if (!secondDivisionName) {
            showAlertModal('Please enter a Second Division Name for double-play divisions', 'warning', 'Missing Field');
            return;
        }
        
        if (!secondDivisionGameType) {
            showAlertModal('Please select a Second Division Game Type', 'warning', 'Missing Field');
            return;
        }
        
        // Format: "First Name - First Game Type / Second Name - Second Game Type"
        divisionName = `${firstDivisionName} - ${firstDivisionGameType} / ${secondDivisionName} - ${secondDivisionGameType}`;
    } else {
        divisionName = document.getElementById('divisionName').value.trim();
        if (!divisionName) {
            showAlertModal('Please enter a division name', 'warning', 'Missing Field');
            return;
        }
    }
    
    // Get color value - ensure we get the actual selected color
    const colorInput = document.getElementById('divisionColor');
    const selectedColor = colorInput && colorInput.value ? colorInput.value.trim() : null;
    const divisionColor = selectedColor || getDivisionColor(divisionName);
    
    // Team capacity comes from plan, not user input
    const numberOfTeams = await getTeamsPerDivisionFromPlan();

    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: parseFloat(document.getElementById('divisionWeeklyDues').value),
        playersPerWeek: parseInt(document.getElementById('playersPerWeek').value) || 5,
        matchesPerWeek: parseInt(document.getElementById('matchesPerWeek')?.value, 10) || 5,
        firstMatchesPerWeek: parseInt(document.getElementById('firstMatchesPerWeek')?.value, 10) || 5,
        secondMatchesPerWeek: parseInt(document.getElementById('secondMatchesPerWeek')?.value, 10) || 5,
        numberOfTeams: numberOfTeams >= 0 ? numberOfTeams : 0,
        totalWeeks: parseInt(document.getElementById('totalWeeks').value),
        startDate: document.getElementById('divisionStartDate')?.value || '',
        endDate: document.getElementById('divisionEndDate')?.value || '',
        isDoublePlay: isDoublePlay,
        description: document.getElementById('divisionDescription').value,
        color: divisionColor
    };
    
    console.log('Creating division with color:', divisionColor, 'from input:', selectedColor);
    
    // Add financial breakdown configuration if provided (optional - will use operator defaults if not set)
    const divisionCalculationMethod = document.querySelector('input[name="divisionCalculationMethod"]:checked')?.value || 'percentage';
    const divisionUsesDollarAmounts = divisionCalculationMethod === 'dollar';
    
    if (divisionUsesDollarAmounts) {
        divisionData.useDollarAmounts = true;
        const divisionPrizeFundAmount = document.getElementById('divisionPrizeFundAmount')?.value.trim();
        const divisionPrizeFundAmountType = document.querySelector('input[name="divisionPrizeFundAmountType"]:checked')?.value || 'perTeam';
        const divisionFirstOrgAmount = document.getElementById('divisionFirstOrganizationAmount')?.value.trim();
        const divisionFirstOrgAmountType = document.querySelector('input[name="divisionFirstOrgAmountType"]:checked')?.value || 'perTeam';
        const divisionSecondOrgAmount = document.getElementById('divisionSecondOrganizationAmount')?.value.trim();
        const divisionSecondOrgAmountType = document.querySelector('input[name="divisionSecondOrgAmountType"]:checked')?.value || 'perTeam';
        if (divisionPrizeFundAmount && !isNaN(parseFloat(divisionPrizeFundAmount))) {
            divisionData.prizeFundAmount = parseFloat(divisionPrizeFundAmount);
            divisionData.prizeFundAmountType = divisionPrizeFundAmountType;
        }
        if (divisionFirstOrgAmount && !isNaN(parseFloat(divisionFirstOrgAmount))) {
            divisionData.firstOrganizationAmount = parseFloat(divisionFirstOrgAmount);
            divisionData.firstOrganizationAmountType = divisionFirstOrgAmountType;
        }
        if (divisionSecondOrgAmount && !isNaN(parseFloat(divisionSecondOrgAmount))) {
            divisionData.secondOrganizationAmount = parseFloat(divisionSecondOrgAmount);
            divisionData.secondOrganizationAmountType = divisionSecondOrgAmountType;
        }
    } else {
        divisionData.useDollarAmounts = false;
        const divisionPrizeFundPercent = document.getElementById('divisionPrizeFundPercentage')?.value.trim();
        const divisionFirstOrgPercent = document.getElementById('divisionFirstOrgPercentage')?.value.trim();
        const divisionSecondOrgPercent = document.getElementById('divisionSecondOrgPercentage')?.value.trim();
        if (divisionPrizeFundPercent && !isNaN(parseFloat(divisionPrizeFundPercent))) {
            divisionData.prizeFundPercentage = parseFloat(divisionPrizeFundPercent);
        }
        if (divisionFirstOrgPercent && !isNaN(parseFloat(divisionFirstOrgPercent))) {
            divisionData.firstOrganizationPercentage = parseFloat(divisionFirstOrgPercent);
        }
        if (divisionSecondOrgPercent && !isNaN(parseFloat(divisionSecondOrgPercent))) {
            divisionData.secondOrganizationPercentage = parseFloat(divisionSecondOrgPercent);
        }
    }
    
    try {
        const response = await apiCall('/divisions', {
            method: 'POST',
            body: JSON.stringify(divisionData)
        });
        
        if (response.ok) {
            // Update saved method for active format indicator
            _savedDivisionUseDollarAmounts = divisionUsesDollarAmounts;
            
            bootstrap.Modal.getInstance(document.getElementById('addDivisionModal')).hide();
            // Reload all data to refresh the display with new division and color
            loadData().then(() => {
                displayDivisions(divisionsTableSortColumn, divisionsTableSortDir, divisionsTableShowArchived);
                updateDivisionDropdown();
                // Refresh teams display to show updated colors
                filterTeamsByDivision();
                // Show success in popup modal (delay so Add Division modal is fully closed first, like other confirmations)
                setTimeout(() => showAlertModal('Division created successfully!', 'success', 'Success'), 300);
            });
        } else {
            const error = await response.json();
            showAlertModal(error.message || 'Error creating division', 'error', 'Error');
        }
    } catch (error) {
        showAlertModal('Error creating division. Please try again.', 'error', 'Error');
    }
}

// Build the "Play dates by week" table (edit only). Uses division or form values.
function renderWeekPlayDatesTable(divisionOrForm) {
    const container = document.getElementById('weekPlayDatesContainer');
    if (!container) return;
    const totalWeeksEl = document.getElementById('totalWeeks');
    const startDateEl = document.getElementById('divisionStartDate');
    const totalWeeks = totalWeeksEl && totalWeeksEl.value ? parseInt(totalWeeksEl.value, 10) : (divisionOrForm && divisionOrForm.totalWeeks) || 0;
    const startDateStr = (startDateEl && startDateEl.value) || (divisionOrForm && (divisionOrForm.startDate || '').split('T')[0]) || '';
    if (!totalWeeks || totalWeeks < 1 || !startDateStr) {
        container.innerHTML = '<p class="text-muted small mb-0">Set Start date and Total weeks first.</p>';
        return;
    }
    const getPlayDate = typeof window.getPlayDateForWeek === 'function' ? window.getPlayDateForWeek : null;
    const division = divisionOrForm && divisionOrForm.totalWeeks ? divisionOrForm : { startDate: startDateStr, totalWeeks: totalWeeks, weekPlayDates: null };
    let html = '<table class="table table-sm table-borderless mb-0"><tbody>';
    for (let w = 1; w <= totalWeeks; w++) {
        let value = '';
        if (division.weekPlayDates && Array.isArray(division.weekPlayDates) && division.weekPlayDates[w - 1]) {
            const v = division.weekPlayDates[w - 1];
            value = (typeof v === 'string' ? v : '').split('T')[0] || '';
        }
        if (!value && getPlayDate) {
            const d = getPlayDate(division, w);
            if (d) value = d.toISOString().split('T')[0];
        }
        if (!value && startDateStr) {
            const [y, m, d] = startDateStr.split('-').map(Number);
            const start = new Date(y, m - 1, d);
            const weekDate = new Date(start);
            weekDate.setDate(start.getDate() + (w - 1) * 7);
            value = weekDate.toISOString().split('T')[0];
        }
        html += `<tr><td class="pe-2 text-nowrap"><label for="weekPlayDate_${w}" class="small mb-0">Week ${w}</label></td><td><input type="date" class="form-control form-control-sm" id="weekPlayDate_${w}" data-week="${w}" value="${value || ''}"></td></tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Helper function to calculate end date from start date and weeks
function calculateEndDateFromStart(startDate, totalWeeks) {
    if (!startDate || !totalWeeks) return '';
    const [year, month, day] = startDate.split('T')[0].split('-').map(Number);
    const start = new Date(year, month - 1, day); // month is 0-indexed
    const end = new Date(start);
    // End date is the last day of the last week
    // Week 1 starts on startDate and is 7 days (day 0-6)
    // Week 12 would be days 77-83 (7 * 11 to 7 * 12 - 1)
    // So the last day of week 12 is startDate + (12 * 7) - 1 = startDate + 83 days
    // However, user expects April 1 for 12 weeks from Jan 7, which is startDate + 84 days
    // Let's check: Jan 7 + 84 = March 31, so for April 1 we'd need 85 days
    // Actually, the calculation should be: startDate + (totalWeeks * 7) gives us the start of week (totalWeeks + 1)
    // To get the last day of week totalWeeks, we subtract 1: startDate + (totalWeeks * 7) - 1
    // But if user wants April 1 for 12 weeks, we should not subtract 1
    end.setDate(start.getDate() + (totalWeeks * 7));
    return end.toISOString().split('T')[0];
}

// Smart Builder double play options toggle
function toggleSmartBuilderDoublePlayOptions(event) {
    // Get the checkbox that was clicked (from event or find all and check their state)
    let activeCheckbox = null;
    let isDoublePlay = false;
    
    // Try to get from event target first
    if (event && event.target) {
        activeCheckbox = event.target;
        isDoublePlay = activeCheckbox.checked;
    } else {
        // Fallback: find all checkboxes and get the checked one
        const checkboxes = document.querySelectorAll('#smartBuilderIsDoublePlay');
        for (const checkbox of checkboxes) {
            if (checkbox.checked) {
                isDoublePlay = true;
                activeCheckbox = checkbox;
                break;
            }
        }
        // If none are checked, check the first one's state
        if (!activeCheckbox && checkboxes.length > 0) {
            activeCheckbox = checkboxes[0];
            isDoublePlay = activeCheckbox.checked;
        }
    }
    
    console.log('Double play toggle called, isDoublePlay:', isDoublePlay, 'checkbox:', activeCheckbox);
    
    // Find the options div in the same container as the checkbox
    let optionsDiv = null;
    if (activeCheckbox) {
        // Find the closest modal or container
        const container = activeCheckbox.closest('.modal-body, #smartBuilderContent, .tab-pane, .card-body');
        if (container) {
            optionsDiv = container.querySelector('#smartBuilderDoublePlayOptions');
            console.log('Found container, looking for options div:', !!optionsDiv);
        }
    }
    
    // Fallback: use first one found
    if (!optionsDiv) {
        optionsDiv = document.getElementById('smartBuilderDoublePlayOptions');
        console.log('Using fallback, found options div:', !!optionsDiv);
    }
    
    if (!optionsDiv) {
        console.error('Could not find smartBuilderDoublePlayOptions element');
        // Try to find by class or other means
        const allOptions = document.querySelectorAll('[id*="DoublePlayOptions"]');
        console.log('Found alternative options divs:', allOptions.length);
        if (allOptions.length > 0) {
            optionsDiv = allOptions[0];
        } else {
            return;
        }
    }
    
    // Find other elements in the same container
    const container = optionsDiv.closest('.modal-body, #smartBuilderContent, .tab-pane') || document;
    const divisionNameInput = container.querySelector('#smartBuilderDivisionName') || document.getElementById('smartBuilderDivisionName');
    // Try both possible IDs for first game type (Smart Builder uses smartBuilderGameType, other modals use firstGameType)
    const firstGameTypeSelect = container.querySelector('#smartBuilderGameType') || 
                                container.querySelector('#firstGameType') || 
                                document.getElementById('smartBuilderGameType') ||
                                document.getElementById('firstGameType');
    // Get Division 2 name field (new separate field)
    const division2NameField = container.querySelector('#smartBuilderDivision2Name') || 
                              document.getElementById('smartBuilderDivision2Name');
    const secondGameTypeSelect = container.querySelector('#smartBuilderSecondGameType') || document.getElementById('smartBuilderSecondGameType');
    
    console.log('Double play toggle - isDoublePlay:', isDoublePlay, 'optionsDiv found:', !!optionsDiv, 'firstGameTypeSelect found:', !!firstGameTypeSelect);
    
    if (isDoublePlay) {
        optionsDiv.style.display = 'block';
        // Force display in case inline style is being overridden
        optionsDiv.style.setProperty('display', 'block', 'important');
        console.log('✅ Showing double play options, display set to block');
        
        // Keep the regular division name field visible - it becomes "Division 1 Name"
        // Update labels for clarity
        const divisionNameLabel = document.getElementById('divisionNameLabel');
        if (divisionNameLabel) {
            divisionNameLabel.textContent = 'Division 1 Name *';
        }
        const gameTypeLabel = document.getElementById('gameTypeLabel');
        if (gameTypeLabel) {
            gameTypeLabel.textContent = 'Division 1 Game Type *';
        }
        
        // Make sure Division 2 name field is required and visible
        if (division2NameField) {
            division2NameField.required = true;
            const division2NameRow = division2NameField.closest('.row, .mb-3, .col-md-6');
            if (division2NameRow) {
                division2NameRow.style.display = '';
            }
        }
        
        // Keep first game type visible - it's needed for double play
        // Make double play fields required
        if (division2NameField) division2NameField.required = true;
        if (secondGameTypeSelect) secondGameTypeSelect.required = true;
        if (firstGameTypeSelect) {
            firstGameTypeSelect.required = true;
            // Make sure the first game type field and its container are visible
            const firstGameTypeRow = firstGameTypeSelect.closest('.row, .mb-3, .col-md-6');
            if (firstGameTypeRow) {
                firstGameTypeRow.style.display = '';
                firstGameTypeRow.style.visibility = 'visible';
                // Also ensure the parent row is visible
                const parentRow = firstGameTypeRow.closest('.row');
                if (parentRow) {
                    parentRow.style.display = '';
                    parentRow.style.visibility = 'visible';
                }
            }
            // Make sure the select itself is visible
            firstGameTypeSelect.style.display = '';
            firstGameTypeSelect.style.visibility = 'visible';
            
            // Update label to indicate it's for Division 1 game type in double play
            const label = firstGameTypeSelect.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.textContent = 'Division 1 Game Type *';
            } else {
                // Try to find label by for attribute
                const labelByFor = document.querySelector(`label[for="${firstGameTypeSelect.id}"]`);
                if (labelByFor) {
                    labelByFor.textContent = 'Division 1 Game Type *';
                }
            }
        } else {
            console.warn('⚠️ First game type select not found - cannot update label');
        }
        
        // Don't clear regular division name - it's already hidden and we've copied it to base name
        if (divisionNameInput) {
            divisionNameInput.required = false;
        }
        
        // Update game type options to prevent selecting same type twice
        if (firstGameTypeSelect && secondGameTypeSelect) {
            updateSmartBuilderGameTypeOptions();
        }
    } else {
        optionsDiv.style.display = 'none';
        optionsDiv.style.setProperty('display', 'none', 'important');
        console.log('❌ Hiding double play options');
        
        // Restore original labels
        const divisionNameLabel = document.getElementById('divisionNameLabel');
        if (divisionNameLabel) {
            divisionNameLabel.textContent = 'Division Name *';
        }
        const gameTypeLabel = document.getElementById('gameTypeLabel');
        if (gameTypeLabel) {
            gameTypeLabel.textContent = 'Game Type *';
        }
        
        // Make Division 2 name field not required when double play is off
        const division2NameField = document.getElementById('smartBuilderDivision2Name');
        if (division2NameField) {
            division2NameField.required = false;
        }
        
        // Make regular fields required
        if (divisionNameInput) {
            divisionNameInput.required = true;
        }
        if (firstGameTypeSelect) {
            firstGameTypeSelect.required = true;
            // Make sure the first game type field is visible
            const firstGameTypeRow = firstGameTypeSelect.closest('.row, .mb-3, .col-md-6');
            if (firstGameTypeRow) {
                firstGameTypeRow.style.display = '';
                firstGameTypeRow.style.visibility = 'visible';
            }
            // Restore original label
            const label = firstGameTypeSelect.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.textContent = 'Game Type *';
            } else {
                // Try to find label by for attribute
                const labelByFor = document.querySelector(`label[for="${firstGameTypeSelect.id}"]`);
                if (labelByFor) {
                    labelByFor.textContent = 'Game Type *';
                }
            }
        }
        
        // Don't clear double play fields - user might want to toggle back
        if (division2NameField) {
            division2NameField.required = false;
        }
        if (secondGameTypeSelect) {
            secondGameTypeSelect.value = '';
            secondGameTypeSelect.required = false;
        }
    }
}

// Update game type options (no longer disabling options - user can select same type for both divisions)
function updateSmartBuilderGameTypeOptions() {
    // Try both possible IDs for first game type (Smart Builder uses smartBuilderGameType, other modals use firstGameType)
    const firstGameType = document.getElementById('smartBuilderGameType') || 
                         document.getElementById('firstGameType');
    const secondGameType = document.getElementById('smartBuilderSecondGameType');
    
    if (!firstGameType || !secondGameType) return;
    
    // Enable all options in the second game type dropdown (no restrictions)
    const secondOptions = secondGameType.querySelectorAll('option');
    secondOptions.forEach(option => {
        option.disabled = false;
    });
}

function toggleSmartBuilderFinancialOption() {
    const useDefault = document.getElementById('smartBuilderFinancialUseDefault')?.checked;
    const usingDefaultMsg = document.getElementById('smartBuilderUsingDefaultMessage');
    const divisionSpecificWrap = document.getElementById('smartBuilderDivisionSpecificWrap');
    if (usingDefaultMsg) usingDefaultMsg.style.display = useDefault ? 'flex' : 'none';
    if (divisionSpecificWrap) divisionSpecificWrap.style.display = useDefault ? 'none' : 'block';
    if (!useDefault && typeof toggleSmartBuilderFinancialMethod === 'function') toggleSmartBuilderFinancialMethod();
}

function toggleSmartBuilderFinancialMethod() {
    const isDollar = document.getElementById('smartBuilderMethodDollar')?.checked;
    const pctWrap = document.getElementById('smartBuilderPercentageInputs');
    const dollarWrap = document.getElementById('smartBuilderDollarInputs');
    if (pctWrap) pctWrap.style.display = isDollar ? 'none' : 'block';
    if (dollarWrap) dollarWrap.style.display = isDollar ? 'block' : 'none';
}
if (typeof window !== 'undefined') {
    window.toggleSmartBuilderFinancialOption = toggleSmartBuilderFinancialOption;
    window.toggleSmartBuilderFinancialMethod = toggleSmartBuilderFinancialMethod;
}

function toggleSmartBuilderMatchesOther() {
    const sel = document.getElementById('smartBuilderMatchesPerWeek');
    const wrap = document.getElementById('smartBuilderMatchesOtherWrap');
    const input = document.getElementById('smartBuilderMatchesPerWeekOther');
    if (!sel || !wrap) return;
    const isOther = sel.value === 'other';
    wrap.style.display = isOther ? 'block' : 'none';
    if (input) {
        input.required = !!isOther;
        if (!isOther) input.value = '';
    }
}

function toggleSmartBuilderPlayersOther() {
    const sel = document.getElementById('smartBuilderPlayersPerWeek');
    const wrap = document.getElementById('smartBuilderPlayersOtherWrap');
    const input = document.getElementById('smartBuilderPlayersPerWeekOther');
    if (!sel || !wrap) return;
    const isOther = sel.value === 'other';
    wrap.style.display = isOther ? 'block' : 'none';
    if (input) {
        input.required = !!isOther;
        if (!isOther) input.value = '';
    }
}

function getSmartBuilderMatchesPerWeek(container) {
    const doc = container || document;
    const sel = doc.querySelector('#smartBuilderMatchesPerWeek') || document.getElementById('smartBuilderMatchesPerWeek');
    const other = doc.querySelector('#smartBuilderMatchesPerWeekOther') || document.getElementById('smartBuilderMatchesPerWeekOther');
    if (!sel) return 1;
    if (sel.value === 'other' && other) {
        const v = parseInt(other.value, 10);
        return (typeof v === 'number' && !isNaN(v) && v >= 1) ? v : 1;
    }
    const v = parseInt(sel.value, 10);
    return (typeof v === 'number' && !isNaN(v) && v >= 1) ? v : 1;
}

function getSmartBuilderPlayersPerWeek(container) {
    const doc = container || document;
    const sel = doc.querySelector('#smartBuilderPlayersPerWeek') || document.getElementById('smartBuilderPlayersPerWeek');
    const other = doc.querySelector('#smartBuilderPlayersPerWeekOther') || document.getElementById('smartBuilderPlayersPerWeekOther');
    if (!sel) return 5;
    if (sel.value === 'other' && other) {
        const v = parseInt(other.value, 10);
        return (typeof v === 'number' && !isNaN(v) && v >= 1) ? v : 5;
    }
    const v = parseInt(sel.value, 10);
    return (typeof v === 'number' && !isNaN(v) && v >= 1) ? v : 5;
}

// Smart Builder end date calculator
function calculateSmartBuilderEndDate() {
    // Find all date inputs (there might be duplicates in different modals)
    const allStartDateInputs = document.querySelectorAll('#smartBuilderStartDate');
    const allTotalWeeksInputs = document.querySelectorAll('#smartBuilderTotalWeeks'); // Now a select dropdown
    const allEndDateInputs = document.querySelectorAll('#smartBuilderEndDate');
    
    // Try to find the active/visible ones
    let startDateInput = null;
    let totalWeeksSelect = null; // Now a select dropdown
    let endDateInput = null;
    
    // Check if smartBuilderModal is open
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    const divisionModal = document.getElementById('divisionManagementModal');
    
    if (smartBuilderModal && (smartBuilderModal.classList.contains('show') || window.getComputedStyle(smartBuilderModal).display !== 'none')) {
        startDateInput = smartBuilderModal.querySelector('#smartBuilderStartDate');
        totalWeeksSelect = smartBuilderModal.querySelector('#smartBuilderTotalWeeks'); // Now a select
        endDateInput = smartBuilderModal.querySelector('#smartBuilderEndDate');
    } else if (divisionModal && (divisionModal.classList.contains('show') || window.getComputedStyle(divisionModal).display !== 'none')) {
        // Check LMS/CSI tab
        const lmsTabPane = document.getElementById('lms-csi-pane');
        if (lmsTabPane && (lmsTabPane.classList.contains('active') || lmsTabPane.classList.contains('show'))) {
            startDateInput = lmsTabPane.querySelector('#smartBuilderStartDate');
            totalWeeksSelect = lmsTabPane.querySelector('#smartBuilderTotalWeeks'); // Now a select
            endDateInput = lmsTabPane.querySelector('#smartBuilderEndDate');
        }
    }
    
    // Fallback: use first available
    if (!startDateInput && allStartDateInputs.length > 0) {
        startDateInput = allStartDateInputs[0];
    }
    if (!totalWeeksSelect && allTotalWeeksInputs.length > 0) {
        totalWeeksSelect = allTotalWeeksInputs[0];
    }
    if (!endDateInput && allEndDateInputs.length > 0) {
        endDateInput = allEndDateInputs[0];
    }
    
    if (!startDateInput || !totalWeeksSelect || !endDateInput) {
        console.error('Could not find date input fields for end date calculation');
        // Still try to update day of week if we have a date input
        if (startDateInput && startDateInput.value) {
            const [year, month, day] = startDateInput.value.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = dayNames[date.getDay()];
            
            const dayOfWeekDisplay = document.getElementById('smartBuilderDayOfWeekDisplay');
            const dayOfWeekText = document.getElementById('smartBuilderDayOfWeekText');
            if (dayOfWeekDisplay && dayOfWeekText) {
                dayOfWeekText.textContent = dayName;
                dayOfWeekDisplay.style.display = 'block';
            }
        }
        return;
    }
    
    const startDate = startDateInput.value;
    const totalWeeks = parseInt(totalWeeksSelect.value) || 0;
    
    console.log('Calculating end date - startDate:', startDate, 'totalWeeks:', totalWeeks);
    
    // Calculate and display day of week
    if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        
        // Update day of week display in Smart Builder modal (new element)
        const dayOfWeekDisplay = document.getElementById('smartBuilderDayOfWeekDisplay');
        const dayOfWeekText = document.getElementById('smartBuilderDayOfWeekText');
        if (dayOfWeekDisplay && dayOfWeekText) {
            dayOfWeekText.textContent = dayName;
            dayOfWeekDisplay.style.display = 'block';
        }
        
        // Also update old day of week displays if they exist (for backward compatibility)
        const allDayOfWeekDisplays = document.querySelectorAll('#smartBuilderDayOfWeek');
        const allDayOfWeekContainers = document.querySelectorAll('#smartBuilderDayOfWeekContainer');
        
        allDayOfWeekDisplays.forEach(display => {
            display.textContent = dayName;
        });
        
        allDayOfWeekContainers.forEach(container => {
            container.style.setProperty('display', 'block', 'important');
        });
    } else {
        // Hide day of week display if no date
        const dayOfWeekDisplay = document.getElementById('smartBuilderDayOfWeekDisplay');
        if (dayOfWeekDisplay) {
            dayOfWeekDisplay.style.display = 'none';
        }
        
        // Also hide old containers if they exist
        const containers = document.querySelectorAll('#smartBuilderDayOfWeekContainer');
        containers.forEach(container => {
            container.style.setProperty('display', 'none', 'important');
        });
    }
    
    if (startDate && totalWeeks > 0) {
        const endDate = calculateEndDateFromStart(startDate, totalWeeks);
        endDateInput.value = endDate;
        console.log('✅ Calculated end date:', endDate);
    } else {
        endDateInput.value = '';
        console.log('⚠️ Missing start date or total weeks, cleared end date');
    }
}

async function updateDivision() {
    // Get the current division being edited
    const currentDivision = currentDivisionId ? divisions.find(d => d._id === currentDivisionId) : null;
    
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    let divisionName = '';
    
    // Format division name for double play - combine name and game type for each division
    // Note: The edit division modal uses different field structure than Smart Builder
    // For double play in edit modal: divisionName contains full name, gameType is first, secondGameType is second
    if (isDoublePlay) {
        // Try to get the new fields first (addDivisionModal uses firstDivisionName, firstDivisionGameType, secondDivisionName, secondGameType)
        let firstDivisionNameEl = document.getElementById('firstDivisionName');
        let firstDivisionGameTypeEl = document.getElementById('firstDivisionGameType') || document.getElementById('gameType');
        let secondDivisionNameEl = document.getElementById('secondDivisionName');
        let secondDivisionGameTypeEl = document.getElementById('secondDivisionGameType') || document.getElementById('secondGameType');
        
        // If new fields don't exist, use the old structure (divisionName, gameType, secondGameType)
        // This is the structure used in the edit division modal
        if (!firstDivisionNameEl || !firstDivisionGameTypeEl || !secondDivisionNameEl || !secondDivisionGameTypeEl) {
            // Use the old field structure for edit division modal
            const divisionNameEl = document.getElementById('divisionName');
            const gameTypeEl = document.getElementById('gameType');
            const secondGameTypeEl = document.getElementById('secondGameType');
            
            if (!divisionNameEl) {
                showAlertModal('Division name field not found', 'error', 'Error');
                return;
            }
            if (!gameTypeEl) {
                showAlertModal('First game type field not found', 'error', 'Error');
                return;
            }
            if (!secondGameTypeEl) {
                showAlertModal('Second game type field not found. Please ensure double play options are visible.', 'error', 'Error');
                return;
            }
            
            // Parse the existing division name to extract both division names
            // Format: "First Name - First Game Type / Second Name - Second Game Type"
            const fullName = divisionNameEl.value.trim();
            const firstGameType = gameTypeEl.value.trim();
            const secondGameType = secondGameTypeEl.value.trim();
            
            if (!firstGameType || !secondGameType) {
                showAlertModal('Please select both game types for double-play divisions', 'warning', 'Missing Field');
                return;
            }
            
            if (fullName.includes(' / ')) {
                // Name already has the format, parse it to get division names
                const parts = fullName.split(' / ');
                if (parts.length === 2) {
                    // Extract first division name
                    const firstPart = parts[0].trim();
                    const firstDashIndex = firstPart.indexOf(' - ');
                    const firstDivisionName = firstDashIndex > -1 ? firstPart.substring(0, firstDashIndex).trim() : firstPart;
                    
                    // Extract second division name
                    const secondPart = parts[1].trim();
                    const secondDashIndex = secondPart.indexOf(' - ');
                    const secondDivisionName = secondDashIndex > -1 ? secondPart.substring(0, secondDashIndex).trim() : secondPart;
                    
                    if (!firstDivisionName || !secondDivisionName) {
                        showAlertModal('Please ensure division names are properly formatted', 'warning', 'Invalid Format');
                        return;
                    }
                    
                    // Reconstruct the full name using the game types from the dropdowns
                    divisionName = `${firstDivisionName} - ${firstGameType} / ${secondDivisionName} - ${secondGameType}`;
                } else {
                    showAlertModal('Invalid double play division name format. Expected: "First Name - Game Type / Second Name - Game Type"', 'warning', 'Invalid Format');
                    return;
                }
            } else {
                // Name doesn't have the format yet, use the name as base for both divisions
                // This shouldn't normally happen, but handle it gracefully
                const baseName = fullName || 'Division';
                divisionName = `${baseName} - ${firstGameType} / ${baseName} - ${secondGameType}`;
            }
        } else {
            // Use the new field structure (Smart Builder style)
            const firstDivisionName = firstDivisionNameEl.value.trim();
            const firstDivisionGameType = firstDivisionGameTypeEl.value.trim();
            const secondDivisionName = secondDivisionNameEl.value.trim();
            const secondDivisionGameType = secondDivisionGameTypeEl.value.trim();
            
            if (!firstDivisionName || !firstDivisionGameType || !secondDivisionName || !secondDivisionGameType) {
                showAlertModal('Please enter all division names and select all game types for double-play divisions', 'warning', 'Missing Fields');
                return;
            }
            
            // Format: "First Name - First Game Type / Second Name - Second Game Type"
            divisionName = `${firstDivisionName} - ${firstDivisionGameType} / ${secondDivisionName} - ${secondDivisionGameType}`;
        }
    } else {
        // For regular divisions, use the divisionName field
        const divisionNameEl = document.getElementById('divisionName');
        if (!divisionNameEl) {
            showAlertModal('Division name field not found', 'error', 'Error');
            return;
        }
        divisionName = divisionNameEl.value.trim();
        if (!divisionName) {
            showAlertModal('Please enter a division name', 'warning', 'Missing Field');
            return;
        }
        
        // For regular divisions, also get the game type and append it if not already in the name
        const gameTypeEl = document.getElementById('gameType');
        if (gameTypeEl && gameTypeEl.value && !divisionName.includes(' - ')) {
            const gameType = gameTypeEl.value.trim();
            divisionName = `${divisionName} - ${gameType}`;
        }
    }
    
    // Get color value - ensure we get the actual selected color
    const colorInput = document.getElementById('divisionColor');
    const selectedColor = colorInput && colorInput.value ? colorInput.value.trim() : null;
    const divisionColor = selectedColor || getDivisionColor(divisionName);
    
    // Get dues per player - check both possible field IDs (divisionWeeklyDues is the dropdown we just added)
    const duesPerPlayerEl = document.getElementById('divisionWeeklyDues') || document.getElementById('duesPerPlayerPerMatch');
    if (!duesPerPlayerEl || !duesPerPlayerEl.value) {
        showAlertModal('Please select a dues amount per player per match', 'warning', 'Missing Field');
        return;
    }
    const duesPerPlayerPerMatch = parseFloat(duesPerPlayerEl.value);
    if (isNaN(duesPerPlayerPerMatch) || duesPerPlayerPerMatch <= 0) {
        showAlertModal('Please enter a valid dues amount per player per match', 'warning', 'Invalid Value');
        return;
    }
    
    // Get players per week (if field exists, otherwise use existing division value or default)
    const playersPerWeekEl = document.getElementById('playersPerWeek');
    let playersPerWeek = 5; // Default
    if (playersPerWeekEl && playersPerWeekEl.value) {
        playersPerWeek = parseInt(playersPerWeekEl.value) || 5;
    } else if (currentDivision && currentDivision.playersPerWeek !== undefined && currentDivision.playersPerWeek !== null) {
        // Use existing division's playersPerWeek if field doesn't exist in form
        playersPerWeek = parseInt(currentDivision.playersPerWeek) || 5;
    }
    
    // Get matches per week fields
    const matchesPerWeekEl = document.getElementById('matchesPerWeek');
    const firstMatchesPerWeekEl = document.getElementById('firstMatchesPerWeek');
    const secondMatchesPerWeekEl = document.getElementById('secondMatchesPerWeek');
    
    const matchesPerWeek = matchesPerWeekEl ? (parseInt(matchesPerWeekEl.value, 10) || 5) : 5;
    const firstMatchesPerWeek = firstMatchesPerWeekEl ? (parseInt(firstMatchesPerWeekEl.value, 10) || 5) : 5;
    const secondMatchesPerWeek = secondMatchesPerWeekEl ? (parseInt(secondMatchesPerWeekEl.value, 10) || 5) : 5;
    
    const numberOfTeams = await getTeamsPerDivisionFromPlan();
    const totalWeeksEl = document.getElementById('totalWeeks');
    
    if (!totalWeeksEl || !totalWeeksEl.value) {
        showAlertModal('Please enter the total weeks', 'warning', 'Missing Field');
        return;
    }
    
    const totalWeeksVal = parseInt(totalWeeksEl.value, 10) || 0;
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: duesPerPlayerPerMatch,
        playersPerWeek: playersPerWeek,
        matchesPerWeek: matchesPerWeek,
        firstMatchesPerWeek: firstMatchesPerWeek,
        secondMatchesPerWeek: secondMatchesPerWeek,
        numberOfTeams: numberOfTeams,
        totalWeeks: totalWeeksVal,
        color: divisionColor,
        startDate: document.getElementById('divisionStartDate')?.value || '',
        endDate: document.getElementById('divisionEndDate')?.value || '',
        isDoublePlay: isDoublePlay,
        description: document.getElementById('divisionDescription')?.value || ''
    };
    // Collect play dates by week (from "Play dates by week" section)
    const weekPlayDates = [];
    for (let w = 1; w <= totalWeeksVal; w++) {
        const input = document.getElementById('weekPlayDate_' + w);
        const val = input && input.value ? input.value.trim() : null;
        weekPlayDates.push(val || null);
    }
    if (weekPlayDates.length > 0) divisionData.weekPlayDates = weekPlayDates;
    
    console.log('Updating division with color:', divisionColor, 'from input:', selectedColor);
    
    // Add financial breakdown configuration if provided (optional - will use operator defaults if not set)
    const divisionCalculationMethod = document.querySelector('input[name="divisionCalculationMethod"]:checked')?.value || 'percentage';
    const divisionUsesDollarAmounts = divisionCalculationMethod === 'dollar';
    
    if (divisionUsesDollarAmounts) {
        divisionData.useDollarAmounts = true;
        const divisionPrizeFundAmount = document.getElementById('divisionPrizeFundAmount')?.value.trim();
        const divisionPrizeFundAmountType = document.querySelector('input[name="divisionPrizeFundAmountType"]:checked')?.value || 'perTeam';
        const divisionFirstOrgAmount = document.getElementById('divisionFirstOrganizationAmount')?.value.trim();
        const divisionFirstOrgAmountType = document.querySelector('input[name="divisionFirstOrgAmountType"]:checked')?.value || 'perTeam';
        const divisionSecondOrgAmount = document.getElementById('divisionSecondOrganizationAmount')?.value.trim();
        const divisionSecondOrgAmountType = document.querySelector('input[name="divisionSecondOrgAmountType"]:checked')?.value || 'perTeam';
        if (divisionPrizeFundAmount && !isNaN(parseFloat(divisionPrizeFundAmount))) {
            divisionData.prizeFundAmount = parseFloat(divisionPrizeFundAmount);
            divisionData.prizeFundAmountType = divisionPrizeFundAmountType;
        }
        if (divisionFirstOrgAmount && !isNaN(parseFloat(divisionFirstOrgAmount))) {
            divisionData.firstOrganizationAmount = parseFloat(divisionFirstOrgAmount);
            divisionData.firstOrganizationAmountType = divisionFirstOrgAmountType;
        }
        if (divisionSecondOrgAmount && !isNaN(parseFloat(divisionSecondOrgAmount))) {
            divisionData.secondOrganizationAmount = parseFloat(divisionSecondOrgAmount);
            divisionData.secondOrganizationAmountType = divisionSecondOrgAmountType;
        }
    } else {
        divisionData.useDollarAmounts = false;
        const divisionPrizeFundPercent = document.getElementById('divisionPrizeFundPercentage')?.value.trim();
        const divisionFirstOrgPercent = document.getElementById('divisionFirstOrgPercentage')?.value.trim();
        const divisionSecondOrgPercent = document.getElementById('divisionSecondOrgPercentage')?.value.trim();
        if (divisionPrizeFundPercent && !isNaN(parseFloat(divisionPrizeFundPercent))) {
            divisionData.prizeFundPercentage = parseFloat(divisionPrizeFundPercent);
        }
        if (divisionFirstOrgPercent && !isNaN(parseFloat(divisionFirstOrgPercent))) {
            divisionData.firstOrganizationPercentage = parseFloat(divisionFirstOrgPercent);
        }
        if (divisionSecondOrgPercent && !isNaN(parseFloat(divisionSecondOrgPercent))) {
            divisionData.secondOrganizationPercentage = parseFloat(divisionSecondOrgPercent);
        }
    }
    
    console.log('📤 Sending division update:', {
        divisionId: currentDivisionId,
        divisionData: divisionData,
        reconstructedName: divisionName
    });
    console.log('📤 Full divisionData JSON:', JSON.stringify(divisionData, null, 2));
    
    try {
        const response = await apiCall(`/divisions/${currentDivisionId}`, {
            method: 'PUT',
            body: JSON.stringify(divisionData)
        });
        
        if (response.ok) {
            // Update saved method for active format indicator
            _savedDivisionUseDollarAmounts = divisionUsesDollarAmounts;
            
            const updatedDivision = await response.json();
            console.log('✅ Division updated successfully:', updatedDivision);
            bootstrap.Modal.getInstance(document.getElementById('addDivisionModal')).hide();
            // Reload all data to refresh the display with updated division name and color
            loadData().then(() => {
                displayDivisions(divisionsTableSortColumn, divisionsTableSortDir, divisionsTableShowArchived);
                updateDivisionDropdown(); // Refresh the dropdown with updated names
                // Refresh teams display to show updated colors
                filterTeamsByDivision();
                const msg = updatedDivision._weekPlayDatesSkipped
                    ? 'Division updated, but play date overrides were not saved. Your database may need the week_play_dates column—run the migration add-week-play-dates-to-divisions.sql in Supabase (or your DB) and try again.'
                    : 'Division updated successfully!';
                showAlertModal(msg, updatedDivision._weekPlayDatesSkipped ? 'warning' : 'success', 'Success');
            });
        } else {
            const errorData = await response.json();
            console.error('❌ Error updating division:', errorData);
            console.error('❌ Full error object:', JSON.stringify(errorData, null, 2));
            let errorMessage = errorData.message || errorData.error || 'Error updating division';
            
            // Provide helpful message for duplicate name errors
            if (errorData.errorCode === '23505' || errorData.error?.includes('duplicate key') || errorData.error?.includes('unique constraint')) {
                errorMessage = `A division with the name "${divisionData.name}" already exists. Please choose a different name or delete the existing division first.`;
            }
            
            const errorHint = errorData.hint ? `\n\nHint: ${errorData.hint}` : '';
            showAlertModal(`${errorMessage}${errorHint}`, 'error', 'Error');
        }
    } catch (error) {
        console.error('❌ Exception updating division:', error);
        showAlertModal('Error updating division. Please try again.', 'error', 'Error');
    }
}

function archiveDivision(divisionId) {
    const division = divisions.find(d => d._id === divisionId || d.id === divisionId);
    if (!division) {
        showAlertModal('Division not found.', 'error', 'Error');
        return;
    }
    const teamCount = getTeamCountForDivision(division);
    document.getElementById('archiveDivisionName').textContent = division.name;
    document.getElementById('archiveDivisionTeamCount').textContent = teamCount;
    document.getElementById('archiveDivisionModal').dataset.divisionId = divisionId;
    const modal = new bootstrap.Modal(document.getElementById('archiveDivisionModal'));
    modal.show();
}

function setupArchiveDivisionModalHandlers() {
    const modalEl = document.getElementById('archiveDivisionModal');
    if (!modalEl || modalEl.dataset.handlersSetup === 'true') return;
    modalEl.dataset.handlersSetup = 'true';
    document.getElementById('archiveDivisionOnlyBtn').addEventListener('click', async () => {
        bootstrap.Modal.getInstance(modalEl).hide();
        const divisionId = modalEl.dataset.divisionId;
        await executeArchiveDivision(divisionId, false);
    });
    document.getElementById('archiveDivisionAndTeamsBtn').addEventListener('click', async () => {
        bootstrap.Modal.getInstance(modalEl).hide();
        const divisionId = modalEl.dataset.divisionId;
        await executeArchiveDivision(divisionId, true);
    });
}

async function executeArchiveDivision(divisionId, archiveTeamsToo) {
    const division = divisions.find(d => d._id === divisionId || d.id === divisionId);
    if (!division) {
        showAlertModal('Division not found.', 'error', 'Error');
        return;
    }
    const divName = division.name;
    try {
        showLoadingMessage('Archiving division...');
        const divisionUpdate = {
            ...division,
            isArchived: true,
            archivedAt: new Date().toISOString()
        };
        const divRes = await apiCall(`/divisions/${divisionId}`, {
            method: 'PUT',
            body: JSON.stringify(divisionUpdate)
        });
        if (!divRes.ok) {
            const err = await divRes.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to archive division');
        }
        let divTeams = [];
        if (archiveTeamsToo && teams && teams.length > 0) {
            divTeams = teams.filter(t => !t.isArchived && (t.division === divName || (t.division || '').toLowerCase() === (divName || '').toLowerCase()));
            for (const team of divTeams) {
                const teamUpdate = {
                    teamName: team.teamName,
                    division: team.division,
                    location: team.location,
                    teamMembers: team.teamMembers || [],
                    captainName: team.captainName,
                    captainEmail: team.captainEmail,
                    captainPhone: team.captainPhone,
                    weeklyPayments: team.weeklyPayments || [],
                    divisionDuesRate: team.divisionDuesRate || 0,
                    numberOfTeams: team.numberOfTeams || 0,
                    totalWeeks: team.totalWeeks || 0,
                    playerCount: team.playerCount || 0,
                    duesAmount: team.duesAmount || 0,
                    isArchived: true,
                    isActive: false,
                    archivedAt: new Date().toISOString()
                };
                await apiCall(`/teams/${team._id}`, { method: 'PUT', body: JSON.stringify(teamUpdate) });
            }
        }
        hideLoadingMessage();
        showAlertModal(archiveTeamsToo
            ? `Division and ${divTeams?.length || 0} teams archived.`
            : 'Division archived. Teams remain active.',
            'success', 'Success');
        await loadDivisions();
        if (typeof loadData === 'function') await loadData();
        displayDivisions(divisionsTableSortColumn, divisionsTableSortDir, divisionsTableShowArchived);
        updateDivisionDropdown();
        updateDivisionFilter();
    } catch (error) {
        hideLoadingMessage();
        showAlertModal(error.message || 'Error archiving division.', 'error', 'Error');
    }
}

async function restoreDivision(divisionId) {
    const division = archivedDivisionsList.find(d => d._id === divisionId || d.id === divisionId)
        || divisions.find(d => d._id === divisionId || d.id === divisionId);
    if (!division) {
        showAlertModal('Division not found.', 'error', 'Error');
        return;
    }
    const confirmed = confirm(`Restore "${division.name}"? It will appear in your active divisions again.`);
    if (!confirmed) return;
    try {
        showLoadingMessage('Restoring division...');
        const update = { ...division, isArchived: false, archivedAt: null };
        const res = await apiCall(`/divisions/${divisionId}`, { method: 'PUT', body: JSON.stringify(update) });
        hideLoadingMessage();
        if (res.ok) {
            showAlertModal('Division restored.', 'success', 'Success');
            await loadDivisions();
            showDivisionsTab('archived');
        } else {
            const err = await res.json().catch(() => ({}));
            showAlertModal(err.message || 'Failed to restore.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        showAlertModal('Error restoring division.', 'error', 'Error');
    }
}

function copyDivision(divisionId) {
    const division = divisions.find(d => d._id === divisionId || d.id === divisionId);
    if (!division) {
        showAlertModal('Division not found.', 'error', 'Error');
        return;
    }
    currentDivisionId = null;
    const weekPlayDatesSection = document.getElementById('weekPlayDatesSection');
    if (weekPlayDatesSection) weekPlayDatesSection.style.display = 'none';
    document.getElementById('addDivisionModalTitle').textContent = 'Copy Division (Create New)';
    const saveBtn = document.getElementById('saveDivisionBtn');
    if (saveBtn) {
        saveBtn.textContent = 'Create Division';
        saveBtn.setAttribute('onclick', 'addDivision()');
        saveBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Create Division';
    }
    const copySuffix = ' (Copy)';
    document.getElementById('isDoublePlay').checked = !!division.isDoublePlay;
    toggleDoublePlayOptions();
    if (division.isDoublePlay) {
        let fn = division.firstDivisionName || '', fg = division.firstDivisionGameType || '';
        let sn = division.secondDivisionName || '', sg = division.secondDivisionGameType || '';
        if (!fn && division.name && division.name.includes(' / ')) {
            const parts = division.name.split(' / ');
            if (parts[0] && parts[0].includes(' - ')) {
                const i = parts[0].indexOf(' - ');
                fn = parts[0].substring(0, i).trim();
                fg = parts[0].substring(i + 3).trim();
            }
            if (parts[1] && parts[1].includes(' - ')) {
                const i = parts[1].indexOf(' - ');
                sn = parts[1].substring(0, i).trim();
                sg = parts[1].substring(i + 3).trim();
            }
        }
        const fel = document.getElementById('firstDivisionName');
        const fgel = document.getElementById('firstDivisionGameType');
        const sel = document.getElementById('secondDivisionName');
        const sgel = document.getElementById('secondDivisionGameType') || document.getElementById('secondGameType');
        if (fel) fel.value = (fn || '') + (fn && !fn.includes(copySuffix) ? copySuffix : '');
        if (fgel) fgel.value = fg;
        if (sel) sel.value = (sn || '') + (sn && !sn.includes(copySuffix) ? copySuffix : '');
        if (sgel) sgel.value = sg;
        if (division.firstMatchesPerWeek != null) document.getElementById('firstMatchesPerWeek').value = String(division.firstMatchesPerWeek);
        if (division.secondMatchesPerWeek != null) document.getElementById('secondMatchesPerWeek').value = String(division.secondMatchesPerWeek);
    } else {
        const baseName = division.name || '';
        document.getElementById('divisionName').value = baseName + (baseName.includes(copySuffix) ? '' : copySuffix);
        if (division.gameType) document.getElementById('gameType').value = division.gameType;
    }
    if (division.matchesPerWeek != null) document.getElementById('matchesPerWeek').value = String(division.matchesPerWeek);
    const duesEl = document.getElementById('divisionWeeklyDues') || document.getElementById('duesPerPlayerPerMatch');
    if (duesEl && division.duesPerPlayerPerMatch != null) duesEl.value = String(division.duesPerPlayerPerMatch);
    if (division.playersPerWeek != null) document.getElementById('playersPerWeek').value = String(division.playersPerWeek);
    if (division.totalWeeks != null) document.getElementById('totalWeeks').value = String(division.totalWeeks);
    // Copy creates a new division - 0 teams until created
    const currentTeamsEl = document.getElementById('divisionCurrentTeamsCount');
    if (currentTeamsEl) currentTeamsEl.textContent = '0';
    (async () => {
        const cap = await getTeamsPerDivisionFromPlan();
        const capEl = document.getElementById('divisionTeamCapacityDisplay');
        if (capEl) capEl.textContent = cap === 0 ? 'Unlimited' : cap.toString();
    })();
    if (division.startDate) document.getElementById('divisionStartDate').value = (division.startDate || '').split('T')[0];
    if (division.endDate) document.getElementById('divisionEndDate').value = (division.endDate || '').split('T')[0];
    if (division.isDoublePlay) {
        updateGameTypeOptions();
    }
    if (division.color) {
        const colorInput = document.getElementById('divisionColor');
        if (colorInput) colorInput.value = division.color;
    }
    var pfName = document.getElementById('divisionPrizeFundName');
    if (division.prizeFundName && pfName) pfName.value = division.prizeFundName;
    var pfPct = document.getElementById('divisionPrizeFundPercentage');
    if (division.prizeFundPercentage != null && pfPct) pfPct.value = String(division.prizeFundPercentage);
    var pfAmt = document.getElementById('divisionPrizeFundAmount');
    if (division.prizeFundAmount != null && pfAmt) pfAmt.value = String(division.prizeFundAmount);
    if (typeof resetDivisionFinancialLockState === 'function') resetDivisionFinancialLockState();
    bootstrap.Modal.getInstance(document.getElementById('divisionManagementModal'))?.hide();
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
}
if (typeof window !== 'undefined') {
    window.archiveDivision = archiveDivision;
    window.restoreDivision = restoreDivision;
    window.copyDivision = copyDivision;
}

async function deleteDivision(divisionId) {
    const division = divisions.find(d => d._id === divisionId || d.id === divisionId);
    if (!division) {
        showAlertModal('Division not found.', 'error', 'Error');
        return;
    }
    
    // Get modal elements
    const modalEl = document.getElementById('deleteConfirmModal');
    const messageEl = document.getElementById('deleteConfirmMessage');
    const headerEl = document.getElementById('deleteConfirmModalHeader');
    const titleEl = document.getElementById('deleteConfirmModalTitle');
    const footerEl = document.getElementById('deleteConfirmModalFooter');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (!modalEl || !messageEl || !confirmBtn) {
        showAlertModal('Delete confirmation modal not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    // Set up confirmation message
    messageEl.textContent = `Are you sure you want to delete the division "${division.name}"? This action cannot be undone.`;
    
    // Reset modal to initial state
    headerEl.className = 'modal-header bg-danger text-white';
    titleEl.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Confirm Deletion';
    footerEl.style.display = '';
    
    // Remove any existing event listeners by cloning the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Set up confirmation button handler
    newConfirmBtn.addEventListener('click', async () => {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        try {
            showLoadingMessage('Deleting division...');
            
            const response = await apiCall(`/divisions/${divisionId}`, {
                method: 'DELETE'
            });
            
            hideLoadingMessage();
            
            if (response.ok) {
                showAlertModal(`Division "${division.name}" deleted successfully!`, 'success', 'Success');
                
                // Reload data
                await loadDivisions();
                displayDivisions(divisionsTableSortColumn, divisionsTableSortDir, divisionsTableShowArchived);
            } else {
                const error = await response.json().catch(() => ({ message: 'Error deleting division' }));
                showAlertModal(error.message || 'Failed to delete division.', 'error', 'Error');
            }
        } catch (error) {
            hideLoadingMessage();
            console.error('Error deleting division:', error);
            showAlertModal(error.message || 'Failed to delete division. Please try again.', 'error', 'Error');
        }
    });
    
    // Show modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// Utility functions
// Format date from ISO string without timezone conversion (extracts YYYY-MM-DD and formats it)
