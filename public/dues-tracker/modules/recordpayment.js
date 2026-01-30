async function recordPayment() {
    if (!currentTeamId) {
        showAlertModal('No team selected for payment.', 'error', 'Error');
        return;
    }
    
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentAmountEl = document.getElementById('paymentAmount');
    const paymentNotesEl = document.getElementById('paymentNotes');
    
    if (!paymentMethodEl || !paymentAmountEl) {
        showAlertModal('Payment form fields not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    const paymentData = {
        paymentMethod: paymentMethodEl.value,
        amount: paymentAmountEl.value,
        notes: paymentNotesEl ? paymentNotesEl.value : ''
    };
    
    // Validate required fields
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        showAlertModal('Please select a valid payment amount.', 'warning', 'Validation Error');
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${currentTeamId}/pay-dues`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            const paymentModal = document.getElementById('paymentModal');
            if (paymentModal) {
                const modalInstance = bootstrap.Modal.getInstance(paymentModal);
                if (modalInstance) modalInstance.hide();
            }
            
            // Preserve current division filter and pagination before reloading data
            const divisionFilterEl = document.getElementById('divisionFilter');
            const currentDivisionFilter = divisionFilterEl ? divisionFilterEl.value : 'all';
            
            // Preserve current page when recording payment (team stays in same position)
            await loadData(false);
            
            // Restore the division filter after data is reloaded
            if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                const restoredFilterEl = document.getElementById('divisionFilter');
                if (restoredFilterEl) {
                    restoredFilterEl.value = currentDivisionFilter;
                    await filterTeamsByDivision();
                }
            }
            
            showAlertModal('Payment recorded successfully!', 'success', 'Success');
        } else {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(error.message || 'Error recording payment', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        showAlertModal('Error recording payment. Please try again.', 'error', 'Error');
    }
}
