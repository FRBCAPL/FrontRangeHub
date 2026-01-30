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
