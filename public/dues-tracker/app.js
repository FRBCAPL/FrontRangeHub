// Configuration
// Use local backend for development, production backend for deployed app
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001/api' 
  : 'https://dues-tracker-backend.onrender.com/api';

// Global variables
let authToken = localStorage.getItem('authToken');
let currentTeamId = null;
let divisions = [];
let filteredTeams = [];
let currentDivisionId = null;
let currentWeek = 1;
let currentWeeklyPaymentTeamId = null;
let currentWeeklyPaymentWeek = 1;

// Function to get division color class
function getDivisionClass(divisionName) {
    const name = divisionName.toLowerCase();
    if (name.includes('nay nay')) return 'division-nay-nay';
    if (name.includes('3310')) return 'division-3310';
    if (name.includes('tuesday')) return 'division-tuesday';
    if (name.includes('wednesday')) return 'division-wednesday';
    if (name.includes('thursday')) return 'division-thursday';
    if (name.includes('friday')) return 'division-friday';
    if (name.includes('saturday')) return 'division-saturday';
    if (name.includes('sunday')) return 'division-sunday';
    return 'division-default';
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (authToken) {
        showMainApp();
        
        // Force container width after page loads
        setTimeout(() => {
            const containers = document.querySelectorAll('.container-fluid');
            containers.forEach(container => {
                container.style.maxWidth = '2500px';
                container.style.width = '100%';
            });
            console.log('Forced container width to 2500px');
        }, 1000);
        loadData();
    } else {
        showLoginScreen();
    }
    
    // Force week dropdown to open downward
    const weekFilter = document.getElementById('weekFilter');
    if (weekFilter) {
        weekFilter.addEventListener('focus', function() {
            this.style.position = 'relative';
            this.style.zIndex = '9999';
        });
    }
});

// Authentication functions
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    showLoginScreen();
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            showMainApp();
            loadData();
            errorDiv.classList.add('hidden');
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please check if the server is running.';
        errorDiv.classList.remove('hidden');
    }
});

// API helper function
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // Add authentication token if available
    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Debug logging for API calls
    console.log(`API Call: ${endpoint}`, {
        method: options.method || 'GET',
        hasAuth: !!authToken,
        headers: defaultOptions.headers
    });
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    });
    
    // If unauthorized, redirect to login
    if (response.status === 401) {
        logout();
        return response;
    }
    
    return response;
}

// Data loading functions
async function loadData() {
    try {
        await Promise.all([
            loadDivisions(),
            loadTeams(),
            loadSummary()
        ]);
        
        // Calculate financial breakdown after all data is loaded
        calculateFinancialBreakdown();
    } catch (error) {
        console.error('Error loading data:', error);
        // Don't show alert, just log the error and continue with empty data
        console.log('Continuing with empty data...');
        
        // Initialize with empty data
        divisions = [];
        teams = [];
        filteredTeams = [];
        
        // Update UI with empty state
        updateDivisionDropdown();
        displayTeams([]);
        calculateAndDisplaySmartSummary();
    }
}

async function loadDivisions() {
    try {
        const response = await apiCall('/divisions');
        divisions = await response.json();
        console.log('Loaded divisions:', divisions);
        updateDivisionDropdown();
        updateDivisionFilter();
        // Wait a bit for DOM to be ready, then hide week dropdown initially
        setTimeout(() => {
            updateWeekDropdownWithDates(null);
        }, 100);
    } catch (error) {
        console.error('Error loading divisions:', error);
    }
}

async function loadTeams() {
    try {
        const response = await apiCall('/teams');
        const teamsData = await response.json();
        teams = teamsData; // Store globally
        filteredTeams = teamsData; // Initialize filtered teams
        displayTeams(teamsData);
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

async function loadSummary() {
    try {
        const response = await apiCall('/summary');
        const summary = await response.json();
        displaySummary(summary);
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

function getBCAStatusDisplay(team) {
    if (!team.teamMembers || team.teamMembers.length === 0) {
        return '<span class="badge bg-secondary">No Players</span>';
    }
    
    let paidCount = 0;
    let previouslyCount = 0;
    let totalCount = team.teamMembers.length;
    
    team.teamMembers.forEach(member => {
        if (member.bcaSanctionPaid) {
            paidCount++;
        } else if (member.previouslySanctioned) {
            previouslyCount++;
        }
    });
    
    const pendingCount = totalCount - paidCount - previouslyCount;
    
    if (pendingCount === 0 && paidCount > 0) {
        return '<span class="badge bg-success"><i class="fas fa-check"></i> All Current</span>';
    } else if (pendingCount === totalCount) {
        return '<span class="badge bg-danger"><i class="fas fa-times"></i> All Pending</span>';
    } else if (pendingCount > 0) {
        return `<span class="badge bg-warning"><i class="fas fa-clock"></i> ${pendingCount} Pending</span>`;
    } else {
        return '<span class="badge bg-info"><i class="fas fa-history"></i> All Set</span>';
    }
}

function displayTeams(teams) {
    const tbody = document.getElementById('teamsTable');
    const teamCount = document.getElementById('teamCount');
    tbody.innerHTML = '';
    
    // Update team count badge
    teamCount.textContent = `${teams.length} Team${teams.length !== 1 ? 's' : ''}`;
    
    // Update smart summary
    calculateAndDisplaySmartSummary();
    
    // Update financial breakdown
    calculateFinancialBreakdown();
    
    teams.forEach(team => {
        const duesRate = team.divisionDuesRate;
        const playerCount = team.playerCount || team.teamMembers?.length || 0;
        const numberOfTeams = team.numberOfTeams || 1;
        const totalWeeks = team.totalWeeks || 1;
        
        // Check weekly payment status for current week
        const weeklyPayment = team.weeklyPayments?.find(p => p.week === currentWeek);
        const weeklyPaid = weeklyPayment?.paid === 'true';
        const weeklyBye = weeklyPayment?.paid === 'bye';
        const weeklyMakeup = weeklyPayment?.paid === 'makeup';
        const weeklyPaymentDate = weeklyPayment?.paymentDate;
        const weeklyPaymentMethod = weeklyPayment?.paymentMethod || '';
        
        // Find the team's division to get its start date (not the filter selection)
        const teamDivision = divisions.find(d => d.name === team.division);
        
        // Calculate weekly dues amount for THIS SPECIFIC TEAM
        // 5 PLAYERS × dues rate per player × 1 week
        // For double play: multiply by 2 (they play both 8-ball and 10-ball)
        const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
        const weeklyDuesAmount = (duesRate * 5 * doublePlayMultiplier);
        let actualCurrentWeek = 1;
        
        if (teamDivision && teamDivision.startDate) {
            // Calculate what week we actually are based on today's date
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            const today = new Date();
            
            // Calculate weeks since start date
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            actualCurrentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
            
            // Calculate grace period - teams have 3 days after week ends before being considered late
            const daysIntoCurrentWeek = daysDiff % 7;
            const gracePeriodDays = 3;
            
            // If we're still within the grace period of the current week, don't consider them late yet
            if (daysIntoCurrentWeek <= gracePeriodDays) {
                actualCurrentWeek = Math.max(1, actualCurrentWeek - 1);
            }
        }
        
        // Check if team is current (paid up to the actual current week, not selected week)
        let isCurrent = true;
        let amountOwed = 0;
        
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            
            if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
                isCurrent = false;
                // Calculate weekly dues for this missed week
                // 5 PLAYERS × dues rate per player
                // For double play: multiply by 2 (they play both 8-ball and 10-ball)
                const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
                const weeklyDues = duesRate * 5 * doublePlayMultiplier; // 5 players × dues rate per player × double play multiplier
                amountOwed += weeklyDues;
            } else if (weekPayment.paid === 'makeup') {
                // Makeup matches still owe dues
                isCurrent = false;
                const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
                const weeklyDues = duesRate * 5 * doublePlayMultiplier;
                amountOwed += weeklyDues;
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${team.teamName}</strong></td>
            <td><span class="division-badge ${getDivisionClass(team.division)}">${team.division}</span></td>
            <td>${team.captainName}</td>
            <td>
                <span class="badge bg-info">${playerCount} players</span>
            </td>
            <td>
                ${getBCAStatusDisplay(team)}
            </td>
            <td><strong>$${isCurrent ? weeklyDuesAmount : amountOwed}</strong></td>
            <td>
                <span class="status-${isCurrent ? 'paid' : 'unpaid'}">
                    <i class="fas fa-${isCurrent ? 'check-circle' : 'times-circle'} me-1"></i>
                    ${isCurrent ? 'Current' : `Owes $${amountOwed}`}
                </span>
            </td>
            <td>${weeklyPaid && weeklyPaymentDate ? new Date(weeklyPaymentDate).toLocaleDateString() : '-'}</td>
            <td>
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="badge bg-${weeklyPaid ? 'success' : weeklyBye ? 'info' : weeklyMakeup ? 'warning' : 'danger'}">
                        <i class="fas fa-${weeklyPaid ? 'check' : weeklyBye ? 'pause' : weeklyMakeup ? 'clock' : 'times'} me-1"></i>
                        ${weeklyPaid ? 'Paid' : weeklyBye ? 'Bye Week' : weeklyMakeup ? 'Make Up' : 'Unpaid'}
                    </span>
                    ${weeklyPaymentMethod ? `<small class="text-muted">${weeklyPaymentMethod}</small>` : ''}
                    <button class="btn btn-outline-primary btn-sm" onclick="showWeeklyPaymentModal('${team._id}')">
                        <i class="fas fa-calendar-week"></i>
                    </button>
                </div>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-success btn-sm" onclick="showPaymentHistory('${team._id}')" title="Payment History">
                        <i class="fas fa-dollar-sign"></i>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="editTeam('${team._id}')" title="Edit Team">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTeam('${team._id}')" title="Delete Team">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function displaySummary(summary) {
    // Calculate smart summary based on current teams and their status
    calculateAndDisplaySmartSummary();
    
    // Update division breakdown
    const divisionA = summary.divisionBreakdown.find(d => d._id === 'A Division');
    const divisionB = summary.divisionBreakdown.find(d => d._id === 'B Division');
    
    if (divisionA) {
        document.getElementById('divisionATotal').textContent = divisionA.count;
        document.getElementById('divisionAPaid').textContent = divisionA.paid;
        document.getElementById('divisionAAmount').textContent = divisionA.total;
    }
    
    if (divisionB) {
        document.getElementById('divisionBTotal').textContent = divisionB.count;
        document.getElementById('divisionBPaid').textContent = divisionB.paid;
        document.getElementById('divisionBAmount').textContent = divisionB.total;
    }
}

function calculateAndDisplaySmartSummary() {
    if (!teams || teams.length === 0) {
        document.getElementById('totalTeams').textContent = '0';
        document.getElementById('unpaidTeams').textContent = '0';
        document.getElementById('totalCollected').textContent = '$0';
        return;
    }
    
    let totalTeams = teams.length;
    let teamsBehind = 0;
    let totalCollected = 0;
    
    teams.forEach(team => {
        // Find team's division for date calculations
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) return;
        
        // Calculate actual current week for this team's division
        let actualCurrentWeek = 1;
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            const today = new Date();
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            actualCurrentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
            
            // Grace period: teams have 3 days after week ends before being considered late
            const daysIntoCurrentWeek = daysDiff % 7;
            const gracePeriodDays = 3;
            if (daysIntoCurrentWeek <= gracePeriodDays) {
                actualCurrentWeek = Math.max(1, actualCurrentWeek - 1);
            }
        }
        
        // Check if team is behind (not current)
        let isCurrent = true;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
                isCurrent = false;
                break;
            }
        }
        
        if (!isCurrent) {
            teamsBehind++;
        }
        
        // Calculate total collected from all weekly payments (excluding BCA sanction fees)
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                if (payment.paid === 'true' && payment.amount) {
                    // Calculate BCA sanction amount to subtract
                    let bcaSanctionAmount = 0;
                    if (payment.bcaSanctionPlayers && payment.bcaSanctionPlayers.length > 0) {
                        // New format: specific players
                        bcaSanctionAmount = payment.bcaSanctionPlayers.length * 25;
                        console.log(`Team ${team.teamName}: Subtracting ${bcaSanctionAmount} from ${payment.amount} (new format)`);
                    } else if (payment.bcaSanctionFee) {
                        // Old format: single boolean
                        bcaSanctionAmount = 25;
                        console.log(`Team ${team.teamName}: Subtracting ${bcaSanctionAmount} from ${payment.amount} (old format)`);
                    } else {
                        console.log(`Team ${team.teamName}: No BCA sanction fees, adding full ${payment.amount}`);
                    }
                    
                    totalCollected += (payment.amount - bcaSanctionAmount);
                } else if (payment.paid === 'bye') {
                    console.log(`Team ${team.teamName}: Bye week - no dues required`);
                }
            });
        }
    });
    
    // Update the summary cards
    document.getElementById('totalTeams').textContent = totalTeams;
    document.getElementById('unpaidTeams').textContent = teamsBehind;
    document.getElementById('totalCollected').textContent = `$${totalCollected}`;
}

