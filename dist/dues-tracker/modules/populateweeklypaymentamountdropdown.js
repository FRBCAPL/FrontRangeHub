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
    
    // Add weekly dues + green fee option (when green fees enabled)
    if (typeof greenFeesEnabled !== 'undefined' && greenFeesEnabled && (typeof greenFeeAmount === 'number' ? greenFeeAmount > 0 : parseFloat(greenFeeAmount || 0) > 0)) {
        const gfAmt = typeof greenFeeAmount === 'number' ? greenFeeAmount : parseFloat(greenFeeAmount || 0) || 0;
        const totalWithGreen = weeklyTeamDues + gfAmt;
        const greenOption = document.createElement('option');
        greenOption.value = totalWithGreen;
        greenOption.textContent = `${formatCurrency(totalWithGreen)} (Weekly + ${typeof greenFeeName !== 'undefined' ? greenFeeName : 'Green Fee'} ${formatCurrency(gfAmt)})`;
        greenOption.dataset.includesGreenFee = 'true';
        paymentAmountSelect.appendChild(greenOption);
        console.log('Added weekly + green fee option:', greenOption.textContent);
    }
    
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
