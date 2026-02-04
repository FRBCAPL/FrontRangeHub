function updateDivisionDropdown() {
    const divisionSelect = document.getElementById('division');
    if (!divisionSelect) {
        console.error('Division select element not found!');
        return;
    }
    
    // Clear existing options
    divisionSelect.innerHTML = '<option value="">Select Division</option>';
    
    // Filter out temp divisions (they're orphaned from old code)
    if (!divisions || divisions.length === 0) {
        console.warn('No divisions available to populate dropdown');
        return;
    }
    
    divisions.forEach(division => {
        // Skip temp divisions and inactive divisions with "Temporary" description
        if (division._id && division._id.startsWith('temp_')) return;
        if (division.id && division.id.startsWith('temp_')) return;
        if (!division.isActive && division.description === 'Temporary') return;
        
        if (division.isActive) {
            const option = document.createElement('option');
            option.value = division.name;
            const playType = division.isDoublePlay ? 'Double Play' : 'Regular';
            // Use formatDivisionNameForDisplay for double-play divisions to show both names
            const displayName = division.isDoublePlay 
                ? formatDivisionNameForDisplay(division.name, true)
                : division.name;
            // Calculate actual current team count for this division (exclude archived)
            const actualTeamCount = teams ? teams.filter(t => !t.isArchived && t.isActive !== false && t.division === division.name).length : (division.numberOfTeams || 0);
            
            // Day of play (use week 1 play date so custom play dates are reflected)
            let dayOfPlay = '';
            if (division.startDate || division.start_date) {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                if (typeof window.getPlayDateForWeek === 'function') {
                    const week1 = window.getPlayDateForWeek(division, 1);
                    if (week1) dayOfPlay = dayNames[week1.getDay()];
                } else if (division.startDate) {
                    try {
                        const [year, month, day] = division.startDate.split('T')[0].split('-').map(Number);
                        const startDate = new Date(year, month - 1, day);
                        dayOfPlay = dayNames[startDate.getDay()];
                    } catch (e) {
                        console.warn('Error calculating day of play for division:', division.name, e);
                    }
                }
            }
            
            const dayOfPlayText = dayOfPlay ? `, ${dayOfPlay}` : '';
            const fullText = `${displayName} (${formatCurrency(division.duesPerPlayerPerMatch)}/player/match, ${playType}, ${actualTeamCount} teams${dayOfPlayText})`;
            option.textContent = fullText;
            option.title = fullText; // Add title for full text on hover
            divisionSelect.appendChild(option);
        }
    });
    
    // Remove existing change listener if it exists, then add new one
    const existingListener = divisionSelect._changeListener;
    if (existingListener) {
        divisionSelect.removeEventListener('change', existingListener);
    }
    
    // Add change event listener to update title and pre-fill location from In-House default
    const changeHandler = function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.value) {
            this.title = selectedOption.textContent || selectedOption.title || '';
            this.setAttribute('data-full-text', selectedOption.textContent || '');
            // Pre-fill location if this division has an In-House default (from manual builder)
            try {
                const stored = JSON.parse(localStorage.getItem('duesTracker_division_default_location') || '{}');
                const defaultLoc = stored[selectedOption.value];
                const teamLocationEl = document.getElementById('teamLocation');
                if (teamLocationEl && defaultLoc && !teamLocationEl.value.trim()) {
                    teamLocationEl.value = defaultLoc;
                }
            } catch (e) { /* ignore */ }
        } else {
            this.title = '';
            this.removeAttribute('data-full-text');
        }
    };
    
    divisionSelect.addEventListener('change', changeHandler);
    divisionSelect._changeListener = changeHandler; // Store reference for removal later
}
