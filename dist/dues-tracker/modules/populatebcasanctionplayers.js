function populateBCASanctionPlayers(team) {
    const listEl = document.getElementById('bcaSanctionPlayersList');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    // Use normalized name for matching (handles nicknames, spacing, case differences)
    const normName = typeof normPlayerKey === 'function' ? normPlayerKey : (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    if (team.teamMembers && team.teamMembers.length > 0) {
        // Check if any players have been sanctioned via payment modals (use normalized names)
        const sanctionedPlayersFromPayments = new Set();
        if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
            team.weeklyPayments.forEach(payment => {
                const isPaidOrPartial = payment.paid === 'true' || payment.paid === true || payment.paid === 'partial';
                if (isPaidOrPartial && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                    payment.bcaSanctionPlayers.forEach(playerName => {
                        sanctionedPlayersFromPayments.add(normName(playerName));
                    });
                }
            });
        }

        const feeLabel = typeof formatCurrency === 'function' && sanctionFeeAmount != null
            ? formatCurrency(sanctionFeeAmount)
            : '$0.00';

        let playersNeedingSanction = 0;

        team.teamMembers.forEach((member, index) => {
            const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(normName(member.name));
            const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid === true;
            const isPreviouslySanctioned = member.previouslySanctioned === true;
            const needsSanction = !effectiveBcaSanctionPaid && !isPreviouslySanctioned;

            if (needsSanction) {
                playersNeedingSanction++;
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check';
                const checkboxId = `bcaPlayer${index}`;
                checkboxDiv.innerHTML = `
                    <input class="form-check-input" type="checkbox" name="bcaSanctionPlayer" value="${member.name}" id="${checkboxId}" onchange="validatePaymentAmount()">
                    <label class="form-check-label" for="${checkboxId}">
                        Include ${member.name} (${feeLabel})
                    </label>
                `;
                listEl.appendChild(checkboxDiv);
            } else {
                const statusDiv = document.createElement('div');
                statusDiv.className = 'form-check';
                let statusText = '';
                let statusClass = '';

                if (effectiveBcaSanctionPaid) {
                    statusText = '✓ Already paid';
                    statusClass = 'text-success';
                } else if (isPreviouslySanctioned) {
                    statusText = '✓ Previously sanctioned';
                    statusClass = 'text-info';
                }

                statusDiv.innerHTML = `
                    <div class="form-check-label ${statusClass}">
                        ${member.name} — ${statusText}
                    </div>
                `;
                listEl.appendChild(statusDiv);
            }
        });

        if (playersNeedingSanction === 0) {
            listEl.innerHTML = '<p class="text-success mb-0">✓ All players are already sanctioned (paid or previously sanctioned)</p>';
        }
    } else {
        listEl.innerHTML = '<p class="text-muted mb-0">No team members found</p>';
    }
}