// Team management functions
function showAddTeamModal() {
    // Reset for adding new team
    currentTeamId = null;
    
    // Reset modal title and button
    document.getElementById('addTeamModal').querySelector('.modal-title').textContent = 'Add New Team';
    document.getElementById('addTeamModal').querySelector('.modal-footer .btn-primary').textContent = 'Add Team';
    document.getElementById('addTeamModal').querySelector('.modal-footer .btn-primary').setAttribute('onclick', 'addTeam()');
    
    // Reset form
    document.getElementById('addTeamForm').reset();
    
    // Clear team members and add one empty row
    const membersContainer = document.getElementById('teamMembersContainer');
    membersContainer.innerHTML = '';
    addTeamMember();
    
    // Update captain dropdown
    updateCaptainDropdown();
    
    // Show modal
    new bootstrap.Modal(document.getElementById('addTeamModal')).show();
}

function addTeamMember(name = '', email = '', bcaSanctionPaid = false, bcaPreviouslySanctioned = false, index = null) {
    const container = document.getElementById('teamMembersContainer');
    const newMemberRow = document.createElement('div');
    newMemberRow.className = 'row mb-2 member-row';
    newMemberRow.innerHTML = `
        <div class="col-md-3">
            <input type="text" class="form-control" placeholder="Player name" name="memberName" value="${name}" oninput="updateDuesCalculation(); updateCaptainDropdown()">
        </div>
        <div class="col-md-3">
            <input type="email" class="form-control" placeholder="Email (optional)" name="memberEmail" value="${email}">
        </div>
        <div class="col-md-3">
            <div class="bca-status-container">
                <label class="form-label small text-muted mb-1">BCA Status</label>
                <div class="btn-group w-100" role="group">
                    <input type="radio" class="btn-check" name="bcaSanctionPaid" id="bcaPending_${index || Date.now()}" value="false" ${!bcaSanctionPaid && !bcaPreviouslySanctioned ? 'checked' : ''}>
                    <label class="btn btn-outline-warning btn-sm" for="bcaPending_${index || Date.now()}">
                        <i class="fas fa-clock"></i> Pending
                    </label>
                    
                    <input type="radio" class="btn-check" name="bcaSanctionPaid" id="bcaPaid_${index || Date.now()}" value="true" ${bcaSanctionPaid ? 'checked' : ''}>
                    <label class="btn btn-outline-success btn-sm" for="bcaPaid_${index || Date.now()}">
                        <i class="fas fa-check"></i> Paid
                    </label>
                    
                    <input type="radio" class="btn-check" name="bcaSanctionPaid" id="bcaPreviously_${index || Date.now()}" value="previously" ${bcaPreviouslySanctioned ? 'checked' : ''}>
                    <label class="btn btn-outline-info btn-sm" for="bcaPreviously_${index || Date.now()}">
                        <i class="fas fa-history"></i> Previously
                    </label>
                </div>
                <small class="text-muted">Pending/Paid = $25 fee | Previously = Already sanctioned</small>
            </div>
        </div>
        <div class="col-md-3">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeMember(this)">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div>
    `;
    container.appendChild(newMemberRow);
    updateDuesCalculation();
}

function removeMember(button) {
    button.closest('.member-row').remove();
    updateDuesCalculation();
    updateCaptainDropdown();
}

function updateCaptainDropdown() {
    const captainSelect = document.getElementById('captainName');
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    
    // Store current selection
    const currentSelection = captainSelect.value;
    
    // Clear existing options except the first one
    captainSelect.innerHTML = '<option value="">Select Captain</option>';
    
    // Add options for each team member
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const memberName = nameInput.value.trim();
        
        if (memberName) {
            const option = document.createElement('option');
            option.value = memberName;
            option.textContent = memberName;
            captainSelect.appendChild(option);
        }
    });
    
    // Restore selection if it still exists
    if (currentSelection && Array.from(captainSelect.options).some(option => option.value === currentSelection)) {
        captainSelect.value = currentSelection;
    }
}

function updateDuesCalculation() {
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    let playerCount = 0;
    
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        if (nameInput && nameInput.value.trim()) {
            playerCount++;
        }
    });
    
    const divisionName = document.getElementById('division').value;
    const division = divisions.find(d => d.name === divisionName);
    const calculationDiv = document.getElementById('duesCalculation');
    
    if (playerCount > 0 && division) {
        const matchesPerWeek = division.isDoublePlay ? 10 : 5;
        const totalDues = playerCount * division.duesPerPlayerPerMatch * matchesPerWeek * division.totalWeeks;
        const playType = division.isDoublePlay ? 'Double Play (10 matches/week)' : 'Regular (5 matches/week)';
        calculationDiv.innerHTML = `
            <div class="alert alert-success">
                <small><strong>Total Dues:</strong> $${division.duesPerPlayerPerMatch} × ${playerCount} players × ${matchesPerWeek} matches × ${division.totalWeeks} weeks = <strong>$${totalDues}</strong><br>
                <strong>Division Type:</strong> ${playType}</small>
            </div>
        `;
    } else if (division) {
        calculationDiv.innerHTML = `
            <small class="text-muted">Total dues will be calculated automatically based on number of players</small>
        `;
    } else {
        calculationDiv.innerHTML = `
            <small class="text-muted">Please select a division first</small>
        `;
    }
}

async function addTeam() {
    const teamData = {
        teamName: document.getElementById('teamName').value,
        division: document.getElementById('division').value,
        teamMembers: []
    };
    
    // Add captain as first member
    const captainName = document.getElementById('captainName').value;
    const captainEmail = document.getElementById('captainEmail').value;
    const captainPhone = document.getElementById('captainPhone').value;
    if (captainName.trim()) {
        teamData.teamMembers.push({ 
            name: captainName.trim(), 
            email: captainEmail.trim(),
            phone: captainPhone.trim()
        });
    }
    
    // Collect additional team members
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const emailInput = row.querySelector('input[name="memberEmail"]');
        const bcaSanctionRadio = row.querySelector('input[name="bcaSanctionPaid"]:checked');
        
        if (nameInput && nameInput.value.trim()) {
            const bcaValue = bcaSanctionRadio ? bcaSanctionRadio.value : 'false';
            teamData.teamMembers.push({
                name: nameInput.value.trim(),
                email: emailInput ? emailInput.value.trim() : '',
                bcaSanctionPaid: bcaValue === 'true',
                previouslySanctioned: bcaValue === 'previously'
            });
        }
    });
    
    try {
        const response = await apiCall('/teams', {
            method: 'POST',
            body: JSON.stringify(teamData)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            loadData();
            alert('Team added successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error adding team');
        }
    } catch (error) {
        alert('Error adding team. Please try again.');
    }
}

function showPaymentModal(teamId) {
    currentTeamId = teamId;
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentMethod').value = 'Cash';
    
    // Find the team to get division info
    const team = teams.find(t => t._id === teamId);
    if (team) {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (teamDivision) {
            populatePaymentAmountDropdown(team, teamDivision);
        }
    }
    
    new bootstrap.Modal(document.getElementById('paymentModal')).show();
}

function populatePaymentAmountDropdown(team, teamDivision) {
    const paymentAmountSelect = document.getElementById('paymentAmount');
    paymentAmountSelect.innerHTML = '<option value="">Select Amount</option>';
    
    // Use individual player dues rate (not team amount)
    const individualDuesRate = team.divisionDuesRate;
    
    // Add options for multiples of individual dues (1x, 2x, 3x, etc.)
    for (let multiplier = 1; multiplier <= 20; multiplier++) {
        const amount = individualDuesRate * multiplier;
        const option = document.createElement('option');
        option.value = amount;
        option.textContent = `$${amount}`;
        paymentAmountSelect.appendChild(option);
    }
}

function updatePaymentAmount() {
    const selectedAmount = document.getElementById('paymentAmount').value;
    // You can add any additional logic here if needed
}

async function recordPayment() {
    const paymentData = {
        paymentMethod: document.getElementById('paymentMethod').value,
        amount: document.getElementById('paymentAmount').value,
        notes: document.getElementById('paymentNotes').value
    };
    
    try {
        const response = await apiCall(`/teams/${currentTeamId}/pay-dues`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
            
            // Preserve current division filter before reloading data
            const currentDivisionFilter = document.getElementById('divisionFilter').value;
            
            loadData().then(() => {
                // Restore the division filter after data is reloaded
                if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                    document.getElementById('divisionFilter').value = currentDivisionFilter;
                    filterTeamsByDivision();
                }
            });
            
            alert('Payment recorded successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error recording payment');
        }
    } catch (error) {
        alert('Error recording payment. Please try again.');
    }
}

async function markUnpaid(teamId) {
    if (!confirm('Are you sure you want to mark this team as unpaid?')) {
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({
                duesPaid: false,
                paymentDate: null,
                paymentMethod: '',
                notes: ''
            })
        });
        
        if (response.ok) {
            loadData();
            alert('Team marked as unpaid');
        } else {
            alert('Error updating team status');
        }
    } catch (error) {
        alert('Error updating team status. Please try again.');
    }
}

async function editTeam(teamId) {
    // Find the team to edit
    const team = teams.find(t => t._id === teamId);
    if (!team) return;
    
    // Set the current team ID for editing
    currentTeamId = teamId;
    
    // Update modal title and button
    document.getElementById('addTeamModal').querySelector('.modal-title').textContent = 'Edit Team';
    document.getElementById('addTeamModal').querySelector('.modal-footer .btn-primary').textContent = 'Update Team';
    document.getElementById('addTeamModal').querySelector('.modal-footer .btn-primary').setAttribute('onclick', 'updateTeam()');
    
    // Populate form with team data
    document.getElementById('teamName').value = team.teamName;
    document.getElementById('division').value = team.division;
    document.getElementById('captainEmail').value = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].email : '';
    document.getElementById('captainPhone').value = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].phone || '' : '';
    
    // Populate team members
    const membersContainer = document.getElementById('teamMembersContainer');
    membersContainer.innerHTML = '';
    
    if (team.teamMembers && team.teamMembers.length > 1) {
        // Add additional members (skip first one as it's the captain)
        team.teamMembers.slice(1).forEach((member, index) => {
            addTeamMember(member.name, member.email, member.bcaSanctionPaid, member.previouslySanctioned, index);
        });
    } else {
        // Add at least one empty member field
        addTeamMember();
    }
    
    // Update dues calculation and captain dropdown
    updateDuesCalculation();
    updateCaptainDropdown();
    
    // Set the captain selection after dropdown is populated
    setTimeout(() => {
        const captainName = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : '';
        if (captainName) {
            document.getElementById('captainName').value = captainName;
        }
    }, 100);
    
    // Show the modal
    new bootstrap.Modal(document.getElementById('addTeamModal')).show();
}

