async function saveWeeklyPayment() {
    const paidEl = document.querySelector('input[name="weeklyPaid"]:checked');
    if (!paidEl) {
        showAlertModal('You are required to select a payment status (Paid, Bye week, Make up, or Unpaid) to save the payment.', 'warning', 'Payment Status Required');
        return;
    }
    const paid = paidEl.value;
    const paymentMethod = document.getElementById('weeklyPaymentMethod').value;
    const paymentDateInput = document.getElementById('weeklyPaymentDate');
    const paymentDate = paymentDateInput ? paymentDateInput.value : null; // Get date from input
    const amountSelect = document.getElementById('weeklyPaymentAmount');
    const amountRaw = amountSelect ? amountSelect.value : '';
    
    // If marked as paid, require a dues amount
    if (paid === 'true') {
        if (!amountRaw || isNaN(parseFloat(amountRaw)) || parseFloat(amountRaw) <= 0) {
            showAlertModal('Please select the dues amount paid for this week.', 'warning', 'Amount Required');
            if (amountSelect) {
                amountSelect.focus();
            }
            return;
        }
    }
    
    const amount = parseFloat(amountRaw || '0') || 0;
    const notes = document.getElementById('weeklyPaymentNotes').value;
    
    // Check if amount changed when editing an existing payment
    const isEditing = originalPaymentAmount !== null;
    const amountChanged = isEditing && Math.abs(amount - originalPaymentAmount) > 0.01; // Allow small rounding differences
    
    // Show appropriate message based on whether amount changed
    if (isEditing) {
        if (amountChanged) {
            // Amount changed - show warning that it will be recalculated (blocking)
            const confirmed = confirm('⚠️ WARNING: You are changing the payment amount.\n\nThis will recalculate totals and may affect financial reports.\n\nDo you want to continue?');
            if (!confirmed) {
                return; // User cancelled
            }
        } else {
            // Amount unchanged - inform user it won't affect calculations (non-blocking info)
            showAlertModal(
                'The payment amount has not changed. This edit will not affect calculations because the payment amount remains the same. Other changes (notes, payment method, etc.) will be saved.',
                'info',
                'Edit Notice'
            );
            // Continue with save (don't block)
        }
    }
    
    // Get "Paid By" player (required for non-cash payments)
    const paidByEl = document.getElementById('paidByPlayer');
    const paidBy = paidByEl ? paidByEl.value : '';
    const isCash = paymentMethod === 'cash';
    
    // Validate "Paid By" for non-cash payments
    if (!isCash && !paidBy) {
        showAlertModal('Please select which player made this payment. This is required for non-cash payment methods.', 'warning', 'Player Required');
        if (paidByEl) {
            paidByEl.focus();
        }
        return;
    }
    
    console.log('💾 Saving weekly payment - paymentDate:', paymentDate, 'paid:', paid, 'paidBy:', paidBy);
    
    // Collect selected sanction fee players
    const selectedBCAPlayers = [];
    const bcaCheckboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]:checked');
    bcaCheckboxes.forEach(checkbox => {
        selectedBCAPlayers.push(checkbox.value);
    });
    
    // Collect individual player payments only when toggle is on (they count toward this week's dues)
    const individualPayments = [];
    const enableIndividual = document.getElementById('enableIndividualPayments');
    if (enableIndividual && enableIndividual.checked) {
        const individualPaymentInputs = document.querySelectorAll('input[name="individualPayment"]');
        individualPaymentInputs.forEach(input => {
            const playerName = input.dataset.player;
            const paymentAmount = parseFloat(input.value) || 0;
            if (paymentAmount > 0 && playerName) {
                individualPayments.push({
                    playerName: playerName,
                    amount: paymentAmount
                });
            }
        });
    }

    try {
        const response = await apiCall(`/teams/${currentWeeklyPaymentTeamId}/weekly-payment`, {
            method: 'POST',
            body: JSON.stringify({
                week: currentWeeklyPaymentWeek,
                paid,
                paymentMethod,
                paymentDate: paymentDate || null, // Send payment date if provided, otherwise null (backend will handle)
                amount,
                notes,
                paidBy: paidBy || undefined, // Include paidBy if provided (optional for cash, required for others)
                bcaSanctionPlayers: selectedBCAPlayers,
                individualPayments: individualPayments.length > 0 ? individualPayments : undefined
            })
        });
        
        if (response.ok) {
            // Update global player status for players marked as paid in this payment
            // Since they're paying through weekly payment, mark as "Paid" (counts in totals)
            // This is different from the players modal where we ask - weekly payment = they're paying now
            if (paid === 'true' && selectedBCAPlayers && selectedBCAPlayers.length > 0) {
                for (const playerName of selectedBCAPlayers) {
                    try {
                        const normalizedName = playerName.trim();
                        // Mark as paid and clear previously sanctioned (since they're paying through weekly payment)
                        await apiCall(`/players/${encodeURIComponent(normalizedName)}/status`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                bcaSanctionPaid: true,
                                previouslySanctioned: false // Clear if they were marked as previously sanctioned
                            })
                        });
                    } catch (error) {
                        console.warn(`Failed to update global status for player "${playerName}":`, error);
                    }
                }
            }
            
            // Show success message in modal
            const successDiv = document.getElementById('weeklyPaymentSuccess');
            const successMessage = document.getElementById('weeklyPaymentSuccessMessage');
            const form = document.getElementById('weeklyPaymentForm');
            
            if (form) form.style.display = 'none';
            if (successDiv) {
                successDiv.classList.remove('d-none');
                if (successMessage) successMessage.textContent = 'Weekly payment saved successfully!';
            }
            
            const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
            if (modalFooter) modalFooter.style.display = 'none';
            
            const saveButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-success');
            const cancelButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-secondary');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.style.display = 'none';
            }
            if (cancelButton) cancelButton.style.display = 'none';
            
            const divisionFilterEl = document.getElementById('divisionFilter');
            const currentDivisionFilter = divisionFilterEl ? divisionFilterEl.value : 'all';
            
            loadData().then(() => {
                if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                    const df = document.getElementById('divisionFilter');
                    if (df) {
                        df.value = currentDivisionFilter;
                        if (typeof filterTeamsByDivision === 'function') filterTeamsByDivision();
                    }
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
