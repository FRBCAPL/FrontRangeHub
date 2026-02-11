function populateWeeklyPaymentAmountDropdown(team, teamDivision) {
    console.log('populateWeeklyPaymentAmountDropdown called with team:', team);
    console.log('Team division dues rate:', team.divisionDuesRate);
    console.log('Team members count:', team.teamMembers ? team.teamMembers.length : 0);
    
    const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
    paymentAmountSelect.innerHTML = '<option value="">Select Amount</option>';
    
    // Calculate the weekly team dues amount
    // Formula: dues per player × players per week × (single play = 1, double play = 2 multiplier)
    // Prefer the live division settings; fall back to the team's stored rate if needed
    const duesRate = teamDivision?.duesPerPlayerPerMatch ?? team.divisionDuesRate ?? 0;
    const individualDuesRate = parseFloat(duesRate) || 0; // Parse as float
    const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5; // Parse as integer, get from division settings
    // Single play: dues × players × 1, Double play: dues × players × 2
    const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
    const weeklyTeamDues = individualDuesRate * playersPerWeek * doublePlayMultiplier;
    
    console.log('Individual dues rate:', individualDuesRate);
    console.log('Players per week:', playersPerWeek);
    console.log('Play multiplier:', doublePlayMultiplier, teamDivision && teamDivision.isDoublePlay ? '(double play = 2x)' : '(single play = 5 matches)');
    console.log('Is double play:', teamDivision && teamDivision.isDoublePlay);
    console.log('Weekly team dues:', weeklyTeamDues);
    
    // Add the base weekly team dues amount
    const baseOption = document.createElement('option');
    baseOption.value = weeklyTeamDues;
    baseOption.textContent = `${formatCurrency(weeklyTeamDues)} (Weekly Team Dues)`;
    paymentAmountSelect.appendChild(baseOption);
    console.log('Added base weekly dues option:', baseOption.textContent);
    
    // Calculate profit per player (used in both sanction fee sections)
    const profitPerPlayer = sanctionFeeAmount > 0 && sanctionFeesEnabled ? getSanctionFeeProfitPerPlayer() : 0;
    
    // Add options for weekly team dues + sanction fees (only if sanction fees are enabled)
    if (sanctionFeeAmount > 0 && sanctionFeesEnabled) {
        const maxPlayers = team.teamMembers ? team.teamMembers.length : 10;
        
        console.log(`Adding ${sanctionFeeName} options for up to`, maxPlayers, 'players');
        
        // Add options for weekly dues + sanction fees for different numbers of players
        for (let playerCount = 1; playerCount <= maxPlayers; playerCount++) {
            const sanctionCollectionAmount = sanctionFeeAmount * playerCount;
            const sanctionPayoutAmount = sanctionFeePayoutAmount * playerCount;
            const sanctionProfit = profitPerPlayer * playerCount;
            const totalAmount = weeklyTeamDues + sanctionCollectionAmount;
            
            const option = document.createElement('option');
            option.value = totalAmount;
            option.textContent = `${formatCurrency(totalAmount)} (Weekly: ${formatCurrency(weeklyTeamDues)} + ${sanctionFeeName}: ${formatCurrency(sanctionCollectionAmount)} | Profit: ${formatCurrency(sanctionProfit)})`;
            // Add data attributes for detailed breakdown
            option.dataset.sanctionCollection = sanctionCollectionAmount.toFixed(2);
            option.dataset.sanctionPayout = sanctionPayoutAmount.toFixed(2);
            option.dataset.sanctionProfit = sanctionProfit.toFixed(2);
            option.dataset.playerCount = playerCount;
            paymentAmountSelect.appendChild(option);
            console.log('Added combined option:', option.textContent);
        }
        
        // Add sequential options for extra players beyond team size - fill in all gaps
        // This ensures no gaps in the dropdown
        const maxTotalPlayers = Math.max(maxPlayers + 5, 15); // At least 5 more than team size, or 15 minimum
        
        for (let totalPlayerCount = maxPlayers + 1; totalPlayerCount <= maxTotalPlayers; totalPlayerCount++) {
            const totalSanctionAmount = sanctionFeeAmount * totalPlayerCount;
            const totalPayoutAmount = sanctionFeePayoutAmount * totalPlayerCount;
            const totalProfit = profitPerPlayer * totalPlayerCount;
            const totalAmount = weeklyTeamDues + totalSanctionAmount;
            
            const option = document.createElement('option');
            option.value = totalAmount;
            option.textContent = `${formatCurrency(totalAmount)} (Weekly: ${formatCurrency(weeklyTeamDues)} + ${sanctionFeeName}: ${formatCurrency(totalSanctionAmount)} (${totalPlayerCount} players) | Profit: ${formatCurrency(totalProfit)})`;
            option.dataset.sanctionCollection = totalSanctionAmount.toFixed(2);
            option.dataset.sanctionPayout = totalPayoutAmount.toFixed(2);
            option.dataset.sanctionProfit = totalProfit.toFixed(2);
            option.dataset.playerCount = totalPlayerCount;
            option.dataset.isExtra = 'true';
            paymentAmountSelect.appendChild(option);
            console.log('Added extra player option:', option.textContent);
        }
        
        // Add common round payment amounts (for convenience) - only if beyond the sequential range
        const commonAmounts = [
            weeklyTeamDues + (sanctionFeeAmount * 20), // 20 players worth
            weeklyTeamDues + (sanctionFeeAmount * 25), // 25 players worth
            weeklyTeamDues + (sanctionFeeAmount * 30)  // 30 players worth
        ];
        
        commonAmounts.forEach(amount => {
            // Only add if it's beyond what we've already added sequentially
            if (amount > weeklyTeamDues + (sanctionFeeAmount * maxTotalPlayers)) {
                const extraSanctionAmount = amount - weeklyTeamDues;
                const playerCount = Math.round(extraSanctionAmount / sanctionFeeAmount);
                const extraPayoutAmount = sanctionFeePayoutAmount * playerCount;
                const extraProfit = profitPerPlayer * playerCount;
                
                const option = document.createElement('option');
                option.value = amount;
                option.textContent = `${formatCurrency(amount)} (Weekly: ${formatCurrency(weeklyTeamDues)} + Extra ${sanctionFeeName}: ${formatCurrency(extraSanctionAmount)} ~${playerCount} players | Profit: ${formatCurrency(extraProfit)})`;
                option.dataset.sanctionCollection = extraSanctionAmount.toFixed(2);
                option.dataset.sanctionPayout = extraPayoutAmount.toFixed(2);
                option.dataset.sanctionProfit = extraProfit.toFixed(2);
                option.dataset.playerCount = playerCount;
                option.dataset.isExtra = 'true';
                paymentAmountSelect.appendChild(option);
            }
        });
    }
    
    console.log('Total options added:', paymentAmountSelect.options.length);
}