async function updateTeam() {
    const teamData = {
        teamName: document.getElementById('teamName').value,
        division: document.getElementById('division').value,
        teamMembers: []
    };
    
    // Add captain as first member
    const captainName = document.getElementById('captainName').value;
    const captainEmail = document.getElementById('captainEmail').value;
    const captainPhone = document.getElementById('captainPhone').value;
    if (captainName.trim()) {
        teamData.teamMembers.push({ 
            name: captainName.trim(), 
            email: captainEmail.trim(),
            phone: captainPhone.trim()
        });
    }
    
    // Collect additional team members
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const emailInput = row.querySelector('input[name="memberEmail"]');
        const bcaSanctionRadio = row.querySelector('input[name="bcaSanctionPaid"]:checked');
        
        if (nameInput && nameInput.value.trim()) {
            const bcaValue = bcaSanctionRadio ? bcaSanctionRadio.value : 'false';
            teamData.teamMembers.push({ 
                name: nameInput.value.trim(), 
                email: emailInput ? emailInput.value.trim() : '',
                bcaSanctionPaid: bcaValue === 'true',
                previouslySanctioned: bcaValue === 'previously'
            });
        }
    });
    
    // Calculate player count
    teamData.playerCount = teamData.teamMembers.length;
    
    // Get division details for dues calculation
    const selectedDivision = divisions.find(d => d.name === teamData.division);
    if (selectedDivision) {
        teamData.divisionDuesRate = selectedDivision.duesPerPlayerPerMatch;
        teamData.numberOfTeams = selectedDivision.numberOfTeams;
        teamData.totalWeeks = selectedDivision.totalWeeks;
        teamData.isDoublePlay = selectedDivision.isDoublePlay;
        
        // Calculate dues amount
        const matchesPerWeek = teamData.isDoublePlay ? 10 : 5;
        teamData.duesAmount = teamData.divisionDuesRate * teamData.playerCount * matchesPerWeek * teamData.totalWeeks;
    }
    
    try {
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamData)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            loadData();
            alert('Team updated successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating team');
        }
    } catch (error) {
        alert('Error updating team. Please try again.');
    }
}

async function deleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadData();
            alert('Team deleted successfully!');
        } else {
            alert('Error deleting team');
        }
    } catch (error) {
        alert('Error deleting team. Please try again.');
    }
}

function refreshData() {
    loadData();
}

// Division management functions
function updateDivisionDropdown() {
    const divisionSelect = document.getElementById('division');
    divisionSelect.innerHTML = '<option value="">Select Division</option>';
    
    divisions.forEach(division => {
        if (division.isActive) {
            const option = document.createElement('option');
            option.value = division.name;
            const playType = division.isDoublePlay ? 'Double Play' : 'Regular';
            option.textContent = `${division.name} ($${division.duesPerPlayerPerMatch}/player/match, ${playType}, ${division.currentTeams}/${division.numberOfTeams} teams)`;
            divisionSelect.appendChild(option);
        }
    });
}

function showDivisionManagement() {
    loadDivisions();
    displayDivisions();
    new bootstrap.Modal(document.getElementById('divisionManagementModal')).show();
}

function displayDivisions() {
    const tbody = document.getElementById('divisionsTable');
    tbody.innerHTML = '';
    
    divisions.forEach(division => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${division.name}</strong></td>
            <td>$${division.duesPerPlayerPerMatch}</td>
            <td><span class="badge ${division.isDoublePlay ? 'bg-warning' : 'bg-info'}">${division.isDoublePlay ? 'Double Play' : 'Regular'}</span></td>
            <td>${division.numberOfTeams}</td>
            <td>${division.totalWeeks}</td>
            <td><span class="badge ${division.currentTeams >= division.numberOfTeams ? 'bg-danger' : 'bg-success'}">${division.currentTeams}</span></td>
            <td><span class="badge ${division.isActive ? 'bg-success' : 'bg-secondary'}">${division.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editDivision('${division._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteDivision('${division._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function toggleDoublePlayOptions() {
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    const doublePlayOptions = document.getElementById('doublePlayOptions');
    const doublePlayDivisionName = document.getElementById('doublePlayDivisionName');
    const firstGameType = document.getElementById('firstGameType');
    const secondGameType = document.getElementById('secondGameType');
    
    if (isDoublePlay) {
        doublePlayOptions.style.display = 'block';
        doublePlayDivisionName.required = true;
        firstGameType.required = true;
        secondGameType.required = true;
        updateGameTypeOptions(); // Initialize the options
    } else {
        doublePlayOptions.style.display = 'none';
        doublePlayDivisionName.required = false;
        firstGameType.required = false;
        secondGameType.required = false;
        doublePlayDivisionName.value = '';
        firstGameType.value = '';
        secondGameType.value = '';
    }
}

function updateGameTypeOptions() {
    const firstGameType = document.getElementById('firstGameType');
    const secondGameType = document.getElementById('secondGameType');
    const firstValue = firstGameType.value;
    const secondValue = secondGameType.value;
    
    // Reset both dropdowns to show all options
    const allOptions = ['8-ball', '9-ball', '10-ball'];
    
    // Update first dropdown options
    firstGameType.innerHTML = '<option value="">Select Game Type</option>';
    allOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (option === secondValue && firstValue !== option) {
            optionElement.disabled = true;
        }
        firstGameType.appendChild(optionElement);
    });
    if (firstValue) firstGameType.value = firstValue;
    
    // Update second dropdown options
    secondGameType.innerHTML = '<option value="">Select Game Type</option>';
    allOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (option === firstValue && secondValue !== option) {
            optionElement.disabled = true;
        }
        secondGameType.appendChild(optionElement);
    });
    if (secondValue) secondGameType.value = secondValue;
}

function showAddDivisionModal() {
    currentDivisionId = null;
    document.getElementById('divisionModalTitle').textContent = 'Add New Division';
    document.getElementById('divisionSubmitBtn').textContent = 'Create Division';
    document.getElementById('divisionSubmitBtn').setAttribute('onclick', 'addDivision()');
    document.getElementById('addDivisionForm').reset();
    document.getElementById('doublePlayOptions').style.display = 'none';
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
}

function editDivision(divisionId) {
    const division = divisions.find(d => d._id === divisionId);
    if (!division) return;
    
    currentDivisionId = divisionId;
    document.getElementById('divisionModalTitle').textContent = 'Edit Division';
    document.getElementById('divisionSubmitBtn').textContent = 'Update Division';
    document.getElementById('divisionSubmitBtn').setAttribute('onclick', 'updateDivision()');
    
    // Populate form with division data
    document.getElementById('divisionName').value = division.name;
    document.getElementById('duesPerPlayerPerMatch').value = division.duesPerPlayerPerMatch.toString();
    document.getElementById('numberOfTeams').value = division.numberOfTeams.toString();
    document.getElementById('totalWeeks').value = division.totalWeeks.toString();
    document.getElementById('startDate').value = division.startDate ? new Date(division.startDate).toISOString().split('T')[0] : '';
    document.getElementById('endDate').value = division.endDate ? new Date(division.endDate).toISOString().split('T')[0] : '';
    
    // Show day of the week if start date exists
    if (division.startDate) {
        const start = new Date(division.startDate);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[start.getDay()];
        document.getElementById('startDayName').textContent = dayName;
        document.getElementById('startDateDay').style.display = 'block';
    }
    document.getElementById('isDoublePlay').checked = division.isDoublePlay || false;
    document.getElementById('divisionDescription').value = division.description || '';
    
    // Handle double play options for editing
    if (division.isDoublePlay) {
        document.getElementById('doublePlayOptions').style.display = 'block';
        // Try to parse the division name to extract components
        // Format: "Division Name - Game Type 1 & Game Type 2"
        const dashIndex = division.name.indexOf(' - ');
        if (dashIndex > -1) {
            const divisionName = division.name.substring(0, dashIndex);
            const gameTypes = division.name.substring(dashIndex + 3);
            document.getElementById('doublePlayDivisionName').value = divisionName;
            
            const gameParts = gameTypes.split(' & ');
            if (gameParts.length === 2) {
                document.getElementById('firstGameType').value = gameParts[0];
                document.getElementById('secondGameType').value = gameParts[1];
            }
        }
    } else {
        document.getElementById('doublePlayOptions').style.display = 'none';
    }
    
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
}

async function addDivision() {
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    let divisionName = document.getElementById('divisionName').value;
    
    // Format division name for double play
    if (isDoublePlay) {
        const doublePlayDivisionName = document.getElementById('doublePlayDivisionName').value;
        const firstGameType = document.getElementById('firstGameType').value;
        const secondGameType = document.getElementById('secondGameType').value;
        if (doublePlayDivisionName && firstGameType && secondGameType) {
            divisionName = `${doublePlayDivisionName} - ${firstGameType} & ${secondGameType}`;
        }
    }
    
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: parseFloat(document.getElementById('duesPerPlayerPerMatch').value),
        numberOfTeams: parseInt(document.getElementById('numberOfTeams').value),
        totalWeeks: parseInt(document.getElementById('totalWeeks').value),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        isDoublePlay: isDoublePlay,
        description: document.getElementById('divisionDescription').value
    };
    
    try {
        const response = await apiCall('/divisions', {
            method: 'POST',
            body: JSON.stringify(divisionData)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addDivisionModal')).hide();
            loadDivisions();
            displayDivisions();
            alert('Division created successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error creating division');
        }
    } catch (error) {
        alert('Error creating division. Please try again.');
    }
}

async function updateDivision() {
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    let divisionName = document.getElementById('divisionName').value;
    
    // Format division name for double play
    if (isDoublePlay) {
        const doublePlayDivisionName = document.getElementById('doublePlayDivisionName').value;
        const firstGameType = document.getElementById('firstGameType').value;
        const secondGameType = document.getElementById('secondGameType').value;
        if (doublePlayDivisionName && firstGameType && secondGameType) {
            divisionName = `${doublePlayDivisionName} - ${firstGameType} & ${secondGameType}`;
        }
    }
    
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: parseFloat(document.getElementById('duesPerPlayerPerMatch').value),
        numberOfTeams: parseInt(document.getElementById('numberOfTeams').value),
        totalWeeks: parseInt(document.getElementById('totalWeeks').value),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        isDoublePlay: isDoublePlay,
        description: document.getElementById('divisionDescription').value
    };
    
    try {
        const response = await apiCall(`/divisions/${currentDivisionId}`, {
            method: 'PUT',
            body: JSON.stringify(divisionData)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addDivisionModal')).hide();
            loadDivisions();
            displayDivisions();
            alert('Division updated successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating division');
        }
    } catch (error) {
        alert('Error updating division. Please try again.');
    }
}

async function deleteDivision(divisionId) {
    if (!confirm('Are you sure you want to delete this division? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await apiCall(`/divisions/${divisionId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadDivisions();
            displayDivisions();
            alert('Division deleted successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error deleting division');
        }
    } catch (error) {
        alert('Error deleting division. Please try again.');
    }
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Division filtering functions
function updateDivisionFilter() {
    const filterSelect = document.getElementById('divisionFilter');
    if (!filterSelect) return;
    
    // Clear existing options except "All Teams"
    filterSelect.innerHTML = '<option value="all">All Teams</option>';
    
    // Add division options
    divisions.forEach(division => {
        if (division.isActive) {
            const option = document.createElement('option');
            option.value = division._id;
            option.textContent = division.name;
            filterSelect.appendChild(option);
        }
    });
}

function filterTeamsByDivision() {
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect.value;
    
    if (selectedDivisionId === 'all') {
        filteredTeams = teams;
        // Hide division-specific summary
        document.getElementById('divisionSpecificSummary').style.display = 'none';
    } else {
        // Find the division name from the selected ID
        const selectedDivision = divisions.find(d => d._id === selectedDivisionId);
        if (selectedDivision) {
            filteredTeams = teams.filter(team => team.division === selectedDivision.name);
            // Show division-specific summary
            updateDivisionSpecificSummary(selectedDivision);
        } else {
            filteredTeams = teams;
            document.getElementById('divisionSpecificSummary').style.display = 'none';
        }
    }
    
    // Update week dates to match the selected division
    updateWeekDropdownWithDates(selectedDivisionId);
    
    // Update financial breakdown for the selected division
    calculateFinancialBreakdown();
    
    displayTeams(filteredTeams);
}

function updateDivisionSpecificSummary(division) {
    // Show the division-specific summary
    document.getElementById('divisionSpecificSummary').style.display = 'block';
    
    // Update title and subtitle
    document.getElementById('divisionSpecificTitle').textContent = `${division.name} - Total Collected`;
    document.getElementById('divisionSpecificSubtitle').textContent = `All payments collected for ${division.name}`;
    
    // Calculate total collected for this division
    let divisionTotalCollected = 0;
    
    // Get all teams in this division
    const divisionTeams = teams.filter(team => team.division === division.name);
    
    divisionTeams.forEach(team => {
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                if (payment.paid && payment.amount) {
                    divisionTotalCollected += payment.amount;
                }
            });
        }
    });
    
    // Update the collected amount
    document.getElementById('divisionSpecificCollected').textContent = `$${divisionTotalCollected}`;
}

