async function createDivisionFromManualBuilder() {
    const searchContainer = document.getElementById('smartBuilderModal') || document;
    const isDoublePlayCheckbox = searchContainer.querySelector('#smartBuilderIsDoublePlay') || document.getElementById('smartBuilderIsDoublePlay');
    const isDoublePlay = !!(isDoublePlayCheckbox?.checked);
    let divisionName = '';
    const duesPerPlayerField = searchContainer.querySelector('#smartBuilderWeeklyDues') || document.getElementById('smartBuilderWeeklyDues');
    const duesPerPlayer = parseFloat(duesPerPlayerField?.value || '8') || 8;
    const smartBuilderPlayersPerWeek = getSmartBuilderPlayersPerWeek(searchContainer);
    const totalWeeksField = searchContainer.querySelector('#smartBuilderTotalWeeks') || document.getElementById('smartBuilderTotalWeeks');
    const smartBuilderTotalWeeks = parseInt(totalWeeksField?.value || '20', 10) || 20;
    const startDateField = searchContainer.querySelector('#smartBuilderStartDate') || document.getElementById('smartBuilderStartDate');
    const startDate = startDateField?.value || '';
    const endDateField = searchContainer.querySelector('#smartBuilderEndDate') || document.getElementById('smartBuilderEndDate');
    const endDate = endDateField?.value || '';
    const matchesPerWeek = getSmartBuilderMatchesPerWeek(searchContainer);
    const matchesSel = searchContainer.querySelector('#smartBuilderMatchesPerWeek') || document.getElementById('smartBuilderMatchesPerWeek');
    const playersSel = searchContainer.querySelector('#smartBuilderPlayersPerWeek') || document.getElementById('smartBuilderPlayersPerWeek');
    const matchesOther = searchContainer.querySelector('#smartBuilderMatchesPerWeekOther') || document.getElementById('smartBuilderMatchesPerWeekOther');
    const playersOther = searchContainer.querySelector('#smartBuilderPlayersPerWeekOther') || document.getElementById('smartBuilderPlayersPerWeekOther');
    if (matchesSel?.value === 'other' && (!matchesOther?.value || parseInt(matchesOther.value, 10) < 1)) {
        showAlertModal('Please enter a valid number for custom matches per week.', 'warning', 'Matches per Week');
        return;
    }
    if (playersSel?.value === 'other' && (!playersOther?.value || parseInt(playersOther.value, 10) < 1)) {
        showAlertModal('Please enter a valid number for custom players per week.', 'warning', 'Players per Week');
        return;
    }
    if (!startDate) {
        showAlertModal('Please select a season start date', 'warning', 'Missing Start Date');
        return;
    }
    if (isDoublePlay) {
        const d1 = (searchContainer.querySelector('#smartBuilderDivisionName') || document.getElementById('smartBuilderDivisionName'))?.value?.trim() || '';
        const d2 = (searchContainer.querySelector('#smartBuilderDivision2Name') || document.getElementById('smartBuilderDivision2Name'))?.value?.trim() || '';
        const g1 = (searchContainer.querySelector('#smartBuilderGameType') || document.getElementById('smartBuilderGameType'))?.value?.trim() || '';
        const g2 = (searchContainer.querySelector('#smartBuilderSecondGameType') || document.getElementById('smartBuilderSecondGameType'))?.value?.trim() || '';
        if (!d1 || !d2 || !g1 || !g2) {
            showAlertModal('For double play, enter Division 1 & 2 names and select both game types.', 'warning', 'Missing Fields');
            return;
        }
        divisionName = `${d1} - ${g1} / ${d2} - ${g2}`;
    } else {
        const baseName = (searchContainer.querySelector('#smartBuilderDivisionName') || document.getElementById('smartBuilderDivisionName'))?.value?.trim() || '';
        const gameType = (searchContainer.querySelector('#smartBuilderGameType') || document.getElementById('smartBuilderGameType'))?.value?.trim() || '';
        if (!baseName || !gameType) {
            showAlertModal('Please enter a division name and select a game type', 'warning', 'Missing Fields');
            return;
        }
        divisionName = `${baseName} - ${gameType}`;
    }
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: duesPerPlayer,
        playersPerWeek: smartBuilderPlayersPerWeek,
        numberOfTeams: 0,
        totalWeeks: smartBuilderTotalWeeks,
        startDate,
        endDate: endDate || calculateEndDateFromStart(startDate, smartBuilderTotalWeeks),
        isDoublePlay,
        currentTeams: 0,
        isActive: true,
        description: 'Division created via manual builder',
        color: typeof getUnusedDivisionColor === 'function' ? getUnusedDivisionColor() : null
    };
    if (isDoublePlay) {
        divisionData.firstMatchesPerWeek = matchesPerWeek;
        divisionData.secondMatchesPerWeek = matchesPerWeek;
    } else {
        divisionData.matchesPerWeek = matchesPerWeek;
    }
    const useDollar = (searchContainer.querySelector('#smartBuilderMethodDollar') || document.getElementById('smartBuilderMethodDollar'))?.checked;
    if (useDollar) {
        divisionData.useDollarAmounts = true;
        const prizeAmt = parseFloat((searchContainer.querySelector('#smartBuilderPrizeFundAmount') || document.getElementById('smartBuilderPrizeFundAmount'))?.value);
        const firstAmt = parseFloat((searchContainer.querySelector('#smartBuilderFirstOrgAmount') || document.getElementById('smartBuilderFirstOrgAmount'))?.value);
        const secondAmt = parseFloat((searchContainer.querySelector('#smartBuilderSecondOrgAmount') || document.getElementById('smartBuilderSecondOrgAmount'))?.value);
        if (!isNaN(prizeAmt)) divisionData.prizeFundAmount = prizeAmt;
        if (!isNaN(firstAmt)) divisionData.firstOrganizationAmount = firstAmt;
        if (!isNaN(secondAmt)) divisionData.secondOrganizationAmount = secondAmt;
        const prizeType = (searchContainer.querySelector('input[name="smartBuilderPrizeFundAmountType"]:checked') || document.querySelector('input[name="smartBuilderPrizeFundAmountType"]:checked'))?.value;
        const firstType = (searchContainer.querySelector('input[name="smartBuilderFirstOrgAmountType"]:checked') || document.querySelector('input[name="smartBuilderFirstOrgAmountType"]:checked'))?.value;
        const secondType = (searchContainer.querySelector('input[name="smartBuilderSecondOrgAmountType"]:checked') || document.querySelector('input[name="smartBuilderSecondOrgAmountType"]:checked'))?.value;
        if (prizeType) divisionData.prizeFundAmountType = prizeType;
        if (firstType) divisionData.firstOrganizationAmountType = firstType;
        if (secondType) divisionData.secondOrganizationAmountType = secondType;
    } else {
        const prizePct = parseFloat((searchContainer.querySelector('#smartBuilderPrizeFundPct') || document.getElementById('smartBuilderPrizeFundPct'))?.value);
        const firstPct = parseFloat((searchContainer.querySelector('#smartBuilderFirstOrgPct') || document.getElementById('smartBuilderFirstOrgPct'))?.value);
        const secondPct = parseFloat((searchContainer.querySelector('#smartBuilderSecondOrgPct') || document.getElementById('smartBuilderSecondOrgPct'))?.value);
        if (!isNaN(prizePct)) divisionData.prizeFundPercentage = prizePct;
        if (!isNaN(firstPct)) divisionData.firstOrganizationPercentage = firstPct;
        if (!isNaN(secondPct)) divisionData.secondOrganizationPercentage = secondPct;
    }
    try {
        const res = await apiCall('/divisions', { method: 'POST', body: JSON.stringify(divisionData) });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to create division');
        }
        const inHouseCb = document.getElementById('manualBuilderInHouseCheckbox');
        const inHouseInput = document.getElementById('manualBuilderInHouseLocation');
        if (inHouseCb?.checked && inHouseInput?.value?.trim()) {
            try {
                const key = 'duesTracker_division_default_location';
                const stored = JSON.parse(localStorage.getItem(key) || '{}');
                stored[divisionName] = inHouseInput.value.trim();
                localStorage.setItem(key, JSON.stringify(stored));
            } catch (e) { console.warn('Could not save default location:', e); }
        }
        const modal = document.getElementById('smartBuilderModal');
        if (modal) { const m = bootstrap.Modal.getInstance(modal); if (m) m.hide(); }
        await loadData();
        if (typeof displayDivisions === 'function') displayDivisions();
        if (typeof updateDivisionDropdown === 'function') updateDivisionDropdown();
        if (typeof filterTeamsByDivision === 'function') filterTeamsByDivision();
        showAlertModal('Division created successfully!', 'success', 'Success');
    } catch (e) {
        console.error('createDivisionFromManualBuilder:', e);
        showAlertModal(e?.message || 'Error creating division. Please try again.', 'error', 'Error');
    }
}
