async function saveWeeklyPayment() {
    const paidEl = document.querySelector('input[name="weeklyPaid"]:checked');
    if (!paidEl) {
        showAlertModal('You are required to select a payment status (Paid, Bye week, Make up, or Unpaid) to save the payment.', 'warning', 'Payment Status Required');
        return;
    }
    const paid = paidEl.value;
    const paymentMethod = document.getElementById('weeklyPaymentMethod').value;
    const paymentDateInput = document.getElementById('weeklyPaymentDate');
    let paymentDate = paymentDateInput ? paymentDateInput.value : null;
    const amountSelect = document.getElementById('weeklyPaymentAmount');
    const amountRaw = amountSelect ? amountSelect.value : '';

    // Collect individual player payments (use row-based iteration to avoid selector issues with special chars)
    const individualPayments = [];
    const enableIndividual = document.getElementById('enableIndividualPayments');
    if (enableIndividual && enableIndividual.checked) {
        const rows = document.querySelectorAll('.individual-payment-row');
        rows.forEach(row => {
            const playerName = row.getAttribute('data-player') || '';
            const input = row.querySelector('input[name="individualPayment"]');
            const methodSelect = row.querySelector('select[name="individualPaymentMethod"]');
            const dateInput = row.querySelector('input[name="individualPaymentDate"]');
            const paymentAmount = input ? (parseFloat(input.value) || 0) : 0;
            if (paymentAmount > 0 && playerName) {
                const pm = methodSelect ? (methodSelect.value || 'cash') : 'cash';
                const paymentDate = dateInput && dateInput.value ? dateInput.value : null;
                individualPayments.push({
                    playerName: playerName,
                    amount: paymentAmount,
                    paymentMethod: pm,
                    paymentDate: paymentDate
                });
            }
        });
    }
    const individualTotal = individualPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // If marked as paid or partial, require a dues amount (from dropdown OR individual payments total)
    if (paid === 'true' || paid === 'partial') {
        const amountFromDropdown = amountRaw && !isNaN(parseFloat(amountRaw)) ? parseFloat(amountRaw) : 0;
        const effectiveAmount = individualTotal > 0 ? individualTotal : amountFromDropdown;
        if (effectiveAmount <= 0) {
            showAlertModal(
                individualPayments.length > 0
                    ? 'Enter at least one individual payment amount, or select the team amount above.'
                    : 'Please select the dues amount paid for this week, or record per-player payments below.',
                'warning',
                'Amount Required'
            );
            if (amountSelect) amountSelect.focus();
            return;
        }
    }

    // Use individual payments total when available, otherwise use amount dropdown
    const amountFromDropdown = parseFloat(amountRaw || '0') || 0;
    const amount = individualTotal > 0 ? individualTotal : amountFromDropdown;

    // When using individual payments only, use earliest individual date if team date is empty
    if (individualPayments.length > 0 && (!paymentDate || !paymentDate.trim())) {
        const datesWithValues = individualPayments
            .map(p => p.paymentDate)
            .filter(d => d && d.trim());
        if (datesWithValues.length > 0) {
            paymentDate = datesWithValues.sort()[0];
        }
    }

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
    
    // Get "Paid By" player (required for non-cash when recording a payment - skip for unpaid/bye/makeup)
    const paidByEl = document.getElementById('paidByPlayer');
    const paidBy = paidByEl ? paidByEl.value : '';
    const isCash = paymentMethod === 'cash';
    const usingIndividualPayments = individualPayments.length > 0;

    // Validate "Paid By" for non-cash payments (skip when unpaid/bye/makeup - no payment; skip when using individual payments)
    const isRecordingPayment = paid === 'true' || paid === 'partial';
    if (isRecordingPayment && !usingIndividualPayments && !isCash && !paidBy) {
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
            
            // Update "Add another payment" button to include team name
            const addAnotherBtn = document.getElementById('weeklyPaymentAddAnotherBtn');
            if (addAnotherBtn && typeof currentWeeklyPaymentTeamId !== 'undefined') {
                const team = typeof teams !== 'undefined' && teams ? teams.find(t => t._id === currentWeeklyPaymentTeamId) : null;
                const teamName = team ? (team.teamName || team.name || '') : '';
                const safeName = (teamName || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                addAnotherBtn.innerHTML = teamName
                    ? '<i class="fas fa-plus me-1"></i>Add another payment for ' + safeName
                    : '<i class="fas fa-plus me-1"></i>Add another payment';
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
            
            loadData(true).then(() => {
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
