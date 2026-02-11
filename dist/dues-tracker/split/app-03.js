function getDivisionClass(divisionName) {
    if (!divisionName) return 'division-default';
    
    // Use a simple hash function to convert division name to a number
    let hash = 0;
    const name = divisionName.toLowerCase().trim();
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and modulo to get a color index
    const colorIndex = Math.abs(hash) % 12; // 12 different colors
    
    // Return a class name based on the color index
    const colorClasses = [
        'division-color-0',  // Red
        'division-color-1',  // Pink
        'division-color-2',  // Purple
        'division-color-3',  // Deep Purple
        'division-color-4',  // Indigo
        'division-color-5',  // Blue
        'division-color-6',  // Light Blue
        'division-color-7',  // Cyan
        'division-color-8',  // Teal
        'division-color-9',  // Green
        'division-color-10', // Light Green
        'division-color-11'  // Orange
    ];
    
    return colorClasses[colorIndex];
}

// Function to get division color (hex value) - uses stored color or falls back to CSS class color
function getDivisionColor(divisionName) {
    if (!divisionName) return '#607d8b'; // Default slate color (matches division-default)
    
    // Find the division object (case-insensitive, trimmed comparison)
    const divisionNameTrimmed = divisionName.trim();
    const division = divisions.find(d => {
        if (!d.name) return false;
        const dNameTrimmed = d.name.trim();
        // Try exact match first
        if (dNameTrimmed === divisionNameTrimmed) return true;
        // Try case-insensitive match
        if (dNameTrimmed.toLowerCase() === divisionNameTrimmed.toLowerCase()) return true;
        return false;
    });
    
    // If division has a stored color, use it
    if (division && division.color) {
        return division.color;
    }
    
    // Otherwise, use the same color mapping as getDivisionClass to match the division badge
    // This ensures the player count badge matches the division badge color
    let hash = 0;
    const name = divisionName.toLowerCase().trim();
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and modulo to get a color index (same as getDivisionClass)
    const colorIndex = Math.abs(hash) % 12; // 12 different colors
    
    // Return the hex color that matches the CSS class colors
    const colorMap = [
        '#f44336',  // Red (division-color-0)
        '#e91e63',  // Pink (division-color-1)
        '#9c27b0',  // Purple (division-color-2)
        '#673ab7',  // Deep Purple (division-color-3)
        '#3f51b5',  // Indigo (division-color-4)
        '#2196f3',  // Blue (division-color-5)
        '#03a9f4',  // Light Blue (division-color-6)
        '#00bcd4',  // Cyan (division-color-7)
        '#009688',  // Teal (division-color-8)
        '#4caf50',  // Green (division-color-9)
        '#8bc34a',  // Light Green (division-color-10)
        '#ff9800'   // Orange (division-color-11)
    ];
    
    return colorMap[colorIndex] || '#607d8b'; // Fallback to slate
}

// Function to reset division color to default
function resetDivisionColor() {
    const colorInput = document.getElementById('divisionColor');
    if (colorInput) {
        // Generate default color based on division name if available
        const divisionName = document.getElementById('divisionName')?.value;
        if (divisionName) {
            colorInput.value = getDivisionColor(divisionName);
        } else {
            colorInput.value = '#0dcaf0'; // Default cyan
        }
    }
}

// Function to format division name for display (handles double play divisions)
function formatDivisionNameForDisplay(divisionName, isDoublePlay) {
    if (!isDoublePlay) {
        return divisionName;
    }
    
    // For double play divisions, stored format is "Division 1 / Division 2"
    // Just return it as-is (already in the correct format)
    if (divisionName.includes(' / ')) {
        return divisionName;
    }
    
    // Fallback: if old format exists, try to parse it
    // Old format: "Base Name - Game Type 1 & Game Type 2"
    if (divisionName.includes(' - ') && divisionName.includes(' & ')) {
        const dashIndex = divisionName.indexOf(' - ');
        const baseName = divisionName.substring(0, dashIndex);
        const gameTypes = divisionName.substring(dashIndex + 3);
        const [firstGame, secondGame] = gameTypes.split(' & ');
        return `${baseName} - ${firstGame} / ${baseName} - ${secondGame}`;
    }
    
    // If no divider found, return as-is
    return divisionName;
}

