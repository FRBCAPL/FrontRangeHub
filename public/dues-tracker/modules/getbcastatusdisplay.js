function getBCAStatusDisplay(team) {
    if (!team.teamMembers || team.teamMembers.length === 0) {
        return '<span class="badge bg-secondary">No Players</span>';
    }
    
    // Collect all players who have been sanctioned via payment modals
    const sanctionedPlayersFromPayments = new Set();
    if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
        team.weeklyPayments.forEach(payment => {
            if (payment.paid === 'true' && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                payment.bcaSanctionPlayers.forEach(playerName => {
                    sanctionedPlayersFromPayments.add(playerName);
                });
            }
        });
    }
    
    let paidCount = 0;
    let previouslyCount = 0;
    let totalCount = team.teamMembers.length;
    
    team.teamMembers.forEach(member => {
        // Check if player was sanctioned via payment modal (overrides member's bcaSanctionPaid)
        const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
        const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid;
        
        if (effectiveBcaSanctionPaid) {
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
        return `<span class="badge bg-warning text-dark"><i class="fas fa-clock"></i> ${pendingCount} Pending</span>`;
    } else {
        return '<span class="badge bg-info"><i class="fas fa-history"></i> All Set</span>';
    }
}