function calculateFinancialBreakdown() {
    if (!teams || teams.length === 0) {
        document.getElementById('totalPrizeFund').textContent = '$0';
        document.getElementById('totalLeagueManager').textContent = '$0';
        document.getElementById('totalUSAPoolLeague').textContent = '$0';
        return;
    }
    
    // Check if a specific division is selected
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect.value;
    
    let totalPrizeFund = 0;
    let totalLeagueManager = 0;
    let totalUSAPoolLeague = 0;
    let totalBCASanctionFees = 0;
    
    // Determine which teams to process
    let teamsToProcess = teams;
    if (selectedDivisionId !== 'all') {
        const selectedDivision = divisions.find(d => d._id === selectedDivisionId);
        if (selectedDivision) {
            teamsToProcess = teams.filter(team => team.division === selectedDivision.name);
        }
    }
    
    teamsToProcess.forEach(team => {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) return;
        
        // Calculate weekly dues for this team
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const weeklyDues = team.divisionDuesRate * 5 * doublePlayMultiplier;
        
        // Process each weekly payment - use EXPECTED weekly dues amount for breakdown
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                if (payment.paid && payment.amount) {
                    // Use the expected weekly dues amount for breakdown calculation
                    const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay);
                    totalPrizeFund += breakdown.prizeFund;
                    totalLeagueManager += breakdown.leagueManager;
                    totalUSAPoolLeague += breakdown.usaPoolLeague;
                }
            });
        }
        
        // Calculate BCA sanction fees for this team
        if (team.teamMembers) {
            team.teamMembers.forEach(member => {
                if (member.bcaSanctionPaid && !member.previouslySanctioned) {
                    totalBCASanctionFees += 25; // $25 per player (only if not previously sanctioned)
                }
            });
        }
        
        // Also count BCA sanction fees from weekly payments
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                if (payment.paid === 'true') {
                    // New format: specific players
                    if (payment.bcaSanctionPlayers && payment.bcaSanctionPlayers.length > 0) {
                        totalBCASanctionFees += payment.bcaSanctionPlayers.length * 25; // $25 per player
                        console.log(`Team ${team.teamName}: Found ${payment.bcaSanctionPlayers.length} BCA sanction players: ${payment.bcaSanctionPlayers.join(', ')}`);
                    }
                    // Old format: single boolean (migration)
                    else if (payment.bcaSanctionFee) {
                        totalBCASanctionFees += 25; // $25 for old format
                        console.log(`Team ${team.teamName}: Found old format BCA sanction fee`);
                    }
                    // Special case: Check notes for BCA sanction info if no players array
                    else if (payment.notes && payment.notes.toLowerCase().includes('bca sanction')) {
                        // Try to extract player names from notes
                        const noteText = payment.notes.toLowerCase();
                        if (noteText.includes('beck') && noteText.includes('jenny')) {
                            totalBCASanctionFees += 50; // $25 × 2 players
                            console.log(`Team ${team.teamName}: Found BCA sanction info in notes: Beck and Jenny`);
                        } else if (noteText.includes('beck')) {
                            totalBCASanctionFees += 25; // $25 × 1 player
                            console.log(`Team ${team.teamName}: Found BCA sanction info in notes: Beck`);
                        } else if (noteText.includes('jenny')) {
                            totalBCASanctionFees += 25; // $25 × 1 player
                            console.log(`Team ${team.teamName}: Found BCA sanction info in notes: Jenny`);
                        }
                    }
                    // Debug: log payment structure
                    console.log(`Team ${team.teamName} Week ${payment.week} payment:`, payment);
                } else if (payment.paid === 'bye') {
                    console.log(`Team ${team.teamName} Week ${payment.week}: Bye week - no BCA sanction fees`);
                }
            });
        }
    });
    
    // Update the financial breakdown cards
    document.getElementById('totalPrizeFund').textContent = `$${totalPrizeFund.toFixed(2)}`;
    document.getElementById('totalLeagueManager').textContent = `$${totalLeagueManager.toFixed(2)}`;
    document.getElementById('totalUSAPoolLeague').textContent = `$${totalUSAPoolLeague.toFixed(2)}`;
    document.getElementById('totalBCASanctionFees').textContent = `$${totalBCASanctionFees.toFixed(2)}`;
}

function calculateDuesBreakdown(weeklyDuesAmount, isDoublePlay) {
    // Based on your specific examples:
    // $8 dues division: $40 per team per week → Prize Fund: $20, League: $12, CSI: $8
    // $10 dues division: $50 per team per week → Prize Fund: $25, League: $14, CSI: $11
    
    if (weeklyDuesAmount === 40) {
        // $8 dues division ($40 per team per week)
        return { prizeFund: 20.00, leagueManager: 12.00, usaPoolLeague: 8.00 };
    } else if (weeklyDuesAmount === 50) {
        // $10 dues division ($50 per team per week)
        return { prizeFund: 25.00, leagueManager: 14.00, usaPoolLeague: 11.00 };
    } else if (weeklyDuesAmount === 80) {
        // $8 dues double play division ($80 per team per week - 2 × $40)
        return { prizeFund: 40.00, leagueManager: 24.00, usaPoolLeague: 16.00 };
    } else if (weeklyDuesAmount === 100) {
        // $10 dues double play division ($100 per team per week - 2 × $50)
        return { prizeFund: 50.00, leagueManager: 28.00, usaPoolLeague: 22.00 };
    } else {
        // For other amounts, use proportional calculation
        // Prize Fund is always 50%, League and CSI split the remaining 50%
        const prizeFund = weeklyDuesAmount * 0.5;
        const remaining = weeklyDuesAmount * 0.5;
        
        // For single play: League gets 60% of remaining, CSI gets 40%
        // For double play: League gets 60% of remaining, CSI gets 40%
        const leagueManager = remaining * 0.6;
        const usaPoolLeague = remaining * 0.4;
        
        return { prizeFund, leagueManager, usaPoolLeague };
    }
}

// Date calculation functions
function calculateEndDate() {
    const startDateInput = document.getElementById('startDate');
    const totalWeeksInput = document.getElementById('totalWeeks');
    const endDateInput = document.getElementById('endDate');
    const startDateDay = document.getElementById('startDateDay');
    const startDayName = document.getElementById('startDayName');
    
    if (!startDateInput || !totalWeeksInput || !endDateInput) return;
    
    const startDate = startDateInput.value;
    const totalWeeks = parseInt(totalWeeksInput.value);
    
    if (startDate && totalWeeks) {
        // Parse date correctly to avoid timezone issues
        const [year, month, day] = startDate.split('-').map(Number);
        const start = new Date(year, month - 1, day); // month is 0-indexed
        const end = new Date(start);
        end.setDate(start.getDate() + (totalWeeks * 7)); // Add weeks as days
        
        endDateInput.value = end.toISOString().split('T')[0];
        
        // Show day of the week for start date
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[start.getDay()];
        startDayName.textContent = dayName;
        startDateDay.style.display = 'block';
    } else {
        endDateInput.value = '';
        startDateDay.style.display = 'none';
    }
}

// Weekly payment functions
function updateWeekDisplay() {
    const weekFilter = document.getElementById('weekFilter');
    currentWeek = parseInt(weekFilter.value);
    document.getElementById('currentWeekDisplay').textContent = currentWeek;
    displayTeams(filteredTeams);
}

function updateWeekDropdownWithDates(selectedDivisionId = null) {
    const weekFilter = document.getElementById('weekFilter');
    if (!weekFilter) {
        console.log('Week filter not found');
        return;
    }
    
    console.log('Updating week dropdown with dates for division:', selectedDivisionId);
    console.log('Available divisions:', divisions);
    
    // If no division selected or "all" selected, hide the week dropdown
    if (!selectedDivisionId || selectedDivisionId === 'all') {
        console.log('No specific division selected, hiding week dropdown');
        weekFilter.style.display = 'none';
        document.querySelector('label[for="weekFilter"]').style.display = 'none';
        return;
    }
    
    // Show the week dropdown
    weekFilter.style.display = 'block';
    document.querySelector('label[for="weekFilter"]').style.display = 'block';
    
    // Find the selected division
    const division = divisions.find(d => d._id === selectedDivisionId);
    console.log('Found selected division:', division);
    
    if (!division || !division.startDate) {
        console.log('No division with start date found, resetting to week numbers only');
        // Reset to just week numbers if no division with start date
        const options = weekFilter.querySelectorAll('option');
        options.forEach((option, index) => {
            const weekNumber = parseInt(option.value);
            if (!weekNumber) return; // Skip if not a valid week number
            option.textContent = `Week ${weekNumber}`;
        });
        return;
    }
    
    // Parse date correctly to avoid timezone issues
    const [year, month, day] = division.startDate.split('T')[0].split('-').map(Number);
    const startDate = new Date(year, month - 1, day); // month is 0-indexed
    console.log('Using start date:', startDate);
    
    // Update all week options with dates based on selected division
    const options = weekFilter.querySelectorAll('option');
    options.forEach((option, index) => {
        const weekNumber = parseInt(option.value);
        if (!weekNumber) return; // Skip if not a valid week number
        
        const weekDate = new Date(startDate);
        weekDate.setDate(startDate.getDate() + ((weekNumber - 1) * 7));
        
        const dateString = weekDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        
        option.textContent = `Week ${weekNumber} (${dateString})`;
        console.log(`Updated Week ${weekNumber} to: ${dateString}`);
    });
}