function updateWeeklyPaymentAmount() {
    const selectedAmount = parseFloat(document.getElementById('weeklyPaymentAmount').value) || 0;
    validatePaymentAmount();
}

// Function to validate payment amount matches selected sanction fee players
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

// Populate "Paid By" player dropdown with team members
function populatePaidByPlayerDropdown(team) {
    const dropdown = document.getElementById('paidByPlayer');
    if (!dropdown) return;
    
    // Clear existing options except the first placeholder
    dropdown.innerHTML = '<option value="">Select player...</option>';
    
    if (!team || !team.teamMembers || team.teamMembers.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No team members found';
        option.disabled = true;
        dropdown.appendChild(option);
        return;
    }
    
    // Add each team member as an option
    team.teamMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = formatPlayerName(member.name);
        dropdown.appendChild(option);
    });
}

// Toggle "Paid By" dropdown visibility and required status based on payment method
function togglePaidByPlayerDropdown() {
    const container = document.getElementById('paidByPlayerContainer');
    const dropdown = document.getElementById('paidByPlayer');
    const requiredIndicator = document.getElementById('paidByPlayerRequired');
    const helpText = document.getElementById('paidByPlayerHelp');
    const methodEl = document.getElementById('weeklyPaymentMethod');
    
    if (!container || !dropdown || !methodEl) return;
    
    const paymentMethod = methodEl.value;
    const isCash = paymentMethod === 'cash';
    
    if (isCash) {
        // Hide for cash payments (optional)
        container.style.display = 'none';
        dropdown.removeAttribute('required');
        if (requiredIndicator) requiredIndicator.style.display = 'none';
        if (helpText) helpText.textContent = 'Select which player made this payment (optional for cash)';
    } else {
        // Show for non-cash payments (required)
        container.style.display = 'block';
        dropdown.setAttribute('required', 'required');
        if (requiredIndicator) requiredIndicator.style.display = 'inline';
        if (helpText) helpText.textContent = 'Select which player made this payment (required for non-cash payments)';
        // Auto-select Paid when user chooses a non-cash method (they're recording a payment)
        const paidYesEl = document.getElementById('weeklyPaidYes');
        if (paidYesEl) paidYesEl.checked = true;
    }
}

