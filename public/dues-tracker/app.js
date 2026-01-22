// Configuration
// Use local backend for development, production backend for deployed app
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080/api' 
  : 'https://atlasbackend-bnng.onrender.com/api';

// Supabase configuration for Google OAuth
const SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';

// Initialize Supabase client (loaded from CDN in HTML)
function getSupabaseClient() {
  if (typeof window !== 'undefined' && window.supabase) {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return null;
}

// Helper function to format currency with commas for thousands
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return '$0.00';
  }
  // Format with commas for thousands and 2 decimal places
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// IMMEDIATE OAuth callback check - runs before DOMContentLoaded
// This ensures we catch OAuth callbacks even if React Router intercepts the route
(function checkOAuthCallbackImmediately() {
    // Only run if we're on a dues tracker page (check by pathname or if dues tracker elements exist)
    const isDuesTrackerPage = window.location.pathname.includes('/dues-tracker') || 
                              window.location.pathname === '/dues-tracker' ||
                              document.getElementById('loginScreen') !== null;
    
    if (!isDuesTrackerPage) {
        return; // Not on dues tracker page, let React app handle it
    }
    
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
        console.log('🚨 Dues Tracker: OAuth callback detected IMMEDIATELY (before React app)');
        console.log('🚨 Full hash:', hash);
        
        // Set a flag to prevent React app from handling this OAuth callback
        window.__DUES_TRACKER_OAUTH_HANDLING__ = true;
        
        // Store the hash for processing when DOM is ready
        window.__DUES_TRACKER_OAUTH_HASH__ = hash;
    }
})();

// Global variables
let authToken = localStorage.getItem('authToken');
let currentOperator = JSON.parse(localStorage.getItem('currentOperator') || 'null'); // Store operator data including organization_name
let currentTeamId = null;
let divisions = [];
let teams = []; // Initialize teams array
let filteredTeams = [];
let currentDivisionId = null;
let currentWeek = 1;
let currentWeeklyPaymentTeamId = null;
let currentSortColumn = null; // Track which column is currently sorted
let currentSortDirection = 'asc'; // 'asc' or 'desc'
let currentWeeklyPaymentWeek = 1;
let projectionMode = false; // Projection mode: shows end-of-division projections
let allPlayersData = []; // Store all players data for sorting in players modal
let currentPlayersSortColumn = null;
let currentPlayersSortDirection = 'asc';

// Theme (dark/light) - stored locally
const THEME_STORAGE_KEY = 'duesTrackerTheme';
function getSavedTheme() {
    const t = (localStorage.getItem(THEME_STORAGE_KEY) || '').toLowerCase();
    return t === 'light' ? 'light' : 'dark';
}
function getEffectiveTheme() {
    // Prefer per-account setting if available
    const t = (currentOperator?.ui_theme || currentOperator?.uiTheme || '').toString().toLowerCase();
    if (t === 'light' || t === 'dark') return t;
    return getSavedTheme();
}
function applyTheme(theme) {
    const body = document.body;
    if (!body) return;
    body.classList.toggle('theme-light', theme === 'light');
    body.classList.toggle('theme-dark', theme !== 'light');
}
async function saveThemeToProfile(theme) {
    // Only save to backend if we’re logged in and have an operator loaded
    if (!authToken || !currentOperator) return;
    try {
        const response = await apiCall('/profile', {
            method: 'PUT',
            body: JSON.stringify({ uiTheme: theme })
        });
        if (response.ok) {
            const data = await response.json();
            if (data?.operator) {
                currentOperator = data.operator;
                localStorage.setItem('currentOperator', JSON.stringify(data.operator));
            }
        } else {
            // If migration not run yet, backend will return schema mismatch
            const err = await response.json().catch(() => ({}));
            console.error('❌ Failed to save theme to profile:', err);
        }
    } catch (e) {
        console.error('❌ Failed to save theme to profile:', e);
    }
}
function setTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
    applyTheme(normalized);
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.checked = normalized === 'dark';

    // Save per-account (best effort)
    saveThemeToProfile(normalized);
}

// Sanction fee settings (configurable per league operator)
let sanctionFeesEnabled = false; // Default - Whether sanction fees are enabled
let sanctionFeeName = 'Sanction Fee'; // Default
let sanctionFeeAmount = 25.00; // Default - Collection amount (what you charge players)
let sanctionFeePayoutAmount = 20.00; // Default - Payout amount (what you pay out for each sanction)

// Financial breakdown settings (configurable per league operator)
// These percentages determine how weekly dues are split between Prize Fund and two organizations
let prizeFundPercentage = 50.0; // Default: 50% of weekly dues goes to prize fund
let prizeFundName = 'Prize Fund'; // Default name for prize fund category
let firstOrganizationPercentage = 60.0; // Default: 60% of remaining (after prize fund) goes to first organization
let firstOrganizationName = 'League Manager'; // Default name for first organization
let secondOrganizationPercentage = 40.0; // Default: 40% of remaining (after prize fund) goes to second organization
let secondOrganizationName = 'Parent/National Organization'; // Default name for second organization

// Dollar amount settings (alternative to percentages)
let useDollarAmounts = false; // Whether to use dollar amounts instead of percentages
let prizeFundAmount = null; // Dollar amount for prize fund
let prizeFundAmountType = 'perTeam'; // 'perTeam' or 'perPlayer'
let firstOrganizationAmount = null; // Dollar amount for first organization
let firstOrganizationAmountType = 'perTeam'; // 'perTeam' or 'perPlayer'
let secondOrganizationAmount = null; // Dollar amount for second organization
let secondOrganizationAmountType = 'perTeam'; // 'perTeam' or 'perPlayer'

// Function to update sanction fee settings from operator data
function updateSanctionFeeSettings() {
    if (currentOperator) {
        // If sanction_fees_enabled is explicitly set, use it
        // Otherwise, default to true if sanction_fee_amount is set (backward compatibility)
        if (currentOperator.sanction_fees_enabled !== undefined && currentOperator.sanction_fees_enabled !== null) {
            sanctionFeesEnabled = currentOperator.sanction_fees_enabled === true || currentOperator.sanction_fees_enabled === 'true';
        } else {
            // Backward compatibility: if they have a sanction fee amount set, default to enabled
            const hasAmount = currentOperator.sanction_fee_amount && parseFloat(currentOperator.sanction_fee_amount) > 0;
            sanctionFeesEnabled = hasAmount;
        }
        
        sanctionFeeName = currentOperator.sanction_fee_name || 'Sanction Fee';
        sanctionFeeAmount = parseFloat(currentOperator.sanction_fee_amount) || 25.00;
        sanctionFeePayoutAmount = parseFloat(currentOperator.sanction_fee_payout_amount) || 20.00;
        console.log('✅ Sanction fee settings updated:', { sanctionFeesEnabled, sanctionFeeName, sanctionFeeAmount, sanctionFeePayoutAmount });
        
        // Show/hide sanction fee card and related UI based on whether fees are enabled
        toggleSanctionFeeUI(sanctionFeesEnabled);
        
        // Update UI labels dynamically
        updateSanctionFeeLabels();
    }
}

// Function to show/hide sanction fee UI elements
function toggleSanctionFeeUI(show) {
    // Sanction fee card
    const sanctionFeesCard = document.getElementById('sanctionFeesCard');
    if (sanctionFeesCard) {
        sanctionFeesCard.style.display = show ? '' : 'none';
    }
    
    // Sanction fee column header in main table
    const sanctionFeesTableHeader = document.getElementById('sanctionFeesTableHeader');
    const sanctionFeesTableHeaderCell = sanctionFeesTableHeader ? sanctionFeesTableHeader.closest('th') : null;
    if (sanctionFeesTableHeaderCell) {
        sanctionFeesTableHeaderCell.style.display = show ? '' : 'none';
    }
    
    // Sanction fee column cells in table rows
    document.querySelectorAll('td[data-sanction-status]').forEach(cell => {
        cell.style.display = show ? '' : 'none';
    });
    
    // Sanction fee section in weekly payment modal
    const bcaSanctionPlayersSection = document.getElementById('bcaSanctionPlayers');
    if (bcaSanctionPlayersSection) {
        const parentSection = bcaSanctionPlayersSection.closest('.mb-3');
        if (parentSection) {
            parentSection.style.display = show ? '' : 'none';
        }
    }
    
    // Sanction fee label and help text in weekly payment modal
    const sanctionFeeLabel = document.getElementById('sanctionFeeLabel');
    if (sanctionFeeLabel) {
        const labelSection = sanctionFeeLabel.closest('.mb-3');
        if (labelSection) {
            labelSection.style.display = show ? '' : 'none';
        }
    }
    
    // Sanction fee columns in payment history modal (if they exist)
    const paymentHistoryTable = document.querySelector('#paymentHistoryModal table');
    if (paymentHistoryTable) {
        const headers = paymentHistoryTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                paymentHistoryTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
    
    // Sanction fee columns in edit team modal payment history (if they exist)
    const editTeamPaymentHistoryTable = document.querySelector('#addTeamModal table');
    if (editTeamPaymentHistoryTable) {
        const headers = editTeamPaymentHistoryTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                editTeamPaymentHistoryTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
    
    // Sanction status columns in edit team modal team members table
    const editTeamMembersTable = document.querySelector('#addTeamModal #teamMembersContainer table');
    if (editTeamMembersTable) {
        const headers = editTeamMembersTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                editTeamMembersTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
}

// Function to update financial breakdown settings from operator data
function updateFinancialBreakdownSettings() {
    if (currentOperator) {
        // Load calculation method (percentage or dollar amount)
        useDollarAmounts = currentOperator.use_dollar_amounts || currentOperator.useDollarAmounts || false;
        
        // Load financial breakdown percentages and names from operator profile
        // Support both new field names and old field names for backward compatibility
        prizeFundPercentage = parseFloat(currentOperator.prize_fund_percentage || currentOperator.prizeFundPercentage);
        prizeFundName = currentOperator.prize_fund_name || currentOperator.prizeFundName || 'Prize Fund';
        firstOrganizationPercentage = parseFloat(currentOperator.first_organization_percentage || currentOperator.league_manager_percentage || currentOperator.leagueManagerPercentage);
        firstOrganizationName = currentOperator.first_organization_name || currentOperator.firstOrganizationName || 
                                currentOperator.league_manager_name || 'League Manager';
        secondOrganizationPercentage = parseFloat(currentOperator.second_organization_percentage || currentOperator.usa_pool_league_percentage || currentOperator.usaPoolLeaguePercentage);
        secondOrganizationName = currentOperator.second_organization_name || currentOperator.secondOrganizationName || 
                                currentOperator.usa_pool_league_name || 'Parent/National Organization';
        
        // Load dollar amount settings
        prizeFundAmount = currentOperator.prize_fund_amount || currentOperator.prizeFundAmount || null;
        prizeFundAmountType = currentOperator.prize_fund_amount_type || currentOperator.prizeFundAmountType || 'perTeam';
        firstOrganizationAmount = currentOperator.first_organization_amount || currentOperator.firstOrganizationAmount || null;
        firstOrganizationAmountType = currentOperator.first_organization_amount_type || currentOperator.firstOrganizationAmountType || 'perTeam';
        secondOrganizationAmount = currentOperator.second_organization_amount || currentOperator.secondOrganizationAmount || null;
        secondOrganizationAmountType = currentOperator.second_organization_amount_type || currentOperator.secondOrganizationAmountType || 'perTeam';
        
        // Validate percentages (must be valid numbers)
        if (isNaN(prizeFundPercentage)) prizeFundPercentage = 50.0;
        if (isNaN(firstOrganizationPercentage)) firstOrganizationPercentage = 60.0;
        if (isNaN(secondOrganizationPercentage)) secondOrganizationPercentage = 40.0;
        
        // Update UI labels dynamically
        updateFinancialBreakdownLabels();
        
        console.log('✅ Financial breakdown settings updated:', { 
            useDollarAmounts,
            prizeFundPercentage, 
            prizeFundName,
            prizeFundAmount,
            prizeFundAmountType,
            firstOrganizationPercentage,
            firstOrganizationName,
            firstOrganizationAmount,
            firstOrganizationAmountType,
            secondOrganizationPercentage,
            secondOrganizationName,
            secondOrganizationAmount,
            secondOrganizationAmountType
        });
    }
}

// Toggle between percentage and dollar amount input methods
function toggleCalculationMethod() {
    const method = document.querySelector('input[name="calculationMethod"]:checked')?.value;
    const percentageInputs = document.getElementById('percentageInputs');
    const dollarAmountInputs = document.getElementById('dollarAmountInputs');
    
    if (method === 'dollar') {
        if (percentageInputs) percentageInputs.style.display = 'none';
        if (dollarAmountInputs) dollarAmountInputs.style.display = 'block';
        useDollarAmounts = true;
    } else {
        if (percentageInputs) percentageInputs.style.display = 'block';
        if (dollarAmountInputs) dollarAmountInputs.style.display = 'none';
        useDollarAmounts = false;
    }
}

// Toggle between percentage and dollar amount input methods for division editor
function toggleDivisionCalculationMethod() {
    const method = document.querySelector('input[name="divisionCalculationMethod"]:checked')?.value;
    const percentageInputs = document.getElementById('divisionPercentageInputs');
    const dollarAmountInputs = document.getElementById('divisionDollarAmountInputs');
    
    if (method === 'dollar') {
        if (percentageInputs) percentageInputs.style.display = 'none';
        if (dollarAmountInputs) dollarAmountInputs.style.display = 'block';
    } else {
        if (percentageInputs) percentageInputs.style.display = 'block';
        if (dollarAmountInputs) dollarAmountInputs.style.display = 'none';
    }
}

// Function to update all UI labels that reference financial breakdown categories
function updateFinancialBreakdownLabels() {
    // Update financial breakdown card labels
    const prizeFundLabel = document.querySelector('label[for="totalPrizeFund"]') || 
                          document.querySelector('#totalPrizeFund')?.parentElement?.querySelector('h6');
    // Only update actual <label> elements so we don't overwrite card titles with buttons/chevrons
    if (prizeFundLabel && prizeFundLabel.tagName === 'LABEL' && prizeFundLabel.textContent) {
        prizeFundLabel.textContent = prizeFundLabel.textContent.replace(/Prize Fund|Total Prize Fund/i, prizeFundName);
    }
    
    const firstOrgLabel = document.querySelector('label[for="totalLeagueManager"]') || 
                         document.querySelector('#totalLeagueManager')?.parentElement?.querySelector('h6');
    if (firstOrgLabel && firstOrgLabel.tagName === 'LABEL' && firstOrgLabel.textContent) {
        firstOrgLabel.textContent = firstOrgLabel.textContent.replace(/League Manager|Total League Manager/i, firstOrganizationName);
    }
    
    // Update second organization label in financial breakdown card
    const secondOrgCardLabel = document.getElementById('secondOrgCardLabel');
    if (secondOrgCardLabel) {
        secondOrgCardLabel.textContent = secondOrganizationName;
    }
    
    // Also update any other labels that might reference the second organization
    const secondOrgLabel = document.querySelector('label[for="totalUSAPoolLeague"]') || 
                          document.querySelector('#totalUSAPoolLeague')?.parentElement?.querySelector('h6');
    if (secondOrgLabel && secondOrgLabel.tagName === 'LABEL' && secondOrgLabel.textContent && secondOrgLabel.id !== 'secondOrgCardLabel') {
        secondOrgLabel.textContent = secondOrgLabel.textContent.replace(/USA Pool League|Total USA Pool League|CSI/i, secondOrganizationName);
    }
}

// Function to update form labels dynamically based on input values
function updateFinancialBreakdownFormLabels() {
    const prizeFundNameInput = document.getElementById('profilePrizeFundName');
    const firstOrgNameInput = document.getElementById('profileFirstOrganizationName');
    const secondOrgNameInput = document.getElementById('profileSecondOrganizationName');
    
    const prizeFundLabel = document.getElementById('prizeFundLabel');
            const firstOrgLabel = document.getElementById('firstOrgLabel');
            const secondOrgLabel = document.getElementById('secondOrgLabel');
            
            if (prizeFundNameInput && prizeFundLabel) {
                prizeFundNameInput.addEventListener('input', function() {
                    prizeFundLabel.textContent = this.value || 'Prize Fund';
                });
                prizeFundLabel.textContent = prizeFundNameInput.value || 'Prize Fund';
            }
            
            if (firstOrgNameInput && firstOrgLabel) {
                firstOrgNameInput.addEventListener('input', function() {
                    firstOrgLabel.textContent = this.value || 'Local League/Organization';
                });
                firstOrgLabel.textContent = firstOrgNameInput.value || 'Local League/Organization';
            }
            
            if (secondOrgNameInput && secondOrgLabel) {
                // Keep the label as "Parent/National Organization" to match the field label above
                // Don't update it with the actual organization name value
                secondOrgLabel.textContent = 'Parent/National Organization';
            }
}

// Calculate profit per player (collection - payout)
function getSanctionFeeProfitPerPlayer() {
    return sanctionFeeAmount - sanctionFeePayoutAmount;
}

// Function to update sanction fee profit display in profile modal
function updateSanctionFeeProfitDisplay() {
    const collectionEl = document.getElementById('profileSanctionFeeAmount');
    const payoutEl = document.getElementById('profileSanctionFeePayoutAmount');
    const profitDisplayEl = document.getElementById('sanctionFeeProfitDisplay');
    
    if (collectionEl && payoutEl && profitDisplayEl) {
        const collection = parseFloat(collectionEl.value) || 0;
        const payout = parseFloat(payoutEl.value) || 0;
        const profit = collection - payout;
        profitDisplayEl.textContent = profit.toFixed(2);
        
        // Color code the profit (green if positive, red if negative)
        if (profit > 0) {
            profitDisplayEl.parentElement.className = 'alert alert-success mb-0';
        } else if (profit < 0) {
            profitDisplayEl.parentElement.className = 'alert alert-danger mb-0';
        } else {
            profitDisplayEl.parentElement.className = 'alert alert-info mb-0';
        }
    }
}

// Function to update all UI labels that reference sanction fees
function updateSanctionFeeLabels() {
    // Update payment modal label
    const sanctionFeeLabel = document.getElementById('sanctionFeeLabel');
    if (sanctionFeeLabel) {
        sanctionFeeLabel.textContent = `${sanctionFeeName} (${formatCurrency(sanctionFeeAmount)} per player)`;
    }
    
    // Update help text with detailed breakdown
    const sanctionFeeHelpText = document.getElementById('sanctionFeeHelpText');
    if (sanctionFeeHelpText) {
        const profit = getSanctionFeeProfitPerPlayer();
        sanctionFeeHelpText.innerHTML = `Select which players this payment includes ${sanctionFeeName.toLowerCase()} for<br>
            <small class="text-muted">
                <strong>Collection:</strong> ${formatCurrency(sanctionFeeAmount)}/player | 
                <strong>Payout:</strong> ${formatCurrency(sanctionFeePayoutAmount)}/player | 
                <strong>Profit:</strong> ${formatCurrency(profit)}/player
            </small>`;
    }
    
    // Update financial breakdown card title
    const sanctionFeesCardTitle = document.getElementById('sanctionFeesCardTitle');
    if (sanctionFeesCardTitle) {
        sanctionFeesCardTitle.textContent = sanctionFeeName;
    }
    
    // Update table header title (preserve sort icon)
    const sanctionFeesTableHeader = document.getElementById('sanctionFeesTableHeader');
    if (sanctionFeesTableHeader) {
        // Find the span wrapper that contains the text and sort icon
        const headerSpan = sanctionFeesTableHeader.querySelector('span.d-inline-flex');
        if (headerSpan) {
            // Get the sort icon to preserve it
            const sortIcon = headerSpan.querySelector('.sort-icon');
            if (sortIcon) {
                // Update the span content but keep the icon
                headerSpan.innerHTML = sanctionFeeName + ' ';
                headerSpan.appendChild(sortIcon);
            } else {
                // No icon found, just update text
                headerSpan.textContent = sanctionFeeName;
            }
        } else {
            // Fallback: if no span wrapper, just update textContent (old structure)
            sanctionFeesTableHeader.textContent = sanctionFeeName;
        }
    }
    
    // Update financial breakdown card subtitle
    const sanctionFeesCardSubtitle = document.getElementById('sanctionFeesCardSubtitle');
    if (sanctionFeesCardSubtitle) {
        sanctionFeesCardSubtitle.textContent = `${formatCurrency(sanctionFeeAmount)} per player per year`;
    }
    
    // Update players modal title
    const playersModalTitle = document.getElementById('playersModalTitle');
    if (playersModalTitle) {
        playersModalTitle.textContent = `${sanctionFeeName} Status`;
    }
    
    // Update tooltips for sanction status buttons
    const sanctionStatusTooltips = document.querySelectorAll('[data-sanction-status-tooltip]');
    sanctionStatusTooltips.forEach(element => {
        element.setAttribute('title', `${sanctionFeeName} Status: Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned`);
    });
    
    // Update tooltips in team member rows (dynamically created)
    // This will be called when team members are added
    
    // Update help text in team member status
    const sanctionStatusHelpText = document.getElementById('sanctionStatusHelpText');
    if (sanctionStatusHelpText) {
        sanctionStatusHelpText.textContent = `Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned`;
    }
}

// Function to get division color class
// Generate a consistent color class for each division based on its name
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
    
    // First, check if we're returning from OAuth
    // This MUST happen before anything else to catch OAuth callbacks
    console.log('🚀 Dues Tracker: DOMContentLoaded - checking for OAuth callback');
    const oauthHandled = await checkAndHandleOAuth();
    if (oauthHandled) {
        console.log('✅ OAuth callback was handled, stopping normal initialization');
        return; // Don't continue with normal initialization until OAuth is processed
    }
    
    // Check if user is already logged in
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

    // Theme toggle (exists in DOM even when modal is closed)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = getEffectiveTheme() === 'dark';
        themeToggle.addEventListener('change', () => {
            setTheme(themeToggle.checked ? 'dark' : 'light');
        });
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
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    // Update branding when showing main app
    if (currentOperator) {
        updateAppBranding(currentOperator.organization_name || currentOperator.name || 'Dues Tracker');
    }
    // Make sure clock is initialized when main app is shown
    updateLocalClock();
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentOperator');
    authToken = null;
    currentOperator = null;
    showLoginScreen();
}

// Update app branding based on organization name
function updateAppBranding(organizationName) {
    const displayName = organizationName || 'Dues Tracker';
    const fullTitle = `${displayName} - Dues Tracker`;
    
    // Update page title
    document.title = fullTitle;
    
    // Update navbar brand
    const navbarBrand = document.getElementById('navbarBrand');
    if (navbarBrand) {
        navbarBrand.innerHTML = `<i class="fas fa-pool me-2"></i>${fullTitle}`;
    }
    
    // Update login screen title (if visible)
    const loginTitle = document.getElementById('loginScreenTitle');
    if (loginTitle) {
        loginTitle.textContent = displayName;
    }
    
    // Store in global for later use
    window.appBranding = {
        organizationName: displayName,
        fullTitle: fullTitle
    };
}

// Login form handler - supports both new multi-tenant login and legacy admin login
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.classList.add('hidden'); // Hide previous errors
    
    // Try new multi-tenant login first
    try {
        let response = await fetch(`${API_BASE_URL}/dues-tracker/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        let data = await response.json();
        
        // If new login fails, try legacy admin login (backward compatibility)
        if (!response.ok) {
            console.log('New login failed, trying legacy admin login...');
            const adminResponse = await fetch(`${API_BASE_URL}/dues-tracker/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const adminData = await adminResponse.json();
            
            if (adminResponse.ok) {
                authToken = adminData.token;
                localStorage.setItem('authToken', authToken);
                showMainApp();
                loadData();
                errorDiv.classList.add('hidden');
                return;
            } else {
                // Both logins failed
                errorDiv.textContent = adminData.message || data.message || 'Invalid credentials';
                errorDiv.classList.remove('hidden');
                return;
            }
        }
        
        // New login succeeded
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            // Store operator data including organization_name
            if (data.operator) {
                currentOperator = data.operator;
                localStorage.setItem('currentOperator', JSON.stringify(data.operator));
                updateAppBranding(data.operator.organization_name || data.operator.name || 'Dues Tracker');
            }
            showMainApp();
            loadData();
            errorDiv.classList.add('hidden');
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Network error. Please check if the server is running.';
        errorDiv.classList.remove('hidden');
    }
});

// Registration form handler
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const orgName = document.getElementById('regOrgName').value;
            const errorDiv = document.getElementById('registerError');
            const successDiv = document.getElementById('registerSuccess');
            
            // Hide previous messages
            if (errorDiv) errorDiv.classList.add('hidden');
            if (successDiv) successDiv.classList.add('hidden');
            
            try {
                const response = await fetch(`${API_BASE_URL}/dues-tracker/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        email, 
                        password, 
                        name,
                        organizationName: orgName || null
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Store operator data if returned
                    if (data.operator) {
                        currentOperator = data.operator;
                        localStorage.setItem('currentOperator', JSON.stringify(data.operator));
                        updateAppBranding(data.operator.organization_name || data.operator.name || 'Dues Tracker');
                        updateSanctionFeeSettings();
                        updateFinancialBreakdownSettings();
                    } else if (orgName) {
                        // If organization name was provided, update branding
                        updateAppBranding(orgName);
                    }
                    
                    // Show success message
                    if (successDiv) {
                        successDiv.classList.remove('hidden');
                    }
                    
                    // Switch to login tab after 2 seconds
                    setTimeout(() => {
                        const loginTab = document.getElementById('login-tab');
                        if (loginTab) {
                            loginTab.click();
                            const emailInput = document.getElementById('email');
                            if (emailInput) emailInput.value = email;
                        }
                        // Clear registration form
                        registerForm.reset();
                    }, 2000);
                } else {
                    if (errorDiv) {
                        let errorMsg = data.message || 'Registration failed';
                        if (data.errors && Array.isArray(data.errors)) {
                            errorMsg += ': ' + data.errors.join(', ');
                        }
                        errorDiv.textContent = errorMsg;
                        errorDiv.classList.remove('hidden');
                    }
                }
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = 'Network error. Please try again.';
                    errorDiv.classList.remove('hidden');
                }
            }
        });
    }

    // Password strength checking function
    window.checkPasswordStrength = function(password, prefix = '') {
        const reqPrefix = prefix ? prefix + 'Req' : 'req';
        const strengthPrefix = prefix ? prefix + 'Password' : 'password';
        
        // Check requirements
        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        
        // Update requirement indicators
        updateRequirement(reqPrefix + 'Length', hasLength);
        updateRequirement(reqPrefix + 'Upper', hasUpper);
        updateRequirement(reqPrefix + 'Lower', hasLower);
        updateRequirement(reqPrefix + 'Number', hasNumber);
        updateRequirement(reqPrefix + 'Special', hasSpecial);
        
        // Calculate strength
        const requirementsMet = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
        const strength = (requirementsMet / 5) * 100;
        
        // Update strength bar
        const strengthBar = document.getElementById(strengthPrefix + 'StrengthBar');
        const strengthText = document.getElementById(strengthPrefix + 'StrengthText');
        const strengthDiv = document.getElementById(strengthPrefix + 'Strength');
        
        if (strengthBar && strengthText && strengthDiv) {
            strengthDiv.style.display = password.length > 0 ? 'block' : 'none';
            strengthBar.style.width = strength + '%';
            
            if (strength < 40) {
                strengthBar.className = 'progress-bar bg-danger';
                strengthText.textContent = 'Weak';
                strengthText.className = 'text-danger';
            } else if (strength < 80) {
                strengthBar.className = 'progress-bar bg-warning';
                strengthText.textContent = 'Medium';
                strengthText.className = 'text-warning';
            } else {
                strengthBar.className = 'progress-bar bg-success';
                strengthText.textContent = 'Strong';
                strengthText.className = 'text-success';
            }
        }
    };
    
    function updateRequirement(id, met) {
        const el = document.getElementById(id);
        if (el) {
            const icon = el.querySelector('i');
            if (icon) {
                icon.className = met ? 'fas fa-check text-success me-1' : 'fas fa-times text-danger me-1';
            }
            el.className = met ? 'text-success d-block' : 'text-muted d-block';
        }
    }

    // Forgot Password Modal
    window.showForgotPasswordModal = function() {
        const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
        modal.show();
    };

    // Forgot Password Form Handler
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('forgotPasswordEmail').value;
            const errorDiv = document.getElementById('forgotPasswordError');
            const successDiv = document.getElementById('forgotPasswordSuccess');
            
            if (errorDiv) errorDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';
            
            try {
                const response = await fetch(`${API_BASE_URL}/dues-tracker/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (successDiv) {
                        successDiv.textContent = data.message;
                        successDiv.style.display = 'block';
                        
                        // In development, show the reset link
                        if (data.resetLink) {
                            successDiv.innerHTML += `<br><small class="text-muted">Development mode - Reset link: <a href="${data.resetLink}" target="_blank">${data.resetLink}</a></small>`;
                        }
                    }
                    forgotPasswordForm.reset();
                } else {
                    if (errorDiv) {
                        errorDiv.textContent = data.message || 'Failed to send reset link';
                        errorDiv.style.display = 'block';
                    }
                }
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = 'Network error. Please try again.';
                    errorDiv.style.display = 'block';
                }
            }
        });
    }

    // Check for reset token in URL on page load
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    if (resetToken) {
        // Verify token and show reset modal
        verifyResetToken(resetToken);
    }

    // Verify Reset Token
    async function verifyResetToken(token) {
        try {
            const response = await fetch(`${API_BASE_URL}/dues-tracker/verify-reset-token/${token}`);
            const data = await response.json();
            
            if (response.ok && data.valid) {
                // Show reset password modal
                document.getElementById('resetPasswordToken').value = token;
                document.getElementById('resetPasswordEmailDisplay').textContent = `Resetting password for: ${data.email}`;
                const modal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
                modal.show();
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                alert('Invalid or expired reset token. Please request a new password reset.');
            }
        } catch (error) {
            console.error('Error verifying reset token:', error);
            alert('Error verifying reset token. Please try again.');
        }
    }

    // Reset Password Form Handler
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const token = document.getElementById('resetPasswordToken').value;
            const newPassword = document.getElementById('resetPasswordNew').value;
            const confirmPassword = document.getElementById('resetPasswordConfirm').value;
            const errorDiv = document.getElementById('resetPasswordError');
            const successDiv = document.getElementById('resetPasswordSuccess');
            const matchDiv = document.getElementById('resetPasswordMatch');
            
            if (errorDiv) errorDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';
            if (matchDiv) matchDiv.style.display = 'none';
            
            // Check if passwords match
            if (newPassword !== confirmPassword) {
                if (matchDiv) {
                    matchDiv.style.display = 'block';
                }
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/dues-tracker/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token, newPassword })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (successDiv) {
                        successDiv.textContent = data.message || 'Password has been reset successfully!';
                        successDiv.style.display = 'block';
                    }
                    resetPasswordForm.reset();
                    
                    // Close modal and redirect to login after 2 seconds
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'));
                        if (modal) modal.hide();
                        
                        // Switch to login tab
                        const loginTab = document.getElementById('login-tab');
                        if (loginTab) loginTab.click();
                    }, 2000);
                } else {
                    if (errorDiv) {
                        let errorMsg = data.message || 'Failed to reset password';
                        if (data.errors && Array.isArray(data.errors)) {
                            errorMsg += ': ' + data.errors.join(', ');
                        }
                        errorDiv.textContent = errorMsg;
                        errorDiv.style.display = 'block';
                    }
                }
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = 'Network error. Please try again.';
                    errorDiv.style.display = 'block';
                }
            }
        });
        
        // Check password match on confirm password input
        const confirmInput = document.getElementById('resetPasswordConfirm');
        if (confirmInput) {
            confirmInput.addEventListener('input', function() {
                const newPassword = document.getElementById('resetPasswordNew').value;
                const matchDiv = document.getElementById('resetPasswordMatch');
                if (this.value && this.value !== newPassword) {
                    if (matchDiv) matchDiv.style.display = 'block';
                } else {
                    if (matchDiv) matchDiv.style.display = 'none';
                }
            });
        }
    }

    // Update registration form to show password errors from backend
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            // This is already handled above, but we need to update error display
            const originalHandler = registerForm.onsubmit;
        });
    }
});

// Google OAuth Sign In
async function signInWithGoogle() {
    try {
        // Set flag to indicate this OAuth is for the dues tracker
        localStorage.setItem('__DUES_TRACKER_OAUTH__', 'true');
        
        // Wait for Supabase to be available
        let supabase = getSupabaseClient();
        if (!supabase) {
            await new Promise((resolve) => {
                const checkSupabase = setInterval(() => {
                    supabase = getSupabaseClient();
                    if (supabase) {
                        clearInterval(checkSupabase);
                        resolve();
                    }
                }, 100);
            });
            supabase = getSupabaseClient();
        }
        
        if (!supabase) {
            throw new Error('Supabase not loaded');
        }
        
        // Get the correct redirect URL - use the full path to the dues tracker page
        // This ensures Supabase redirects directly to the dues tracker, not through React Router
        const redirectUrl = window.location.origin + '/dues-tracker/index.html';
        
        console.log('🔐 Dues Tracker: Initiating Google OAuth with redirect:', redirectUrl);
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 Supabase URL:', SUPABASE_URL);
        
        // Specify redirectTo to go directly to the dues tracker static HTML file
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });
        
        if (error) {
            console.error('❌ Google sign in error:', error);
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) {
                errorDiv.textContent = `Google sign in failed: ${error.message || 'Unknown error'}`;
                errorDiv.classList.remove('hidden');
            }
            return;
        }
        
        if (data?.url) {
            console.log('✅ OAuth redirect URL generated:', data.url);
            // Supabase will handle the redirect automatically
            // The browser will navigate to Google, then back to our app
        } else {
            console.warn('⚠️ No redirect URL returned from Supabase');
        }
        // User will be redirected to Google, then back to the app
    } catch (error) {
        console.error('Google sign in error:', error);
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = 'Google sign in failed. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }
}

// Google OAuth Sign Up (same as sign in for OAuth)
async function signUpWithGoogle() {
    await signInWithGoogle(); // OAuth sign up and sign in are the same
}

// Check for OAuth callback and process it
async function handleOAuthCallback() {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.error('Supabase client not available');
        return;
    }
    
    try {
        console.log('🔄 Processing OAuth callback...');
        console.log('🔍 Current URL hash:', window.location.hash);
        
        // Extract tokens from URL hash (Supabase puts them there after OAuth redirect)
        const fullHash = window.location.hash;
        let accessToken = null;
        let refreshToken = null;
        
        // Try to extract tokens from hash
        // Handle case where React Router adds #/auth/callback before the actual hash
        // Hash might be: #/auth/callback#access_token=xxx or just #access_token=xxx
        let actualHash = fullHash;
        if (fullHash.includes('#access_token')) {
            // If hash contains #access_token, extract everything after the last #
            const lastHashIndex = fullHash.lastIndexOf('#');
            if (lastHashIndex >= 0) {
                actualHash = fullHash.substring(lastHashIndex);
            }
        }
        
        if (actualHash) {
            // Hash format: #access_token=xxx&refresh_token=yyy&...
            const hashParams = new URLSearchParams(actualHash.substring(1));
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
            
            console.log('🔑 Tokens in hash:', {
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken
            });
            
            // If we have tokens in the hash, set the session explicitly
            if (accessToken && refreshToken) {
                console.log('✅ Setting session from URL hash tokens...');
                const { data: sessionData, error: setError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                
                if (setError) {
                    console.error('❌ Error setting session:', setError);
                    throw setError;
                }
                
                if (sessionData?.session?.user) {
                    console.log('✅ Session set successfully from hash tokens');
                    await processOAuthSession(sessionData.session);
                    // Clear the hash
                    window.history.replaceState(null, '', window.location.pathname);
                    return;
                }
            }
        }
        
        // Fallback: Try getSession (Supabase might have already processed the hash)
        console.log('⏳ Trying getSession...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for Supabase to process
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session && session.user) {
            console.log('✅ Session found via getSession');
            await processOAuthSession(session);
            // Clear the hash if it exists
            if (window.location.hash) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        } else {
            console.error('❌ No session found after OAuth callback');
            if (sessionError) {
                console.error('Session error:', sessionError);
            }
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) {
                errorDiv.textContent = 'Failed to authenticate. Please try again.';
                errorDiv.classList.remove('hidden');
            }
            showLoginScreen();
        }
    } catch (error) {
        console.error('❌ OAuth callback error:', error);
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = 'Authentication failed: ' + (error.message || 'Unknown error');
            errorDiv.classList.remove('hidden');
        }
        showLoginScreen();
    }
}

// Process the OAuth session and create/find league operator
async function processOAuthSession(session) {
    try {
        console.log('✅ OAuth session found, processing...', {
            email: session.user.email,
            userId: session.user.id,
            hasAccessToken: !!session.access_token
        });
        
        if (!session.access_token) {
            throw new Error('No access token in session');
        }
        
        // Send session to backend to create/find league operator
        const response = await fetch(`${API_BASE_URL}/dues-tracker/google-auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                access_token: session.access_token,
                user: {
                    id: session.user.id,
                    email: session.user.email,
                    user_metadata: session.user.user_metadata || {}
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('❌ Backend auth error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                fullError: JSON.stringify(errorData, null, 2)
            });
            
            // Show more detailed error message
            let errorMessage = errorData.message || `Server error: ${response.status}`;
            if (errorData.error) {
                errorMessage += ` (${errorData.error})`;
            }
            if (errorData.hint) {
                console.log('💡 Error hint:', errorData.hint);
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        console.log('✅ Backend auth successful', {
            hasToken: !!data.token,
            isNewUser: data.isNewUser,
            operatorId: data.operator?.id
        });
        
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        // Store operator data including organization_name
        if (data.operator) {
            currentOperator = data.operator;
            localStorage.setItem('currentOperator', JSON.stringify(data.operator));
            updateAppBranding(data.operator.organization_name || data.operator.name || 'Dues Tracker');
            updateSanctionFeeSettings();
            updateFinancialBreakdownSettings();
        }
        showMainApp();
        loadData();
        
        // Clear URL hash
        window.history.replaceState(null, '', window.location.pathname);
    } catch (error) {
        console.error('❌ Error processing OAuth session:', error);
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            // Show helpful error message
            let errorMessage = error.message || 'Network error. Please try again.';
            
            // If OAuth fails, suggest using email/password login
            if (errorMessage.includes('Failed to create account') || 
                errorMessage.includes('Server error')) {
                errorMessage += ' You can try logging in with your email and password instead.';
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.classList.remove('hidden');
            showLoginScreen();
        }
    }
}

// Check for OAuth callback on page load
// Also listen for hash changes (in case Supabase processes it asynchronously)
// This is a backup in case the initial check misses it
window.addEventListener('hashchange', function() {
    const hash = window.location.hash;
    if (hash && (
        hash.includes('access_token') || 
        hash.includes('type=recovery')
    )) {
        console.log('🔍 OAuth callback detected in hash change');
        handleOAuthCallback().then(() => {
            authToken = localStorage.getItem('authToken');
            if (authToken) {
                showMainApp();
                loadData();
            }
        });
    }
});

// API helper function
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // Add authentication token if available
    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Add /dues-tracker prefix to all endpoints
    const fullEndpoint = `/dues-tracker${endpoint}`;
    
    // Debug logging for API calls
    console.log(`API Call: ${fullEndpoint}`, {
        method: options.method || 'GET',
        hasAuth: !!authToken,
        headers: defaultOptions.headers
    });
    
    const response = await fetch(`${API_BASE_URL}${fullEndpoint}`, {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    });
    
    // If unauthorized, check if we just logged in (might be a timing issue)
    if (response.status === 401) {
        console.error('❌ API call returned 401 Unauthorized');
        console.error('   Endpoint:', fullEndpoint);
        console.error('   Has token:', !!authToken);
        console.error('   Token preview:', authToken ? authToken.substring(0, 20) + '...' : 'none');
        
        // Don't immediately logout - might be a backend issue or token not yet valid
        // Only logout if we're sure the token is invalid (e.g., after retry)
        // For now, just return the error response and let the caller handle it
        return response;
    }
    
    return response;
}

// Fetch operator profile to get organization name and sanction fee settings
async function fetchOperatorProfile() {
    try {
        const response = await apiCall('/profile');
        if (response.ok) {
            const data = await response.json();
            if (data.operator) {
                currentOperator = data.operator;
                localStorage.setItem('currentOperator', JSON.stringify(data.operator));
                updateAppBranding(data.operator.organization_name || data.operator.name || 'Dues Tracker');
                updateSanctionFeeSettings(); // This also calls updateSanctionFeeLabels()
                updateFinancialBreakdownSettings();

                // Apply per-account theme if present
                applyTheme(getEffectiveTheme());
                const themeToggle = document.getElementById('themeToggle');
                if (themeToggle) themeToggle.checked = getEffectiveTheme() === 'dark';
            }
        }
    } catch (error) {
        console.error('Error fetching operator profile:', error);
    }
}

// Data loading functions
async function loadData() {
    try {
        console.log('📊 Loading data...');
        // Load all data in parallel, but wait for both to complete
        await Promise.all([
            loadDivisions(),
            loadTeams(),
            loadSummary()
        ]);
        
        console.log('✅ Data loaded successfully');
        
        // NOW that both divisions and teams are loaded, display the teams
        // This ensures division lookup works correctly
        displayTeams(filteredTeams || teams || []);
        
        // Calculate financial breakdown after all data is loaded and displayed
        calculateFinancialBreakdown();
    } catch (error) {
        console.error('❌ Error loading data:', error);
        // Don't show alert, just log the error and continue with empty data
        console.log('⚠️ Continuing with empty data...');
        
        // Check if error is due to authentication failure
        if (error.message && error.message.includes('401')) {
            console.error('❌ Authentication failed - token may be invalid');
            // Don't logout immediately - the token might be valid but API might be down
            // Just show empty state
            // DO NOT redirect - stay on the page
        }
        
        // Initialize with empty data
        divisions = [];
        teams = [];
        filteredTeams = [];
        
        // Update UI with empty state
        updateDivisionDropdown();
        displayTeams([]);
        calculateAndDisplaySmartSummary();
        
        // IMPORTANT: Do NOT redirect or logout on data load errors
        // Stay on the current page even if data fails to load
    }
}

async function loadDivisions() {
    try {
        const response = await apiCall('/divisions');
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading divisions');
            const errorData = await response.json().catch(() => ({ message: 'Unauthorized' }));
            console.error('   Error:', errorData);
            divisions = [];
            updateDivisionDropdown();
            updateDivisionFilter();
            return; // Don't throw, just return empty
        }
        
        if (!response.ok) {
            throw new Error(`Failed to load divisions: ${response.status}`);
        }
        
        divisions = await response.json();
        console.log('✅ Loaded divisions:', divisions);
        updateDivisionDropdown();
        updateDivisionFilter();
        updateTeamsSectionTitle();
        // Initialize division summary for "All Teams" view
        updateDivisionSpecificSummary(null);
        // Wait a bit for DOM to be ready, then hide week dropdown initially
        setTimeout(() => {
            updateWeekDropdownWithDates(null);
        }, 100);
    } catch (error) {
        console.error('❌ Error loading divisions:', error);
    }
}

async function loadTeams() {
    try {
        const response = await apiCall('/teams');
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading teams');
            const errorData = await response.json().catch(() => ({ message: 'Unauthorized' }));
            console.error('   Error:', errorData);
            teams = [];
            filteredTeams = [];
            return; // Don't throw, just return empty
        }
        
        if (!response.ok) {
            throw new Error(`Failed to load teams: ${response.status}`);
        }
        
        const teamsData = await response.json();
        teams = teamsData; // Store globally
        filteredTeams = teamsData; // Initialize filtered teams
        console.log('✅ Loaded teams:', teams.length);
        // Don't display teams here - wait until both divisions and teams are loaded
        // displayTeams() will be called after Promise.all() completes in loadData()
    } catch (error) {
        console.error('❌ Error loading teams:', error);
        teams = [];
        filteredTeams = [];
    }
}

async function loadSummary() {
    try {
        const response = await apiCall('/summary');
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading summary');
            // Summary is optional, so just return empty
            return;
        }
        
        if (!response.ok) {
            console.warn('⚠️ Failed to load summary:', response.status);
            return; // Summary is optional, don't throw
        }
        
        const summary = await response.json();
        console.log('✅ Loaded summary');
        displaySummary(summary);
    } catch (error) {
        console.error('❌ Error loading summary:', error);
        // Summary is optional, so just continue
    }
}

function getBCAStatusDisplay(team) {
    if (!team.teamMembers || team.teamMembers.length === 0) {
        return '<span class="badge bg-secondary">No Players</span>';
    }
    
    // Collect all players who have been sanctioned via payment modals
    const sanctionedPlayersFromPayments = new Set();
    if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
        team.weeklyPayments.forEach(payment => {
            if (payment.paid === 'true' && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                payment.bcaSanctionPlayers.forEach(playerName => {
                    sanctionedPlayersFromPayments.add(playerName);
                });
            }
        });
    }
    
    let paidCount = 0;
    let previouslyCount = 0;
    let totalCount = team.teamMembers.length;
    
    team.teamMembers.forEach(member => {
        // Check if player was sanctioned via payment modal (overrides member's bcaSanctionPaid)
        const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
        const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid;
        
        if (effectiveBcaSanctionPaid) {
            paidCount++;
        } else if (member.previouslySanctioned) {
            previouslyCount++;
        }
    });
    
    const pendingCount = totalCount - paidCount - previouslyCount;
    
    if (pendingCount === 0 && paidCount > 0) {
        return '<span class="badge bg-success"><i class="fas fa-check"></i> All Current</span>';
    } else if (pendingCount === totalCount) {
        return '<span class="badge bg-danger"><i class="fas fa-times"></i> All Pending</span>';
    } else if (pendingCount > 0) {
        return `<span class="badge bg-warning text-dark"><i class="fas fa-clock"></i> ${pendingCount} Pending</span>`;
    } else {
        return '<span class="badge bg-info"><i class="fas fa-history"></i> All Set</span>';
    }
}

// Sorting function for teams table
function sortTable(column) {
    // Toggle sort direction if clicking the same column, otherwise default to ascending
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // Get the teams to sort (use filteredTeams if available, otherwise all teams)
    const teamsToSort = [...(filteredTeams.length > 0 ? filteredTeams : teams)];
    
    // Sort the teams based on the selected column
    teamsToSort.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
            case 'teamName':
                aValue = a.teamName || '';
                bValue = b.teamName || '';
                break;
            case 'division':
                aValue = a.division || '';
                bValue = b.division || '';
                break;
            case 'dayOfPlay': {
                // Get day of play from division start date
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
                // Sort by status: Calculate if team is current or owes money
                // We'll use a simple approach: sort by whether they have unpaid weeks
                const aDivision = divisions.find(d => d.name === a.division);
                const bDivision = divisions.find(d => d.name === b.division);
                
                // Get current week for each team's division
                let aCurrentWeek = 1;
                let bCurrentWeek = 1;
                
                if (aDivision && aDivision.startDate) {
                    const [aYear, aMonth, aDay] = aDivision.startDate.split('T')[0].split('-').map(Number);
                    const aStartDate = new Date(aYear, aMonth - 1, aDay);
                    aStartDate.setHours(0, 0, 0, 0);
                    const aToday = new Date();
                    aToday.setHours(0, 0, 0, 0);
                    const aTimeDiff = aToday.getTime() - aStartDate.getTime();
                    const aDaysDiff = Math.floor(aTimeDiff / (1000 * 3600 * 24));
                    aCurrentWeek = Math.max(1, Math.floor(aDaysDiff / 7) + 1);
                }
                
                if (bDivision && bDivision.startDate) {
                    const [bYear, bMonth, bDay] = bDivision.startDate.split('T')[0].split('-').map(Number);
                    const bStartDate = new Date(bYear, bMonth - 1, bDay);
                    bStartDate.setHours(0, 0, 0, 0);
                    const bToday = new Date();
                    bToday.setHours(0, 0, 0, 0);
                    const bTimeDiff = bToday.getTime() - bStartDate.getTime();
                    const bDaysDiff = Math.floor(bTimeDiff / (1000 * 3600 * 24));
                    bCurrentWeek = Math.max(1, Math.floor(bDaysDiff / 7) + 1);
                }
                
                // Check if teams are current (all weeks paid up to current week)
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
                
                // Sort: Current teams first (true = 1, false = 0), then by team name for tie-breaking
                if (aIsCurrent !== bIsCurrent) {
                    aValue = aIsCurrent ? 1 : 0;
                    bValue = bIsCurrent ? 1 : 0;
                } else {
                    // If both have same status, sort by team name
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'weekPayment': {
                // Sort by the selected week's payment status:
                // unpaid (0) -> makeup (1) -> paid/bye (2)
                const weekFilter = document.getElementById('weekFilter');
                const selectedWeek = weekFilter && weekFilter.value ? parseInt(weekFilter.value) : currentWeek;

                const getStatusRank = (payment) => {
                    if (!payment || (payment.paid !== 'true' && payment.paid !== 'bye' && payment.paid !== 'makeup')) {
                        return 0; // unpaid
                    }
                    if (payment.paid === 'makeup') {
                        return 1; // makeup
                    }
                    return 2; // paid or bye
                };

                const aPayment = a.weeklyPayments?.find(p => p.week === selectedWeek);
                const bPayment = b.weeklyPayments?.find(p => p.week === selectedWeek);

                aValue = getStatusRank(aPayment);
                bValue = getStatusRank(bPayment);

                // If same status rank, fall back to team name
                if (aValue === bValue) {
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'sanctionStatus': {
                // Sort by sanction status: All Pending (0) -> Some Pending (1) -> All Current/All Set (2)
                // Calculate pending count for each team
                const getSanctionStatusRank = (team) => {
                    if (!team.teamMembers || team.teamMembers.length === 0) {
                        return 3; // No players - lowest priority
                    }
                    
                    // Collect all players who have been sanctioned via payment modals
                    const sanctionedPlayersFromPayments = new Set();
                    if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
                        team.weeklyPayments.forEach(payment => {
                            if (payment.paid === 'true' && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                                payment.bcaSanctionPlayers.forEach(playerName => {
                                    sanctionedPlayersFromPayments.add(playerName);
                                });
                            }
                        });
                    }
                    
                    let paidCount = 0;
                    let previouslyCount = 0;
                    const totalCount = team.teamMembers.length;
                    
                    team.teamMembers.forEach(member => {
                        const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
                        const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid;
                        
                        if (effectiveBcaSanctionPaid) {
                            paidCount++;
                        } else if (member.previouslySanctioned) {
                            previouslyCount++;
                        }
                    });
                    
                    const pendingCount = totalCount - paidCount - previouslyCount;
                    
                    if (pendingCount === totalCount) {
                        return 0; // All Pending - highest priority
                    } else if (pendingCount > 0) {
                        return 1; // Some Pending
                    } else {
                        return 2; // All Current/All Set
                    }
                };
                
                aValue = getSanctionStatusRank(a);
                bValue = getSanctionStatusRank(b);
                
                // If same status rank, fall back to team name
                if (aValue === bValue) {
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'duesStatus': {
                // Sort by amount owed - use the same calculation logic as displayTeams()
                const getAmountOwed = (team) => {
                    // Find the team's division
                    let teamDivision = null;
                    if (divisions && divisions.length > 0 && team.division) {
                        teamDivision = divisions.find(d => d.name === team.division);
                        if (!teamDivision) {
                            teamDivision = divisions.find(d => 
                                d.name && team.division && 
                                d.name.toLowerCase().trim() === team.division.toLowerCase().trim()
                            );
                        }
                    }
                    
                    if (!teamDivision) return 0;
                    
                    // Get dues rate from division
                    const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
                    const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5;
                    const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
                    const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
                    
                    // Calculate calendar week and due week (same logic as displayTeams)
                    let calendarWeek = 1;
                    let dueWeek = 1;
                    
                    if (teamDivision && teamDivision.startDate) {
                        const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                        const startDate = new Date(year, month - 1, day);
                        startDate.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const timeDiff = today.getTime() - startDate.getTime();
                        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                        calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
                        
                        const daysIntoCurrentWeek = daysDiff % 7;
                        const gracePeriodDays = 2;
                        
                        if (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) {
                            dueWeek = calendarWeek;
                        } else if (daysIntoCurrentWeek > 0 && daysIntoCurrentWeek <= gracePeriodDays) {
                            dueWeek = calendarWeek;
                        } else {
                            dueWeek = Math.max(1, calendarWeek - 1);
                        }
                        
                        if (calendarWeek > teamDivision.totalWeeks) {
                            calendarWeek = teamDivision.totalWeeks;
                            dueWeek = Math.min(dueWeek, teamDivision.totalWeeks);
                        }
                    }
                    
                    const actualCurrentWeek = dueWeek;
                    
                    // Calculate amount due now (same logic as displayTeams)
                    let amountDueNow = 0;
                    const maxWeekToCheck = calendarWeek;
                    
                    for (let week = 1; week <= maxWeekToCheck; week++) {
                        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                        const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                        const isMakeup = weekPayment?.paid === 'makeup';
                        
                        if (isUnpaid || isMakeup) {
                            // Only count weeks <= dueWeek as "due now"
                            if (week <= actualCurrentWeek) {
                                amountDueNow += weeklyDues;
                            }
                        }
                    }
                    
                    // Handle projection mode
                    if (projectionMode && teamDivision) {
                        // For sorting in projection mode, use projected dues
                        const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
                        let totalUnpaidWeeks = 0;
                        for (let w = 1; w <= totalWeeks; w++) {
                            const weekPayment = team.weeklyPayments?.find(p => p.week === w);
                            const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                            if (isUnpaid) {
                                totalUnpaidWeeks++;
                            }
                        }
                        return totalUnpaidWeeks * weeklyDues;
                    }
                    
                    return amountDueNow;
                };
                
                aValue = getAmountOwed(a);
                bValue = getAmountOwed(b);
                
                // If same amount, fall back to team name
                if (aValue === bValue) {
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'players': {
                // Sort by total number of players on the team
                const getTotalPlayers = (team) => {
                    return team.teamMembers?.length || team.playerCount || 0;
                };
                
                aValue = getTotalPlayers(a);
                bValue = getTotalPlayers(b);
                
                // If same player count, fall back to team name
                if (aValue === bValue) {
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'paymentDate': {
                // Sort by most recent payment date
                // Teams with payment dates come first, then teams without payments
                const getMostRecentPaymentDate = (team) => {
                    if (!team.weeklyPayments || team.weeklyPayments.length === 0) {
                        return null; // No payments - should sort to bottom
                    }
                    
                    // Get all paid payments with dates
                    const paidPayments = team.weeklyPayments.filter(p =>
                        (p.paid === 'true' || p.paid === true) &&
                        p.paymentDate
                    );
                    
                    if (paidPayments.length === 0) {
                        return null; // No paid payments with dates
                    }
                    
                    // Get the most recent payment date
                    paidPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
                    return new Date(paidPayments[0].paymentDate);
                };
                
                const aDate = getMostRecentPaymentDate(a);
                const bDate = getMostRecentPaymentDate(b);
                
                // Teams with dates always come before teams without dates (regardless of sort direction)
                if (!aDate && !bDate) {
                    // Both have no dates - sort by team name
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                } else if (!aDate) {
                    // a has no date, b has date - a should always be after b
                    // Use a special marker so we can handle it in comparison
                    aValue = { hasDate: false, date: null, teamName: a.teamName || '' };
                    bValue = { hasDate: true, date: bDate };
                } else if (!bDate) {
                    // a has date, b has no date - a should always be before b
                    aValue = { hasDate: true, date: aDate };
                    bValue = { hasDate: false, date: null, teamName: b.teamName || '' };
                } else {
                    // Both have dates - sort by date
                    aValue = { hasDate: true, date: aDate };
                    bValue = { hasDate: true, date: bDate };
                }
                break;
            }
            default:
                return 0;
        }
        
        // Compare values (special handling for paymentDate objects)
        if (typeof aValue === 'object' && aValue !== null && 'hasDate' in aValue) {
            // Special handling for paymentDate sorting
            if (!aValue.hasDate && !bValue.hasDate) {
                // Both have no dates - sort by team name
                if (aValue.teamName < bValue.teamName) {
                    return currentSortDirection === 'asc' ? -1 : 1;
                }
                if (aValue.teamName > bValue.teamName) {
                    return currentSortDirection === 'asc' ? 1 : -1;
                }
                return 0;
            } else if (!aValue.hasDate) {
                // a has no date, b has date - a should be after b (regardless of sort direction)
                return 1;
            } else if (!bValue.hasDate) {
                // a has date, b has no date - a should be before b (regardless of sort direction)
                return -1;
            } else {
                // Both have dates - sort by date
                if (aValue.date < bValue.date) {
                    return currentSortDirection === 'asc' ? -1 : 1;
                }
                if (aValue.date > bValue.date) {
                    return currentSortDirection === 'asc' ? 1 : -1;
                }
                return 0;
            }
        }
        
        // Standard comparison for other columns
        // Handle numeric values properly
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) {
                return currentSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return currentSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        }
        
        // String comparison
        if (aValue < bValue) {
            return currentSortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return currentSortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    // Update filteredTeams with sorted order so it persists
    if (filteredTeams.length > 0) {
        filteredTeams = teamsToSort;
    }
    
    // Update sort icons
    updateSortIcons(column);
    
    // Display sorted teams
    displayTeams(teamsToSort);
}

// Update sort icons to show current sort column and direction
function updateSortIcons(activeColumn) {
    // Reset all sort icons
    const sortIcons = document.querySelectorAll('.sort-icon');
    sortIcons.forEach(icon => {
        icon.className = 'fas fa-sort sort-icon';
    });
    
    // Update active column icon
    const activeIcon = document.getElementById(`sort-icon-${activeColumn}`);
    if (activeIcon) {
        if (currentSortDirection === 'asc') {
            activeIcon.className = 'fas fa-sort-up sort-icon';
        } else {
            activeIcon.className = 'fas fa-sort-down sort-icon';
        }
    }
}

function displayTeams(teams) {
    const tbody = document.getElementById('teamsTable');
    const teamCount = document.getElementById('teamCount');
    tbody.innerHTML = '';
    
    // Update team count badge
    teamCount.textContent = `${teams.length} Team${teams.length !== 1 ? 's' : ''}`;
    
    // Determine if "All Teams" is selected to show/hide the "Week N Payment" column
    const divisionFilterEl = document.getElementById('divisionFilter');
    const isAllTeamsSelected = !divisionFilterEl || divisionFilterEl.value === 'all';
    
    // Get the selected week from the filter (or use currentWeek global variable)
    const weekFilter = document.getElementById('weekFilter');
    const selectedWeek = weekFilter && weekFilter.value ? parseInt(weekFilter.value) : currentWeek;
    
    // Show/hide the "Week N Payment" column header
    const weekPaymentColumnHeader = document.getElementById('weekPaymentColumnHeader');
    if (weekPaymentColumnHeader) {
        weekPaymentColumnHeader.style.display = isAllTeamsSelected ? 'none' : '';
    }
    
    // Default sorting: teams that owe money first, then alphabetically
    // Only apply default sort if user hasn't manually sorted
    let teamsToRender = [...teams];
    
    if (!currentSortColumn) {
        // Calculate amount owed for each team (same logic as duesStatus sorting)
        const getAmountOwed = (team) => {
            let teamDivision = null;
            if (divisions && divisions.length > 0 && team.division) {
                teamDivision = divisions.find(d => d.name === team.division);
                if (!teamDivision) {
                    teamDivision = divisions.find(d => 
                        d.name && team.division && 
                        d.name.toLowerCase().trim() === team.division.toLowerCase().trim()
                    );
                }
            }
            
            if (!teamDivision) return 0;
            
            const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
            const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5;
            const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
            const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
            
            let calendarWeek = 1;
            let dueWeek = 1;
            
            if (teamDivision && teamDivision.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
                
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 2;
                
                if (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) {
                    dueWeek = calendarWeek;
                } else if (daysIntoCurrentWeek > 0 && daysIntoCurrentWeek <= gracePeriodDays) {
                    dueWeek = calendarWeek;
                } else {
                    dueWeek = Math.max(1, calendarWeek - 1);
                }
                
                if (calendarWeek > teamDivision.totalWeeks) {
                    calendarWeek = teamDivision.totalWeeks;
                    dueWeek = Math.min(dueWeek, teamDivision.totalWeeks);
                }
            }
            
            const actualCurrentWeek = dueWeek;
            let amountDueNow = 0;
            const maxWeekToCheck = calendarWeek;
            
            for (let week = 1; week <= maxWeekToCheck; week++) {
                const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                const isMakeup = weekPayment?.paid === 'makeup';
                
                if (isUnpaid || isMakeup) {
                    if (week <= actualCurrentWeek) {
                        amountDueNow += weeklyDues;
                    }
                }
            }
            
            if (projectionMode && teamDivision) {
                const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
                let totalUnpaidWeeks = 0;
                for (let w = 1; w <= totalWeeks; w++) {
                    const weekPayment = team.weeklyPayments?.find(p => p.week === w);
                    const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                    if (isUnpaid) {
                        totalUnpaidWeeks++;
                    }
                }
                return totalUnpaidWeeks * weeklyDues;
            }
            
            return amountDueNow;
        };
        
        // Sort by amount owed (descending - teams that owe come first), then alphabetically by team name
        teamsToRender.sort((a, b) => {
            const aAmountOwed = getAmountOwed(a);
            const bAmountOwed = getAmountOwed(b);
            
            // If both owe the same amount (including both $0), sort alphabetically
            if (aAmountOwed === bAmountOwed) {
                const aName = (a.teamName || '').toLowerCase();
                const bName = (b.teamName || '').toLowerCase();
                return aName.localeCompare(bName);
            }
            
            // Teams that owe more come first (descending order)
            return bAmountOwed - aAmountOwed;
        });
    } else if (!isAllTeamsSelected && weekFilter && weekFilter.value) {
        // When a specific division and week are selected, sort teams so UNPAID for that week appear first
        teamsToRender.sort((a, b) => {
            const aPayment = a.weeklyPayments?.find(p => p.week === selectedWeek);
            const bPayment = b.weeklyPayments?.find(p => p.week === selectedWeek);
            
            // Classify status for sorting:
            // 0 = truly unpaid (no record or paid not true/bye/makeup)
            // 1 = makeup match (paid === 'makeup')
            // 2 = paid or bye (paid === 'true' or 'bye')
            const getStatusRank = (payment) => {
                if (!payment || (payment.paid !== 'true' && payment.paid !== 'bye' && payment.paid !== 'makeup')) {
                    return 0; // unpaid
                }
                if (payment.paid === 'makeup') {
                    return 1; // makeup (treated as unpaid but after true unpaids)
                }
                return 2; // paid or bye
            };

            const aRank = getStatusRank(aPayment);
            const bRank = getStatusRank(bPayment);

            if (aRank === bRank) {
                // If same status, sort alphabetically
                const aName = (a.teamName || '').toLowerCase();
                const bName = (b.teamName || '').toLowerCase();
                return aName.localeCompare(bName);
            }
            return aRank - bRank; // lower rank first
        });
    }
    
    // Update smart summary
    calculateAndDisplaySmartSummary();
    
    // Update financial breakdown
    calculateFinancialBreakdown();
    
    teamsToRender.forEach(team => {
        try {
            // Use actual teamMembers count first (most accurate), fall back to stored playerCount
            const totalTeamPlayers = team.teamMembers?.length || team.playerCount || 0;
        const numberOfTeams = team.numberOfTeams || 1;
        const totalWeeks = team.totalWeeks || 1;
        
            // Find the team's division to get its start date and playersPerWeek setting
            // IMPORTANT: Always try to find the division, even when "all divisions" is selected
            // The calculation should be consistent regardless of filter state
            let teamDivision = null;
            if (divisions && divisions.length > 0 && team.division) {
                // Try exact match first (most common case)
                teamDivision = divisions.find(d => d.name === team.division);
                
                // If not found, try case-insensitive match
                if (!teamDivision) {
                    teamDivision = divisions.find(d => 
                        d.name && team.division && 
                        d.name.toLowerCase().trim() === team.division.toLowerCase().trim()
                    );
                }
            }
            
            if (!teamDivision) {
                console.error(`Team ${team.teamName}: Division "${team.division}" not found in divisions list.`);
                console.error(`Available divisions:`, divisions.map(d => d.name));
                console.error(`Team division value: "${team.division}", type: ${typeof team.division}`);
                console.error(`Divisions array length: ${divisions.length}, teams array length: ${teams.length}`);
            }
            
            // Get dues rate from division (more reliable than team.divisionDuesRate which might be outdated)
            const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
        
        // Calculate weekly dues amount for THIS SPECIFIC TEAM
            // Formula: dues per player × players per week × (double play multiplier if applicable)
            // Use playersPerWeek from division settings (how many players actually play each week)
            // NOT the total team roster size
            // IMPORTANT: Parse as integer to ensure correct calculation
            const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5; // Parse as integer, default to 5 if not set
            // Single play: dues × players × 1 = dues × players (e.g., $8 × 5 = $40)
            // Double play: dues × players × 2 (e.g., $8 × 5 × 2 = $80)
            const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
            const weeklyDuesAmount = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
            
            // Debug logging
            console.log(`Team ${team.teamName}: duesRate=${duesRate}, playersPerWeek=${playersPerWeek}, doublePlayMultiplier=${doublePlayMultiplier}, weeklyDuesAmount=${weeklyDuesAmount}`);
            
            // Calculate calendar week (what week we're actually in) and due week (what week payment is due)
            let calendarWeek = 1;
            let dueWeek = 1;
        
        if (teamDivision && teamDivision.startDate) {
            // Calculate what week we actually are based on today's date
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0); // Normalize to midnight
            const today = new Date();
                today.setHours(0, 0, 0, 0); // Normalize to midnight
            
                // Calculate days since start date (0 = same day as start, 1 = day after start, etc.)
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                
                // Calculate which week we're in based on days since start
                // Day 0 (start day) = Week 1, Day 1-6 = Still Week 1, Day 7 = Start of Week 2, etc.
                // So: Week = floor(days / 7) + 1
                calendarWeek = Math.floor(daysDiff / 7) + 1;
                calendarWeek = Math.max(1, calendarWeek); // Ensure at least week 1
                
                // Calculate days into current week (0 = match day, 1-6 = days after match day)
            const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 2;
                
                // Determine which week's payment is actually DUE:
                // - Match day (day 0) or past grace period (days 3+) = this week is due
                // - Grace period (days 1-2) = this week is due but not late
                // - If we haven't reached the match day yet (shouldn't happen with positive daysDiff), previous week is due
                if (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) {
                    // On match day or past grace period - this week is due
                    dueWeek = calendarWeek;
                } else if (daysIntoCurrentWeek > 0 && daysIntoCurrentWeek <= gracePeriodDays) {
                    // In grace period - this week is due but not late
                    dueWeek = calendarWeek;
                } else {
                    // Before match day (edge case) - previous week is due
                    dueWeek = Math.max(1, calendarWeek - 1);
                }
                
                // SAFETY: Cap at division's total weeks
                if (calendarWeek > teamDivision.totalWeeks) {
                    console.warn(`Team ${team.teamName}: calendarWeek (${calendarWeek}) > totalWeeks (${teamDivision.totalWeeks}), capping at totalWeeks`);
                    calendarWeek = teamDivision.totalWeeks;
                    dueWeek = Math.min(dueWeek, teamDivision.totalWeeks);
                }
                
                // Debug logging
                console.log(`Team ${team.teamName}: Start date: ${startDate.toDateString()}, Today: ${today.toDateString()}, Days diff: ${daysDiff}, Calendar week: ${calendarWeek}, Due week: ${dueWeek}, Days into week: ${daysIntoCurrentWeek}`);
            } else if (!teamDivision) {
                console.warn(`Team ${team.teamName}: No division found, defaulting to week 1`);
                calendarWeek = 1;
                dueWeek = 1;
            } else if (!teamDivision.startDate) {
                console.warn(`Team ${team.teamName}: Division has no start date, defaulting to week 1`);
                calendarWeek = 1;
                dueWeek = 1;
            }
            
            // Use dueWeek for checking what's actually owed
            const actualCurrentWeek = dueWeek;
            
            // Determine whether we are viewing "All Teams" or a specific division
            const divisionFilterElRow = document.getElementById('divisionFilter');
            const isAllTeamsSelected = !divisionFilterElRow || divisionFilterElRow.value === 'all';

            // Determine which payment date to show in the "Last Payment" column
            let weeklyPaymentDate = null;
            if (isAllTeamsSelected) {
                // When viewing all teams, show the MOST RECENT payment date for each team
                if (team.weeklyPayments && team.weeklyPayments.length > 0) {
                    // Consider only actual paid weeks with a paymentDate
                    const paidPayments = team.weeklyPayments.filter(p =>
                        (p.paid === 'true' || p.paid === true) &&
                        p.paymentDate
                    );
                    if (paidPayments.length > 0) {
                        paidPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
                        weeklyPaymentDate = paidPayments[0].paymentDate;
                    }
                }
            } else {
                // When a specific division/week is selected, use the payment for the selected week
                const selectedWeekPayment = team.weeklyPayments?.find(p => p.week === selectedWeek);
                weeklyPaymentDate = selectedWeekPayment?.paymentDate;
            }
            
            // Check the selected week for the "Week N Payment" status badge
            const weeklyPaymentForSelectedWeek = team.weeklyPayments?.find(p => p.week === selectedWeek);
            const weeklyPaid = weeklyPaymentForSelectedWeek?.paid === 'true';
            const weeklyBye = weeklyPaymentForSelectedWeek?.paid === 'bye';
            const weeklyMakeup = weeklyPaymentForSelectedWeek?.paid === 'makeup';
            const weeklyPaymentMethod = weeklyPaymentForSelectedWeek?.paymentMethod || '';
            
            // Calculate amounts owed
            // Separate "due now" from "upcoming"
            let amountDueNow = 0;
            let amountUpcoming = 0;
        let isCurrent = true;
            let unpaidWeeksDue = [];
            let unpaidWeeksUpcoming = [];
            
            // Check all weeks up to calendar week (to see upcoming too)
            // But only count weeks <= dueWeek as "due now"
            const maxWeekToCheck = calendarWeek;
            
            for (let week = 1; week <= maxWeekToCheck; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            
                // Calculate weekly dues for this week
                // Single play: dues × players × 1, Double play: dues × players × 2
                const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
                
                const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                const isMakeup = weekPayment?.paid === 'makeup';
                
                if (isUnpaid || isMakeup) {
                    // Determine if this week is due now or upcoming
                    if (week <= actualCurrentWeek) {
                        // This week is due (past match date + grace period)
                isCurrent = false;
                        amountDueNow += weeklyDues;
                        unpaidWeeksDue.push(week);
                    } else {
                        // This week is upcoming (hasn't reached match date yet)
                        amountUpcoming += weeklyDues;
                        unpaidWeeksUpcoming.push(week);
                    }
                }
            }
            
            // Total amount owed (due now only - don't count upcoming in main display)
            let amountOwed = amountDueNow;
            let unpaidWeeks = unpaidWeeksDue;
            
            // If in projection mode, calculate projected dues to end of division
            if (projectionMode && teamDivision) {
                const projection = calculateProjectedDues(team, teamDivision, calendarWeek);
                amountOwed = projection.projectedDues;
                // For projection, show all remaining weeks as "upcoming"
                amountUpcoming = projection.remainingWeeks * projection.weeklyDues;
                // Update unpaid weeks to include all remaining weeks
                const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
                unpaidWeeks = [];
                for (let w = 1; w <= totalWeeks; w++) {
                    const weekPayment = team.weeklyPayments?.find(p => p.week === w);
                    const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                    if (isUnpaid) {
                        unpaidWeeks.push(w);
                    }
                }
            }
            
            // Debug logging
            console.log(`Team ${team.teamName}: Calendar week=${calendarWeek}, Due week=${actualCurrentWeek}, Days into week=${teamDivision && teamDivision.startDate ? Math.floor((new Date() - new Date(teamDivision.startDate.split('T')[0])) / (1000 * 3600 * 24)) % 7 : 'N/A'}`);
            console.log(`Team ${team.teamName}: Due now=$${amountDueNow}, Upcoming=$${amountUpcoming}, Unpaid weeks due=[${unpaidWeeksDue.join(', ')}], Upcoming=[${unpaidWeeksUpcoming.join(', ')}]`);
            if (projectionMode) {
                console.log(`Team ${team.teamName}: PROJECTION MODE - Projected dues=$${amountOwed.toFixed(2)}`);
            }
            
            // Format division name for display (show Div A/Div B for double play)
            let divisionDisplayName = teamDivision && teamDivision.isDoublePlay 
                ? formatDivisionNameForDisplay(team.division, true)
                : team.division;
            
            // Replace " / " separator with <br> to stack division names vertically
            if (divisionDisplayName.includes(' / ')) {
                divisionDisplayName = divisionDisplayName.replace(' / ', '<br>');
            }
            
            // Calculate day of play from division start date
            let dayOfPlay = '-';
            if (teamDivision && teamDivision.startDate) {
                // Parse date string correctly to avoid timezone issues
                const dateStr = teamDivision.startDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
                const [year, month, day] = dateStr.split('-').map(Number);
                const startDate = new Date(year, month - 1, day); // month is 0-indexed
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                dayOfPlay = dayNames[startDate.getDay()];
            }
            
            // Get captain name from teamMembers[0] if captainName is not set
            const captainName = team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : 'N/A');
            const formattedCaptainName = captainName && captainName !== 'N/A' ? formatPlayerName(captainName) : captainName;
            const teamLocation = team.location || '';
            let captainTooltipText = formattedCaptainName && formattedCaptainName !== 'N/A'
                ? `Captain: ${formattedCaptainName}`
                : 'Captain: N/A';
            if (teamLocation) {
                captainTooltipText += `\nLocation: ${teamLocation}`;
            }

            // Build dues explanation text for tooltip (instead of always-visible stacked text)
            const matchesConfig = getMatchesPerWeekConfig(teamDivision || {});
            const matchesText = matchesConfig.isDoublePlay
                ? `${matchesConfig.first}+${matchesConfig.second} matches`
                : `${matchesConfig.total} matches`;
            const weeksText = unpaidWeeks.length > 1 ? ` × ${unpaidWeeks.length} weeks` : '';
            const duesExplanation = `$${duesRate}/player × ${playersPerWeek} players × ${matchesText}${weeksText}`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong data-bs-toggle="tooltip" data-bs-placement="top" title="${captainTooltipText}">
                    ${team.teamName}
                </strong>
            </td>
            <td><span class="division-badge ${getDivisionClass(team.division)}">${divisionDisplayName}</span></td>
            <td><small class="text-muted">${dayOfPlay}</small></td>
            <td>
                <span class="badge bg-info">${totalTeamPlayers} players</span>
                <br><small class="text-muted">${playersPerWeek} play/week</small>
            </td>
            <td data-sanction-status>
                ${getBCAStatusDisplay(team)}
            </td>
            <td>
                ${amountOwed > 0 || amountUpcoming > 0 ? `
                    <strong>${formatCurrency(amountOwed)}</strong>
                    <i class="fas fa-info-circle ms-1 text-muted"
                       data-bs-toggle="tooltip"
                       data-bs-placement="top"
                       title="${duesExplanation}"></i>
                    ${amountUpcoming > 0 ? `<br><small class="text-info"><i class="fas fa-calendar-alt me-1"></i>${formatCurrency(amountUpcoming)} upcoming</small>` : ''}
                ` : `
                    <strong class="text-success">${formatCurrency(amountOwed)}</strong>
                    <i class="fas fa-info-circle ms-1 text-muted"
                       data-bs-toggle="tooltip"
                       data-bs-placement="top"
                       title="All dues are paid and current."></i>
                    <br><small class="text-success">All paid up</small>
                `}
                <br>
                ${isCurrent && amountUpcoming === 0 ? `
                    <span class="status-paid">
                        <i class="fas fa-check-circle me-1"></i>Current
                </span>
                ` : amountOwed > 0 ? `
                    <span class="status-unpaid">
                        <i class="fas fa-exclamation-circle me-1"></i>Owes ${formatCurrency(amountOwed)}
                        ${unpaidWeeks.length > 0 ? `<br><small class="text-muted">Week${unpaidWeeks.length > 1 ? 's' : ''} ${unpaidWeeks.join(', ')} due</small>` : ''}
                    </span>
                    ${amountUpcoming > 0 ? `<br><small class="text-info"><i class="fas fa-info-circle me-1"></i>Week${unpaidWeeksUpcoming.length > 1 ? 's' : ''} ${unpaidWeeksUpcoming.join(', ')} upcoming</small>` : ''}
                ` : amountUpcoming > 0 ? `
                    <span class="status-paid">
                        <i class="fas fa-check-circle me-1"></i>Current
                    </span>
                    <br><small class="text-info"><i class="fas fa-calendar-alt me-1"></i>Week${unpaidWeeksUpcoming.length > 1 ? 's' : ''} ${unpaidWeeksUpcoming.join(', ')} upcoming</small>
                ` : `
                    <span class="status-paid">
                        <i class="fas fa-check-circle me-1"></i>Current
                    </span>
                `}
            </td>
            <td>${weeklyPaymentDate ? formatDateFromISO(weeklyPaymentDate) : '-'}</td>
            ${!isAllTeamsSelected ? `
            <td>
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="badge bg-${weeklyPaid ? 'success' : weeklyBye ? 'info' : weeklyMakeup ? 'warning' : 'danger'}">
                        <i class="fas fa-${weeklyPaid ? 'check' : weeklyBye ? 'pause' : weeklyMakeup ? 'clock' : 'times'} me-1"></i>
                        ${weeklyPaid ? 'Paid' : weeklyBye ? 'Bye Week' : weeklyMakeup ? 'Make Up' : 'Unpaid'}
                    </span>
                    ${weeklyPaymentMethod ? `<small class="text-muted">${weeklyPaymentMethod}</small>` : ''}
                    <button class="btn btn-outline-primary btn-sm" onclick="showWeeklyPaymentModal('${team._id}')">
                        <i class="fas fa-calendar-week"></i>
                    </button>
                </div>
            </td>
            ` : ''}
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-success btn-sm" onclick="showPaymentHistory('${team._id}')" title="Payment History">
                        <i class="fas fa-dollar-sign"></i>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="editTeam('${team._id}')" title="Edit Team">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTeam('${team._id}')" title="Delete Team">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
        } catch (error) {
            console.error(`Error displaying team ${team?.teamName || 'unknown'}:`, error);
            // Display error row (colspan depends on whether "Week N Payment" column is shown)
            const errorRow = document.createElement('tr');
            const colspan = isAllTeamsSelected ? 9 : 10; // 9 columns when "Week N Payment" is hidden, 10 when shown
            errorRow.innerHTML = `
                <td colspan="${colspan}" class="text-danger">
                    Error displaying team: ${team?.teamName || 'Unknown'} - ${error.message}
                </td>
            `;
            tbody.appendChild(errorRow);
        }
    });
    
    // Show/hide sanction fee UI based on current settings
    // Show/hide sanction fee UI based on whether fees are enabled
    const isEnabled = sanctionFeesEnabled === true || sanctionFeesEnabled === 'true';
    toggleSanctionFeeUI(isEnabled);
    
    // Initialize Bootstrap tooltips after rendering
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function displaySummary(summary) {
    // Calculate smart summary based on current teams and their status
    calculateAndDisplaySmartSummary();
    
    // Update division breakdown
    const divisionA = summary.divisionBreakdown.find(d => d._id === 'A Division');
    const divisionB = summary.divisionBreakdown.find(d => d._id === 'B Division');
    
    if (divisionA) {
        document.getElementById('divisionATotal').textContent = divisionA.count;
        document.getElementById('divisionAPaid').textContent = divisionA.paid;
        document.getElementById('divisionAAmount').textContent = divisionA.total;
    }
    
    if (divisionB) {
        document.getElementById('divisionBTotal').textContent = divisionB.count;
        document.getElementById('divisionBPaid').textContent = divisionB.paid;
        document.getElementById('divisionBAmount').textContent = divisionB.total;
    }
}

function calculateAndDisplaySmartSummary() {
    if (!teams || teams.length === 0) {
        document.getElementById('totalTeams').textContent = '0';
        document.getElementById('unpaidTeams').textContent = '0';
        const unpaidTeamsAmountEl = document.getElementById('unpaidTeamsAmount');
        if (unpaidTeamsAmountEl) {
            unpaidTeamsAmountEl.textContent = formatCurrency(0) + ' owed';
        }
        document.getElementById('totalCollected').textContent = formatCurrency(0);
        const detailsListEl = document.getElementById('totalDuesDetailsList');
        if (detailsListEl) {
            detailsListEl.innerHTML = '<small class="text-muted">No payments yet</small>';
        }
        const teamsBehindDetailsListEl = document.getElementById('teamsBehindDetailsList');
        if (teamsBehindDetailsListEl) {
            teamsBehindDetailsListEl.innerHTML = '<small class="text-muted">No teams behind</small>';
        }
        return;
    }
    
    // Check if a specific division is selected
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect ? filterSelect.value : 'all';
    
    // Determine which teams to process (same logic as calculateFinancialBreakdown)
    let teamsToProcess = teams;
    if (selectedDivisionId !== 'all') {
        const selectedDivision = divisions.find(d => d._id === selectedDivisionId || d.id === selectedDivisionId);
        if (selectedDivision) {
            teamsToProcess = teams.filter(team => team.division === selectedDivision.name);
        }
    }
    
    let totalTeams = teamsToProcess.length;
    let teamsBehind = 0;
    let totalAmountOwed = 0;
    let totalCollected = 0;
    const divisionBreakdown = {};
    const divisionOwedBreakdown = {}; // Track amounts owed per division
    
    teamsToProcess.forEach(team => {
        // Find team's division for date calculations
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) return;
        
        // Calculate actual current week for this team's division
        let actualCurrentWeek = 1;
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            startDate.setHours(0, 0, 0, 0); // Normalize to midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to midnight
            
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            
            // Calculate which week we're in: Week = floor(days / 7) + 1
            actualCurrentWeek = Math.floor(daysDiff / 7) + 1;
            actualCurrentWeek = Math.max(1, actualCurrentWeek);
            
            // Grace period: teams don't owe for current week until past grace period
            const daysIntoCurrentWeek = daysDiff % 7;
            const gracePeriodDays = 3;
            if (actualCurrentWeek > 1 && daysIntoCurrentWeek <= gracePeriodDays) {
                actualCurrentWeek = actualCurrentWeek - 1;
            }
        }
        
        // Calculate amount owed for this team
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const duesRate = teamDivision.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
        const expectedWeeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
        
        // Calculate days into current week for grace period
        let dueWeek = actualCurrentWeek;
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            startDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            const daysIntoCurrentWeek = daysDiff % 7;
            const gracePeriodDays = 2;
            
            if (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) {
                dueWeek = actualCurrentWeek;
            } else if (daysIntoCurrentWeek > 0 && daysIntoCurrentWeek <= gracePeriodDays) {
                dueWeek = actualCurrentWeek;
            } else {
                dueWeek = Math.max(1, actualCurrentWeek - 1);
            }
        }
        
        // Calculate amount owed (only weeks <= dueWeek count as "due now")
        let amountOwed = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
            const isMakeup = weekPayment?.paid === 'makeup';
            
            if ((isUnpaid || isMakeup) && week <= dueWeek) {
                amountOwed += expectedWeeklyDues;
            }
        }
        
        // Check if team is behind (has amount owed)
        if (amountOwed > 0) {
            teamsBehind++;
            totalAmountOwed += amountOwed;
            
            // Track per-division amounts owed
            const divisionName = team.division || 'Unassigned';
            if (!divisionOwedBreakdown[divisionName]) {
                divisionOwedBreakdown[divisionName] = 0;
            }
            divisionOwedBreakdown[divisionName] += amountOwed;
        }
        
        // Calculate total collected from all weekly payments (dues only, excluding sanction fees)
        // Reuse playersPerWeek, doublePlayMultiplier, duesRate, and expectedWeeklyDues already calculated above
        
        // Debug: Log calculation details for this team
        if (team.weeklyPayments && team.weeklyPayments.length > 0) {
            console.log(`[Dues Calculation] Team: ${team.teamName}, Division: ${team.division}`);
            console.log(`  - Dues Rate: $${duesRate}, Players/Week: ${playersPerWeek}, Double Play: ${doublePlayMultiplier}x`);
            console.log(`  - Expected Weekly Dues: $${expectedWeeklyDues.toFixed(2)}`);
        }
        
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                // Treat both string 'true' and boolean true as paid
                const isPaid = payment.paid === 'true' || payment.paid === true;
                
                if (isPaid) {
                    // Prefer expected weekly dues (doesn't include sanction fees)
                    // This ensures consistency - we count the expected dues amount, not the actual payment amount
                    // (which might include extra fees, partial payments, etc.)
                    let netDues = expectedWeeklyDues;

                    // Fallback: if expectedWeeklyDues is 0 for some reason, use payment.amount minus any sanction portion
                    if (!netDues && payment.amount) {
                        let bcaSanctionAmount = 0;
                        if (payment.bcaSanctionPlayers && payment.bcaSanctionPlayers.length > 0) {
                            bcaSanctionAmount = payment.bcaSanctionPlayers.length * sanctionFeeAmount;
                        } else if (payment.bcaSanctionFee) {
                            bcaSanctionAmount = sanctionFeeAmount;
                        }
                        netDues = (parseFloat(payment.amount) || 0) - bcaSanctionAmount;
                    }

                    // Debug: Log each payment being counted
                    console.log(`  - Week ${payment.week}: Paid = ${isPaid}, Payment Amount = $${payment.amount || 0}, Expected Dues = $${expectedWeeklyDues.toFixed(2)}, Net Dues Added = $${netDues.toFixed(2)}`);
                    
                    totalCollected += netDues;

                    // Track per-division dues collected
                    const divisionName = team.division || 'Unassigned';
                    if (!divisionBreakdown[divisionName]) {
                        divisionBreakdown[divisionName] = 0;
                    }
                    divisionBreakdown[divisionName] += netDues;
                } else if (payment.paid === 'bye') {
                    console.log(`  - Week ${payment.week}: Bye week - no dues required`);
                } else {
                    console.log(`  - Week ${payment.week}: Not paid (paid = ${payment.paid})`);
                }
            });
        }
        
        // If in projection mode, add projected future payments
        if (projectionMode) {
            const remainingWeeks = getRemainingWeeks(teamDivision, actualCurrentWeek);
            const projectedFutureDues = remainingWeeks * expectedWeeklyDues;
            totalCollected += projectedFutureDues;
            
            // Track per-division projected dues
            const divisionName = team.division || 'Unassigned';
            if (!divisionBreakdown[divisionName]) {
                divisionBreakdown[divisionName] = 0;
            }
            divisionBreakdown[divisionName] += projectedFutureDues;
        }
    });
    
    // Update the summary cards
    document.getElementById('totalTeams').textContent = totalTeams;
    document.getElementById('unpaidTeams').textContent = teamsBehind;
    const unpaidTeamsAmountEl = document.getElementById('unpaidTeamsAmount');
    if (unpaidTeamsAmountEl) {
        const owedText = projectionMode ? `${formatCurrency(totalAmountOwed)} (Projected) owed` : `${formatCurrency(totalAmountOwed)} owed`;
        unpaidTeamsAmountEl.textContent = owedText;
    }
    const collectedText = projectionMode ? `${formatCurrency(totalCollected)} (Projected)` : formatCurrency(totalCollected);
    document.getElementById('totalCollected').textContent = collectedText;
    
    // Debug: Log summary
    console.log(`[Dues Calculation Summary] Total Teams: ${totalTeams}, Teams Behind: ${teamsBehind}`);
    console.log(`[Dues Calculation Summary] Total Dues Collected: ${collectedText}`);
    if (Object.keys(divisionBreakdown).length > 0) {
        console.log(`[Dues Calculation Summary] Per-Division Breakdown:`, divisionBreakdown);
    }

    // Update per-division breakdown details for Total Dues Collected
    const detailsListEl = document.getElementById('totalDuesDetailsList');
    if (detailsListEl) {
        const entries = Object.entries(divisionBreakdown);
        if (entries.length === 0) {
            detailsListEl.innerHTML = '<small class="text-muted">No payments yet</small>';
        } else {
            // Sort divisions alphabetically for consistent display
            entries.sort((a, b) => a[0].localeCompare(b[0]));
            detailsListEl.innerHTML = entries.map(([name, amount]) => {
                return `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`;
            }).join('');
        }
    }
    
    // Update per-division breakdown details for Teams Behind
    const teamsBehindDetailsListEl = document.getElementById('teamsBehindDetailsList');
    if (teamsBehindDetailsListEl) {
        const owedEntries = Object.entries(divisionOwedBreakdown);
        if (owedEntries.length === 0) {
            teamsBehindDetailsListEl.innerHTML = '<small class="text-muted">No teams behind</small>';
        } else {
            // Sort divisions alphabetically for consistent display
            owedEntries.sort((a, b) => a[0].localeCompare(b[0]));
            teamsBehindDetailsListEl.innerHTML = owedEntries.map(([name, amount]) => {
                return `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`;
            }).join('');
        }
    }
}

// Team management functions
function showAddTeamModal() {
    // Reset for adding new team
    currentTeamId = null;
    
    // Clear any stored weeklyPayments data (from previous edit)
    const modal = document.getElementById('addTeamModal');
    if (modal && modal.dataset.weeklyPayments) {
        delete modal.dataset.weeklyPayments;
    }
    
    // Reset modal title and button
    document.getElementById('addTeamModal').querySelector('.modal-title').textContent = 'Add New Team';
    document.getElementById('addTeamModal').querySelector('.modal-footer .btn-primary').textContent = 'Add Team';
    document.getElementById('addTeamModal').querySelector('.modal-footer .btn-primary').setAttribute('onclick', 'addTeam()');
    
    // Reset form
    document.getElementById('addTeamForm').reset();
    
    // Clear team members and add one empty row
    const membersContainer = document.getElementById('teamMembersContainer');
    membersContainer.innerHTML = '';
    addTeamMember();
    
    // Update captain dropdown
    updateCaptainDropdown();
    
    // Show modal
    new bootstrap.Modal(document.getElementById('addTeamModal')).show();
}

// Function to convert "Lastname, Firstname" to "Firstname Lastname"
function formatPlayerName(name) {
    if (!name || typeof name !== 'string') return name;
    
    const trimmed = name.trim();
    
    // Check if name contains a comma (CSI website format: "Lastname, Firstname")
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length === 2) {
            // Reverse: "Lastname, Firstname" -> "Firstname Lastname"
            return `${parts[1]} ${parts[0]}`;
        }
    }
    
    // Return as-is if no comma found
    return trimmed;
}

// Function to handle name input blur event (convert format when user leaves field)
function handleNameInputBlur(input) {
    const originalValue = input.value.trim();
    if (originalValue && originalValue.includes(',')) {
        const formatted = formatPlayerName(originalValue);
        if (formatted !== originalValue) {
            input.value = formatted;
            // Trigger update functions
            updateDuesCalculation();
            updateCaptainDropdown();
        }
    }
}

function addTeamMember(name = '', email = '', bcaSanctionPaid = false, bcaPreviouslySanctioned = false, index = null) {
    const container = document.getElementById('teamMembersContainer');
    const newMemberRow = document.createElement('div');
    newMemberRow.className = 'row mb-1 member-row';
    
    // Format the name if it's provided
    const formattedName = name ? formatPlayerName(name) : '';
    
    // Create a unique identifier for this player's radio buttons
    // Use the player name if available, otherwise use index or timestamp
    const uniqueId = formattedName ? formattedName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : `player_${index || Date.now()}`;
    const radioName = `bcaSanctionPaid_${uniqueId}`;
    
    // Handle null/undefined email values - convert to empty string
    const emailValue = (email && email !== 'null' && email !== 'undefined') ? email : '';
    
    newMemberRow.innerHTML = `
        <div class="col-md-4">
            <input type="text" class="form-control form-control-sm" placeholder="Player name" name="memberName" value="${formattedName}" oninput="updateDuesCalculation(); updateCaptainDropdown()" onblur="handleNameInputBlur(this)">
        </div>
        <div class="col-md-3">
            <input type="email" class="form-control form-control-sm" placeholder="Email (optional)" name="memberEmail" value="${emailValue}">
        </div>
        <div class="col-md-4">
            <div class="bca-status-container">
                <div class="btn-group w-100" role="group" data-sanction-status-tooltip="true" title="${sanctionFeeName} Status: Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned">
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPending_${uniqueId}_${index || Date.now()}" value="false" ${!bcaSanctionPaid && !bcaPreviouslySanctioned ? 'checked' : ''}>
                    <label class="btn btn-outline-warning btn-sm" for="bcaPending_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-clock"></i> Pending
                    </label>
                    
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPaid_${uniqueId}_${index || Date.now()}" value="true" ${bcaSanctionPaid ? 'checked' : ''}>
                    <label class="btn btn-outline-success btn-sm" for="bcaPaid_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-check"></i> Paid
                    </label>
                    
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPreviously_${uniqueId}_${index || Date.now()}" value="previously" ${bcaPreviouslySanctioned ? 'checked' : ''}>
                    <label class="btn btn-outline-info btn-sm" for="bcaPreviously_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-history"></i> Previously
                    </label>
                </div>
            </div>
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeMember(this)" title="Remove member">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(newMemberRow);
    updateDuesCalculation();
}

function removeMember(button) {
    button.closest('.member-row').remove();
    updateDuesCalculation();
    updateCaptainDropdown();
}

function updateCaptainDropdown(captainNameToInclude = null) {
    const captainSelect = document.getElementById('captainName');
    if (!captainSelect) return;
    
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    
    // Store current selection
    const currentSelection = captainSelect.value || captainNameToInclude;
    
    // Clear existing options
    captainSelect.innerHTML = '<option value="">Select Captain</option>';
    
    // Collect all unique names from member rows
    const memberNames = new Set();
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const memberName = nameInput ? nameInput.value.trim() : '';
        
        if (memberName) {
            memberNames.add(memberName);
        }
    });
    
    // Add the captain name if provided (for editing teams with only a captain)
    if (captainNameToInclude && captainNameToInclude.trim()) {
        memberNames.add(captainNameToInclude.trim());
    }
    
    // Add all unique names as options
    memberNames.forEach(name => {
            const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
            captainSelect.appendChild(option);
    });
    
    // Restore selection if it exists in the options
    if (currentSelection && Array.from(captainSelect.options).some(option => option.value === currentSelection)) {
        captainSelect.value = currentSelection;
    }
}

function updateDuesCalculation() {
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    let playerCount = 0;
    
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        if (nameInput && nameInput.value.trim()) {
            playerCount++;
        }
    });
    
    const divisionName = document.getElementById('division').value;
    const division = divisions.find(d => d.name === divisionName);
    const calculationDiv = document.getElementById('duesCalculation');
    
    if (division) {
        // Use playersPerWeek from division settings (not total team roster size)
        const playersPerWeek = parseInt(division.playersPerWeek, 10) || 5;
        const matchesCfg = getMatchesPerWeekConfig(division);
        const matchesPerWeek = matchesCfg.total;
        const totalDues = playersPerWeek * division.duesPerPlayerPerMatch * matchesPerWeek * division.totalWeeks;
        const playType = division.isDoublePlay
            ? `Double Play (${matchesCfg.first} + ${matchesCfg.second} matches/week)`
            : `Regular (${matchesPerWeek} matches/week)`;
        
        if (playerCount > 0) {
            calculationDiv.innerHTML = `
                <div class="alert alert-success">
                    <small><strong>Total Dues:</strong> ${formatCurrency(division.duesPerPlayerPerMatch)} × ${playersPerWeek} players/week × ${matchesPerWeek} matches × ${division.totalWeeks} weeks = <strong>${formatCurrency(totalDues)}</strong><br>
                    <strong>Division Type:</strong> ${playType}<br>
                    <strong>Team Roster:</strong> ${playerCount} player${playerCount !== 1 ? 's' : ''} (${playersPerWeek} play per week)</small>
                </div>
            `;
        } else {
            calculationDiv.innerHTML = `
                <div class="alert alert-info">
                    <small><strong>Example Calculation:</strong> ${formatCurrency(division.duesPerPlayerPerMatch)} × ${playersPerWeek} players/week × ${matchesPerWeek} matches × ${division.totalWeeks} weeks = <strong>${formatCurrency(totalDues)}</strong><br>
                    <strong>Division Type:</strong> ${playType}<br>
                    <em>Add team members above to see your team's total dues</em></small>
                </div>
            `;
        }
    } else {
        calculationDiv.innerHTML = `
            <small class="text-muted">Please select a division first</small>
        `;
    }
}

async function addTeam() {
    const teamData = {
        teamName: document.getElementById('teamName').value,
        division: document.getElementById('division').value,
        location: document.getElementById('teamLocation') ? document.getElementById('teamLocation').value.trim() : '',
        teamMembers: []
    };
    
    // Add captain as first member
    const captainNameInput = document.getElementById('captainName');
    const captainName = captainNameInput ? captainNameInput.value : '';
    const captainEmail = document.getElementById('captainEmail').value;
    const captainPhone = document.getElementById('captainPhone').value;
    let formattedCaptainName = '';
    if (captainName.trim()) {
        // Format captain name from "Lastname, Firstname" to "Firstname Lastname"
        formattedCaptainName = formatPlayerName(captainName);
        teamData.teamMembers.push({ 
            name: formattedCaptainName, 
            email: captainEmail.trim(),
            phone: captainPhone.trim()
        });
    }
    
    // Collect additional team members (exclude captain to avoid duplicates)
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const emailInput = row.querySelector('input[name="memberEmail"]');
        
        if (nameInput && nameInput.value.trim()) {
            // Format member name from "Lastname, Firstname" to "Firstname Lastname"
            const formattedMemberName = formatPlayerName(nameInput.value);
            
            // Skip if this member is the same as the captain (avoid duplicates)
            if (formattedMemberName.toLowerCase().trim() === formattedCaptainName.toLowerCase().trim()) {
                return;
            }
            
            // Get the unique radio name for this player's row
            // Find any radio button in this row to get the name attribute
            const bcaStatusContainer = row.querySelector('.bca-status-container');
            const bcaSanctionRadio = bcaStatusContainer ? bcaStatusContainer.querySelector('input[type="radio"]:checked') : null;
            
            // If no radio is checked, find the first radio to get the name pattern
            let radioName = null;
            if (!bcaSanctionRadio) {
                const firstRadio = bcaStatusContainer ? bcaStatusContainer.querySelector('input[type="radio"]') : null;
                if (firstRadio) {
                    radioName = firstRadio.name;
                }
            } else {
                radioName = bcaSanctionRadio.name;
            }
            
            // Find the checked radio button with this name pattern
            const checkedRadio = row.querySelector(`input[name="${radioName}"]:checked`);
            const bcaValue = checkedRadio ? checkedRadio.value : 'false';
            
            teamData.teamMembers.push({
                name: formattedMemberName,
                email: emailInput ? emailInput.value.trim() : '',
                bcaSanctionPaid: bcaValue === 'true',
                previouslySanctioned: bcaValue === 'previously'
            });
        }
    });
    
    try {
        const response = await apiCall('/teams', {
            method: 'POST',
            body: JSON.stringify(teamData)
        });
        
        if (response.ok) {
            // Update global player status for all team members
            await updateGlobalPlayerStatusForTeamMembers(teamData.teamMembers);
            
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            loadData();
            alert('Team added successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error adding team');
        }
    } catch (error) {
        alert('Error adding team. Please try again.');
    }
}

// Helper function to update global player status for all team members
async function updateGlobalPlayerStatusForTeamMembers(teamMembers) {
    if (!teamMembers || !Array.isArray(teamMembers)) return;
    
    // Update each team member's global status
    for (const member of teamMembers) {
        if (!member.name) continue;
        
        try {
            const updates = {};
            if (member.bcaSanctionPaid !== undefined) {
                updates.bcaSanctionPaid = member.bcaSanctionPaid === true || member.bcaSanctionPaid === 'true';
            }
            if (member.previouslySanctioned !== undefined) {
                updates.previouslySanctioned = member.previouslySanctioned === true || member.previouslySanctioned === 'true';
            }
            if (member.email !== undefined) updates.email = member.email;
            if (member.phone !== undefined) updates.phone = member.phone;
            
            // Only update if there are actual changes
            if (Object.keys(updates).length > 0) {
                const response = await apiCall(`/players/${encodeURIComponent(member.name.trim())}/status`, {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) {
                    console.warn(`Failed to update global status for player "${member.name}"`);
                }
            }
        } catch (error) {
            console.error(`Error updating global status for player "${member.name}":`, error);
        }
    }
}

function showPaymentModal(teamId) {
    currentTeamId = teamId;
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentMethod').value = 'Cash';
    
    // Find the team to get division info
    const team = teams.find(t => t._id === teamId);
    if (team) {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (teamDivision) {
            populatePaymentAmountDropdown(team, teamDivision);
        }
    }
    
    new bootstrap.Modal(document.getElementById('paymentModal')).show();
}

function populatePaymentAmountDropdown(team, teamDivision) {
    const paymentAmountSelect = document.getElementById('paymentAmount');
    paymentAmountSelect.innerHTML = '<option value="">Select Amount</option>';
    
    // Use individual player dues rate (not team amount)
    const individualDuesRate = team.divisionDuesRate;
    
    // Add options for multiples of individual dues (1x, 2x, 3x, etc.)
    for (let multiplier = 1; multiplier <= 20; multiplier++) {
        const amount = individualDuesRate * multiplier;
        const option = document.createElement('option');
        option.value = amount;
        option.textContent = formatCurrency(amount);
        paymentAmountSelect.appendChild(option);
    }
}

function updatePaymentAmount() {
    const selectedAmount = document.getElementById('paymentAmount').value;
    // You can add any additional logic here if needed
}

async function recordPayment() {
    const paymentData = {
        paymentMethod: document.getElementById('paymentMethod').value,
        amount: document.getElementById('paymentAmount').value,
        notes: document.getElementById('paymentNotes').value
    };
    
    try {
        const response = await apiCall(`/teams/${currentTeamId}/pay-dues`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
            
            // Preserve current division filter before reloading data
            const currentDivisionFilter = document.getElementById('divisionFilter').value;
            
            loadData().then(() => {
                // Restore the division filter after data is reloaded
                if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                    document.getElementById('divisionFilter').value = currentDivisionFilter;
                    filterTeamsByDivision();
                }
            });
            
            alert('Payment recorded successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error recording payment');
        }
    } catch (error) {
        alert('Error recording payment. Please try again.');
    }
}

async function markUnpaid(teamId) {
    if (!confirm('Are you sure you want to mark this team as unpaid?')) {
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({
                duesPaid: false,
                paymentDate: null,
                paymentMethod: '',
                notes: ''
            })
        });
        
        if (response.ok) {
            loadData();
            alert('Team marked as unpaid');
        } else {
            alert('Error updating team status');
        }
    } catch (error) {
        alert('Error updating team status. Please try again.');
    }
}

async function editTeam(teamId) {
    // Find the team to edit
    const team = teams.find(t => t._id === teamId);
    if (!team) return;
    
    // Set the current team ID for editing
    currentTeamId = teamId;
    
    // Store the team's weeklyPayments to preserve them during update
    // Store in a data attribute on the modal so we can access it in updateTeam
    const modal = document.getElementById('addTeamModal');
    if (modal && team.weeklyPayments) {
        modal.dataset.weeklyPayments = JSON.stringify(team.weeklyPayments);
    } else if (modal) {
        modal.dataset.weeklyPayments = JSON.stringify([]);
    }
    
    // Update modal title and button
    document.getElementById('addTeamModal').querySelector('.modal-title').textContent = 'Edit Team';
    document.getElementById('addTeamModal').querySelector('.modal-footer .btn-primary').textContent = 'Update Team';
    document.getElementById('addTeamModal').querySelector('.modal-footer .btn-primary').setAttribute('onclick', 'updateTeam()');
    
    // Populate form with team data
    document.getElementById('teamName').value = team.teamName;
    document.getElementById('division').value = team.division;
    document.getElementById('captainEmail').value = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].email : '';
    document.getElementById('captainPhone').value = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].phone || '' : '';
    document.getElementById('teamLocation').value = team.location || '';
    
    // Get and format captain name first
    const captainName = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : '';
    const formattedCaptainName = captainName ? formatPlayerName(captainName) : '';
    
    // Store the original captain name for change detection
    const captainSelect = document.getElementById('captainName');
    if (captainSelect) {
        captainSelect.dataset.originalCaptain = formattedCaptainName;
    }
    
    // Populate team members (include ALL members, including captain)
    // First, check if any players have been sanctioned via payment modals
    const sanctionedPlayersFromPayments = new Set();
    if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
        team.weeklyPayments.forEach(payment => {
            if (payment.paid === 'true' && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                payment.bcaSanctionPlayers.forEach(playerName => {
                    sanctionedPlayersFromPayments.add(playerName);
                });
            }
        });
    }
    
    const membersContainer = document.getElementById('teamMembersContainer');
    membersContainer.innerHTML = '';
    
    if (team.teamMembers && team.teamMembers.length > 0) {
        // Add all members (including the captain, so they appear in member list)
        // Note: Team member status should already be synced with global status via backend
        team.teamMembers.forEach((member, index) => {
            // Check if player was sanctioned via payment modal (overrides member's bcaSanctionPaid)
            const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
            const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid;
            
            addTeamMember(member.name, member.email, effectiveBcaSanctionPaid, member.previouslySanctioned, index);
        });
    } else {
        // Add at least one empty member field
        addTeamMember();
    }
    
    // Update dues calculation first
    updateDuesCalculation();
    
    // Update captain dropdown with the captain name explicitly
    updateCaptainDropdown(formattedCaptainName);
    
    // Set captain name AFTER dropdown is populated
    if (formattedCaptainName && captainSelect) {
        captainSelect.value = formattedCaptainName;
        
        // Add change event listener to handle captain changes
        const handleCaptainChange = function() {
            const newCaptainName = this.value.trim();
            const oldCaptainName = this.dataset.originalCaptain || '';
            
            // If captain changed and old captain exists, make sure old captain is in member list
            if (oldCaptainName && newCaptainName && newCaptainName !== oldCaptainName) {
                // Check if old captain is already in member rows
                const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
                let oldCaptainFound = false;
                
                memberRows.forEach(row => {
                    const nameInput = row.querySelector('input[name="memberName"]');
                    if (nameInput && nameInput.value.trim().toLowerCase() === oldCaptainName.toLowerCase()) {
                        oldCaptainFound = true;
                    }
                });
                
                // If old captain is not in member list, add them
                if (!oldCaptainFound) {
                    // Try to get old captain's email/phone from original team data
                    const oldCaptainMember = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0] : null;
                    addTeamMember(
                        oldCaptainName, 
                        oldCaptainMember ? (oldCaptainMember.email || '') : '', 
                        oldCaptainMember ? (oldCaptainMember.bcaSanctionPaid || false) : false,
                        oldCaptainMember ? (oldCaptainMember.previouslySanctioned || false) : false
                    );
    updateDuesCalculation();
    updateCaptainDropdown();
                }
            }
            
            // Update the stored original captain for tracking
            // But keep the original for reference when saving
        };
        
        // Remove old listener if it exists (using named function stored on element)
        if (captainSelect.onCaptainChange) {
            captainSelect.removeEventListener('change', captainSelect.onCaptainChange);
        }
        // Store reference to handler
        captainSelect.onCaptainChange = handleCaptainChange;
        // Add new listener
        captainSelect.addEventListener('change', handleCaptainChange);
    }
    
    // Show the modal
    new bootstrap.Modal(document.getElementById('addTeamModal')).show();
}

async function updateTeam() {
    const teamData = {
        teamName: document.getElementById('teamName').value,
        division: document.getElementById('division').value,
        location: document.getElementById('teamLocation') ? document.getElementById('teamLocation').value.trim() : '',
        teamMembers: []
    };
    
    // Get captain info from dropdown
    const captainNameInput = document.getElementById('captainName');
    const captainName = captainNameInput ? captainNameInput.value : '';
    let formattedCaptainName = '';
    if (captainName.trim()) {
        formattedCaptainName = formatPlayerName(captainName);
    }
    
    // Collect ALL team members from member rows (including captain if they're in the list)
    // This ensures we get sanction status for everyone, including the captain
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    let captainFoundInMembers = false;
    let captainEmailFromMember = '';
    let captainPhoneFromMember = '';
    
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const emailInput = row.querySelector('input[name="memberEmail"]');
        
        if (nameInput && nameInput.value.trim()) {
            // Format member name from "Lastname, Firstname" to "Firstname Lastname"
            const formattedMemberName = formatPlayerName(nameInput.value);
            
            // Check if this is the captain
            const isCaptain = formattedMemberName.toLowerCase().trim() === formattedCaptainName.toLowerCase().trim();
            if (isCaptain) {
                captainFoundInMembers = true;
                // Get email from member row, but prefer the captain email field if it's filled
                captainEmailFromMember = emailInput ? emailInput.value.trim() : '';
            }
            
            // Get the unique radio name for this player's row
            // Find any radio button in this row to get the name attribute
            const bcaStatusContainer = row.querySelector('.bca-status-container');
            const bcaSanctionRadio = bcaStatusContainer ? bcaStatusContainer.querySelector('input[type="radio"]:checked') : null;
            
            // If no radio is checked, find the first radio to get the name pattern
            let radioName = null;
            if (!bcaSanctionRadio) {
                const firstRadio = bcaStatusContainer ? bcaStatusContainer.querySelector('input[type="radio"]') : null;
                if (firstRadio) {
                    radioName = firstRadio.name;
                }
            } else {
                radioName = bcaSanctionRadio.name;
            }
            
            // Find the checked radio button with this name pattern
            const checkedRadio = row.querySelector(`input[name="${radioName}"]:checked`);
            const bcaValue = checkedRadio ? checkedRadio.value : 'false';
            
            // Use email/phone from member row inputs
            const memberEmail = emailInput ? emailInput.value.trim() : '';
            const memberPhone = ''; // Phone not stored in member rows
            
            teamData.teamMembers.push({ 
                name: formattedMemberName, 
                email: memberEmail,
                phone: memberPhone,
                bcaSanctionPaid: bcaValue === 'true',
                previouslySanctioned: bcaValue === 'previously'
            });
        }
    });
    
    // If captain is not in member rows, add them as first member (shouldn't happen if editTeam worked correctly, but handle it)
    if (formattedCaptainName && !captainFoundInMembers) {
        const captainEmailInput = document.getElementById('captainEmail');
        const captainPhoneInput = document.getElementById('captainPhone');
        teamData.teamMembers.unshift({ 
            name: formattedCaptainName, 
            email: (captainEmailInput ? captainEmailInput.value.trim() : '') || captainEmailFromMember,
            phone: captainPhoneInput ? captainPhoneInput.value.trim() : '',
            bcaSanctionPaid: false,
            previouslySanctioned: false
        });
    }
    
    // Ensure captain is first in the teamMembers array
    if (formattedCaptainName && teamData.teamMembers.length > 0) {
        // Find the captain in the members array
        const captainIndex = teamData.teamMembers.findIndex(member => 
            member.name.toLowerCase().trim() === formattedCaptainName.toLowerCase().trim()
        );
        
        if (captainIndex > 0) {
            // Move captain to first position
            const captain = teamData.teamMembers.splice(captainIndex, 1)[0];
            teamData.teamMembers.unshift(captain);
        }
    }
    
    // Get captain email/phone - prefer the captain email/phone fields, but fall back to member row if not set
    const captainEmailInput = document.getElementById('captainEmail');
    const captainPhoneInput = document.getElementById('captainPhone');
    const finalCaptainEmail = (captainEmailInput && captainEmailInput.value.trim()) || captainEmailFromMember || '';
    const finalCaptainPhone = (captainPhoneInput && captainPhoneInput.value.trim()) || '';
    
    // Update captain's email/phone in teamMembers array if captain is found
    if (formattedCaptainName && teamData.teamMembers.length > 0) {
        const captainMember = teamData.teamMembers.find(member => 
            member.name.toLowerCase().trim() === formattedCaptainName.toLowerCase().trim()
        );
        if (captainMember) {
            captainMember.email = finalCaptainEmail;
            captainMember.phone = finalCaptainPhone;
        }
    }
    
    // Set captain name, email, and phone explicitly on teamData
    teamData.captainName = formattedCaptainName;
    teamData.captainEmail = finalCaptainEmail;
    teamData.captainPhone = finalCaptainPhone;
    
    // Preserve weeklyPayments from the original team data
    // First try to get from modal dataset (stored when editTeam was called)
    const modal = document.getElementById('addTeamModal');
    let weeklyPayments = null;
    
    if (modal && modal.dataset.weeklyPayments) {
        try {
            weeklyPayments = JSON.parse(modal.dataset.weeklyPayments);
        } catch (e) {
            console.error('Error parsing weeklyPayments from modal dataset:', e);
        }
    }
    
    // Fallback: Get from teams array if modal dataset is missing
    if ((!weeklyPayments || (Array.isArray(weeklyPayments) && weeklyPayments.length === 0)) && currentTeamId) {
        const originalTeam = teams.find(t => t._id === currentTeamId);
        if (originalTeam && originalTeam.weeklyPayments && Array.isArray(originalTeam.weeklyPayments) && originalTeam.weeklyPayments.length > 0) {
            weeklyPayments = originalTeam.weeklyPayments;
            console.log('Using weeklyPayments from teams array:', weeklyPayments.length, 'payments');
        }
    }
    
    // Set weeklyPayments (use empty array only if we truly have no data)
    teamData.weeklyPayments = weeklyPayments || [];
    
    // Calculate player count
    teamData.playerCount = teamData.teamMembers.length;
    
    // Get division details for dues calculation
    const selectedDivision = divisions.find(d => d.name === teamData.division);
    if (selectedDivision) {
        teamData.divisionDuesRate = selectedDivision.duesPerPlayerPerMatch;
        teamData.numberOfTeams = selectedDivision.numberOfTeams;
        teamData.totalWeeks = selectedDivision.totalWeeks;
        teamData.isDoublePlay = selectedDivision.isDoublePlay;
        
        // Calculate dues amount
        const matchesCfg = getMatchesPerWeekConfig(teamData);
        const matchesPerWeek = matchesCfg.total;
        teamData.duesAmount = teamData.divisionDuesRate * teamData.playerCount * matchesPerWeek * teamData.totalWeeks;
    }
    
    try {
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamData)
        });
        
        if (response.ok) {
            // Update global player status for all team members
            await updateGlobalPlayerStatusForTeamMembers(teamData.teamMembers);
            
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            loadData();
            alert('Team updated successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating team');
        }
    } catch (error) {
        alert('Error updating team. Please try again.');
    }
}

async function deleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadData();
            alert('Team deleted successfully!');
        } else {
            alert('Error deleting team');
        }
    } catch (error) {
        alert('Error deleting team. Please try again.');
    }
}

function refreshData() {
    loadData();
}

// Division management functions
function updateDivisionDropdown() {
    const divisionSelect = document.getElementById('division');
    divisionSelect.innerHTML = '<option value="">Select Division</option>';
    
    // Filter out temp divisions (they're orphaned from old code)
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
            option.textContent = `${displayName} (${formatCurrency(division.duesPerPlayerPerMatch)}/player/match, ${playType}, ${division.currentTeams}/${division.numberOfTeams} teams)`;
            divisionSelect.appendChild(option);
        }
    });
}

function showDivisionManagement() {
    loadDivisions();
    displayDivisions();
    new bootstrap.Modal(document.getElementById('divisionManagementModal')).show();
}

function displayDivisions() {
    const tbody = document.getElementById('divisionsTable');
    tbody.innerHTML = '';
    
    // Filter out temporary divisions (they're orphaned from old code)
    const activeDivisions = divisions.filter(division => {
        // Skip temp divisions and inactive divisions with "Temporary" description
        if (division._id && division._id.startsWith('temp_')) return false;
        if (division.id && division.id.startsWith('temp_')) return false;
        if (!division.isActive && division.description === 'Temporary') return false;
        return true;
    });
    
    activeDivisions.forEach(division => {
        const row = document.createElement('tr');
        
        // Format division name for display (especially for double play)
        let displayName = division.name;
        if (division.isDoublePlay) {
            // For double play, show both complete division names
            const divider = ' / ';
            if (division.name.includes(divider)) {
                // Format: "First Division Name / Second Division Name"
                // Display both names clearly
                const parts = division.name.split(divider);
                if (parts.length === 2) {
                    displayName = `${parts[0].trim()} / ${parts[1].trim()}`;
                }
            }
        }
        
        row.innerHTML = `
            <td><strong>${displayName}</strong>${division.isDoublePlay ? '<br><small class="text-muted">Double Play Division</small>' : ''}</td>
            <td>$${division.duesPerPlayerPerMatch}</td>
            <td><span class="badge ${division.isDoublePlay ? 'bg-warning' : 'bg-info'}">${division.isDoublePlay ? 'Double Play' : 'Regular'}</span></td>
            <td>${division.numberOfTeams}</td>
            <td>${division.totalWeeks}</td>
            <td><span class="badge ${division.currentTeams >= division.numberOfTeams ? 'bg-danger' : 'bg-success'}">${division.currentTeams}</span></td>
            <td><span class="badge ${division.isActive ? 'bg-success' : 'bg-secondary'}">${division.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editDivision('${division._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteDivision('${division._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function toggleDoublePlayOptions() {
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    const doublePlayOptions = document.getElementById('doublePlayOptions');
    const regularDivisionFields = document.getElementById('regularDivisionFields');
    const regularMatchesWrapper = document.getElementById('regularMatchesPerWeekWrapper');
    const matchesPerWeek = document.getElementById('matchesPerWeek');
    const divisionName = document.getElementById('divisionName');
    const firstGameType = document.getElementById('firstGameType');
    const firstDivisionName = document.getElementById('firstDivisionName');
    const firstDivisionGameType = document.getElementById('firstDivisionGameType');
    const secondDivisionName = document.getElementById('secondDivisionName');
    const secondDivisionGameType = document.getElementById('secondDivisionGameType');
    const firstMatchesPerWeek = document.getElementById('firstMatchesPerWeek');
    const secondMatchesPerWeek = document.getElementById('secondMatchesPerWeek');
    
    if (isDoublePlay) {
        // Hide regular division fields
        if (regularDivisionFields) regularDivisionFields.style.display = 'none';
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'none';
        if (matchesPerWeek) matchesPerWeek.required = false;
        if (divisionName) divisionName.required = false;
        if (firstGameType) firstGameType.required = false;
        
        // Show and require double play fields
        doublePlayOptions.style.display = 'block';
        if (firstDivisionName) firstDivisionName.required = true;
        if (firstDivisionGameType) firstDivisionGameType.required = true;
        if (secondDivisionName) secondDivisionName.required = true;
        if (secondDivisionGameType) secondDivisionGameType.required = true;
        if (firstMatchesPerWeek) firstMatchesPerWeek.required = true;
        if (secondMatchesPerWeek) secondMatchesPerWeek.required = true;
    } else {
        // Show regular division fields
        if (regularDivisionFields) regularDivisionFields.style.display = 'block';
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'block';
        if (matchesPerWeek) matchesPerWeek.required = true;
        if (divisionName) divisionName.required = true;
        if (firstGameType) firstGameType.required = true;
        
        // Hide and clear double play fields
        doublePlayOptions.style.display = 'none';
        if (firstDivisionName) {
            firstDivisionName.required = false;
            firstDivisionName.value = '';
        }
        if (firstDivisionGameType) {
            firstDivisionGameType.required = false;
            firstDivisionGameType.value = '';
        }
        if (secondDivisionName) {
            secondDivisionName.required = false;
            secondDivisionName.value = '';
        }
        if (secondDivisionGameType) {
            secondDivisionGameType.required = false;
            secondDivisionGameType.value = '';
        }
        if (firstMatchesPerWeek) {
            firstMatchesPerWeek.required = false;
            firstMatchesPerWeek.value = '5';
        }
        if (secondMatchesPerWeek) {
            secondMatchesPerWeek.required = false;
            secondMatchesPerWeek.value = '5';
        }
    }
}

function updateGameTypeOptions() {
    // Check if we're in double play mode or regular mode
    const isDoublePlay = document.getElementById('isDoublePlay')?.checked || false;
    
    if (isDoublePlay) {
        // Handle double play division game types
        const firstDivisionGameType = document.getElementById('firstDivisionGameType');
        const secondDivisionGameType = document.getElementById('secondDivisionGameType');
        
        if (!firstDivisionGameType || !secondDivisionGameType) return;
        
        const firstValue = firstDivisionGameType.value;
        const secondValue = secondDivisionGameType.value;
    const allOptions = ['8-ball', '9-ball', '10-ball'];
    
        // Update first division game type dropdown
        firstDivisionGameType.innerHTML = '<option value="">Select Game Type</option>';
    allOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (option === secondValue && firstValue !== option) {
            optionElement.disabled = true;
        }
            firstDivisionGameType.appendChild(optionElement);
    });
        if (firstValue) firstDivisionGameType.value = firstValue;
    
        // Update second division game type dropdown
        secondDivisionGameType.innerHTML = '<option value="">Select Game Type</option>';
    allOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (option === firstValue && secondValue !== option) {
            optionElement.disabled = true;
        }
            secondDivisionGameType.appendChild(optionElement);
        });
        if (secondValue) secondDivisionGameType.value = secondValue;
    } else {
        // Handle regular division game types (only firstGameType exists for regular divisions)
        const firstGameType = document.getElementById('firstGameType');
        
        if (!firstGameType) return;
        
        // For regular divisions, just ensure the dropdown has all options
        const firstValue = firstGameType.value;
        const allOptions = ['8-ball', '9-ball', '10-ball'];
        
        // Only update if not already populated (to avoid clearing user selection)
        if (firstGameType.options.length <= 4) {
            firstGameType.innerHTML = '<option value="">Select Game Type</option>';
            allOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                firstGameType.appendChild(optionElement);
            });
            if (firstValue) firstGameType.value = firstValue;
        }
    }
}

function showAddDivisionModal() {
    currentDivisionId = null;
    document.getElementById('divisionModalTitle').textContent = 'Add New Division';
    document.getElementById('divisionSubmitBtn').textContent = 'Create Division';
    document.getElementById('divisionSubmitBtn').setAttribute('onclick', 'addDivision()');
    document.getElementById('addDivisionForm').reset();
    document.getElementById('doublePlayOptions').style.display = 'none';
    
    // Reset calculation method to percentage
    const divisionMethodPercentage = document.getElementById('divisionMethodPercentage');
    const divisionMethodDollarAmount = document.getElementById('divisionMethodDollarAmount');
    if (divisionMethodPercentage) divisionMethodPercentage.checked = true;
    if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = false;
    toggleDivisionCalculationMethod();
    
    // Clear financial breakdown fields (will use operator defaults)
    const divisionPrizeFundNameEl = document.getElementById('divisionPrizeFundName');
    const divisionPrizeFundPercentEl = document.getElementById('divisionPrizeFundPercentage');
    const divisionFirstOrgNameEl = document.getElementById('divisionFirstOrgName');
    const divisionFirstOrgPercentEl = document.getElementById('divisionFirstOrgPercentage');
    const divisionSecondOrgNameEl = document.getElementById('divisionSecondOrgName');
    const divisionSecondOrgPercentEl = document.getElementById('divisionSecondOrgPercentage');
    
    // Clear dollar amount fields
    const divisionPrizeFundAmountEl = document.getElementById('divisionPrizeFundAmount');
    const divisionFirstOrgNameDollarEl = document.getElementById('divisionFirstOrgNameDollar');
    const divisionFirstOrgAmountEl = document.getElementById('divisionFirstOrganizationAmount');
    const divisionSecondOrgNameDollarEl = document.getElementById('divisionSecondOrgNameDollar');
    const divisionSecondOrgAmountEl = document.getElementById('divisionSecondOrganizationAmount');
    
    if (divisionPrizeFundNameEl) divisionPrizeFundNameEl.value = '';
    if (divisionPrizeFundPercentEl) divisionPrizeFundPercentEl.value = '';
    if (divisionFirstOrgNameEl) divisionFirstOrgNameEl.value = '';
    if (divisionFirstOrgPercentEl) divisionFirstOrgPercentEl.value = '';
    if (divisionSecondOrgNameEl) divisionSecondOrgNameEl.value = '';
    if (divisionSecondOrgPercentEl) divisionSecondOrgPercentEl.value = '';
    if (divisionPrizeFundAmountEl) divisionPrizeFundAmountEl.value = '';
    if (divisionFirstOrgNameDollarEl) divisionFirstOrgNameDollarEl.value = '';
    if (divisionFirstOrgAmountEl) divisionFirstOrgAmountEl.value = '';
    if (divisionSecondOrgNameDollarEl) divisionSecondOrgNameDollarEl.value = '';
    if (divisionSecondOrgAmountEl) divisionSecondOrgAmountEl.value = '';
    
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
}

function editDivision(divisionId) {
    const division = divisions.find(d => d._id === divisionId);
    if (!division) return;
    
    currentDivisionId = divisionId;
    document.getElementById('divisionModalTitle').textContent = 'Edit Division';
    document.getElementById('divisionSubmitBtn').textContent = 'Update Division';
    document.getElementById('divisionSubmitBtn').setAttribute('onclick', 'updateDivision()');
    
    // Populate form with division data
    // For double play divisions, parse the combined name into two separate division names
    if (division.isDoublePlay) {
        // For double play, we'll parse the name below
        // Don't set it here yet
    } else {
    document.getElementById('divisionName').value = division.name;
    }
    
    document.getElementById('duesPerPlayerPerMatch').value = division.duesPerPlayerPerMatch.toString();
    document.getElementById('playersPerWeek').value = (division.playersPerWeek || 5).toString();
    document.getElementById('numberOfTeams').value = division.numberOfTeams.toString();
    document.getElementById('totalWeeks').value = division.totalWeeks.toString();
    // Parse dates correctly to avoid timezone issues
    if (division.startDate) {
        const startDateStr = division.startDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
        document.getElementById('startDate').value = startDateStr;
    } else {
        document.getElementById('startDate').value = '';
    }
    
    if (division.endDate) {
        const endDateStr = division.endDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
        document.getElementById('endDate').value = endDateStr;
    } else {
        document.getElementById('endDate').value = '';
    }
    
    // Show day of the week if start date exists (parse correctly to avoid timezone issues)
    if (division.startDate) {
        // Parse date string correctly to avoid timezone issues
        const dateStr = division.startDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
        const [year, month, day] = dateStr.split('-').map(Number);
        const start = new Date(year, month - 1, day); // month is 0-indexed
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[start.getDay()];
        document.getElementById('startDayName').textContent = dayName;
        document.getElementById('startDateDay').style.display = 'block';
    }
    document.getElementById('isDoublePlay').checked = division.isDoublePlay || false;
    document.getElementById('divisionDescription').value = division.description || '';

    // Matches/week (new - default to 5 for backwards compatibility)
    const matchesPerWeekField = document.getElementById('matchesPerWeek');
    if (matchesPerWeekField) matchesPerWeekField.value = String(division.matchesPerWeek || 5);
    const firstMatchesField = document.getElementById('firstMatchesPerWeek');
    const secondMatchesField = document.getElementById('secondMatchesPerWeek');
    if (firstMatchesField) firstMatchesField.value = String(division.firstMatchesPerWeek || 5);
    if (secondMatchesField) secondMatchesField.value = String(division.secondMatchesPerWeek || 5);
    
    // Set calculation method based on division settings
    const divisionUsesDollarAmounts = division.use_dollar_amounts !== undefined && division.use_dollar_amounts !== null
        ? division.use_dollar_amounts
        : (division.useDollarAmounts !== undefined && division.useDollarAmounts !== null ? division.useDollarAmounts : false);
    
    const divisionMethodPercentage = document.getElementById('divisionMethodPercentage');
    const divisionMethodDollarAmount = document.getElementById('divisionMethodDollarAmount');
    if (divisionUsesDollarAmounts) {
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = true;
        if (divisionMethodPercentage) divisionMethodPercentage.checked = false;
    } else {
        if (divisionMethodPercentage) divisionMethodPercentage.checked = true;
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = false;
    }
    toggleDivisionCalculationMethod();
    
    // Populate financial breakdown fields (if set, otherwise leave blank to use operator defaults)
    const divisionPrizeFundNameEl = document.getElementById('divisionPrizeFundName');
    const divisionPrizeFundPercentEl = document.getElementById('divisionPrizeFundPercentage');
    const divisionFirstOrgNameEl = document.getElementById('divisionFirstOrgName');
    const divisionFirstOrgPercentEl = document.getElementById('divisionFirstOrgPercentage');
    const divisionSecondOrgNameEl = document.getElementById('divisionSecondOrgName');
    const divisionSecondOrgPercentEl = document.getElementById('divisionSecondOrgPercentage');
    
    // Dollar amount fields
    const divisionPrizeFundAmountEl = document.getElementById('divisionPrizeFundAmount');
    const divisionPrizeFundAmountTypePerTeam = document.getElementById('divisionPrizeFundPerTeam');
    const divisionPrizeFundAmountTypePerPlayer = document.getElementById('divisionPrizeFundPerPlayer');
    const divisionFirstOrgNameDollarEl = document.getElementById('divisionFirstOrgNameDollar');
    const divisionFirstOrgAmountEl = document.getElementById('divisionFirstOrganizationAmount');
    const divisionFirstOrgAmountTypePerTeam = document.getElementById('divisionFirstOrgPerTeam');
    const divisionFirstOrgAmountTypePerPlayer = document.getElementById('divisionFirstOrgPerPlayer');
    const divisionSecondOrgNameDollarEl = document.getElementById('divisionSecondOrgNameDollar');
    const divisionSecondOrgAmountEl = document.getElementById('divisionSecondOrganizationAmount');
    const divisionSecondOrgAmountTypePerTeam = document.getElementById('divisionSecondOrgPerTeam');
    const divisionSecondOrgAmountTypePerPlayer = document.getElementById('divisionSecondOrgPerPlayer');
    
    if (divisionPrizeFundNameEl) divisionPrizeFundNameEl.value = division.prize_fund_name || division.prizeFundName || '';
    if (divisionPrizeFundPercentEl) divisionPrizeFundPercentEl.value = division.prize_fund_percentage || division.prizeFundPercentage || '';
    if (divisionFirstOrgNameEl) divisionFirstOrgNameEl.value = division.first_organization_name || division.firstOrganizationName || '';
    if (divisionFirstOrgPercentEl) divisionFirstOrgPercentEl.value = division.first_organization_percentage || division.firstOrganizationPercentage || '';
    if (divisionSecondOrgNameEl) divisionSecondOrgNameEl.value = division.second_organization_name || division.secondOrganizationName || '';
    if (divisionSecondOrgPercentEl) divisionSecondOrgPercentEl.value = division.second_organization_percentage || division.secondOrganizationPercentage || '';
    
    // Dollar amount fields
    if (divisionPrizeFundAmountEl) {
        divisionPrizeFundAmountEl.value = division.prize_fund_amount || division.prizeFundAmount || '';
        const prizeFundAmountType = division.prize_fund_amount_type || division.prizeFundAmountType || 'perTeam';
        if (prizeFundAmountType === 'perPlayer') {
            if (divisionPrizeFundAmountTypePerPlayer) divisionPrizeFundAmountTypePerPlayer.checked = true;
            if (divisionPrizeFundAmountTypePerTeam) divisionPrizeFundAmountTypePerTeam.checked = false;
        } else {
            if (divisionPrizeFundAmountTypePerTeam) divisionPrizeFundAmountTypePerTeam.checked = true;
            if (divisionPrizeFundAmountTypePerPlayer) divisionPrizeFundAmountTypePerPlayer.checked = false;
        }
    }
    if (divisionFirstOrgNameDollarEl) divisionFirstOrgNameDollarEl.value = division.first_organization_name || division.firstOrganizationName || '';
    if (divisionFirstOrgAmountEl) {
        divisionFirstOrgAmountEl.value = division.first_organization_amount || division.firstOrganizationAmount || '';
        const firstOrgAmountType = division.first_organization_amount_type || division.firstOrganizationAmountType || 'perTeam';
        if (firstOrgAmountType === 'perPlayer') {
            if (divisionFirstOrgAmountTypePerPlayer) divisionFirstOrgAmountTypePerPlayer.checked = true;
            if (divisionFirstOrgAmountTypePerTeam) divisionFirstOrgAmountTypePerTeam.checked = false;
        } else {
            if (divisionFirstOrgAmountTypePerTeam) divisionFirstOrgAmountTypePerTeam.checked = true;
            if (divisionFirstOrgAmountTypePerPlayer) divisionFirstOrgAmountTypePerPlayer.checked = false;
        }
    }
    if (divisionSecondOrgNameDollarEl) divisionSecondOrgNameDollarEl.value = division.second_organization_name || division.secondOrganizationName || '';
    if (divisionSecondOrgAmountEl) {
        divisionSecondOrgAmountEl.value = division.second_organization_amount || division.secondOrganizationAmount || '';
        const secondOrgAmountType = division.second_organization_amount_type || division.secondOrganizationAmountType || 'perTeam';
        if (secondOrgAmountType === 'perPlayer') {
            if (divisionSecondOrgAmountTypePerPlayer) divisionSecondOrgAmountTypePerPlayer.checked = true;
            if (divisionSecondOrgAmountTypePerTeam) divisionSecondOrgAmountTypePerTeam.checked = false;
        } else {
            if (divisionSecondOrgAmountTypePerTeam) divisionSecondOrgAmountTypePerTeam.checked = true;
            if (divisionSecondOrgAmountTypePerPlayer) divisionSecondOrgAmountTypePerPlayer.checked = false;
        }
    }
    
    // Handle double play options for editing
    if (division.isDoublePlay) {
        document.getElementById('doublePlayOptions').style.display = 'block';
        document.getElementById('regularDivisionFields').style.display = 'none';
        const regularMatchesWrapper = document.getElementById('regularMatchesPerWeekWrapper');
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'none';
        
        // For double-play, stored format is "First Name - First Game Type / Second Name - Second Game Type"
        // Parse to extract name and game type for each division
        let firstDivisionName = '';
        let firstDivisionGameType = '';
        let secondDivisionName = '';
        let secondDivisionGameType = '';
        
        const divider = ' / ';
        if (division.name.includes(divider)) {
            // Format: "First Name - First Game Type / Second Name - Second Game Type"
            const parts = division.name.split(divider);
            if (parts.length === 2) {
                // Parse first division: "Name - Game Type"
                const firstDashIndex = parts[0].indexOf(' - ');
                if (firstDashIndex > -1) {
                    firstDivisionName = parts[0].substring(0, firstDashIndex).trim();
                    firstDivisionGameType = parts[0].substring(firstDashIndex + 3).trim();
                }
                
                // Parse second division: "Name - Game Type"
                const secondDashIndex = parts[1].indexOf(' - ');
                if (secondDashIndex > -1) {
                    secondDivisionName = parts[1].substring(0, secondDashIndex).trim();
                    secondDivisionGameType = parts[1].substring(secondDashIndex + 3).trim();
                }
            }
        } else if (division.name.includes(' - ') && division.name.includes(' & ')) {
            // Old format: "Base Name - Game Type 1 & Game Type 2"
            const dashIndex = division.name.indexOf(' - ');
            const baseName = division.name.substring(0, dashIndex).trim();
            const gameTypes = division.name.substring(dashIndex + 3).trim();
            const gameParts = gameTypes.split(' & ');
            if (gameParts.length === 2) {
                firstDivisionName = baseName;
                firstDivisionGameType = gameParts[0].trim();
                secondDivisionName = baseName;
                secondDivisionGameType = gameParts[1].trim();
            }
        }
        
        // Set the fields
        const firstDivisionNameField = document.getElementById('firstDivisionName');
        const firstDivisionGameTypeField = document.getElementById('firstDivisionGameType');
        const secondDivisionNameField = document.getElementById('secondDivisionName');
        const secondDivisionGameTypeField = document.getElementById('secondDivisionGameType');
        
        if (firstDivisionNameField) firstDivisionNameField.value = firstDivisionName;
        if (firstDivisionGameTypeField) firstDivisionGameTypeField.value = firstDivisionGameType;
        if (secondDivisionNameField) secondDivisionNameField.value = secondDivisionName;
        if (secondDivisionGameTypeField) secondDivisionGameTypeField.value = secondDivisionGameType;
        
        // Update game type options to prevent duplicates
        updateGameTypeOptions();
    } else {
        document.getElementById('doublePlayOptions').style.display = 'none';
        document.getElementById('regularDivisionFields').style.display = 'block';
        const regularMatchesWrapper = document.getElementById('regularMatchesPerWeekWrapper');
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'block';
    }
    
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
}

async function addDivision() {
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    let divisionName = '';
    
    // Format division name for double play - combine name and game type for each division
    if (isDoublePlay) {
        const firstDivisionName = document.getElementById('firstDivisionName').value.trim();
        const firstDivisionGameType = document.getElementById('firstDivisionGameType').value.trim();
        const secondDivisionName = document.getElementById('secondDivisionName').value.trim();
        const secondDivisionGameType = document.getElementById('secondDivisionGameType').value.trim();
        
        if (!firstDivisionName) {
            alert('Please enter a First Division Name for double-play divisions');
            return;
        }
        
        if (!firstDivisionGameType) {
            alert('Please select a First Division Game Type');
            return;
        }
        
        if (!secondDivisionName) {
            alert('Please enter a Second Division Name for double-play divisions');
            return;
        }
        
        if (!secondDivisionGameType) {
            alert('Please select a Second Division Game Type');
            return;
        }
        
        // Format: "First Name - First Game Type / Second Name - Second Game Type"
        divisionName = `${firstDivisionName} - ${firstDivisionGameType} / ${secondDivisionName} - ${secondDivisionGameType}`;
    } else {
        divisionName = document.getElementById('divisionName').value.trim();
        if (!divisionName) {
            alert('Please enter a division name');
            return;
        }
    }
    
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: parseFloat(document.getElementById('duesPerPlayerPerMatch').value),
        playersPerWeek: parseInt(document.getElementById('playersPerWeek').value) || 5,
        matchesPerWeek: parseInt(document.getElementById('matchesPerWeek')?.value, 10) || 5,
        firstMatchesPerWeek: parseInt(document.getElementById('firstMatchesPerWeek')?.value, 10) || 5,
        secondMatchesPerWeek: parseInt(document.getElementById('secondMatchesPerWeek')?.value, 10) || 5,
        numberOfTeams: parseInt(document.getElementById('numberOfTeams').value),
        totalWeeks: parseInt(document.getElementById('totalWeeks').value),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        isDoublePlay: isDoublePlay,
        description: document.getElementById('divisionDescription').value
    };
    
    // Add financial breakdown configuration if provided (optional - will use operator defaults if not set)
    const divisionCalculationMethod = document.querySelector('input[name="divisionCalculationMethod"]:checked')?.value || 'percentage';
    const divisionUsesDollarAmounts = divisionCalculationMethod === 'dollar';
    
    if (divisionUsesDollarAmounts) {
        divisionData.useDollarAmounts = true;
        // Dollar amount settings
        const divisionPrizeFundName = document.getElementById('divisionPrizeFundName')?.value.trim();
        const divisionPrizeFundAmount = document.getElementById('divisionPrizeFundAmount')?.value.trim();
        const divisionPrizeFundAmountType = document.querySelector('input[name="divisionPrizeFundAmountType"]:checked')?.value || 'perTeam';
        const divisionFirstOrgName = document.getElementById('divisionFirstOrgNameDollar')?.value.trim() || document.getElementById('divisionFirstOrgName')?.value.trim();
        const divisionFirstOrgAmount = document.getElementById('divisionFirstOrganizationAmount')?.value.trim();
        const divisionFirstOrgAmountType = document.querySelector('input[name="divisionFirstOrgAmountType"]:checked')?.value || 'perTeam';
        const divisionSecondOrgName = document.getElementById('divisionSecondOrgNameDollar')?.value.trim() || document.getElementById('divisionSecondOrgName')?.value.trim();
        const divisionSecondOrgAmount = document.getElementById('divisionSecondOrganizationAmount')?.value.trim();
        const divisionSecondOrgAmountType = document.querySelector('input[name="divisionSecondOrgAmountType"]:checked')?.value || 'perTeam';
        
        if (divisionPrizeFundName) divisionData.prizeFundName = divisionPrizeFundName;
        if (divisionPrizeFundAmount && !isNaN(parseFloat(divisionPrizeFundAmount))) {
            divisionData.prizeFundAmount = parseFloat(divisionPrizeFundAmount);
            divisionData.prizeFundAmountType = divisionPrizeFundAmountType;
        }
        if (divisionFirstOrgName) divisionData.firstOrganizationName = divisionFirstOrgName;
        if (divisionFirstOrgAmount && !isNaN(parseFloat(divisionFirstOrgAmount))) {
            divisionData.firstOrganizationAmount = parseFloat(divisionFirstOrgAmount);
            divisionData.firstOrganizationAmountType = divisionFirstOrgAmountType;
        }
        if (divisionSecondOrgName) divisionData.secondOrganizationName = divisionSecondOrgName;
        if (divisionSecondOrgAmount && !isNaN(parseFloat(divisionSecondOrgAmount))) {
            divisionData.secondOrganizationAmount = parseFloat(divisionSecondOrgAmount);
            divisionData.secondOrganizationAmountType = divisionSecondOrgAmountType;
        }
    } else {
        divisionData.useDollarAmounts = false;
        // Percentage settings
        const divisionPrizeFundName = document.getElementById('divisionPrizeFundName')?.value.trim();
        const divisionPrizeFundPercent = document.getElementById('divisionPrizeFundPercentage')?.value.trim();
        const divisionFirstOrgName = document.getElementById('divisionFirstOrgName')?.value.trim();
        const divisionFirstOrgPercent = document.getElementById('divisionFirstOrgPercentage')?.value.trim();
        const divisionSecondOrgName = document.getElementById('divisionSecondOrgName')?.value.trim();
        const divisionSecondOrgPercent = document.getElementById('divisionSecondOrgPercentage')?.value.trim();
        
        if (divisionPrizeFundName) divisionData.prizeFundName = divisionPrizeFundName;
        if (divisionPrizeFundPercent && !isNaN(parseFloat(divisionPrizeFundPercent))) {
            divisionData.prizeFundPercentage = parseFloat(divisionPrizeFundPercent);
        }
        if (divisionFirstOrgName) divisionData.firstOrganizationName = divisionFirstOrgName;
        if (divisionFirstOrgPercent && !isNaN(parseFloat(divisionFirstOrgPercent))) {
            divisionData.firstOrganizationPercentage = parseFloat(divisionFirstOrgPercent);
        }
        if (divisionSecondOrgName) divisionData.secondOrganizationName = divisionSecondOrgName;
        if (divisionSecondOrgPercent && !isNaN(parseFloat(divisionSecondOrgPercent))) {
            divisionData.secondOrganizationPercentage = parseFloat(divisionSecondOrgPercent);
        }
    }
    
    try {
        const response = await apiCall('/divisions', {
            method: 'POST',
            body: JSON.stringify(divisionData)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addDivisionModal')).hide();
            loadDivisions();
            displayDivisions();
            alert('Division created successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error creating division');
        }
    } catch (error) {
        alert('Error creating division. Please try again.');
    }
}

// Helper function to calculate end date from start date and weeks
function calculateEndDateFromStart(startDate, totalWeeks) {
    if (!startDate || !totalWeeks) return '';
    const [year, month, day] = startDate.split('T')[0].split('-').map(Number);
    const start = new Date(year, month - 1, day); // month is 0-indexed
    const end = new Date(start);
    // End date is the last day of the last week
    // Week 1 starts on startDate and is 7 days (day 0-6)
    // Week 12 would be days 77-83 (7 * 11 to 7 * 12 - 1)
    // So the last day of week 12 is startDate + (12 * 7) - 1 = startDate + 83 days
    // However, user expects April 1 for 12 weeks from Jan 7, which is startDate + 84 days
    // Let's check: Jan 7 + 84 = March 31, so for April 1 we'd need 85 days
    // Actually, the calculation should be: startDate + (totalWeeks * 7) gives us the start of week (totalWeeks + 1)
    // To get the last day of week totalWeeks, we subtract 1: startDate + (totalWeeks * 7) - 1
    // But if user wants April 1 for 12 weeks, we should not subtract 1
    end.setDate(start.getDate() + (totalWeeks * 7));
    return end.toISOString().split('T')[0];
}

// Smart Builder double play options toggle
function toggleSmartBuilderDoublePlayOptions() {
    const isDoublePlay = document.getElementById('smartBuilderIsDoublePlay').checked;
    const optionsDiv = document.getElementById('smartBuilderDoublePlayOptions');
    const divisionNameInput = document.getElementById('smartBuilderDivisionName');
    const firstGameTypeSelect = document.getElementById('firstGameType');
    
    if (isDoublePlay) {
        optionsDiv.style.display = 'block';
        divisionNameInput.required = false;
        firstGameTypeSelect.required = false;
    } else {
        optionsDiv.style.display = 'none';
        divisionNameInput.required = true;
        firstGameTypeSelect.required = true;
    }
}

// Smart Builder end date calculator
function calculateSmartBuilderEndDate() {
    const startDate = document.getElementById('smartBuilderStartDate').value;
    const totalWeeks = parseInt(document.getElementById('smartBuilderTotalWeeks').value) || 0;
    const endDateInput = document.getElementById('smartBuilderEndDate');
    
    if (startDate && totalWeeks > 0) {
        const endDate = calculateEndDateFromStart(startDate, totalWeeks);
        endDateInput.value = endDate;
    } else {
        endDateInput.value = '';
    }
}

async function updateDivision() {
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    let divisionName = '';
    
    // Format division name for double play - combine name and game type for each division
    if (isDoublePlay) {
        const firstDivisionName = document.getElementById('firstDivisionName').value.trim();
        const firstDivisionGameType = document.getElementById('firstDivisionGameType').value.trim();
        const secondDivisionName = document.getElementById('secondDivisionName').value.trim();
        const secondDivisionGameType = document.getElementById('secondDivisionGameType').value.trim();
        
        if (!firstDivisionName) {
            alert('Please enter a First Division Name for double-play divisions');
            return;
        }
        
        if (!firstDivisionGameType) {
            alert('Please select a First Division Game Type');
            return;
        }
        
        if (!secondDivisionName) {
            alert('Please enter a Second Division Name for double-play divisions');
            return;
        }
        
        if (!secondDivisionGameType) {
            alert('Please select a Second Division Game Type');
            return;
        }
        
        // Format: "First Name - First Game Type / Second Name - Second Game Type"
        divisionName = `${firstDivisionName} - ${firstDivisionGameType} / ${secondDivisionName} - ${secondDivisionGameType}`;
    } else {
        // For regular divisions, use the divisionName field
        divisionName = document.getElementById('divisionName').value.trim();
        if (!divisionName) {
            alert('Please enter a division name');
            return;
        }
    }
    
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: parseFloat(document.getElementById('duesPerPlayerPerMatch').value),
        playersPerWeek: parseInt(document.getElementById('playersPerWeek').value) || 5,
        matchesPerWeek: parseInt(document.getElementById('matchesPerWeek')?.value, 10) || 5,
        firstMatchesPerWeek: parseInt(document.getElementById('firstMatchesPerWeek')?.value, 10) || 5,
        secondMatchesPerWeek: parseInt(document.getElementById('secondMatchesPerWeek')?.value, 10) || 5,
        numberOfTeams: parseInt(document.getElementById('numberOfTeams').value),
        totalWeeks: parseInt(document.getElementById('totalWeeks').value),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        isDoublePlay: isDoublePlay,
        description: document.getElementById('divisionDescription').value
    };
    
    // Add financial breakdown configuration if provided (optional - will use operator defaults if not set)
    const divisionCalculationMethod = document.querySelector('input[name="divisionCalculationMethod"]:checked')?.value || 'percentage';
    const divisionUsesDollarAmounts = divisionCalculationMethod === 'dollar';
    
    if (divisionUsesDollarAmounts) {
        divisionData.useDollarAmounts = true;
        // Dollar amount settings
        const divisionPrizeFundName = document.getElementById('divisionPrizeFundName')?.value.trim();
        const divisionPrizeFundAmount = document.getElementById('divisionPrizeFundAmount')?.value.trim();
        const divisionPrizeFundAmountType = document.querySelector('input[name="divisionPrizeFundAmountType"]:checked')?.value || 'perTeam';
        const divisionFirstOrgName = document.getElementById('divisionFirstOrgNameDollar')?.value.trim() || document.getElementById('divisionFirstOrgName')?.value.trim();
        const divisionFirstOrgAmount = document.getElementById('divisionFirstOrganizationAmount')?.value.trim();
        const divisionFirstOrgAmountType = document.querySelector('input[name="divisionFirstOrgAmountType"]:checked')?.value || 'perTeam';
        const divisionSecondOrgName = document.getElementById('divisionSecondOrgNameDollar')?.value.trim() || document.getElementById('divisionSecondOrgName')?.value.trim();
        const divisionSecondOrgAmount = document.getElementById('divisionSecondOrganizationAmount')?.value.trim();
        const divisionSecondOrgAmountType = document.querySelector('input[name="divisionSecondOrgAmountType"]:checked')?.value || 'perTeam';
        
        if (divisionPrizeFundName) divisionData.prizeFundName = divisionPrizeFundName;
        if (divisionPrizeFundAmount && !isNaN(parseFloat(divisionPrizeFundAmount))) {
            divisionData.prizeFundAmount = parseFloat(divisionPrizeFundAmount);
            divisionData.prizeFundAmountType = divisionPrizeFundAmountType;
        }
        if (divisionFirstOrgName) divisionData.firstOrganizationName = divisionFirstOrgName;
        if (divisionFirstOrgAmount && !isNaN(parseFloat(divisionFirstOrgAmount))) {
            divisionData.firstOrganizationAmount = parseFloat(divisionFirstOrgAmount);
            divisionData.firstOrganizationAmountType = divisionFirstOrgAmountType;
        }
        if (divisionSecondOrgName) divisionData.secondOrganizationName = divisionSecondOrgName;
        if (divisionSecondOrgAmount && !isNaN(parseFloat(divisionSecondOrgAmount))) {
            divisionData.secondOrganizationAmount = parseFloat(divisionSecondOrgAmount);
            divisionData.secondOrganizationAmountType = divisionSecondOrgAmountType;
        }
    } else {
        divisionData.useDollarAmounts = false;
        // Percentage settings
        const divisionPrizeFundName = document.getElementById('divisionPrizeFundName')?.value.trim();
        const divisionPrizeFundPercent = document.getElementById('divisionPrizeFundPercentage')?.value.trim();
        const divisionFirstOrgName = document.getElementById('divisionFirstOrgName')?.value.trim();
        const divisionFirstOrgPercent = document.getElementById('divisionFirstOrgPercentage')?.value.trim();
        const divisionSecondOrgName = document.getElementById('divisionSecondOrgName')?.value.trim();
        const divisionSecondOrgPercent = document.getElementById('divisionSecondOrgPercentage')?.value.trim();
        
        if (divisionPrizeFundName) divisionData.prizeFundName = divisionPrizeFundName;
        if (divisionPrizeFundPercent && !isNaN(parseFloat(divisionPrizeFundPercent))) {
            divisionData.prizeFundPercentage = parseFloat(divisionPrizeFundPercent);
        }
        if (divisionFirstOrgName) divisionData.firstOrganizationName = divisionFirstOrgName;
        if (divisionFirstOrgPercent && !isNaN(parseFloat(divisionFirstOrgPercent))) {
            divisionData.firstOrganizationPercentage = parseFloat(divisionFirstOrgPercent);
        }
        if (divisionSecondOrgName) divisionData.secondOrganizationName = divisionSecondOrgName;
        if (divisionSecondOrgPercent && !isNaN(parseFloat(divisionSecondOrgPercent))) {
            divisionData.secondOrganizationPercentage = parseFloat(divisionSecondOrgPercent);
        }
    }
    
    console.log('📤 Sending division update:', {
        divisionId: currentDivisionId,
        divisionData: divisionData,
        reconstructedName: divisionName
    });
    console.log('📤 Full divisionData JSON:', JSON.stringify(divisionData, null, 2));
    
    try {
        const response = await apiCall(`/divisions/${currentDivisionId}`, {
            method: 'PUT',
            body: JSON.stringify(divisionData)
        });
        
        if (response.ok) {
            const updatedDivision = await response.json();
            console.log('✅ Division updated successfully:', updatedDivision);
            bootstrap.Modal.getInstance(document.getElementById('addDivisionModal')).hide();
            // Reload all data to refresh the display with updated division name
            loadData().then(() => {
            displayDivisions();
                updateDivisionDropdown(); // Refresh the dropdown with updated names
            alert('Division updated successfully!');
            });
        } else {
            const errorData = await response.json();
            console.error('❌ Error updating division:', errorData);
            console.error('❌ Full error object:', JSON.stringify(errorData, null, 2));
            let errorMessage = errorData.message || errorData.error || 'Error updating division';
            
            // Provide helpful message for duplicate name errors
            if (errorData.errorCode === '23505' || errorData.error?.includes('duplicate key') || errorData.error?.includes('unique constraint')) {
                errorMessage = `A division with the name "${divisionData.name}" already exists. Please choose a different name or delete the existing division first.`;
            }
            
            const errorHint = errorData.hint ? `\n\nHint: ${errorData.hint}` : '';
            alert(`${errorMessage}${errorHint}`);
        }
    } catch (error) {
        console.error('❌ Exception updating division:', error);
        alert('Error updating division. Please try again.');
    }
}

async function deleteDivision(divisionId) {
    if (!confirm('Are you sure you want to delete this division? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await apiCall(`/divisions/${divisionId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadDivisions();
            displayDivisions();
            alert('Division deleted successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error deleting division');
        }
    } catch (error) {
        alert('Error deleting division. Please try again.');
    }
}

// Utility functions
// Format date from ISO string without timezone conversion (extracts YYYY-MM-DD and formats it)
function formatDate(dateString) {
    if (!dateString) return '-';
    // Extract date part (YYYY-MM-DD) from ISO string to avoid timezone issues
    const datePart = dateString.split('T')[0];
    if (!datePart) return '-';
    
    // Parse and format as MM/DD/YYYY
    const [year, month, day] = datePart.split('-').map(Number);
    return `${month}/${day}/${year}`;
}

// Format date from ISO string to display format (MM/DD/YYYY) without timezone conversion
function formatDateFromISO(isoString) {
    if (!isoString) return '-';
    // Extract date part (YYYY-MM-DD) from ISO string to avoid timezone issues
    const datePart = isoString.split('T')[0];
    if (!datePart) return '-';
    
    // Parse and format as MM/DD/YYYY
    const [year, month, day] = datePart.split('-').map(Number);
    return `${month}/${day}/${year}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Division filtering functions
function updateDivisionFilter() {
    const filterSelect = document.getElementById('divisionFilter');
    if (!filterSelect) return;
    
    // Clear existing options except "All Teams"
    filterSelect.innerHTML = '<option value="all">All Teams</option>';
    
    // Add division options (filter out temp divisions)
    divisions.forEach(division => {
        // Skip temp divisions and inactive divisions with "Temporary" description
        if (division._id && division._id.startsWith('temp_')) return;
        if (division.id && division.id.startsWith('temp_')) return;
        if (!division.isActive && division.description === 'Temporary') return;
        
        if (division.isActive) {
            const option = document.createElement('option');
            // Use _id if available, otherwise use id
            option.value = division._id || division.id;
            option.textContent = division.name;
            filterSelect.appendChild(option);
        }
    });
}

function updateTeamsSectionTitle() {
    const titleTextEl = document.getElementById('teamsSectionTitleText');
    const filterSelect = document.getElementById('divisionFilter');
    if (!titleTextEl || !filterSelect) return;
    
    const selectedDivisionId = filterSelect.value;
    let titleText = 'League Teams';
    
    if (selectedDivisionId && selectedDivisionId !== 'all') {
        const selectedDivision = divisions.find(d => d._id === selectedDivisionId);
        if (selectedDivision?.name) {
            titleText = selectedDivision.name;
        } else {
            // fallback to selected option text
            titleText = filterSelect.options[filterSelect.selectedIndex]?.textContent || 'League Teams';
        }
    }
    
    // Update only the text (icon + badge stay in place)
    titleTextEl.textContent = titleText;
}

function filterTeamsByDivision() {
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect.value;
    
    if (selectedDivisionId === 'all') {
        filteredTeams = teams;
        // Show overall divisions summary when viewing all teams
        updateDivisionSpecificSummary(null);
    } else {
        // Find the division name from the selected ID (check both _id and id)
        const selectedDivision = divisions.find(d => 
            (d._id === selectedDivisionId) || (d.id === selectedDivisionId)
        );
        if (selectedDivision) {
            // Filter teams by division name (case-insensitive, trimmed)
            filteredTeams = teams.filter(team => {
                if (!team.division) return false;
                const teamDivision = team.division.trim();
                const selectedDivisionName = selectedDivision.name.trim();
                // Try exact match first
                if (teamDivision === selectedDivisionName) return true;
                // Try case-insensitive match
                if (teamDivision.toLowerCase() === selectedDivisionName.toLowerCase()) return true;
                // For double play divisions, check if team division matches the formatted name
                if (selectedDivision.isDoublePlay) {
                    // Double play divisions might be stored as "Name - Type / Name - Type"
                    const formattedName = `${selectedDivision.firstDivisionName || ''} - ${selectedDivision.firstDivisionGameType || ''} / ${selectedDivision.secondDivisionName || ''} - ${selectedDivision.secondDivisionGameType || ''}`;
                    if (teamDivision === formattedName.trim() || 
                        teamDivision.toLowerCase() === formattedName.toLowerCase().trim()) {
                        return true;
                    }
                }
                return false;
            });
            console.log(`Filtered ${filteredTeams.length} teams for division "${selectedDivision.name}" (from ${teams.length} total teams)`);
            updateDivisionSpecificSummary(selectedDivision);
        } else {
            console.warn('Selected division not found:', selectedDivisionId);
            console.warn('Available divisions:', divisions.map(d => ({ _id: d._id, id: d.id, name: d.name })));
            console.warn('Available team divisions:', [...new Set(teams.map(t => t.division))]);
            filteredTeams = teams;
            // Fallback to overall summary
            updateDivisionSpecificSummary(null);
        }
    }
    
    // Update week dates to match the selected division
    updateWeekDropdownWithDates(selectedDivisionId);

    // Update the section title above the main table
    updateTeamsSectionTitle();
    
    // Display the filtered teams
    displayTeams(filteredTeams);
    
    // Update financial breakdown for the selected division
    calculateFinancialBreakdown();
    calculateAndDisplaySmartSummary();
}

// Toggle projection mode
function toggleProjectionMode() {
    const toggle = document.getElementById('projectionModeToggle');
    projectionMode = toggle ? toggle.checked : false;
    
    // Update UI to show projection mode indicator
    const projectionIndicator = document.getElementById('projectionIndicator');
    if (projectionMode) {
        // Add visual indicator that we're in projection mode
        if (!projectionIndicator) {
            const indicator = document.createElement('div');
            indicator.id = 'projectionIndicator';
            indicator.className = 'alert alert-info mb-3';
            indicator.style.cssText = 'background: rgba(14, 165, 233, 0.2); border: 1px solid rgba(14, 165, 233, 0.3); color: #0ea5e9;';
            indicator.innerHTML = '<i class="fas fa-chart-line me-2"></i><strong>Projection Mode:</strong> Showing end-of-division projections based on current payment patterns.';
            const mainContainer = document.querySelector('.container-fluid');
            if (mainContainer && mainContainer.firstChild) {
                mainContainer.insertBefore(indicator, mainContainer.firstChild);
            }
        }
    } else {
        // Remove indicator
        if (projectionIndicator) {
            projectionIndicator.remove();
        }
    }
    
    // Refresh all displays with projection data
    if (filteredTeams.length > 0) {
        displayTeams(filteredTeams);
    } else {
        displayTeams(teams);
    }
    calculateFinancialBreakdown();
    calculateAndDisplaySmartSummary();
}

// Calculate remaining weeks in division
function getRemainingWeeks(teamDivision, currentWeek) {
    if (!teamDivision || !teamDivision.totalWeeks) return 0;
    const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
    return Math.max(0, totalWeeks - currentWeek);
}

// Calculate projected dues for a team (current + remaining weeks)
function calculateProjectedDues(team, teamDivision, currentWeek) {
    if (!teamDivision) return { amountOwed: 0, amountUpcoming: 0 };
    
    const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
    const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
    const duesRate = teamDivision.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
    const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
    
    // Calculate current dues owed
    let currentDuesOwed = 0;
    for (let week = 1; week <= currentWeek; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
        if (isUnpaid) {
            currentDuesOwed += weeklyDues;
        }
    }
    
    // Calculate remaining weeks
    const remainingWeeks = getRemainingWeeks(teamDivision, currentWeek);
    
    // Projected dues = current owed + (remaining weeks × weekly dues)
    const projectedDues = currentDuesOwed + (remainingWeeks * weeklyDues);
    
    return {
        currentDuesOwed,
        remainingWeeks,
        weeklyDues,
        projectedDues
    };
}

function filterTeamsByDivisionWithSort() {
    // If there's an active sort, apply it to the filtered teams (without toggling direction)
    if (currentSortColumn) {
        // Apply sorting without toggling direction
        const teamsToSort = [...filteredTeams];
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
    displayTeams(filteredTeams);
    }
}

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
        const activeDivisions = divisions.filter(d => {
            if (d._id && d._id.startsWith('temp_')) return false;
            if (d.id && d.id.startsWith('temp_')) return false;
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

    let divisionTotalCollected = 0;
    const divisionTeams = teams.filter(team => team.division === division.name);
    
    divisionTeams.forEach(team => {
        // Find team's division for calculations
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) return;
        
        // Calculate expected weekly dues (same logic as calculateAndDisplaySmartSummary)
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const duesRate = teamDivision.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
        const expectedWeeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
        
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                // Treat both string 'true' and boolean true as paid
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (isPaid && payment.amount) {
                    // Prefer expected weekly dues (doesn't include sanction fees) - same as calculateAndDisplaySmartSummary
                    let netDues = expectedWeeklyDues;

                    // Fallback: if expectedWeeklyDues is 0 for some reason, use payment.amount minus any sanction portion
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
                }
            });
        }
        
        // If in projection mode, add projected future payments (same as calculateAndDisplaySmartSummary)
        if (projectionMode && teamDivision) {
            // Calculate current week for this division
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
            
            const remainingWeeks = getRemainingWeeks(teamDivision, actualCurrentWeek);
            const projectedFutureDues = remainingWeeks * expectedWeeklyDues;
            divisionTotalCollected += projectedFutureDues;
        }
    });
    
    const collectedText = projectionMode ? `${formatCurrency(divisionTotalCollected)} (Projected)` : formatCurrency(divisionTotalCollected);
    valueEl.textContent = collectedText;
}

function calculateFinancialBreakdown() {
    // Get all elements first with null checks
    const totalPrizeFundEl = document.getElementById('totalPrizeFund');
    const totalLeagueManagerEl = document.getElementById('totalLeagueManager');
    const totalUSAPoolLeagueEl = document.getElementById('totalUSAPoolLeague');
    const totalBCASanctionFeesEl = document.getElementById('totalBCASanctionFees');
    const totalEl = document.getElementById('sanctionFeesTotal');
    const paidEl = document.getElementById('sanctionFeesPaid');
    const owedEl = document.getElementById('sanctionFeesOwed');
    const toPayoutEl = document.getElementById('sanctionFeesToPayout');
    const profitEl = document.getElementById('sanctionFeesProfit');
    
    if (!teams || teams.length === 0) {
        if (totalPrizeFundEl) totalPrizeFundEl.textContent = formatCurrency(0);
        if (totalLeagueManagerEl) totalLeagueManagerEl.textContent = formatCurrency(0);
        if (totalUSAPoolLeagueEl) totalUSAPoolLeagueEl.textContent = formatCurrency(0);
        if (totalBCASanctionFeesEl) totalBCASanctionFeesEl.textContent = formatCurrency(0);
        if (totalEl) totalEl.textContent = '0.00';
        if (paidEl) paidEl.textContent = '0.00';
        if (owedEl) owedEl.textContent = '0.00';
        if (toPayoutEl) toPayoutEl.textContent = '0.00';
        if (profitEl) profitEl.textContent = '0.00';
        return;
    }
    
    // Check if a specific division is selected
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect.value;
    
    let totalPrizeFund = 0;
    let totalLeagueManager = 0;
    let totalUSAPoolLeague = 0;
    let totalBCASanctionFees = 0; // Collection amount (what you charge players) - PAID
    let totalBCASanctionFeesPayout = 0; // Payout amount (what you pay out) - for PAID fees
    let totalBCASanctionFeesTotal = 0; // Total amount owed by all players (what should be collected)
    let totalBCASanctionFeesOwed = 0; // Amount still owed (total - paid)
    
    // Per-division prize fund and league income breakdown (for details)
    const prizeFundByDivision = {};
    const leagueIncomeByDivision = {};
    
    // Determine which teams to process
    let teamsToProcess = teams;
    if (selectedDivisionId !== 'all') {
        // Find the division name from the selected ID (check both _id and id)
        const selectedDivision = divisions.find(d => 
            (d._id === selectedDivisionId) || (d.id === selectedDivisionId)
        );
        if (selectedDivision) {
            // Filter teams by division name (case-insensitive, trimmed)
            teamsToProcess = teams.filter(team => {
                if (!team.division) return false;
                const teamDivision = team.division.trim();
                const selectedDivisionName = selectedDivision.name.trim();
                // Try exact match first
                if (teamDivision === selectedDivisionName) return true;
                // Try case-insensitive match
                if (teamDivision.toLowerCase() === selectedDivisionName.toLowerCase()) return true;
                // For double play divisions, check if team division matches the formatted name
                if (selectedDivision.isDoublePlay) {
                    // Double play divisions might be stored as "Name - Type / Name - Type"
                    const formattedName = `${selectedDivision.firstDivisionName || ''} - ${selectedDivision.firstDivisionGameType || ''} / ${selectedDivision.secondDivisionName || ''} - ${selectedDivision.secondDivisionGameType || ''}`;
                    if (teamDivision === formattedName.trim() || 
                        teamDivision.toLowerCase() === formattedName.toLowerCase().trim()) {
                        return true;
                    }
                }
                return false;
            });
        } else {
            console.warn('calculateFinancialBreakdown: Selected division not found:', selectedDivisionId);
        }
    }
    
    console.log(`[Sanction Fees] Processing ${teamsToProcess.length} teams for division: ${selectedDivisionId}`);
    
    teamsToProcess.forEach(team => {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) {
            console.log(`[Sanction Fees] Team ${team.teamName}: Division "${team.division}" not found`);
            return;
        }
        
        // Count total players who need sanction fees (for calculating total owed)
        // Only count players who haven't already been sanctioned previously
        const playersNeedingSanction = team.teamMembers ? team.teamMembers.filter(member => !member.previouslySanctioned).length : 0;
        totalBCASanctionFeesTotal += playersNeedingSanction * sanctionFeeAmount;
        
        console.log(`[Sanction Fees] Team ${team.teamName}: ${playersNeedingSanction} players needing sanction, ${team.weeklyPayments ? team.weeklyPayments.length : 0} weekly payments`);
        
        // Calculate weekly dues for this team
        // Formula: dues per player × players per week × (single play = 1, double play = 2 multiplier)
        // Use playersPerWeek from division settings (how many players actually play each week)
        // Parse as integer to ensure correct calculation
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5; // Parse as integer, default to 5 if not set
        // Prefer dues rate from the division; fall back to any stored rate on the team
        const effectiveDuesRate = parseFloat(teamDivision.duesPerPlayerPerMatch) || parseFloat(team.divisionDuesRate) || 0;
        // Single play: dues × players × 1, Double play: dues × players × 2
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const weeklyDues = effectiveDuesRate * playersPerWeek * doublePlayMultiplier;
        
        // Process each weekly payment - use EXPECTED weekly dues amount for breakdown
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                // Check if payment is actually paid (string 'true' or boolean true)
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (isPaid && payment.amount) {
                    // Use the expected weekly dues amount for breakdown calculation
                    const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                    totalPrizeFund += breakdown.prizeFund;
                    totalLeagueManager += breakdown.leagueManager;
                    totalUSAPoolLeague += breakdown.usaPoolLeague;

                    // Track prize fund & league income by division when viewing all teams
                    if (selectedDivisionId === 'all') {
                        const divName = teamDivision.name || team.division || 'Unassigned';
                        if (!prizeFundByDivision[divName]) {
                            prizeFundByDivision[divName] = 0;
                        }
                        if (!leagueIncomeByDivision[divName]) {
                            leagueIncomeByDivision[divName] = 0;
                        }
                        prizeFundByDivision[divName] += breakdown.prizeFund;
                        leagueIncomeByDivision[divName] += breakdown.leagueManager;
                    }
                }
            });
        }
        
        // Count sanction fees from team members who have bcaSanctionPaid = true
        // This is the primary source - when payments are made with sanction players, it updates team members
        if (team.teamMembers && team.teamMembers.length > 0) {
            // Collect players who have been sanctioned via payment modals (from weeklyPayments)
            const sanctionedPlayersFromPayments = new Set();
            if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
                team.weeklyPayments.forEach(payment => {
                    if ((payment.paid === 'true' || payment.paid === true) && 
                        payment.bcaSanctionPlayers && 
                        Array.isArray(payment.bcaSanctionPlayers) && 
                        payment.bcaSanctionPlayers.length > 0) {
                        payment.bcaSanctionPlayers.forEach(playerName => {
                            sanctionedPlayersFromPayments.add(playerName);
                        });
                    }
                });
            }
            
            // Count team members who have paid sanction fees
            let teamSanctionCount = 0;
            team.teamMembers.forEach(member => {
                // Check if player was sanctioned via payment modal (overrides member's bcaSanctionPaid)
                const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
                const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid;
                
                // Only count if they haven't been previously sanctioned (previously sanctioned don't pay again)
                if (effectiveBcaSanctionPaid && !member.previouslySanctioned) {
                    teamSanctionCount++;
                }
            });
            
            if (teamSanctionCount > 0) {
                totalBCASanctionFees += teamSanctionCount * sanctionFeeAmount; // Collection amount
                totalBCASanctionFeesPayout += teamSanctionCount * sanctionFeePayoutAmount; // Payout amount
                console.log(`[Sanction Fees] Team ${team.teamName}: Found ${teamSanctionCount} team members with paid sanction fees`);
            }
        }
        
        // Also count from weekly payments bcaSanctionPlayers arrays (if they exist and weren't already counted)
        // This handles cases where payment records have the data but team members weren't updated
        if (team.weeklyPayments && team.weeklyPayments.length > 0) {
            const paymentSanctionPlayers = new Set();
            team.weeklyPayments.forEach(payment => {
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (isPaid && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) && payment.bcaSanctionPlayers.length > 0) {
                    payment.bcaSanctionPlayers.forEach(playerName => {
                        paymentSanctionPlayers.add(playerName);
                    });
                }
            });
            
            // Count players from payments that aren't already counted from team members
            if (paymentSanctionPlayers.size > 0) {
                let paymentOnlyCount = 0;
                paymentSanctionPlayers.forEach(playerName => {
                    // Check if this player is already counted via team member bcaSanctionPaid
                    const teamMember = team.teamMembers?.find(m => m.name === playerName);
                    const alreadyCounted = teamMember && (teamMember.bcaSanctionPaid || !teamMember.previouslySanctioned);
                    if (!alreadyCounted) {
                        paymentOnlyCount++;
                    }
                });
                
                if (paymentOnlyCount > 0) {
                    totalBCASanctionFees += paymentOnlyCount * sanctionFeeAmount;
                    totalBCASanctionFeesPayout += paymentOnlyCount * sanctionFeePayoutAmount;
                    console.log(`[Sanction Fees] Team ${team.teamName}: Found ${paymentOnlyCount} additional sanction players from payment records`);
                }
            }
            
            // Old format: single boolean (migration)
            team.weeklyPayments.forEach(payment => {
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (isPaid && payment.bcaSanctionFee) {
                    // Check if we already counted this team's sanction fees from team members
                    const hasTeamMemberWithPaid = team.teamMembers && team.teamMembers.some(m => m.bcaSanctionPaid && !m.previouslySanctioned);
                    if (!hasTeamMemberWithPaid) {
                        totalBCASanctionFees += sanctionFeeAmount; // Collection amount
                        totalBCASanctionFeesPayout += sanctionFeePayoutAmount; // Payout amount
                        console.log(`[Sanction Fees] Team ${team.teamName} Week ${payment.week}: Found old format sanction fee (no team member match)`);
                    }
                }
            });
        }
        
        // If in projection mode, add projected future payments
        if (projectionMode && teamDivision) {
            // Calculate current week for this division
            let currentWeek = 1;
            if (teamDivision.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                currentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (currentWeek > 1 && daysIntoCurrentWeek <= gracePeriodDays) {
                    currentWeek = currentWeek - 1;
                }
            }
            
            const remainingWeeks = getRemainingWeeks(teamDivision, currentWeek);
            
            // Project future weekly payments (assume all teams will pay)
            for (let week = currentWeek + 1; week <= (currentWeek + remainingWeeks); week++) {
                const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                totalPrizeFund += breakdown.prizeFund;
                totalLeagueManager += breakdown.leagueManager;
                totalUSAPoolLeague += breakdown.usaPoolLeague;
                
                // Track prize fund & league income by division when viewing all teams
                if (selectedDivisionId === 'all') {
                    const divName = teamDivision.name || team.division || 'Unassigned';
                    if (!prizeFundByDivision[divName]) {
                        prizeFundByDivision[divName] = 0;
                    }
                    if (!leagueIncomeByDivision[divName]) {
                        leagueIncomeByDivision[divName] = 0;
                    }
                    prizeFundByDivision[divName] += breakdown.prizeFund;
                    leagueIncomeByDivision[divName] += breakdown.leagueManager;
                }
            }
            
            // Project sanction fees (assume all players needing sanction will pay)
            const playersNeedingSanction = team.teamMembers ? team.teamMembers.filter(member => !member.previouslySanctioned).length : 0;
            if (playersNeedingSanction > 0) {
                // Project that remaining players will pay in remaining weeks
                // For simplicity, assume all remaining players pay in the next payment
                totalBCASanctionFees += playersNeedingSanction * sanctionFeeAmount;
                totalBCASanctionFeesPayout += playersNeedingSanction * sanctionFeePayoutAmount;
            }
        }
    });
    
    // Calculate amounts
    totalBCASanctionFeesOwed = totalBCASanctionFeesTotal - totalBCASanctionFees; // Total - Paid = Owed
    const totalSanctionFeeProfit = totalBCASanctionFees - totalBCASanctionFeesPayout; // Paid - Payout = Profit
    
    // Debug logging for sanction fees
    console.log(`[Sanction Fees] Total Collected: $${totalBCASanctionFees.toFixed(2)}, Total Owed: $${totalBCASanctionFeesTotal.toFixed(2)}, Teams Processed: ${teamsToProcess.length}, Selected Division: ${selectedDivisionId}`);
    
    // Update the financial breakdown cards (using elements retrieved at start of function)
    const projectionSuffix = projectionMode ? ' (Projected)' : '';
    if (totalPrizeFundEl) totalPrizeFundEl.textContent = `${formatCurrency(totalPrizeFund)}${projectionSuffix}`;
    if (totalLeagueManagerEl) totalLeagueManagerEl.textContent = `${formatCurrency(totalLeagueManager)}${projectionSuffix}`;
    if (totalUSAPoolLeagueEl) totalUSAPoolLeagueEl.textContent = `${formatCurrency(totalUSAPoolLeague)}${projectionSuffix}`;
    // Main card shows "Paid" (what has been collected)
    if (totalBCASanctionFeesEl) totalBCASanctionFeesEl.textContent = `${formatCurrency(totalBCASanctionFees)}${projectionSuffix}`;
    
    // Update detailed sanction fee breakdown (using elements retrieved at start of function)
    if (totalEl) totalEl.textContent = totalBCASanctionFeesTotal.toFixed(2);
    if (paidEl) paidEl.textContent = totalBCASanctionFees.toFixed(2);
    if (owedEl) owedEl.textContent = totalBCASanctionFeesOwed.toFixed(2);
    if (toPayoutEl) toPayoutEl.textContent = totalBCASanctionFeesPayout.toFixed(2);
    if (profitEl) profitEl.textContent = totalSanctionFeeProfit.toFixed(2);

    // Update prize fund per-division breakdown list
    const prizeFundDetailsListEl = document.getElementById('prizeFundDetailsList');
    if (prizeFundDetailsListEl) {
        if (selectedDivisionId !== 'all') {
            // Specific division selected: show single total for that division
            if (totalPrizeFund === 0) {
                prizeFundDetailsListEl.innerHTML = '<small class="text-muted">No prize funds yet for this division</small>';
            } else {
                const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
                prizeFundDetailsListEl.innerHTML = `<div><strong>${divName}:</strong> ${formatCurrency(totalPrizeFund)}</div>`;
            }
        } else {
            const entries = Object.entries(prizeFundByDivision);
            if (entries.length === 0) {
                prizeFundDetailsListEl.innerHTML = '<small class="text-muted">No prize funds yet</small>';
            } else {
                entries.sort((a, b) => a[0].localeCompare(b[0]));
                prizeFundDetailsListEl.innerHTML = entries.map(([name, amount]) =>
                    `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`
                ).join('');
            }
        }
    }

    // Update league income per-division breakdown list
    const leagueIncomeDetailsListEl = document.getElementById('leagueIncomeDetailsList');
    if (leagueIncomeDetailsListEl) {
        if (selectedDivisionId !== 'all') {
            // Specific division selected: show single total for that division
            if (totalLeagueManager === 0) {
                leagueIncomeDetailsListEl.innerHTML = '<small class="text-muted">No league income yet for this division</small>';
            } else {
                const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
                leagueIncomeDetailsListEl.innerHTML = `<div><strong>${divName}:</strong> ${formatCurrency(totalLeagueManager)}</div>`;
            }
        } else {
            const entries = Object.entries(leagueIncomeByDivision);
            if (entries.length === 0) {
                leagueIncomeDetailsListEl.innerHTML = '<small class="text-muted">No league income yet</small>';
            } else {
                entries.sort((a, b) => a[0].localeCompare(b[0]));
                leagueIncomeDetailsListEl.innerHTML = entries.map(([name, amount]) =>
                    `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`
                ).join('');
            }
        }
    }
}

function calculateDuesBreakdown(weeklyDuesAmount, isDoublePlay, division = null) {
    // Check if division uses dollar amounts, otherwise use operator default
    const divisionUsesDollarAmounts = division?.useDollarAmounts !== null && division?.useDollarAmounts !== undefined
        ? division.useDollarAmounts
        : useDollarAmounts;
    
    // Get players per week and matches per week for dollar amount calculations
    const playersPerWeek = division?.playersPerWeek || 5;
    const matchesPerWeek = getMatchesPerWeekConfig({ ...(division || {}), isDoublePlay: !!isDoublePlay }).total;
    
    if (divisionUsesDollarAmounts) {
        // Use dollar amount calculations
        // Get dollar amounts from division if available, otherwise use operator defaults
        const effectivePrizeFundAmount = division?.prizeFundAmount !== null && division?.prizeFundAmount !== undefined
            ? parseFloat(division.prizeFundAmount)
            : prizeFundAmount;
        const effectivePrizeFundAmountType = division?.prizeFundAmountType || prizeFundAmountType;
        
        const effectiveFirstOrgAmount = division?.firstOrganizationAmount !== null && division?.firstOrganizationAmount !== undefined
            ? parseFloat(division.firstOrganizationAmount)
            : firstOrganizationAmount;
        const effectiveFirstOrgAmountType = division?.firstOrganizationAmountType || firstOrganizationAmountType;
        
        const effectiveSecondOrgAmount = division?.secondOrganizationAmount !== null && division?.secondOrganizationAmount !== undefined
            ? parseFloat(division.secondOrganizationAmount)
            : secondOrganizationAmount;
        const effectiveSecondOrgAmountType = division?.secondOrganizationAmountType || secondOrganizationAmountType;
        
        // Calculate prize fund
        let prizeFund = 0;
        if (effectivePrizeFundAmount && !isNaN(effectivePrizeFundAmount)) {
            if (effectivePrizeFundAmountType === 'perPlayer') {
                prizeFund = effectivePrizeFundAmount * playersPerWeek * matchesPerWeek;
    } else {
                // Per-team amount is defined per division/format.
                // For double-play divisions, there are two formats, so double the per-team amount.
                prizeFund = effectivePrizeFundAmount * (isDoublePlay ? 2 : 1);
            }
        }
        
        // Calculate remaining amount after prize fund
        const remaining = weeklyDuesAmount - prizeFund;
        
        // Calculate first organization amount
        let firstOrganization = 0;
        if (effectiveFirstOrgAmount && !isNaN(effectiveFirstOrgAmount)) {
            if (effectiveFirstOrgAmountType === 'perPlayer') {
                firstOrganization = effectiveFirstOrgAmount * playersPerWeek * matchesPerWeek;
            } else {
                // Per-team amount is per division/format; double for double play (two formats)
                firstOrganization = effectiveFirstOrgAmount * (isDoublePlay ? 2 : 1);
            }
        }
        
        // Calculate second organization amount
        let secondOrganization = 0;
        if (effectiveSecondOrgAmount && !isNaN(effectiveSecondOrgAmount)) {
            if (effectiveSecondOrgAmountType === 'perPlayer') {
                secondOrganization = effectiveSecondOrgAmount * playersPerWeek * matchesPerWeek;
            } else {
                // Per-team amount is per division/format; double for double play (two formats)
                secondOrganization = effectiveSecondOrgAmount * (isDoublePlay ? 2 : 1);
            }
        }
        
        return { 
            prizeFund: parseFloat(prizeFund.toFixed(2)), 
            leagueManager: parseFloat(firstOrganization.toFixed(2)), // Keep legacy name for compatibility
            usaPoolLeague: parseFloat(secondOrganization.toFixed(2)) // Keep legacy name for compatibility
        };
    } else {
        // Use percentage calculations (original logic)
        // Get percentages from division if available, otherwise use operator defaults
        const effectivePrizeFundPercent = division?.prizeFundPercentage !== null && division?.prizeFundPercentage !== undefined 
            ? parseFloat(division.prizeFundPercentage) 
            : prizeFundPercentage;
        const effectiveFirstOrgPercent = division?.firstOrganizationPercentage !== null && division?.firstOrganizationPercentage !== undefined
            ? parseFloat(division.firstOrganizationPercentage)
            : firstOrganizationPercentage;
        const effectiveSecondOrgPercent = division?.secondOrganizationPercentage !== null && division?.secondOrganizationPercentage !== undefined
            ? parseFloat(division.secondOrganizationPercentage)
            : secondOrganizationPercentage;
        
        // Calculate prize fund percentage
        const prizeFundPercent = effectivePrizeFundPercent / 100.0;
        const prizeFund = weeklyDuesAmount * prizeFundPercent;
        
        // Calculate remaining amount after prize fund
        const remaining = weeklyDuesAmount - prizeFund;
        
        // Calculate first and second organization percentages from remaining
        // These should total 100% but we'll normalize if they don't
        const totalRemainingPercent = (effectiveFirstOrgPercent + effectiveSecondOrgPercent) / 100.0;
        // Normalize based on the provided percentages (proportional split)
        // If percentages don't total properly, calculate proportional split based on what was provided
        const totalPercentSum = effectiveFirstOrgPercent + effectiveSecondOrgPercent;
        const normalizedFirstPercent = totalPercentSum > 0 ? effectiveFirstOrgPercent / totalPercentSum : (firstOrganizationPercentage / (firstOrganizationPercentage + secondOrganizationPercentage));
        const normalizedSecondPercent = totalPercentSum > 0 ? effectiveSecondOrgPercent / totalPercentSum : (secondOrganizationPercentage / (firstOrganizationPercentage + secondOrganizationPercentage));
        
        const firstOrganization = remaining * normalizedFirstPercent;
        const secondOrganization = remaining * normalizedSecondPercent;
        
        return { 
            prizeFund: parseFloat(prizeFund.toFixed(2)), 
            leagueManager: parseFloat(firstOrganization.toFixed(2)), // Keep legacy name for compatibility
            usaPoolLeague: parseFloat(secondOrganization.toFixed(2)) // Keep legacy name for compatibility
        };
    }
}

// Date calculation functions
function calculateEndDate() {
    const startDateInput = document.getElementById('startDate');
    const totalWeeksInput = document.getElementById('totalWeeks');
    const endDateInput = document.getElementById('endDate');
    const startDateDay = document.getElementById('startDateDay');
    const startDayName = document.getElementById('startDayName');
    
    if (!startDateInput || !totalWeeksInput || !endDateInput) return;
    
    const startDate = startDateInput.value;
    const totalWeeks = parseInt(totalWeeksInput.value);
    
    if (startDate && totalWeeks) {
        // Parse date correctly to avoid timezone issues
        const [year, month, day] = startDate.split('-').map(Number);
        const start = new Date(year, month - 1, day); // month is 0-indexed
        const end = new Date(start);
        // End date is totalWeeks * 7 days after start date
        // For 12 weeks from Jan 7: Jan 7 + (12 * 7) = Jan 7 + 84 days = April 1, 2026
        end.setDate(start.getDate() + (totalWeeks * 7));
        
        endDateInput.value = end.toISOString().split('T')[0];
        
        // Show day of the week for start date
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[start.getDay()];
        startDayName.textContent = dayName;
        startDateDay.style.display = 'block';
    } else {
        endDateInput.value = '';
        startDateDay.style.display = 'none';
    }
}

// Weekly payment functions
function updateWeekDisplay() {
    const weekFilter = document.getElementById('weekFilter');
    currentWeek = parseInt(weekFilter.value);
    document.getElementById('currentWeekDisplay').textContent = currentWeek;
    displayTeams(filteredTeams);
}

function updateWeekDropdownWithDates(selectedDivisionId = null) {
    const weekFilter = document.getElementById('weekFilter');
    if (!weekFilter) {
        console.log('Week filter not found');
        return;
    }
    
    console.log('Updating week dropdown with dates for division:', selectedDivisionId);
    console.log('Available divisions:', divisions);
    
    // If no division selected or "all" selected, hide the week dropdown
    if (!selectedDivisionId || selectedDivisionId === 'all') {
        console.log('No specific division selected, hiding week dropdown');
        weekFilter.style.display = 'none';
        document.querySelector('label[for="weekFilter"]').style.display = 'none';
        return;
    }
    
    // Show the week dropdown
    weekFilter.style.display = 'block';
    document.querySelector('label[for="weekFilter"]').style.display = 'block';
    
    // Find the selected division
    const division = divisions.find(d => d._id === selectedDivisionId);
    console.log('Found selected division:', division);
    
    if (!division || !division.startDate) {
        console.log('No division with start date found, resetting to week numbers only');
        // Reset to just week numbers if no division with start date
        const options = weekFilter.querySelectorAll('option');
        options.forEach((option, index) => {
            const weekNumber = parseInt(option.value);
            if (!weekNumber) return; // Skip if not a valid week number
            option.textContent = `Week ${weekNumber}`;
        });
        return;
    }
    
    // Parse date correctly to avoid timezone issues
    const [year, month, day] = division.startDate.split('T')[0].split('-').map(Number);
    const startDate = new Date(year, month - 1, day); // month is 0-indexed
    console.log('Using start date:', startDate);
    
    // Get total weeks from division (limit dropdown to this)
    const divisionTotalWeeks = division.totalWeeks || 24; // Default to 24 if not set
    
    // Update all week options with dates based on selected division
    const options = weekFilter.querySelectorAll('option');
    options.forEach((option, index) => {
        const weekNumber = parseInt(option.value);
        if (!weekNumber) return; // Skip if not a valid week number
        
        // Hide weeks beyond the division's total weeks
        if (weekNumber > divisionTotalWeeks) {
            option.style.display = 'none';
            return;
        } else {
            option.style.display = '';
        }
        
        const weekDate = new Date(startDate);
        weekDate.setDate(startDate.getDate() + ((weekNumber - 1) * 7));
        
        // Format date without timezone conversion (use local date components)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[weekDate.getMonth()];
        const day = weekDate.getDate();
        const dateString = `${month} ${day}`;
        
        option.textContent = `Week ${weekNumber} (${dateString})`;
        console.log(`Updated Week ${weekNumber} to: ${dateString}`);
    });
    
    console.log(`Week dropdown limited to ${divisionTotalWeeks} weeks for division: ${division.name}`);
}

function showWeeklyPaymentModal(teamId, specificWeek = null) {
    console.log('showWeeklyPaymentModal called with teamId:', teamId, 'specificWeek:', specificWeek);
    
    // Hide week filter dropdown when modal opens to prevent z-index issues
    const weekFilter = document.getElementById('weekFilter');
    const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
    if (weekFilter) {
        weekFilter.style.display = 'none';
    }
    if (weekFilterLabel) {
        weekFilterLabel.style.display = 'none';
    }
    
    // Find the team from the current teams array (which should be up-to-date after any recent updates)
    const team = teams.find(t => t._id === teamId);
    if (!team) {
        console.log('Team not found for ID:', teamId);
        return;
    }
    
    currentWeeklyPaymentTeamId = teamId;
    
    // Use specific week if provided, otherwise get from dropdown
    let selectedWeek;
    if (specificWeek !== null) {
        selectedWeek = specificWeek;
    } else {
        const weekFilter = document.getElementById('weekFilter');
        selectedWeek = weekFilter ? parseInt(weekFilter.value) : currentWeek;
    }
    
    // Store the selected week for use in saveWeeklyPayment
    currentWeeklyPaymentWeek = selectedWeek;
    
    // Update modal title and week
    document.getElementById('weeklyPaymentTeamName').textContent = team.teamName;
    document.getElementById('weeklyPaymentWeek').textContent = selectedWeek;
    
    // Reset modal state - hide success message and show form
    const successDiv = document.getElementById('weeklyPaymentSuccess');
    const form = document.getElementById('weeklyPaymentForm');
    const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
    successDiv.classList.add('d-none');
    form.style.display = 'block';
    // Ensure footer buttons are visible when opening modal
    if (modalFooter) {
        modalFooter.style.display = '';
    }
    // Re-enable save button
    const saveButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-primary');
    if (saveButton) {
        saveButton.disabled = false;
    }
    
    // Populate the amount dropdown
    const teamDivision = divisions.find(d => d.name === team.division);
    if (teamDivision) {
        populateWeeklyPaymentAmountDropdown(team, teamDivision);
    }
    
    // Pre-fill amount with expected weekly team dues (first option) if no existing payment
    const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
    
    // Populate sanction fee player checkboxes
    populateBCASanctionPlayers(team);
    
    // Populate individual player payments section
    populateIndividualPlayerPayments(team, teamDivision, selectedWeek);
    
    // Check if team has existing payment for this week
    const existingPayment = team.weeklyPayments?.find(p => p.week === selectedWeek);
    
    if (existingPayment) {
        // Populate with existing data
        if (existingPayment.paid === 'true') {
            document.getElementById('weeklyPaidYes').checked = true;
        } else if (existingPayment.paid === 'bye') {
            document.getElementById('weeklyPaidBye').checked = true;
        } else {
            document.getElementById('weeklyPaidNo').checked = true;
        }
        document.getElementById('weeklyPaymentMethod').value = existingPayment.paymentMethod || '';
        
        // Populate payment date if it exists
        if (existingPayment.paymentDate) {
            const paymentDateStr = existingPayment.paymentDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
            document.getElementById('weeklyPaymentDate').value = paymentDateStr;
        } else {
            document.getElementById('weeklyPaymentDate').value = '';
        }
        
        document.getElementById('weeklyPaymentAmount').value = existingPayment.amount || '';
        document.getElementById('weeklyPaymentNotes').value = existingPayment.notes || '';
        
        // Handle sanction fee players (new format) or bcaSanctionFee (old format)
        if (existingPayment.bcaSanctionPlayers && existingPayment.bcaSanctionPlayers.length > 0) {
            // New format: check the specific players
            existingPayment.bcaSanctionPlayers.forEach(playerName => {
                const checkbox = document.querySelector(`input[name="bcaSanctionPlayer"][value="${playerName}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } else if (existingPayment.bcaSanctionFee) {
            // Old format: check all players (migration)
            const checkboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]');
            checkboxes.forEach(checkbox => checkbox.checked = true);
        }
        
        // Load individual player payments if they exist
        if (existingPayment.individualPayments && existingPayment.individualPayments.length > 0) {
            // Show individual payments section if there are existing payments
            document.getElementById('individualPaymentsSection').style.display = 'block';
            document.getElementById('individualPaymentsToggleIcon').className = 'fas fa-toggle-on';
            document.getElementById('individualPaymentsToggleText').textContent = 'Enabled';
            existingPayment.individualPayments.forEach(payment => {
                const input = document.querySelector(`input[name="individualPayment"][data-player="${payment.playerName}"]`);
                if (input) input.value = payment.amount || '';
            });
            updateIndividualPaymentsTotal();
        }
    } else {
        // Reset form
        document.getElementById('weeklyPaymentForm').reset();
        document.getElementById('weeklyPaidNo').checked = true;
        document.getElementById('weeklyPaymentDate').value = ''; // Clear date field
        
        // Clear all sanction fee player checkboxes
        const checkboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);

        // Pre-select the base weekly dues amount if available
        const amountSelect = document.getElementById('weeklyPaymentAmount');
        if (amountSelect && amountSelect.options.length > 1) {
            // First option is placeholder, second option is base weekly dues
            amountSelect.selectedIndex = 1;
        }
    }
    
    const modalElement = document.getElementById('weeklyPaymentModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // Add event listeners to handle week filter visibility
    modalElement.addEventListener('show.bs.modal', function() {
        // Hide week filter when modal is about to show
        const weekFilter = document.getElementById('weekFilter');
        const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
        if (weekFilter) {
            weekFilter.style.display = 'none';
        }
        if (weekFilterLabel) {
            weekFilterLabel.style.display = 'none';
        }
    });
    
    // Make date input clickable to open date picker
    modalElement.addEventListener('shown.bs.modal', function() {
        const dateInput = document.getElementById('weeklyPaymentDate');
        if (dateInput) {
            // Add click handler to open date picker when clicking anywhere on the input
            dateInput.addEventListener('click', function() {
                this.focus();
                // For modern browsers, try to show the picker directly
                if (this.showPicker) {
                    try {
                        this.showPicker();
                    } catch (e) {
                        // showPicker() might not be supported, just focus is enough
                    }
                }
            });
        }
    });
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        // Restore week filter when modal is closed (if division is selected)
        setTimeout(() => {
            const divisionFilter = document.getElementById('divisionFilter');
            const weekFilter = document.getElementById('weekFilter');
            const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
            
            if (divisionFilter && divisionFilter.value && divisionFilter.value !== 'all') {
                if (weekFilter) {
                    weekFilter.style.display = 'block';
                }
                if (weekFilterLabel) {
                    weekFilterLabel.style.display = 'block';
                }
            }
        }, 100);
    });
    
    modal.show();
}

function closeWeeklyPaymentModal() {
    const modalElement = document.getElementById('weeklyPaymentModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    
    if (modalInstance) {
        modalInstance.hide();
    } else {
        // If no instance exists, create one and hide it
        const newModalInstance = new bootstrap.Modal(modalElement);
        newModalInstance.hide();
    }
    
    // Restore week filter dropdown after modal closes
    setTimeout(() => {
        const weekFilter = document.getElementById('weekFilter');
        const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
        const divisionFilter = document.getElementById('divisionFilter');
        
        // Only show week filter if a division is selected
        if (divisionFilter && divisionFilter.value && divisionFilter.value !== 'all') {
            if (weekFilter) {
                weekFilter.style.display = 'block';
            }
            if (weekFilterLabel) {
                weekFilterLabel.style.display = 'block';
            }
        }
        
        // Reset the form state after closing
        const form = document.getElementById('weeklyPaymentForm');
        const successDiv = document.getElementById('weeklyPaymentSuccess');
        const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
        const saveButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-primary');
        const cancelButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-secondary');
        if (form) form.style.display = 'block';
        if (successDiv) successDiv.classList.add('d-none');
        if (modalFooter) modalFooter.style.display = '';
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.style.display = '';
        }
        if (cancelButton) {
            cancelButton.style.display = '';
        }
    }, 300);
}

// Individual Player Payment Functions
function populateIndividualPlayerPayments(team, teamDivision, week) {
    const container = document.getElementById('individualPlayerPayments');
    container.innerHTML = '';
    
    if (!team.teamMembers || team.teamMembers.length === 0) {
        container.innerHTML = '<small class="text-muted">No team members found</small>';
        return;
    }
    
    // Calculate weekly team dues and per-player amount
    const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
    const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5;
    const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
    const weeklyTeamDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
    const perPlayerAmount = weeklyTeamDues / playersPerWeek;
    
    // Store weekly team dues for calculation
    document.getElementById('weeklyTeamDuesAmount').textContent = weeklyTeamDues.toFixed(2);
    
    // Create input for each player
    team.teamMembers.forEach((member, index) => {
        const playerName = formatPlayerName(member.name);
        const row = document.createElement('div');
        row.className = 'row mb-2 align-items-center';
        row.innerHTML = `
            <div class="col-6">
                <small>${playerName}</small>
            </div>
            <div class="col-6">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">$</span>
                    <input type="number" 
                           name="individualPayment" 
                           data-player="${playerName}" 
                           class="form-control form-control-sm" 
                           placeholder="${perPlayerAmount.toFixed(2)}" 
                           min="0" 
                           step="0.01"
                           oninput="updateIndividualPaymentsTotal()">
                </div>
            </div>
        `;
        container.appendChild(row);
    });
    
    updateIndividualPaymentsTotal();
}

function toggleIndividualPayments() {
    const section = document.getElementById('individualPaymentsSection');
    const icon = document.getElementById('individualPaymentsToggleIcon');
    const text = document.getElementById('individualPaymentsToggleText');
    
    if (section.style.display === 'none' || !section.style.display) {
        section.style.display = 'block';
        icon.className = 'fas fa-toggle-on';
        text.textContent = 'Enabled';
    } else {
        section.style.display = 'none';
        icon.className = 'fas fa-toggle-off';
        text.textContent = 'Enable';
    }
}

function updateIndividualPaymentsTotal() {
    const inputs = document.querySelectorAll('input[name="individualPayment"]');
    let total = 0;
    
    inputs.forEach(input => {
        const amount = parseFloat(input.value) || 0;
        total += amount;
    });
    
    document.getElementById('individualPaymentsTotal').textContent = total.toFixed(2);
    
    // Calculate remaining balance
    const weeklyTeamDues = parseFloat(document.getElementById('weeklyTeamDuesAmount').textContent) || 0;
    const remaining = Math.max(0, weeklyTeamDues - total);
    document.getElementById('remainingDuesBalance').textContent = remaining.toFixed(2);
    
    // Color code: green if paid in full, yellow if partial, red if none
    const remainingEl = document.getElementById('remainingDuesBalance').parentElement;
    if (remaining === 0 && total > 0) {
        remainingEl.className = 'text-success';
    } else if (total > 0 && total < weeklyTeamDues) {
        remainingEl.className = 'text-warning';
    } else {
        remainingEl.className = 'text-info';
    }
}

// Smart Builder Functions
let fargoTeamData = [];
let availableDivisions = [];

function showSmartBuilderModal() {
    console.log('Opening Smart Builder - clearing previous data');
    
    // Reset the Smart Builder state
    document.getElementById('fargoConfig').style.display = 'block';
    document.getElementById('updateModeSection').style.display = 'block';
    document.getElementById('divisionSelectionSection').style.display = 'none';
    document.getElementById('fargoTeamsSection').style.display = 'none';
    document.getElementById('existingDivisionSection').style.display = 'none';
    document.getElementById('mergeConfirmationSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('createSection').style.display = 'none';
    document.getElementById('fargoLeagueUrl').value = '';
    document.getElementById('selectedDivision').value = '';
    document.getElementById('manualDivisionId').value = '';
    document.getElementById('smartBuilderDivisionName').value = '';
    // Reset all Smart Builder form fields to defaults (matching editor)
    document.getElementById('duesPerPlayer').value = '8'; // Default to $8 per player per match
    document.getElementById('smartBuilderPlayersPerWeek').value = '5';
    document.getElementById('smartBuilderTotalWeeks').value = '20';
    
    // Set default start date to today
    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    document.getElementById('smartBuilderStartDate').value = startDateStr;
    calculateSmartBuilderEndDate(); // Calculate end date
    
    // Reset double play
    document.getElementById('smartBuilderIsDoublePlay').checked = false;
    document.getElementById('smartBuilderDoublePlayOptions').style.display = 'none';
    
    // Open division management modal and switch to LMS/CSI tab
    showDivisionManagement();
    // Switch to LMS/CSI tab
    setTimeout(() => {
        const lmsCsiTab = document.getElementById('lms-csi-tab');
        if (lmsCsiTab) {
            lmsCsiTab.click();
        }
    }, 100);
    
    // Clear previous Fargo Rate data
    fargoTeamData = [];
    
    // Clear division dropdown
    const divisionSelect = document.getElementById('selectedDivision');
    divisionSelect.innerHTML = '<option value="">Select a division...</option>';
    document.getElementById('fetchTeamsBtn').disabled = true;
    
    // Clear any existing preview tables
    const previewTable = document.getElementById('fargoTeamsPreview');
    if (previewTable) {
        previewTable.innerHTML = '';
    }
    
    const mergeTable = document.getElementById('mergePreviewTable');
    if (mergeTable) {
        mergeTable.innerHTML = '';
    }
    
    // Reset radio buttons
    document.getElementById('createNew').checked = true;
    document.getElementById('fargoRate').checked = true;
    
    // Load existing divisions for update mode
    loadExistingDivisions();
    
    // Setup manual division ID input listener
    setupManualDivisionIdListener();
    
    // Add event listeners for update mode radio buttons
    document.querySelectorAll('input[name="updateMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'update') {
                    document.getElementById('smartBuilderDivisionName').closest('.row').style.display = 'none';
            } else {
                document.getElementById('fargoTeamsSection').style.display = 'none';
                document.getElementById('existingDivisionSection').style.display = 'none';
                document.getElementById('mergeConfirmationSection').style.display = 'none';
                    document.getElementById('smartBuilderDivisionName').closest('.row').style.display = 'block';
            }
        });
    });
    
    new bootstrap.Modal(document.getElementById('smartBuilderModal')).show();
}

async function fetchFargoDivisions() {
    const fargoLeagueUrl = document.getElementById('fargoLeagueUrl').value.trim();
    
    if (!fargoLeagueUrl) {
        alert('Please enter the Fargo Rate League Reports URL');
        return;
    }
    
    // Extract League ID and Division ID from the URL
    let leagueId, divisionId;
    try {
    const urlParams = new URLSearchParams(new URL(fargoLeagueUrl).search);
        leagueId = urlParams.get('leagueId');
        divisionId = urlParams.get('divisionId');
    } catch (urlError) {
        alert('Invalid URL format. Please enter a valid Fargo Rate URL.');
        return;
    }
    
    if (!leagueId) {
        alert('Could not extract League ID from the URL. Please make sure the URL is correct.');
        return;
    }
    
    const loadingSpinner = document.getElementById('fargoLoading');
    loadingSpinner.classList.remove('d-none');
    
    // If divisionId is in the URL, automatically fetch teams directly
    if (divisionId) {
        console.log('Division ID found in URL, fetching teams directly...');
        // Pre-fill the manual division ID field
        document.getElementById('manualDivisionId').value = divisionId;
        // Hide division selection and fetch teams directly
        document.getElementById('divisionSelectionSection').style.display = 'none';
        // Fetch teams using the extracted IDs
        await fetchSelectedDivisionTeams();
        loadingSpinner.classList.add('d-none');
        return;
    }
    
    // If no divisionId, try to get divisions (though this endpoint returns empty)
    try {
        const response = await fetch(`${API_BASE_URL}/fargo-scraper/divisions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                leagueId: leagueId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            availableDivisions = data.divisions || [];
            
            if (availableDivisions.length > 0) {
                populateDivisionDropdown();
                document.getElementById('divisionSelectionSection').style.display = 'block';
            } else {
                // No divisions returned, show manual entry
                document.getElementById('divisionSelectionSection').style.display = 'block';
                document.getElementById('selectedDivision').innerHTML = '<option value="">Enter Division ID manually</option>';
            }
        } else {
            // Show manual entry on error
            document.getElementById('divisionSelectionSection').style.display = 'block';
            document.getElementById('selectedDivision').innerHTML = '<option value="">Enter Division ID manually</option>';
        }
    } catch (error) {
        console.error('Error fetching divisions:', error);
        // Show manual entry on error
        document.getElementById('divisionSelectionSection').style.display = 'block';
        document.getElementById('selectedDivision').innerHTML = '<option value="">Enter Division ID manually</option>';
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

function populateDivisionDropdown() {
    const divisionSelect = document.getElementById('selectedDivision');
    divisionSelect.innerHTML = '<option value="">Select a division...</option>';
    
    availableDivisions.forEach(division => {
        const option = document.createElement('option');
        option.value = division.id;
        option.textContent = division.name;
        divisionSelect.appendChild(option);
    });
}

function onDivisionSelected() {
    const selectedDivisionId = document.getElementById('selectedDivision').value;
    const manualDivisionId = document.getElementById('manualDivisionId').value.trim();
    const fetchTeamsBtn = document.getElementById('fetchTeamsBtn');
    
    // Enable button if either dropdown or manual input has a value
    if (selectedDivisionId || manualDivisionId) {
        fetchTeamsBtn.disabled = false;
    } else {
        fetchTeamsBtn.disabled = true;
    }
}

// Add event listener for manual division ID input when modal opens
function setupManualDivisionIdListener() {
    const manualDivisionIdInput = document.getElementById('manualDivisionId');
    if (manualDivisionIdInput) {
        // Remove existing listeners to avoid duplicates
        const newInput = manualDivisionIdInput.cloneNode(true);
        manualDivisionIdInput.parentNode.replaceChild(newInput, manualDivisionIdInput);
        
        // Add event listener
        document.getElementById('manualDivisionId').addEventListener('input', onDivisionSelected);
        document.getElementById('manualDivisionId').addEventListener('keyup', onDivisionSelected);
    }
}

async function fetchSelectedDivisionTeams() {
    const selectedDivisionId = document.getElementById('selectedDivision').value;
    const manualDivisionId = document.getElementById('manualDivisionId').value.trim();
    const fargoLeagueUrl = document.getElementById('fargoLeagueUrl').value.trim();
    const updateMode = document.querySelector('input[name="updateMode"]:checked').value;
    
    if (!fargoLeagueUrl) {
        alert('Please enter the Fargo Rate League Reports URL');
        return;
    }
    
    // Extract League ID and Division ID from the URL
    let urlParams;
    try {
        urlParams = new URLSearchParams(new URL(fargoLeagueUrl).search);
    } catch (e) {
        alert('Invalid URL format. Please enter a valid Fargo Rate URL.');
        return;
    }
    
    const leagueId = urlParams.get('leagueId');
    const divisionIdFromUrl = urlParams.get('divisionId');
    
    if (!leagueId) {
        alert('Could not extract League ID from the URL. Please make sure the URL is correct.');
        return;
    }
    
    // Use division ID from URL first, then manual input, then selected division
    const divisionId = divisionIdFromUrl || manualDivisionId || selectedDivisionId;
    
    if (!divisionId || divisionId === 'manual') {
        alert('Please select a division, enter a division ID manually, or use a Fargo Rate URL that includes the divisionId parameter.');
        return;
    }
    
    const requestBody = {
        leagueId: leagueId,
        divisionId: divisionId
    };
    
    console.log('📤 Fetching Fargo Rate data:');
    console.log('  League ID:', leagueId);
    console.log('  Division ID:', divisionId);
    console.log('  Source:', divisionIdFromUrl ? 'URL' : (manualDivisionId ? 'manual' : 'dropdown'));
    console.log('  Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('  API URL:', `${API_BASE_URL}/fargo-scraper/standings`);
    
    const loadingSpinner = document.getElementById('fargoLoading');
    loadingSpinner.classList.remove('d-none');
    
    try {
        // Use the existing Fargo Rate scraper endpoint
        const response = await fetch(`${API_BASE_URL}/fargo-scraper/standings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📥 Fargo scraper response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.ok) {
            const data = await response.json();
            fargoTeamData = data.teams || [];
            
            console.log('Fetched Fargo Rate data for League:', leagueId, 'Division:', divisionId);
            console.log('Teams found:', fargoTeamData.length);
            console.log('Team data:', fargoTeamData);
            
            if (fargoTeamData.length > 0) {
                if (updateMode === 'update') {
                    // Show Fargo Rate teams preview first
                    showFargoTeamsPreview();
                } else {
                    // Show preview for new division
                    showPreviewSection();
                }
            } else {
                alert('No teams found for the selected division.');
            }
        } else if (response.status === 404) {
            // Endpoint doesn't exist - show helpful message
            alert('The Fargo Rate scraper endpoint is not available. Please contact support to enable this feature, or use the manual division creation option.');
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('❌ Fargo scraper error:');
            console.error('  Status:', response.status);
            console.error('  Status Text:', response.statusText);
            console.error('  Error Data:', JSON.stringify(errorData, null, 2));
            console.error('  League ID:', leagueId);
            console.error('  Division ID:', divisionId);
            const errorMessage = errorData.message || 'Unknown error';
            let debugInfo = '';
            if (errorData.debug) {
                debugInfo = `\n\nDebug Information:\n`;
                debugInfo += `- HTML Length: ${errorData.debug.htmlLength || 'N/A'}\n`;
                debugInfo += `- Tables Found: ${errorData.debug.tablesFound || 'N/A'}\n`;
                if (errorData.debug.potentialTeamNames && errorData.debug.potentialTeamNames.length > 0) {
                    debugInfo += `- Potential Team Names Found: ${errorData.debug.potentialTeamNames.slice(0, 5).join(', ')}\n`;
                }
            }
            console.error('Full error details:', JSON.stringify(errorData, null, 2));
            alert(`Error fetching Fargo Rate data: ${errorMessage}${debugInfo}\n\nPlease check the browser console for more details.`);
        }
    } catch (error) {
        console.error('Error fetching Fargo Rate data:', error);
        alert('Error fetching Fargo Rate data. Please make sure the URL is correct and try again.');
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

function showPreviewSection() {
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('createSection').style.display = 'block';
    
    // Populate the teams preview table
    const tbody = document.getElementById('teamsPreview');
    tbody.innerHTML = '';
    
    // Get duesPerPlayer and calculate weekly team dues (same as actual creation)
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value) || 0;
    const playersPerWeek = 5; // Default, matches division creation
    const doublePlayMultiplier = 1; // Default to single play
    const weeklyTeamDues = duesPerPlayer * playersPerWeek * doublePlayMultiplier;
    
    // For preview, assume 1 week (division just created = today's date = 1 week)
    // Actual dues will be calculated based on division start date when teams are created
    const previewWeeks = 1;
    const previewDues = weeklyTeamDues * previewWeeks;
    
        fargoTeamData.forEach((team, index) => {
            const row = document.createElement('tr');
            const playerCount = team.playerCount || 1;
            // Note: This is just a preview. Actual dues will be calculated based on weeks passed
            const totalDues = previewDues; // Same for all teams (based on weeks, not player count)
            
            // Show additional players if available
            let playersInfo = '';
            if (team.players && team.players.length > 1) {
                playersInfo = `<br><small class="text-muted">Players: ${team.players.join(', ')}</small>`;
            }
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="team-checkbox" value="${index}" checked onchange="updateSelectedCount()">
                </td>
                <td>${team.name || 'Unknown Team'}</td>
                <td>${team.captain || 'Unknown Captain'}${playersInfo}</td>
                <td>${playerCount}</td>
                <td>$${totalDues}</td>
            `;
            tbody.appendChild(row);
        });
    
    updateSelectedCount();
}

function toggleAllTeams() {
    const selectAll = document.getElementById('selectAllTeams');
    const checkboxes = document.querySelectorAll('.team-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedCount();
}

function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    const selectedCount = selectedCheckboxes.length;
    
    document.getElementById('selectedTeamsCount').textContent = selectedCount;
    document.getElementById('selectedDivisionName').textContent = document.getElementById('smartBuilderDivisionName').value || 'New Division';
    
    // Update select all checkbox state
    const selectAll = document.getElementById('selectAllTeams');
    const totalCheckboxes = document.querySelectorAll('.team-checkbox');
    
    if (selectedCount === 0) {
        selectAll.indeterminate = false;
        selectAll.checked = false;
    } else if (selectedCount === totalCheckboxes.length) {
        selectAll.indeterminate = false;
        selectAll.checked = true;
    } else {
        selectAll.indeterminate = true;
        selectAll.checked = false;
    }
}

// Show Fargo Rate teams preview
function showFargoTeamsPreview() {
    document.getElementById('fargoTeamsSection').style.display = 'block';
    
    const tbody = document.getElementById('fargoTeamsPreview');
    tbody.innerHTML = '';
    
    fargoTeamData.forEach(team => {
        const row = document.createElement('tr');
        const playerCount = team.playerCount || 1;
        
        // Show first few players
        let playersInfo = '';
        if (team.players && team.players.length > 0) {
            const playerNames = team.players.slice(0, 3).join(', ');
            if (team.players.length > 3) {
                playersInfo = `${playerNames} + ${team.players.length - 3} more`;
            } else {
                playersInfo = playerNames;
            }
        }
        
        row.innerHTML = `
            <td><strong>${team.name || 'Unknown Team'}</strong></td>
            <td>${team.captain || 'Unknown Captain'}</td>
            <td><small>${playersInfo}</small></td>
            <td><span class="badge bg-primary">${playerCount}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Show division selection after Fargo Rate preview
function showDivisionSelection() {
    document.getElementById('existingDivisionSection').style.display = 'block';
}

// Load existing divisions for update mode
async function loadExistingDivisions() {
    try {
        const response = await apiCall('/divisions');
        const divisions = await response.json();
        
        const select = document.getElementById('existingDivisionSelect');
        select.innerHTML = '<option value="">Select a division to update...</option>';
        
        divisions.forEach(division => {
            const option = document.createElement('option');
            option.value = division._id;
            option.textContent = division.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading divisions:', error);
        document.getElementById('existingDivisionSelect').innerHTML = '<option value="">Error loading divisions</option>';
    }
}

// Load teams for selected existing division
async function loadExistingDivisionTeams() {
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    
    if (!divisionId) {
        alert('Please select a division first');
        return;
    }
    
    if (fargoTeamData.length === 0) {
        alert('No Fargo Rate data available. Please fetch Fargo Rate data first.');
        return;
    }
    
    try {
        const response = await apiCall('/teams');
        const allTeams = await response.json();
        
        // Filter teams for the selected division - try both ID and name matching
        let existingTeams = allTeams.filter(team => team.division === divisionId);
        
        // If no teams found by ID, try by name
        if (existingTeams.length === 0) {
            existingTeams = allTeams.filter(team => team.division === divisionName);
        }
        
        console.log(`Looking for teams in division: ${divisionName} (ID: ${divisionId})`);
        console.log(`Found ${existingTeams.length} existing teams:`, existingTeams);
        console.log(`All teams:`, allTeams);
        
        if (existingTeams.length === 0) {
            alert(`No teams found for division "${divisionName}". Please check that teams exist in this division.`);
            return;
        }
        
        // Show merge confirmation with side-by-side comparison
        showMergeConfirmation(existingTeams);
        
    } catch (error) {
        console.error('Error loading division teams:', error);
        alert('Error loading division teams');
    }
}

// Show merge confirmation with side-by-side comparison
function showMergeConfirmation(existingTeams) {
    document.getElementById('mergeConfirmationSection').style.display = 'block';
    
    const tbody = document.getElementById('mergePreviewTable');
    tbody.innerHTML = '';
    
    // Create a map of existing teams by name for easy lookup
    const existingTeamsMap = {};
    existingTeams.forEach(team => {
        existingTeamsMap[team.teamName.toLowerCase()] = team;
    });
    
    // Helper function to find best matching team
    function findBestMatch(fargoTeamName, existingTeams) {
        const fargoLower = fargoTeamName.toLowerCase();
        
        // First try exact match
        if (existingTeamsMap[fargoLower]) {
            return existingTeamsMap[fargoLower];
        }
        
        // Try partial matches (one name contains the other)
        for (const team of existingTeams) {
            const existingLower = team.teamName.toLowerCase();
            if (fargoLower.includes(existingLower) || existingLower.includes(fargoLower)) {
                return team;
            }
        }
        
        // Try fuzzy matching (similar words)
        for (const team of existingTeams) {
            const existingLower = team.teamName.toLowerCase();
            const fargoWords = fargoLower.split(/\s+/);
            const existingWords = existingLower.split(/\s+/);
            
            // Check if any significant words match
            const matchingWords = fargoWords.filter(word => 
                word.length > 2 && existingWords.some(existingWord => 
                    existingWord.includes(word) || word.includes(existingWord)
                )
            );
            
            if (matchingWords.length > 0) {
                return team;
            }
        }
        
        return null;
    }
    
    fargoTeamData.forEach(fargoTeam => {
        const row = document.createElement('tr');
        const existingTeam = findBestMatch(fargoTeam.name, existingTeams);
        
        // Debug logging
        console.log(`Fargo Team: "${fargoTeam.name}" -> Existing Team:`, existingTeam ? existingTeam.teamName : "No match");
        
        let action, existingTeamName, playersToAdd;
        
        if (existingTeam) {
            // Team exists - show merge option
            action = '<span class="badge bg-warning">Merge</span>';
            existingTeamName = existingTeam.teamName;
            const currentPlayerCount = existingTeam.teamMembers ? existingTeam.teamMembers.length : 0;
            const newPlayerCount = fargoTeam.playerCount || 0;
            playersToAdd = `${currentPlayerCount} → ${newPlayerCount} players`;
        } else {
            // Team doesn't exist - show create option
            action = '<span class="badge bg-success">Create New</span>';
            existingTeamName = '<em class="text-muted">No existing team</em>';
            playersToAdd = `${fargoTeam.playerCount || 0} players`;
        }
        
        row.innerHTML = `
            <td>${action}</td>
            <td><strong>${fargoTeam.name}</strong><br><small>Captain: ${fargoTeam.captain}</small></td>
            <td>${existingTeamName}</td>
            <td>${playersToAdd}</td>
        `;
        tbody.appendChild(row);
    });
}

// Execute the merge
async function executeMerge() {
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value);
    
    console.log('Starting merge process...');
    console.log('Auth token available:', !!authToken);
    console.log('Division ID:', divisionId);
    console.log('Division Name:', divisionName);
    console.log('Dues per player:', duesPerPlayer);
    
    try {
        // Get existing teams for this division
        const response = await apiCall('/teams');
        const allTeams = await response.json();
        const existingTeams = allTeams.filter(team => 
            team.division === divisionId || team.division === divisionName
        );
        
        // Create a map of existing teams by name for easy lookup
        const existingTeamsMap = {};
        existingTeams.forEach(team => {
            existingTeamsMap[team.teamName.toLowerCase()] = team;
        });
        
        // Helper function to find best matching team (same as in showMergeConfirmation)
        function findBestMatch(fargoTeamName, existingTeams) {
            const fargoLower = fargoTeamName.toLowerCase();
            
            // First try exact match
            if (existingTeamsMap[fargoLower]) {
                return existingTeamsMap[fargoLower];
            }
            
            // Try partial matches (one name contains the other)
            for (const team of existingTeams) {
                const existingLower = team.teamName.toLowerCase();
                if (fargoLower.includes(existingLower) || existingLower.includes(fargoLower)) {
                    return team;
                }
            }
            
            // Try fuzzy matching (similar words)
            for (const team of existingTeams) {
                const existingLower = team.teamName.toLowerCase();
                const fargoWords = fargoLower.split(/\s+/);
                const existingWords = existingLower.split(/\s+/);
                
                // Check if any significant words match
                const matchingWords = fargoWords.filter(word => 
                    word.length > 2 && existingWords.some(existingWord => 
                        existingWord.includes(word) || word.includes(existingWord)
                    )
                );
                
                if (matchingWords.length > 0) {
                    return team;
                }
            }
            
            return null;
        }
        
        console.log('Existing teams found:', existingTeams);
        console.log('Existing teams map:', existingTeamsMap);
        
        // Get division data once before processing teams
        const divisionResponse = await apiCall('/divisions');
        const allDivisions = await divisionResponse.json();
        const teamDivision = allDivisions.find(d => 
            d.name === divisionName || 
            d._id === divisionId || 
            d.id === divisionId
        );
        
            // Calculate division parameters once
            const duesPerPlayerPerMatch = teamDivision?.duesPerPlayerPerMatch || duesPerPlayer;
            const playersPerWeek = teamDivision?.playersPerWeek || 5;
            const totalWeeks = teamDivision?.totalWeeks || 20;
            
            // Calculate weekly team dues: duesPerPlayerPerMatch * playersPerWeek
            // Example: $8 dues × 5 players = $40 per week
            // Double play multiplies by 2 (so $80 per week for double play)
            const doublePlayMultiplier = teamDivision?.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = duesPerPlayerPerMatch * playersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed since division start date
            let weeksPassed = 0;
            if (teamDivision?.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(0, Math.floor(daysDiff / 7));
                
                // Grace period: teams have 3 days after week ends before being considered late
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (daysIntoCurrentWeek <= gracePeriodDays && weeksPassed > 0) {
                    weeksPassed = Math.max(0, weeksPassed - 1);
                }
            }
            
            // Use weeksPassed for dues calculation (not totalWeeks)
            const weeksForDues = Math.max(1, weeksPassed); // At least week 1 if division has started
        
        const updatePromises = [];
        
        fargoTeamData.forEach(fargoTeam => {
            const existingTeam = findBestMatch(fargoTeam.name, existingTeams);
            
            console.log(`Processing Fargo Team: "${fargoTeam.name}" -> Existing Team:`, existingTeam ? existingTeam.teamName : "No match");
            
            if (existingTeam) {
                // Update existing team with Fargo Rate roster
                    // Calculate total dues: weeklyTeamDues * weeksPassed (NOT using playerCount)
                    const playerCount = fargoTeam.playerCount || existingTeam.playerCount || 1;
                    const calculatedDues = weeklyTeamDues * weeksForDues;
                
                // Determine captain name
                const captainName = fargoTeam.captain || (fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : existingTeam.captainName || 'Unknown Captain');
                
                const updatedTeamData = {
                    ...existingTeam,
                    captainName: captainName,
                    captainEmail: fargoTeam.captainEmail || existingTeam.captainEmail || '',
                    captainPhone: fargoTeam.captainPhone || existingTeam.captainPhone || '',
                    teamMembers: [], // Reset team members
                    duesAmount: calculatedDues, // Use calculated dues
                    playerCount: playerCount
                    // Preserve existing duesPaid status and division info (spread operator handles it)
                };
                
                // Add captain first
                if (fargoTeam.captain) {
                    updatedTeamData.teamMembers.push({
                        name: fargoTeam.captain,
                        email: fargoTeam.captainEmail || '',
                        phone: fargoTeam.captainPhone || ''
                    });
                }
                
                // Add all players from Fargo Rate (excluding captain)
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        // Don't add captain twice
                        if (playerName !== fargoTeam.captain) {
                        updatedTeamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // Fargo Rate doesn't provide emails
                            phone: ''  // Fargo Rate doesn't provide phone numbers
                        });
                        }
                    });
                }
                
                console.log('Updating team:', existingTeam.teamName, 'with data:', updatedTeamData);
                
                updatePromises.push(
                    apiCall(`/teams/${existingTeam._id}`, {
                        method: 'PUT',
                        body: JSON.stringify(updatedTeamData)
                    }).then(async response => {
                        console.log('Update response for', existingTeam.teamName, ':', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to update team ${existingTeam.teamName}: ${response.status} ${errorText}`);
                        }
                        return response;
                    }).catch(error => {
                        console.error('Error updating team', existingTeam.teamName, ':', error);
                        throw error;
                    })
                );
            } else {
                // Create new team
                const playerCount = fargoTeam.playerCount || 1;
                // Calculate total dues: weeklyTeamDues * weeksPassed (NOT using playerCount or matchesPerWeek)
                const calculatedDues = weeklyTeamDues * weeksForDues;
                
                const teamData = {
                    teamName: fargoTeam.name || 'Unknown Team',
                    division: divisionName, // Use division name, not ID
                    captainName: fargoTeam.captain || (fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : 'Unknown Captain'),
                    teamMembers: [],
                    duesAmount: calculatedDues,
                    divisionDuesRate: duesPerPlayerPerMatch,
                    numberOfTeams: teamDivision?.numberOfTeams,
                    totalWeeks: totalWeeks,
                    isDoublePlay: teamDivision?.isDoublePlay || false,
                    playerCount: playerCount,
                    duesPaid: false
                };
                
                console.log('Creating team with division name:', divisionName);
                
                // Add all players from Fargo Rate
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        teamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // Fargo Rate doesn't provide emails
                            phone: ''  // Fargo Rate doesn't provide phone numbers
                        });
                    });
                }
                
                console.log('Creating new team:', teamData);
                
                updatePromises.push(
                    apiCall('/teams', {
                        method: 'POST',
                        body: JSON.stringify(teamData)
                    }).then(async response => {
                        console.log('Create response for', teamData.teamName, ':', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to create team ${teamData.teamName}: ${response.status} ${errorText}`);
                        }
                        return response;
                    }).catch(error => {
                        console.error('Error creating team', teamData.teamName, ':', error);
                        throw error;
                    })
                );
            }
        });
        
        console.log('Executing all merge operations...');
        await Promise.all(updatePromises);
        console.log('All merge operations completed successfully');
        
        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('smartBuilderModal')).hide();
        console.log('Refreshing data after merge...');
        await loadData();
        console.log('Data refresh completed');
        
        alert(`Successfully updated "${divisionName}" with Fargo Rate roster data!`);
        
    } catch (error) {
        console.error('Error executing merge:', error);
        alert(`Error executing merge: ${error.message}`);
    }
}

// Cancel merge
function cancelMerge() {
    document.getElementById('mergeConfirmationSection').style.display = 'none';
}

// Show preview for updating existing division
function showUpdatePreview(existingTeams) {
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('createSection').style.display = 'block';
    
    const tbody = document.getElementById('teamsPreview');
    tbody.innerHTML = '';
    
    // Get division to calculate dues correctly
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value) || 0;
    
    // For preview, we'll calculate based on division if we can find it
    // Otherwise use default calculation
    let previewDues = 0;
    if (divisions && divisions.length > 0) {
        const division = divisions.find(d => d._id === divisionId || d.id === divisionId);
        if (division) {
            const playersPerWeek = division.playersPerWeek || 5;
            const doublePlayMultiplier = division.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = (division.duesPerPlayerPerMatch || duesPerPlayer) * playersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed for preview
            let weeksPassed = 1; // Default to 1 if can't calculate
            if (division.startDate) {
                const [year, month, day] = division.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(1, Math.floor(daysDiff / 7));
            }
            previewDues = weeklyTeamDues * weeksPassed;
        }
    }
    
    // Show Fargo Rate teams that will be used to update existing teams
    fargoTeamData.forEach((fargoTeam, index) => {
        const row = document.createElement('tr');
        const playerCount = fargoTeam.playerCount || 1;
        const totalDues = previewDues; // Same for all teams (based on weeks, not player count)
        
        // Show Fargo Rate players
        let playersInfo = '';
        if (fargoTeam.players && fargoTeam.players.length > 0) {
            const playerNames = fargoTeam.players.slice(0, 3).join(', '); // Show first 3 players
            if (fargoTeam.players.length > 3) {
                playersInfo = `<br><small class="text-muted">Players: ${playerNames} + ${fargoTeam.players.length - 3} more</small>`;
            } else {
                playersInfo = `<br><small class="text-muted">Players: ${playerNames}</small>`;
            }
        }
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="team-checkbox" value="${index}" checked onchange="updateSelectedCount()">
            </td>
            <td>${fargoTeam.name || 'Unknown Team'}</td>
            <td>${fargoTeam.captain || 'Unknown Captain'}${playersInfo}</td>
            <td>${playerCount}</td>
            <td>$${totalDues}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Update the create section text
    document.getElementById('selectedDivisionName').textContent = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    document.getElementById('selectedTeamsCount').textContent = fargoTeamData.length;
    
    updateSelectedCount();
}

async function createTeamsAndDivision() {
    const updateMode = document.querySelector('input[name="updateMode"]:checked').value;
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value);
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Please select at least one team to process');
        return;
    }
    
    if (updateMode === 'create') {
        const divisionName = document.getElementById('divisionName').value.trim();
        if (!divisionName) {
            alert('Please enter a division name');
            return;
        }
    }
    
    try {
        if (updateMode === 'create') {
            // Create new division mode - use same fields as editor
            const isDoublePlay = document.getElementById('smartBuilderIsDoublePlay').checked;
            let divisionName = '';
            
            // Format division name for double play (same logic as editor)
            if (isDoublePlay) {
                const baseName = document.getElementById('smartBuilderDoublePlayDivisionName').value.trim();
                const firstGameType = document.getElementById('firstGameType').value.trim();
                const secondGameType = document.getElementById('smartBuilderSecondGameType').value.trim();
                
                if (!baseName || !firstGameType || !secondGameType) {
                    alert('Please complete all double play division fields: Base Name, First Game Type, and Second Game Type');
                    return;
                }
                
                // Format: "Base Name - Game Type 1 / Base Name - Game Type 2"
                divisionName = `${baseName} - ${firstGameType} / ${baseName} - ${secondGameType}`;
            } else {
                // Regular division - combine name and game type
                const baseName = document.getElementById('smartBuilderDivisionName').value.trim();
                const gameType = document.getElementById('firstGameType').value.trim();
                
                if (!baseName || !gameType) {
                    alert('Please enter a division name and select a game type');
                    return;
                }
                
                divisionName = `${baseName} - ${gameType}`;
            }
            
            // Get all division settings from Smart Builder form (same as editor)
            const smartBuilderPlayersPerWeek = parseInt(document.getElementById('smartBuilderPlayersPerWeek').value) || 5;
            const smartBuilderTotalWeeks = parseInt(document.getElementById('smartBuilderTotalWeeks').value) || 20;
            const startDate = document.getElementById('smartBuilderStartDate').value;
            const endDate = document.getElementById('smartBuilderEndDate').value;
            
            if (!startDate) {
                alert('Please select a season start date');
                return;
            }
            
            // Calculate number of teams from selected teams
            const numberOfTeams = selectedCheckboxes.length;
            
            // Create the division with all fields from Smart Builder (same as editor)
            const divisionResponse = await apiCall('/divisions', {
                method: 'POST',
                body: JSON.stringify({
                    name: divisionName,
                    duesPerPlayerPerMatch: duesPerPlayer,
                    playersPerWeek: smartBuilderPlayersPerWeek,
                    numberOfTeams: numberOfTeams,
                    totalWeeks: smartBuilderTotalWeeks,
                    startDate: startDate,
                    endDate: endDate || calculateEndDateFromStart(startDate, smartBuilderTotalWeeks),
                    isDoublePlay: isDoublePlay,
                    currentTeams: 0, // Will be updated as teams are created
                    isActive: true,
                    description: `Division created via Smart Builder from Fargo Rate data`
                })
            });
            
            if (!divisionResponse.ok) {
                const error = await divisionResponse.json();
                throw new Error(error.message || 'Failed to create division');
            }
            
            // Then create the selected teams
            // Get division data to calculate dues properly
            const divisionsResponse = await apiCall('/divisions');
            const allDivisions = await divisionsResponse.json();
            const createdDivision = allDivisions.find(d => d.name === divisionName);
            
            if (!createdDivision) {
                throw new Error('Could not find created division. Please try again.');
            }
            
            // Calculate proper dues amount using division data
            const duesPerPlayerPerMatch = createdDivision.duesPerPlayerPerMatch || duesPerPlayer;
            // Use playersPerWeek from created division (already set from form above)
            const divisionPlayersPerWeek = createdDivision.playersPerWeek || smartBuilderPlayersPerWeek;
            const divisionTotalWeeks = createdDivision.totalWeeks || smartBuilderTotalWeeks;
            
            // Calculate weekly team dues: duesPerPlayerPerMatch * playersPerWeek
            // Example: $8 dues × 5 players = $40 per week
            // Double play multiplies by 2 (so $80 per week for double play)
            const doublePlayMultiplier = createdDivision.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = duesPerPlayerPerMatch * divisionPlayersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed since division start date (default to 0 if division just created)
            let weeksPassed = 0;
            if (createdDivision.startDate) {
                const [year, month, day] = createdDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(0, Math.floor(daysDiff / 7));
                
                // Grace period: teams have 3 days after week ends before being considered late
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (daysIntoCurrentWeek <= gracePeriodDays && weeksPassed > 0) {
                    weeksPassed = Math.max(0, weeksPassed - 1);
                }
            }
            
            // Use weeksPassed for initial dues (not totalWeeks)
            const weeksForDues = Math.max(1, weeksPassed); // At least week 1 if division has started
            
            const teamPromises = Array.from(selectedCheckboxes).map(async (checkbox) => {
                const teamIndex = parseInt(checkbox.value);
                const team = fargoTeamData[teamIndex];
                const playerCount = team.playerCount || 1;
                
                // Calculate total dues: weeklyTeamDues * weeksPassed
                // NOT: duesPerPlayerPerMatch * playerCount * matchesPerWeek * weeksPassed
                const calculatedDues = weeklyTeamDues * weeksForDues;
                
                // Determine captain name
                const captainName = team.captain || (team.players && team.players.length > 0 ? team.players[0] : 'Unknown Captain');
                
                const teamData = {
                    teamName: team.name || 'Unknown Team',
                    division: divisionName,
                    captainName: captainName,
                    captainEmail: team.captainEmail || '',
                    captainPhone: team.captainPhone || '',
                    teamMembers: [],
                    duesAmount: calculatedDues,
                    divisionDuesRate: duesPerPlayerPerMatch,
                    numberOfTeams: createdDivision.numberOfTeams,
                    totalWeeks: totalWeeks,
                    isDoublePlay: createdDivision.isDoublePlay || false,
                    playerCount: playerCount,
                    duesPaid: false // Initialize as unpaid
                };
                
                // Add all players from the team (including captain)
                if (team.captain) {
                    teamData.teamMembers.push({
                        name: team.captain,
                        email: team.captainEmail || '',
                        phone: team.captainPhone || ''
                    });
                }
                
                if (team.players && team.players.length > 0) {
                    team.players.forEach(playerName => {
                        // Don't add captain twice
                        if (playerName !== team.captain) {
                        teamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // Fargo Rate doesn't provide emails
                            phone: ''  // Fargo Rate doesn't provide phone numbers
                        });
                        }
                    });
                } else if (!team.captain) {
                    // Fallback if no captain and no players
                    teamData.teamMembers.push({
                        name: 'Unknown Captain',
                        email: '',
                        phone: ''
                    });
                }
                
                return apiCall('/teams', {
                    method: 'POST',
                    body: JSON.stringify(teamData)
                });
            });
            
            const teamResponses = await Promise.all(teamPromises);
            const failedTeams = teamResponses.filter(response => !response.ok);
            
            if (failedTeams.length > 0) {
                console.warn('Some teams failed to create:', failedTeams);
            }
            
            // Close modal and refresh data
            bootstrap.Modal.getInstance(document.getElementById('smartBuilderModal')).hide();
            
            // Preserve current division filter before reloading data
            const currentDivisionFilter = document.getElementById('divisionFilter').value;
            
            await loadData();
            
            // Set the filter to the new division
            document.getElementById('divisionFilter').value = divisionName;
            filterTeamsByDivision();
            
            alert(`Successfully created division "${divisionName}" with ${selectedCheckboxes.length} teams!`);
            
        } else {
            // Update existing division mode
            const divisionId = document.getElementById('existingDivisionSelect').value;
            const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
            
            // Get existing teams for this division
            const response = await apiCall('/teams');
            const allTeams = await response.json();
            const existingTeams = allTeams.filter(team => team.division === divisionId);
            
            // Get division data once before processing teams
            const divisionResponse = await apiCall('/divisions');
            const allDivisions = await divisionResponse.json();
            const teamDivision = allDivisions.find(d => 
                d.name === divisionName || 
                d._id === divisionId || 
                d.id === divisionId
            );
            
            // Calculate division parameters once
            const duesPerPlayerPerMatch = teamDivision?.duesPerPlayerPerMatch || duesPerPlayer;
            const playersPerWeek = teamDivision?.playersPerWeek || 5;
            const totalWeeks = teamDivision?.totalWeeks || 20;
            
            // Calculate weekly team dues: duesPerPlayerPerMatch * playersPerWeek
            // Example: $8 dues × 5 players = $40 per week
            // Double play multiplies by 2 (so $80 per week for double play)
            const doublePlayMultiplier = teamDivision?.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = duesPerPlayerPerMatch * playersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed since division start date
            let weeksPassed = 0;
            if (teamDivision?.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(0, Math.floor(daysDiff / 7));
                
                // Grace period: teams have 3 days after week ends before being considered late
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (daysIntoCurrentWeek <= gracePeriodDays && weeksPassed > 0) {
                    weeksPassed = Math.max(0, weeksPassed - 1);
                }
            }
            
            // Use weeksPassed for dues calculation (not totalWeeks)
            const weeksForDues = Math.max(1, weeksPassed); // At least week 1 if division has started
            
            // Update teams with Fargo Rate data
            const updatePromises = Array.from(selectedCheckboxes).map(async (checkbox) => {
                const fargoTeamIndex = parseInt(checkbox.value);
                const fargoTeam = fargoTeamData[fargoTeamIndex];
                
                if (!fargoTeam) return;
                
                // Find existing team by name (case-insensitive)
                const existingTeam = existingTeams.find(team => 
                    team.teamName.toLowerCase() === fargoTeam.name.toLowerCase()
                );
                
                if (!existingTeam) {
                    console.warn(`No existing team found for Fargo Rate team: ${fargoTeam.name}`);
                    return;
                }
                
                // Calculate total dues: weeklyTeamDues * weeksPassed (NOT using playerCount)
                const playerCount = fargoTeam.playerCount || existingTeam.playerCount || 1;
                const calculatedDues = weeklyTeamDues * weeksForDues;
                
                // Determine captain name
                const captainName = fargoTeam.captain || (fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : existingTeam.captainName || 'Unknown Captain');
                
                // Update team with complete roster from Fargo Rate
                const updatedTeamData = {
                    ...existingTeam,
                    captainName: captainName,
                    captainEmail: fargoTeam.captainEmail || existingTeam.captainEmail || '',
                    captainPhone: fargoTeam.captainPhone || existingTeam.captainPhone || '',
                    teamMembers: [], // Reset team members
                    duesAmount: calculatedDues, // Use calculated dues
                    playerCount: playerCount,
                    // Preserve existing duesPaid status and division info
                };
                
                // Add captain first
                if (fargoTeam.captain) {
                    updatedTeamData.teamMembers.push({
                        name: fargoTeam.captain,
                        email: fargoTeam.captainEmail || '',
                        phone: fargoTeam.captainPhone || ''
                    });
                }
                
                // Add all players from Fargo Rate (excluding captain)
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        // Don't add captain twice
                        if (playerName !== fargoTeam.captain) {
                        updatedTeamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // Fargo Rate doesn't provide emails
                            phone: ''  // Fargo Rate doesn't provide phone numbers
                        });
                        }
                    });
                }
                
                return apiCall(`/teams/${existingTeam._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updatedTeamData)
                });
            });
            
            await Promise.all(updatePromises);
            
            // Close modal and refresh data
            bootstrap.Modal.getInstance(document.getElementById('smartBuilderModal')).hide();
            await loadData();
            
            alert(`Teams in "${divisionName}" updated successfully with complete rosters!`);
        }
        
    } catch (error) {
        console.error('Error processing teams:', error);
        alert(`Error processing teams: ${error.message}`);
    }
}

function populateWeeklyPaymentAmountDropdown(team, teamDivision) {
    console.log('populateWeeklyPaymentAmountDropdown called with team:', team);
    console.log('Team division dues rate:', team.divisionDuesRate);
    console.log('Team members count:', team.teamMembers ? team.teamMembers.length : 0);
    
    const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
    paymentAmountSelect.innerHTML = '<option value="">Select Amount</option>';
    
    // Calculate the weekly team dues amount
    // Formula: dues per player × players per week × (single play = 5, double play = 2 multiplier)
    // Parse all values as numbers to ensure correct calculation
    const individualDuesRate = parseFloat(team.divisionDuesRate) || 0; // Parse as float
    const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5; // Parse as integer, get from division settings
    // Single play: dues × players × 1, Double play: dues × players × 2
    const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
    const weeklyTeamDues = individualDuesRate * playersPerWeek * doublePlayMultiplier;
    
    console.log('Individual dues rate:', individualDuesRate);
    console.log('Players per week:', playersPerWeek);
    console.log('Play multiplier:', doublePlayMultiplier, teamDivision && teamDivision.isDoublePlay ? '(double play = 2x)' : '(single play = 5 matches)');
    console.log('Is double play:', teamDivision && teamDivision.isDoublePlay);
    console.log('Weekly team dues:', weeklyTeamDues);
    
    // Add the base weekly team dues amount
    const baseOption = document.createElement('option');
    baseOption.value = weeklyTeamDues;
    baseOption.textContent = `${formatCurrency(weeklyTeamDues)} (Weekly Team Dues)`;
    paymentAmountSelect.appendChild(baseOption);
    console.log('Added base weekly dues option:', baseOption.textContent);
    
    // Calculate profit per player (used in both sanction fee sections)
    const profitPerPlayer = sanctionFeeAmount > 0 && sanctionFeesEnabled ? getSanctionFeeProfitPerPlayer() : 0;
    
    // Add options for weekly team dues + sanction fees (only if sanction fees are enabled)
    if (sanctionFeeAmount > 0 && sanctionFeesEnabled) {
        const maxPlayers = team.teamMembers ? team.teamMembers.length : 10;
        
        console.log(`Adding ${sanctionFeeName} options for up to`, maxPlayers, 'players');
        
        // Add options for weekly dues + sanction fees for different numbers of players
        for (let playerCount = 1; playerCount <= maxPlayers; playerCount++) {
            const sanctionCollectionAmount = sanctionFeeAmount * playerCount;
            const sanctionPayoutAmount = sanctionFeePayoutAmount * playerCount;
            const sanctionProfit = profitPerPlayer * playerCount;
            const totalAmount = weeklyTeamDues + sanctionCollectionAmount;
            
            const option = document.createElement('option');
            option.value = totalAmount;
            option.textContent = `${formatCurrency(totalAmount)} (Weekly: ${formatCurrency(weeklyTeamDues)} + ${sanctionFeeName}: ${formatCurrency(sanctionCollectionAmount)} | Profit: ${formatCurrency(sanctionProfit)})`;
            // Add data attributes for detailed breakdown
            option.dataset.sanctionCollection = sanctionCollectionAmount.toFixed(2);
            option.dataset.sanctionPayout = sanctionPayoutAmount.toFixed(2);
            option.dataset.sanctionProfit = sanctionProfit.toFixed(2);
            option.dataset.playerCount = playerCount;
            paymentAmountSelect.appendChild(option);
            console.log('Added combined option:', option.textContent);
        }
        
        // Add sequential options for extra players beyond team size - fill in all gaps
        // This ensures no gaps in the dropdown
        const maxTotalPlayers = Math.max(maxPlayers + 5, 15); // At least 5 more than team size, or 15 minimum
        
        for (let totalPlayerCount = maxPlayers + 1; totalPlayerCount <= maxTotalPlayers; totalPlayerCount++) {
            const totalSanctionAmount = sanctionFeeAmount * totalPlayerCount;
            const totalPayoutAmount = sanctionFeePayoutAmount * totalPlayerCount;
            const totalProfit = profitPerPlayer * totalPlayerCount;
            const totalAmount = weeklyTeamDues + totalSanctionAmount;
            
            const option = document.createElement('option');
            option.value = totalAmount;
            option.textContent = `${formatCurrency(totalAmount)} (Weekly: ${formatCurrency(weeklyTeamDues)} + ${sanctionFeeName}: ${formatCurrency(totalSanctionAmount)} (${totalPlayerCount} players) | Profit: ${formatCurrency(totalProfit)})`;
            option.dataset.sanctionCollection = totalSanctionAmount.toFixed(2);
            option.dataset.sanctionPayout = totalPayoutAmount.toFixed(2);
            option.dataset.sanctionProfit = totalProfit.toFixed(2);
            option.dataset.playerCount = totalPlayerCount;
            option.dataset.isExtra = 'true';
            paymentAmountSelect.appendChild(option);
            console.log('Added extra player option:', option.textContent);
        }
        
        // Add common round payment amounts (for convenience) - only if beyond the sequential range
        const commonAmounts = [
            weeklyTeamDues + (sanctionFeeAmount * 20), // 20 players worth
            weeklyTeamDues + (sanctionFeeAmount * 25), // 25 players worth
            weeklyTeamDues + (sanctionFeeAmount * 30)  // 30 players worth
        ];
        
        commonAmounts.forEach(amount => {
            // Only add if it's beyond what we've already added sequentially
            if (amount > weeklyTeamDues + (sanctionFeeAmount * maxTotalPlayers)) {
                const extraSanctionAmount = amount - weeklyTeamDues;
                const playerCount = Math.round(extraSanctionAmount / sanctionFeeAmount);
                const extraPayoutAmount = sanctionFeePayoutAmount * playerCount;
                const extraProfit = profitPerPlayer * playerCount;
                
                const option = document.createElement('option');
                option.value = amount;
                option.textContent = `${formatCurrency(amount)} (Weekly: ${formatCurrency(weeklyTeamDues)} + Extra ${sanctionFeeName}: ${formatCurrency(extraSanctionAmount)} ~${playerCount} players | Profit: ${formatCurrency(extraProfit)})`;
                option.dataset.sanctionCollection = extraSanctionAmount.toFixed(2);
                option.dataset.sanctionPayout = extraPayoutAmount.toFixed(2);
                option.dataset.sanctionProfit = extraProfit.toFixed(2);
                option.dataset.playerCount = playerCount;
                option.dataset.isExtra = 'true';
                paymentAmountSelect.appendChild(option);
            }
        });
    }
    
    console.log('Total options added:', paymentAmountSelect.options.length);
}

function updateWeeklyPaymentAmount() {
    const selectedAmount = document.getElementById('weeklyPaymentAmount').value;
    // You can add any additional logic here if needed
}

function populateBCASanctionPlayers(team) {
    const container = document.getElementById('bcaSanctionPlayers');
    container.innerHTML = '';
    
    if (team.teamMembers && team.teamMembers.length > 0) {
        // Check if any players have been sanctioned via payment modals
        const sanctionedPlayersFromPayments = new Set();
        if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
            team.weeklyPayments.forEach(payment => {
                if (payment.paid === 'true' && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                    payment.bcaSanctionPlayers.forEach(playerName => {
                        sanctionedPlayersFromPayments.add(playerName);
                    });
                }
            });
        }
        
        let playersNeedingSanction = 0;
        
        team.teamMembers.forEach((member, index) => {
            // Check if player was sanctioned via payment modal (overrides member's bcaSanctionPaid)
            const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
            const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid === true;
            const isPreviouslySanctioned = member.previouslySanctioned === true;
            const needsSanction = !effectiveBcaSanctionPaid && !isPreviouslySanctioned;
            
            if (needsSanction) {
                playersNeedingSanction++;
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check';
                checkboxDiv.innerHTML = `
                    <input class="form-check-input" type="checkbox" name="bcaSanctionPlayer" value="${member.name}" id="bcaPlayer${index}">
                    <label class="form-check-label" for="bcaPlayer${index}">
                        ${member.name}
                    </label>
                `;
                container.appendChild(checkboxDiv);
            } else {
                // Show status for players who don't need sanction
                const statusDiv = document.createElement('div');
                statusDiv.className = 'form-check';
                let statusText = '';
                let statusClass = '';
                
                if (effectiveBcaSanctionPaid) {
                    statusText = '✓ Already Paid';
                    statusClass = 'text-success';
                } else if (isPreviouslySanctioned) {
                    statusText = '✓ Previously Sanctioned';
                    statusClass = 'text-info';
                }
                
                statusDiv.innerHTML = `
                    <div class="form-check-label ${statusClass}">
                        ${member.name} - ${statusText}
                    </div>
                `;
                container.appendChild(statusDiv);
            }
        });
        
        if (playersNeedingSanction === 0) {
            container.innerHTML = '<p class="text-success mb-0">✓ All players are already sanctioned (paid or previously sanctioned)</p>';
        }
    } else {
        container.innerHTML = '<p class="text-muted mb-0">No team members found</p>';
    }
}

function showPlayersView() {
    populatePlayersModal();
    
    // Auto-select the current division in the players modal
    const currentDivisionFilter = document.getElementById('divisionFilter');
    const playersDivisionFilter = document.getElementById('playersDivisionFilter');
    
    if (currentDivisionFilter && playersDivisionFilter) {
        const selectedDivisionId = currentDivisionFilter.value;
        if (selectedDivisionId && selectedDivisionId !== 'all') {
            // Find the division name by ID
            const selectedDivision = divisions.find(d => d._id === selectedDivisionId);
            if (selectedDivision) {
                playersDivisionFilter.value = selectedDivision.name;
                // Apply the filter immediately
                filterPlayersTable();
            }
        }
    }
    
    new bootstrap.Modal(document.getElementById('playersModal')).show();
}

function populatePlayersModal() {
    // Populate division filter
    const divisionFilter = document.getElementById('playersDivisionFilter');
    divisionFilter.innerHTML = '<option value="all">All Divisions</option>';
    divisions.forEach(division => {
        const option = document.createElement('option');
        option.value = division.name;
        option.textContent = division.name;
        divisionFilter.appendChild(option);
    });
    
    // Populate players table
    populatePlayersTable();
}

function populatePlayersTable() {
    const tbody = document.getElementById('playersTableBody');
    tbody.innerHTML = '';
    
    // Clear and rebuild players data array
    allPlayersData = [];
    
    let totalPlayers = 0;
    let sanctionPaid = 0;
    let sanctionPending = 0;
    let previouslySanctioned = 0;
    let totalCollected = 0;
    
    console.log('Teams data:', teams);
    
    teams.forEach(team => {
        console.log(`Team: ${team.teamName}, Captain:`, team.captainName, 'Members:', team.teamMembers);
        
        // Add captain as a player (if not already in teamMembers)
        const allPlayers = [];
        
        // Add captain first
        if (team.captainName) {
            // Check if captain is also in teamMembers (for sanction tracking)
            const captainMember = team.teamMembers.find(m => m.name === team.captainName);
            
            // Check if captain was sanctioned via weekly payments
            let captainSanctionPaid = captainMember ? captainMember.bcaSanctionPaid : false;
            if (team.weeklyPayments) {
                team.weeklyPayments.forEach(payment => {
                    const isPaid = payment.paid === 'true' || payment.paid === true;
                    if (isPaid && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) && payment.bcaSanctionPlayers.includes(team.captainName)) {
                        captainSanctionPaid = true;
                    }
                });
            }
            
            const captainPlayer = {
                name: team.captainName,
                email: team.captainEmail || '', // Use captainEmail if available
                phone: team.captainPhone || '', // Use captainPhone if available
                bcaSanctionPaid: captainSanctionPaid,
                previouslySanctioned: captainMember ? captainMember.previouslySanctioned : (team.captainPreviouslySanctioned || false),
                isCaptain: true
            };
            allPlayers.push(captainPlayer);
            console.log(`Added captain:`, captainPlayer);
        }
        
        // Add team members (but skip if they're the same as captain)
        if (team.teamMembers && team.teamMembers.length > 0) {
            team.teamMembers.forEach(member => {
                // Skip if this member is the same as the captain
                if (member.name !== team.captainName) {
                    allPlayers.push({
                        ...member,
                        isCaptain: false
                    });
                }
            });
        }
        
        // Process all players (captain + members)
        allPlayers.forEach(player => {
            totalPlayers++;
            
            // Check if sanction is paid (from team member record or weekly payments)
            let isSanctionPaid = player.bcaSanctionPaid || false;
            
            // Also check weekly payments for sanction fees
            // Payment.paid can be 'true' (string) or true (boolean) or 'bye' or 'makeup'
            if (team.weeklyPayments) {
                team.weeklyPayments.forEach(payment => {
                    const isPaid = payment.paid === 'true' || payment.paid === true;
                    if (isPaid && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) && payment.bcaSanctionPlayers.includes(player.name)) {
                        isSanctionPaid = true;
                    }
                });
            }
            
            if (isSanctionPaid) {
                sanctionPaid++;
                if (!player.previouslySanctioned) {
                    totalCollected += sanctionFeeAmount;
                }
            } else if (player.previouslySanctioned) {
                // Previously sanctioned players don't count as pending
                previouslySanctioned++;
            } else {
                sanctionPending++;
            }
            
            // Count how many teams this player is on (for display purposes)
            const playerTeamCount = teams.filter(t => {
                if (t.captainName === player.name) return true;
                return t.teamMembers && t.teamMembers.some(m => m.name === player.name);
            }).length;
            
            // Store player data for sorting
            allPlayersData.push({
                player: player,
                team: team,
                isSanctionPaid: isSanctionPaid,
                playerName: player.name,
                teamName: team.teamName,
                division: team.division,
                email: player.email || '',
                phone: player.phone || '',
                previouslySanctioned: player.previouslySanctioned || false,
                isCaptain: player.isCaptain || false,
                teamCount: playerTeamCount // Track how many teams this player is on
            });
        });
    });
    
    // Apply sorting if a column is selected
    if (currentPlayersSortColumn) {
        sortPlayersTable(currentPlayersSortColumn, false); // false = don't toggle, just apply current sort
    } else {
        // No sort applied, render all players
        renderPlayersTable(allPlayersData);
        // Update summary cards with all players
        updatePlayersSummaryCards(allPlayersData);
    }
}

function renderPlayersTable(playersToRender) {
    const tbody = document.getElementById('playersTableBody');
    tbody.innerHTML = '';
    
    playersToRender.forEach(playerData => {
        const { player, team, isSanctionPaid } = playerData;
        
        const row = document.createElement('tr');
        const teamCountBadge = playerData.teamCount > 1 
            ? ` <span class="badge bg-info" title="This player is on ${playerData.teamCount} teams">${playerData.teamCount} teams</span>` 
            : '';
        row.innerHTML = `
            <td><strong>${player.name}${player.isCaptain ? ' (Captain)' : ''}${teamCountBadge}</strong></td>
            <td>${team.teamName}</td>
            <td>${team.division}</td>
            <td>${player.email || '-'}</td>
            <td>${player.phone || '-'}</td>
            <td>
                <span class="badge ${isSanctionPaid ? 'bg-success' : (player.previouslySanctioned ? 'bg-info' : 'bg-warning')}">
                    ${isSanctionPaid ? 'Paid' : (player.previouslySanctioned ? 'Previously' : 'Pending')}
                </span>
            </td>
            <td>
                <span class="badge ${player.previouslySanctioned ? 'bg-info' : 'bg-secondary'}">
                    ${player.previouslySanctioned ? 'Yes' : 'No'}
                </span>
            </td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm ${isSanctionPaid ? 'btn-success' : 'btn-outline-success'} sanction-btn" 
                            data-team-id="${team._id}" 
                            data-player-name="${player.name.replace(/"/g, '&quot;')}" 
                            data-current-status="${isSanctionPaid ? 'true' : 'false'}" 
                            data-is-captain="${player.isCaptain ? 'true' : 'false'}"
                            title="${isSanctionPaid ? 'Click to mark as unpaid' : 'Click to mark as paid'}">
                        <i class="fas fa-${isSanctionPaid ? 'check' : 'dollar-sign'}"></i>
                        ${isSanctionPaid ? 'Paid' : 'Mark Paid'}
                    </button>
                    <button class="btn btn-sm ${player.previouslySanctioned ? 'btn-info' : 'btn-outline-info'} previously-btn" 
                            data-team-id="${team._id}" 
                            data-player-name="${player.name.replace(/"/g, '&quot;')}" 
                            data-current-status="${player.previouslySanctioned ? 'true' : 'false'}" 
                            data-is-captain="${player.isCaptain ? 'true' : 'false'}"
                            title="${player.previouslySanctioned ? 'Click to mark as not previously sanctioned' : 'Click to mark as previously sanctioned (no fee owed)'}">
                        <i class="fas fa-${player.previouslySanctioned ? 'history' : 'user-check'}"></i>
                        ${player.previouslySanctioned ? 'Previously' : 'Mark Previously'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners for the buttons
    document.querySelectorAll('.sanction-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const teamId = this.dataset.teamId;
            const playerName = this.dataset.playerName;
            const currentStatus = this.dataset.currentStatus === 'true';
            const isCaptain = this.dataset.isCaptain === 'true';
            toggleSanctionStatus(teamId, playerName, currentStatus, isCaptain);
        });
    });
    
    document.querySelectorAll('.previously-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const teamId = this.dataset.teamId;
            // Decode HTML entities (browser does this automatically for data attributes, but be explicit)
            let playerName = this.dataset.playerName;
            if (playerName) {
                // Decode HTML entities if any
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = playerName;
                playerName = tempDiv.textContent || tempDiv.innerText || playerName;
            }
            const currentStatus = this.dataset.currentStatus === 'true';
            const isCaptain = this.dataset.isCaptain === 'true';
            
            console.log('Previously button clicked:', { teamId, playerName, currentStatus, isCaptain });
            togglePreviouslySanctioned(teamId, playerName, currentStatus, isCaptain);
        });
    });
}

function sortPlayersTable(column, toggleDirection = true) {
    // Toggle sort direction if clicking the same column, otherwise default to ascending
    if (toggleDirection) {
        if (currentPlayersSortColumn === column) {
            currentPlayersSortDirection = currentPlayersSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentPlayersSortColumn = column;
            currentPlayersSortDirection = 'asc';
        }
    }
    
    // Get filtered players (apply division/status/search filters first)
    let playersToSort = [...allPlayersData];
    
    // Apply filters
    const divisionFilter = document.getElementById('playersDivisionFilter')?.value || 'all';
    const statusFilter = document.getElementById('playersStatusFilter')?.value || 'all';
    const searchTerm = (document.getElementById('playersSearch')?.value || '').toLowerCase();
    
    playersToSort = playersToSort.filter(playerData => {
        // Division filter
        if (divisionFilter !== 'all' && playerData.division !== divisionFilter) {
            return false;
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'paid' && !playerData.isSanctionPaid) {
                return false;
            } else if (statusFilter === 'pending' && (playerData.isSanctionPaid || playerData.previouslySanctioned)) {
                return false;
            } else if (statusFilter === 'previously' && !playerData.previouslySanctioned) {
                return false;
            }
        }
        
        // Search filter
        if (searchTerm && !playerData.playerName.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        return true;
    });
    
    // Sort the players based on the selected column
    playersToSort.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
            case 'playerName':
                aValue = a.playerName || '';
                bValue = b.playerName || '';
                break;
            case 'teamName':
                aValue = a.teamName || '';
                bValue = b.teamName || '';
                break;
            case 'division':
                aValue = a.division || '';
                bValue = b.division || '';
                break;
            case 'email':
                aValue = a.email || '';
                bValue = b.email || '';
                break;
            case 'phone':
                aValue = a.phone || '';
                bValue = b.phone || '';
                break;
            case 'sanctionStatus': {
                // Sort by status: Pending (0) -> Previously (1) -> Paid (2)
                const getStatusRank = (playerData) => {
                    if (playerData.isSanctionPaid) {
                        return 2; // Paid
                    } else if (playerData.previouslySanctioned) {
                        return 1; // Previously
                    } else {
                        return 0; // Pending
                    }
                };
                aValue = getStatusRank(a);
                bValue = getStatusRank(b);
                
                // If same status, sort by player name
                if (aValue === bValue) {
                    aValue = a.playerName || '';
                    bValue = b.playerName || '';
                }
                break;
            }
            case 'previouslySanctioned': {
                // Sort by previously sanctioned: No (0) -> Yes (1)
                aValue = a.previouslySanctioned ? 1 : 0;
                bValue = b.previouslySanctioned ? 1 : 0;
                
                // If same, sort by player name
                if (aValue === bValue) {
                    aValue = a.playerName || '';
                    bValue = b.playerName || '';
                }
                break;
            }
            default:
                aValue = a.playerName || '';
                bValue = b.playerName || '';
        }
        
        // Compare values
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else {
            comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return currentPlayersSortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Update sort icons
    updatePlayersSortIcons(column);
    
    // Render the sorted players
    renderPlayersTable(playersToSort);
    
    // Update summary cards based on filtered/sorted data
    updatePlayersSummaryCards(playersToSort);
}

function updatePlayersSortIcons(activeColumn) {
    // Reset all sort icons in players table
    const sortIcons = document.querySelectorAll('#playersTable .sort-icon');
    sortIcons.forEach(icon => {
        icon.className = 'fas fa-sort sort-icon';
    });
    
    // Update active column icon
    const activeIcon = document.getElementById(`players-sort-icon-${activeColumn}`);
    if (activeIcon) {
        if (currentPlayersSortDirection === 'asc') {
            activeIcon.className = 'fas fa-sort-up sort-icon';
        } else {
            activeIcon.className = 'fas fa-sort-down sort-icon';
        }
    }
}

function filterPlayersTable() {
    // Re-apply sorting with current filters (sortPlayersTable handles filtering internally)
    if (currentPlayersSortColumn) {
        sortPlayersTable(currentPlayersSortColumn, false); // false = don't toggle, just re-apply sort with filters
    } else {
        // No sort, just apply filters and render
        const divisionFilter = document.getElementById('playersDivisionFilter')?.value || 'all';
        const statusFilter = document.getElementById('playersStatusFilter')?.value || 'all';
        const searchTerm = (document.getElementById('playersSearch')?.value || '').toLowerCase();
        
        let filteredPlayers = allPlayersData.filter(playerData => {
            // Division filter
            if (divisionFilter !== 'all' && playerData.division !== divisionFilter) {
                return false;
            }
            
            // Status filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'paid' && !playerData.isSanctionPaid) {
                    return false;
                } else if (statusFilter === 'pending' && (playerData.isSanctionPaid || playerData.previouslySanctioned)) {
                    return false;
                } else if (statusFilter === 'previously' && !playerData.previouslySanctioned) {
                    return false;
                }
            }
            
            // Search filter
            if (searchTerm && !playerData.playerName.toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            return true;
        });
        
        renderPlayersTable(filteredPlayers);
        
        // Update summary cards based on filtered data
        updatePlayersSummaryCards(filteredPlayers);
    }
}

function updatePlayersSummaryCards(playersData) {
    let totalPlayers = playersData.length;
    let sanctionPaid = 0;
    let sanctionPending = 0;
    let previouslySanctioned = 0;
    let totalCollected = 0;
    
    playersData.forEach(playerData => {
        if (playerData.isSanctionPaid) {
            sanctionPaid++;
            if (!playerData.previouslySanctioned) {
                totalCollected += sanctionFeeAmount;
            }
        } else if (playerData.previouslySanctioned) {
            previouslySanctioned++;
        } else {
            sanctionPending++;
        }
    });
    
    document.getElementById('totalPlayersCount').textContent = totalPlayers;
    document.getElementById('sanctionPaidCount').textContent = sanctionPaid;
    document.getElementById('sanctionPendingCount').textContent = sanctionPending;
    document.getElementById('previouslySanctionedCount').textContent = previouslySanctioned;
    document.getElementById('sanctionFeesCollected').textContent = formatCurrency(totalCollected);
}

async function toggleSanctionStatus(teamId, playerName, currentStatus, isCaptain) {
    // Normalize the player name
    const normalizedPlayerName = playerName.trim();
    const newStatus = !currentStatus;
    
    console.log('toggleSanctionStatus called:', { teamId, playerName: normalizedPlayerName, currentStatus, newStatus, isCaptain });
    
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found:', teamId);
            alert('Team not found');
            return;
        }
        
        // Update player status globally (across all teams) using the new API endpoint
        const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(normalizedPlayerName)}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                bcaSanctionPaid: newStatus,
                email: isCaptain ? (team.captainEmail || '') : undefined,
                phone: isCaptain ? (team.captainPhone || '') : undefined
            })
        });
        
        if (!globalUpdateResponse.ok) {
            console.error('Failed to update global player status, falling back to team-specific update');
            // Fall back to team-specific update if global update fails
            if (isCaptain) {
                let member = team.teamMembers.find(m => m.name === normalizedPlayerName);
                if (!member) {
                    team.teamMembers.push({
                        name: normalizedPlayerName,
                        email: team.captainEmail || '',
                        phone: team.captainPhone || '',
                        bcaSanctionPaid: newStatus
                    });
                } else {
                    member.bcaSanctionPaid = newStatus;
                }
            } else {
                const member = team.teamMembers.find(m => m.name === normalizedPlayerName);
                if (!member) {
                    console.error('Team member not found:', normalizedPlayerName);
                    alert(`Player "${normalizedPlayerName}" not found in team members.`);
                    return;
                }
                member.bcaSanctionPaid = newStatus;
            }
            
            // Update the team in the database (team-specific only)
            const response = await apiCall(`/teams/${teamId}`, {
                method: 'PUT',
                body: JSON.stringify(team)
            });
            
            if (!response.ok) {
                alert('Failed to update sanction status');
                return;
            }
        } else {
            console.log('Global player status updated successfully');
        }
        
        // Reload data to get updated status across all teams
        await loadData();
        
        // Preserve current filters
        const currentDivisionFilter = document.getElementById('playersDivisionFilter')?.value || 'all';
        const currentStatusFilter = document.getElementById('playersStatusFilter')?.value || 'all';
        const currentSearch = document.getElementById('playersSearch')?.value || '';
        const currentSortCol = currentPlayersSortColumn;
        const currentSortDir = currentPlayersSortDirection;
        
        // Re-populate the players table
        populatePlayersTable();
        
        // Restore filters and sort
        if (currentDivisionFilter && currentDivisionFilter !== 'all') {
            const filterEl = document.getElementById('playersDivisionFilter');
            if (filterEl) filterEl.value = currentDivisionFilter;
        }
        if (currentStatusFilter && currentStatusFilter !== 'all') {
            const statusFilterEl = document.getElementById('playersStatusFilter');
            if (statusFilterEl) statusFilterEl.value = currentStatusFilter;
        }
        if (currentSearch) {
            const searchEl = document.getElementById('playersSearch');
            if (searchEl) searchEl.value = currentSearch;
        }
        
        // Re-apply filters and sort
        if (currentSortCol) {
            currentPlayersSortColumn = currentSortCol;
            currentPlayersSortDirection = currentSortDir;
            sortPlayersTable(currentSortCol, false);
        } else {
            filterPlayersTable();
        }
    } catch (error) {
        console.error('Error updating sanction status:', error);
        alert('Error updating sanction status');
    }
}

async function togglePreviouslySanctioned(teamId, playerName, currentStatus, isCaptain) {
    // Normalize the player name (trim whitespace, handle HTML entities)
    const normalizedPlayerName = playerName.trim();
    
    console.log('togglePreviouslySanctioned called:', { teamId, playerName: normalizedPlayerName, currentStatus, isCaptain });
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found:', teamId);
            alert('Team not found');
            return;
        }
        console.log('Found team:', team.teamName);
        console.log('All team members:', team.teamMembers.map(m => ({ name: m.name, previouslySanctioned: m.previouslySanctioned })));
        
        // Helper function to find member by name (with normalization)
        const findMemberByName = (name) => {
            const normalized = name.trim();
            return team.teamMembers.find(m => {
                const memberName = (m.name || '').trim();
                return memberName === normalized;
            });
        };
        
        let member = null;
        
        if (isCaptain) {
            // For captains, find them in teamMembers and update their status
            console.log('Processing captain:', normalizedPlayerName);
            member = findMemberByName(normalizedPlayerName);
            
            if (!member) {
                console.log('Captain not found in teamMembers, adding them');
                // Add captain as a team member if they're not already there
                member = {
                    name: normalizedPlayerName,
                    email: team.captainEmail || '',
                    phone: team.captainPhone || '',
                    bcaSanctionPaid: false,
                    previouslySanctioned: false
                };
                team.teamMembers.push(member);
            }
        } else {
            // Regular team member
            console.log('Looking for member:', normalizedPlayerName);
            member = findMemberByName(normalizedPlayerName);
            
            if (!member) {
                console.error('Member not found:', normalizedPlayerName);
                console.error('Available members:', team.teamMembers.map(m => m.name));
                alert(`Player "${normalizedPlayerName}" not found in team members.`);
                return;
            }
        }
        
        console.log('Found member:', member.name, 'current status:', member.previouslySanctioned);
        
        // Toggle the previously sanctioned status
        const newStatus = !currentStatus;
        member.previouslySanctioned = newStatus;
        console.log('Updated member status to:', member.previouslySanctioned);
        
        // Verify the update was applied correctly
        const verifyMember = findMemberByName(normalizedPlayerName);
        if (!verifyMember || verifyMember.previouslySanctioned !== newStatus) {
            console.error('Failed to update member status. Verification failed.');
            alert('Failed to update player status. Please try again.');
            return;
        }
        
        // Create a clean copy of the team data to send (to avoid any reference issues)
        const teamUpdateData = {
            ...team,
            teamMembers: team.teamMembers.map(m => ({
                ...m
            }))
        };
        
        console.log('Sending team update. Member being updated:', normalizedPlayerName, 'New status:', newStatus);
        console.log('All members after update:', teamUpdateData.teamMembers.map(m => ({ 
            name: m.name, 
            previouslySanctioned: m.previouslySanctioned,
            bcaSanctionPaid: m.bcaSanctionPaid
        })));
        console.log('Full team update data:', JSON.stringify(teamUpdateData, null, 2));
        
        // Update player status globally (across all teams) using the new API endpoint
        const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(normalizedPlayerName)}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                previouslySanctioned: newStatus
            })
        });
        
        if (!globalUpdateResponse.ok) {
            console.error('Failed to update global player status, falling back to team-specific update');
            // Fall back to team-specific update if global update fails
        } else {
            console.log('Global player status updated successfully');
            // Reload data to get updated status across all teams
            await loadData();
            
            // Preserve current filters and sort
            const currentDivisionFilter = document.getElementById('playersDivisionFilter')?.value || 'all';
            const currentStatusFilter = document.getElementById('playersStatusFilter')?.value || 'all';
            const currentSearch = document.getElementById('playersSearch')?.value || '';
            const currentSortCol = currentPlayersSortColumn;
            const currentSortDir = currentPlayersSortDirection;
            
            // Re-populate the players table
            populatePlayersTable();
            
            // Restore filters and sort
            if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                const filterEl = document.getElementById('playersDivisionFilter');
                if (filterEl) filterEl.value = currentDivisionFilter;
            }
            if (currentStatusFilter && currentStatusFilter !== 'all') {
                const statusFilterEl = document.getElementById('playersStatusFilter');
                if (statusFilterEl) statusFilterEl.value = currentStatusFilter;
            }
            if (currentSearch) {
                const searchEl = document.getElementById('playersSearch');
                if (searchEl) searchEl.value = currentSearch;
            }
            
            // Re-apply filters and sort
            if (currentSortCol) {
                currentPlayersSortColumn = currentSortCol;
                currentPlayersSortDirection = currentSortDir;
                sortPlayersTable(currentSortCol, false);
            } else {
                filterPlayersTable();
            }
            
            return; // Exit early if global update succeeded
        }
        
        // Fallback: Update the team in the database (team-specific only)
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        console.log('Response status:', response.status, response.ok);
        
        if (response.ok) {
            const responseData = await response.json();
            console.log('Update successful. Server response:', responseData);
            
            // Update the local teams array with the response data
            const teamIndex = teams.findIndex(t => t._id === teamId);
            if (teamIndex >= 0) {
                teams[teamIndex] = responseData;
                console.log('Updated local team data:', teams[teamIndex]);
            }
            
            // Preserve current filters and sort
            const currentDivisionFilter = document.getElementById('playersDivisionFilter')?.value || 'all';
            const currentStatusFilter = document.getElementById('playersStatusFilter')?.value || 'all';
            const currentSearch = document.getElementById('playersSearch')?.value || '';
            const currentSortCol = currentPlayersSortColumn;
            const currentSortDir = currentPlayersSortDirection;
            
            // Update the allPlayersData array immediately with the new status (before repopulating)
            const playerDataIndex = allPlayersData.findIndex(pd => 
                pd.team._id === teamId && pd.playerName === normalizedPlayerName
            );
            if (playerDataIndex >= 0) {
                allPlayersData[playerDataIndex].previouslySanctioned = newStatus;
                allPlayersData[playerDataIndex].player.previouslySanctioned = newStatus;
                console.log('Updated allPlayersData for:', normalizedPlayerName, 'to:', newStatus);
            }
            
            // Re-populate the players table immediately with updated data
            // This will rebuild allPlayersData from teams, but we've already updated teams above
            populatePlayersTable();
            
            // Restore filters and sort
            if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                const filterEl = document.getElementById('playersDivisionFilter');
                if (filterEl) {
                    filterEl.value = currentDivisionFilter;
                }
            }
            if (currentStatusFilter && currentStatusFilter !== 'all') {
                const statusFilterEl = document.getElementById('playersStatusFilter');
                if (statusFilterEl) {
                    statusFilterEl.value = currentStatusFilter;
                }
            }
            if (currentSearch) {
                const searchEl = document.getElementById('playersSearch');
                if (searchEl) {
                    searchEl.value = currentSearch;
                }
            }
            
            // Re-apply filters and sort
            if (currentSortCol) {
                currentPlayersSortColumn = currentSortCol;
                currentPlayersSortDirection = currentSortDir;
                sortPlayersTable(currentSortCol, false);
            } else {
                filterPlayersTable();
            }
            
            // Also refresh main data in background (but don't wait for it)
            loadData().catch(err => {
                console.error('Background data refresh failed:', err);
            });
        } else {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Failed to update:', error);
            console.error('Response status:', response.status);
            console.error('Response text:', await response.text().catch(() => 'Could not read response'));
            alert(`Failed to update previously sanctioned status: ${error.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error updating previously sanctioned status:', error);
        alert('Error updating previously sanctioned status');
    }
}

function showPaymentHistory(teamId) {
    const team = teams.find(t => t._id === teamId);
    if (!team) return;
    
    const teamDivision = divisions.find(d => d.name === team.division);
    if (!teamDivision) return;
    
    // Populate team info
    document.getElementById('paymentHistoryTeamName').textContent = team.teamName;
    document.getElementById('paymentHistoryDivision').textContent = team.division;
    document.getElementById('paymentHistoryDuesRate').textContent = team.divisionDuesRate;
    document.getElementById('paymentHistoryTotalWeeks').textContent = teamDivision.totalWeeks;
    
    // Calculate weekly dues using playersPerWeek from division settings
    // Formula: dues per player × players per week × (single play = 5, double play = 2 multiplier)
    // Parse as integer to ensure correct calculation
    const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5; // Parse as integer, default to 5 if not set
    // Single play: dues × players × 1, Double play: dues × players × 2
    const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
    const weeklyDues = (parseFloat(team.divisionDuesRate) || 0) * playersPerWeek * doublePlayMultiplier;
    document.getElementById('paymentHistoryWeeklyDues').textContent = formatCurrency(weeklyDues);
    
    // Populate payment history table
    const tbody = document.getElementById('paymentHistoryTable');
    tbody.innerHTML = '';
    
    let totalPaid = 0;
    let weeksPaid = 0;
    
    // Calculate actual current week for this team's division
    let actualCurrentWeek = 1;
    if (teamDivision.startDate) {
        const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        const today = new Date();
        const timeDiff = today.getTime() - startDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        actualCurrentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
        
        // Grace period: teams have 3 days after week ends before being considered late
        const daysIntoCurrentWeek = daysDiff % 7;
        const gracePeriodDays = 3;
        if (daysIntoCurrentWeek <= gracePeriodDays) {
            actualCurrentWeek = Math.max(1, actualCurrentWeek - 1);
        }
    }
    
    // Show all weeks up to the division's total weeks
    for (let week = 1; week <= teamDivision.totalWeeks; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        const isPaid = weekPayment && weekPayment.paid === 'true';
        const isBye = weekPayment && weekPayment.paid === 'bye';
        const isMakeup = weekPayment && weekPayment.paid === 'makeup';
        
        // Calculate week date
        let weekDate = '-';
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            const weekStartDate = new Date(startDate);
            weekStartDate.setDate(startDate.getDate() + (week - 1) * 7);
            // Format date without timezone conversion (use local date components)
            const monthNum = weekStartDate.getMonth() + 1; // getMonth() is 0-indexed
            const dayNum = weekStartDate.getDate();
            const yearNum = weekStartDate.getFullYear();
            weekDate = `${monthNum}/${dayNum}/${yearNum}`;
        }
        
        if (isPaid) {
            totalPaid += weekPayment.amount || 0;
            weeksPaid++;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><small>${week}</small></td>
            <td><small>${weekDate}</small></td>
            <td>
                <span class="badge bg-${isPaid ? 'success' : isBye ? 'info' : isMakeup ? 'warning' : 'danger'} badge-sm">
                    <i class="fas fa-${isPaid ? 'check' : isBye ? 'pause' : isMakeup ? 'clock' : 'times'}"></i>
                </span>
            </td>
            <td><small>${isPaid ? `$${weekPayment.amount || 0}` : `$${weeklyDues}`}</small></td>
            <td><small>${isPaid ? (weekPayment.paymentMethod || '-') : '-'}</small></td>
            <td><small>${isPaid && weekPayment.paymentDate ? formatDateFromISO(weekPayment.paymentDate) : '-'}</small></td>
            <td><small>${isPaid ? (weekPayment.notes || '-') : '-'}</small></td>
            <td>
                <button class="btn btn-outline-primary btn-sm" onclick="openPaymentModalFromHistory('${team._id}', ${week})" title="Edit Payment">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
    
    // Update summary
    document.getElementById('paymentHistoryTotalPaid').textContent = formatCurrency(totalPaid);
    document.getElementById('paymentHistoryWeeksPaid').textContent = weeksPaid;
    
    // Calculate status
    let isCurrent = true;
    for (let week = 1; week <= actualCurrentWeek; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
            isCurrent = false;
            break;
        }
    }
    
    const statusBadge = document.getElementById('paymentHistoryStatus');
    statusBadge.textContent = isCurrent ? 'Current' : 'Behind';
    statusBadge.className = `badge bg-${isCurrent ? 'success' : 'danger'}`;
    
    new bootstrap.Modal(document.getElementById('paymentHistoryModal')).show();
}

function openPaymentModalFromHistory(teamId, week) {
    // Get the payment history modal instance
    const paymentHistoryModalElement = document.getElementById('paymentHistoryModal');
    const paymentHistoryModal = bootstrap.Modal.getInstance(paymentHistoryModalElement);
    
    if (paymentHistoryModal) {
        // Hide the payment history modal first
        paymentHistoryModal.hide();
        
        // Wait for the modal to be fully hidden before opening the weekly payment modal
        paymentHistoryModalElement.addEventListener('hidden.bs.modal', function openWeeklyModal() {
            // Remove this event listener so it doesn't fire again
            paymentHistoryModalElement.removeEventListener('hidden.bs.modal', openWeeklyModal);
            
            // Now open the weekly payment modal
            showWeeklyPaymentModal(teamId, week);
        }, { once: true });
    } else {
        // If modal instance doesn't exist, just open the weekly payment modal directly
        showWeeklyPaymentModal(teamId, week);
    }
}

async function saveWeeklyPayment() {
    const paid = document.querySelector('input[name="weeklyPaid"]:checked').value;
    const paymentMethod = document.getElementById('weeklyPaymentMethod').value;
    const paymentDateInput = document.getElementById('weeklyPaymentDate');
    const paymentDate = paymentDateInput ? paymentDateInput.value : null; // Get date from input
    const amountSelect = document.getElementById('weeklyPaymentAmount');
    const amountRaw = amountSelect ? amountSelect.value : '';
    
    // If marked as paid, require a dues amount
    if (paid === 'true') {
        if (!amountRaw || isNaN(parseFloat(amountRaw)) || parseFloat(amountRaw) <= 0) {
            alert('Please select the dues amount paid for this week.');
            if (amountSelect) {
                amountSelect.focus();
            }
            return;
        }
    }
    
    const amount = parseFloat(amountRaw || '0') || 0;
    const notes = document.getElementById('weeklyPaymentNotes').value;
    
    console.log('💾 Saving weekly payment - paymentDate:', paymentDate, 'paid:', paid);
    
    // Collect selected sanction fee players
    const selectedBCAPlayers = [];
    const bcaCheckboxes = document.querySelectorAll('input[name="bcaSanctionPlayer"]:checked');
    bcaCheckboxes.forEach(checkbox => {
        selectedBCAPlayers.push(checkbox.value);
    });
    
    // Collect individual player payments
    const individualPayments = [];
    const individualPaymentInputs = document.querySelectorAll('input[name="individualPayment"]');
    individualPaymentInputs.forEach(input => {
        const playerName = input.dataset.player;
        const paymentAmount = parseFloat(input.value) || 0;
        if (paymentAmount > 0 && playerName) {
            individualPayments.push({
                playerName: playerName,
                amount: paymentAmount
            });
        }
    });
    
    try {
        const response = await apiCall(`/teams/${currentWeeklyPaymentTeamId}/weekly-payment`, {
            method: 'POST',
            body: JSON.stringify({
                week: currentWeeklyPaymentWeek,
                paid,
                paymentMethod,
                paymentDate: paymentDate || null, // Send payment date if provided, otherwise null (backend will handle)
                amount,
                notes,
                bcaSanctionPlayers: selectedBCAPlayers,
                individualPayments: individualPayments.length > 0 ? individualPayments : undefined
            })
        });
        
        if (response.ok) {
            // Update global player status for players marked as paid in this payment
            if (paid === 'true' && selectedBCAPlayers && selectedBCAPlayers.length > 0) {
                for (const playerName of selectedBCAPlayers) {
                    try {
                        await apiCall(`/players/${encodeURIComponent(playerName.trim())}/status`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                bcaSanctionPaid: true
                            })
                        });
                    } catch (error) {
                        console.warn(`Failed to update global status for player "${playerName}":`, error);
                    }
                }
            }
            
            // Show success message in modal
            const successDiv = document.getElementById('weeklyPaymentSuccess');
            const successMessage = document.getElementById('weeklyPaymentSuccessMessage');
            const form = document.getElementById('weeklyPaymentForm');
            
            // Hide the form and show success message
            form.style.display = 'none';
            successDiv.classList.remove('d-none');
            successMessage.textContent = 'Weekly payment updated successfully!';
            
            // Hide the footer buttons when showing success message
            const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
            if (modalFooter) {
                modalFooter.style.display = 'none';
            }
            
            // Also disable and hide any remaining visible buttons to prevent double-clicks
            const saveButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-primary');
            const cancelButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-secondary');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.style.display = 'none';
            }
            if (cancelButton) {
                cancelButton.style.display = 'none';
            }
            
            // Preserve current division filter before reloading data
            const currentDivisionFilter = document.getElementById('divisionFilter').value;
            
            loadData().then(() => {
                // Restore the division filter after data is reloaded
                if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                    document.getElementById('divisionFilter').value = currentDivisionFilter;
                    filterTeamsByDivision();
                }
            });
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating weekly payment');
        }
    } catch (error) {
        alert('Error updating weekly payment. Please try again.');
    }
}

// Profile & Settings Functions
async function showProfileModal() {
    try {
        // Load current profile data
        const response = await apiCall('/profile');
        if (!response.ok) {
            throw new Error('Failed to load profile');
        }
        
        const data = await response.json();
        const operator = data.operator || currentOperator;
        
        if (operator) {
            // Populate form fields
            document.getElementById('profileName').value = operator.name || '';
            document.getElementById('profileEmail').value = operator.email || '';
            document.getElementById('profileOrganizationName').value = operator.organization_name || '';
            document.getElementById('profilePhone').value = operator.phone || '';

            // Theme toggle (local setting)
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.checked = getEffectiveTheme() === 'dark';
            }
            
            // Populate sanction fee toggle and fields
            const sanctionFeesEnabledEl = document.getElementById('profileSanctionFeesEnabled');
            if (sanctionFeesEnabledEl) {
                // If sanction_fees_enabled is explicitly set, use it
                // Otherwise, default to true if sanction_fee_amount is set (backward compatibility)
                let isEnabled = false;
                if (operator.sanction_fees_enabled !== undefined && operator.sanction_fees_enabled !== null) {
                    isEnabled = operator.sanction_fees_enabled === true || operator.sanction_fees_enabled === 'true';
                } else {
                    // Backward compatibility: if they have a sanction fee amount set, default to enabled
                    const hasAmount = operator.sanction_fee_amount && parseFloat(operator.sanction_fee_amount) > 0;
                    isEnabled = hasAmount;
                }
                sanctionFeesEnabledEl.checked = isEnabled;
                // Add event listener to toggle visibility of sanction fee settings
                // Remove any existing listeners first
                const newToggle = sanctionFeesEnabledEl.cloneNode(true);
                sanctionFeesEnabledEl.parentNode.replaceChild(newToggle, sanctionFeesEnabledEl);
                
                const updatedToggle = document.getElementById('profileSanctionFeesEnabled');
                updatedToggle.addEventListener('change', function() {
                    const container = document.getElementById('sanctionFeeSettingsContainer');
                    if (container) {
                        container.style.display = this.checked ? '' : 'none';
                    }
                    // Also update the global UI visibility - checked means enabled, so show UI
                    const isEnabled = this.checked;
                    sanctionFeesEnabled = isEnabled;
                    toggleSanctionFeeUI(isEnabled);
                });
                // Set initial visibility
                const container = document.getElementById('sanctionFeeSettingsContainer');
                if (container) {
                    container.style.display = updatedToggle.checked ? '' : 'none';
                }
                // Set initial UI visibility - checked means enabled, so show UI
                const initialEnabled = updatedToggle.checked;
                sanctionFeesEnabled = initialEnabled;
                toggleSanctionFeeUI(initialEnabled);
            }
            
            const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
            const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
            const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
            if (sanctionFeeNameEl) sanctionFeeNameEl.value = operator.sanction_fee_name || 'Sanction Fee';
            if (sanctionFeeAmountEl) sanctionFeeAmountEl.value = operator.sanction_fee_amount || 25.00;
            if (sanctionFeePayoutAmountEl) sanctionFeePayoutAmountEl.value = operator.sanction_fee_payout_amount || 20.00;
            
            // Set calculation method (percentage or dollar amount)
            const useDollarAmountsValue = operator.use_dollar_amounts || operator.useDollarAmounts || false;
            const methodPercentageRadio = document.getElementById('methodPercentage');
            const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
            if (methodPercentageRadio && methodDollarAmountRadio) {
                if (useDollarAmountsValue) {
                    methodDollarAmountRadio.checked = true;
                } else {
                    methodPercentageRadio.checked = true;
                }
                toggleCalculationMethod(); // This will show/hide the appropriate inputs
            }
            
            // Populate financial breakdown fields (with backward compatibility)
            const prizeFundNameEl = document.getElementById('profilePrizeFundName');
            const prizeFundPercentEl = document.getElementById('profilePrizeFundPercentage');
            const prizeFundAmountEl = document.getElementById('profilePrizeFundAmount');
            const prizeFundPerTeamRadio = document.getElementById('prizeFundPerTeam');
            const prizeFundPerPlayerRadio = document.getElementById('prizeFundPerPlayer');
            
            const firstOrgNameEl = document.getElementById('profileFirstOrganizationName');
            const firstOrgNameDollarEl = document.getElementById('profileFirstOrganizationNameDollar');
            const firstOrgPercentEl = document.getElementById('profileFirstOrganizationPercentage');
            const firstOrgAmountEl = document.getElementById('profileFirstOrganizationAmount');
            const firstOrgPerTeamRadio = document.getElementById('firstOrgPerTeam');
            const firstOrgPerPlayerRadio = document.getElementById('firstOrgPerPlayer');
            
            const secondOrgNameEl = document.getElementById('profileSecondOrganizationName');
            const secondOrgNameDollarEl = document.getElementById('profileSecondOrganizationNameDollar');
            const secondOrgPercentEl = document.getElementById('profileSecondOrganizationPercentage');
            const secondOrgAmountEl = document.getElementById('profileSecondOrganizationAmount');
            const secondOrgPerTeamRadio = document.getElementById('secondOrgPerTeam');
            const secondOrgPerPlayerRadio = document.getElementById('secondOrgPerPlayer');
            
            // Support both new and old field names for backward compatibility
            if (prizeFundNameEl) prizeFundNameEl.value = operator.prize_fund_name || operator.prizeFundName || 'Prize Fund';
            if (prizeFundPercentEl) prizeFundPercentEl.value = operator.prize_fund_percentage || operator.prizeFundPercentage || 50.0;
            if (prizeFundAmountEl) prizeFundAmountEl.value = operator.prize_fund_amount || operator.prizeFundAmount || '';
            const prizeFundAmountType = operator.prize_fund_amount_type || operator.prizeFundAmountType || 'perTeam';
            if (prizeFundAmountType === 'perPlayer' && prizeFundPerPlayerRadio) {
                prizeFundPerPlayerRadio.checked = true;
            } else if (prizeFundPerTeamRadio) {
                prizeFundPerTeamRadio.checked = true;
            }
            
            const firstOrgNameValue = operator.first_organization_name || operator.firstOrganizationName || 
                                      operator.league_manager_name || 'League Manager';
            if (firstOrgNameEl) firstOrgNameEl.value = firstOrgNameValue;
            if (firstOrgNameDollarEl) firstOrgNameDollarEl.value = firstOrgNameValue;
            
            if (firstOrgPercentEl) firstOrgPercentEl.value = operator.first_organization_percentage || 
                                                             operator.league_manager_percentage || operator.leagueManagerPercentage || 60.0;
            if (firstOrgAmountEl) firstOrgAmountEl.value = operator.first_organization_amount || operator.firstOrganizationAmount || '';
            const firstOrgAmountType = operator.first_organization_amount_type || operator.firstOrganizationAmountType || 'perTeam';
            if (firstOrgAmountType === 'perPlayer' && firstOrgPerPlayerRadio) {
                firstOrgPerPlayerRadio.checked = true;
            } else if (firstOrgPerTeamRadio) {
                firstOrgPerTeamRadio.checked = true;
            }
            
            const secondOrgNameValue = operator.second_organization_name || operator.secondOrganizationName || 
                                      operator.usa_pool_league_name || 'Parent/National Organization';
            if (secondOrgNameEl) secondOrgNameEl.value = secondOrgNameValue;
            if (secondOrgNameDollarEl) secondOrgNameDollarEl.value = secondOrgNameValue;
            if (secondOrgPercentEl) secondOrgPercentEl.value = operator.second_organization_percentage || 
                                                               operator.usa_pool_league_percentage || operator.usaPoolLeaguePercentage || 40.0;
            if (secondOrgAmountEl) secondOrgAmountEl.value = operator.second_organization_amount || operator.secondOrganizationAmount || '';
            const secondOrgAmountType = operator.second_organization_amount_type || operator.secondOrganizationAmountType || 'perTeam';
            if (secondOrgAmountType === 'perPlayer' && secondOrgPerPlayerRadio) {
                secondOrgPerPlayerRadio.checked = true;
            } else if (secondOrgPerTeamRadio) {
                secondOrgPerTeamRadio.checked = true;
            }
            
            // Update dynamic labels
            updateFinancialBreakdownFormLabels();
            
            // Update profit display and add event listeners for real-time calculation
            updateSanctionFeeProfitDisplay();
            if (sanctionFeeAmountEl) {
                sanctionFeeAmountEl.removeEventListener('input', updateSanctionFeeProfitDisplay);
                sanctionFeeAmountEl.addEventListener('input', updateSanctionFeeProfitDisplay);
            }
            if (sanctionFeePayoutAmountEl) {
                sanctionFeePayoutAmountEl.removeEventListener('input', updateSanctionFeeProfitDisplay);
                sanctionFeePayoutAmountEl.addEventListener('input', updateSanctionFeeProfitDisplay);
            }
            
            // Hide error/success messages
            document.getElementById('profileError').classList.add('hidden');
            document.getElementById('profileSuccess').classList.add('hidden');
        }
        
        // Load subscription information (don't wait, load in background)
        loadSubscriptionInfo(data).catch(err => {
            console.error('Failed to load subscription info in background:', err);
        });
        
        // Show modal and activate first tab
        const modal = new bootstrap.Modal(document.getElementById('profileModal'));
        modal.show();
        
        // Ensure first tab is active
        const firstTab = document.getElementById('profile-tab');
        if (firstTab) {
            const tab = new bootstrap.Tab(firstTab);
            tab.show();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Still show modal, but with current data if available
        if (currentOperator) {
            document.getElementById('profileName').value = currentOperator.name || '';
            document.getElementById('profileEmail').value = currentOperator.email || '';
            document.getElementById('profileOrganizationName').value = currentOperator.organization_name || '';
            document.getElementById('profilePhone').value = currentOperator.phone || '';
            
            const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
            const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
            const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
            if (sanctionFeeNameEl) sanctionFeeNameEl.value = currentOperator.sanction_fee_name || 'Sanction Fee';
            if (sanctionFeeAmountEl) sanctionFeeAmountEl.value = currentOperator.sanction_fee_amount || 25.00;
            if (sanctionFeePayoutAmountEl) sanctionFeePayoutAmountEl.value = currentOperator.sanction_fee_payout_amount || 20.00;
            updateSanctionFeeProfitDisplay();
        }
        // Load subscription information (with fallback, don't wait)
        loadSubscriptionInfo({ operator: currentOperator }).catch(err => {
            console.error('Failed to load subscription info in background:', err);
        });
        
        const modal = new bootstrap.Modal(document.getElementById('profileModal'));
        modal.show();
        
        // Ensure first tab is active
        const firstTab = document.getElementById('profile-tab');
        if (firstTab) {
            const tab = new bootstrap.Tab(firstTab);
            tab.show();
        }
    }
}

// Load and display subscription information
async function loadSubscriptionInfo(profileData) {
    const subscriptionInfoDiv = document.getElementById('subscriptionInfo');
    if (!subscriptionInfoDiv) return;
    
    try {
        // Get subscription plan and usage from profile endpoint
        const response = await apiCall('/profile');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Failed to load subscription info:', errorData);
            throw new Error(errorData.message || 'Failed to load subscription info');
        }
        
        const data = await response.json();
        console.log('Subscription data received:', data);
        
        // Handle case where endpoint returns operator directly or in nested structure
        const operator = data.operator || currentOperator;
        const plan = data.subscriptionPlan || { tier: 'free', name: 'Free', description: 'Basic plan for getting started' };
        const usage = data.usage || { divisions: 0, teams: 0, teamMembers: 0 };
        const limits = data.limits || { divisions: null, teams: null, teamMembers: null };
        const subscriptionStatus = data.subscriptionStatus || {};
        
        // Format limits display
        const formatLimit = (value) => value === null ? 'Unlimited' : value;
        const formatUsage = (used, limit) => {
            if (limit === null) return { text: `${used} / Unlimited`, percentage: 0, colorClass: 'text-success' };
            const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
            const colorClass = percentage >= 90 ? 'text-danger' : percentage >= 70 ? 'text-warning' : 'text-success';
            return { text: `${used} / ${limit}`, percentage, colorClass };
        };
        
        const divisionsUsage = formatUsage(usage.divisions || 0, limits.divisions);
        const teamsUsage = formatUsage(usage.teams || 0, limits.teams);
        const membersUsage = formatUsage(usage.teamMembers || 0, limits.teamMembers);
        
        // Build division breakdown text
        const divisionBreakdown = usage.divisionsBreakdown || {};
        const totalDivisions = (divisionBreakdown.regular || 0) + (divisionBreakdown.doublePlay || 0);
        const divisionBreakdownText = totalDivisions > 0 
          ? `${totalDivisions} total (${divisionBreakdown.regular || 0} regular, ${divisionBreakdown.doublePlay || 0} double play)`
          : '0 divisions';
        
        // Check for trial status
        const isInTrial = subscriptionStatus.isInTrial === true;
        const effectiveTier = subscriptionStatus.effectiveTier || plan.tier;
        const trialEndDate = subscriptionStatus.trialEndDate;
        
        // Build subscription info HTML
        const planBadgeColor = effectiveTier === 'free' ? 'secondary' : 
                              effectiveTier === 'basic' ? 'primary' : 
                              effectiveTier === 'pro' ? 'warning' : 'success';
        
        // Format trial end date
        let trialInfo = '';
        if (isInTrial && trialEndDate) {
            const endDate = new Date(trialEndDate);
            const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
            trialInfo = `
                <div class="alert alert-info mb-0 mt-2">
                    <i class="fas fa-gift me-2"></i>
                    <strong>14-Day Enterprise Trial Active!</strong>
                    ${daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Ending soon'}
                    <br><small>You have unlimited access to all Enterprise features until ${endDate.toLocaleDateString()}</small>
                </div>
            `;
        }
        
        const subscriptionHTML = `
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-${planBadgeColor} text-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-0">
                                <i class="fas fa-${isInTrial ? 'gift' : 'crown'} me-2"></i>
                                ${isInTrial ? 'Enterprise (Trial)' : (plan.name || 'Free')} Plan
                            </h5>
                            <small>${isInTrial ? 'Unlimited access during 14-day trial' : (plan.description || 'Basic plan for getting started')}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${isInTrial ? '<span class="badge bg-info fs-6">TRIAL</span>' : ''}
                            <span class="badge bg-light text-dark fs-6">${effectiveTier.toUpperCase()}</span>
                        </div>
                    </div>
                    ${trialInfo}
                </div>
                <div class="card-body">
                    <h6 class="mb-4">Usage & Limits</h6>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-sitemap text-primary me-2"></i>
                                            <strong>Divisions</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${divisionsUsage.colorClass}">${divisionsUsage.text}</span>
                                        ${divisionsUsage.percentage > 0 ? `<small class="text-muted">(${divisionsUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small class="text-muted">Limit: ${formatLimit(limits.divisions)}</small>
                                    ${totalDivisions > 0 ? `<br><small class="text-muted"><i class="fas fa-info-circle me-1"></i>${divisionBreakdownText}<br><em>Double play = 2 slots</em></small>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-users text-success me-2"></i>
                                            <strong>Teams</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${teamsUsage.colorClass}">${teamsUsage.text}</span>
                                        ${teamsUsage.percentage > 0 ? `<small class="text-muted">(${teamsUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small class="text-muted">Limit: ${formatLimit(limits.teams)}</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-user-friends text-info me-2"></i>
                                            <strong>Team Members</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${membersUsage.colorClass}">${membersUsage.text}</span>
                                        ${membersUsage.percentage > 0 ? `<small class="text-muted">(${membersUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small class="text-muted">Limit: ${formatLimit(limits.teamMembers)}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${effectiveTier === 'enterprise' && !isInTrial ? `
                        <div class="alert alert-success mt-4 mb-0">
                            <i class="fas fa-crown me-2"></i>
                            <strong>Enterprise Plan</strong> - You're on the highest tier with all features unlocked!
                        </div>
                    ` : effectiveTier === 'enterprise' && isInTrial ? `
                        <div class="alert alert-info mt-4 mb-3">
                            <i class="fas fa-gift me-2"></i>
                            <strong>Trial Active</strong> - Upgrade now to keep Enterprise features after your trial ends!
                        </div>
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading upgrade options...</p>
                            </div>
                        </div>
                    ` : subscriptionStatus.tier === 'free' ? `
                        <div class="alert alert-warning mt-4 mb-3 d-flex align-items-center">
                            <i class="fas fa-rocket fa-2x me-3"></i>
                            <div>
                                <strong>Upgrade Your Plan</strong>
                                <p class="mb-0">You're on the free plan. Upgrade to unlock more features and higher limits!</p>
                            </div>
                        </div>
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading available plans...</p>
                            </div>
                        </div>
                    ` : `
                        <div class="alert alert-success mt-4 mb-3">
                            <i class="fas fa-check-circle me-2"></i>
                            <strong>Active Subscription</strong> - You have full access to all features in your plan.
                        </div>
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading upgrade options...</p>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        subscriptionInfoDiv.innerHTML = subscriptionHTML;
        
        // Load available plans (always show plans except for actual paid enterprise users)
        // For trial users (isInTrial = true), we still want to show plans so they can upgrade
        const actualTier = subscriptionStatus.tier || plan.tier; // Their actual subscription tier (not trial)
        const shouldShowPlans = !isInTrial || actualTier !== 'enterprise'; // Show plans if in trial OR not on enterprise
        
        if (shouldShowPlans && actualTier !== 'enterprise') {
            console.log('Loading subscription plans for tier:', actualTier, 'isInTrial:', isInTrial);
            await loadAvailablePlans(actualTier);
        } else if (isInTrial && actualTier === 'free') {
            // Show plans for trial users so they can upgrade to keep features
            console.log('Loading subscription plans for trial user (current tier: free)');
            await loadAvailablePlans('free');
        }
        
    } catch (error) {
        console.error('Error loading subscription info:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            profileData: profileData,
            hasAuthToken: !!authToken
        });
        
        // Show a user-friendly error message
        let errorMessage = error.message || 'Unable to load subscription information';
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = 'Please log in again to view subscription information.';
        } else if (errorMessage.includes('500') || errorMessage.includes('Server error')) {
            errorMessage = 'Server error. Please try again later or contact support.';
        }
        
        subscriptionInfoDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Unable to load subscription information</strong>
                <p class="mb-0 mt-2">${errorMessage}</p>
                <small class="text-muted">If this persists, please refresh the page and try again.</small>
            </div>
        `;
    }
}

// Load and display available subscription plans
async function loadAvailablePlans(currentTier) {
    const availablePlansDiv = document.getElementById('availablePlans');
    if (!availablePlansDiv) return;
    
    try {
        console.log('Loading subscription plans for tier:', currentTier);
        const response = await apiCall('/subscription-plans');
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to load subscription plans:', response.status, errorText);
            throw new Error(`Failed to load subscription plans: ${response.status}`);
        }
        
        const plansData = await response.json();
        console.log('Subscription plans response:', plansData);
        
        // Handle both array and object responses
        const plans = Array.isArray(plansData) ? plansData : (plansData.plans || plansData.data || []);
        
        if (!Array.isArray(plans) || plans.length === 0) {
            console.warn('No plans found in response:', plansData);
            availablePlansDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No subscription plans are currently available. Please check back later.
                </div>
            `;
            return;
        }
        
        console.log('Processing plans:', plans);
        
        // Filter out the current tier and free tier, sort by price
        const upgradePlans = plans
            .filter(p => {
                const tier = p.tier || p.subscription_tier;
                const isActive = p.is_active !== false && p.is_active !== 'false';
                return tier !== currentTier && tier !== 'free' && isActive;
            })
            .sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0));
        
        console.log('Upgrade plans after filtering:', upgradePlans);
        
        if (upgradePlans.length === 0) {
            availablePlansDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No upgrade plans available at this time.
                </div>
            `;
            return;
        }
        
        // Build plans display
        const plansHTML = `
            <h6 class="mb-3 mt-4">
                <i class="fas fa-arrow-up me-2"></i>Available Upgrade Plans
            </h6>
            <div class="row g-3">
                ${upgradePlans.map(plan => {
                    // Parse features if it's a JSON string or array
                    let features = [];
                    if (Array.isArray(plan.features)) {
                        features = plan.features;
                    } else if (typeof plan.features === 'string') {
                        try {
                            features = JSON.parse(plan.features);
                        } catch (e) {
                            features = [];
                        }
                    }
                    
                    const price = plan.price_monthly || 0;
                    const badgeColor = plan.tier === 'basic' ? 'primary' : 
                                     plan.tier === 'pro' ? 'warning' : 'success';
                    
                    return `
                        <div class="col-md-${upgradePlans.length === 1 ? '12' : upgradePlans.length === 2 ? '6' : '4'}">
                            <div class="card h-100 border-2 ${plan.tier === 'pro' ? 'border-warning shadow-sm' : ''}">
                                <div class="card-header bg-${badgeColor} text-white">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0">
                                            <i class="fas fa-star me-2"></i>${plan.name || plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
                                        </h6>
                                        <span class="badge bg-light text-dark">${formatCurrency(price)}/mo</span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <p class="text-muted small mb-3">${plan.description || ''}</p>
                                    
                                    <div class="mb-3">
                                        <strong>Limits:</strong>
                                        <ul class="list-unstyled mt-2 mb-0 small">
                                            <li><i class="fas fa-check text-success me-2"></i>
                                                ${plan.max_divisions === null ? 'Unlimited' : plan.max_divisions} divisions
                                            </li>
                                            <li><i class="fas fa-check text-success me-2"></i>
                                                ${plan.max_teams === null ? 'Unlimited' : plan.max_teams} teams
                                            </li>
                                            <li><i class="fas fa-check text-success me-2"></i>
                                                ${plan.max_team_members === null ? 'Unlimited' : plan.max_team_members} team members
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    ${features.length > 0 ? `
                                        <div class="mb-3">
                                            <strong>Features:</strong>
                                            <ul class="list-unstyled mt-2 mb-0 small">
                                                ${features.slice(0, 6).map(feature => `
                                                    <li><i class="fas fa-check text-success me-2"></i>${feature}</li>
                                                `).join('')}
                                            </ul>
                                        </div>
                                    ` : ''}
                                    
                                    <button class="btn btn-${badgeColor} w-100 mt-auto" onclick="upgradeToPlan('${plan.tier}', '${plan.name || plan.tier}')">
                                        <i class="fas fa-arrow-up me-2"></i>Upgrade to ${plan.name || plan.tier}
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        availablePlansDiv.innerHTML = plansHTML;
        
    } catch (error) {
        console.error('Error loading available plans:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            currentTier: currentTier
        });
        availablePlansDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Unable to load upgrade plans</strong>
                <p class="mb-0 mt-2">${error.message || 'An error occurred while loading subscription plans.'}</p>
                <small class="text-muted">Please check the browser console for more details or try refreshing the page.</small>
            </div>
        `;
    }
}

// Function to handle plan upgrade
async function upgradeToPlan(planTier, planName) {
    try {
        // Show loading state
        const button = event.target.closest('button');
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        
        // Create checkout session
        const response = await apiCall('/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ planTier })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to create checkout session' }));
            
            // Check if Stripe is not configured
            if (errorData.message && errorData.message.includes('not available')) {
                alert('Payment processing is not available yet. Please contact support to upgrade your plan.');
                button.disabled = false;
                button.innerHTML = originalText;
                return;
            }
            
            throw new Error(errorData.message || 'Failed to create checkout session');
        }
        
        const data = await response.json();
        
        if (data.url) {
            // Redirect to Stripe checkout
            window.location.href = data.url;
        } else if (data.sessionId) {
            // Alternative: redirect with session ID
            window.location.href = `${window.location.origin}/dues-tracker?session_id=${data.sessionId}`;
        } else {
            throw new Error('No checkout URL or session ID received');
        }
        
    } catch (error) {
        console.error('Upgrade error:', error);
        alert(`Failed to start upgrade process: ${error.message || 'Unknown error'}. Please try again or contact support.`);
        
        // Restore button
        const button = event.target.closest('button');
        button.disabled = false;
        button.innerHTML = originalText.replace('Processing...', '<i class="fas fa-arrow-up me-2"></i>Upgrade to ' + planName);
    }
}

async function saveProfile() {
    const errorDiv = document.getElementById('profileError');
    const successDiv = document.getElementById('profileSuccess');
    
    // Hide previous messages
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    try {
        const name = document.getElementById('profileName').value.trim();
        const organizationName = document.getElementById('profileOrganizationName').value.trim();
        const phone = document.getElementById('profilePhone').value.trim();
        const sanctionFeesEnabledInput = document.getElementById('profileSanctionFeesEnabled');
        const sanctionFeesEnabled = sanctionFeesEnabledInput ? sanctionFeesEnabledInput.checked : false;
        
        const sanctionFeeNameInput = document.getElementById('profileSanctionFeeName');
        const sanctionFeeAmountInput = document.getElementById('profileSanctionFeeAmount');
        const sanctionFeePayoutAmountInput = document.getElementById('profileSanctionFeePayoutAmount');
        
        const sanctionFeeName = sanctionFeeNameInput ? sanctionFeeNameInput.value.trim() : '';
        const sanctionFeeAmountValue = sanctionFeeAmountInput ? sanctionFeeAmountInput.value.trim() : '';
        const sanctionFeeAmount = sanctionFeeAmountValue ? parseFloat(sanctionFeeAmountValue) : null;
        const sanctionFeePayoutAmountValue = sanctionFeePayoutAmountInput ? sanctionFeePayoutAmountInput.value.trim() : '';
        const sanctionFeePayoutAmount = sanctionFeePayoutAmountValue ? parseFloat(sanctionFeePayoutAmountValue) : null;
        
        // Get calculation method
        const calculationMethod = document.querySelector('input[name="calculationMethod"]:checked')?.value || 'percentage';
        const useDollarAmountsValue = calculationMethod === 'dollar';
        
        // Get financial breakdown configuration
        const prizeFundNameInput = document.getElementById('profilePrizeFundName');
        const prizeFundPercentInput = document.getElementById('profilePrizeFundPercentage');
        const prizeFundAmountInput = document.getElementById('profilePrizeFundAmount');
        const prizeFundAmountTypeInput = document.querySelector('input[name="prizeFundAmountType"]:checked');
        
        const firstOrgNameInput = document.getElementById('profileFirstOrganizationName') || document.getElementById('profileFirstOrganizationNameDollar');
        const firstOrgPercentInput = document.getElementById('profileFirstOrganizationPercentage');
        const firstOrgAmountInput = document.getElementById('profileFirstOrganizationAmount');
        const firstOrgAmountTypeInput = document.querySelector('input[name="firstOrgAmountType"]:checked');
        
        const secondOrgNameInput = document.getElementById('profileSecondOrganizationName') || document.getElementById('profileSecondOrganizationNameDollar');
        const secondOrgPercentInput = document.getElementById('profileSecondOrganizationPercentage');
        const secondOrgAmountInput = document.getElementById('profileSecondOrganizationAmount');
        const secondOrgAmountTypeInput = document.querySelector('input[name="secondOrgAmountType"]:checked');
        
        const prizeFundName = prizeFundNameInput ? prizeFundNameInput.value.trim() : null;
        const prizeFundPercent = prizeFundPercentInput ? parseFloat(prizeFundPercentInput.value) : null;
        const prizeFundAmount = prizeFundAmountInput ? parseFloat(prizeFundAmountInput.value) : null;
        const prizeFundAmountType = prizeFundAmountTypeInput ? prizeFundAmountTypeInput.value : 'perTeam';
        
        const firstOrgName = firstOrgNameInput ? firstOrgNameInput.value.trim() : null;
        const firstOrgPercent = firstOrgPercentInput ? parseFloat(firstOrgPercentInput.value) : null;
        const firstOrgAmount = firstOrgAmountInput ? parseFloat(firstOrgAmountInput.value) : null;
        const firstOrgAmountType = firstOrgAmountTypeInput ? firstOrgAmountTypeInput.value : 'perTeam';
        
        const secondOrgName = secondOrgNameInput ? secondOrgNameInput.value.trim() : null;
        const secondOrgPercent = secondOrgPercentInput ? parseFloat(secondOrgPercentInput.value) : null;
        const secondOrgAmount = secondOrgAmountInput ? parseFloat(secondOrgAmountInput.value) : null;
        const secondOrgAmountType = secondOrgAmountTypeInput ? secondOrgAmountTypeInput.value : 'perTeam';
        
        if (!name) {
            throw new Error('Name is required');
        }
        
        // Build request body
        const requestBody = {
            name: name,
            organization_name: organizationName || null,
            phone: phone || null,
            sanctionFeesEnabled: sanctionFeesEnabled
        };

        // Save theme (per account)
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            requestBody.uiTheme = themeToggle.checked ? 'dark' : 'light';
        }
        
        // Only add sanction fee fields if name and collection amount are provided and valid
        if (sanctionFeeName && sanctionFeeAmountValue) {
            if (isNaN(sanctionFeeAmount) || sanctionFeeAmount < 0) {
                throw new Error('Sanction fee amount must be a valid positive number');
            }
            requestBody.sanctionFeeName = sanctionFeeName;
            requestBody.sanctionFeeAmount = sanctionFeeAmount;
            
            // Add payout amount if provided (optional, defaults to 0 if not set)
            if (sanctionFeePayoutAmountValue) {
                if (isNaN(sanctionFeePayoutAmount) || sanctionFeePayoutAmount < 0) {
                    throw new Error('Sanction fee payout amount must be a valid positive number');
                }
                requestBody.sanctionFeePayoutAmount = sanctionFeePayoutAmount;
            }
        } else if (sanctionFeeName && !sanctionFeeAmountValue) {
            throw new Error('Sanction fee amount is required when sanction fee name is provided');
        } else if (!sanctionFeeName && sanctionFeeAmountValue) {
            throw new Error('Sanction fee name is required when sanction fee amount is provided');
        }
        
        // Add calculation method
        requestBody.useDollarAmounts = useDollarAmountsValue;
        
        // Add financial breakdown configuration if provided
        if (prizeFundNameInput && prizeFundName) {
            requestBody.prizeFundName = prizeFundName;
        }
        
        if (useDollarAmountsValue) {
            // Save dollar amount settings
            if (prizeFundAmountInput && !isNaN(prizeFundAmount) && prizeFundAmount >= 0) {
                requestBody.prizeFundAmount = prizeFundAmount;
                requestBody.prizeFundAmountType = prizeFundAmountType;
            }
            if (firstOrgNameInput && firstOrgName) {
                requestBody.firstOrganizationName = firstOrgName;
            }
            if (firstOrgAmountInput && !isNaN(firstOrgAmount) && firstOrgAmount >= 0) {
                requestBody.firstOrganizationAmount = firstOrgAmount;
                requestBody.firstOrganizationAmountType = firstOrgAmountType;
            }
            if (secondOrgNameInput && secondOrgName) {
                requestBody.secondOrganizationName = secondOrgName;
            }
            if (secondOrgAmountInput && !isNaN(secondOrgAmount) && secondOrgAmount >= 0) {
                requestBody.secondOrganizationAmount = secondOrgAmount;
                requestBody.secondOrganizationAmountType = secondOrgAmountType;
            }
        } else {
            // Save percentage settings
            if (prizeFundPercentInput && !isNaN(prizeFundPercent)) {
                if (prizeFundPercent < 0 || prizeFundPercent > 100) {
                    throw new Error('Prize fund percentage must be between 0 and 100');
                }
                requestBody.prizeFundPercentage = prizeFundPercent;
            }
            if (firstOrgNameInput && firstOrgName) {
                requestBody.firstOrganizationName = firstOrgName;
            }
            if (firstOrgPercentInput && !isNaN(firstOrgPercent)) {
                if (firstOrgPercent < 0 || firstOrgPercent > 100) {
                    throw new Error('First organization percentage must be between 0 and 100');
                }
                requestBody.firstOrganizationPercentage = firstOrgPercent;
            }
            if (secondOrgNameInput && secondOrgName) {
                requestBody.secondOrganizationName = secondOrgName;
            }
            if (secondOrgPercentInput && !isNaN(secondOrgPercent)) {
                if (secondOrgPercent < 0 || secondOrgPercent > 100) {
                    throw new Error('Second organization percentage must be between 0 and 100');
                }
                requestBody.secondOrganizationPercentage = secondOrgPercent;
            }
        }
        
        console.log('📤 Saving profile with request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await apiCall('/profile', {
            method: 'PUT',
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to update profile' }));
            console.error('❌ Profile save error:', errorData);
            throw new Error(errorData.message || errorData.error || 'Failed to update profile');
        }
        
        const data = await response.json();
        
        // Update current operator data
        if (data.operator) {
            currentOperator = data.operator;
            localStorage.setItem('currentOperator', JSON.stringify(data.operator));
            
            console.log('✅ Profile saved, updated currentOperator:', { 
                sanction_fees_enabled: currentOperator.sanction_fees_enabled,
                sanction_fee_name: currentOperator.sanction_fee_name,
                sanction_fee_amount: currentOperator.sanction_fee_amount
            });
            
            // Update branding with new organization name
            updateAppBranding(data.operator.organization_name || data.operator.name || 'Dues Tracker');
            
            // Update sanction fee settings and financial breakdown settings
            updateSanctionFeeSettings();
            updateFinancialBreakdownSettings();
            
            // Explicitly update the UI visibility for sanction fees (double-check)
            const operatorData = data.operator || currentOperator;
            let isEnabled = false;
            if (operatorData.sanction_fees_enabled !== undefined && operatorData.sanction_fees_enabled !== null) {
                isEnabled = operatorData.sanction_fees_enabled === true || operatorData.sanction_fees_enabled === 'true';
            } else {
                // Backward compatibility: if they have a sanction fee amount set, default to enabled
                const hasAmount = operatorData.sanction_fee_amount && parseFloat(operatorData.sanction_fee_amount) > 0;
                isEnabled = hasAmount;
            }
            console.log('🔄 Explicitly updating sanction fee UI visibility:', { 
                isEnabled, 
                sanction_fees_enabled: operatorData.sanction_fees_enabled,
                sanctionFeeAmount: operatorData.sanction_fee_amount
            });
            toggleSanctionFeeUI(isEnabled);
            
            // Refresh the UI to reflect new settings
            calculateFinancialBreakdown();
            
            // Refresh teams display if on teams view
            const teamsView = document.getElementById('teamsView');
            if (teamsView && teamsView.classList.contains('active')) {
                displayTeams(filteredTeams || teams || []);
            }
        }
        
        // Show success message
        successDiv.textContent = 'Profile updated successfully!';
        successDiv.classList.remove('hidden');
        
        // Hide modal after 2 seconds
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
            if (modal) {
                modal.hide();
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        errorDiv.textContent = error.message || 'Failed to update profile. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}
