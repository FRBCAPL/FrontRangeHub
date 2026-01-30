function updateDivisionSpecificSummary(division) {
    const card = document.getElementById('divisionSpecificSummary');
    if (!card) {
        console.warn('updateDivisionSpecificSummary: divisionSpecificSummary element not found');
        return;
    }

    // Always show the card; content depends on whether a division is selected
    card.style.display = 'block';
    
    // Get the card element inside the container
    const cardElement = card.querySelector('.card');
    if (!cardElement) {
        console.warn('updateDivisionSpecificSummary: .card element not found inside divisionSpecificSummary');
        return;
    }
    
    if (division) {
        // Division selected: use the same color as the division badge
        const divisionColorClass = getDivisionClass(division.name);
        cardElement.className = `card border-0 shadow-sm h-100 ${divisionColorClass}`;
        cardElement.style.backgroundColor = ''; // Reset inline styles to use class
        cardElement.style.color = ''; // Reset inline styles to use class
        
        // Reset child element styles to use class colors (all division colors use white text)
        const cardBody = cardElement.querySelector('.card-body');
        if (cardBody) {
            cardBody.style.color = '';
        }
        const titleEl = cardElement.querySelector('#divisionSpecificTitle');
        if (titleEl) {
            titleEl.style.color = '';
            titleEl.style.opacity = '0.75';
        }
        const valueEl = cardElement.querySelector('#divisionSpecificCollected');
        if (valueEl) {
            valueEl.style.color = '';
        }
        const subtitleEl = cardElement.querySelector('#divisionSpecificSubtitle');
        if (subtitleEl) {
            subtitleEl.style.color = '';
            subtitleEl.style.opacity = '0.75';
        }
        const icon = cardElement.querySelector('.fa-layer-group');
        if (icon) {
            icon.style.color = '';
        }
        
        console.log('updateDivisionSpecificSummary: Set card to division color', divisionColorClass, 'for division:', division.name);
    } else {
        // All Teams selected: black background with white text
        cardElement.className = 'card border-0 shadow-sm h-100 bg-dark text-white';
        cardElement.style.backgroundColor = ''; // Reset to use class
        cardElement.style.color = ''; // Reset to use class
        
        // Reset child element styles
        const cardBody = cardElement.querySelector('.card-body');
        if (cardBody) {
            cardBody.style.color = '';
        }
        const titleEl = cardElement.querySelector('#divisionSpecificTitle');
        if (titleEl) {
            titleEl.style.color = '';
            titleEl.style.opacity = '';
        }
        const valueEl = cardElement.querySelector('#divisionSpecificCollected');
        if (valueEl) {
            valueEl.style.color = '';
        }
        const subtitleEl = cardElement.querySelector('#divisionSpecificSubtitle');
        if (subtitleEl) {
            subtitleEl.style.color = '';
            subtitleEl.style.opacity = '';
        }
        const icon = cardElement.querySelector('.fa-layer-group');
        if (icon) {
            icon.style.color = '';
        }
        
        console.log('updateDivisionSpecificSummary: Set card to black (bg-dark text-white) for All Teams');
    }

    const titleEl = document.getElementById('divisionSpecificTitle');
    const subtitleEl = document.getElementById('divisionSpecificSubtitle');
    const valueEl = document.getElementById('divisionSpecificCollected');

    if (!titleEl || !subtitleEl || !valueEl) return;

    if (!division) {
        // All Teams selected: show total number of active divisions
        const activeDivisions = (divisions || []).filter(d => {
            if (!d) return false;
            if (d._id && String(d._id).startsWith('temp_')) return false;
            if (d.id && String(d.id).startsWith('temp_')) return false;
            if (!d.isActive && d.description === 'Temporary') return false;
            return true;
        });

        titleEl.textContent = 'Divisions';
        subtitleEl.textContent = 'Total active divisions';
        valueEl.textContent = activeDivisions.length.toString();
        return;
    }

    // Specific division selected: show total dues collected (excluding sanction fees) for that division
    titleEl.textContent = `${division.name} - Total Dues Collected`;
    subtitleEl.innerHTML = `All dues collected for ${division.name}<br><small>(sanction fees excluded)</small>`;

    const projectionPeriodCap = (window.projectionPeriod || 'end');
    const showProjectedOnly = projectionMode && projectionPeriodCap !== 'end';
    const dateRangeReport = window.dateRangeReportMode && typeof window.getDateRangeReportBounds === 'function' ? window.getDateRangeReportBounds() : null;

    let divisionTotalCollected = 0;
    const divisionTeams = teams.filter(team => !team.isArchived && team.isActive !== false && team.division === division.name);

    divisionTeams.forEach(team => {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) return;

        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const duesRate = teamDivision.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
        const expectedWeeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;

        if ((!showProjectedOnly || dateRangeReport) && team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (!isPaid || !payment.amount) return;
                if (dateRangeReport && typeof window.isPaymentInDateRange === 'function') {
                    if (!window.isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                }
                let netDues = expectedWeeklyDues;
                if (!netDues) {
                    let bcaSanctionAmount = 0;
                    if (payment.bcaSanctionPlayers && payment.bcaSanctionPlayers.length > 0) {
                        bcaSanctionAmount = payment.bcaSanctionPlayers.length * sanctionFeeAmount;
                    } else if (payment.bcaSanctionFee) {
                        bcaSanctionAmount = sanctionFeeAmount;
                    }
                    netDues = (parseFloat(payment.amount) || 0) - bcaSanctionAmount;
                }
                divisionTotalCollected += netDues;
            });
        }

        if ((projectionMode || showProjectedOnly) && !dateRangeReport && teamDivision) {
            let actualCurrentWeek = 1;
            if (teamDivision.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                actualCurrentWeek = Math.floor(daysDiff / 7) + 1;
                actualCurrentWeek = Math.max(1, actualCurrentWeek);
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (actualCurrentWeek > 1 && daysIntoCurrentWeek <= gracePeriodDays) {
                    actualCurrentWeek = actualCurrentWeek - 1;
                }
            }
            const remainingWeeks = (typeof getProjectionRemainingWeeks === 'function')
                ? getProjectionRemainingWeeks(teamDivision, actualCurrentWeek)
                : getRemainingWeeks(teamDivision, actualCurrentWeek);
            divisionTotalCollected += remainingWeeks * expectedWeeklyDues;
        }
    });

    let collectedText = formatCurrency(divisionTotalCollected);
    if (dateRangeReport) collectedText = `${formatCurrency(divisionTotalCollected)} (in period)`;
    else if (projectionMode) collectedText = `${formatCurrency(divisionTotalCollected)} (Projected)`;
    valueEl.textContent = collectedText;
}
