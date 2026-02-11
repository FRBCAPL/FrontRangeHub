function updateSanctionFeeSettings() {
    if (currentOperator) {
        // If sanction_fees_enabled is explicitly set, use it
        // Otherwise, default to true if sanction_fee_amount is set (backward compatibility)
        if (currentOperator.sanction_fees_enabled !== undefined && currentOperator.sanction_fees_enabled !== null) {
            sanctionFeesEnabled = currentOperator.sanction_fees_enabled === true || currentOperator.sanction_fees_enabled === 'true';
        } else {
            // Backward compatibility: if they have a sanction fee amount set, default to enabled
            const hasAmount = currentOperator.sanction_fee_amount && parseFloat(currentOperator.sanction_fee_amount) > 0;
            sanctionFeesEnabled = hasAmount;
        }
        
        sanctionFeeName = currentOperator.sanction_fee_name || 'Sanction Fee';
        sanctionFeeAmount = parseFloat(currentOperator.sanction_fee_amount) || 25.00;
        sanctionFeePayoutAmount = parseFloat(currentOperator.sanction_fee_payout_amount) || 20.00;
        
        // Load sanction start/end date settings
        const sanctionStartDateInput = document.getElementById('profileSanctionStartDate');
        const sanctionEndDateInput = document.getElementById('profileSanctionEndDate');
        if (sanctionStartDateInput && currentOperator.sanction_start_date) {
            const startDate = new Date(currentOperator.sanction_start_date);
            sanctionStartDateInput.value = startDate.toISOString().split('T')[0];
        } else if (sanctionStartDateInput) {
            // Default to Jan 1 of current year (or next year if Oct-Dec)
            const now = new Date();
            const currentMonth = now.getMonth();
            let sanctionYear = now.getFullYear();
            if (currentMonth >= 9) {
                sanctionYear = now.getFullYear() + 1;
            }
            sanctionStartDateInput.value = `${sanctionYear}-01-01`;
        }
        if (sanctionEndDateInput && currentOperator.sanction_end_date) {
            const endDate = new Date(currentOperator.sanction_end_date);
            sanctionEndDateInput.value = endDate.toISOString().split('T')[0];
        } else if (sanctionEndDateInput) {
            // Default to Dec 31 of current year (or next year if Oct-Dec)
            const now = new Date();
            const currentMonth = now.getMonth();
            let sanctionYear = now.getFullYear();
            if (currentMonth >= 9) {
                sanctionYear = now.getFullYear() + 1;
            }
            sanctionEndDateInput.value = `${sanctionYear}-12-31`;
        }
        
        console.log('✅ Sanction fee settings updated:', { sanctionFeesEnabled, sanctionFeeName, sanctionFeeAmount, sanctionFeePayoutAmount });
        
        // Show/hide sanction fee card and related UI based on whether fees are enabled
        toggleSanctionFeeUI(sanctionFeesEnabled);
        
        // Update UI labels dynamically
        updateSanctionFeeLabels();
    }
}
