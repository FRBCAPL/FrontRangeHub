/**
 * Smart Builder Summary - displays a detailed division summary before import.
 * User reviews the configuration, then continues to team preview and import.
 */
(function () {
    'use strict';

    function buildAndShowSummarySection() {
        const summarySection = document.getElementById('summarySection');
        const previewSection = document.getElementById('previewSection');
        const createTeamsBtn = document.getElementById('createTeamsBtn');
        const smartBuilderModal = document.getElementById('smartBuilderModal');

        if (!summarySection || !smartBuilderModal) return;

        const searchContainer = smartBuilderModal;

        // Ensure end date is calculated
        if (typeof calculateSmartBuilderEndDate === 'function') {
            calculateSmartBuilderEndDate();
        }

        // Division name
        const isDoublePlay = !!(searchContainer.querySelector('#smartBuilderIsDoublePlay')?.checked);
        let divisionName = '-';
        if (isDoublePlay) {
            const div1 = (searchContainer.querySelector('#smartBuilderDivisionName')?.value || '').trim();
            const div2 = (searchContainer.querySelector('#smartBuilderDivision2Name')?.value || '').trim();
            const gt1El = searchContainer.querySelector('#smartBuilderGameType') || searchContainer.querySelector('#smartBuilderFirstGameType');
            const gt1 = (gt1El?.value || '').trim();
            const gt2 = (searchContainer.querySelector('#smartBuilderSecondGameType')?.value || '').trim();
            if (div1 && div2 && gt1 && gt2) {
                divisionName = `${div1} - ${gt1} / ${div2} - ${gt2}`;
            } else if (div1 && div2) {
                divisionName = `${div1} / ${div2}`;
            } else if (div1) divisionName = div1;
        } else {
            const name = (searchContainer.querySelector('#smartBuilderDivisionName')?.value || '').trim();
            const gameType = (searchContainer.querySelector('#smartBuilderGameType')?.value || '').trim();
            divisionName = name && gameType ? `${name} - ${gameType}` : (name || '-');
        }

        // Matches per week
        const matchesPerWeek = typeof getSmartBuilderMatchesPerWeek === 'function'
            ? getSmartBuilderMatchesPerWeek(searchContainer) : 1;
        const matchesText = `${matchesPerWeek} match${matchesPerWeek !== 1 ? 'es' : ''} per week`;

        // Players per week
        const playersPerWeek = typeof getSmartBuilderPlayersPerWeek === 'function'
            ? getSmartBuilderPlayersPerWeek(searchContainer) : 5;
        const playersText = `${playersPerWeek} player${playersPerWeek !== 1 ? 's' : ''} per week`;

        // Dues
        const duesVal = parseFloat(searchContainer.querySelector('#smartBuilderWeeklyDues')?.value || '8') || 8;
        const duesText = `$${duesVal.toFixed(2)}`;

        // Dates
        const startDate = searchContainer.querySelector('#smartBuilderStartDate')?.value || '-';
        const endDateField = searchContainer.querySelector('#smartBuilderEndDate') || document.getElementById('smartBuilderEndDate');
        const endDate = endDateField?.value || '-';
        const totalWeeks = searchContainer.querySelector('#smartBuilderTotalWeeks')?.value || '20';

        // Team count and players (use selected teams, not all)
        const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
        const teamCount = selectedCheckboxes.length > 0 ? selectedCheckboxes.length : ((typeof fargoTeamData !== 'undefined' && Array.isArray(fargoTeamData)) ? fargoTeamData.length : 0);
        let playerCount = 0;
        if (selectedCheckboxes.length > 0) {
            selectedCheckboxes.forEach(function (cb) {
                const idx = parseInt(cb.dataset.teamIndex || cb.value, 10);
                if (!isNaN(idx) && fargoTeamData && fargoTeamData[idx]) {
                    const t = fargoTeamData[idx];
                    const n = (t.players && t.players.length) ? t.players.length + 1 : (t.playerCount || 1);
                    playerCount += n;
                }
            });
        } else if (fargoTeamData && fargoTeamData.length > 0) {
            fargoTeamData.forEach(function (t) {
                const n = (t.players && t.players.length) ? t.players.length + 1 : (t.playerCount || 1);
                playerCount += n;
            });
        }

        // Weekly dues per team
        const weeklyDuesPerDivision = duesVal * playersPerWeek;
        const weeklyDuesText = isDoublePlay
            ? `$${weeklyDuesPerDivision.toFixed(2)} per division ($${(weeklyDuesPerDivision * 2).toFixed(2)} total)`
            : `$${weeklyDuesPerDivision.toFixed(2)}`;

        // Financial breakdown
        const useDollar = searchContainer.querySelector('#smartBuilderMethodDollar')?.checked;
        const financialWrap = document.getElementById('summaryFinancialWrap');
        const financialContent = document.getElementById('summaryFinancialContent');
        if (financialWrap && financialContent) {
            let financialHtml = '';
            if (useDollar) {
                const prize = parseFloat(searchContainer.querySelector('#smartBuilderPrizeFundAmount')?.value);
                const first = parseFloat(searchContainer.querySelector('#smartBuilderFirstOrgAmount')?.value);
                const second = parseFloat(searchContainer.querySelector('#smartBuilderSecondOrgAmount')?.value);
                const prizeType = searchContainer.querySelector('input[name="smartBuilderPrizeFundAmountType"]:checked')?.value || 'perTeam';
                const firstType = searchContainer.querySelector('input[name="smartBuilderFirstOrgAmountType"]:checked')?.value || 'perTeam';
                const secondType = searchContainer.querySelector('input[name="smartBuilderSecondOrgAmountType"]:checked')?.value || 'perTeam';
                const perLabel = function (t) { return t === 'perPlayer' ? 'per player' : 'per team'; };
                const firstOrg = document.getElementById('smartBuilderFirstOrgDollarLabel')?.textContent || 'First Org';
                const secondOrg = document.getElementById('smartBuilderSecondOrgDollarLabel')?.textContent || 'Second Org';
                if (!isNaN(prize) && prize > 0) financialHtml += `Prize Fund: $${prize.toFixed(2)} ${perLabel(prizeType)}<br>`;
                if (!isNaN(first) && first > 0) financialHtml += `${firstOrg}: $${first.toFixed(2)} ${perLabel(firstType)}<br>`;
                if (!isNaN(second) && second > 0) financialHtml += `${secondOrg}: $${second.toFixed(2)} ${perLabel(secondType)}`;
            } else {
                const prize = parseFloat(searchContainer.querySelector('#smartBuilderPrizeFundPct')?.value);
                const first = parseFloat(searchContainer.querySelector('#smartBuilderFirstOrgPct')?.value);
                const second = parseFloat(searchContainer.querySelector('#smartBuilderSecondOrgPct')?.value);
                const firstOrg = document.getElementById('smartBuilderFirstOrgLabel')?.textContent || 'First Org';
                const secondOrg = document.getElementById('smartBuilderSecondOrgLabel')?.textContent || 'Second Org';
                if (!isNaN(prize) && prize > 0) financialHtml += `Prize Fund: ${prize}%<br>`;
                if (!isNaN(first) && first > 0) financialHtml += `${firstOrg}: ${first}%<br>`;
                if (!isNaN(second) && second > 0) financialHtml += `${secondOrg}: ${second}%`;
            }
            if (financialHtml) {
                financialContent.innerHTML = financialHtml;
                financialWrap.style.display = 'block';
            } else {
                financialContent.innerHTML = 'Using operator defaults from Settings';
                financialWrap.style.display = 'block';
            }
        }

        // Populate summary elements
        function set(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }
        set('summaryDivisionNameText', divisionName);
        set('summaryMatchesPerWeek', matchesText);
        set('summaryPlayersPerWeek', playersText);
        set('summaryDuesPerMatch', duesText);
        set('summaryStartDate', startDate);
        set('summaryEndDate', endDate);
        set('summaryTotalWeeks', totalWeeks + ' weeks');
        set('summaryTeamCount', teamCount);
        set('summaryPlayerCount', playerCount || '-');
        set('summaryWeeklyDues', weeklyDuesText);

        // Show summary, hide preview, show import (user imports from summary)
        summarySection.style.display = 'block';
        if (previewSection) previewSection.style.display = 'none';
        if (createTeamsBtn) createTeamsBtn.style.display = 'inline-block';

        if (typeof updateDivisionStats === 'function') {
            updateDivisionStats();
        }
    }

    function goBackToTeamPreview() {
        const summarySection = document.getElementById('summarySection');
        const createTeamsBtn = document.getElementById('createTeamsBtn');
        if (summarySection) summarySection.style.display = 'none';
        if (createTeamsBtn) createTeamsBtn.style.display = 'none';
        if (typeof showPreviewSection === 'function') {
            showPreviewSection();
        }
    }

    function showSummaryFromPreview() {
        const selected = document.querySelectorAll('.team-checkbox:checked');
        if (!selected || selected.length === 0) {
            if (typeof showAlertModal === 'function') {
                showAlertModal('Please select at least one team to import.', 'warning', 'No Teams Selected');
            }
            return;
        }
        if (typeof buildAndShowSummarySection === 'function') {
            buildAndShowSummarySection();
        }
    }

    if (typeof window !== 'undefined') {
        window.buildAndShowSummarySection = buildAndShowSummarySection;
        window.continueFromSummaryToTeamPreview = goBackToTeamPreview;
        window.goBackToTeamPreview = goBackToTeamPreview;
        window.showSummaryFromPreview = showSummaryFromPreview;
    }
})();
