function prepareFinancialData(divisionFilter, teamFilter) {
    // Calculate financial summary
    let teamsToCalculate = teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToCalculate = teamsToCalculate.filter(t => t.division === divisionFilter);
    }
    if (teamFilter) {
        teamsToCalculate = teamsToCalculate.filter(t => (t.teamName || '') === teamFilter);
    }
    
    const summary = {
        'Total Teams': teamsToCalculate.length,
        'Total Dues Collected': formatCurrency(0),
        'Total Dues Owed': formatCurrency(0),
        'Collection Rate': '0%'
    };
    
    // Calculate totals (simplified - you may want to use your existing calculation logic)
    let totalCollected = 0;
    let totalOwed = 0;
    
    teamsToCalculate.forEach(team => {
        const duesRate = team.divisionDuesRate || 0;
        const playerCount = team.playerCount || (team.teamMembers ? team.teamMembers.length : 0);
        const totalWeeks = team.totalWeeks || 0;
        const isDoublePlay = team.isDoublePlay || false;
        const matchesPerWeek = isDoublePlay ? 10 : 5;
        const expectedTotal = duesRate * playerCount * matchesPerWeek * totalWeeks;
        
        // Calculate collected from weekly payments
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(wp => {
                if (wp.paid === 'true' && wp.amount) {
                    totalCollected += parseFloat(wp.amount) || 0;
                }
            });
        }
        
        totalOwed += expectedTotal;
    });
    
    summary['Total Dues Collected'] = formatCurrency(totalCollected);
    summary['Total Dues Owed'] = formatCurrency(totalOwed);
    summary['Collection Rate'] = totalOwed > 0 ? ((totalCollected / totalOwed) * 100).toFixed(1) + '%' : '0%';
    
    return [summary];
}

// Prepare players data for export
function preparePlayersData(divisionFilter, includeArchived, teamFilter) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
    }
    if (teamFilter) {
        teamsToExport = teamsToExport.filter(t => (t.teamName || '') === teamFilter);
    }
    
    const playersMap = new Map();
    
    teamsToExport.forEach(team => {
        if (team.teamMembers) {
            team.teamMembers.forEach(member => {
                if (!playersMap.has(member.name)) {
                    playersMap.set(member.name, {
                        'Player Name': formatPlayerName(member.name),
                        'Email': member.email || '',
                        'Phone': member.phone || '',
                        'Sanction Fee Paid': member.bcaSanctionPaid ? 'Yes' : 'No',
                        'Previously Sanctioned': member.previouslySanctioned ? 'Yes' : 'No',
                        'Teams': []
                    });
                }
                const player = playersMap.get(member.name);
                player.Teams.push(team.teamName || '');
            });
        }
    });
    
    return Array.from(playersMap.values()).map(p => ({
        ...p,
        'Teams': p.Teams.join('; ')
    }));
}

// Prepare divisions data for export
function prepareDivisionsData() {
    return divisions.filter(d => d.isActive !== false && (!d.description || d.description !== 'Temporary')).map(div => {
        const [year, month, day] = div.startDate ? div.startDate.split('T')[0].split('-').map(Number) : [null, null, null];
        let dayOfPlay = '';
        if (year && month && day) {
            const startDate = new Date(year, month - 1, day);
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            dayOfPlay = dayNames[startDate.getDay()];
        }
        
        return {
            'Division Name': div.name || '',
            'Dues Per Player Per Match': formatCurrency(div.duesPerPlayerPerMatch || 0),
            'Players Per Week': div.playersPerWeek || 5,
            'Number of Teams': div.numberOfTeams || 0,
            'Current Teams': div.currentTeams || 0,
            'Total Weeks': div.totalWeeks || 0,
            'Start Date': div.startDate ? formatDateFromISO(div.startDate) : '',
            'End Date': div.endDate ? formatDateFromISO(div.endDate) : '',
            'Day of Play': dayOfPlay,
            'Double Play': div.isDoublePlay ? 'Yes' : 'No'
        };
    });
}

