function showDivisionSettingsSection() {
    console.log('📋 showDivisionSettingsSection called');
    
    // Show the division settings section (reuse variable from outer scope if needed, or get it fresh)
    const divisionSettingsSection = document.getElementById('divisionSettingsSection');
    if (divisionSettingsSection) {
        divisionSettingsSection.style.display = 'block';
        if (typeof updateDivisionFinancialLabels === 'function') updateDivisionFinancialLabels();
        console.log('✅ Division settings section shown');
        
        // Set default values if not already set
        const startDateInput = document.getElementById('smartBuilderStartDate');
        if (startDateInput && !startDateInput.value) {
            const today = new Date();
            startDateInput.value = today.toISOString().split('T')[0];
            calculateSmartBuilderEndDate(); // This will also update the day of week display
        } else if (startDateInput && startDateInput.value) {
            // If date is already set, make sure day of week is displayed
            calculateSmartBuilderEndDate();
        }
        
        const weeklyDuesSelect = document.getElementById('smartBuilderWeeklyDues');
        if (weeklyDuesSelect && !weeklyDuesSelect.value) {
            weeklyDuesSelect.value = '8';
        }
        
        const totalWeeksSelect = document.getElementById('smartBuilderTotalWeeks');
        if (totalWeeksSelect && !totalWeeksSelect.value) {
            totalWeeksSelect.value = '20';
            calculateSmartBuilderEndDate();
        }
        
        const matchesPerWeekSelect = document.getElementById('smartBuilderMatchesPerWeek');
        if (matchesPerWeekSelect && !matchesPerWeekSelect.value) {
            matchesPerWeekSelect.value = '5';
        }
        toggleSmartBuilderMatchesOther();
        
        const playersPerWeekSelect = document.getElementById('smartBuilderPlayersPerWeek');
        if (playersPerWeekSelect && !playersPerWeekSelect.value) {
            const defaultPpw = (typeof currentOperator !== 'undefined' && currentOperator && (currentOperator.default_players_per_week != null || currentOperator.defaultPlayersPerWeek != null))
                ? (currentOperator.default_players_per_week ?? currentOperator.defaultPlayersPerWeek)
                : 5;
            playersPerWeekSelect.value = String(defaultPpw);
        }
        toggleSmartBuilderPlayersOther();
        
        // Preview is shown first, so no need for continue button
        // The import button will be shown when preview is displayed
        
        // Update division stats in footer - use a delay to ensure all default values are set and DOM is ready
        setTimeout(() => {
            updateDivisionStats();
        }, 100);
    } else {
        console.error('❌ Division settings section not found');
        // Fallback: show preview directly
        showPreviewSection();
    }
}
