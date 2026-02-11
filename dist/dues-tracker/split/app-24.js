function startSubscriptionCleanup() {
    if (subscriptionCleanupInterval) return; // Already running
    
    subscriptionCleanupInterval = setInterval(() => {
        // Only run if profile modal is open
        const profileModal = document.getElementById('profileModal');
        if (profileModal && profileModal.classList.contains('show')) {
            // Aggressively clean other tabs (but NEVER touch subscription-pane)
            cleanSubscriptionContentFromOtherTabs();
            
            // Also ensure only the active tab is visible
            const activeTab = document.querySelector('#profileTabContent .tab-pane.show.active');
            if (activeTab && activeTab.id !== 'subscription-pane') {
                // If a non-subscription tab is active, make sure subscription content is cleaned
                cleanSubscriptionContentFromOtherTabs();
            }
            
            // Also verify subscriptionInfo is in the right place (but don't remove if it's there)
            const subscriptionInfo = document.getElementById('subscriptionInfo');
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionInfo && subscriptionPane) {
                // Only move if it's NOT in subscription-pane
                if (!subscriptionPane.contains(subscriptionInfo)) {
                    console.warn('🧹 Periodic cleanup: Moving subscriptionInfo to subscription-pane');
                    subscriptionInfo.remove();
                    subscriptionPane.appendChild(subscriptionInfo);
                }
                // If subscriptionInfo is empty or just has loading spinner, and we have pending HTML, load it
                const hasContent = subscriptionInfo.innerHTML && subscriptionInfo.innerHTML.length > 200 && !subscriptionInfo.innerHTML.includes('Loading subscription information');
                if (!hasContent && window._pendingSubscriptionHTML) {
                    console.log('📦 Periodic cleanup: Loading pending subscription HTML');
                    subscriptionInfo.innerHTML = window._pendingSubscriptionHTML;
                }
            }
            
            // Verify availablePlans is in the right place (but don't remove if it's there)
            const availablePlans = document.getElementById('availablePlans');
            if (availablePlans && subscriptionPane) {
                // Only move if it's NOT in subscription-pane
                if (!subscriptionPane.contains(availablePlans)) {
                    console.warn('🧹 Periodic cleanup: Moving availablePlans to subscription-pane');
                    availablePlans.remove();
                    if (subscriptionInfo) {
                        subscriptionInfo.appendChild(availablePlans);
                    } else {
                        subscriptionPane.appendChild(availablePlans);
                    }
                }
            }
        } else {
            // Modal closed, stop cleanup
            if (subscriptionCleanupInterval) {
                clearInterval(subscriptionCleanupInterval);
                subscriptionCleanupInterval = null;
            }
        }
    }, 500); // Check every 500ms
}

function stopSubscriptionCleanup() {
    if (subscriptionCleanupInterval) {
        clearInterval(subscriptionCleanupInterval);
        subscriptionCleanupInterval = null;
    }
}

// Function to initialize Bootstrap tooltips
function initializeProfileTooltips() {
    // Check if Bootstrap is available
    const Bootstrap = getBootstrap();
    if (!Bootstrap || !Bootstrap.Tooltip) {
        console.warn('Bootstrap Tooltip not available');
        return;
    }
    
    // Initialize all tooltips in the profile modal
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        // Destroy existing tooltip if it exists
        const existingTooltip = Bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
        // Create new tooltip
        try {
            new Bootstrap.Tooltip(tooltipTriggerEl);
        } catch (e) {
            console.warn('Failed to initialize tooltip:', e);
        }
    });
}

function initializeModalTooltips(modalElement) {
    // Check if Bootstrap is available
    const Bootstrap = getBootstrap();
    if (!Bootstrap || !Bootstrap.Tooltip) {
        console.warn('Bootstrap Tooltip not available');
        return;
    }
    
    if (!modalElement) {
        return;
    }
    
    // Initialize all tooltips within the modal
    const tooltipTriggerList = modalElement.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        // Destroy existing tooltip if it exists
        const existingTooltip = Bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
        // Create new tooltip
        try {
            new Bootstrap.Tooltip(tooltipTriggerEl);
        } catch (e) {
            console.warn('Failed to initialize tooltip:', e);
        }
    });
}