// Attach togglePaidByPlayerDropdown to window for inline onchange
if (typeof window !== 'undefined') {
    window.togglePaidByPlayerDropdown = togglePaidByPlayerDropdown;
}

function populateBCASanctionPlayers(team) {
    const listEl = document.getElementById('bcaSanctionPlayersList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (team.teamMembers && team.teamMembers.length > 0) {
        // Check if any players have been sanctioned via payment modals
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

        const feeLabel = typeof formatCurrency === 'function' && sanctionFeeAmount != null
            ? formatCurrency(sanctionFeeAmount)
            : '$0.00';

        let playersNeedingSanction = 0;

        team.teamMembers.forEach((member, index) => {
            const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
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

/* players -> dues-players.js */

function showPaymentHistory(teamId) {
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found for payment history:', teamId);
            showAlertModal('Team not found.', 'error', 'Error');
            return;
        }
        
        const teamDivision = divisions.find(d =>
            d.name === team.division || d._id === team.division || d.id === team.division
        );
        if (!teamDivision) {
            console.error('Division not found for team:', team.division);
            showAlertModal('Division not found for this team.', 'error', 'Error');
            return;
        }
        
        // Populate team info (with null checks)
        const teamNameEl = document.getElementById('paymentHistoryTeamName');
        const divisionEl = document.getElementById('paymentHistoryDivision');
        const duesRateEl = document.getElementById('paymentHistoryDuesRate');
        const totalWeeksEl = document.getElementById('paymentHistoryTotalWeeks');
        const weeklyDuesEl = document.getElementById('paymentHistoryWeeklyDues');
        
        const duesRate = teamDivision.duesPerPlayerPerMatch ?? team.divisionDuesRate ?? 0;
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
        
        if (teamNameEl) teamNameEl.textContent = team.teamName;
        if (divisionEl) divisionEl.textContent = team.division;
        if (duesRateEl) duesRateEl.textContent = formatCurrency(duesRate);
        if (totalWeeksEl) totalWeeksEl.textContent = teamDivision.totalWeeks;
        if (weeklyDuesEl) weeklyDuesEl.textContent = formatCurrency(weeklyDues);
        
        // Update modal title with team name and location (if present)
        const modalTitle = document.querySelector('#paymentHistoryModal .modal-title');
        if (modalTitle) {
            const locationPart = team.location && team.location.trim()
                ? ` · ${team.location.trim()}`
                : '';
            modalTitle.textContent = `Payment History - ${team.teamName}${locationPart}`;
        }
        
        // Populate payment history table
        const tbody = document.getElementById('paymentHistoryTableBody');
        if (!tbody) {
            console.error('Payment history table body not found!');
            showAlertModal('Payment history table not found. Please refresh the page.', 'error', 'Error');
            return;
        }
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
        const isPaid = weekPayment && weekPayment.paid === 'true';
        const isBye = weekPayment && weekPayment.paid === 'bye';
        const isMakeup = weekPayment && weekPayment.paid === 'makeup';
        
        // Calculate week date
        let weekDate = '-';
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            const weekStartDate = new Date(startDate);
            weekStartDate.setDate(startDate.getDate() + (week - 1) * 7);
            // Format date without timezone conversion (use local date components)
            const monthNum = weekStartDate.getMonth() + 1; // getMonth() is 0-indexed
            const dayNum = weekStartDate.getDate();
            const yearNum = weekStartDate.getFullYear();
            weekDate = `${monthNum}/${dayNum}/${yearNum}`;
        }
        
        if (isPaid) {
            totalPaid += weekPayment.amount || 0;
            weeksPaid++;
        }
        
        const statusTitle = isPaid ? 'Paid' : isBye ? 'Bye week' : isMakeup ? 'Makeup (make-up match)' : 'Unpaid';
        const amountDisplay = isPaid
            ? (weekPayment.amount != null ? formatCurrency(weekPayment.amount) : '-')
            : formatCurrency(weeklyDues) + ' (due)';
        // Format paid by player name if it exists
        const paidByDisplay = isPaid && weekPayment.paidBy 
            ? formatPlayerName(weekPayment.paidBy) 
            : '-';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><small>${week}</small></td>
            <td><small>${weekDate}</small></td>
            <td>
                <span class="badge bg-${isPaid ? 'success' : isBye ? 'info' : isMakeup ? 'warning' : 'danger'} badge-sm" title="${statusTitle}">
                    <i class="fas fa-${isPaid ? 'check' : isBye ? 'pause' : isMakeup ? 'clock' : 'times'}"></i>
                </span>
            </td>
            <td><small>${amountDisplay}</small></td>
            <td><small>${isPaid ? (weekPayment.paymentMethod || '-') : '-'}</small></td>
            <td><small>${paidByDisplay}</small></td>
            <td><small>${isPaid && weekPayment.paymentDate ? formatDateFromISO(weekPayment.paymentDate) : '-'}</small></td>
            <td><small>${isPaid ? (weekPayment.notes || '-') : '-'}</small></td>
            <td>
                <button class="btn btn-outline-primary btn-sm" onclick="openPaymentModalFromHistory('${team._id}', ${week})" title="Edit / record payment">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
    
        // Update summary (with null checks)
        const totalPaidEl = document.getElementById('paymentHistoryTotalPaid');
        const weeksPaidEl = document.getElementById('paymentHistoryWeeksPaid');
        if (totalPaidEl) totalPaidEl.textContent = formatCurrency(totalPaid);
        if (weeksPaidEl) weeksPaidEl.textContent = weeksPaid;
        
        // Calculate status (optional - only if element exists)
        const statusBadge = document.getElementById('paymentHistoryStatus');
        if (statusBadge) {
            let isCurrent = true;
            for (let week = 1; week <= actualCurrentWeek; week++) {
                const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
                    isCurrent = false;
                    break;
                }
            }
            statusBadge.textContent = isCurrent ? 'Current' : 'Behind';
            statusBadge.className = `badge bg-${isCurrent ? 'success' : 'danger'}`;
        }
        
        // Show the modal
        const modal = document.getElementById('paymentHistoryModal');
        if (modal) {
            new bootstrap.Modal(modal).show();
        } else {
            console.error('Payment history modal not found!');
            showAlertModal('Payment history modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error showing payment history:', error);
        showAlertModal('Error loading payment history. Please try again.', 'error', 'Error');
    }
}