// Export to CSV
function exportToCSV(exportData) {
    try {
        const files = [];
        
        Object.keys(exportData).forEach(dataType => {
            const data = exportData[dataType];
            if (data && data.length > 0) {
                // Convert to CSV
                const headers = Object.keys(data[0]);
                const csvRows = [headers.join(',')];
                
                data.forEach(row => {
                    const values = headers.map(header => {
                        const value = row[header] || '';
                        // Escape commas and quotes in CSV
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    });
                    csvRows.push(values.join(','));
                });
                
                const csvContent = csvRows.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `dues-tracker-${dataType}-${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                files.push(dataType);
            }
        });
        
        if (files.length > 0) {
            showAlertModal(`Successfully exported ${files.length} file(s): ${files.join(', ')}`, 'success', 'Export Complete');
        } else {
            showAlertModal('No data to export.', 'warning', 'No Data');
        }
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showAlertModal('Error exporting to CSV. Please try again.', 'error', 'Error');
    }
}

// Export to Excel
function exportToExcel(exportData) {
    try {
        if (typeof XLSX === 'undefined') {
            showAlertModal('Excel export library not loaded. Please refresh the page and try again.', 'error', 'Error');
            return;
        }
        
        const workbook = XLSX.utils.book_new();
        
        Object.keys(exportData).forEach(dataType => {
            const data = exportData[dataType];
            if (data && data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(workbook, worksheet, dataType.charAt(0).toUpperCase() + dataType.slice(1));
            }
        });
        
        if (workbook.SheetNames.length > 0) {
            const fileName = `dues-tracker-${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            showAlertModal(`Successfully exported to Excel: ${fileName}`, 'success', 'Export Complete');
        } else {
            showAlertModal('No data to export.', 'warning', 'No Data');
        }
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showAlertModal('Error exporting to Excel. Please try again.', 'error', 'Error');
    }
}

// Export to PDF
function exportToPDF(exportData) {
    try {
        if (typeof window.jspdf === 'undefined') {
            showAlertModal('PDF export library not loaded. Please refresh the page and try again.', 'error', 'Error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPosition = 20;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        
        Object.keys(exportData).forEach((dataType, index) => {
            const data = exportData[dataType];
            if (data && data.length > 0) {
                // Add new page for each data type (except first)
                if (index > 0) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                // Add title
                doc.setFontSize(16);
                doc.text(dataType.charAt(0).toUpperCase() + dataType.slice(1), margin, yPosition);
                yPosition += 10;
                
                // Add table
                const headers = Object.keys(data[0]);
                const rows = data.map(row => headers.map(header => row[header] || ''));
                
                doc.autoTable({
                    head: [headers],
                    body: rows,
                    startY: yPosition,
                    margin: { left: margin, right: margin },
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [66, 139, 202] },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            }
        });
        
        const fileName = `dues-tracker-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        showAlertModal(`Successfully exported to PDF: ${fileName}`, 'success', 'Export Complete');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showAlertModal('Error exporting to PDF. Please try again.', 'error', 'Error');
    }
}

// Restore an archived team - shows modal to select division
async function restoreArchivedTeam(teamId) {
    const team = teams.find(t => t._id === teamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    // Show restore modal with division selection
    showRestoreTeamModal(team, teamId);
}

// Show restore team modal with division selection
function showRestoreTeamModal(team, teamId) {
    const modal = document.getElementById('restoreTeamModal');
    const teamNameEl = document.getElementById('restoreTeamName');
    const divisionSelect = document.getElementById('restoreTeamDivision');
    const noDivisionsEl = document.getElementById('restoreTeamNoDivisions');
    const divisionSelectContainer = document.getElementById('restoreTeamDivisionSelect');
    const confirmBtn = document.getElementById('confirmRestoreTeamBtn');
    
    if (!modal || !teamNameEl || !divisionSelect || !confirmBtn) {
        // Fallback to browser confirm if modal elements not found
        const confirmed = confirm(`Restore "${team.teamName}"?\n\nThe team will be restored and will appear in the main teams list again.`);
        if (confirmed) {
            executeRestoreTeam(team, teamId, team.division || null);
        }
        return;
    }
    
    // Set team name
    teamNameEl.textContent = `"${team.teamName}"`;
    
    // Load divisions into dropdown
    divisionSelect.innerHTML = '<option value="">Select Division</option>';
    
    // Filter out temp divisions
    const activeDivisions = divisions.filter(d => {
        if (d._id && d._id.startsWith('temp_')) return false;
        if (d.id && d.id.startsWith('temp_')) return false;
        if (!d.isActive && d.description === 'Temporary') return false;
        return d.isActive !== false;
    });
    
    if (activeDivisions.length === 0) {
        // No divisions available
        noDivisionsEl.style.display = 'block';
        divisionSelectContainer.style.display = 'none';
        confirmBtn.disabled = true;
    } else {
        // Populate division dropdown
        noDivisionsEl.style.display = 'none';
        divisionSelectContainer.style.display = 'block';
        
        activeDivisions.forEach(division => {
            const option = document.createElement('option');
            option.value = division.name;
            option.textContent = division.name;
            // Pre-select the team's original division if it still exists
            if (team.division && team.division === division.name) {
                option.selected = true;
            }
            divisionSelect.appendChild(option);
        });
        
        // Enable confirm button if a division is selected
        confirmBtn.disabled = !divisionSelect.value;
        
        // Update button state when division selection changes
        divisionSelect.addEventListener('change', function() {
            confirmBtn.disabled = !divisionSelect.value;
        });
    }
    
    // Set up confirm button handler
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', async () => {
        const selectedDivisionEl = document.getElementById('restoreTeamDivision');
        const selectedDivision = selectedDivisionEl ? selectedDivisionEl.value : '';
        
        if (activeDivisions.length > 0 && !selectedDivision) {
            showAlertModal('Please select a division to restore the team to.', 'warning', 'Selection Required');
            return;
        }
        
        if (activeDivisions.length === 0) {
            showAlertModal('Cannot restore team: No divisions available. Please create a division first.', 'error', 'No Divisions');
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            return;
        }
        
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
        
        // Clean up modal backdrop
        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 100);
        
        await executeRestoreTeam(team, teamId, selectedDivision || null);
    });
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Execute the team restore after division selection
async function executeRestoreTeam(team, teamId, selectedDivision) {
    try {
        showLoadingMessage('Restoring team...');
        
        // Get the full team data and unarchive
        const teamUpdateData = {
            teamName: team.teamName || '',
            division: selectedDivision || team.division || null,
            location: team.location || null,
            teamMembers: team.teamMembers || [],
            captainName: team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : ''),
            captainEmail: team.captainEmail || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].email : null),
            captainPhone: team.captainPhone || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].phone : null),
            weeklyPayments: team.weeklyPayments || [],
            divisionDuesRate: team.divisionDuesRate || 0,
            numberOfTeams: team.numberOfTeams || 0,
            totalWeeks: team.totalWeeks || 0,
            playerCount: team.playerCount || (team.teamMembers ? team.teamMembers.length : 0),
            duesAmount: team.duesAmount || 0,
            isArchived: false,
            isActive: true
        };
        
        // Update team to unarchive
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            // Close all modals first to prevent backdrop issues
            const archivedModal = document.getElementById('archivedTeamsModal');
            if (archivedModal) {
                const archivedBsModal = bootstrap.Modal.getInstance(archivedModal);
                if (archivedBsModal) archivedBsModal.hide();
            }
            
            // Remove any lingering modal backdrops
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            showAlertModal(`Team "${team.teamName}" has been restored${selectedDivision ? ` to division "${selectedDivision}"` : ''}.`, 'success', 'Success');
            
            // Reload data to refresh both main list and archived list
            await loadData();
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error restoring team.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error restoring team:', error);
        showAlertModal('Error restoring team. Please try again.', 'error', 'Error');
    }
}

