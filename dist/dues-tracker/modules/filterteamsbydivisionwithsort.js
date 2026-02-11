function filterTeamsByDivisionWithSort() {
    // If there's an active sort, apply it to the filtered teams (without toggling direction)
    if (currentSortColumn) {
        // Apply sorting without toggling direction (use search-filtered teams if any)
        const base = typeof getTeamsToDisplay === 'function' ? getTeamsToDisplay() : filteredTeams;
        const teamsToSort = [...(base || filteredTeams || [])];
        teamsToSort.sort((a, b) => {
            let aValue, bValue;
            
            switch(currentSortColumn) {
                case 'teamName':
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                    break;
                case 'division':
                    aValue = a.division || '';
                    bValue = b.division || '';
                    break;
                case 'dayOfPlay': {
                    const aDivision = divisions.find(d => d.name === a.division);
                    const bDivision = divisions.find(d => d.name === b.division);
                    
                    if (aDivision && aDivision.startDate) {
                        const aDateStr = aDivision.startDate.split('T')[0];
                        const [aYear, aMonth, aDay] = aDateStr.split('-').map(Number);
                        const aDate = new Date(aYear, aMonth - 1, aDay);
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        aValue = dayNames[aDate.getDay()];
                    } else {
                        aValue = '';
                    }
                    
                    if (bDivision && bDivision.startDate) {
                        const bDateStr = bDivision.startDate.split('T')[0];
                        const [bYear, bMonth, bDay] = bDateStr.split('-').map(Number);
                        const bDate = new Date(bYear, bMonth - 1, bDay);
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        bValue = dayNames[bDate.getDay()];
                    } else {
                        bValue = '';
                    }
                    break;
                }
                case 'status': {
                    const aDiv = divisions.find(d => d.name === a.division);
                    const bDiv = divisions.find(d => d.name === b.division);
                    
                    let aCurrentWeek = 1;
                    let bCurrentWeek = 1;
                    
                    if (aDiv && aDiv.startDate) {
                        const [aYear, aMonth, aDay] = aDiv.startDate.split('T')[0].split('-').map(Number);
                        const aStartDate = new Date(aYear, aMonth - 1, aDay);
                        aStartDate.setHours(0, 0, 0, 0);
                        const aToday = new Date();
                        aToday.setHours(0, 0, 0, 0);
                        const aTimeDiff = aToday.getTime() - aStartDate.getTime();
                        const aDaysDiff = Math.floor(aTimeDiff / (1000 * 3600 * 24));
                        aCurrentWeek = Math.max(1, Math.floor(aDaysDiff / 7) + 1);
                    }
                    
                    if (bDiv && bDiv.startDate) {
                        const [bYear, bMonth, bDay] = bDiv.startDate.split('T')[0].split('-').map(Number);
                        const bStartDate = new Date(bYear, bMonth - 1, bDay);
                        bStartDate.setHours(0, 0, 0, 0);
                        const bToday = new Date();
                        bToday.setHours(0, 0, 0, 0);
                        const bTimeDiff = bToday.getTime() - bStartDate.getTime();
                        const bDaysDiff = Math.floor(bTimeDiff / (1000 * 3600 * 24));
                        bCurrentWeek = Math.max(1, Math.floor(bDaysDiff / 7) + 1);
                    }
                    
                    let aIsCurrent = true;
                    let bIsCurrent = true;
                    
                    for (let week = 1; week <= aCurrentWeek; week++) {
                        const weekPayment = a.weeklyPayments?.find(p => p.week === week);
                        if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
                            aIsCurrent = false;
                            break;
                        }
                    }
                    
                    for (let week = 1; week <= bCurrentWeek; week++) {
                        const weekPayment = b.weeklyPayments?.find(p => p.week === week);
                        if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
                            bIsCurrent = false;
                            break;
                        }
                    }
                    
                    if (aIsCurrent !== bIsCurrent) {
                        aValue = aIsCurrent ? 1 : 0;
                        bValue = bIsCurrent ? 1 : 0;
                    } else {
                        aValue = a.teamName || '';
                        bValue = b.teamName || '';
                    }
                    break;
                }
                default:
                    return 0;
            }
            
            if (aValue < bValue) {
                return currentSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return currentSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        displayTeams(teamsToSort);
    } else {
        displayTeams(typeof getTeamsToDisplay === 'function' ? getTeamsToDisplay() : filteredTeams);
    }
}