// Matches/week helpers (remove hardcoded 5/10 logic)
function getMatchesPerWeekConfig(division) {
    const safe = division || {};
    if (safe.isDoublePlay) {
        const first = parseInt(safe.firstMatchesPerWeek, 10) || 5;
        const second = parseInt(safe.secondMatchesPerWeek, 10) || 5;
        return { isDoublePlay: true, first, second, total: first + second };
    }
    const matches = parseInt(safe.matchesPerWeek, 10) || 5;
    return { isDoublePlay: false, first: 0, second: 0, total: matches };
}

// Function to check and handle OAuth callback
async function checkAndHandleOAuth() {
    // Check if we're returning from OAuth (Supabase puts tokens in hash)
    const immediateHash = window.__DUES_TRACKER_OAUTH_HASH__;
    const currentHash = window.location.hash;
    const hash = immediateHash || currentHash;
    
    if (hash && (
        hash.includes('access_token') || 
        hash.includes('type=recovery')
    )) {
        console.log('🔍 Dues Tracker: OAuth callback detected in URL hash');
        console.log('🔍 Full hash:', hash);
        console.log('🔍 Current pathname:', window.location.pathname);
        
        // Prevent React app from handling this
        window.__DUES_TRACKER_OAUTH_HANDLING__ = true;
        
        // Handle OAuth callback - this will set authToken if successful
        try {
            await handleOAuthCallback();
            // After OAuth callback is processed, check authToken again
            authToken = localStorage.getItem('authToken');
            if (authToken) {
                console.log('✅ OAuth successful, showing main app');
                showMainApp();
                loadData();
                // Clear the hash
                if (window.location.hash) {
                    window.history.replaceState(null, '', window.location.pathname);
                }
            } else {
                console.error('❌ No auth token after OAuth callback');
                showLoginScreen();
            }
        } catch (error) {
            console.error('❌ Dues Tracker OAuth callback error:', error);
            showLoginScreen();
        }
        return true; // OAuth was handled
    }
    return false; // No OAuth callback
}

// Function to update the local clock display
function updateLocalClock() {
    const clockTimeElement = document.getElementById('clockTime');
    const clockDateElement = document.getElementById('clockDate');
    
    if (!clockTimeElement || !clockDateElement) {
        return; // Elements not found, clock might not be visible yet
    }
    
    const now = new Date();
    
    // Format time: HH:MM:SS AM/PM
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    const timeString = now.toLocaleTimeString(undefined, timeOptions);
    
    // Format date: Day, Month DD, YYYY
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateString = now.toLocaleDateString(undefined, dateOptions);
    
    clockTimeElement.textContent = timeString;
    clockDateElement.textContent = dateString;
}