function showWeeklyPaymentModal(teamId, specificWeek = null) {
    console.log('showWeeklyPaymentModal called with teamId:', teamId, 'specificWeek:', specificWeek);
    
    // Find the team from the current teams array (which should be up-to-date after any recent updates)
    const team = teams.find(t => t._id === teamId);
    if (!team) {
        console.log('Team not found for ID:', teamId);
        return;
    }
    
    currentWeeklyPaymentTeamId = teamId;
    
    // Use specific week if provided, otherwise get from dropdown
    let selectedWeek;
    if (specificWeek !== null) {
        selectedWeek = specificWeek;
    } else {
        const weekFilter = document.getElementById('weekFilter');
        selectedWeek = weekFilter ? parseInt(weekFilter.value) : currentWeek;
    }
    
    // Store the selected week for use in saveWeeklyPayment
    currentWeeklyPaymentWeek = selectedWeek;
    
    // Update modal title and week
    document.getElementById('weeklyPaymentTeamName').textContent = team.teamName;
    document.getElementById('weeklyPaymentWeek').textContent = selectedWeek;
    
    // Reset modal state - hide success message and show form
    const successDiv = document.getElementById('weeklyPaymentSuccess');
    const form = document.getElementById('weeklyPaymentForm');
    successDiv.classList.add('d-none');
    form.style.display = 'block';
    
    // Populate the amount dropdown
    const teamDivision = divisions.find(d => d.name === team.division);
    if (teamDivision) {
        populateWeeklyPaymentAmountDropdown(team, teamDivision);
    }
    
    // Populate BCA sanction player checkboxes
    populateBCASanctionPlayers(team);
    
    // Check if team has existing payment for this week
    const existingPayment = team.weeklyPayments?.find(p => p.week === selectedWeek);
    
    if (existingPayment) {
        // Populate with existing data
        if (existingPayment.paid === 'true') {
            document.getElementById('weeklyPaidYes').checked = true;
        } else if (existingPayment.paid === 'bye') {
            document.getElementById('weeklyPaidBye').checked = true;
        } else {
            document.getElementById('weeklyPaidNo').checked = true;
        }
        document.getElementById('weeklyPaymentMethod').value = existingPayment.paymentMethod || '';
        document.getElementById('weeklyPaymentAmount').value = existingPayment.amount || '';
        document.getElementById('weeklyPaymentNotes').value = existingPayment.notes || '';
        
        // Handle BCA sanction players (new format) or bcaSanctionFee (old format)
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
    } else {
        // Reset form
        document.getElementById('weeklyPaymentForm').reset();
        document.getElementById('weeklyPaidNo').checked = true;
        
        // Clear all BCA sanction player checkboxes
        const checkboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }
    
    new bootstrap.Modal(document.getElementById('weeklyPaymentModal')).show();
}

function closeWeeklyPaymentModal() {
    bootstrap.Modal.getInstance(document.getElementById('weeklyPaymentModal')).hide();
}

// Smart Builder Functions
let fargoTeamData = [];
let availableDivisions = [];

function showSmartBuilderModal() {
    console.log('Opening Smart Builder Modal - clearing previous data');
    
    // Reset the modal state
    document.getElementById('fargoConfig').style.display = 'block';
    document.getElementById('updateModeSection').style.display = 'block';
    document.getElementById('divisionSelectionSection').style.display = 'none';
    document.getElementById('fargoTeamsSection').style.display = 'none';
    document.getElementById('existingDivisionSection').style.display = 'none';
    document.getElementById('mergeConfirmationSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('createSection').style.display = 'none';
    document.getElementById('fargoLeagueUrl').value = '';
    document.getElementById('selectedDivision').value = '';
    document.getElementById('divisionName').value = '';
    document.getElementById('duesPerPlayer').value = '80';
    
    // Clear previous Fargo Rate data
    fargoTeamData = [];
    
    // Clear division dropdown
    const divisionSelect = document.getElementById('selectedDivision');
    divisionSelect.innerHTML = '<option value="">Select a division...</option>';
    document.getElementById('fetchTeamsBtn').disabled = true;
    
    // Clear any existing preview tables
    const previewTable = document.getElementById('fargoTeamsPreview');
    if (previewTable) {
        previewTable.innerHTML = '';
    }
    
    const mergeTable = document.getElementById('mergePreviewTable');
    if (mergeTable) {
        mergeTable.innerHTML = '';
    }
    
    // Reset radio buttons
    document.getElementById('createNew').checked = true;
    document.getElementById('fargoRate').checked = true;
    
    // Load existing divisions for update mode
    loadExistingDivisions();
    
    // Add event listeners for update mode radio buttons
    document.querySelectorAll('input[name="updateMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'update') {
                document.getElementById('divisionName').closest('.row').style.display = 'none';
            } else {
                document.getElementById('fargoTeamsSection').style.display = 'none';
                document.getElementById('existingDivisionSection').style.display = 'none';
                document.getElementById('mergeConfirmationSection').style.display = 'none';
                document.getElementById('divisionName').closest('.row').style.display = 'block';
            }
        });
    });
    
    new bootstrap.Modal(document.getElementById('smartBuilderModal')).show();
}