// Verify Bootstrap is loaded after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const Bootstrap = getBootstrap();
    if (!Bootstrap) {
        console.error('Bootstrap is not loaded! Modals will not work.');
        console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('bootstrap')));
    } else {
        console.log('Bootstrap loaded successfully:', Bootstrap);
        
        // Initialize tooltips on page load
        initializeProfileTooltips();
    }
    
    // Verify checkPasswordStrength is accessible
    if (typeof window.checkPasswordStrength !== 'function') {
        console.error('checkPasswordStrength is not accessible on window object!');
    }
    
    // Attach functions to window (all functions should be defined by now)
    console.log('Attaching functions to window...');
    if (typeof showAddTeamModal === 'function') {
        window.showAddTeamModal = showAddTeamModal;
        console.log('  ✓ showAddTeamModal attached');
    } else {
        console.warn('  ✗ showAddTeamModal not found');
    }
    
    if (typeof showDivisionManagement === 'function') {
        window.showDivisionManagement = showDivisionManagement;
        console.log('  ✓ showDivisionManagement attached');
    } else {
        console.warn('  ✗ showDivisionManagement not found');
    }
    
    if (typeof showProfileModal === 'function') {
        window.showProfileModal = showProfileModal;
        console.log('  ✓ showProfileModal attached');
    } else {
        console.warn('  ✗ showProfileModal not found');
    }
    if (typeof showDonateModal === 'function') {
        window.showDonateModal = showDonateModal;
    }
    
    if (typeof showPlayersView === 'function') {
        window.showPlayersView = showPlayersView;
        console.log('  ✓ showPlayersView attached');
    }
    
    if (typeof addTeam === 'function') {
        window.addTeam = addTeam;
        console.log('  ✓ addTeam attached');
    }
    
    if (typeof logout === 'function') {
        window.logout = logout;
        console.log('  ✓ logout attached');
    }
    if (typeof getAdminPageUrl === 'function') {
        window.getAdminPageUrl = getAdminPageUrl;
    }
    
    if (typeof signInWithGoogle === 'function') {
        window.signInWithGoogle = signInWithGoogle;
        console.log('  ✓ signInWithGoogle attached');
    }
    
    if (typeof signUpWithGoogle === 'function') {
        window.signUpWithGoogle = signUpWithGoogle;
        console.log('  ✓ signUpWithGoogle attached');
    }
    
    if (typeof saveProfile === 'function') {
        window.saveProfile = saveProfile;
        console.log('  ✓ saveProfile attached');
    } else {
        console.warn('  ✗ saveProfile not found');
    }
    
    if (typeof addTeamMember === 'function') {
        window.addTeamMember = addTeamMember;
        console.log('  ✓ addTeamMember attached');
    } else {
        console.warn('  ✗ addTeamMember not found');
    }
    
    if (typeof removeMember === 'function') {
        window.removeMember = removeMember;
        console.log('  ✓ removeMember attached');
    } else {
        console.warn('  ✗ removeMember not found');
    }
    
    // Verify modal functions are accessible
    console.log('Verifying modal functions:');
    console.log('  showAddTeamModal:', typeof window.showAddTeamModal);
    console.log('  showDivisionManagement:', typeof window.showDivisionManagement);
    console.log('  showProfileModal:', typeof window.showProfileModal);
    console.log('  addTeam:', typeof window.addTeam);
    console.log('  saveProfile:', typeof window.saveProfile);
    console.log('  addTeamMember:', typeof window.addTeamMember);
    console.log('  removeMember:', typeof window.removeMember);
    
    if (typeof editPlayer === 'function') {
        window.editPlayer = editPlayer;
        console.log('  ✓ editPlayer attached');
    }
    
    if (typeof savePlayerChanges === 'function') {
        window.savePlayerChanges = savePlayerChanges;
        console.log('  ✓ savePlayerChanges attached');
    }
    
    if (typeof handleSanctionPaidChange === 'function') {
        window.handleSanctionPaidChange = handleSanctionPaidChange;
        console.log('  ✓ handleSanctionPaidChange attached');
    }
    
    if (typeof removeTeamFromDivision === 'function') {
        window.removeTeamFromDivision = removeTeamFromDivision;
        console.log('  ✓ removeTeamFromDivision attached');
    }
    
    // Attach pagination functions
    if (typeof goToPage === 'function') {
        window.goToPage = goToPage;
        console.log('  ✓ goToPage attached');
    }
    
    if (typeof changeTeamsPerPage === 'function') {
        window.changeTeamsPerPage = changeTeamsPerPage;
        console.log('  ✓ changeTeamsPerPage attached');
    }
    
    if (typeof archiveTeam === 'function') {
        window.archiveTeam = archiveTeam;
        console.log('  ✓ archiveTeam attached');
    }
    
    if (typeof permanentlyDeleteTeam === 'function') {
        window.permanentlyDeleteTeam = permanentlyDeleteTeam;
        console.log('  ✓ permanentlyDeleteTeam attached');
    }
    
    if (typeof showArchivedTeamsModal === 'function') {
        window.showArchivedTeamsModal = showArchivedTeamsModal;
        console.log('  ✓ showArchivedTeamsModal attached');
    }
    
    if (typeof sortArchivedTeams === 'function') {
        window.sortArchivedTeams = sortArchivedTeams;
        console.log('  ✓ sortArchivedTeams attached');
    }
    
    if (typeof restoreArchivedTeam === 'function') {
        window.restoreArchivedTeam = restoreArchivedTeam;
        console.log('  ✓ restoreArchivedTeam attached');
    }
    
    if (typeof showHelpModal === 'function') {
        window.showHelpModal = showHelpModal;
        console.log('  ✓ showHelpModal attached');
    }
    
    if (typeof showExportModal === 'function') {
        window.showExportModal = showExportModal;
        console.log('  ✓ showExportModal attached');
    }
    
    if (typeof executeExport === 'function') {
        window.executeExport = executeExport;
        console.log('  ✓ executeExport attached');
    }
    if (typeof updateExportTeamFilterOptions === 'function') {
        window.updateExportTeamFilterOptions = updateExportTeamFilterOptions;
    }
    
    if (typeof downloadBackup === 'function') {
        window.downloadBackup = downloadBackup;
        console.log('  ✓ downloadBackup attached');
    }
    
    if (typeof deleteDivision === 'function') {
        window.deleteDivision = deleteDivision;
        console.log('  ✓ deleteDivision attached');
    }
    
    if (typeof showSmartBuilderModal === 'function') {
        window.showSmartBuilderModal = showSmartBuilderModal;
        console.log('  ✓ showSmartBuilderModal attached');
    }
    
    if (typeof openSmartBuilder === 'function') {
        window.openSmartBuilder = openSmartBuilder;
        console.log('  ✓ openSmartBuilder attached');
    }
    if (typeof openSmartBuilderFromAddDivision === 'function') {
        window.openSmartBuilderFromAddDivision = openSmartBuilderFromAddDivision;
        console.log('  ✓ openSmartBuilderFromAddDivision attached');
    }
    if (typeof createDivisionFromManualBuilder === 'function') {
        window.createDivisionFromManualBuilder = createDivisionFromManualBuilder;
        console.log('  ✓ createDivisionFromManualBuilder attached');
    }
    if (typeof toggleSmartBuilderMatchesOther === 'function') {
        window.toggleSmartBuilderMatchesOther = toggleSmartBuilderMatchesOther;
    }
    if (typeof toggleSmartBuilderPlayersOther === 'function') {
        window.toggleSmartBuilderPlayersOther = toggleSmartBuilderPlayersOther;
    }
    
    if (typeof fetchFargoDivisions === 'function') {
        window.fetchFargoDivisions = fetchFargoDivisions;
        console.log('  ✓ fetchFargoDivisions attached');
    }
    
    if (typeof setupManualDivisionIdListener === 'function') {
        window.setupManualDivisionIdListener = setupManualDivisionIdListener;
        console.log('  ✓ setupManualDivisionIdListener attached');
    }
    
    if (typeof onDivisionSelected === 'function') {
        window.onDivisionSelected = onDivisionSelected;
        console.log('  ✓ onDivisionSelected attached');
    }
    
    console.log('Global functions attached to window object');
    
    // CRITICAL: Set up event delegation on document for save button (works even if button is replaced)
    document.addEventListener('click', function(e) {
        const target = e.target.closest('#saveProfileButton');
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.saveProfile === 'function') {
                window.saveProfile().catch(err => {
                    console.error('❌ Error in saveProfile:', err);
                    alert('Error saving: ' + err.message);
                });
            } else {
                console.error('❌ window.saveProfile not available!');
                alert('Error: Save function not available. Please refresh the page.');
            }
            return false;
        }
    }, true); // Use capture phase to catch it early
});
