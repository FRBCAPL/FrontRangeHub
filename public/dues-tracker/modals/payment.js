function showPaymentModal(teamId) {
    currentTeamId = teamId;
    
    const paymentForm = document.getElementById('paymentForm');
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentModal = document.getElementById('paymentModal');
    const paymentSuccess = document.getElementById('paymentSuccess');
    const paymentFooter = document.querySelector('#paymentModal .modal-footer');
    
    if (!paymentForm || !paymentMethodEl || !paymentModal) {
        showAlertModal('Payment form elements not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    if (paymentSuccess) paymentSuccess.classList.add('d-none');
    if (paymentForm) paymentForm.style.display = '';
    if (paymentFooter) paymentFooter.style.display = '';
    paymentForm.reset();
    paymentMethodEl.value = 'cash';
    
    // Find the team to get division info
    const team = teams.find(t => t._id === teamId);
    if (team) {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (teamDivision) {
            populatePaymentAmountDropdown(team, teamDivision);
        }
    }
    
    new bootstrap.Modal(paymentModal).show();
}
