function showSmartBuilderModal(manualMode = false) {
    window.__smartBuilderManualMode = !!manualMode;
    console.log('Opening Smart Builder - manualMode:', manualMode, 'clearing previous data');
    
    const fargoScraperSection = document.getElementById('fargoScraperSection');
    const fargoConfig = document.getElementById('fargoConfig');
    const updateModeSection = document.getElementById('updateModeSection');
    const divisionSelectionSection = document.getElementById('divisionSelectionSection');
    const fargoTeamsSection = document.getElementById('fargoTeamsSection');
    const existingDivisionSection = document.getElementById('existingDivisionSection');
    const mergeConfirmationSection = document.getElementById('mergeConfirmationSection');
    const previewSection = document.getElementById('previewSection');
    const summarySection = document.getElementById('summarySection');
    const createSection = document.getElementById('createSection');
    const divisionSettingsSection = document.getElementById('divisionSettingsSection');
    const teamsSelectionSection = document.getElementById('teamsSelectionSection');
    const continueToPreviewContainer = document.getElementById('continueToPreviewContainer');
    const divisionStatsFooter = document.getElementById('divisionStatsFooter');
    const createTeamsBtn = document.getElementById('createTeamsBtn');
    const createDivisionManualBtn = document.getElementById('createDivisionManualBtn');
    const modalTitle = document.getElementById('smartBuilderModalTitle');
    
    if (fargoConfig) fargoConfig.style.display = 'none';
    if (updateModeSection) updateModeSection.style.display = 'none';
    if (divisionSelectionSection) divisionSelectionSection.style.display = 'none';
    if (fargoTeamsSection) fargoTeamsSection.style.display = 'none';
    if (existingDivisionSection) existingDivisionSection.style.display = 'none';
    if (mergeConfirmationSection) mergeConfirmationSection.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    if (summarySection) summarySection.style.display = 'none';
    if (createSection) createSection.style.display = 'none';
    if (divisionSettingsSection) divisionSettingsSection.style.display = 'none';
    
    const manualBuilderInHouseWrap = document.getElementById('manualBuilderInHouseWrap');
    if (manualMode) {
        if (fargoScraperSection) fargoScraperSection.style.display = 'none';
        if (teamsSelectionSection) teamsSelectionSection.style.display = 'none';
        if (continueToPreviewContainer) continueToPreviewContainer.style.display = 'none';
        if (divisionStatsFooter) divisionStatsFooter.style.display = 'none';
        if (createTeamsBtn) createTeamsBtn.style.display = 'none';
        if (createDivisionManualBtn) createDivisionManualBtn.style.display = 'inline-block';
        if (modalTitle) modalTitle.textContent = 'Create Division';
        if (divisionSettingsSection) {
            divisionSettingsSection.style.display = 'block';
            divisionSettingsSection.querySelector('h6').textContent = 'Division Settings';
            if (typeof updateDivisionFinancialLabels === 'function') updateDivisionFinancialLabels();
        }
        if (manualBuilderInHouseWrap) manualBuilderInHouseWrap.style.display = 'block';
    } else {
        if (fargoScraperSection) fargoScraperSection.style.display = 'block';
        if (createDivisionManualBtn) createDivisionManualBtn.style.display = 'none';
        if (createTeamsBtn) createTeamsBtn.style.display = 'none';
        if (modalTitle) modalTitle.textContent = 'Smart Team Builder - Import from FargoRate';
        if (manualBuilderInHouseWrap) manualBuilderInHouseWrap.style.display = 'none';
    }
    
    // Remove any existing "Continue to Preview" button
    const continueBtn = document.getElementById('continueToPreviewBtn');
    if (continueBtn) {
        continueBtn.remove();
    }
    
    // Clear both URL inputs (create and update sections)
    const createUrlInput = document.getElementById('fargoLeagueUrl');
    const updateUrlInput = document.getElementById('fargoLeagueUrlUpdate');
    if (createUrlInput) createUrlInput.value = '';
    if (updateUrlInput) updateUrlInput.value = '';
    
    const selectedDivision = document.getElementById('selectedDivision');
    const manualDivisionIdInput = document.getElementById('manualDivisionId');
    const smartBuilderDivisionName = document.getElementById('smartBuilderDivisionName');
    
    if (selectedDivision) selectedDivision.value = '';
    if (manualDivisionIdInput) manualDivisionIdInput.value = '';
    if (smartBuilderDivisionName) smartBuilderDivisionName.value = '';
    // Reset all Smart Builder form fields to defaults (matching editor)
    // Set values in all instances (there might be duplicates in different modals)
    const allDuesPerPlayer = document.querySelectorAll('#duesPerPlayer');
    const allWeeklyDues = document.querySelectorAll('#smartBuilderWeeklyDues');
    const allPlayersPerWeek = document.querySelectorAll('#smartBuilderPlayersPerWeek');
    const allMatchesPerWeek = document.querySelectorAll('#smartBuilderMatchesPerWeek');
    const allTotalWeeks = document.querySelectorAll('#smartBuilderTotalWeeks');
    
    allDuesPerPlayer.forEach(input => input.value = '8');
    allWeeklyDues.forEach(s => { s.value = '8'; });
    allPlayersPerWeek.forEach(input => input.value = '5');
    allMatchesPerWeek.forEach(s => { s.value = '5'; });
    allTotalWeeks.forEach(select => select.value = '20');
    
    const matchesOtherWrap = document.getElementById('smartBuilderMatchesOtherWrap');
    const matchesOtherInput = document.getElementById('smartBuilderMatchesPerWeekOther');
    const playersOtherWrap = document.getElementById('smartBuilderPlayersOtherWrap');
    const playersOtherInput = document.getElementById('smartBuilderPlayersPerWeekOther');
    if (matchesOtherWrap) matchesOtherWrap.style.display = 'none';
    if (matchesOtherInput) { matchesOtherInput.value = ''; matchesOtherInput.required = false; }
    if (playersOtherWrap) playersOtherWrap.style.display = 'none';
    if (playersOtherInput) { playersOtherInput.value = ''; playersOtherInput.required = false; }
    if (typeof toggleSmartBuilderMatchesOther === 'function') toggleSmartBuilderMatchesOther();
    if (typeof toggleSmartBuilderPlayersOther === 'function') toggleSmartBuilderPlayersOther();
    
    // Set default start date to today
    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    // Set start date in all instances (there might be duplicates)
    const allStartDateInputs = document.querySelectorAll('#smartBuilderStartDate');
    allStartDateInputs.forEach(input => {
        input.value = startDateStr;
    });
    // Calculate end date (function will find the correct inputs)
    calculateSmartBuilderEndDate();
    
    // Reset double play
    document.getElementById('smartBuilderIsDoublePlay').checked = false;
    document.getElementById('smartBuilderDoublePlayOptions').style.display = 'none';
    
    // Clear previous FargoRate data
    fargoTeamData = [];
    
    // Reset Smart Builder financial breakdown (optional section)
    const sbMethodPct = document.getElementById('smartBuilderMethodPercentage');
    const sbMethodDollar = document.getElementById('smartBuilderMethodDollar');
    if (sbMethodPct) sbMethodPct.checked = true;
    if (sbMethodDollar) sbMethodDollar.checked = false;
    const sbPrize = document.getElementById('smartBuilderPrizeFundPct');
    const sbFirst = document.getElementById('smartBuilderFirstOrgPct');
    const sbSecond = document.getElementById('smartBuilderSecondOrgPct');
    if (sbPrize) sbPrize.value = '';
    if (sbFirst) sbFirst.value = '';
    if (sbSecond) sbSecond.value = '';
    const sbPrizeAmt = document.getElementById('smartBuilderPrizeFundAmount');
    const sbFirstAmt = document.getElementById('smartBuilderFirstOrgAmount');
    const sbSecondAmt = document.getElementById('smartBuilderSecondOrgAmount');
    if (sbPrizeAmt) sbPrizeAmt.value = '';
    if (sbFirstAmt) sbFirstAmt.value = '';
    if (sbSecondAmt) sbSecondAmt.value = '';
    if (typeof toggleSmartBuilderFinancialMethod === 'function') toggleSmartBuilderFinancialMethod();
    // Reset In-House location option (preview section - Fargo import)
    const inHouseCb = document.getElementById('previewInHouseCheckbox');
    const inHouseWrap = document.getElementById('previewInHouseLocationWrap');
    const inHouseInput = document.getElementById('previewInHouseLocation');
    if (inHouseCb) inHouseCb.checked = false;
    if (inHouseWrap) inHouseWrap.style.display = 'none';
    if (inHouseInput) inHouseInput.value = '';
    // Reset manual builder In-House option
    const manualInHouseCb = document.getElementById('manualBuilderInHouseCheckbox');
    const manualInHouseWrap = document.getElementById('manualBuilderInHouseLocationWrap');
    const manualInHouseInput = document.getElementById('manualBuilderInHouseLocation');
    if (manualInHouseCb) manualInHouseCb.checked = false;
    if (manualInHouseWrap) manualInHouseWrap.style.display = 'none';
    if (manualInHouseInput) manualInHouseInput.value = '';
    
    // Clear division dropdown
    const divisionSelect = document.getElementById('fargoDivisionSelect');
    if (divisionSelect) {
        divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
    }
    
    const fargoDivisionIdInput = document.getElementById('fargoDivisionId');
    if (fargoDivisionIdInput) {
        fargoDivisionIdInput.value = '';
    }
    
    // Clear any existing preview tables
    const previewTable = document.getElementById('fargoTeamsPreviewBody');
    if (previewTable) {
        previewTable.innerHTML = '';
    }
    
    if (teamsSelectionSection && !manualMode) {
        teamsSelectionSection.style.display = 'none';
    }
    
    if (!manualMode && divisionSettingsSection) {
        divisionSettingsSection.style.display = 'none';
    }
    
    // Reset checkboxes and form fields
    const smartBuilderIsDoublePlay = document.getElementById('smartBuilderIsDoublePlay');
    if (smartBuilderIsDoublePlay) {
        smartBuilderIsDoublePlay.checked = false;
    }
    
    const smartBuilderDoublePlayOptions = document.getElementById('smartBuilderDoublePlayOptions');
    if (smartBuilderDoublePlayOptions) {
        smartBuilderDoublePlayOptions.style.display = 'none';
    }
    
    // Load existing divisions for the dropdown
    loadExistingDivisions();
    
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    if (!smartBuilderModal) {
        console.error('❌ Smart Builder modal not found!');
        showAlertModal('Smart Builder modal not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    const bsModal = new bootstrap.Modal(smartBuilderModal);

    const openSmartBuilderModal = () => {
        bsModal.show();
        console.log('✅ Smart Builder modal should now be visible');
    };

    if (!manualMode && typeof shouldShowFargoInstructions === 'function' && shouldShowFargoInstructions()) {
        console.log('✅ Showing FargoRate instructions first, then Smart Builder');
        if (typeof showFargoInstructionsModalWithCallback === 'function') {
            showFargoInstructionsModalWithCallback(openSmartBuilderModal);
        } else {
            openSmartBuilderModal();
        }
    } else {
        openSmartBuilderModal();
    }
}
