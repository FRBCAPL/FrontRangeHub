// Configuration
const API_BASE_URL = 'http://localhost:5001/api';

// Global variables
let authToken = localStorage.getItem('authToken');
let currentTeamId = null;
let divisions = [];
let filteredTeams = [];
let currentDivisionId = null;
let currentWeek = 1;
let currentWeeklyPaymentTeamId = null;
let currentWeeklyPaymentWeek = 1;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (authToken) {
        showMainApp();
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
        alert('Error loading data. Please try again.');
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
            
            if (!weekPayment || !weekPayment.paid) {
                isCurrent = false;
                // Calculate weekly dues for this missed week
                // 5 PLAYERS × dues rate per player
                // For double play: multiply by 2 (they play both 8-ball and 10-ball)
                const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
                const weeklyDues = duesRate * 5 * doublePlayMultiplier; // 5 players × dues rate per player × double play multiplier
                amountOwed += weeklyDues;
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${team.teamName}</strong></td>
            <td><span class="badge bg-primary">${team.division}</span></td>
            <td>${team.captainName}</td>
            <td>
                <span class="badge bg-info">${playerCount} players</span>
            </td>
            <td><strong>$${isCurrent ? weeklyDuesAmount : amountOwed}</strong></td>
            <td>
                <span class="status-${isCurrent ? 'paid' : 'unpaid'}">
                    <i class="fas fa-${isCurrent ? 'check-circle' : 'times-circle'} me-1"></i>
                    ${isCurrent ? 'Current' : `Owes $${amountOwed}`}
                </span>
            </td>
            <td>${team.paymentDate ? new Date(team.paymentDate).toLocaleDateString() : '-'}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-${weeklyPaid ? 'success' : weeklyBye ? 'info' : 'danger'}">
                        <i class="fas fa-${weeklyPaid ? 'check' : weeklyBye ? 'pause' : 'times'} me-1"></i>
                        ${weeklyPaid ? 'Paid' : weeklyBye ? 'Bye Week' : 'Unpaid'}
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
            if (!weekPayment || !weekPayment.paid) {
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
    
    // Show modal
    new bootstrap.Modal(document.getElementById('addTeamModal')).show();
}

function addTeamMember(name = '', email = '', bcaSanctionPaid = false, index = null) {
    const container = document.getElementById('teamMembersContainer');
    const newMemberRow = document.createElement('div');
    newMemberRow.className = 'row mb-2 member-row';
    newMemberRow.innerHTML = `
        <div class="col-md-3">
            <input type="text" class="form-control" placeholder="Player name" name="memberName" value="${name}" oninput="updateDuesCalculation()">
        </div>
        <div class="col-md-3">
            <input type="email" class="form-control" placeholder="Email (optional)" name="memberEmail" value="${email}">
        </div>
        <div class="col-md-3">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" name="bcaSanctionPaid" ${bcaSanctionPaid ? 'checked' : ''}>
                <label class="form-check-label">
                    BCA Sanction ($25)
                </label>
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
        captainName: document.getElementById('captainName').value,
        captainEmail: document.getElementById('captainEmail').value,
        captainPhone: document.getElementById('captainPhone').value,
        teamMembers: []
    };
    
    // Collect team members
    const memberRows = document.querySelectorAll('#teamMembersContainer .row');
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const emailInput = row.querySelector('input[name="memberEmail"]');
        const bcaSanctionCheckbox = row.querySelector('input[name="bcaSanctionPaid"]');
        
        if (nameInput && nameInput.value.trim()) {
            teamData.teamMembers.push({
                name: nameInput.value.trim(),
                email: emailInput ? emailInput.value.trim() : '',
                bcaSanctionPaid: bcaSanctionCheckbox ? bcaSanctionCheckbox.checked : false
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
    document.getElementById('captainName').value = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : '';
    document.getElementById('captainEmail').value = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].email : '';
    document.getElementById('captainPhone').value = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].phone || '' : '';
    
    // Populate team members
    const membersContainer = document.getElementById('teamMembersContainer');
    membersContainer.innerHTML = '';
    
    if (team.teamMembers && team.teamMembers.length > 1) {
        // Add additional members (skip first one as it's the captain)
        team.teamMembers.slice(1).forEach((member, index) => {
            addTeamMember(member.name, member.email, index);
        });
    } else {
        // Add at least one empty member field
        addTeamMember();
    }
    
    // Update dues calculation
    updateDuesCalculation();
    
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
        const name = row.querySelector('input[placeholder="Player name"]').value;
        const email = row.querySelector('input[placeholder="Email (optional)"]').value;
        if (name.trim()) {
            teamData.teamMembers.push({ name: name.trim(), email: email.trim() });
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
                if (member.bcaSanctionPaid) {
                    totalBCASanctionFees += 25; // $25 per player
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
    const team = teams.find(t => t._id === teamId);
    if (!team) return;
    
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

function showSmartBuilderModal() {
    // Reset the modal state
    document.getElementById('fargoConfig').style.display = 'block';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('createSection').style.display = 'none';
    document.getElementById('fargoLeagueId').value = '';
    document.getElementById('fargoDivisionId').value = '';
    document.getElementById('divisionName').value = '';
    document.getElementById('duesPerPlayer').value = '80';
    
    new bootstrap.Modal(document.getElementById('smartBuilderModal')).show();
}

async function fetchFargoData() {
    const leagueId = document.getElementById('fargoLeagueId').value.trim();
    const divisionId = document.getElementById('fargoDivisionId').value.trim();
    
    if (!leagueId || !divisionId) {
        alert('Please enter both League ID and Division ID');
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
                divisionId: divisionId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            fargoTeamData = data.teams || [];
            
            if (fargoTeamData.length > 0) {
                showPreviewSection();
            } else {
                alert('No teams found in the Fargo Rate data');
            }
        } else {
            const error = await response.json();
            alert(`Error fetching data: ${error.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error fetching Fargo data:', error);
        alert('Error fetching data from Fargo Rate. Please check your connection and try again.');
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

async function createTeamsAndDivision() {
    const divisionName = document.getElementById('divisionName').value.trim();
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value);
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    
    if (!divisionName) {
        alert('Please enter a division name');
        return;
    }
    
    if (selectedCheckboxes.length === 0) {
        alert('Please select at least one team to create');
        return;
    }
    
    try {
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
                teamMembers: [
                    {
                        name: team.captain || 'Unknown Captain',
                        email: team.captainEmail || '',
                        phone: team.captainPhone || ''
                    }
                ],
                duesAmount: (team.playerCount || 1) * duesPerPlayer
            };
            
            // Add additional team members if available
            if (team.players && team.players.length > 1) {
                team.players.slice(1).forEach(player => {
                    teamData.teamMembers.push({
                        name: player.name || 'Unknown Player',
                        email: player.email || '',
                        phone: player.phone || ''
                    });
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
        
    } catch (error) {
        console.error('Error creating teams and division:', error);
        alert(`Error creating teams and division: ${error.message}`);
    }
}

function populateWeeklyPaymentAmountDropdown(team, teamDivision) {
    const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
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

function updateWeeklyPaymentAmount() {
    const selectedAmount = document.getElementById('weeklyPaymentAmount').value;
    // You can add any additional logic here if needed
}

function populateBCASanctionPlayers(team) {
    const container = document.getElementById('bcaSanctionPlayers');
    container.innerHTML = '';
    
    if (team.teamMembers && team.teamMembers.length > 0) {
        team.teamMembers.forEach((member, index) => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check';
            checkboxDiv.innerHTML = `
                <input class="form-check-input" type="checkbox" name="bcaSanctionPlayer" value="${member.name}" id="bcaPlayer${index}">
                <label class="form-check-label" for="bcaPlayer${index}">
                    ${member.name}
                </label>
            `;
            container.appendChild(checkboxDiv);
        });
    } else {
        container.innerHTML = '<p class="text-muted mb-0">No team members found</p>';
    }
}

function showPlayersView() {
    populatePlayersModal();
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
                previouslySanctioned: team.captainPreviouslySanctioned || false,
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
                totalCollected += 25;
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
                    <span class="badge ${isSanctionPaid ? 'bg-success' : 'bg-warning'}">
                        ${isSanctionPaid ? 'Paid' : 'Pending'}
                    </span>
                </td>
                <td>
                    <span class="badge ${player.previouslySanctioned ? 'bg-info' : 'bg-secondary'}">
                        ${player.previouslySanctioned ? 'Yes' : 'No'}
                    </span>
                </td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm ${isSanctionPaid ? 'btn-outline-success' : 'btn-success'}" 
                                onclick="toggleSanctionStatus('${team._id}', '${player.name}', ${isSanctionPaid}, ${player.isCaptain})">
                            <i class="fas fa-${isSanctionPaid ? 'check' : 'dollar-sign'}"></i>
                            ${isSanctionPaid ? 'Paid' : 'Mark Paid'}
                        </button>
                        <button class="btn btn-sm ${player.previouslySanctioned ? 'btn-outline-info' : 'btn-info'}" 
                                onclick="togglePreviouslySanctioned('${team._id}', '${player.name}', ${player.previouslySanctioned}, ${player.isCaptain})">
                            <i class="fas fa-${player.previouslySanctioned ? 'check' : 'history'}"></i>
                            ${player.previouslySanctioned ? 'Was Sanctioned' : 'Mark Previously'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
    
    // Update summary cards
    document.getElementById('totalPlayersCount').textContent = totalPlayers;
    document.getElementById('sanctionPaidCount').textContent = sanctionPaid;
    document.getElementById('sanctionPendingCount').textContent = sanctionPending;
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
            } else if (statusFilter === 'previously') {
                // Check if this row has "Yes" in the previously sanctioned column
                const previouslySanctioned = row.cells[6].textContent.trim();
                if (previouslySanctioned !== 'Yes') {
                    showRow = false;
                }
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
    console.log('toggleSanctionStatus called:', { teamId, playerName, currentStatus, isCaptain });
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.log('Team not found:', teamId);
            return;
        }
        console.log('Found team:', team.teamName);
        
        if (isCaptain) {
            console.log('Processing captain:', playerName);
            // For captains, we need to add them to teamMembers if they're not already there
            let member = team.teamMembers.find(m => m.name === playerName);
            if (!member) {
                console.log('Adding captain as team member');
                // Add captain as a team member
                team.teamMembers.push({
                    name: playerName,
                    email: team.captainEmail || '',
                    phone: team.captainPhone || '',
                    bcaSanctionPaid: !currentStatus
                });
            } else {
                console.log('Updating existing captain member');
                // Update existing member
                member.bcaSanctionPaid = !currentStatus;
            }
            console.log('Captain sanction status updated to:', !currentStatus);
        } else {
            console.log('Processing team member:', playerName);
            // Regular team member
            const member = team.teamMembers.find(m => m.name === playerName);
            if (!member) {
                console.log('Team member not found:', playerName);
                return;
            }
            console.log('Updating team member sanction status');
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
            // Refresh the players table
            populatePlayersTable();
            // Also refresh the main data
            loadData();
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
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) return;
        
        if (isCaptain) {
            // For captains, update the captainPreviouslySanctioned field
            team.captainPreviouslySanctioned = !currentStatus;
        } else {
            // Regular team member
            const member = team.teamMembers.find(m => m.name === playerName);
            if (!member) return;
            
            // Toggle the previously sanctioned status
            member.previouslySanctioned = !currentStatus;
        }
        
        // Update the team in the database
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(team)
        });
        
        if (response.ok) {
            // Refresh the players table
            populatePlayersTable();
            // Also refresh the main data
            loadData();
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
        const isPaid = weekPayment && weekPayment.paid;
        
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
            <td>Week ${week}</td>
            <td>${weekDate}</td>
            <td>
                <span class="badge bg-${isPaid ? 'success' : 'danger'}">
                    <i class="fas fa-${isPaid ? 'check' : 'times'} me-1"></i>
                    ${isPaid ? 'Paid' : 'Unpaid'}
                </span>
            </td>
            <td>${isPaid ? `$${weekPayment.amount || 0}` : `$${weeklyDues}`}</td>
            <td>${isPaid ? (weekPayment.paymentMethod || '-') : '-'}</td>
            <td>${isPaid && weekPayment.paymentDate ? new Date(weekPayment.paymentDate).toLocaleDateString() : '-'}</td>
            <td>${isPaid ? (weekPayment.notes || '-') : '-'}</td>
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
        if (!weekPayment || !weekPayment.paid) {
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

// Smart Builder Functions
let fargoTeamData = [];

function showSmartBuilderModal() {
    // Reset the modal state
    document.getElementById('fargoConfig').style.display = 'block';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('createSection').style.display = 'none';
    document.getElementById('fargoUrl').value = '';
    document.getElementById('divisionName').value = '';
    document.getElementById('duesPerPlayer').value = '80';
    
    new bootstrap.Modal(document.getElementById('smartBuilderModal')).show();
}

async function fetchFargoData() {
    const fargoUrl = document.getElementById('fargoUrl').value.trim();
    
    if (!fargoUrl) {
        alert('Please enter the Fargo Rate Division Reports URL');
        return;
    }
    
    // Extract League ID and Division ID from the URL
    const urlParams = new URLSearchParams(new URL(fargoUrl).search);
    const leagueId = urlParams.get('leagueId');
    const divisionId = urlParams.get('divisionId');
    
    if (!leagueId || !divisionId) {
        alert('Could not extract League ID and Division ID from the URL. Please make sure the URL is correct.');
        return;
    }
    
    const loadingSpinner = document.getElementById('fargoLoading');
    loadingSpinner.classList.remove('d-none');
    
    try {
        const response = await fetch(`${API_BASE_URL}/fargo-scraper/standings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                leagueId: leagueId,
                divisionId: divisionId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            fargoTeamData = data.teams || [];
            
            if (fargoTeamData.length > 0) {
                showPreviewSection();
            } else {
                alert('No teams found in the Fargo Rate data');
            }
        } else {
            const error = await response.json();
            alert(`Error fetching data: ${error.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error fetching Fargo data:', error);
        alert('Error fetching data from Fargo Rate. Please check your connection and try again.');
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

function showPreviewSection() {
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('createSection').style.display = 'block';
    
    const tbody = document.getElementById('teamsPreview');
    tbody.innerHTML = '';
    
    fargoTeamData.forEach((team, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="team-checkbox" value="${index}" checked onchange="updateSelectedCount()">
            </td>
            <td>${team.name || 'Unknown Team'}</td>
            <td>${team.captain || 'Unknown Captain'}</td>
            <td>${team.playerCount || 1}</td>
            <td>$${(team.playerCount || 1) * parseInt(document.getElementById('duesPerPlayer').value)}</td>
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

async function createTeamsAndDivision() {
    const divisionName = document.getElementById('divisionName').value.trim();
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value);
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    
    if (!divisionName) {
        alert('Please enter a division name');
        return;
    }
    
    if (selectedCheckboxes.length === 0) {
        alert('Please select at least one team to create');
        return;
    }
    
    try {
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
        
        bootstrap.Modal.getInstance(document.getElementById('smartBuilderModal')).hide();
        
        const currentDivisionFilter = document.getElementById('divisionFilter').value;
        await loadData();
        document.getElementById('divisionFilter').value = divisionName;
        filterTeamsByDivision();
        
        alert(`Successfully created division "${divisionName}" with ${selectedCheckboxes.length} teams!`);
        
    } catch (error) {
        console.error('Error creating teams and division:', error);
        alert(`Error creating teams and division: ${error.message}`);
    }
}