async function fetchFargoDivisions() {
    const fargoLeagueUrl = document.getElementById('fargoLeagueUrl').value.trim();
    
    if (!fargoLeagueUrl) {
        alert('Please enter the Fargo Rate League Reports URL');
        return;
    }
    
    // Extract League ID from the URL
    const urlParams = new URLSearchParams(new URL(fargoLeagueUrl).search);
    const leagueId = urlParams.get('leagueId');
    
    if (!leagueId) {
        alert('Could not extract League ID from the URL. Please make sure the URL is correct.');
        return;
    }
    
    const loadingSpinner = document.getElementById('fargoLoading');
    loadingSpinner.classList.remove('d-none');
    
    try {
        // Use the new divisions endpoint
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
            
            console.log('Fetched Fargo Rate divisions for League:', leagueId);
            console.log('Divisions found:', availableDivisions.length);
            console.log('Division data:', availableDivisions);
            
            if (availableDivisions.length > 0) {
                populateDivisionDropdown();
                document.getElementById('divisionSelectionSection').style.display = 'block';
            } else {
                alert('No divisions found for the specified league.');
            }
        } else {
            const errorData = await response.json();
            alert(`Error fetching Fargo Rate divisions: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error fetching Fargo Rate divisions:', error);
        alert('Error fetching Fargo Rate divisions. Please try again.');
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

function populateDivisionDropdown() {
    const divisionSelect = document.getElementById('selectedDivision');
    divisionSelect.innerHTML = '<option value="">Select a division...</option>';
    
    availableDivisions.forEach(division => {
        const option = document.createElement('option');
        option.value = division.id;
        option.textContent = division.name;
        divisionSelect.appendChild(option);
    });
}

function onDivisionSelected() {
    const selectedDivisionId = document.getElementById('selectedDivision').value;
    const fetchTeamsBtn = document.getElementById('fetchTeamsBtn');
    
    if (selectedDivisionId) {
        fetchTeamsBtn.disabled = false;
    } else {
        fetchTeamsBtn.disabled = true;
    }
}

async function fetchSelectedDivisionTeams() {
    const selectedDivisionId = document.getElementById('selectedDivision').value;
    const fargoLeagueUrl = document.getElementById('fargoLeagueUrl').value.trim();
    const updateMode = document.querySelector('input[name="updateMode"]:checked').value;
    
    if (!selectedDivisionId) {
        alert('Please select a division first');
        return;
    }
    
    // Extract League ID from the URL
    const urlParams = new URLSearchParams(new URL(fargoLeagueUrl).search);
    const leagueId = urlParams.get('leagueId');
    
    if (!leagueId) {
        alert('Could not extract League ID from the URL. Please make sure the URL is correct.');
        return;
    }
    
    const loadingSpinner = document.getElementById('fargoLoading');
    loadingSpinner.classList.remove('d-none');
    
    try {
        // Use the existing Fargo Rate scraper endpoint
        const response = await fetch(`${API_BASE_URL}/fargo-scraper/standings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                leagueId: leagueId,
                divisionId: selectedDivisionId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            fargoTeamData = data.teams || [];
            
            console.log('Fetched Fargo Rate data for League:', leagueId, 'Division:', selectedDivisionId);
            console.log('Teams found:', fargoTeamData.length);
            console.log('Team data:', fargoTeamData);
            
            if (fargoTeamData.length > 0) {
                if (updateMode === 'update') {
                    // Show Fargo Rate teams preview first
                    showFargoTeamsPreview();
                } else {
                    // Show preview for new division
                    showPreviewSection();
                }
            } else {
                alert('No teams found for the selected division.');
            }
        } else {
            const errorData = await response.json();
            alert(`Error fetching Fargo Rate data: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error fetching Fargo Rate data:', error);
        alert('Error fetching Fargo Rate data. Please try again.');
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

function showPreviewSection() {
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('createSection').style.display = 'block';
    
    // Populate the teams preview table
    const tbody = document.getElementById('teamsPreview');
    tbody.innerHTML = '';
    
        fargoTeamData.forEach((team, index) => {
            const row = document.createElement('tr');
            const playerCount = team.playerCount || 1;
            const totalDues = playerCount * parseInt(document.getElementById('duesPerPlayer').value);
            
            // Show additional players if available
            let playersInfo = '';
            if (team.players && team.players.length > 1) {
                playersInfo = `<br><small class="text-muted">Players: ${team.players.join(', ')}</small>`;
            }
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="team-checkbox" value="${index}" checked onchange="updateSelectedCount()">
                </td>
                <td>${team.name || 'Unknown Team'}</td>
                <td>${team.captain || 'Unknown Captain'}${playersInfo}</td>
                <td>${playerCount}</td>
                <td>$${totalDues}</td>
            `;
            tbody.appendChild(row);
        });
    
    updateSelectedCount();
}

function toggleAllTeams() {
    const selectAll = document.getElementById('selectAllTeams');
    const checkboxes = document.querySelectorAll('.team-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedCount();
}

function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    const selectedCount = selectedCheckboxes.length;
    
    document.getElementById('selectedTeamsCount').textContent = selectedCount;
    document.getElementById('selectedDivisionName').textContent = document.getElementById('divisionName').value || 'New Division';
    
    // Update select all checkbox state
    const selectAll = document.getElementById('selectAllTeams');
    const totalCheckboxes = document.querySelectorAll('.team-checkbox');
    
    if (selectedCount === 0) {
        selectAll.indeterminate = false;
        selectAll.checked = false;
    } else if (selectedCount === totalCheckboxes.length) {
        selectAll.indeterminate = false;
        selectAll.checked = true;
    } else {
        selectAll.indeterminate = true;
        selectAll.checked = false;
    }
}

// Show Fargo Rate teams preview
function showFargoTeamsPreview() {
    document.getElementById('fargoTeamsSection').style.display = 'block';
    
    const tbody = document.getElementById('fargoTeamsPreview');
    tbody.innerHTML = '';
    
    fargoTeamData.forEach(team => {
        const row = document.createElement('tr');
        const playerCount = team.playerCount || 1;
        
        // Show first few players
        let playersInfo = '';
        if (team.players && team.players.length > 0) {
            const playerNames = team.players.slice(0, 3).join(', ');
            if (team.players.length > 3) {
                playersInfo = `${playerNames} + ${team.players.length - 3} more`;
            } else {
                playersInfo = playerNames;
            }
        }
        
        row.innerHTML = `
            <td><strong>${team.name || 'Unknown Team'}</strong></td>
            <td>${team.captain || 'Unknown Captain'}</td>
            <td><small>${playersInfo}</small></td>
            <td><span class="badge bg-primary">${playerCount}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Show division selection after Fargo Rate preview
function showDivisionSelection() {
    document.getElementById('existingDivisionSection').style.display = 'block';
}

// Load existing divisions for update mode
async function loadExistingDivisions() {
    try {
        const response = await apiCall('/divisions');
        const divisions = await response.json();
        
        const select = document.getElementById('existingDivisionSelect');
        select.innerHTML = '<option value="">Select a division to update...</option>';
        
        divisions.forEach(division => {
            const option = document.createElement('option');
            option.value = division._id;
            option.textContent = division.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading divisions:', error);
        document.getElementById('existingDivisionSelect').innerHTML = '<option value="">Error loading divisions</option>';
    }
}

// Load teams for selected existing division
async function loadExistingDivisionTeams() {
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    
    if (!divisionId) {
        alert('Please select a division first');
        return;
    }
    
    if (fargoTeamData.length === 0) {
        alert('No Fargo Rate data available. Please fetch Fargo Rate data first.');
        return;
    }
    
    try {
        const response = await apiCall('/teams');
        const allTeams = await response.json();
        
        // Filter teams for the selected division - try both ID and name matching
        let existingTeams = allTeams.filter(team => team.division === divisionId);
        
        // If no teams found by ID, try by name
        if (existingTeams.length === 0) {
            existingTeams = allTeams.filter(team => team.division === divisionName);
        }
        
        console.log(`Looking for teams in division: ${divisionName} (ID: ${divisionId})`);
        console.log(`Found ${existingTeams.length} existing teams:`, existingTeams);
        console.log(`All teams:`, allTeams);
        
        if (existingTeams.length === 0) {
            alert(`No teams found for division "${divisionName}". Please check that teams exist in this division.`);
            return;
        }
        
        // Show merge confirmation with side-by-side comparison
        showMergeConfirmation(existingTeams);
        
    } catch (error) {
        console.error('Error loading division teams:', error);
        alert('Error loading division teams');
    }
}

// Show merge confirmation with side-by-side comparison
function showMergeConfirmation(existingTeams) {
    document.getElementById('mergeConfirmationSection').style.display = 'block';
    
    const tbody = document.getElementById('mergePreviewTable');
    tbody.innerHTML = '';
    
    // Create a map of existing teams by name for easy lookup
    const existingTeamsMap = {};
    existingTeams.forEach(team => {
        existingTeamsMap[team.teamName.toLowerCase()] = team;
    });
    
    // Helper function to find best matching team
    function findBestMatch(fargoTeamName, existingTeams) {
        const fargoLower = fargoTeamName.toLowerCase();
        
        // First try exact match
        if (existingTeamsMap[fargoLower]) {
            return existingTeamsMap[fargoLower];
        }
        
        // Try partial matches (one name contains the other)
        for (const team of existingTeams) {
            const existingLower = team.teamName.toLowerCase();
            if (fargoLower.includes(existingLower) || existingLower.includes(fargoLower)) {
                return team;
            }
        }
        
        // Try fuzzy matching (similar words)
        for (const team of existingTeams) {
            const existingLower = team.teamName.toLowerCase();
            const fargoWords = fargoLower.split(/\s+/);
            const existingWords = existingLower.split(/\s+/);
            
            // Check if any significant words match
            const matchingWords = fargoWords.filter(word => 
                word.length > 2 && existingWords.some(existingWord => 
                    existingWord.includes(word) || word.includes(existingWord)
                )
            );
            
            if (matchingWords.length > 0) {
                return team;
            }
        }
        
        return null;
    }
    
    fargoTeamData.forEach(fargoTeam => {
        const row = document.createElement('tr');
        const existingTeam = findBestMatch(fargoTeam.name, existingTeams);
        
        // Debug logging
        console.log(`Fargo Team: "${fargoTeam.name}" -> Existing Team:`, existingTeam ? existingTeam.teamName : "No match");
        
        let action, existingTeamName, playersToAdd;
        
        if (existingTeam) {
            // Team exists - show merge option
            action = '<span class="badge bg-warning">Merge</span>';
            existingTeamName = existingTeam.teamName;
            const currentPlayerCount = existingTeam.teamMembers ? existingTeam.teamMembers.length : 0;
            const newPlayerCount = fargoTeam.playerCount || 0;
            playersToAdd = `${currentPlayerCount} → ${newPlayerCount} players`;
        } else {
            // Team doesn't exist - show create option
            action = '<span class="badge bg-success">Create New</span>';
            existingTeamName = '<em class="text-muted">No existing team</em>';
            playersToAdd = `${fargoTeam.playerCount || 0} players`;
        }
        
        row.innerHTML = `
            <td>${action}</td>
            <td><strong>${fargoTeam.name}</strong><br><small>Captain: ${fargoTeam.captain}</small></td>
            <td>${existingTeamName}</td>
            <td>${playersToAdd}</td>
        `;
        tbody.appendChild(row);
    });
}

// Execute the merge
async function executeMerge() {
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value);
    
    console.log('Starting merge process...');
    console.log('Auth token available:', !!authToken);
    console.log('Division ID:', divisionId);
    console.log('Division Name:', divisionName);
    console.log('Dues per player:', duesPerPlayer);
    
    try {
        // Get existing teams for this division
        const response = await apiCall('/teams');
        const allTeams = await response.json();
        const existingTeams = allTeams.filter(team => 
            team.division === divisionId || team.division === divisionName
        );
        
        // Create a map of existing teams by name for easy lookup
        const existingTeamsMap = {};
        existingTeams.forEach(team => {
            existingTeamsMap[team.teamName.toLowerCase()] = team;
        });
        
        // Helper function to find best matching team (same as in showMergeConfirmation)
        function findBestMatch(fargoTeamName, existingTeams) {
            const fargoLower = fargoTeamName.toLowerCase();
            
            // First try exact match
            if (existingTeamsMap[fargoLower]) {
                return existingTeamsMap[fargoLower];
            }
            
            // Try partial matches (one name contains the other)
            for (const team of existingTeams) {
                const existingLower = team.teamName.toLowerCase();
                if (fargoLower.includes(existingLower) || existingLower.includes(fargoLower)) {
                    return team;
                }
            }
            
            // Try fuzzy matching (similar words)
            for (const team of existingTeams) {
                const existingLower = team.teamName.toLowerCase();
                const fargoWords = fargoLower.split(/\s+/);
                const existingWords = existingLower.split(/\s+/);
                
                // Check if any significant words match
                const matchingWords = fargoWords.filter(word => 
                    word.length > 2 && existingWords.some(existingWord => 
                        existingWord.includes(word) || word.includes(existingWord)
                    )
                );
                
                if (matchingWords.length > 0) {
                    return team;
                }
            }
            
            return null;
        }
        
        console.log('Existing teams found:', existingTeams);
        console.log('Existing teams map:', existingTeamsMap);
        
        const updatePromises = [];
        
        fargoTeamData.forEach(fargoTeam => {
            const existingTeam = findBestMatch(fargoTeam.name, existingTeams);
            
            console.log(`Processing Fargo Team: "${fargoTeam.name}" -> Existing Team:`, existingTeam ? existingTeam.teamName : "No match");
            
            if (existingTeam) {
                // Update existing team with Fargo Rate roster
                const updatedTeamData = {
                    ...existingTeam,
                    teamMembers: [], // Reset team members
                    duesAmount: (fargoTeam.playerCount || 1) * duesPerPlayer
                };
                
                // Add all players from Fargo Rate
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        updatedTeamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // Fargo Rate doesn't provide emails
                            phone: ''  // Fargo Rate doesn't provide phone numbers
                        });
                    });
                }
                
                console.log('Updating team:', existingTeam.teamName, 'with data:', updatedTeamData);
                
                updatePromises.push(
                    apiCall(`/teams/${existingTeam._id}`, {
                        method: 'PUT',
                        body: JSON.stringify(updatedTeamData)
                    }).then(async response => {
                        console.log('Update response for', existingTeam.teamName, ':', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to update team ${existingTeam.teamName}: ${response.status} ${errorText}`);
                        }
                        return response;
                    }).catch(error => {
                        console.error('Error updating team', existingTeam.teamName, ':', error);
                        throw error;
                    })
                );
            } else {
                // Create new team
                const teamData = {
                    teamName: fargoTeam.name || 'Unknown Team',
                    division: divisionName, // Use division name, not ID
                    captainName: fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : 'Unknown Captain',
                    teamMembers: [],
                    duesAmount: (fargoTeam.playerCount || 1) * duesPerPlayer
                };
                
                console.log('Creating team with division name:', divisionName);
                
                // Add all players from Fargo Rate
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        teamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // Fargo Rate doesn't provide emails
                            phone: ''  // Fargo Rate doesn't provide phone numbers
                        });
                    });
                }
                
                console.log('Creating new team:', teamData);
                
                updatePromises.push(
                    apiCall('/teams', {
                        method: 'POST',
                        body: JSON.stringify(teamData)
                    }).then(async response => {
                        console.log('Create response for', teamData.teamName, ':', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to create team ${teamData.teamName}: ${response.status} ${errorText}`);
                        }
                        return response;
                    }).catch(error => {
                        console.error('Error creating team', teamData.teamName, ':', error);
                        throw error;
                    })
                );
            }
        });
        
        console.log('Executing all merge operations...');
        await Promise.all(updatePromises);
        console.log('All merge operations completed successfully');
        
        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('smartBuilderModal')).hide();
        console.log('Refreshing data after merge...');
        await loadData();
        console.log('Data refresh completed');
        
        alert(`Successfully updated "${divisionName}" with Fargo Rate roster data!`);
        
    } catch (error) {
        console.error('Error executing merge:', error);
        alert(`Error executing merge: ${error.message}`);
    }
}

// Cancel merge
function cancelMerge() {
    document.getElementById('mergeConfirmationSection').style.display = 'none';
}

// Show preview for updating existing division
function showUpdatePreview(existingTeams) {
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('createSection').style.display = 'block';
    
    const tbody = document.getElementById('teamsPreview');
    tbody.innerHTML = '';
    
    // Show Fargo Rate teams that will be used to update existing teams
    fargoTeamData.forEach((fargoTeam, index) => {
        const row = document.createElement('tr');
        const playerCount = fargoTeam.playerCount || 1;
        const totalDues = playerCount * parseInt(document.getElementById('duesPerPlayer').value);
        
        // Show Fargo Rate players
        let playersInfo = '';
        if (fargoTeam.players && fargoTeam.players.length > 0) {
            const playerNames = fargoTeam.players.slice(0, 3).join(', '); // Show first 3 players
            if (fargoTeam.players.length > 3) {
                playersInfo = `<br><small class="text-muted">Players: ${playerNames} + ${fargoTeam.players.length - 3} more</small>`;
            } else {
                playersInfo = `<br><small class="text-muted">Players: ${playerNames}</small>`;
            }
        }
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="team-checkbox" value="${index}" checked onchange="updateSelectedCount()">
            </td>
            <td>${fargoTeam.name || 'Unknown Team'}</td>
            <td>${fargoTeam.captain || 'Unknown Captain'}${playersInfo}</td>
            <td>${playerCount}</td>
            <td>$${totalDues}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Update the create section text
    document.getElementById('selectedDivisionName').textContent = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    document.getElementById('selectedTeamsCount').textContent = fargoTeamData.length;
    
    updateSelectedCount();
}

async function createTeamsAndDivision() {
    const updateMode = document.querySelector('input[name="updateMode"]:checked').value;
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value);
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Please select at least one team to process');
        return;
    }
    
    if (updateMode === 'create') {
        const divisionName = document.getElementById('divisionName').value.trim();
        if (!divisionName) {
            alert('Please enter a division name');
            return;
        }
    }
    
    try {
        if (updateMode === 'create') {
            // Create new division mode
            const divisionName = document.getElementById('divisionName').value.trim();
            
            // First, create the division
            const divisionResponse = await apiCall('/divisions', {
                method: 'POST',
                body: JSON.stringify({
                    name: divisionName,
                    duesPerPlayer: duesPerPlayer,
                    description: `Division created via Smart Builder from Fargo Rate data`
                })
            });
            
            if (!divisionResponse.ok) {
                const error = await divisionResponse.json();
                throw new Error(error.message || 'Failed to create division');
            }
            
            // Then create the selected teams
            const teamPromises = Array.from(selectedCheckboxes).map(async (checkbox) => {
                const teamIndex = parseInt(checkbox.value);
                const team = fargoTeamData[teamIndex];
                
                const teamData = {
                    teamName: team.name || 'Unknown Team',
                    division: divisionName,
                    teamMembers: [],
                    duesAmount: (team.playerCount || 1) * duesPerPlayer
                };
                
                // Add all players from the team
                if (team.players && team.players.length > 0) {
                    team.players.forEach(playerName => {
                        teamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // Fargo Rate doesn't provide emails
                            phone: ''  // Fargo Rate doesn't provide phone numbers
                        });
                    });
                } else {
                    // Fallback to just the captain if no players array
                    teamData.teamMembers.push({
                        name: team.captain || 'Unknown Captain',
                        email: team.captainEmail || '',
                        phone: team.captainPhone || ''
                    });
                }
                
                return apiCall('/teams', {
                    method: 'POST',
                    body: JSON.stringify(teamData)
                });
            });
            
            const teamResponses = await Promise.all(teamPromises);
            const failedTeams = teamResponses.filter(response => !response.ok);
            
            if (failedTeams.length > 0) {
                console.warn('Some teams failed to create:', failedTeams);
            }
            
            // Close modal and refresh data
            bootstrap.Modal.getInstance(document.getElementById('smartBuilderModal')).hide();
            
            // Preserve current division filter before reloading data
            const currentDivisionFilter = document.getElementById('divisionFilter').value;
            
            await loadData();
            
            // Set the filter to the new division
            document.getElementById('divisionFilter').value = divisionName;
            filterTeamsByDivision();
            
            alert(`Successfully created division "${divisionName}" with ${selectedCheckboxes.length} teams!`);
            
        } else {
            // Update existing division mode
            const divisionId = document.getElementById('existingDivisionSelect').value;
            const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
            
            // Get existing teams for this division
            const response = await apiCall('/teams');
            const allTeams = await response.json();
            const existingTeams = allTeams.filter(team => team.division === divisionId);
            
            // Update teams with Fargo Rate data
            const updatePromises = Array.from(selectedCheckboxes).map(async (checkbox) => {
                const fargoTeamIndex = parseInt(checkbox.value);
                const fargoTeam = fargoTeamData[fargoTeamIndex];
                
                if (!fargoTeam) return;
                
                // Find existing team by name (case-insensitive)
                const existingTeam = existingTeams.find(team => 
                    team.teamName.toLowerCase() === fargoTeam.name.toLowerCase()
                );
                
                if (!existingTeam) {
                    console.warn(`No existing team found for Fargo Rate team: ${fargoTeam.name}`);
                    return;
                }
                
                // Update team with complete roster from Fargo Rate
                const updatedTeamData = {
                    ...existingTeam,
                    teamMembers: [], // Reset team members
                    duesAmount: (fargoTeam.playerCount || 1) * duesPerPlayer
                };
                
                // Add all players from Fargo Rate
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        updatedTeamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // Fargo Rate doesn't provide emails
                            phone: ''  // Fargo Rate doesn't provide phone numbers
                        });
                    });
                }
                
                return apiCall(`/teams/${existingTeam._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updatedTeamData)
                });
            });
            
            await Promise.all(updatePromises);
            
            // Close modal and refresh data
            bootstrap.Modal.getInstance(document.getElementById('smartBuilderModal')).hide();
            await loadData();
            
            alert(`Teams in "${divisionName}" updated successfully with complete rosters!`);
        }
        
    } catch (error) {
        console.error('Error processing teams:', error);
        alert(`Error processing teams: ${error.message}`);
    }
}