// Initialize and update clock every second
function initializeClock() {
    updateLocalClock(); // Update immediately
    setInterval(updateLocalClock, 1000); // Update every second
}

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    // Setup collapsible instruction chevrons
    const duesDistributionCollapse = document.getElementById('duesDistributionInstructions');
    const divisionFinancialCollapse = document.getElementById('divisionFinancialInstructions');
    
    if (duesDistributionCollapse) {
        duesDistributionCollapse.addEventListener('show.bs.collapse', function() {
            const chevron = document.getElementById('duesDistributionChevron');
            if (chevron) chevron.classList.replace('fa-chevron-down', 'fa-chevron-up');
        });
        duesDistributionCollapse.addEventListener('hide.bs.collapse', function() {
            const chevron = document.getElementById('duesDistributionChevron');
            if (chevron) chevron.classList.replace('fa-chevron-up', 'fa-chevron-down');
        });
    }
    
    if (divisionFinancialCollapse) {
        divisionFinancialCollapse.addEventListener('show.bs.collapse', function() {
            const chevron = document.getElementById('divisionFinancialChevron');
            if (chevron) chevron.classList.replace('fa-chevron-down', 'fa-chevron-up');
        });
        divisionFinancialCollapse.addEventListener('hide.bs.collapse', function() {
            const chevron = document.getElementById('divisionFinancialChevron');
            if (chevron) chevron.classList.replace('fa-chevron-up', 'fa-chevron-down');
        });
    }
    
    // Apply theme as early as possible
    applyTheme(getEffectiveTheme());

    // Initialize clock immediately
    initializeClock();
    
    // Setup collapsible sanction fees card
    const sanctionFeesCollapse = document.getElementById('sanctionFeesDetails');
    const sanctionFeesChevron = document.getElementById('sanctionFeesChevron');
    if (sanctionFeesCollapse && sanctionFeesChevron) {
        sanctionFeesCollapse.addEventListener('show.bs.collapse', function() {
            sanctionFeesChevron.classList.remove('fa-chevron-down');
            sanctionFeesChevron.classList.add('fa-chevron-up');
        });
        sanctionFeesCollapse.addEventListener('hide.bs.collapse', function() {
            sanctionFeesChevron.classList.remove('fa-chevron-up');
            sanctionFeesChevron.classList.add('fa-chevron-down');
        });
    }
    
    // Setup collapsible teams behind card
    const teamsBehindCollapse = document.getElementById('teamsBehindDetails');
    const teamsBehindChevron = document.getElementById('teamsBehindChevron');
    if (teamsBehindCollapse && teamsBehindChevron) {
        teamsBehindCollapse.addEventListener('show.bs.collapse', function() {
            teamsBehindChevron.classList.remove('fa-chevron-down');
            teamsBehindChevron.classList.add('fa-chevron-up');
        });
        teamsBehindCollapse.addEventListener('hide.bs.collapse', function() {
            teamsBehindChevron.classList.remove('fa-chevron-up');
            teamsBehindChevron.classList.add('fa-chevron-down');
        });
    }
    
    // Setup collapsible sanction list in weekly payment modal
    const bcaSanctionCollapse = document.getElementById('bcaSanctionPlayersCollapse');
    const bcaSanctionChevron = document.getElementById('bcaSanctionPlayersChevron');
    if (bcaSanctionCollapse && bcaSanctionChevron) {
        bcaSanctionCollapse.addEventListener('show.bs.collapse', function() {
            bcaSanctionChevron.classList.remove('fa-chevron-down');
            bcaSanctionChevron.classList.add('fa-chevron-up');
        });
        bcaSanctionCollapse.addEventListener('hide.bs.collapse', function() {
            bcaSanctionChevron.classList.remove('fa-chevron-up');
            bcaSanctionChevron.classList.add('fa-chevron-down');
        });
    }
    
    const addDivisionModalEl = document.getElementById('addDivisionModal');
    if (addDivisionModalEl && typeof bootstrap !== 'undefined') {
        addDivisionModalEl.addEventListener('shown.bs.modal', function() {
            if (typeof initializeModalTooltips === 'function') {
                initializeModalTooltips(addDivisionModalEl);
            }
        });
    }
    
    // Parse checkout return params early (Square upgrade or legacy Stripe)
    const urlParams = new URLSearchParams(window.location.search);
    const squareUpgrade = urlParams.get('square_upgrade') === '1';
    const upgradeRef = urlParams.get('ref');
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    
    // OAuth check first – MUST run before normal init so we handle OAuth callbacks
    console.log('🚀 Dues Tracker: DOMContentLoaded - checking for OAuth callback');
    const oauthHandled = await checkAndHandleOAuth();
    if (oauthHandled) {
        console.log('✅ OAuth callback was handled, stopping normal initialization');
        return;
    }
    
    // Set up division name listeners globally (will be re-setup when modals open)
    setupDivisionNameListeners();
    
    // Set up date picker click handlers - make date inputs open picker on click
    setupDatePickerHandlers();
    
    // Show main app + load data (or login) BEFORE handling Square return.
    // This keeps the user "logged in" and data visible when we show upgrade success modals.
    if (authToken) {
        showMainApp();
        
        // Force container width after page loads
        setTimeout(() => {
            const containers = document.querySelectorAll('.container-fluid');
            containers.forEach(container => {
                container.style.maxWidth = '2500px';
                container.style.width = '100%';
            });
            console.log('Forced container width to 2500px');
        }, 1000);

        // Always refresh operator profile (sanction fee name, financial settings, theme) from backend
        // before loading main data, so settings persist correctly across refreshes.
        await fetchOperatorProfile();
        await loadData();
    } else {
        showLoginScreen();
    }
    
    // Handle Square (or legacy Stripe) checkout return *after* app is shown and data loaded.
    // Re-read authToken from localStorage in case it changed (e.g. another tab).
    if (squareUpgrade && upgradeRef) {
        console.log('✅ Returning from Square checkout, ref:', upgradeRef);
        const cleanPath = window.location.pathname + (window.location.hash || '');
        authToken = localStorage.getItem('authToken');
        
        if (!authToken) {
            showAlertModal('Please log in again to verify your upgrade. Your payment was received.', 'info', 'Log In Required');
            window.history.replaceState({}, document.title, cleanPath);
        } else {
            showAlertModal('Verifying your payment… We\'ll update your plan shortly.', 'info', 'Payment Received');
            
            const maxAttempts = 30;
            const intervalMs = 2000;
            let upgraded = false;
            
            for (let i = 0; i < maxAttempts; i++) {
                await new Promise(r => setTimeout(r, intervalMs));
                try {
                    const r = await apiCall(`/upgrade-status?ref=${encodeURIComponent(upgradeRef)}`);
                    if (r.ok) {
                        const d = await r.json();
                        if (d.upgraded) {
                            upgraded = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.warn('Upgrade status check failed:', e);
                }
            }
            
            if (upgraded) {
                showAlertModal('Subscription upgrade successful! Your plan has been updated.', 'success', 'Upgrade Complete');
            } else {
                showAlertModal('Thanks for your payment! If your plan doesn\'t update within a few minutes, please contact support.', 'info', 'Verification Pending');
            }
            
            await fetchOperatorProfile();
            const profileModal = document.getElementById('profileModal');
            if (profileModal && profileModal.classList.contains('show')) {
                const subscriptionTab = document.getElementById('subscription-tab');
                if (subscriptionTab) {
                    subscriptionTab.click();
                    if (currentOperator) {
                        loadSubscriptionInfo({ operator: currentOperator }).catch(err => {
                            console.error('Failed to reload subscription info:', err);
                        });
                    }
                }
            }
            
            window.history.replaceState({}, document.title, cleanPath);
        }
    } else if (sessionId && success === 'true') {
        // Legacy Stripe return (no longer used; Square only)
        console.log('✅ Returning from checkout, session ID:', sessionId);
        showAlertModal('Subscription upgrade successful! Your plan has been updated.', 'success', 'Upgrade Complete');
        await fetchOperatorProfile();
        const profileModal = document.getElementById('profileModal');
        if (profileModal && profileModal.classList.contains('show')) {
            const subscriptionTab = document.getElementById('subscription-tab');
            if (subscriptionTab) {
                subscriptionTab.click();
                if (currentOperator) {
                    loadSubscriptionInfo({ operator: currentOperator }).catch(err => {
                        console.error('Failed to reload subscription info:', err);
                    });
                }
            }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Theme toggle (exists in DOM even when modal is closed)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = getEffectiveTheme() === 'dark';
        themeToggle.addEventListener('change', () => {
            setTheme(themeToggle.checked ? 'dark' : 'light');
        });
    }

    // Profile & Settings modal tabs (one-time setup; Dues Distribution & Subscription tabs)
    // Set up listeners when modal is first shown (ensures modal DOM is ready)
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.addEventListener('shown.bs.modal', function onFirstModalShow() {
            profileModal.removeEventListener('shown.bs.modal', onFirstModalShow);
            setupProfileSettingsTabListeners();
        }, { once: true });
    } else {
        // Fallback: try to set up immediately if modal exists
        setTimeout(() => setupProfileSettingsTabListeners(), 100);
    }
    
    // Force week dropdown to open downward
    const weekFilter = document.getElementById('weekFilter');
    if (weekFilter) {
        weekFilter.addEventListener('focus', function() {
            this.style.position = 'relative';
            this.style.zIndex = '9999';
        });
    }
    
    // Listen for hash changes (OAuth redirects might change the hash)
    window.addEventListener('hashchange', async function() {
        console.log('🔍 Hash changed:', window.location.hash);
        const oauthHandled = await checkAndHandleOAuth();
        if (oauthHandled) {
            return;
        }
    });
});

// Authentication functions
