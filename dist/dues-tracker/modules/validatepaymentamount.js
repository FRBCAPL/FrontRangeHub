function validatePaymentAmount() {
    const selectedAmount = parseFloat(document.getElementById('weeklyPaymentAmount').value) || 0;
    const weeklyTeamDues = currentWeeklyTeamDues || 0;
    
    // Get selected sanction fee players
    const selectedSanctionPlayers = document.querySelectorAll('input[name="bcaSanctionPlayer"]:checked');
    const selectedPlayerCount = selectedSanctionPlayers.length;
    
    // Hide any existing validation message
    const existingMessage = document.getElementById('paymentAmountValidationMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Only validate if amount is greater than weekly dues (meaning sanction fees are included)
    if (selectedAmount > weeklyTeamDues && sanctionFeesEnabled && sanctionFeeAmount > 0) {
        const extraAmount = selectedAmount - weeklyTeamDues;
        const expectedPlayerCount = Math.round(extraAmount / sanctionFeeAmount);
        
        // Allow small rounding differences (within $0.50)
        const amountDifference = Math.abs(extraAmount - (expectedPlayerCount * sanctionFeeAmount));
        
        if (amountDifference > 0.50) {
            // Amount doesn't match expected player count - show warning
            const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
            const validationMessage = document.createElement('div');
            validationMessage.id = 'paymentAmountValidationMessage';
            validationMessage.className = 'alert alert-warning mt-2';
            validationMessage.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Amount Mismatch:</strong> The selected amount (${formatCurrency(selectedAmount)}) includes ${formatCurrency(extraAmount)} in ${sanctionFeeName}, 
                which suggests <strong>${expectedPlayerCount} player${expectedPlayerCount !== 1 ? 's' : ''}</strong> should be selected for sanction fees. 
                Currently <strong>${selectedPlayerCount} player${selectedPlayerCount !== 1 ? 's are' : ' is'}</strong> selected.
            `;
            // Insert after the amount select field
            paymentAmountSelect.parentElement.insertBefore(validationMessage, paymentAmountSelect.nextSibling);
        } else if (selectedPlayerCount !== expectedPlayerCount) {
            // Amount matches but player count doesn't - show warning
            const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
            const validationMessage = document.createElement('div');
            validationMessage.id = 'paymentAmountValidationMessage';
            validationMessage.className = 'alert alert-warning mt-2';
            validationMessage.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Player Count Mismatch:</strong> The selected amount (${formatCurrency(selectedAmount)}) includes ${formatCurrency(extraAmount)} in ${sanctionFeeName}, 
                which suggests <strong>${expectedPlayerCount} player${expectedPlayerCount !== 1 ? 's' : ''}</strong> should be selected for sanction fees. 
                Currently <strong>${selectedPlayerCount} player${selectedPlayerCount !== 1 ? 's are' : ' is'}</strong> selected.
            `;
            // Insert after the amount select field
            paymentAmountSelect.parentElement.insertBefore(validationMessage, paymentAmountSelect.nextSibling);
        }
    }
}