function populateWeeklyPaymentAmountDropdown(team, teamDivision) {
    console.log('populateWeeklyPaymentAmountDropdown called with team:', team);
    console.log('Team division dues rate:', team.divisionDuesRate);
    console.log('Team members count:', team.teamMembers ? team.teamMembers.length : 0);
    
    const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
    paymentAmountSelect.innerHTML = '<option value="">Select Amount</option>';
    
    // Calculate the weekly team dues amount
    const individualDuesRate = team.divisionDuesRate || 10; // Default to 10 if not set
    const playersPerTeam = 5; // Always 5 players per team
    const weeklyTeamDues = teamDivision && teamDivision.isDoublePlay 
        ? individualDuesRate * playersPerTeam * 2  // Double play = 5 players × dues × 2
        : individualDuesRate * playersPerTeam;     // Single play = 5 players × dues
    
    console.log('Individual dues rate:', individualDuesRate);
    console.log('Players per team:', playersPerTeam);
    console.log('Is double play:', teamDivision && teamDivision.isDoublePlay);
    console.log('Weekly team dues:', weeklyTeamDues);
    
    // Add the base weekly team dues amount
    const baseOption = document.createElement('option');
    baseOption.value = weeklyTeamDues;
    baseOption.textContent = `$${weeklyTeamDues} (Weekly Team Dues)`;
    paymentAmountSelect.appendChild(baseOption);
    console.log('Added base weekly dues option:', baseOption.textContent);
    
    // Add options for weekly team dues + BCA sanction fees in $25 increments
    const bcaSanctionFee = 25;
    const maxPlayers = team.teamMembers ? team.teamMembers.length : 10;
    
    console.log('Adding BCA sanction options for up to', maxPlayers, 'players');
    
    // Add options for weekly dues + BCA sanction fees for different numbers of players
    for (let playerCount = 1; playerCount <= maxPlayers; playerCount++) {
        const bcaAmount = bcaSanctionFee * playerCount;
        const totalAmount = weeklyTeamDues + bcaAmount;
        
        const option = document.createElement('option');
        option.value = totalAmount;
        option.textContent = `$${totalAmount} (Weekly Dues: $${weeklyTeamDues} + BCA: $${bcaAmount})`;
        paymentAmountSelect.appendChild(option);
        console.log('Added combined option:', option.textContent);
    }
    
    console.log('Total options added:', paymentAmountSelect.options.length);
}

function updateWeeklyPaymentAmount() {
    const selectedAmount = document.getElementById('weeklyPaymentAmount').value;
    // You can add any additional logic here if needed
}

function populateBCASanctionPlayers(team) {
    const container = document.getElementById('bcaSanctionPlayers');
    container.innerHTML = '';
    
    if (team.teamMembers && team.teamMembers.length > 0) {
        let playersNeedingSanction = 0;
        
        team.teamMembers.forEach((member, index) => {
            const isPaid = member.bcaSanctionPaid === true;
            const isPreviouslySanctioned = member.previouslySanctioned === true;
            const needsSanction = !isPaid && !isPreviouslySanctioned;
            
            if (needsSanction) {
                playersNeedingSanction++;
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check';
                checkboxDiv.innerHTML = `
                    <input class="form-check-input" type="checkbox" name="bcaSanctionPlayer" value="${member.name}" id="bcaPlayer${index}">
                    <label class="form-check-label" for="bcaPlayer${index}">
                        ${member.name}
                    </label>
                `;
                container.appendChild(checkboxDiv);
            } else {
                // Show status for players who don't need sanction
                const statusDiv = document.createElement('div');
                statusDiv.className = 'form-check';
                let statusText = '';
                let statusClass = '';
                
                if (isPaid) {
                    statusText = '✓ Already Paid';
                    statusClass = 'text-success';
                } else if (isPreviouslySanctioned) {
                    statusText = '✓ Previously Sanctioned';
                    statusClass = 'text-info';
                }
                
                statusDiv.innerHTML = `
                    <div class="form-check-label ${statusClass}">
                        ${member.name} - ${statusText}
                    </div>
                `;
                container.appendChild(statusDiv);
            }
        });
        
        if (playersNeedingSanction === 0) {
            container.innerHTML = '<p class="text-success mb-0">✓ All players are already sanctioned (paid or previously sanctioned)</p>';
        }
    } else {
        container.innerHTML = '<p class="text-muted mb-0">No team members found</p>';
    }
}

function showPlayersView() {
    populatePlayersModal();
    
    // Auto-select the current division in the players modal
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
                filterPlayersTable();
            }
        }
    }
    
    new bootstrap.Modal(document.getElementById('playersModal')).show();
}

function populatePlayersModal() {
    // Populate division filter
    const divisionFilter = document.getElementById('playersDivisionFilter');
    divisionFilter.innerHTML = '<option value="all">All Divisions</option>';
    divisions.forEach(division => {
        const option = document.createElement('option');
        option.value = division.name;
        option.textContent = division.name;
        divisionFilter.appendChild(option);
    });
    
    // Populate players table
    populatePlayersTable();
}

function populatePlayersTable() {
    const tbody = document.getElementById('playersTableBody');
    tbody.innerHTML = '';
    
    let totalPlayers = 0;
    let sanctionPaid = 0;
    let sanctionPending = 0;
    let previouslySanctioned = 0;
    let totalCollected = 0;
    
    console.log('Teams data:', teams);
    
    teams.forEach(team => {
        console.log(`Team: ${team.teamName}, Captain:`, team.captainName, 'Members:', team.teamMembers);
        
        // Add captain as a player (if not already in teamMembers)
        const allPlayers = [];
        
        // Add captain first
        if (team.captainName) {
            // Check if captain is also in teamMembers (for sanction tracking)
            const captainMember = team.teamMembers.find(m => m.name === team.captainName);
            
            const captainPlayer = {
                name: team.captainName,
                email: team.captainEmail || '', // Use captainEmail if available
                phone: team.captainPhone || '', // Use captainPhone if available
                bcaSanctionPaid: captainMember ? captainMember.bcaSanctionPaid : false,
                previouslySanctioned: captainMember ? captainMember.previouslySanctioned : (team.captainPreviouslySanctioned || false),
                isCaptain: true
            };
            allPlayers.push(captainPlayer);
            console.log(`Added captain:`, captainPlayer);
        }
        
        // Add team members (but skip if they're the same as captain)
        if (team.teamMembers && team.teamMembers.length > 0) {
            team.teamMembers.forEach(member => {
                // Skip if this member is the same as the captain
                if (member.name !== team.captainName) {
                    allPlayers.push({
                        ...member,
                        isCaptain: false
                    });
                }
            });
        }
        
        // Process all players (captain + members)
        allPlayers.forEach(player => {
            totalPlayers++;
            
            // Check if sanction is paid (from team member record or weekly payments)
            let isSanctionPaid = player.bcaSanctionPaid || false;
            
            // Also check weekly payments for BCA sanction fees
            if (team.weeklyPayments) {
                team.weeklyPayments.forEach(payment => {
                    if (payment.paid && payment.bcaSanctionPlayers && payment.bcaSanctionPlayers.includes(player.name)) {
                        isSanctionPaid = true;
                    }
                });
            }
            
            if (isSanctionPaid) {
                sanctionPaid++;
                if (!player.previouslySanctioned) {
                    totalCollected += 25;
                }
            } else if (player.previouslySanctioned) {
                // Previously sanctioned players don't count as pending
                previouslySanctioned++;
            } else {
                sanctionPending++;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${player.name}${player.isCaptain ? ' (Captain)' : ''}</strong></td>
                <td>${team.teamName}</td>
                <td>${team.division}</td>
                <td>${player.email || '-'}</td>
                <td>${player.phone || '-'}</td>
                <td>
                    <span class="badge ${isSanctionPaid ? 'bg-success' : (player.previouslySanctioned ? 'bg-info' : 'bg-warning')}">
                        ${isSanctionPaid ? 'Paid' : (player.previouslySanctioned ? 'Previously' : 'Pending')}
                    </span>
                </td>
                <td>
                    <span class="badge ${player.previouslySanctioned ? 'bg-info' : 'bg-secondary'}">
                        ${player.previouslySanctioned ? 'Yes' : 'No'}
                    </span>
                </td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm ${isSanctionPaid ? 'btn-success' : 'btn-outline-success'} sanction-btn" 
                                data-team-id="${team._id}" 
                                data-player-name="${player.name.replace(/"/g, '&quot;')}" 
                                data-current-status="${isSanctionPaid ? 'true' : 'false'}" 
                                data-is-captain="${player.isCaptain ? 'true' : 'false'}"
                                title="${isSanctionPaid ? 'Click to mark as unpaid' : 'Click to mark as paid'}">
                            <i class="fas fa-${isSanctionPaid ? 'check' : 'dollar-sign'}"></i>
                            ${isSanctionPaid ? 'Paid' : 'Mark Paid'}
                        </button>
                        <button class="btn btn-sm ${player.previouslySanctioned ? 'btn-info' : 'btn-outline-info'} previously-btn" 
                                data-team-id="${team._id}" 
                                data-player-name="${player.name.replace(/"/g, '&quot;')}" 
                                data-current-status="${player.previouslySanctioned ? 'true' : 'false'}" 
                                data-is-captain="${player.isCaptain ? 'true' : 'false'}"
                                title="${player.previouslySanctioned ? 'Click to mark as not previously sanctioned' : 'Click to mark as previously sanctioned (no fee owed)'}">
                            <i class="fas fa-${player.previouslySanctioned ? 'history' : 'user-check'}"></i>
                            ${player.previouslySanctioned ? 'Previously' : 'Mark Previously'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
    
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
            const playerName = this.dataset.playerName;
            const currentStatus = this.dataset.currentStatus === 'true';
            const isCaptain = this.dataset.isCaptain === 'true';
            togglePreviouslySanctioned(teamId, playerName, currentStatus, isCaptain);
        });
    });
    
    // Update summary cards
    document.getElementById('totalPlayersCount').textContent = totalPlayers;
    document.getElementById('sanctionPaidCount').textContent = sanctionPaid;
    document.getElementById('sanctionPendingCount').textContent = sanctionPending;
    document.getElementById('previouslySanctionedCount').textContent = previouslySanctioned;
    document.getElementById('sanctionFeesCollected').textContent = `$${totalCollected}`;
}

function filterPlayersTable() {
    const divisionFilter = document.getElementById('playersDivisionFilter').value;
    const statusFilter = document.getElementById('playersStatusFilter').value;
    const searchTerm = document.getElementById('playersSearch').value.toLowerCase();
    
    const rows = document.querySelectorAll('#playersTableBody tr');
    
    rows.forEach(row => {
        const teamName = row.cells[1].textContent;
        const division = row.cells[2].textContent;
        const playerName = row.cells[0].textContent.toLowerCase();
        const status = row.cells[5].textContent.trim();
        
        let showRow = true;
        
        // Division filter
        if (divisionFilter !== 'all' && division !== divisionFilter) {
            showRow = false;
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'paid' && status !== 'Paid') {
                showRow = false;
            } else if (statusFilter === 'pending' && status !== 'Pending') {
                showRow = false;
            } else if (statusFilter === 'previously' && status !== 'Previously') {
                showRow = false;
            }
        }
        
        // Search filter
        if (searchTerm && !playerName.includes(searchTerm)) {
            showRow = false;
        }
        
        row.style.display = showRow ? '' : 'none';
    });
}

async function toggleSanctionStatus(teamId, playerName, currentStatus, isCaptain) {
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.log('Team not found:', teamId);
            return;
        }
        if (isCaptain) {
            // For captains, we need to add them to teamMembers if they're not already there
            let member = team.teamMembers.find(m => m.name === playerName);
            if (!member) {
                // Add captain as a team member
                team.teamMembers.push({
                    name: playerName,
                    email: team.captainEmail || '',
                    phone: team.captainPhone || '',
                    bcaSanctionPaid: !currentStatus
                });
            } else {
                // Update existing member
                member.bcaSanctionPaid = !currentStatus;
            }
        } else {
            // Regular team member
            const member = team.teamMembers.find(m => m.name === playerName);
            if (!member) {
                console.log('Team member not found:', playerName);
                return;
            }
            // Toggle the sanction status
            member.bcaSanctionPaid = !currentStatus;
        }
        
        // Update the team in the database
        console.log('Sending API request to update team');
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(team)
        });
        
        console.log('API response:', response);
        if (response.ok) {
            console.log('Update successful, refreshing data');
            
            // Preserve current division filter before refreshing
            const currentDivisionFilter = document.getElementById('playersDivisionFilter').value;
            
            // First refresh the main data from server
            loadData().then(() => {
                // Then refresh the players table with fresh data
                populatePlayersTable();
                
                // Restore the division filter
                if (currentDivisionFilter) {
                    document.getElementById('playersDivisionFilter').value = currentDivisionFilter;
                    filterPlayersTable();
                }
            });
        } else {
            console.log('Update failed');
            alert('Failed to update sanction status');
        }
    } catch (error) {
        console.error('Error updating sanction status:', error);
        alert('Error updating sanction status');
    }
}

async function togglePreviouslySanctioned(teamId, playerName, currentStatus, isCaptain) {
    console.log('togglePreviouslySanctioned called:', { teamId, playerName, currentStatus, isCaptain });
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.log('Team not found:', teamId);
            return;
        }
        console.log('Found team:', team.teamName);
        
        if (isCaptain) {
            // For captains, find them in teamMembers and update their status
            console.log('Processing captain:', playerName);
            let member = team.teamMembers.find(m => m.name === playerName);
            if (!member) {
                console.log('Captain not found in teamMembers, adding them');
                // Add captain as a team member if they're not already there
                member = {
                    name: playerName,
                    email: team.captainEmail || '',
                    phone: team.captainPhone || '',
                    bcaSanctionPaid: false,
                    previouslySanctioned: false
                };
                team.teamMembers.push(member);
            }
            console.log('Found/added captain member:', member.name, 'current status:', member.previouslySanctioned);
            
            // Toggle the previously sanctioned status
            member.previouslySanctioned = !currentStatus;
            console.log('Updated captain status to:', member.previouslySanctioned);
        } else {
            // Regular team member
            console.log('Looking for member:', playerName, 'in team members:', team.teamMembers.map(m => m.name));
            const member = team.teamMembers.find(m => m.name === playerName);
            if (!member) {
                console.log('Member not found:', playerName);
                return;
            }
            console.log('Found member:', member.name, 'current status:', member.previouslySanctioned);
            
            // Toggle the previously sanctioned status
            member.previouslySanctioned = !currentStatus;
            console.log('Updated member status to:', member.previouslySanctioned);
        }
        
        // Update the team in the database
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(team)
        });
        
        if (response.ok) {
            // Preserve current division filter before refreshing
            const currentDivisionFilter = document.getElementById('playersDivisionFilter').value;
            
            // First refresh the main data from server
            loadData().then(() => {
                // Then refresh the players table with fresh data
                populatePlayersTable();
                
                // Restore the division filter
                if (currentDivisionFilter) {
                    document.getElementById('playersDivisionFilter').value = currentDivisionFilter;
                    filterPlayersTable();
                }
            });
        } else {
            alert('Failed to update previously sanctioned status');
        }
    } catch (error) {
        console.error('Error updating previously sanctioned status:', error);
        alert('Error updating previously sanctioned status');
    }
}

function showPaymentHistory(teamId) {
    const team = teams.find(t => t._id === teamId);
    if (!team) return;
    
    const teamDivision = divisions.find(d => d.name === team.division);
    if (!teamDivision) return;
    
    // Populate team info
    document.getElementById('paymentHistoryTeamName').textContent = team.teamName;
    document.getElementById('paymentHistoryDivision').textContent = team.division;
    document.getElementById('paymentHistoryDuesRate').textContent = team.divisionDuesRate;
    document.getElementById('paymentHistoryTotalWeeks').textContent = teamDivision.totalWeeks;
    
    // Calculate weekly dues
    const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
    const weeklyDues = team.divisionDuesRate * 5 * doublePlayMultiplier;
    document.getElementById('paymentHistoryWeeklyDues').textContent = weeklyDues;
    
    // Populate payment history table
    const tbody = document.getElementById('paymentHistoryTable');
    tbody.innerHTML = '';
    
    let totalPaid = 0;
    let weeksPaid = 0;
    
    // Calculate actual current week for this team's division
    let actualCurrentWeek = 1;
    if (teamDivision.startDate) {
        const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        const today = new Date();
        const timeDiff = today.getTime() - startDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        actualCurrentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
        
        // Grace period: teams have 3 days after week ends before being considered late
        const daysIntoCurrentWeek = daysDiff % 7;
        const gracePeriodDays = 3;
        if (daysIntoCurrentWeek <= gracePeriodDays) {
            actualCurrentWeek = Math.max(1, actualCurrentWeek - 1);
        }
    }
    
    // Show all weeks up to the division's total weeks
    for (let week = 1; week <= teamDivision.totalWeeks; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        const isPaid = weekPayment && weekPayment.paid === 'true';
        const isBye = weekPayment && weekPayment.paid === 'bye';
        const isMakeup = weekPayment && weekPayment.paid === 'makeup';
        
        // Calculate week date
        let weekDate = '-';
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            const weekStartDate = new Date(startDate);
            weekStartDate.setDate(startDate.getDate() + (week - 1) * 7);
            weekDate = weekStartDate.toLocaleDateString();
        }
        
        if (isPaid) {
            totalPaid += weekPayment.amount || 0;
            weeksPaid++;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><small>${week}</small></td>
            <td><small>${weekDate}</small></td>
            <td>
                <span class="badge bg-${isPaid ? 'success' : isBye ? 'info' : isMakeup ? 'warning' : 'danger'} badge-sm">
                    <i class="fas fa-${isPaid ? 'check' : isBye ? 'pause' : isMakeup ? 'clock' : 'times'}"></i>
                </span>
            </td>
            <td><small>${isPaid ? `$${weekPayment.amount || 0}` : `$${weeklyDues}`}</small></td>
            <td><small>${isPaid ? (weekPayment.paymentMethod || '-') : '-'}</small></td>
            <td><small>${isPaid && weekPayment.paymentDate ? new Date(weekPayment.paymentDate).toLocaleDateString() : '-'}</small></td>
            <td><small>${isPaid ? (weekPayment.notes || '-') : '-'}</small></td>
            <td>
                <button class="btn btn-outline-primary btn-sm" onclick="showWeeklyPaymentModal('${team._id}', ${week}); bootstrap.Modal.getInstance(document.getElementById('paymentHistoryModal')).hide();" title="Edit Payment">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
    
    // Update summary
    document.getElementById('paymentHistoryTotalPaid').textContent = totalPaid;
    document.getElementById('paymentHistoryWeeksPaid').textContent = weeksPaid;
    
    // Calculate status
    let isCurrent = true;
    for (let week = 1; week <= actualCurrentWeek; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
            isCurrent = false;
            break;
        }
    }
    
    const statusBadge = document.getElementById('paymentHistoryStatus');
    statusBadge.textContent = isCurrent ? 'Current' : 'Behind';
    statusBadge.className = `badge bg-${isCurrent ? 'success' : 'danger'}`;
    
    new bootstrap.Modal(document.getElementById('paymentHistoryModal')).show();
}

async function saveWeeklyPayment() {
    const paid = document.querySelector('input[name="weeklyPaid"]:checked').value;
    const paymentMethod = document.getElementById('weeklyPaymentMethod').value;
    const amount = parseFloat(document.getElementById('weeklyPaymentAmount').value) || 0;
    const notes = document.getElementById('weeklyPaymentNotes').value;
    
    // Collect selected BCA sanction players
    const selectedBCAPlayers = [];
    const bcaCheckboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]:checked');
    bcaCheckboxes.forEach(checkbox => {
        selectedBCAPlayers.push(checkbox.value);
    });
    
    try {
        const response = await apiCall(`/teams/${currentWeeklyPaymentTeamId}/weekly-payment`, {
            method: 'POST',
            body: JSON.stringify({
                week: currentWeeklyPaymentWeek,
                paid,
                paymentMethod,
                amount,
                notes,
                bcaSanctionPlayers: selectedBCAPlayers
            })
        });
        
        if (response.ok) {
            // Show success message in modal
            const successDiv = document.getElementById('weeklyPaymentSuccess');
            const successMessage = document.getElementById('weeklyPaymentSuccessMessage');
            const form = document.getElementById('weeklyPaymentForm');
            
            // Hide the form and show success message
            form.style.display = 'none';
            successDiv.classList.remove('d-none');
            successMessage.textContent = 'Weekly payment updated successfully!';
            
            // Preserve current division filter before reloading data
            const currentDivisionFilter = document.getElementById('divisionFilter').value;
            
            loadData().then(() => {
                // Restore the division filter after data is reloaded
                if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                    document.getElementById('divisionFilter').value = currentDivisionFilter;
                    filterTeamsByDivision();
                }
            });
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating weekly payment');
        }
    } catch (error) {
        alert('Error updating weekly payment. Please try again.');
    }
}
