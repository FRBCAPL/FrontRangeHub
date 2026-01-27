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

// Helper function to show loading message
function showLoadingMessage(message) {
    // Remove any existing loading message
    hideLoadingMessage();
    
    // Create loading message element (smaller, less prominent)
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'fargoLoadingMessage';
    loadingDiv.className = 'text-muted small mt-2 d-flex align-items-center';
    loadingDiv.innerHTML = `
        <div class="spinner-border spinner-border-sm me-2" role="status" style="width: 0.8rem; height: 0.8rem;">
            <span class="visually-hidden">Loading...</span>
        </div>
        <span>${message}</span>
    `;
    
    // Find the button container and insert after it
    const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
    if (importButtons.length > 0) {
        const firstButton = importButtons[0];
        const container = firstButton.closest('.row, .col-12, .card-body');
        if (container) {
            container.appendChild(loadingDiv);
        }
    }
}

// Helper function to hide loading message
function hideLoadingMessage() {
    const loadingMsg = document.getElementById('fargoLoadingMessage');
    if (loadingMsg) {
        loadingMsg.remove();
    }
}

// Helper function to show alerts in a modal instead of browser alerts
function showAlertModal(message, type = 'info', title = null) {
    const modal = document.getElementById('alertModal');
    const modalHeader = document.getElementById('alertModalHeader');
    const modalTitle = document.getElementById('alertModalTitle');
    const modalMessage = document.getElementById('alertModalMessage');
    
    // Set message
    modalMessage.textContent = message;
    
    // Set title and icon based on type
    let iconClass = 'fas fa-info-circle';
    let headerClass = 'modal-header';
    
    switch(type) {
        case 'error':
        case 'danger':
            iconClass = 'fas fa-exclamation-circle';
            headerClass = 'modal-header bg-danger text-white';
            title = title || 'Error';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            headerClass = 'modal-header bg-warning text-dark';
            title = title || 'Warning';
            break;
        case 'success':
            iconClass = 'fas fa-check-circle';
            headerClass = 'modal-header bg-success text-white';
            title = title || 'Success';
            break;
        default:
            title = title || 'Notice';
    }
    
    modalHeader.className = headerClass;
    modalTitle.innerHTML = `<i class="${iconClass} me-2"></i>${title}`;
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
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
// Flag to track if division name listeners are already set up
let divisionNameListenersSetup = false;
// Flag to track if date picker listeners are already set up
let datePickerListenersSetup = false;
// Flag to track if dues field listener is already set up
let duesFieldListenerSetup = false;
let currentDivisionId = null;
let currentWeek = 1;
let currentWeeklyPaymentTeamId = null;
let currentWeeklyTeamDues = 0; // Store weekly team dues for validation
let currentSortColumn = null; // Track which column is currently sorted
let currentSortDirection = 'asc'; // 'asc' or 'desc'
let archivedTeamsSortColumn = null; // Track which column is currently sorted in archived teams modal
let archivedTeamsSortDirection = 'asc'; // 'asc' or 'desc'
let cachedArchivedTeams = []; // Cache archived teams for sorting
let currentWeeklyPaymentWeek = 1;
let projectionMode = false; // Projection mode: shows end-of-division projections
let allPlayersData = []; // Store all players data for sorting in players modal
let currentPlayersSortColumn = null;
let currentPlayersSortDirection = 'asc';

// Pagination state
let currentPage = 1;
let teamsPerPage = 25; // Default: 25 teams per page
let totalTeamsCount = 0;
let totalPages = 1;

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
let _savedUseDollarAmounts = false; // Persisted preference; "Active format" reflects this until user saves

// Password strength checking function (must be at top level for inline handlers)
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
        
        // Load sanction start/end date settings
        const sanctionStartDateInput = document.getElementById('profileSanctionStartDate');
        const sanctionEndDateInput = document.getElementById('profileSanctionEndDate');
        if (sanctionStartDateInput && currentOperator.sanction_start_date) {
            const startDate = new Date(currentOperator.sanction_start_date);
            sanctionStartDateInput.value = startDate.toISOString().split('T')[0];
        } else if (sanctionStartDateInput) {
            // Default to Jan 1 of current year (or next year if Oct-Dec)
            const now = new Date();
            const currentMonth = now.getMonth();
            let sanctionYear = now.getFullYear();
            if (currentMonth >= 9) {
                sanctionYear = now.getFullYear() + 1;
            }
            sanctionStartDateInput.value = `${sanctionYear}-01-01`;
        }
        if (sanctionEndDateInput && currentOperator.sanction_end_date) {
            const endDate = new Date(currentOperator.sanction_end_date);
            sanctionEndDateInput.value = endDate.toISOString().split('T')[0];
        } else if (sanctionEndDateInput) {
            // Default to Dec 31 of current year (or next year if Oct-Dec)
            const now = new Date();
            const currentMonth = now.getMonth();
            let sanctionYear = now.getFullYear();
            if (currentMonth >= 9) {
                sanctionYear = now.getFullYear() + 1;
            }
            sanctionEndDateInput.value = `${sanctionYear}-12-31`;
        }
        
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
        _savedUseDollarAmounts = useDollarAmounts;
        
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
    try {
        const method = document.querySelector('input[name="calculationMethod"]:checked')?.value;
        const selectedDollar = method === 'dollar';
        const percentageInputs = document.getElementById('percentageInputs');
        const dollarAmountInputs = document.getElementById('dollarAmountInputs');
        const activeFormatLabel = document.getElementById('activeFormatLabel');
        const saveToChangeMsg = document.getElementById('saveToChangeFormatMsg');

        // Show/hide inputs based on selected option
        if (selectedDollar) {
            if (percentageInputs) percentageInputs.style.display = 'none';
            if (dollarAmountInputs) dollarAmountInputs.style.display = 'block';
        } else {
            if (percentageInputs) percentageInputs.style.display = 'block';
            if (dollarAmountInputs) dollarAmountInputs.style.display = 'none';
        }

        // "Active format" always reflects saved preference (never changes until Save)
        if (activeFormatLabel) {
            activeFormatLabel.textContent = _savedUseDollarAmounts ? 'Dollar amounts' : 'Percentage';
        }

        // Show "Save to change preference" only when selected differs from saved
        if (saveToChangeMsg) {
            saveToChangeMsg.style.display = selectedDollar !== _savedUseDollarAmounts ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error in toggleCalculationMethod:', error);
    }
}

// Track saved division calculation method (similar to _savedUseDollarAmounts for profile)
let _savedDivisionUseDollarAmounts = false;

// Toggle between percentage and dollar amount input methods for division editor
// Clear all division financial breakdown fields to use operator defaults
function clearDivisionFinancialBreakdown() {
    // Get all field elements first (before clearing them)
    const divisionPrizeFundNameEl = document.getElementById('divisionPrizeFundName');
    const divisionPrizeFundPercentEl = document.getElementById('divisionPrizeFundPercentage');
    const divisionFirstOrgNameEl = document.getElementById('divisionFirstOrgName');
    const divisionFirstOrgPercentEl = document.getElementById('divisionFirstOrgPercentage');
    const divisionSecondOrgNameEl = document.getElementById('divisionSecondOrgName');
    const divisionSecondOrgPercentEl = document.getElementById('divisionSecondOrgPercentage');
    const divisionPrizeFundAmountEl = document.getElementById('divisionPrizeFundAmount');
    const divisionFirstOrgNameDollarEl = document.getElementById('divisionFirstOrgNameDollar');
    const divisionFirstOrgAmountEl = document.getElementById('divisionFirstOrganizationAmount');
    const divisionSecondOrgNameDollarEl = document.getElementById('divisionSecondOrgNameDollar');
    const divisionSecondOrgAmountEl = document.getElementById('divisionSecondOrganizationAmount');
    
    // Reset calculation method to match operator default
    const divisionMethodPercentage = document.getElementById('divisionMethodPercentage');
    const divisionMethodDollarAmount = document.getElementById('divisionMethodDollarAmount');
    const operatorUsesDollarAmounts = currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false;
    
    // Check if save is needed BEFORE changing anything
    // The save message should appear if:
    // 1. The division's saved method differs from the operator default, OR
    // 2. Any financial breakdown fields have values (meaning we're clearing division-specific overrides)
    const methodNeedsSave = operatorUsesDollarAmounts !== _savedDivisionUseDollarAmounts;
    
    // Check if any fields have values that will be cleared
    
    const hasFieldValues = 
        (divisionPrizeFundNameEl && divisionPrizeFundNameEl.value.trim()) ||
        (divisionPrizeFundPercentEl && divisionPrizeFundPercentEl.value.trim()) ||
        (divisionFirstOrgNameEl && divisionFirstOrgNameEl.value.trim()) ||
        (divisionFirstOrgPercentEl && divisionFirstOrgPercentEl.value.trim()) ||
        (divisionSecondOrgNameEl && divisionSecondOrgNameEl.value.trim()) ||
        (divisionSecondOrgPercentEl && divisionSecondOrgPercentEl.value.trim()) ||
        (divisionPrizeFundAmountEl && divisionPrizeFundAmountEl.value.trim()) ||
        (divisionFirstOrgNameDollarEl && divisionFirstOrgNameDollarEl.value.trim()) ||
        (divisionFirstOrgAmountEl && divisionFirstOrgAmountEl.value.trim()) ||
        (divisionSecondOrgNameDollarEl && divisionSecondOrgNameDollarEl.value.trim()) ||
        (divisionSecondOrgAmountEl && divisionSecondOrgAmountEl.value.trim());
    
    const needsSave = methodNeedsSave || hasFieldValues;
    
    console.log('[clearDivisionFinancialBreakdown] Before change:');
    console.log('  - operatorUsesDollarAmounts (operator default):', operatorUsesDollarAmounts);
    console.log('  - _savedDivisionUseDollarAmounts (division saved):', _savedDivisionUseDollarAmounts);
    console.log('  - methodNeedsSave (method change):', methodNeedsSave);
    console.log('  - hasFieldValues (fields have values):', hasFieldValues);
    console.log('  - needsSave (should show message):', needsSave);
    console.log('  - currentDivisionId:', currentDivisionId);
    
    // Now clear all the fields
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
    
    // Set the radio buttons to match operator default
    if (operatorUsesDollarAmounts) {
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = true;
        if (divisionMethodPercentage) divisionMethodPercentage.checked = false;
    } else {
        if (divisionMethodPercentage) divisionMethodPercentage.checked = true;
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = false;
    }
    
    // Update the display - this will show/hide the appropriate input sections
    toggleDivisionCalculationMethod();
    
    // Immediately set the save message based on our calculation (override what toggleDivisionCalculationMethod() set)
    const saveToChangeMsg = document.getElementById('divisionSaveToChangeFormatMsg');
    if (saveToChangeMsg) {
        if (needsSave) {
            saveToChangeMsg.style.display = 'block';
            console.log('[clearDivisionFinancialBreakdown] ✅ Save message SHOWN (changes detected - method or fields will be cleared)');
        } else {
            saveToChangeMsg.style.display = 'none';
            console.log('[clearDivisionFinancialBreakdown] ℹ️ Save message HIDDEN (no changes - already using defaults)');
        }
    } else {
        console.error('[clearDivisionFinancialBreakdown] ❌ Save message element not found!');
    }
    
    // Show success message
    showAlertModal('Financial breakdown fields cleared. Division will use your default settings from Profile & Settings.', 'success', 'Defaults Restored');
}

function toggleDivisionCalculationMethod() {
    const method = document.querySelector('input[name="divisionCalculationMethod"]:checked')?.value;
    const selectedDollar = method === 'dollar';
    const percentageInputs = document.getElementById('divisionPercentageInputs');
    const dollarAmountInputs = document.getElementById('divisionDollarAmountInputs');
    const activeFormatLabel = document.getElementById('divisionActiveFormatLabel');
    const saveToChangeMsg = document.getElementById('divisionSaveToChangeFormatMsg');
    
    // Show/hide inputs based on selected option (user can edit either)
    if (selectedDollar) {
        if (percentageInputs) percentageInputs.style.display = 'none';
        if (dollarAmountInputs) dollarAmountInputs.style.display = 'block';
    } else {
        if (percentageInputs) percentageInputs.style.display = 'block';
        if (dollarAmountInputs) dollarAmountInputs.style.display = 'none';
    }
    
    // "Active format" always reflects saved preference (never changes until Save)
    if (activeFormatLabel) {
        activeFormatLabel.textContent = _savedDivisionUseDollarAmounts ? 'Dollar Amount' : 'Percentage';
    }
    
    // Show "Save to change preference" only when selected differs from saved
    if (saveToChangeMsg) {
        const needsSave = selectedDollar !== _savedDivisionUseDollarAmounts;
        saveToChangeMsg.style.display = needsSave ? 'block' : 'none';
        console.log('[toggleDivisionCalculationMethod] selectedDollar:', selectedDollar, 'saved:', _savedDivisionUseDollarAmounts, 'needsSave:', needsSave);
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
    
    // Check if we're returning from Square payment (plan upgrade)
    const urlParams = new URLSearchParams(window.location.search);
    const squareUpgrade = urlParams.get('square_upgrade') === '1';
    const upgradeRef = urlParams.get('ref');
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    
    if (squareUpgrade && upgradeRef) {
        console.log('✅ Returning from Square checkout, ref:', upgradeRef);
        const cleanPath = window.location.pathname + (window.location.hash || '');
        
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
    
    // Then check if we're returning from OAuth
    // This MUST happen before anything else to catch OAuth callbacks
    console.log('🚀 Dues Tracker: DOMContentLoaded - checking for OAuth callback');
    const oauthHandled = await checkAndHandleOAuth();
    if (oauthHandled) {
        console.log('✅ OAuth callback was handled, stopping normal initialization');
        return; // Don't continue with normal initialization until OAuth is processed
    }
    
    // Set up division name listeners globally (will be re-setup when modals open)
    setupDivisionNameListeners();
    
    // Set up date picker click handlers - make date inputs open picker on click
    setupDatePickerHandlers();
    
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
    // Show/hide admin button based on admin status
    updateAdminButton();
    // Make sure clock is initialized when main app is shown
    updateLocalClock();
}

// Show/hide admin button based on operator's admin status
function updateAdminButton() {
    const adminButton = document.getElementById('adminButton');
    if (adminButton) {
        // Check if current operator is an admin
        if (currentOperator && currentOperator.is_admin === true) {
            adminButton.style.display = 'inline-block';
        } else {
            adminButton.style.display = 'none';
        }
    }
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
        
        // Check if login failed due to pending approval
        if (!response.ok && data.requiresApproval) {
            errorDiv.textContent = data.message || 'Your account is pending approval. You will receive an email when your account has been approved.';
            errorDiv.classList.remove('hidden');
            return;
        }
        
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
            updateAdminButton(); // Update admin button visibility
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
                    // Check if account requires approval
                    if (data.requiresApproval || data.approvalStatus === 'pending') {
                        // Account needs approval - show pending message
                        if (successDiv) {
                            successDiv.innerHTML = 'Account created! Your account is pending approval. You will receive an email when your account has been approved.';
                            successDiv.className = 'alert alert-info mt-3';
                            successDiv.classList.remove('hidden');
                        }
                        
                        // Switch to login tab after 5 seconds (give user time to read message)
                        setTimeout(() => {
                            const loginTab = document.getElementById('login-tab');
                            if (loginTab) {
                                loginTab.click();
                            }
                            // Clear registration form
                            registerForm.reset();
                        }, 5000);
                    } else {
                        // Account approved immediately (shouldn't happen, but handle it)
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
                    }
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

    // Forgot Password Modal
    window.showForgotPasswordModal = function() {
        const modalElement = document.getElementById('forgotPasswordModal');
        if (!modalElement) {
            console.error('forgotPasswordModal element not found');
            return;
        }
        
        // Check for Bootstrap in multiple ways
        let Bootstrap = null;
        if (typeof bootstrap !== 'undefined') {
            Bootstrap = bootstrap;
        } else if (typeof window.bootstrap !== 'undefined') {
            Bootstrap = window.bootstrap;
        } else if (typeof window.Bootstrap !== 'undefined') {
            Bootstrap = window.Bootstrap;
        }
        
        if (!Bootstrap) {
            console.error('Bootstrap is not loaded');
            // Fallback to manual show
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
            document.body.classList.add('modal-open');
            return;
        }
        
        showModal(modalElement);
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
            
            // Check if account requires approval
            if (errorData.requiresApproval || response.status === 403) {
                const errorDiv = document.getElementById('loginError');
                if (errorDiv) {
                    errorDiv.textContent = errorData.message || 'Your account is pending approval. You will receive an email when your account has been approved.';
                    errorDiv.classList.remove('hidden');
                }
                showLoginScreen();
                return;
            }
            
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
        
        // Check if account requires approval (shouldn't happen if we got here, but check anyway)
        if (data.requiresApproval) {
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) {
                errorDiv.textContent = data.message || 'Your account is pending approval. You will receive an email when your account has been approved.';
                errorDiv.classList.remove('hidden');
            }
            showLoginScreen();
            return;
        }
        
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
        updateAdminButton(); // Update admin button visibility
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
                updateAdminButton(); // Update admin button visibility

                // Apply per-account theme if present
                applyTheme(getEffectiveTheme());
                const themeToggle = document.getElementById('themeToggle');
                if (themeToggle) themeToggle.checked = getEffectiveTheme() === 'dark';
                
                // Populate default dues field if available
                const defaultDuesInput = document.getElementById('profileDefaultDues');
                if (defaultDuesInput && data.operator.default_dues_per_player_per_match) {
                    defaultDuesInput.value = data.operator.default_dues_per_player_per_match;
                }
            }
        }
    } catch (error) {
        console.error('Error fetching operator profile:', error);
    }
}

// Data loading functions
async function loadData(resetPagination = true) {
    try {
        console.log('📊 Loading data...');
        
        // Reset pagination to page 1 if requested (default behavior)
        if (resetPagination) {
            currentPage = 1;
        }
        
        // Load all data in parallel, but wait for both to complete
        await Promise.all([
            loadDivisions(),
            loadTeams(currentPage, teamsPerPage),
            loadSummary()
        ]);
        
        console.log('✅ Data loaded successfully');
        
        // NOW that both divisions and teams are loaded, display the teams
        // This ensures division lookup works correctly
        // Filter out archived teams for main display
        const activeTeamsForDisplay = (filteredTeams || teams || []).filter(team => !team.isArchived && team.isActive !== false);
        displayTeams(activeTeamsForDisplay);
        
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

async function loadTeams(page = null, limit = null) {
    try {
        // Use provided page/limit or current pagination state
        const pageToLoad = page !== null ? page : currentPage;
        const limitToUse = limit !== null ? limit : teamsPerPage;
        
        // Build query string with pagination
        const queryParams = new URLSearchParams({
            page: pageToLoad.toString(),
            limit: limitToUse.toString()
        });
        
        const response = await apiCall(`/teams?${queryParams.toString()}`);
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading teams');
            const errorData = await response.json().catch(() => ({ message: 'Unauthorized' }));
            console.error('   Error:', errorData);
            teams = [];
            filteredTeams = [];
            totalTeamsCount = 0;
            totalPages = 1;
            return; // Don't throw, just return empty
        }
        
        if (!response.ok) {
            throw new Error(`Failed to load teams: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // Handle both old format (array) and new format (object with teams and pagination)
        let teamsData;
        if (Array.isArray(responseData)) {
            // Old format - no pagination (backward compatibility)
            teamsData = responseData;
            totalTeamsCount = teamsData.length;
            totalPages = 1;
            currentPage = 1;
        } else {
            // New format - with pagination
            teamsData = responseData.teams || [];
            if (responseData.pagination) {
                totalTeamsCount = responseData.pagination.total || 0;
                totalPages = responseData.pagination.totalPages || 1;
                currentPage = responseData.pagination.page || 1;
            }
        }
        
        teams = teamsData; // Store globally (includes all teams, archived and active)
        
        // Debug: Log archive status of teams
        const archivedCount = teamsData.filter(team => team.isArchived === true).length;
        const inactiveCount = teamsData.filter(team => team.isActive === false).length;
        console.log('📊 Teams loaded - Page:', currentPage, 'Total:', totalTeamsCount, 'This page:', teamsData.length, 'Archived:', archivedCount, 'Inactive:', inactiveCount);
        
        // Filter out archived teams from main display
        const activeTeams = teamsData.filter(team => !team.isArchived && team.isActive !== false);
        filteredTeams = activeTeams; // Only show active, non-archived teams
        console.log('✅ Loaded teams:', teams.length, `(${activeTeams.length} active, ${teams.length - activeTeams.length} archived)`);
        
        // Update pagination UI
        updatePaginationUI();
        
        // Don't display teams here - wait until both divisions and teams are loaded
        // displayTeams() will be called after Promise.all() completes in loadData()
    } catch (error) {
        console.error('❌ Error loading teams:', error);
        teams = [];
        filteredTeams = [];
        totalTeamsCount = 0;
        totalPages = 1;
        updatePaginationUI();
    }
}

// Pagination control functions
function goToPage(page) {
    // Validate page number
    if (page < 1) {
        page = 1;
    }
    if (totalPages > 0 && page > totalPages) {
        page = totalPages;
    }
    
    if (page === currentPage) {
        return; // Already on this page
    }
    
    currentPage = page;
    
    // Check if division filter is active
    const divisionFilterEl = document.getElementById('divisionFilter');
    const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
    
    // If "all" is selected, use pagination
    // If a specific division is selected, we need to reload all teams for that division
    // (For now, we'll reload with pagination - server-side division filtering can be added later)
    loadTeams(currentPage, teamsPerPage).then(() => {
        // After loading, apply division filter if needed
        if (selectedDivision && selectedDivision !== 'all') {
            filterTeamsByDivision();
        } else {
            // Display the loaded teams (already filtered for archived)
            displayTeams(filteredTeams);
        }
    });
}

async function changeTeamsPerPage(newLimit) {
    const newLimitInt = parseInt(newLimit);
    if (isNaN(newLimitInt) || newLimitInt < 1) {
        console.error('Invalid teams per page value:', newLimit);
        return;
    }
    
    teamsPerPage = newLimitInt;
    currentPage = 1; // Reset to first page when changing page size
    
    console.log('Changing teams per page to:', teamsPerPage);
    
    // Check if division filter is active before reloading
    const divisionFilterEl = document.getElementById('divisionFilter');
    const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
    
    // Reload teams with new page size
    await loadTeams(1, teamsPerPage);
    
    // After loading, apply division filter if needed
    if (selectedDivision && selectedDivision !== 'all') {
        await filterTeamsByDivision();
    } else {
        // Ensure filteredTeams is set (should be set by loadTeams, but double-check)
        if (!filteredTeams || filteredTeams.length === 0) {
            filteredTeams = teams.filter(team => !team.isArchived && team.isActive !== false);
        }
        // Display the loaded teams (already filtered for archived)
        displayTeams(filteredTeams);
        // Update pagination UI (loadTeams already calls this, but ensure it's updated)
        updatePaginationUI();
    }
}

function updatePaginationUI() {
    const paginationControls = document.getElementById('paginationControls');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const totalPagesDisplay = document.getElementById('totalPagesDisplay');
    const totalTeamsDisplay = document.getElementById('totalTeamsDisplay');
    const paginationFirst = document.getElementById('paginationFirst');
    const paginationPrev = document.getElementById('paginationPrev');
    const paginationNext = document.getElementById('paginationNext');
    const paginationLast = document.getElementById('paginationLast');
    const teamsPerPageSelect = document.getElementById('teamsPerPageSelect');
    
    if (!paginationControls) return;
    
    // Show pagination controls if we have teams and pagination is applicable
    // Hide only if we have 0 teams or exactly 1 page with all teams visible
    const shouldShow = totalTeamsCount > 0 && (totalPages > 1 || totalTeamsCount > teamsPerPage);
    
    if (shouldShow) {
        paginationControls.style.display = 'flex';
    } else {
        paginationControls.style.display = 'none';
    }
    
    // Update displays (handle edge cases)
    if (currentPageDisplay) currentPageDisplay.textContent = Math.max(1, currentPage);
    if (totalPagesDisplay) totalPagesDisplay.textContent = Math.max(1, totalPages);
    if (totalTeamsDisplay) totalTeamsDisplay.textContent = totalTeamsCount || 0;
    
    // Update teams per page select
    if (teamsPerPageSelect) {
        teamsPerPageSelect.value = teamsPerPage;
    }
    
    // Update button states
    if (paginationFirst) {
        paginationFirst.disabled = currentPage === 1;
    }
    if (paginationPrev) {
        paginationPrev.disabled = currentPage === 1;
    }
    if (paginationNext) {
        paginationNext.disabled = currentPage >= totalPages;
    }
    if (paginationLast) {
        paginationLast.disabled = currentPage >= totalPages;
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
    
    if (!tbody) {
        console.error('Teams table body not found!');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Update team count badge
    if (teamCount) {
        // Check if we're filtering by division or showing all
        const divisionFilterEl = document.getElementById('divisionFilter');
        const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
        
        if (selectedDivision === 'all' && totalTeamsCount > 0) {
            // Show pagination info: "Showing X-Y of Z teams"
            const start = Math.max(1, (currentPage - 1) * teamsPerPage + 1);
            const end = Math.min(currentPage * teamsPerPage, totalTeamsCount);
            if (totalTeamsCount <= teamsPerPage) {
                // All teams fit on one page
                teamCount.textContent = `${totalTeamsCount} Team${totalTeamsCount !== 1 ? 's' : ''}`;
            } else {
                teamCount.textContent = `Showing ${start}-${end} of ${totalTeamsCount} Teams`;
            }
        } else {
            // Show filtered count
            teamCount.textContent = `${teams.length} Team${teams.length !== 1 ? 's' : ''}`;
        }
    }
    
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
            
            // Track makeup weeks separately
            let makeupWeeksDue = [];
            let makeupWeeksUpcoming = [];
            
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
                        if (isMakeup) {
                            makeupWeeksDue.push(week);
                        }
                    } else {
                        // This week is upcoming (hasn't reached match date yet)
                        amountUpcoming += weeklyDues;
                        unpaidWeeksUpcoming.push(week);
                        if (isMakeup) {
                            makeupWeeksUpcoming.push(week);
                        }
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
                // Also track makeup weeks in projection mode
                makeupWeeksDue = [];
                makeupWeeksUpcoming = [];
                for (let w = 1; w <= totalWeeks; w++) {
                    const weekPayment = team.weeklyPayments?.find(p => p.week === w);
                    const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                    const isMakeup = weekPayment?.paid === 'makeup';
                    if (isUnpaid) {
                        unpaidWeeks.push(w);
                    }
                    if (isMakeup) {
                        if (w <= actualCurrentWeek) {
                            makeupWeeksDue.push(w);
                        } else {
                            makeupWeeksUpcoming.push(w);
                        }
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
            let duesExplanation = `$${duesRate}/player × ${playersPerWeek} players × ${matchesText}${weeksText}`;
            
            // Add makeup match information to tooltip if there are makeup weeks
            if (makeupWeeksDue.length > 0 || makeupWeeksUpcoming.length > 0) {
                const makeupWeeksList = [...makeupWeeksDue, ...makeupWeeksUpcoming];
                duesExplanation += `\n\n⚠️ Makeup Match: This team has makeup match${makeupWeeksList.length > 1 ? 'es' : ''} scheduled for week${makeupWeeksList.length > 1 ? 's' : ''} ${makeupWeeksList.join(', ')}. The amount owed includes these makeup weeks.`;
            }
        
        // Get division color for player count badge
        const divisionColor = teamDivision?.color || getDivisionColor(team.division);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong data-bs-toggle="tooltip" data-bs-placement="top" title="${captainTooltipText}">
                    ${team.teamName}
                </strong>
            </td>
            <td><span class="division-badge ${getDivisionClass(team.division)}" style="${teamDivision && teamDivision.color ? `background-color: ${teamDivision.color} !important; color: white !important;` : ''}">${divisionDisplayName}</span></td>
            <td><small class="text-muted">${dayOfPlay}</small></td>
            <td>
                <span class="badge" style="background-color: ${divisionColor} !important; color: white !important; border: none;">${totalTeamPlayers} players</span>
                <br><small class="text-muted">${playersPerWeek} play/week</small>
            </td>
            <td data-sanction-status>
                ${getBCAStatusDisplay(team)}
            </td>
            <td>
                ${amountOwed > 0 || amountUpcoming > 0 ? `
                    <strong>${formatCurrency(amountOwed)}</strong>
                    <i class="fas fa-info-circle ms-1 ${makeupWeeksDue.length > 0 || makeupWeeksUpcoming.length > 0 ? 'text-danger' : 'text-muted'}"
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
                        ${makeupWeeksDue.length > 0 ? `<br><small class="text-warning"><i class="fas fa-clock me-1"></i>Makeup: Week${makeupWeeksDue.length > 1 ? 's' : ''} ${makeupWeeksDue.join(', ')}</small>` : ''}
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
                <div class="d-flex gap-2">
                    <button class="btn btn-success btn-sm" onclick="showPaymentHistory('${team._id}')" title="Payment History">
                        <i class="fas fa-dollar-sign me-1"></i>Payment History
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="editTeam('${team._id}')" title="Edit Team">
                        <i class="fas fa-edit me-1"></i>Edit
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
    // Filter out archived teams
    let teamsToProcess = teams.filter(team => !team.isArchived && team.isActive !== false);
    if (selectedDivisionId !== 'all') {
        const selectedDivision = divisions.find(d => d._id === selectedDivisionId || d.id === selectedDivisionId);
        if (selectedDivision) {
            teamsToProcess = teamsToProcess.filter(team => team.division === selectedDivision.name);
        }
    }
    
    let totalTeams = teamsToProcess.length;
    let teamsBehind = 0;
    let totalAmountOwed = 0;
    let totalCollected = 0;
    const divisionBreakdown = {};
    const divisionOwedBreakdown = {}; // Track amounts owed per division
    const divisionProfitCollected = {}; // Track League Manager portion (profit) from collected per division
    const divisionProfitOwed = {}; // Track League Manager portion (profit) from owed per division
    
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
            
            // Calculate and track League Manager portion (profit) from owed amounts
            // Calculate how many weeks are owed
            let weeksOwed = 0;
            for (let week = 1; week <= actualCurrentWeek; week++) {
                const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                const isMakeup = weekPayment?.paid === 'makeup';
                if ((isUnpaid || isMakeup) && week <= dueWeek) {
                    weeksOwed++;
                }
            }
            // Calculate League Manager portion for each unpaid week
            const breakdown = calculateDuesBreakdown(expectedWeeklyDues, teamDivision.isDoublePlay, teamDivision);
            const profitFromOwed = breakdown.leagueManager * weeksOwed;
            if (!divisionProfitOwed[divisionName]) {
                divisionProfitOwed[divisionName] = 0;
            }
            divisionProfitOwed[divisionName] += profitFromOwed;
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
                    
                    // Calculate and track League Manager portion (profit) from collected
                    const breakdown = calculateDuesBreakdown(expectedWeeklyDues, teamDivision.isDoublePlay, teamDivision);
                    if (!divisionProfitCollected[divisionName]) {
                        divisionProfitCollected[divisionName] = 0;
                    }
                    divisionProfitCollected[divisionName] += breakdown.leagueManager;
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
            
            // Calculate and track League Manager portion (profit) from projected payments
            const breakdown = calculateDuesBreakdown(expectedWeeklyDues, teamDivision.isDoublePlay, teamDivision);
            const projectedProfit = breakdown.leagueManager * remainingWeeks;
            if (!divisionProfitCollected[divisionName]) {
                divisionProfitCollected[divisionName] = 0;
            }
            divisionProfitCollected[divisionName] += projectedProfit;
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
    // Now includes profit information: current profit, owed per division, and profit including owed
    const detailsListEl = document.getElementById('totalDuesDetailsList');
    if (detailsListEl) {
        const entries = Object.entries(divisionBreakdown);
        if (entries.length === 0) {
            detailsListEl.innerHTML = '<small class="text-muted">No payments yet</small>';
        } else {
            // Sort divisions alphabetically for consistent display
            entries.sort((a, b) => a[0].localeCompare(b[0]));
            
            // Calculate total current profit (League Manager portion from collected)
            let totalCurrentProfit = 0;
            Object.values(divisionProfitCollected).forEach(profit => {
                totalCurrentProfit += profit;
            });
            
            // Calculate total profit owed (League Manager portion from owed)
            let totalProfitOwed = 0;
            Object.values(divisionProfitOwed).forEach(profit => {
                totalProfitOwed += profit;
            });
            
            // Build HTML with profit information
            let html = '';
            
            // Show current profit
            html += `<div class="mb-2 pb-2 border-bottom border-white border-opacity-25">
                <div class="mb-1"><strong>Current Profit (${firstOrganizationName}):</strong> ${formatCurrency(totalCurrentProfit)}</div>
            </div>`;
            
            // Show per-division breakdown with profit
            html += '<div class="mb-2"><strong>Per Division:</strong></div>';
            entries.forEach(([name, amount]) => {
                const profitCollected = divisionProfitCollected[name] || 0;
                const profitOwed = divisionProfitOwed[name] || 0;
                const profitIncludingOwed = profitCollected + profitOwed;
                
                html += `<div class="mb-1 ms-2">
                    <div><strong>${name}:</strong> ${formatCurrency(amount)} collected</div>`;
                
                if (profitOwed > 0) {
                    html += `<div class="ms-2 text-warning"><small>Owed: ${formatCurrency(profitOwed)}</small></div>`;
                }
                
                html += `<div class="ms-2"><small>Profit: ${formatCurrency(profitCollected)}`;
                if (profitOwed > 0) {
                    html += ` + ${formatCurrency(profitOwed)} owed = ${formatCurrency(profitIncludingOwed)}`;
                }
                html += `</small></div></div>`;
            });
            
            // Show total profit including owed
            if (totalProfitOwed > 0) {
                const totalProfitIncludingOwed = totalCurrentProfit + totalProfitOwed;
                html += `<div class="mt-2 pt-2 border-top border-white border-opacity-25">
                    <div class="mb-1"><strong>Profit Including Owed:</strong> ${formatCurrency(totalCurrentProfit)} + ${formatCurrency(totalProfitOwed)} = <strong>${formatCurrency(totalProfitIncludingOwed)}</strong></div>
                </div>`;
            }
            
            detailsListEl.innerHTML = html;
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

// Helper function to get Bootstrap instance
function getBootstrap() {
    if (typeof bootstrap !== 'undefined') {
        return bootstrap;
    } else if (typeof window.bootstrap !== 'undefined') {
        return window.bootstrap;
    } else if (typeof window.Bootstrap !== 'undefined') {
        return window.Bootstrap;
    }
    return null;
}

// Helper function to show modal with fallback
function showModal(modalElement) {
    if (!modalElement) {
        console.error('Modal element is null or undefined');
        return false;
    }
    
    const Bootstrap = getBootstrap();
    if (!Bootstrap) {
        console.warn('Bootstrap not found, using fallback method');
        // Fallback: manually show modal
        modalElement.style.display = 'block';
        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modalBackdrop';
        document.body.appendChild(backdrop);
        return false;
    }
    
    try {
        const modal = Bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
        return true;
    } catch (error) {
        console.error('Error showing modal with Bootstrap:', error);
        // Fallback
        modalElement.style.display = 'block';
        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
        return false;
    }
}

// Team management functions
function showAddTeamModal() {
    console.log('showAddTeamModal called');
    // Reset for adding new team
    currentTeamId = null;
    
    // Get modal element
    const modalElement = document.getElementById('addTeamModal');
    if (!modalElement) {
        console.error('addTeamModal element not found');
        return;
    }
    
    // Clear any stored weeklyPayments data (from previous edit)
    if (modalElement.dataset.weeklyPayments) {
        delete modalElement.dataset.weeklyPayments;
    }
    
    // Reset modal title and button (with null checks)
    const modalTitle = modalElement.querySelector('.modal-title');
    const modalPrimaryBtn = modalElement.querySelector('.modal-footer .btn-primary');
    if (modalTitle) modalTitle.textContent = 'Add New Team';
    if (modalPrimaryBtn) {
        modalPrimaryBtn.textContent = 'Add Team';
        modalPrimaryBtn.setAttribute('onclick', 'addTeam()');
    }
    
    // Hide tabs when adding new team
    const teamModalTabs = document.getElementById('teamModalTabs');
    if (teamModalTabs) {
        teamModalTabs.style.display = 'none';
    }
    
    // Make sure we're on the first tab
    const teamDetailsTab = document.getElementById('teamDetailsTab');
    const teamActionsTab = document.getElementById('teamActionsTab');
    if (teamDetailsTab && teamActionsTab) {
        teamDetailsTab.classList.add('active');
        teamActionsTab.classList.remove('active');
        const teamDetailsPane = document.getElementById('teamDetailsPane');
        const teamActionsPane = document.getElementById('teamActionsPane');
        if (teamDetailsPane) teamDetailsPane.classList.add('show', 'active');
        if (teamActionsPane) teamActionsPane.classList.remove('show', 'active');
    }
    
    // Hide join date field (only shown when editing)
    const joinDateContainer = document.getElementById('teamJoinDateContainer');
    if (joinDateContainer) {
        joinDateContainer.style.display = 'none';
    }
    
    // Reset form
    try {
        const form = document.getElementById('addTeamForm');
        if (form) form.reset();
    } catch (e) {
        console.warn('Error resetting form:', e);
    }
    
    // Clear team members and add one empty row
    try {
        const tbody = document.getElementById('teamMembersList');
        if (tbody) {
            tbody.innerHTML = '';
            if (typeof addTeamMember === 'function') {
                addTeamMember();
            }
        }
    } catch (e) {
        console.warn('Error setting up team members:', e);
    }
    
    // Populate division dropdown
    try {
        updateDivisionDropdown();
    } catch (e) {
        console.warn('Error updating division dropdown:', e);
    }
    
    // Update captain dropdown
    try {
        if (typeof updateCaptainDropdown === 'function') {
            updateCaptainDropdown();
        }
    } catch (e) {
        console.warn('Error updating captain dropdown:', e);
    }
    
    // Initialize tooltips for info icons in the modal
    initializeModalTooltips(modalElement);
    
    // Show modal (always show, even if setup had errors)
    console.log('Attempting to show addTeamModal');
    showModal(modalElement);
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
            updateCaptainDropdown();
        }
    }
}

function addTeamMember(name = '', email = '', bcaSanctionPaid = false, bcaPreviouslySanctioned = false, index = null) {
    const tbody = document.getElementById('teamMembersList');
    if (!tbody) {
        console.error('teamMembersList tbody not found');
        return;
    }
    
    // Create a table row instead of a div
    const newMemberRow = document.createElement('tr');
    newMemberRow.className = 'member-row';
    
    // Format the name if it's provided
    const formattedName = name ? formatPlayerName(name) : '';
    
    // Create a unique identifier for this player's radio buttons
    // Use the player name if available, otherwise use index or timestamp
    const uniqueId = formattedName ? formattedName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : `player_${index || Date.now()}`;
    const radioName = `bcaSanctionPaid_${uniqueId}`;
    
    // Handle null/undefined email values - convert to empty string
    const emailValue = (email && email !== 'null' && email !== 'undefined') ? email : '';
    
    newMemberRow.innerHTML = `
        <td>
            <input type="text" class="form-control form-control-sm" placeholder="Player name" name="memberName" value="${formattedName}" oninput="updateCaptainDropdown()" onblur="handleNameInputBlur(this)">
        </td>
        <td>
            <input type="email" class="form-control form-control-sm" placeholder="Email (optional)" name="memberEmail" value="${emailValue}">
        </td>
        <td>
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
        </td>
        <td>
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeMember(this)" title="Remove member">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(newMemberRow);
    updateCaptainDropdown();
}

function removeMember(button) {
    button.closest('.member-row').remove();
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
    // This function is kept for backward compatibility but no longer displays anything
    // Dues are now calculated from division settings, not per-team inputs
    // The calculation div has been removed from the UI
}

async function addTeam() {
    // Get form elements with null checks
    const teamNameEl = document.getElementById('teamName');
    const divisionEl = document.getElementById('division');
    const teamLocationEl = document.getElementById('teamLocation');
    const captainNameInput = document.getElementById('captainName');
    const captainEmailEl = document.getElementById('captainEmail');
    const captainPhoneEl = document.getElementById('captainPhone');
    
    if (!teamNameEl || !divisionEl) {
        showAlertModal('Required form fields not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    const teamData = {
        teamName: teamNameEl.value.trim(),
        division: divisionEl.value,
        location: teamLocationEl ? teamLocationEl.value.trim() : '',
        teamMembers: []
    };
    
    // Validate required fields
    if (!teamData.teamName) {
        showAlertModal('Team name is required.', 'warning', 'Validation Error');
        return;
    }
    
    if (!teamData.division) {
        showAlertModal('Division is required.', 'warning', 'Validation Error');
        return;
    }
    
    // Add captain as first member
    const captainName = captainNameInput ? captainNameInput.value.trim() : '';
    const captainEmail = captainEmailEl ? captainEmailEl.value.trim() : '';
    const captainPhone = captainPhoneEl ? captainPhoneEl.value.trim() : '';
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
            // Reset to page 1 when adding a new team
            await loadData(true);
            showAlertModal('Team added successfully!', 'success', 'Success');
        } else {
            const error = await response.json();
            showAlertModal(error.message || 'Error adding team', 'error', 'Error');
        }
    } catch (error) {
        showAlertModal('Error adding team. Please try again.', 'error', 'Error');
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
    
    const paymentForm = document.getElementById('paymentForm');
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentModal = document.getElementById('paymentModal');
    
    if (!paymentForm || !paymentMethodEl || !paymentModal) {
        showAlertModal('Payment form elements not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    paymentForm.reset();
    paymentMethodEl.value = 'Cash';
    
    // Find the team to get division info
    const team = teams.find(t => t._id === teamId);
    if (team) {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (teamDivision) {
            populatePaymentAmountDropdown(team, teamDivision);
        }
    }
    
    new bootstrap.Modal(paymentModal).show();
}

function populatePaymentAmountDropdown(team, teamDivision) {
    const paymentAmountSelect = document.getElementById('paymentAmount');
    if (!paymentAmountSelect) {
        console.error('Payment amount select not found');
        return;
    }
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
    const paymentAmountEl = document.getElementById('paymentAmount');
    if (!paymentAmountEl) return;
    const selectedAmount = paymentAmountEl.value;
    // You can add any additional logic here if needed
}

async function recordPayment() {
    if (!currentTeamId) {
        showAlertModal('No team selected for payment.', 'error', 'Error');
        return;
    }
    
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentAmountEl = document.getElementById('paymentAmount');
    const paymentNotesEl = document.getElementById('paymentNotes');
    
    if (!paymentMethodEl || !paymentAmountEl) {
        showAlertModal('Payment form fields not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    const paymentData = {
        paymentMethod: paymentMethodEl.value,
        amount: paymentAmountEl.value,
        notes: paymentNotesEl ? paymentNotesEl.value : ''
    };
    
    // Validate required fields
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        showAlertModal('Please select a valid payment amount.', 'warning', 'Validation Error');
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${currentTeamId}/pay-dues`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            const paymentModal = document.getElementById('paymentModal');
            if (paymentModal) {
                const modalInstance = bootstrap.Modal.getInstance(paymentModal);
                if (modalInstance) modalInstance.hide();
            }
            
            // Preserve current division filter and pagination before reloading data
            const divisionFilterEl = document.getElementById('divisionFilter');
            const currentDivisionFilter = divisionFilterEl ? divisionFilterEl.value : 'all';
            
            // Preserve current page when recording payment (team stays in same position)
            await loadData(false);
            
            // Restore the division filter after data is reloaded
            if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                const restoredFilterEl = document.getElementById('divisionFilter');
                if (restoredFilterEl) {
                    restoredFilterEl.value = currentDivisionFilter;
                    await filterTeamsByDivision();
                }
            }
            
            showAlertModal('Payment recorded successfully!', 'success', 'Success');
        } else {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(error.message || 'Error recording payment', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        showAlertModal('Error recording payment. Please try again.', 'error', 'Error');
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
            // Preserve current page when marking as unpaid
            await loadData(false);
            showAlertModal('Team marked as unpaid', 'success', 'Success');
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error updating team status', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error updating team status:', error);
        showAlertModal('Error updating team status. Please try again.', 'error', 'Error');
    }
}

async function editTeam(teamId) {
    try {
        // Find the team to edit
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found for editing:', teamId);
            showAlertModal('Team not found.', 'error', 'Error');
            return;
        }
        
        // Set the current team ID for editing
        currentTeamId = teamId;
        
        // Store the team's weeklyPayments to preserve them during update
        // Store in a data attribute on the modal so we can access it in updateTeam
        const modal = document.getElementById('addTeamModal');
        if (!modal) {
            console.error('Add team modal not found!');
            showAlertModal('Team editor modal not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        
        if (team.weeklyPayments) {
            modal.dataset.weeklyPayments = JSON.stringify(team.weeklyPayments);
        } else {
            modal.dataset.weeklyPayments = JSON.stringify([]);
        }
        
        // Update modal title and button (with null checks)
        const modalTitle = modal.querySelector('.modal-title');
        const modalPrimaryBtn = modal.querySelector('.modal-footer .btn-primary');
        
        if (modalTitle) modalTitle.textContent = 'Edit Team';
        if (modalPrimaryBtn) {
            modalPrimaryBtn.textContent = 'Update Team';
            modalPrimaryBtn.setAttribute('onclick', 'updateTeam()');
        }
        
        // Show tabs when editing
        const teamModalTabs = document.getElementById('teamModalTabs');
        if (teamModalTabs) {
            teamModalTabs.style.display = 'flex';
        }
    
    // Populate division dropdown first
    updateDivisionDropdown();
    
    // Populate form with team data (with null checks)
    const teamNameEl = document.getElementById('teamName');
    const divisionEl = document.getElementById('division');
    const captainEmailEl = document.getElementById('captainEmail');
    const captainPhoneEl = document.getElementById('captainPhone');
    const teamLocationEl = document.getElementById('teamLocation');
    
    if (teamNameEl) teamNameEl.value = team.teamName || '';
    if (divisionEl) {
        // Set the value after dropdown is populated
        divisionEl.value = team.division || '';
        // Update title attribute to show full text on hover
        const selectedOption = divisionEl.options[divisionEl.selectedIndex];
        if (selectedOption && selectedOption.value) {
            divisionEl.title = selectedOption.textContent || '';
        }
    }
    if (captainEmailEl) captainEmailEl.value = team.teamMembers && team.teamMembers[0] ? (team.teamMembers[0].email || '') : '';
    if (captainPhoneEl) captainPhoneEl.value = team.teamMembers && team.teamMembers[0] ? (team.teamMembers[0].phone || '') : '';
    if (teamLocationEl) teamLocationEl.value = team.location || '';
    
    // Show and populate join date (read-only)
    const joinDateContainer = document.getElementById('teamJoinDateContainer');
    const joinDateInput = document.getElementById('teamJoinDate');
    if (joinDateContainer && joinDateInput) {
        if (team.createdAt || team.created_at) {
            const joinDate = team.createdAt || team.created_at;
            const dateObj = new Date(joinDate);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            joinDateInput.value = formattedDate;
            joinDateContainer.style.display = 'block';
        } else {
            joinDateContainer.style.display = 'none';
        }
    }
    
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
    
    // Clear only the tbody, not the entire container (which includes the table structure)
    const tbody = document.getElementById('teamMembersList');
    if (tbody) {
        tbody.innerHTML = '';
    } else {
        console.error('teamMembersList tbody not found!');
        showAlertModal('Team members table not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
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
    
    // Initialize tooltips for info icons
    const modalElement = document.getElementById('addTeamModal');
    if (modalElement) {
        initializeModalTooltips(modalElement);
        
        // Show the modal
        new bootstrap.Modal(modalElement).show();
    } else {
        console.error('Add team modal not found!');
        showAlertModal('Team editor modal not found. Please refresh the page.', 'error', 'Error');
    }
    } catch (error) {
        console.error('Error editing team:', error);
        showAlertModal('Error opening team editor. Please try again.', 'error', 'Error');
    }
}

async function updateTeam() {
    // Get form elements with null checks
    const teamNameEl = document.getElementById('teamName');
    const divisionEl = document.getElementById('division');
    const teamLocationEl = document.getElementById('teamLocation');
    const captainNameInput = document.getElementById('captainName');
    
    if (!teamNameEl || !divisionEl || !currentTeamId) {
        showAlertModal('Required form fields not found or no team selected. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    const teamData = {
        teamName: teamNameEl.value.trim(),
        division: divisionEl.value,
        location: teamLocationEl ? teamLocationEl.value.trim() : '',
        teamMembers: []
    };
    
    // Validate required fields
    if (!teamData.teamName) {
        showAlertModal('Team name is required.', 'warning', 'Validation Error');
        return;
    }
    
    if (!teamData.division) {
        showAlertModal('Division is required.', 'warning', 'Validation Error');
        return;
    }
    
    // Get captain info from dropdown
    const captainName = captainNameInput ? captainNameInput.value.trim() : '';
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
            // Preserve current page when updating (team stays in same position)
            await loadData(false);
            showAlertModal('Team updated successfully!', 'success', 'Success');
        } else {
            const error = await response.json();
            showAlertModal(error.message || 'Error updating team', 'error', 'Error');
        }
    } catch (error) {
        showAlertModal('Error updating team. Please try again.', 'error', 'Error');
    }
}

async function deleteTeam(teamId) {
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            showAlertModal('Team not found.', 'error', 'Error');
            return;
        }
        
        // Use browser confirm for deletion confirmation
        const confirmed = confirm(`Are you sure you want to delete the team "${team.teamName}"?\n\nThis action cannot be undone and will remove all team data including payment history.`);
        
        if (!confirmed) {
            return; // User cancelled
        }
        
        // Show loading message
        showLoadingMessage('Deleting team...');
        
        try {
            const response = await apiCall(`/teams/${teamId}`, {
                method: 'DELETE'
            });
            
            hideLoadingMessage();
            
            if (response.ok) {
                // Check if we need to go back a page after deletion
                // If current page would be empty after deletion, go to previous page
                const teamsOnCurrentPage = teams.filter(team => !team.isArchived && team.isActive !== false).length;
                if (teamsOnCurrentPage <= 1 && currentPage > 1) {
                    currentPage = currentPage - 1;
                }
                
                // Show success message
                showAlertModal(`Team "${team.teamName}" deleted successfully!`, 'success', 'Success');
                
                // Reload data to refresh the teams list (preserve pagination, but adjust if needed)
                await loadData(false);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                showAlertModal(errorData.message || 'Error deleting team. Please try again.', 'error', 'Error');
            }
        } catch (error) {
            hideLoadingMessage();
            console.error('Error deleting team:', error);
            showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error in deleteTeam:', error);
        showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
    }
}

// Remove team from division (keeps team in system, just removes division assignment)
async function removeTeamFromDivision() {
    if (!currentTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === currentTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    const confirmed = confirm(`Remove "${team.teamName}" from its current division?\n\nThe team will remain in the system but will not be associated with any division. You can reassign it to a different division later.`);
    
    if (!confirmed) return;
    
    try {
        showLoadingMessage('Removing team from division...');
        
        // Get the full team data and update division
        const teamUpdateData = {
            teamName: team.teamName || '',
            division: null, // Remove from division
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
            isActive: false // Mark as inactive when removed from division
        };
        
        // Update team to remove division assignment
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            showAlertModal(`Team "${team.teamName}" has been removed from its division.`, 'success', 'Success');
            // Close modal and reload data
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            await loadData();
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error removing team from division.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error removing team from division:', error);
        showAlertModal('Error removing team from division. Please try again.', 'error', 'Error');
    }
}

// Archive team (soft delete - marks as archived but keeps data)
async function archiveTeam() {
    if (!currentTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === currentTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    const confirmed = confirm(`Archive "${team.teamName}"?\n\nThe team and all its data will be hidden from the main view but preserved in the system. You can restore it later if needed.`);
    
    if (!confirmed) return;
    
    try {
        showLoadingMessage('Archiving team...');
        
        // Get the full team data and add archive fields
        // The backend expects the full team object with all required fields
        const teamUpdateData = {
            teamName: team.teamName || '',
            division: team.division || null,
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
            // Add archive fields - these will be passed through if backend supports them
            isArchived: true,
            isActive: false,
            archivedAt: new Date().toISOString()
        };
        
        // Update team to mark as archived
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            const updatedTeam = await response.json().catch(() => null);
            console.log('✅ Team archived successfully. Response:', updatedTeam);
            
            // Update the team in the local array immediately
            if (updatedTeam && updatedTeam._id) {
                const teamIndex = teams.findIndex(t => t._id === updatedTeam._id);
                if (teamIndex !== -1) {
                    teams[teamIndex] = updatedTeam;
                    console.log('✅ Updated team in local array:', teams[teamIndex]);
                }
            }
            
            showAlertModal(`Team "${team.teamName}" has been archived.`, 'success', 'Success');
            // Close modal and reload data
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            await loadData();
            
            // Refresh archived teams modal if it's open
            const archivedModal = document.getElementById('archivedTeamsModal');
            if (archivedModal && archivedModal.classList.contains('show')) {
                showArchivedTeamsModal();
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('❌ Error archiving team:', errorData);
            showAlertModal(errorData.message || 'Error archiving team.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error archiving team:', error);
        showAlertModal('Error archiving team. Please try again.', 'error', 'Error');
    }
}

// Permanently delete team (hard delete - removes all data)
// Can be called from edit modal (no teamId param) or from archived teams modal (with teamId param)
async function permanentlyDeleteTeam(teamId = null) {
    const targetTeamId = teamId || currentTeamId;
    
    if (!targetTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === targetTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    // Show confirmation modal instead of browser confirm
    showPermanentDeleteConfirmModal(team, targetTeamId);
}

// Show permanent delete confirmation modal (two-step confirmation)
function showPermanentDeleteConfirmModal(team, teamId) {
    const modal = document.getElementById('permanentDeleteConfirmModal');
    const step1 = document.getElementById('permanentDeleteStep1');
    const step2 = document.getElementById('permanentDeleteStep2');
    const teamName1 = document.getElementById('permanentDeleteTeamName1');
    const teamName2 = document.getElementById('permanentDeleteTeamName2');
    const confirmBtn = document.getElementById('permanentDeleteConfirmBtn');
    const cancelBtn = document.getElementById('permanentDeleteCancelBtn');
    
    if (!modal || !step1 || !step2 || !teamName1 || !teamName2 || !confirmBtn || !cancelBtn) {
        // Fallback to browser confirm if modal elements not found
        const confirmed = confirm(`PERMANENTLY DELETE "${team.teamName}"?\n\n⚠️ WARNING: This will permanently delete the team and ALL associated data including:\n- Payment history\n- Team members\n- All records\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`);
        if (confirmed) {
            const doubleConfirmed = confirm(`FINAL CONFIRMATION:\n\nYou are about to PERMANENTLY DELETE "${team.teamName}".\n\nThis is your last chance to cancel.`);
            if (doubleConfirmed) {
                executePermanentDelete(team, teamId);
            }
        }
        return;
    }
    
    // Set team name in both steps
    teamName1.textContent = `"${team.teamName}"`;
    teamName2.textContent = `"${team.teamName}"`;
    
    // Reset to step 1
    step1.style.display = 'block';
    step2.style.display = 'none';
    confirmBtn.textContent = 'Continue to Final Confirmation';
    confirmBtn.onclick = () => {
        // Move to step 2
        step1.style.display = 'none';
        step2.style.display = 'block';
        confirmBtn.innerHTML = '<i class="fas fa-trash-alt me-2"></i>Yes, Delete Permanently';
        confirmBtn.onclick = () => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            executePermanentDelete(team, teamId);
        };
    };
    
    // Cancel button closes modal
    cancelBtn.onclick = () => {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    };
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Execute the permanent delete after confirmations
async function executePermanentDelete(team, teamId) {
    try {
        showLoadingMessage('Permanently deleting team...');
        
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'DELETE'
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            showAlertModal(`Team "${team.teamName}" has been permanently deleted.`, 'success', 'Success');
            
            // Close modals if open
            const addTeamModal = bootstrap.Modal.getInstance(document.getElementById('addTeamModal'));
            if (addTeamModal) addTeamModal.hide();
            
            // Reload data
            await loadData();
            
            // Refresh archived teams modal if it's open
            const archivedModal = document.getElementById('archivedTeamsModal');
            if (archivedModal && archivedModal.classList.contains('show')) {
                showArchivedTeamsModal();
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error deleting team.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error permanently deleting team:', error);
        showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
    }
}

// Render archived teams table
function renderArchivedTeamsTable(archivedTeamsToRender) {
    const tbody = document.getElementById('archivedTeamsTableBody');
    const noArchivedTeams = document.getElementById('noArchivedTeams');
    
    if (!tbody) {
        console.error('Archived teams table body not found!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (archivedTeamsToRender.length === 0) {
        if (noArchivedTeams) noArchivedTeams.style.display = 'block';
        tbody.innerHTML = '';
    } else {
        if (noArchivedTeams) noArchivedTeams.style.display = 'none';
        
        archivedTeamsToRender.forEach(team => {
            const row = document.createElement('tr');
            
            // Get division name
            const divisionName = team.division || 'No Division';
            
            // Get captain name
            const captainName = team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : 'N/A');
            const formattedCaptainName = captainName && captainName !== 'N/A' ? formatPlayerName(captainName) : captainName;
            
            // Get member count
            const memberCount = team.teamMembers ? team.teamMembers.length : 0;
            
            // Get archived date (if available)
            let archivedDate = '-';
            if (team.archivedAt) {
                try {
                    const date = new Date(team.archivedAt);
                    archivedDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                } catch (e) {
                    console.warn('Error formatting archived date:', e);
                }
            } else if (team.updatedAt) {
                // Fallback to updatedAt if archivedAt not available
                try {
                    const date = new Date(team.updatedAt);
                    archivedDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                } catch (e) {
                    console.warn('Error formatting updated date:', e);
                }
            }
            
            row.innerHTML = `
                <td><strong>${(team.teamName || '').replace(/</g, '&lt;')}</strong></td>
                <td>${(divisionName || '-').replace(/</g, '&lt;')}</td>
                <td>${(formattedCaptainName || '-').replace(/</g, '&lt;')}</td>
                <td>${memberCount}</td>
                <td><small class="text-muted">${archivedDate}</small></td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="restoreArchivedTeam('${team._id}')" title="Restore Team">
                        <i class="fas fa-undo me-1"></i>Restore
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="permanentlyDeleteTeam('${team._id}')" title="Permanently Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Show archived teams modal
async function showArchivedTeamsModal() {
    try {
        console.log('🔍 Showing archived teams modal. Current teams in memory:', teams.length);
        
        // Save current pagination state
        const savedPage = currentPage;
        const savedPerPage = teamsPerPage;
        const savedTeams = [...teams]; // Save current teams array
        
        // Load ALL teams (including archived) to get complete list
        await loadAllTeamsForArchivedModal();
        
        console.log('🔍 Total teams after loading all:', teams.length);
        console.log('🔍 Teams archive status:', teams.map(t => ({ 
            name: t.teamName, 
            isArchived: t.isArchived, 
            isActive: t.isActive 
        })));
        
        // Get all archived teams (explicitly check for isArchived === true)
        const archivedTeams = teams.filter(team => {
            const isArchived = team.isArchived === true;
            const isInactive = team.isActive === false;
            return isArchived || (isInactive && team.isArchived !== false);
        });
        
        console.log('🔍 Found archived teams:', archivedTeams.length, archivedTeams.map(t => t.teamName));
        
        // Cache the archived teams for sorting
        cachedArchivedTeams = [...archivedTeams];
        
        // Apply current sort if any
        let teamsToRender = [...cachedArchivedTeams];
        if (archivedTeamsSortColumn) {
            teamsToRender = sortArchivedTeamsData(teamsToRender, archivedTeamsSortColumn, archivedTeamsSortDirection);
        }
        
        // Render the table
        renderArchivedTeamsTable(teamsToRender);
        
        // Update sort icons
        updateArchivedTeamsSortIcons();
        
        // Show the modal
        const modal = document.getElementById('archivedTeamsModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            
            // Restore pagination state when modal is hidden
            modal.addEventListener('hidden.bs.modal', function restorePaginationState() {
                // Restore saved state
                currentPage = savedPage;
                teamsPerPage = savedPerPage;
                teams = savedTeams;
                
                // Reload the current page to restore main display
                loadTeams(savedPage, savedPerPage).then(() => {
                    const divisionFilterEl = document.getElementById('divisionFilter');
                    const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
                    if (selectedDivision && selectedDivision !== 'all') {
                        filterTeamsByDivision();
                    } else {
                        displayTeams(filteredTeams);
                    }
                });
                
                // Remove this listener after first use
                modal.removeEventListener('hidden.bs.modal', restorePaginationState);
            }, { once: true });
            
            bsModal.show();
        } else {
            console.error('Archived teams modal not found!');
            showAlertModal('Archived teams modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error showing archived teams:', error);
        showAlertModal('Error loading archived teams. Please try again.', 'error', 'Error');
    }
}

// Load all teams (including archived) for the archived teams modal
async function loadAllTeamsForArchivedModal() {
    try {
        // Load all teams including archived with a very high limit
        // Use includeArchived=true query parameter to get archived teams
        const response = await apiCall('/teams?page=1&limit=10000&includeArchived=true');
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading all teams for archived modal');
            return;
        }
        
        if (!response.ok) {
            console.warn('⚠️ Failed to load all teams for archived modal:', response.status);
            return;
        }
        
        const responseData = await response.json();
        
        // Handle both old format (array) and new format (object with pagination)
        let allTeamsData;
        if (Array.isArray(responseData)) {
            allTeamsData = responseData;
        } else {
            allTeamsData = responseData.teams || [];
        }
        
        // Store all teams (including archived) in the global teams array temporarily
        // This doesn't affect the main display since we filter in displayTeams()
        teams = allTeamsData;
        
        console.log('✅ Loaded all teams for archived modal:', allTeamsData.length, '(including archived)');
    } catch (error) {
        console.error('❌ Error loading all teams for archived modal:', error);
    }
}

// Sort archived teams
function sortArchivedTeams(column) {
    // Toggle sort direction if clicking the same column, otherwise default to ascending
    if (archivedTeamsSortColumn === column) {
        archivedTeamsSortDirection = archivedTeamsSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        archivedTeamsSortColumn = column;
        archivedTeamsSortDirection = 'asc';
    }
    
    // Sort the cached archived teams
    const sortedTeams = sortArchivedTeamsData([...cachedArchivedTeams], archivedTeamsSortColumn, archivedTeamsSortDirection);
    
    // Re-render the table
    renderArchivedTeamsTable(sortedTeams);
    
    // Update sort icons
    updateArchivedTeamsSortIcons();
}

// Sort archived teams data
function sortArchivedTeamsData(teamsToSort, column, direction) {
    const sorted = [...teamsToSort];
    sorted.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
            case 'teamName':
                aValue = (a.teamName || '').toLowerCase();
                bValue = (b.teamName || '').toLowerCase();
                break;
            case 'division':
                aValue = (a.division || 'No Division').toLowerCase();
                bValue = (b.division || 'No Division').toLowerCase();
                break;
            case 'captain': {
                const aCaptain = a.captainName || (a.teamMembers && a.teamMembers[0] ? a.teamMembers[0].name : 'N/A');
                const bCaptain = b.captainName || (b.teamMembers && b.teamMembers[0] ? b.teamMembers[0].name : 'N/A');
                aValue = (aCaptain || 'N/A').toLowerCase();
                bValue = (bCaptain || 'N/A').toLowerCase();
                break;
            }
            case 'members':
                aValue = (a.teamMembers ? a.teamMembers.length : 0);
                bValue = (b.teamMembers ? b.teamMembers.length : 0);
                break;
            case 'archivedDate': {
                // Sort by archived date (use archivedAt if available, otherwise updatedAt)
                const aDate = a.archivedAt ? new Date(a.archivedAt) : (a.updatedAt ? new Date(a.updatedAt) : new Date(0));
                const bDate = b.archivedAt ? new Date(b.archivedAt) : (b.updatedAt ? new Date(b.updatedAt) : new Date(0));
                aValue = aDate.getTime();
                bValue = bDate.getTime();
                break;
            }
            default:
                return 0;
        }
        
        // Compare values
        if (aValue < bValue) {
            return direction === 'asc' ? -1 : 1;
        } else if (aValue > bValue) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    return sorted;
}

// Update sort icons in archived teams table headers
function updateArchivedTeamsSortIcons() {
    // Reset all icons
    const columns = ['teamName', 'division', 'captain', 'members', 'archivedDate'];
    columns.forEach(col => {
        const icon = document.getElementById(`sortIcon-${col}`);
        if (icon) {
            icon.className = 'fas fa-sort text-muted';
        }
    });
    
    // Set icon for current sort column
    if (archivedTeamsSortColumn) {
        const icon = document.getElementById(`sortIcon-${archivedTeamsSortColumn}`);
        if (icon) {
            if (archivedTeamsSortDirection === 'asc') {
                icon.className = 'fas fa-sort-up text-primary';
            } else {
                icon.className = 'fas fa-sort-down text-primary';
            }
        }
    }
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

// Check if user has Pro or Enterprise plan
async function canExport() {
    try {
        const response = await apiCall('/profile');
        if (!response.ok) {
            return false;
        }
        
        const data = await response.json();
        const subscriptionStatus = data.subscriptionStatus || {};
        const plan = data.subscriptionPlan || {};
        const effectiveTier = subscriptionStatus.effectiveTier || plan.tier || subscriptionStatus.tier || 'free';
        
        // Allow export for pro and enterprise plans
        return effectiveTier === 'pro' || effectiveTier === 'enterprise';
    } catch (error) {
        console.error('Error checking export permission:', error);
        return false;
    }
}

// Check export access and show/hide export button
async function checkExportAccess() {
    try {
        // Find export button by onclick attribute or by text content
        const exportButton = document.querySelector('button[onclick*="showExportModal"]') || 
                            Array.from(document.querySelectorAll('button')).find(btn => 
                                btn.textContent.includes('Export') || btn.getAttribute('title') === 'Export Data'
                            );
        
        if (!exportButton) {
            console.log('Export button not found, will check again later');
            return;
        }
        
        const hasAccess = await canExport();
        if (!hasAccess) {
            exportButton.style.display = 'none';
            console.log('Export button hidden - user does not have Pro/Enterprise plan');
        } else {
            exportButton.style.display = '';
            console.log('Export button visible - user has Pro/Enterprise plan');
        }
    } catch (error) {
        console.error('Error checking export access:', error);
    }
}

// Get current subscription tier
async function getSubscriptionTier() {
    try {
        const response = await apiCall('/profile');
        if (!response.ok) {
            return 'free';
        }
        
        const data = await response.json();
        const subscriptionStatus = data.subscriptionStatus || {};
        const plan = data.subscriptionPlan || {};
        return subscriptionStatus.effectiveTier || plan.tier || subscriptionStatus.tier || 'free';
    } catch (error) {
        console.error('Error getting subscription tier:', error);
        return 'free';
    }
}

// Show export modal
async function showExportModal() {
    // Check if user has access to export
    const hasAccess = await canExport();
    
    if (!hasAccess) {
        const tier = await getSubscriptionTier();
        showAlertModal(
            `Export functionality is available for Pro and Enterprise plans only.\n\nYour current plan: ${tier.charAt(0).toUpperCase() + tier.slice(1)}\n\nPlease upgrade to Pro or Enterprise to export your data to CSV, Excel, or PDF.`,
            'info',
            'Upgrade Required'
        );
        return;
    }
    try {
        // Populate division filter
        const divisionFilter = document.getElementById('exportDivisionFilter');
        if (divisionFilter) {
            divisionFilter.innerHTML = '<option value="">All Divisions</option>';
            divisions.forEach(div => {
                if (div.isActive !== false && (!div.description || div.description !== 'Temporary')) {
                    const option = document.createElement('option');
                    option.value = div.name;
                    option.textContent = div.name;
                    divisionFilter.appendChild(option);
                }
            });
        }
        
        // Show the modal
        const modal = document.getElementById('exportModal');
        if (modal) {
            new bootstrap.Modal(modal).show();
        } else {
            console.error('Export modal not found!');
            showAlertModal('Export modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error showing export modal:', error);
        showAlertModal('Error opening export dialog. Please try again.', 'error', 'Error');
    }
}

// Execute export based on selected options
function executeExport() {
    try {
        // Get selected format
        const formatInput = document.querySelector('input[name="exportFormat"]:checked');
        const format = formatInput ? formatInput.value : 'csv';
        
        // Get selected data types
        const exportTeams = document.getElementById('exportTeams').checked;
        const exportPayments = document.getElementById('exportPayments').checked;
        const exportFinancial = document.getElementById('exportFinancial').checked;
        const exportPlayers = document.getElementById('exportPlayers').checked;
        const exportDivisions = document.getElementById('exportDivisions').checked;
        
        // Get filter options (with null checks)
        const divisionFilterEl = document.getElementById('exportDivisionFilter');
        const includeArchivedEl = document.getElementById('exportIncludeArchived');
        const divisionFilter = divisionFilterEl ? divisionFilterEl.value : '';
        const includeArchived = includeArchivedEl ? includeArchivedEl.checked : false;
        
        // Check if at least one data type is selected
        if (!exportTeams && !exportPayments && !exportFinancial && !exportPlayers && !exportDivisions) {
            showAlertModal('Please select at least one data type to export.', 'warning', 'No Selection');
            return;
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
        if (modal) modal.hide();
        
        // Show loading message
        showLoadingMessage('Preparing export...');
        
        // Prepare data based on selections
        const exportData = {};
        
        if (exportTeams) {
            exportData.teams = prepareTeamsData(divisionFilter, includeArchived);
        }
        
        if (exportPayments) {
            exportData.payments = preparePaymentsData(divisionFilter, includeArchived);
        }
        
        if (exportFinancial) {
            exportData.financial = prepareFinancialData(divisionFilter);
        }
        
        if (exportPlayers) {
            exportData.players = preparePlayersData(divisionFilter, includeArchived);
        }
        
        if (exportDivisions) {
            exportData.divisions = prepareDivisionsData();
        }
        
        // Export based on format
        setTimeout(() => {
            hideLoadingMessage();
            
            switch(format) {
                case 'csv':
                    exportToCSV(exportData);
                    break;
                case 'excel':
                    exportToExcel(exportData);
                    break;
                case 'pdf':
                    exportToPDF(exportData);
                    break;
                default:
                    exportToCSV(exportData);
            }
        }, 500);
        
    } catch (error) {
        hideLoadingMessage();
        console.error('Error executing export:', error);
        showAlertModal('Error exporting data. Please try again.', 'error', 'Error');
    }
}

// Prepare teams data for export
function prepareTeamsData(divisionFilter, includeArchived) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
    }
    
    return teamsToExport.map(team => {
        const teamMembers = (team.teamMembers || []).map(m => m.name).join('; ');
        const weeklyPayments = (team.weeklyPayments || []).map(wp => 
            `Week ${wp.week}: ${wp.paid === 'true' ? 'Paid' : wp.paid === 'bye' ? 'Bye' : wp.paid === 'makeup' ? 'Makeup' : 'Unpaid'}`
        ).join('; ');
        
        return {
            'Team Name': team.teamName || '',
            'Division': team.division || '',
            'Location': team.location || '',
            'Captain': team.captainName || '',
            'Captain Email': team.captainEmail || '',
            'Captain Phone': team.captainPhone || '',
            'Team Members': teamMembers,
            'Member Count': team.teamMembers ? team.teamMembers.length : 0,
            'Dues Rate': formatCurrency(team.divisionDuesRate || 0),
            'Total Weeks': team.totalWeeks || 0,
            'Dues Amount': formatCurrency(team.duesAmount || 0),
            'Dues Paid': team.duesPaid ? 'Yes' : 'No',
            'Payment Date': team.paymentDate ? formatDateFromISO(team.paymentDate) : '',
            'Payment Method': team.paymentMethod || '',
            'Weekly Payments': weeklyPayments,
            'Notes': team.notes || '',
            'Created': team.createdAt ? formatDateFromISO(team.createdAt) : '',
            'Updated': team.updatedAt ? formatDateFromISO(team.updatedAt) : ''
        };
    });
}

// Prepare payments data for export
function preparePaymentsData(divisionFilter, includeArchived) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
    }
    
    const payments = [];
    teamsToExport.forEach(team => {
        if (team.weeklyPayments && team.weeklyPayments.length > 0) {
            team.weeklyPayments.forEach(payment => {
                payments.push({
                    'Team Name': team.teamName || '',
                    'Division': team.division || '',
                    'Week': payment.week || '',
                    'Status': payment.paid === 'true' ? 'Paid' : payment.paid === 'bye' ? 'Bye Week' : payment.paid === 'makeup' ? 'Makeup' : 'Unpaid',
                    'Amount': formatCurrency(payment.amount || 0),
                    'Payment Date': payment.paymentDate ? formatDateFromISO(payment.paymentDate) : '',
                    'Payment Method': payment.paymentMethod || '',
                    'Notes': payment.notes || '',
                    'Sanction Players': Array.isArray(payment.bcaSanctionPlayers) ? payment.bcaSanctionPlayers.join('; ') : ''
                });
            });
        }
    });
    
    return payments;
}

// Prepare financial data for export
function prepareFinancialData(divisionFilter) {
    // Calculate financial summary
    let teamsToCalculate = teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToCalculate = teamsToCalculate.filter(t => t.division === divisionFilter);
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
function preparePlayersData(divisionFilter, includeArchived) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
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

function refreshData() {
    loadData();
}

// Division management functions
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
            
            // Calculate day of play from division start date
            let dayOfPlay = '';
            if (division.startDate) {
                try {
                    const [year, month, day] = division.startDate.split('T')[0].split('-').map(Number);
                    const startDate = new Date(year, month - 1, day);
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    dayOfPlay = dayNames[startDate.getDay()];
                } catch (e) {
                    console.warn('Error calculating day of play for division:', division.name, e);
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
    
    // Add change event listener to update title attribute with full text
    const changeHandler = function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.value) {
            this.title = selectedOption.textContent || selectedOption.title || '';
            // Also set a data attribute for reference
            this.setAttribute('data-full-text', selectedOption.textContent || '');
        } else {
            this.title = '';
            this.removeAttribute('data-full-text');
        }
    };
    
    divisionSelect.addEventListener('change', changeHandler);
    divisionSelect._changeListener = changeHandler; // Store reference for removal later
}

function showDivisionManagement() {
    console.log('showDivisionManagement called');
    loadDivisions();
    displayDivisions();
    const modalElement = document.getElementById('divisionManagementModal');
    if (!modalElement) {
        console.error('divisionManagementModal element not found');
        return;
    }
    
    const Bootstrap = getBootstrap();
    if (Bootstrap) {
        const modalInstance = Bootstrap.Modal.getOrCreateInstance(modalElement);
        
        // Initialize input visibility when modal is shown
        modalElement.addEventListener('shown.bs.modal', function() {
            // Set up event listeners for division name and game type fields to update preview message
            setupDivisionNameListeners();
            // Ensure date picker handlers are set up for any date inputs in this modal
            setupDatePickerHandlers();
            // Set initial visibility based on checked radio button
            const updateModeRadios = modalElement.querySelectorAll('input[name="updateMode"]:checked');
            const updateMode = updateModeRadios.length > 0 ? updateModeRadios[0].value : 'create';
            
            const createContainers = modalElement.querySelectorAll('#fargoUrlCreateContainer');
            const updateContainers = modalElement.querySelectorAll('#fargoUrlUpdateContainer');
            
            createContainers.forEach(container => {
                container.style.display = updateMode === 'create' ? 'block' : 'none';
            });
            updateContainers.forEach(container => {
                container.style.display = updateMode === 'update' ? 'block' : 'none';
            });
            
            // Calculate end date if start date and weeks are already set
            calculateSmartBuilderEndDate();
        }, { once: true });
        
        modalInstance.show();
    } else {
        // Fallback if Bootstrap not available
        showModal(modalElement);
    }
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
    document.getElementById('addDivisionModalTitle').textContent = 'Add New Division';
    const saveBtn = document.getElementById('saveDivisionBtn');
    if (saveBtn) {
        saveBtn.textContent = 'Add Division';
        saveBtn.setAttribute('onclick', 'addDivision()');
        saveBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Add Division';
    }
    document.getElementById('addDivisionForm').reset();
    document.getElementById('doublePlayOptions').style.display = 'none';
    
    // Reset calculation method to percentage
    const divisionMethodPercentage = document.getElementById('divisionMethodPercentage');
    const divisionMethodDollarAmount = document.getElementById('divisionMethodDollarAmount');
    if (divisionMethodPercentage) divisionMethodPercentage.checked = true;
    if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = false;
    
    // Reset saved method for new divisions (will use operator default)
    _savedDivisionUseDollarAmounts = currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false;
    
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
    
    // Set default dues per player per match from operator profile
    const duesPerPlayerPerMatchEl = document.getElementById('duesPerPlayerPerMatch');
    if (duesPerPlayerPerMatchEl && currentOperator && currentOperator.default_dues_per_player_per_match) {
        duesPerPlayerPerMatchEl.value = currentOperator.default_dues_per_player_per_match;
    } else if (duesPerPlayerPerMatchEl) {
        duesPerPlayerPerMatchEl.value = ''; // Reset if no default
    }
    
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
}

function editDivision(divisionId) {
    try {
        const division = divisions.find(d => d._id === divisionId);
        if (!division) {
            console.error('Division not found:', divisionId);
            return;
        }
    
    currentDivisionId = divisionId;
    document.getElementById('addDivisionModalTitle').textContent = 'Edit Division';
    const saveBtn = document.getElementById('saveDivisionBtn');
    if (saveBtn) {
        saveBtn.textContent = 'Update Division';
        saveBtn.setAttribute('onclick', 'updateDivision()');
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Division';
    }
    
    // Populate form with division data
    // Set division name
    const divisionNameEl = document.getElementById('divisionName');
    if (divisionNameEl) {
        // For double play divisions, parse the combined name into two separate division names
        if (division.isDoublePlay) {
            // For double play, we'll parse the name below
            // Don't set it here yet
        } else {
            // For regular divisions, extract just the name (remove game type if embedded)
            let divisionName = division.name || '';
            console.log('Setting division name:', divisionName, 'for division:', division);
            // Check if name contains " - " which might indicate game type is embedded
            if (divisionName.includes(' - ') && !divisionName.includes(' / ')) {
                // Extract just the name part before " - " (but only if it's not double play format)
                const dashIndex = divisionName.indexOf(' - ');
                divisionName = divisionName.substring(0, dashIndex).trim();
                console.log('Extracted division name (removed game type):', divisionName);
            }
            divisionNameEl.value = divisionName;
            console.log('Division name field value set to:', divisionNameEl.value);
        }
    } else {
        console.error('divisionName element not found!');
    }
    
    // Set game type (if field exists)
    // Try to extract game type from division name or use stored gameType field
    const gameTypeEl = document.getElementById('gameType');
    if (gameTypeEl) {
        let gameType = division.gameType || '';
        console.log('Initial gameType from division:', gameType);
        
        // If no gameType field, try to extract from name for regular divisions
        if (!gameType && !division.isDoublePlay && division.name) {
            // Check if name contains " - " with game type
            if (division.name.includes(' - ') && !division.name.includes(' / ')) {
                const parts = division.name.split(' - ');
                if (parts.length > 1) {
                    // Get the part after " - " which should be the game type
                    gameType = parts[1].trim();
                    console.log('Extracted gameType from name:', gameType);
                }
            }
        }
        
        if (gameType) {
            gameTypeEl.value = gameType;
            console.log('Game type field value set to:', gameTypeEl.value);
        } else {
            console.log('No game type found to set');
        }
    } else {
        console.error('gameType element not found!');
    }
    
    // Set matches per week (if field exists)
    const matchesPerWeekEl = document.getElementById('matchesPerWeek');
    if (matchesPerWeekEl && division.matchesPerWeek !== undefined) {
        matchesPerWeekEl.value = division.matchesPerWeek.toString();
    }
    
    // Set dues per player (may be divisionWeeklyDues or duesPerPlayerPerMatch)
    const duesPerPlayerEl = document.getElementById('divisionWeeklyDues') || document.getElementById('duesPerPlayerPerMatch');
    if (duesPerPlayerEl && division.duesPerPlayerPerMatch !== undefined) {
        duesPerPlayerEl.value = division.duesPerPlayerPerMatch.toString();
    }
    
    // Set players per week (if field exists)
    const playersPerWeekEl = document.getElementById('playersPerWeek');
    if (playersPerWeekEl && division.playersPerWeek !== undefined) {
        playersPerWeekEl.value = (division.playersPerWeek || 5).toString();
    }
    
    // Set number of teams (if field exists)
    const numberOfTeamsEl = document.getElementById('numberOfTeams');
    if (numberOfTeamsEl && division.numberOfTeams !== undefined) {
        numberOfTeamsEl.value = division.numberOfTeams.toString();
    }
    
    // Set total weeks
    const totalWeeksEl = document.getElementById('totalWeeks');
    if (totalWeeksEl && division.totalWeeks !== undefined) {
        totalWeeksEl.value = division.totalWeeks.toString();
    }
    // Parse dates correctly to avoid timezone issues
    const startDateInput = document.getElementById('divisionStartDate');
    if (startDateInput) {
        if (division.startDate) {
            const startDateStr = division.startDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
            startDateInput.value = startDateStr;
        } else {
            startDateInput.value = '';
        }
    }
    
    const endDateInput = document.getElementById('divisionEndDate');
    if (endDateInput) {
        if (division.endDate) {
            const endDateStr = division.endDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
            endDateInput.value = endDateStr;
        } else {
            endDateInput.value = '';
        }
    }
    
    // Show day of the week if start date exists (parse correctly to avoid timezone issues)
    if (division.startDate) {
        // Parse date string correctly to avoid timezone issues
        const dateStr = division.startDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
        const [year, month, day] = dateStr.split('-').map(Number);
        const start = new Date(year, month - 1, day); // month is 0-indexed
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[start.getDay()];
        const startDayNameEl = document.getElementById('startDayName');
        const startDateDayEl = document.getElementById('startDateDay');
        if (startDayNameEl) startDayNameEl.textContent = dayName;
        if (startDateDayEl) startDateDayEl.style.display = 'block';
    }
    
    // Set double play checkbox (if field exists) and toggle fields visibility
    const isDoublePlayEl = document.getElementById('isDoublePlay');
    if (isDoublePlayEl) {
        isDoublePlayEl.checked = division.isDoublePlay || false;
        // Call toggle function to show/hide the appropriate fields based on checkbox state
        toggleDoublePlayOptions();
    }
    
    // Set division description (if field exists)
    const divisionDescriptionEl = document.getElementById('divisionDescription');
    if (divisionDescriptionEl) {
        divisionDescriptionEl.value = division.description || '';
    }
    
    // Set division color (use stored color or generate default)
    const divisionColorInput = document.getElementById('divisionColor');
    if (divisionColorInput) {
        if (division.color) {
            divisionColorInput.value = division.color;
        } else {
            // Generate default color based on division name
            divisionColorInput.value = getDivisionColor(division.name);
        }
    }

    // Matches/week (new - default to 5 for backwards compatibility)
    const matchesPerWeekField = document.getElementById('matchesPerWeek');
    if (matchesPerWeekField) matchesPerWeekField.value = String(division.matchesPerWeek || 5);
    const firstMatchesField = document.getElementById('firstMatchesPerWeek');
    const secondMatchesField = document.getElementById('secondMatchesPerWeek');
    if (firstMatchesField) firstMatchesField.value = String(division.firstMatchesPerWeek || 5);
    if (secondMatchesField) secondMatchesField.value = String(division.secondMatchesPerWeek || 5);
    
    // Set calculation method based on division settings
    // Check if division has explicit setting (not null/undefined)
    const divisionHasExplicitSetting = (division.use_dollar_amounts !== undefined && division.use_dollar_amounts !== null) ||
                                       (division.useDollarAmounts !== undefined && division.useDollarAmounts !== null);
    
    // Get the division's setting (or operator default if not explicitly set)
    const divisionUsesDollarAmounts = divisionHasExplicitSetting
        ? (division.use_dollar_amounts !== undefined && division.use_dollar_amounts !== null
            ? division.use_dollar_amounts
            : division.useDollarAmounts)
        : (currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false);
    
    // Track saved method for active format indicator
    // If division has explicit setting, use it. Otherwise, it's using operator default (so saved = operator default)
    _savedDivisionUseDollarAmounts = divisionHasExplicitSetting
        ? (division.use_dollar_amounts !== undefined && division.use_dollar_amounts !== null
            ? division.use_dollar_amounts
            : division.useDollarAmounts)
        : (currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false);
    
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
    // Note: toggleDoublePlayOptions() is called above when setting the checkbox,
    // but we also need to ensure fields are visible before setting their values
    if (division.isDoublePlay) {
        // Ensure double play options are visible
        const doublePlayOptions = document.getElementById('doublePlayOptions');
        if (doublePlayOptions) doublePlayOptions.style.display = 'block';
        const regularDivisionFields = document.getElementById('regularDivisionFields');
        if (regularDivisionFields) regularDivisionFields.style.display = 'none';
        const regularMatchesWrapper = document.getElementById('regularMatchesPerWeekWrapper');
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'none';
        
        // For double-play, stored format is "First Name - First Game Type / Second Name - Second Game Type"
        // Parse to extract name and game type for each division
        let firstDivisionName = '';
        let firstDivisionGameType = '';
        let secondDivisionName = '';
        let secondDivisionGameType = '';
        
        console.log('Parsing double play division name:', division.name);
        const divider = ' / ';
        if (division.name.includes(divider)) {
            // Format: "First Name - First Game Type / Second Name - Second Game Type"
            const parts = division.name.split(divider);
            console.log('Split into parts:', parts);
            if (parts.length === 2) {
                // Parse first division: "Name - Game Type"
                const firstDashIndex = parts[0].indexOf(' - ');
                console.log('First part:', parts[0], 'dash index:', firstDashIndex);
                if (firstDashIndex > -1) {
                    firstDivisionName = parts[0].substring(0, firstDashIndex).trim();
                    firstDivisionGameType = parts[0].substring(firstDashIndex + 3).trim();
                    console.log('Parsed first division - Name:', firstDivisionName, 'Game Type:', firstDivisionGameType);
                }
                
                // Parse second division: "Name - Game Type"
                const secondDashIndex = parts[1].indexOf(' - ');
                console.log('Second part:', parts[1], 'dash index:', secondDashIndex);
                if (secondDashIndex > -1) {
                    secondDivisionName = parts[1].substring(0, secondDashIndex).trim();
                    secondDivisionGameType = parts[1].substring(secondDashIndex + 3).trim();
                    console.log('Parsed second division - Name:', secondDivisionName, 'Game Type:', secondDivisionGameType);
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
        
        // The edit division modal uses: divisionName (full combined name), gameType (first), secondGameType (second)
        // Set these fields for the edit modal
        const divisionNameEl = document.getElementById('divisionName');
        const gameTypeEl = document.getElementById('gameType');
        const secondGameTypeEl = document.getElementById('secondGameType');
        
        console.log('Double play - Setting fields:', {
            firstDivisionName,
            firstDivisionGameType,
            secondDivisionName,
            secondDivisionGameType,
            fullName: division.name
        });
        
        // Set the full combined name in divisionName field
        if (divisionNameEl) {
            divisionNameEl.value = division.name;
            console.log('Division name (full) set to:', divisionNameEl.value);
        } else {
            console.error('divisionName field not found!');
        }
        
        // Set the first game type
        if (gameTypeEl) {
            if (firstDivisionGameType) {
                gameTypeEl.value = firstDivisionGameType;
                console.log('First game type set to:', gameTypeEl.value);
            } else {
                console.warn('No first game type to set');
            }
        } else {
            console.error('gameType field not found!');
        }
        
        // Set the second game type
        if (secondGameTypeEl) {
            if (secondDivisionGameType) {
                secondGameTypeEl.value = secondDivisionGameType;
                console.log('Second game type set to:', secondGameTypeEl.value);
            } else {
                console.warn('No second game type to set');
            }
        } else {
            console.error('secondGameType field not found!');
        }
        
        // Also try to set new fields if they exist (for Smart Builder compatibility)
        const firstDivisionNameEl = document.getElementById('firstDivisionName');
        const firstDivisionGameTypeEl = document.getElementById('firstDivisionGameType');
        const secondDivisionNameEl = document.getElementById('secondDivisionName');
        const secondDivisionGameTypeEl = document.getElementById('secondDivisionGameType');
        
        if (firstDivisionNameEl) firstDivisionNameEl.value = firstDivisionName;
        if (firstDivisionGameTypeEl && firstDivisionGameType) firstDivisionGameTypeEl.value = firstDivisionGameType;
        if (secondDivisionNameEl) secondDivisionNameEl.value = secondDivisionName;
        if (secondDivisionGameTypeEl && secondDivisionGameType) secondDivisionGameTypeEl.value = secondDivisionGameType;
        
        // Update game type options to prevent duplicates
        updateGameTypeOptions();
    } else {
        const doublePlayOptions = document.getElementById('doublePlayOptions');
        if (doublePlayOptions) doublePlayOptions.style.display = 'none';
        const regularDivisionFields = document.getElementById('regularDivisionFields');
        if (regularDivisionFields) regularDivisionFields.style.display = 'block';
        const regularMatchesWrapper = document.getElementById('regularMatchesPerWeekWrapper');
        if (regularMatchesWrapper) regularMatchesWrapper.style.display = 'block';
    }
    
    new bootstrap.Modal(document.getElementById('addDivisionModal')).show();
    } catch (error) {
        console.error('Error in editDivision:', error);
        showAlertModal('Error loading division data. Please try again.', 'error', 'Error');
    }
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
    
    // Get color value - ensure we get the actual selected color
    const colorInput = document.getElementById('divisionColor');
    const selectedColor = colorInput && colorInput.value ? colorInput.value.trim() : null;
    const divisionColor = selectedColor || getDivisionColor(divisionName);
    
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: parseFloat(document.getElementById('duesPerPlayerPerMatch').value),
        playersPerWeek: parseInt(document.getElementById('playersPerWeek').value) || 5,
        matchesPerWeek: parseInt(document.getElementById('matchesPerWeek')?.value, 10) || 5,
        firstMatchesPerWeek: parseInt(document.getElementById('firstMatchesPerWeek')?.value, 10) || 5,
        secondMatchesPerWeek: parseInt(document.getElementById('secondMatchesPerWeek')?.value, 10) || 5,
        numberOfTeams: parseInt(document.getElementById('numberOfTeams').value),
        totalWeeks: parseInt(document.getElementById('totalWeeks').value),
        startDate: document.getElementById('divisionStartDate')?.value || '',
        endDate: document.getElementById('divisionEndDate')?.value || '',
        isDoublePlay: isDoublePlay,
        description: document.getElementById('divisionDescription').value,
        color: divisionColor
    };
    
    console.log('Creating division with color:', divisionColor, 'from input:', selectedColor);
    
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
            // Update saved method for active format indicator
            _savedDivisionUseDollarAmounts = divisionUsesDollarAmounts;
            
            bootstrap.Modal.getInstance(document.getElementById('addDivisionModal')).hide();
            // Reload all data to refresh the display with new division and color
            loadData().then(() => {
                displayDivisions();
                updateDivisionDropdown();
                // Refresh teams display to show updated colors
                filterTeamsByDivision();
                showAlertModal('Division created successfully!', 'success', 'Success');
            });
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
function toggleSmartBuilderDoublePlayOptions(event) {
    // Get the checkbox that was clicked (from event or find all and check their state)
    let activeCheckbox = null;
    let isDoublePlay = false;
    
    // Try to get from event target first
    if (event && event.target) {
        activeCheckbox = event.target;
        isDoublePlay = activeCheckbox.checked;
    } else {
        // Fallback: find all checkboxes and get the checked one
        const checkboxes = document.querySelectorAll('#smartBuilderIsDoublePlay');
        for (const checkbox of checkboxes) {
            if (checkbox.checked) {
                isDoublePlay = true;
                activeCheckbox = checkbox;
                break;
            }
        }
        // If none are checked, check the first one's state
        if (!activeCheckbox && checkboxes.length > 0) {
            activeCheckbox = checkboxes[0];
            isDoublePlay = activeCheckbox.checked;
        }
    }
    
    console.log('Double play toggle called, isDoublePlay:', isDoublePlay, 'checkbox:', activeCheckbox);
    
    // Find the options div in the same container as the checkbox
    let optionsDiv = null;
    if (activeCheckbox) {
        // Find the closest modal or container
        const container = activeCheckbox.closest('.modal-body, #smartBuilderContent, .tab-pane, .card-body');
        if (container) {
            optionsDiv = container.querySelector('#smartBuilderDoublePlayOptions');
            console.log('Found container, looking for options div:', !!optionsDiv);
        }
    }
    
    // Fallback: use first one found
    if (!optionsDiv) {
        optionsDiv = document.getElementById('smartBuilderDoublePlayOptions');
        console.log('Using fallback, found options div:', !!optionsDiv);
    }
    
    if (!optionsDiv) {
        console.error('Could not find smartBuilderDoublePlayOptions element');
        // Try to find by class or other means
        const allOptions = document.querySelectorAll('[id*="DoublePlayOptions"]');
        console.log('Found alternative options divs:', allOptions.length);
        if (allOptions.length > 0) {
            optionsDiv = allOptions[0];
        } else {
            return;
        }
    }
    
    // Find other elements in the same container
    const container = optionsDiv.closest('.modal-body, #smartBuilderContent, .tab-pane') || document;
    const divisionNameInput = container.querySelector('#smartBuilderDivisionName') || document.getElementById('smartBuilderDivisionName');
    // Try both possible IDs for first game type (Smart Builder uses smartBuilderGameType, other modals use firstGameType)
    const firstGameTypeSelect = container.querySelector('#smartBuilderGameType') || 
                                container.querySelector('#firstGameType') || 
                                document.getElementById('smartBuilderGameType') ||
                                document.getElementById('firstGameType');
    // Get Division 2 name field (new separate field)
    const division2NameField = container.querySelector('#smartBuilderDivision2Name') || 
                              document.getElementById('smartBuilderDivision2Name');
    const secondGameTypeSelect = container.querySelector('#smartBuilderSecondGameType') || document.getElementById('smartBuilderSecondGameType');
    
    console.log('Double play toggle - isDoublePlay:', isDoublePlay, 'optionsDiv found:', !!optionsDiv, 'firstGameTypeSelect found:', !!firstGameTypeSelect);
    
    if (isDoublePlay) {
        optionsDiv.style.display = 'block';
        // Force display in case inline style is being overridden
        optionsDiv.style.setProperty('display', 'block', 'important');
        console.log('✅ Showing double play options, display set to block');
        
        // Keep the regular division name field visible - it becomes "Division 1 Name"
        // Update labels for clarity
        const divisionNameLabel = document.getElementById('divisionNameLabel');
        if (divisionNameLabel) {
            divisionNameLabel.textContent = 'Division 1 Name *';
        }
        const gameTypeLabel = document.getElementById('gameTypeLabel');
        if (gameTypeLabel) {
            gameTypeLabel.textContent = 'Division 1 Game Type *';
        }
        
        // Make sure Division 2 name field is required and visible
        if (division2NameField) {
            division2NameField.required = true;
            const division2NameRow = division2NameField.closest('.row, .mb-3, .col-md-6');
            if (division2NameRow) {
                division2NameRow.style.display = '';
            }
        }
        
        // Keep first game type visible - it's needed for double play
        // Make double play fields required
        if (division2NameField) division2NameField.required = true;
        if (secondGameTypeSelect) secondGameTypeSelect.required = true;
        if (firstGameTypeSelect) {
            firstGameTypeSelect.required = true;
            // Make sure the first game type field and its container are visible
            const firstGameTypeRow = firstGameTypeSelect.closest('.row, .mb-3, .col-md-6');
            if (firstGameTypeRow) {
                firstGameTypeRow.style.display = '';
                firstGameTypeRow.style.visibility = 'visible';
                // Also ensure the parent row is visible
                const parentRow = firstGameTypeRow.closest('.row');
                if (parentRow) {
                    parentRow.style.display = '';
                    parentRow.style.visibility = 'visible';
                }
            }
            // Make sure the select itself is visible
            firstGameTypeSelect.style.display = '';
            firstGameTypeSelect.style.visibility = 'visible';
            
            // Update label to indicate it's for Division 1 game type in double play
            const label = firstGameTypeSelect.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.textContent = 'Division 1 Game Type *';
            } else {
                // Try to find label by for attribute
                const labelByFor = document.querySelector(`label[for="${firstGameTypeSelect.id}"]`);
                if (labelByFor) {
                    labelByFor.textContent = 'Division 1 Game Type *';
                }
            }
        } else {
            console.warn('⚠️ First game type select not found - cannot update label');
        }
        
        // Don't clear regular division name - it's already hidden and we've copied it to base name
        if (divisionNameInput) {
            divisionNameInput.required = false;
        }
        
        // Update game type options to prevent selecting same type twice
        if (firstGameTypeSelect && secondGameTypeSelect) {
            updateSmartBuilderGameTypeOptions();
        }
    } else {
        optionsDiv.style.display = 'none';
        optionsDiv.style.setProperty('display', 'none', 'important');
        console.log('❌ Hiding double play options');
        
        // Restore original labels
        const divisionNameLabel = document.getElementById('divisionNameLabel');
        if (divisionNameLabel) {
            divisionNameLabel.textContent = 'Division Name *';
        }
        const gameTypeLabel = document.getElementById('gameTypeLabel');
        if (gameTypeLabel) {
            gameTypeLabel.textContent = 'Game Type *';
        }
        
        // Make Division 2 name field not required when double play is off
        const division2NameField = document.getElementById('smartBuilderDivision2Name');
        if (division2NameField) {
            division2NameField.required = false;
        }
        
        // Make regular fields required
        if (divisionNameInput) {
            divisionNameInput.required = true;
        }
        if (firstGameTypeSelect) {
            firstGameTypeSelect.required = true;
            // Make sure the first game type field is visible
            const firstGameTypeRow = firstGameTypeSelect.closest('.row, .mb-3, .col-md-6');
            if (firstGameTypeRow) {
                firstGameTypeRow.style.display = '';
                firstGameTypeRow.style.visibility = 'visible';
            }
            // Restore original label
            const label = firstGameTypeSelect.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.textContent = 'Game Type *';
            } else {
                // Try to find label by for attribute
                const labelByFor = document.querySelector(`label[for="${firstGameTypeSelect.id}"]`);
                if (labelByFor) {
                    labelByFor.textContent = 'Game Type *';
                }
            }
        }
        
        // Don't clear double play fields - user might want to toggle back
        if (division2NameField) {
            division2NameField.required = false;
        }
        if (secondGameTypeSelect) {
            secondGameTypeSelect.value = '';
            secondGameTypeSelect.required = false;
        }
    }
}

// Update game type options (no longer disabling options - user can select same type for both divisions)
function updateSmartBuilderGameTypeOptions() {
    // Try both possible IDs for first game type (Smart Builder uses smartBuilderGameType, other modals use firstGameType)
    const firstGameType = document.getElementById('smartBuilderGameType') || 
                         document.getElementById('firstGameType');
    const secondGameType = document.getElementById('smartBuilderSecondGameType');
    
    if (!firstGameType || !secondGameType) return;
    
    // Enable all options in the second game type dropdown (no restrictions)
    const secondOptions = secondGameType.querySelectorAll('option');
    secondOptions.forEach(option => {
        option.disabled = false;
    });
}

// Smart Builder end date calculator
function calculateSmartBuilderEndDate() {
    // Find all date inputs (there might be duplicates in different modals)
    const allStartDateInputs = document.querySelectorAll('#smartBuilderStartDate');
    const allTotalWeeksInputs = document.querySelectorAll('#smartBuilderTotalWeeks'); // Now a select dropdown
    const allEndDateInputs = document.querySelectorAll('#smartBuilderEndDate');
    
    // Try to find the active/visible ones
    let startDateInput = null;
    let totalWeeksSelect = null; // Now a select dropdown
    let endDateInput = null;
    
    // Check if smartBuilderModal is open
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    const divisionModal = document.getElementById('divisionManagementModal');
    
    if (smartBuilderModal && (smartBuilderModal.classList.contains('show') || window.getComputedStyle(smartBuilderModal).display !== 'none')) {
        startDateInput = smartBuilderModal.querySelector('#smartBuilderStartDate');
        totalWeeksSelect = smartBuilderModal.querySelector('#smartBuilderTotalWeeks'); // Now a select
        endDateInput = smartBuilderModal.querySelector('#smartBuilderEndDate');
    } else if (divisionModal && (divisionModal.classList.contains('show') || window.getComputedStyle(divisionModal).display !== 'none')) {
        // Check LMS/CSI tab
        const lmsTabPane = document.getElementById('lms-csi-pane');
        if (lmsTabPane && (lmsTabPane.classList.contains('active') || lmsTabPane.classList.contains('show'))) {
            startDateInput = lmsTabPane.querySelector('#smartBuilderStartDate');
            totalWeeksSelect = lmsTabPane.querySelector('#smartBuilderTotalWeeks'); // Now a select
            endDateInput = lmsTabPane.querySelector('#smartBuilderEndDate');
        }
    }
    
    // Fallback: use first available
    if (!startDateInput && allStartDateInputs.length > 0) {
        startDateInput = allStartDateInputs[0];
    }
    if (!totalWeeksSelect && allTotalWeeksInputs.length > 0) {
        totalWeeksSelect = allTotalWeeksInputs[0];
    }
    if (!endDateInput && allEndDateInputs.length > 0) {
        endDateInput = allEndDateInputs[0];
    }
    
    if (!startDateInput || !totalWeeksSelect || !endDateInput) {
        console.error('Could not find date input fields for end date calculation');
        // Still try to update day of week if we have a date input
        if (startDateInput && startDateInput.value) {
            const [year, month, day] = startDateInput.value.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = dayNames[date.getDay()];
            
            const dayOfWeekDisplay = document.getElementById('smartBuilderDayOfWeekDisplay');
            const dayOfWeekText = document.getElementById('smartBuilderDayOfWeekText');
            if (dayOfWeekDisplay && dayOfWeekText) {
                dayOfWeekText.textContent = dayName;
                dayOfWeekDisplay.style.display = 'block';
            }
        }
        return;
    }
    
    const startDate = startDateInput.value;
    const totalWeeks = parseInt(totalWeeksSelect.value) || 0;
    
    console.log('Calculating end date - startDate:', startDate, 'totalWeeks:', totalWeeks);
    
    // Calculate and display day of week
    if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        
        // Update day of week display in Smart Builder modal (new element)
        const dayOfWeekDisplay = document.getElementById('smartBuilderDayOfWeekDisplay');
        const dayOfWeekText = document.getElementById('smartBuilderDayOfWeekText');
        if (dayOfWeekDisplay && dayOfWeekText) {
            dayOfWeekText.textContent = dayName;
            dayOfWeekDisplay.style.display = 'block';
        }
        
        // Also update old day of week displays if they exist (for backward compatibility)
        const allDayOfWeekDisplays = document.querySelectorAll('#smartBuilderDayOfWeek');
        const allDayOfWeekContainers = document.querySelectorAll('#smartBuilderDayOfWeekContainer');
        
        allDayOfWeekDisplays.forEach(display => {
            display.textContent = dayName;
        });
        
        allDayOfWeekContainers.forEach(container => {
            container.style.setProperty('display', 'block', 'important');
        });
    } else {
        // Hide day of week display if no date
        const dayOfWeekDisplay = document.getElementById('smartBuilderDayOfWeekDisplay');
        if (dayOfWeekDisplay) {
            dayOfWeekDisplay.style.display = 'none';
        }
        
        // Also hide old containers if they exist
        const containers = document.querySelectorAll('#smartBuilderDayOfWeekContainer');
        containers.forEach(container => {
            container.style.setProperty('display', 'none', 'important');
        });
    }
    
    if (startDate && totalWeeks > 0) {
        const endDate = calculateEndDateFromStart(startDate, totalWeeks);
        endDateInput.value = endDate;
        console.log('✅ Calculated end date:', endDate);
    } else {
        endDateInput.value = '';
        console.log('⚠️ Missing start date or total weeks, cleared end date');
    }
}

async function updateDivision() {
    // Get the current division being edited
    const currentDivision = currentDivisionId ? divisions.find(d => d._id === currentDivisionId) : null;
    
    const isDoublePlay = document.getElementById('isDoublePlay').checked;
    let divisionName = '';
    
    // Format division name for double play - combine name and game type for each division
    // Note: The edit division modal uses different field structure than Smart Builder
    // For double play in edit modal: divisionName contains full name, gameType is first, secondGameType is second
    if (isDoublePlay) {
        // Try to get the new fields first (if they exist in Smart Builder or future versions)
        let firstDivisionNameEl = document.getElementById('firstDivisionName');
        let firstDivisionGameTypeEl = document.getElementById('firstDivisionGameType');
        let secondDivisionNameEl = document.getElementById('secondDivisionName');
        let secondDivisionGameTypeEl = document.getElementById('secondDivisionGameType');
        
        // If new fields don't exist, use the old structure (divisionName, gameType, secondGameType)
        // This is the structure used in the edit division modal
        if (!firstDivisionNameEl || !firstDivisionGameTypeEl || !secondDivisionNameEl || !secondDivisionGameTypeEl) {
            // Use the old field structure for edit division modal
            const divisionNameEl = document.getElementById('divisionName');
            const gameTypeEl = document.getElementById('gameType');
            const secondGameTypeEl = document.getElementById('secondGameType');
            
            if (!divisionNameEl) {
                alert('Division name field not found');
                return;
            }
            if (!gameTypeEl) {
                alert('First game type field not found');
                return;
            }
            if (!secondGameTypeEl) {
                alert('Second game type field not found. Please ensure double play options are visible.');
                return;
            }
            
            // Parse the existing division name to extract both division names
            // Format: "First Name - First Game Type / Second Name - Second Game Type"
            const fullName = divisionNameEl.value.trim();
            const firstGameType = gameTypeEl.value.trim();
            const secondGameType = secondGameTypeEl.value.trim();
            
            if (!firstGameType || !secondGameType) {
                alert('Please select both game types for double-play divisions');
                return;
            }
            
            if (fullName.includes(' / ')) {
                // Name already has the format, parse it to get division names
                const parts = fullName.split(' / ');
                if (parts.length === 2) {
                    // Extract first division name
                    const firstPart = parts[0].trim();
                    const firstDashIndex = firstPart.indexOf(' - ');
                    const firstDivisionName = firstDashIndex > -1 ? firstPart.substring(0, firstDashIndex).trim() : firstPart;
                    
                    // Extract second division name
                    const secondPart = parts[1].trim();
                    const secondDashIndex = secondPart.indexOf(' - ');
                    const secondDivisionName = secondDashIndex > -1 ? secondPart.substring(0, secondDashIndex).trim() : secondPart;
                    
                    if (!firstDivisionName || !secondDivisionName) {
                        alert('Please ensure division names are properly formatted');
                        return;
                    }
                    
                    // Reconstruct the full name using the game types from the dropdowns
                    divisionName = `${firstDivisionName} - ${firstGameType} / ${secondDivisionName} - ${secondGameType}`;
                } else {
                    alert('Invalid double play division name format. Expected: "First Name - Game Type / Second Name - Game Type"');
                    return;
                }
            } else {
                // Name doesn't have the format yet, use the name as base for both divisions
                // This shouldn't normally happen, but handle it gracefully
                const baseName = fullName || 'Division';
                divisionName = `${baseName} - ${firstGameType} / ${baseName} - ${secondGameType}`;
            }
        } else {
            // Use the new field structure (Smart Builder style)
            const firstDivisionName = firstDivisionNameEl.value.trim();
            const firstDivisionGameType = firstDivisionGameTypeEl.value.trim();
            const secondDivisionName = secondDivisionNameEl.value.trim();
            const secondDivisionGameType = secondDivisionGameTypeEl.value.trim();
            
            if (!firstDivisionName || !firstDivisionGameType || !secondDivisionName || !secondDivisionGameType) {
                alert('Please enter all division names and select all game types for double-play divisions');
                return;
            }
            
            // Format: "First Name - First Game Type / Second Name - Second Game Type"
            divisionName = `${firstDivisionName} - ${firstDivisionGameType} / ${secondDivisionName} - ${secondDivisionGameType}`;
        }
    } else {
        // For regular divisions, use the divisionName field
        const divisionNameEl = document.getElementById('divisionName');
        if (!divisionNameEl) {
            alert('Division name field not found');
            return;
        }
        divisionName = divisionNameEl.value.trim();
        if (!divisionName) {
            alert('Please enter a division name');
            return;
        }
        
        // For regular divisions, also get the game type and append it if not already in the name
        const gameTypeEl = document.getElementById('gameType');
        if (gameTypeEl && gameTypeEl.value && !divisionName.includes(' - ')) {
            const gameType = gameTypeEl.value.trim();
            divisionName = `${divisionName} - ${gameType}`;
        }
    }
    
    // Get color value - ensure we get the actual selected color
    const colorInput = document.getElementById('divisionColor');
    const selectedColor = colorInput && colorInput.value ? colorInput.value.trim() : null;
    const divisionColor = selectedColor || getDivisionColor(divisionName);
    
    // Get dues per player - check both possible field IDs (divisionWeeklyDues is the dropdown we just added)
    const duesPerPlayerEl = document.getElementById('divisionWeeklyDues') || document.getElementById('duesPerPlayerPerMatch');
    if (!duesPerPlayerEl || !duesPerPlayerEl.value) {
        alert('Please select a dues amount per player per match');
        return;
    }
    const duesPerPlayerPerMatch = parseFloat(duesPerPlayerEl.value);
    if (isNaN(duesPerPlayerPerMatch) || duesPerPlayerPerMatch <= 0) {
        alert('Please enter a valid dues amount per player per match');
        return;
    }
    
    // Get players per week (if field exists, otherwise use existing division value or default)
    const playersPerWeekEl = document.getElementById('playersPerWeek');
    let playersPerWeek = 5; // Default
    if (playersPerWeekEl && playersPerWeekEl.value) {
        playersPerWeek = parseInt(playersPerWeekEl.value) || 5;
    } else if (currentDivision && currentDivision.playersPerWeek !== undefined && currentDivision.playersPerWeek !== null) {
        // Use existing division's playersPerWeek if field doesn't exist in form
        playersPerWeek = parseInt(currentDivision.playersPerWeek) || 5;
    }
    
    // Get matches per week fields
    const matchesPerWeekEl = document.getElementById('matchesPerWeek');
    const firstMatchesPerWeekEl = document.getElementById('firstMatchesPerWeek');
    const secondMatchesPerWeekEl = document.getElementById('secondMatchesPerWeek');
    
    const matchesPerWeek = matchesPerWeekEl ? (parseInt(matchesPerWeekEl.value, 10) || 5) : 5;
    const firstMatchesPerWeek = firstMatchesPerWeekEl ? (parseInt(firstMatchesPerWeekEl.value, 10) || 5) : 5;
    const secondMatchesPerWeek = secondMatchesPerWeekEl ? (parseInt(secondMatchesPerWeekEl.value, 10) || 5) : 5;
    
    // Get number of teams and total weeks
    const numberOfTeamsEl = document.getElementById('numberOfTeams');
    const totalWeeksEl = document.getElementById('totalWeeks');
    
    // If numberOfTeams field doesn't exist, use existing division value or default
    let numberOfTeams = 0;
    if (numberOfTeamsEl && numberOfTeamsEl.value) {
        numberOfTeams = parseInt(numberOfTeamsEl.value);
    } else if (currentDivision && currentDivision.numberOfTeams !== undefined) {
        numberOfTeams = parseInt(currentDivision.numberOfTeams) || 0;
    }
    
    if (numberOfTeams <= 0) {
        alert('Please enter the number of teams');
        return;
    }
    
    if (!totalWeeksEl || !totalWeeksEl.value) {
        alert('Please enter the total weeks');
        return;
    }
    
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: duesPerPlayerPerMatch,
        playersPerWeek: playersPerWeek,
        matchesPerWeek: matchesPerWeek,
        firstMatchesPerWeek: firstMatchesPerWeek,
        secondMatchesPerWeek: secondMatchesPerWeek,
        numberOfTeams: numberOfTeams,
        totalWeeks: parseInt(totalWeeksEl.value),
        color: divisionColor,
        startDate: document.getElementById('divisionStartDate')?.value || '',
        endDate: document.getElementById('divisionEndDate')?.value || '',
        isDoublePlay: isDoublePlay,
        description: document.getElementById('divisionDescription')?.value || ''
    };
    
    console.log('Updating division with color:', divisionColor, 'from input:', selectedColor);
    
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
            // Update saved method for active format indicator
            _savedDivisionUseDollarAmounts = divisionUsesDollarAmounts;
            
            const updatedDivision = await response.json();
            console.log('✅ Division updated successfully:', updatedDivision);
            bootstrap.Modal.getInstance(document.getElementById('addDivisionModal')).hide();
            // Reload all data to refresh the display with updated division name and color
            loadData().then(() => {
                displayDivisions();
                updateDivisionDropdown(); // Refresh the dropdown with updated names
                // Refresh teams display to show updated colors
                filterTeamsByDivision();
                showAlertModal('Division updated successfully!', 'success', 'Success');
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
    const division = divisions.find(d => d._id === divisionId || d.id === divisionId);
    if (!division) {
        showAlertModal('Division not found.', 'error', 'Error');
        return;
    }
    
    // Get modal elements
    const modalEl = document.getElementById('deleteConfirmModal');
    const messageEl = document.getElementById('deleteConfirmMessage');
    const headerEl = document.getElementById('deleteConfirmModalHeader');
    const titleEl = document.getElementById('deleteConfirmModalTitle');
    const footerEl = document.getElementById('deleteConfirmModalFooter');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (!modalEl || !messageEl || !confirmBtn) {
        showAlertModal('Delete confirmation modal not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    // Set up confirmation message
    messageEl.textContent = `Are you sure you want to delete the division "${division.name}"? This action cannot be undone.`;
    
    // Reset modal to initial state
    headerEl.className = 'modal-header bg-danger text-white';
    titleEl.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Confirm Deletion';
    footerEl.style.display = '';
    
    // Remove any existing event listeners by cloning the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Set up confirmation button handler
    newConfirmBtn.addEventListener('click', async () => {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        try {
            showLoadingMessage('Deleting division...');
            
            const response = await apiCall(`/divisions/${divisionId}`, {
                method: 'DELETE'
            });
            
            hideLoadingMessage();
            
            if (response.ok) {
                showAlertModal(`Division "${division.name}" deleted successfully!`, 'success', 'Success');
                
                // Reload data
                await loadDivisions();
                displayDivisions();
            } else {
                const error = await response.json().catch(() => ({ message: 'Error deleting division' }));
                showAlertModal(error.message || 'Failed to delete division.', 'error', 'Error');
            }
        } catch (error) {
            hideLoadingMessage();
            console.error('Error deleting division:', error);
            showAlertModal(error.message || 'Failed to delete division. Please try again.', 'error', 'Error');
        }
    });
    
    // Show modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
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

async function filterTeamsByDivision() {
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect.value;
    
    if (selectedDivisionId === 'all') {
        // When "all" is selected, use pagination
        // Reset to page 1 and reload with pagination
        currentPage = 1;
        await loadTeams(1, teamsPerPage);
        
        // Filter out archived teams when showing all teams
        filteredTeams = teams.filter(team => !team.isArchived && team.isActive !== false);
        // Show overall divisions summary when viewing all teams
        updateDivisionSpecificSummary(null);
    } else {
        // When a specific division is selected, load all teams first
        // (We need all teams to filter properly - can be optimized later with server-side filtering)
        // Load with a very high limit to get all teams
        await loadTeams(1, 10000); // Load all teams for filtering
        
        // Find the division name from the selected ID (check both _id and id)
        const selectedDivision = divisions.find(d => 
            (d._id === selectedDivisionId) || (d.id === selectedDivisionId)
        );
        if (selectedDivision) {
            // Filter teams by division name (case-insensitive, trimmed)
            filteredTeams = teams.filter(team => {
                // Exclude archived teams
                if (team.isArchived === true || (team.isActive === false && !team.isArchived)) return false;
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
            
            // Hide pagination when filtering by division (showing all teams in that division)
            const paginationControls = document.getElementById('paginationControls');
            if (paginationControls) {
                paginationControls.style.display = 'none';
            }
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
    
    // Update UI to show projection mode indicator (between Overview and Financial Breakdown)
    const bannerContainer = document.getElementById('projectionBannerContainer');
    const projectionIndicator = document.getElementById('projectionIndicator');
    if (projectionMode) {
        if (bannerContainer) {
            bannerContainer.style.display = '';
            if (!projectionIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'projectionIndicator';
                indicator.className = 'alert mb-0 text-center';
                indicator.style.cssText = 'background:rgb(244, 248, 8); border: 1px solid #e8dca0; color: #b91c1c;';
                indicator.innerHTML = '<i class="fas fa-chart-line me-2"></i><strong>Projection Mode:</strong> All amounts shown are <strong>estimated</strong> based on current data. Projections assume existing payment patterns continue through the end of each division.';
                bannerContainer.appendChild(indicator);
            }
        }
    } else {
        if (bannerContainer) bannerContainer.style.display = 'none';
        if (projectionIndicator) projectionIndicator.remove();
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
    const divisionTeams = teams.filter(team => !team.isArchived && team.isActive !== false && team.division === division.name);
    
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
    const leagueIncomeByDivision = {}; // Collected profit per division
    const leagueIncomeOwedByDivision = {}; // Owed profit per division
    const totalOwedByDivision = {}; // Total amount owed per division (for display clarity)
    
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
                // Exclude archived teams
                if (team.isArchived === true) return false;
                if (team.isActive === false && !team.isArchived) return false;
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
        
        // Calculate owed amounts for this team (for profit tracking)
        // Calculate actual current week for this team's division
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
        
        // Calculate due week (with grace period)
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
        
        // Calculate how many weeks are owed and the League Manager portion
        let weeksOwed = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
            const isMakeup = weekPayment?.paid === 'makeup';
            if ((isUnpaid || isMakeup) && week <= dueWeek) {
                weeksOwed++;
            }
        }
        
        // Track League Manager portion (profit) from owed amounts per division
        if (weeksOwed > 0) {
            const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
            const profitFromOwed = breakdown.leagueManager * weeksOwed;
            const totalOwed = weeklyDues * weeksOwed; // Total amount owed (for display clarity)
            const divName = teamDivision.name || team.division || 'Unassigned';
            if (!leagueIncomeOwedByDivision[divName]) {
                leagueIncomeOwedByDivision[divName] = 0;
            }
            if (!totalOwedByDivision[divName]) {
                totalOwedByDivision[divName] = 0;
            }
            leagueIncomeOwedByDivision[divName] += profitFromOwed;
            totalOwedByDivision[divName] += totalOwed;
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
            // Specific division selected: show single total for that division with owed amounts
            const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
            const profitOwed = leagueIncomeOwedByDivision[divName] || 0;
            const totalOwed = totalOwedByDivision[divName] || 0;
            const profitIncludingOwed = totalLeagueManager + profitOwed;
            
            if (totalLeagueManager === 0 && profitOwed === 0) {
                leagueIncomeDetailsListEl.innerHTML = '<small class="text-muted">No league income yet for this division</small>';
            } else {
                let html = '';
                html += `<div class="mb-2 pb-2 border-bottom border-white border-opacity-25">
                    <div class="mb-1"><strong>Current Profit (${firstOrganizationName}):</strong> ${formatCurrency(totalLeagueManager)}</div>
                </div>`;
                
                html += `<div class="mb-1"><strong>${divName}:</strong> ${formatCurrency(totalLeagueManager)} collected</div>`;
                
                if (totalOwed > 0) {
                    html += `<div class="mb-1 text-warning"><small>Total Owed: ${formatCurrency(totalOwed)} (Your profit portion: ${formatCurrency(profitOwed)})</small></div>`;
                    html += `<div class="mb-1"><small>Profit: ${formatCurrency(totalLeagueManager)} + ${formatCurrency(profitOwed)} from owed = ${formatCurrency(profitIncludingOwed)}</small></div>`;
                }
                
                if (profitOwed > 0) {
                    html += `<div class="mt-2 pt-2 border-top border-white border-opacity-25">
                        <div class="mb-1"><strong>Profit Including Owed:</strong> ${formatCurrency(totalLeagueManager)} + ${formatCurrency(profitOwed)} = <strong>${formatCurrency(profitIncludingOwed)}</strong></div>
                    </div>`;
                }
                
                leagueIncomeDetailsListEl.innerHTML = html;
            }
        } else {
            const entries = Object.entries(leagueIncomeByDivision);
            if (entries.length === 0) {
                leagueIncomeDetailsListEl.innerHTML = '<small class="text-muted">No league income yet</small>';
            } else {
                entries.sort((a, b) => a[0].localeCompare(b[0]));
                
                // Calculate totals
                let totalCurrentProfit = totalLeagueManager;
                let totalProfitOwed = 0;
                Object.values(leagueIncomeOwedByDivision).forEach(profit => {
                    totalProfitOwed += profit;
                });
                
                // Build HTML with profit information
                let html = '';
                
                // Show current profit total
                html += `<div class="mb-2 pb-2 border-bottom border-white border-opacity-25">
                    <div class="mb-1"><strong>Current Profit (${firstOrganizationName}):</strong> ${formatCurrency(totalCurrentProfit)}</div>
                </div>`;
                
                // Show per-division breakdown with profit
                html += '<div class="mb-2"><strong>Per Division:</strong></div>';
                entries.forEach(([name, amount]) => {
                    const profitOwed = leagueIncomeOwedByDivision[name] || 0;
                    const totalOwed = totalOwedByDivision[name] || 0;
                    const profitIncludingOwed = amount + profitOwed;
                    
                    html += `<div class="mb-1 ms-2">
                        <div><strong>${name}:</strong> ${formatCurrency(amount)} collected</div>`;
                    
                    if (totalOwed > 0) {
                        html += `<div class="ms-2 text-warning"><small>Total Owed: ${formatCurrency(totalOwed)} (Your profit portion: ${formatCurrency(profitOwed)})</small></div>`;
                    }
                    
                    html += `<div class="ms-2"><small>Profit: ${formatCurrency(amount)}`;
                    if (profitOwed > 0) {
                        html += ` + ${formatCurrency(profitOwed)} from owed = ${formatCurrency(profitIncludingOwed)}`;
                    }
                    html += `</small></div></div>`;
                });
                
                // Show total profit including owed
                if (totalProfitOwed > 0) {
                    const totalProfitIncludingOwed = totalCurrentProfit + totalProfitOwed;
                    html += `<div class="mt-2 pt-2 border-top border-white border-opacity-25">
                        <div class="mb-1"><strong>Profit Including Owed:</strong> ${formatCurrency(totalCurrentProfit)} + ${formatCurrency(totalProfitOwed)} = <strong>${formatCurrency(totalProfitIncludingOwed)}</strong></div>
                    </div>`;
                }
                
                leagueIncomeDetailsListEl.innerHTML = html;
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
    const startDateInput = document.getElementById('divisionStartDate');
    const totalWeeksInput = document.getElementById('totalWeeks');
    const endDateInput = document.getElementById('divisionEndDate');
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
        
        // Show only the day of play (one day—all teams in division play that day)
        const m = String(weekDate.getMonth() + 1).padStart(2, '0');
        const d = String(weekDate.getDate()).padStart(2, '0');
        const dateString = `${m}/${d}`;
        
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
    const teamNameEl = document.getElementById('weeklyPaymentTeam');
    const weekEl = document.getElementById('weeklyPaymentWeek');
    if (teamNameEl) {
        teamNameEl.value = team.teamName;
    }
    
    // Populate week dropdown and set selected value
    const teamDivision = divisions.find(d => d.name === team.division);
    if (weekEl && teamDivision) {
        const totalWeeks = teamDivision.totalWeeks || 20;
        weekEl.innerHTML = ''; // Clear existing options
        
        // Add week options
        for (let week = 1; week <= totalWeeks; week++) {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `Week ${week}`;
            weekEl.appendChild(option);
        }
        
        // Set selected week
        weekEl.value = selectedWeek;
    } else if (weekEl) {
        weekEl.value = selectedWeek;
    }
    
    // Reset modal state - hide success message and show form
    const successDiv = document.getElementById('weeklyPaymentSuccess');
    const form = document.getElementById('weeklyPaymentForm');
    const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
    if (successDiv) {
        successDiv.classList.add('d-none');
    }
    if (form) {
        form.style.display = 'block';
    }
    // Ensure footer buttons are visible when opening modal
    if (modalFooter) {
        modalFooter.style.display = '';
    }
    // Re-enable save button
    const saveButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-primary');
    if (saveButton) {
        saveButton.disabled = false;
    }
    
    // Populate the amount dropdown (teamDivision already found above)
    if (teamDivision) {
        populateWeeklyPaymentAmountDropdown(team, teamDivision);
        
        // Store weekly team dues for validation
        const individualDuesRate = parseFloat(team.divisionDuesRate) || 0;
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        currentWeeklyTeamDues = individualDuesRate * playersPerWeek * doublePlayMultiplier;
    }
    
    // Pre-fill amount with expected weekly team dues (first option) if no existing payment
    const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
    
    // Populate sanction fee player checkboxes
    populateBCASanctionPlayers(team);
    
    // Add event listeners to sanction player checkboxes for validation
    // Use event delegation since checkboxes are dynamically created
    const bcaSanctionContainer = document.getElementById('bcaSanctionPlayers');
    if (bcaSanctionContainer) {
        bcaSanctionContainer.addEventListener('change', function(e) {
            if (e.target.name === 'bcaSanctionPlayer') {
                validatePaymentAmount();
            }
        });
    }
    
    // Populate individual player payments section
    populateIndividualPlayerPayments(team, teamDivision, selectedWeek);
    
    // Calculate match date for the selected week based on division start date
    let matchDate = '';
    if (teamDivision && teamDivision.startDate) {
        const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        // Match date for week N is: startDate + (N - 1) * 7 days
        const matchDateObj = new Date(startDate);
        matchDateObj.setDate(startDate.getDate() + (selectedWeek - 1) * 7);
        // Format as YYYY-MM-DD for date input
        const yearStr = matchDateObj.getFullYear();
        const monthStr = String(matchDateObj.getMonth() + 1).padStart(2, '0');
        const dayStr = String(matchDateObj.getDate()).padStart(2, '0');
        matchDate = `${yearStr}-${monthStr}-${dayStr}`;
    }
    
    // Check if team has existing payment for this week
    const existingPayment = team.weeklyPayments?.find(p => p.week === selectedWeek);
    
    if (existingPayment) {
        // Populate with existing data
        const paidYesEl = document.getElementById('weeklyPaidYes');
        const paidByeEl = document.getElementById('weeklyPaidBye');
        const paidNoEl = document.getElementById('weeklyPaidNo');
        if (existingPayment.paid === 'true' && paidYesEl) {
            paidYesEl.checked = true;
        } else if (existingPayment.paid === 'bye' && paidByeEl) {
            paidByeEl.checked = true;
        } else if (paidNoEl) {
            paidNoEl.checked = true;
        }
        
        const methodEl = document.getElementById('weeklyPaymentMethod');
        if (methodEl) {
            methodEl.value = existingPayment.paymentMethod || '';
        }
        
        // Populate payment date if it exists, otherwise use match date
        const dateEl = document.getElementById('weeklyPaymentDate');
        if (dateEl) {
            if (existingPayment.paymentDate) {
                const paymentDateStr = existingPayment.paymentDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
                dateEl.value = paymentDateStr;
            } else if (matchDate) {
                // If no payment date exists, use the match date as default
                dateEl.value = matchDate;
            } else {
                dateEl.value = '';
            }
        }
        
        const amountEl = document.getElementById('weeklyPaymentAmount');
        if (amountEl) {
            amountEl.value = existingPayment.amount || '';
        }
        
        const notesEl = document.getElementById('weeklyPaymentNotes');
        if (notesEl) {
            notesEl.value = existingPayment.notes || '';
        }
        
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
            const individualPaymentsSection = document.getElementById('individualPaymentsSection');
            const individualPaymentsToggleIcon = document.getElementById('individualPaymentsToggleIcon');
            const individualPaymentsToggleText = document.getElementById('individualPaymentsToggleText');
            if (individualPaymentsSection) {
                individualPaymentsSection.style.display = 'block';
            }
            if (individualPaymentsToggleIcon) {
                individualPaymentsToggleIcon.className = 'fas fa-toggle-on';
            }
            if (individualPaymentsToggleText) {
                individualPaymentsToggleText.textContent = 'Enabled';
            }
            existingPayment.individualPayments.forEach(payment => {
                const input = document.querySelector(`input[name="individualPayment"][data-player="${payment.playerName}"]`);
                if (input) input.value = payment.amount || '';
            });
            updateIndividualPaymentsTotal();
        }
    } else {
        // Reset form
        const formEl = document.getElementById('weeklyPaymentForm');
        if (formEl) {
            formEl.reset();
        }
        
        const paidNoEl = document.getElementById('weeklyPaidNo');
        if (paidNoEl) {
            paidNoEl.checked = true;
        }
        
        // Set default date to match date if available
        const dateEl = document.getElementById('weeklyPaymentDate');
        if (dateEl) {
            dateEl.value = matchDate || '';
        }
        
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
    if (!modalElement) {
        console.error('weeklyPaymentModal element not found!');
        showAlertModal('Payment modal not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
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
    const container = document.getElementById('individualPaymentsList');
    if (!container) {
        console.warn('individualPaymentsList element not found');
        return;
    }
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
    const weeklyTeamDuesEl = document.getElementById('weeklyTeamDuesAmount');
    if (weeklyTeamDuesEl) {
        weeklyTeamDuesEl.textContent = weeklyTeamDues.toFixed(2);
    }
    
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
    const fargoConfig = document.getElementById('fargoConfig');
    const updateModeSection = document.getElementById('updateModeSection');
    const divisionSelectionSection = document.getElementById('divisionSelectionSection');
    const fargoTeamsSection = document.getElementById('fargoTeamsSection');
    const existingDivisionSection = document.getElementById('existingDivisionSection');
    const mergeConfirmationSection = document.getElementById('mergeConfirmationSection');
    const previewSection = document.getElementById('previewSection');
    const createSection = document.getElementById('createSection');
    
    // Show URL input section, hide division selection until URL is loaded
    if (fargoConfig) fargoConfig.style.display = 'none';
    if (updateModeSection) updateModeSection.style.display = 'none';
    if (divisionSelectionSection) divisionSelectionSection.style.display = 'none';
    if (fargoTeamsSection) fargoTeamsSection.style.display = 'none';
    if (existingDivisionSection) existingDivisionSection.style.display = 'none';
    if (mergeConfirmationSection) mergeConfirmationSection.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    if (createSection) createSection.style.display = 'none';
    if (divisionSettingsSection) divisionSettingsSection.style.display = 'none';
    
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
    const allPlayersPerWeek = document.querySelectorAll('#smartBuilderPlayersPerWeek');
    const allTotalWeeks = document.querySelectorAll('#smartBuilderTotalWeeks');
    
    allDuesPerPlayer.forEach(input => input.value = '8');
    allPlayersPerWeek.forEach(input => input.value = '5');
    allTotalWeeks.forEach(select => select.value = '20');
    
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
    
    // Clear previous Fargo Rate data
    fargoTeamData = [];
    
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
    
    const teamsSelectionSection = document.getElementById('teamsSelectionSection');
    if (teamsSelectionSection) {
        teamsSelectionSection.style.display = 'none';
    }
    
    // divisionSettingsSection already declared above, just hide it
    if (divisionSettingsSection) {
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
    
    // Show the Smart Builder modal
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    if (smartBuilderModal) {
        console.log('✅ Smart Builder modal found, opening...');
        const bsModal = new bootstrap.Modal(smartBuilderModal);
        bsModal.show();
        console.log('✅ Smart Builder modal should now be visible');
    } else {
        console.error('❌ Smart Builder modal not found!');
        showAlertModal('Smart Builder modal not found. Please refresh the page.', 'error', 'Error');
    }
}

// Open Smart Builder from Add Division modal
function openSmartBuilderFromAddDivision() {
    console.log('🔧 openSmartBuilderFromAddDivision called');
    
    // Close the add division modal first
    const addDivisionModal = document.getElementById('addDivisionModal');
    if (addDivisionModal) {
        const bsModal = bootstrap.Modal.getInstance(addDivisionModal);
        if (bsModal) {
            bsModal.hide();
        }
    }
    
    // Remove any lingering modal backdrops
    setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Now open Smart Builder modal
        console.log('🔧 Opening Smart Builder modal...');
        showSmartBuilderModal();
    }, 300);
}

async function fetchFargoDivisions() {
    // Check which section is active and get the URL from the correct input
    const updateModeRadios = document.querySelectorAll('input[name="updateMode"]:checked');
    const updateMode = updateModeRadios.length > 0 ? updateModeRadios[0].value : 'create';
    
    console.log('🔍 fetchFargoDivisions called, updateMode:', updateMode);
    
    // Get all URL inputs (there might be multiple - one in smartBuilderModal, one in divisionManagementModal)
    const allCreateInputs = document.querySelectorAll('#fargoLeagueUrl');
    const allUpdateInputs = document.querySelectorAll('#fargoLeagueUrlUpdate');
    
    console.log('Found create inputs:', allCreateInputs.length);
    console.log('Found update inputs:', allUpdateInputs.length);
    
    let fargoLeagueUrl = '';
    
    // Try to get URL from the visible/active input based on mode
    if (updateMode === 'update') {
        // Check all update inputs and use the first one with a value
        for (const input of allUpdateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in update input:', value.substring(0, 50) + '...');
                break;
            }
        }
    } else {
        // Check all create inputs and use the first one with a value
        for (const input of allCreateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in create input:', value.substring(0, 50) + '...');
                break;
            }
        }
    }
    
    // If still empty, try both types as fallback (check all inputs)
    if (!fargoLeagueUrl) {
        console.log('⚠️ No URL found in mode-specific input, trying all inputs...');
        for (const input of allCreateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in create input (fallback):', value.substring(0, 50) + '...');
                break;
            }
        }
        if (!fargoLeagueUrl) {
            for (const input of allUpdateInputs) {
                const value = input.value.trim();
                if (value) {
                    fargoLeagueUrl = value;
                    console.log('✅ Found URL in update input (fallback):', value.substring(0, 50) + '...');
                    break;
                }
            }
        }
    }
    
    console.log('Final fargoLeagueUrl length:', fargoLeagueUrl.length);
    
    if (!fargoLeagueUrl) {
        console.error('❌ No URL found in any input field');
        showAlertModal('Please enter the Fargo Rate League Reports URL', 'warning', 'Missing URL');
        return;
    }
    
    // Extract League ID and Division ID from the URL
    let leagueId, divisionId;
    try {
    const urlParams = new URLSearchParams(new URL(fargoLeagueUrl).search);
        leagueId = urlParams.get('leagueId');
        divisionId = urlParams.get('divisionId');
    } catch (urlError) {
        showAlertModal('Invalid URL format. Please enter a valid Fargo Rate URL.', 'error', 'Invalid URL');
        return;
    }

    // Cache the last successfully parsed IDs so follow-up actions
    // (like "Fetch teams for division") don't require re-entering the URL.
    window.__lastFargoImport = window.__lastFargoImport || {};
    window.__lastFargoImport.leagueId = leagueId || '';
    window.__lastFargoImport.divisionIdFromUrl = divisionId || '';
    
    if (!leagueId) {
        alert('Could not extract League ID from the URL. Please make sure the URL is correct.');
        return;
    }
    
    // Show loading indicator - find all spinners (there might be multiple)
    const loadingSpinners = document.querySelectorAll('#fargoLoading');
    const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
    
    // Show all loading indicators (simple loading message)
    loadingSpinners.forEach(spinner => {
        spinner.classList.remove('d-none');
        spinner.style.display = 'inline-flex';
        spinner.innerHTML = '<span class="small text-muted">Loading...</span>';
    });
    
    importButtons.forEach(btn => {
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.dataset.originalText = originalText;
        // Smaller spinner in button
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2" style="font-size: 0.875rem;"></i><span style="font-size: 0.875rem;">Importing...</span>';
    });
    
    // Show a status message
    showLoadingMessage('Fetching teams from Fargo Rate... This may take a moment.');
    
    // If divisionId is in the URL, automatically fetch teams directly
    if (divisionId) {
        console.log('✅ Division ID found in URL, fetching teams directly...');
        console.log('   Division ID:', divisionId);
        // Pre-fill the manual division ID field(s) (there are duplicates across modals/tabs)
        const manualDivInputs = document.querySelectorAll('#manualDivisionId, #manualDivisionId2');
        manualDivInputs.forEach(input => {
            try { input.value = divisionId; } catch (_) {}
        });
        // Hide division selection and fetch teams directly
        const divSelectionSection = document.getElementById('divisionSelectionSection');
        if (divSelectionSection) {
            divSelectionSection.style.display = 'none';
        }
        // Fetch teams using the extracted IDs
        try {
            await fetchSelectedDivisionTeams();
        } catch (error) {
            console.error('❌ Error in fetchSelectedDivisionTeams:', error);
            showAlertModal('Error fetching teams: ' + (error.message || 'Unknown error'), 'error', 'Fetch Error');
        } finally {
            // Hide all loading spinners and re-enable buttons
            const loadingSpinners = document.querySelectorAll('#fargoLoading');
            const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
            
            loadingSpinners.forEach(spinner => {
                spinner.classList.add('d-none');
                spinner.style.display = 'none';
                spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
            });
            
            importButtons.forEach(btn => {
                btn.disabled = false;
                if (btn.dataset.originalText) {
                    btn.innerHTML = btn.dataset.originalText;
                }
            });
            
            hideLoadingMessage();
        }
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
                const fargoConfig = document.getElementById('fargoConfig');
                if (fargoConfig) fargoConfig.style.display = 'block';
            } else {
                // No divisions returned, show manual entry
                const fargoConfig = document.getElementById('fargoConfig');
                if (fargoConfig) fargoConfig.style.display = 'block';
                const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
                if (fargoDivisionSelect) {
                    fargoDivisionSelect.innerHTML = '<option value="">Enter Division ID manually</option>';
                }
            }
        } else {
            // Show manual entry on error
            const fargoConfig = document.getElementById('fargoConfig');
            if (fargoConfig) fargoConfig.style.display = 'block';
            const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
            if (fargoDivisionSelect) {
                fargoDivisionSelect.innerHTML = '<option value="">Enter Division ID manually</option>';
            }
        }
    } catch (error) {
        console.error('Error fetching divisions:', error);
        // Show manual entry on error
        const fargoConfig = document.getElementById('fargoConfig');
        if (fargoConfig) fargoConfig.style.display = 'block';
        const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
        if (fargoDivisionSelect) {
            fargoDivisionSelect.innerHTML = '<option value="">Enter Division ID manually</option>';
        }
    } finally {
        // Hide all loading spinners and re-enable buttons
        const loadingSpinners = document.querySelectorAll('#fargoLoading');
        const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
        
        loadingSpinners.forEach(spinner => {
            spinner.classList.add('d-none');
            spinner.style.display = 'none';
            spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
        });
        
        importButtons.forEach(btn => {
            btn.disabled = false;
            if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        });
        
        hideLoadingMessage();
    }
}

function populateDivisionDropdown() {
    const divisionSelect = document.getElementById('fargoDivisionSelect');
    if (!divisionSelect) {
        console.error('fargoDivisionSelect element not found');
        return;
    }
    
    divisionSelect.innerHTML = '<option value="">Select a division...</option>';
    
    availableDivisions.forEach(division => {
        const option = document.createElement('option');
        option.value = division.id;
        option.textContent = division.name;
        divisionSelect.appendChild(option);
    });
    
    // Show the division selection section
    const fargoConfig = document.getElementById('fargoConfig');
    if (fargoConfig) fargoConfig.style.display = 'block';
}

function onDivisionSelected() {
    const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
    const fargoDivisionId = document.getElementById('fargoDivisionId');
    
    if (!fargoDivisionSelect) {
        console.error('fargoDivisionSelect element not found');
        return;
    }
    
    const selectedDivisionId = fargoDivisionSelect.value;
    const manualDivisionId = fargoDivisionId ? fargoDivisionId.value.trim() : '';
    
    // If a division is selected, automatically fetch teams
    if (selectedDivisionId) {
        // Store the division ID for fetching teams
        window.__lastFargoImport = window.__lastFargoImport || {};
        window.__lastFargoImport.divisionId = selectedDivisionId;
        
        // Automatically fetch teams for the selected division
        fetchSelectedDivisionTeams();
    }
}

// Add event listener for manual division ID input when modal opens
function setupManualDivisionIdListener() {
    const manualDivisionIdInput = document.getElementById('fargoDivisionId');
    if (manualDivisionIdInput) {
        const divisionId = manualDivisionIdInput.value.trim();
        
        if (divisionId) {
            // Store the division ID for fetching teams
            window.__lastFargoImport = window.__lastFargoImport || {};
            window.__lastFargoImport.divisionId = divisionId;
            
            // Fetch teams for the entered division ID
            fetchSelectedDivisionTeams();
        } else {
            showAlertModal('Please enter a Division ID', 'warning', 'Missing Division ID');
        }
    } else {
        console.error('fargoDivisionId input not found');
    }
}

async function fetchSelectedDivisionTeams() {
    console.log('🚀 fetchSelectedDivisionTeams() STARTED');
    
    // Try to get division ID from various sources
    let selectedDivisionId = '';
    
    // Check fargoDivisionSelect (Smart Builder modal)
    const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
    if (fargoDivisionSelect && fargoDivisionSelect.value) {
        selectedDivisionId = fargoDivisionSelect.value;
    }
    
    // Check fargoDivisionId (manual input in Smart Builder)
    const fargoDivisionId = document.getElementById('fargoDivisionId');
    if (!selectedDivisionId && fargoDivisionId && fargoDivisionId.value.trim()) {
        selectedDivisionId = fargoDivisionId.value.trim();
    }
    
    // Check selectedDivision (if exists in other modals)
    if (!selectedDivisionId) {
        const selectedDivision = document.getElementById('selectedDivision');
        if (selectedDivision && selectedDivision.value) {
            selectedDivisionId = selectedDivision.value;
        }
    }
    
    // Check manualDivisionId (if exists in other modals)
    const manualDivisionId =
        document.getElementById('manualDivisionId')?.value?.trim() ||
        document.getElementById('manualDivisionId2')?.value?.trim() ||
        '';
    
    // Get URL from the correct input based on update mode (use same logic as fetchFargoDivisions)
    const updateModeRadios = document.querySelectorAll('input[name="updateMode"]:checked');
    const updateMode = updateModeRadios.length > 0 ? updateModeRadios[0].value : 'create';
    console.log('📋 fetchSelectedDivisionTeams updateMode:', updateMode);
    
    // Get all URL inputs (there might be multiple - one in smartBuilderModal, one in divisionManagementModal)
    const allCreateInputs = document.querySelectorAll('#fargoLeagueUrl');
    const allUpdateInputs = document.querySelectorAll('#fargoLeagueUrlUpdate');
    
    let fargoLeagueUrl = '';
    
    // Try to get URL from the visible/active input based on mode
    if (updateMode === 'update') {
        // Check all update inputs and use the first one with a value
        for (const input of allUpdateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in update input (fetchSelectedDivisionTeams):', value.substring(0, 50) + '...');
                break;
            }
        }
    } else {
        // Check all create inputs and use the first one with a value
        for (const input of allCreateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in create input (fetchSelectedDivisionTeams):', value.substring(0, 50) + '...');
                break;
            }
        }
    }
    
    // If still empty, try both types as fallback (check all inputs)
    if (!fargoLeagueUrl) {
        console.log('⚠️ No URL found in mode-specific input, trying all inputs (fetchSelectedDivisionTeams)...');
        for (const input of allCreateInputs) {
            const value = input.value.trim();
            if (value) {
                fargoLeagueUrl = value;
                console.log('✅ Found URL in create input (fallback):', value.substring(0, 50) + '...');
                break;
            }
        }
        if (!fargoLeagueUrl) {
            for (const input of allUpdateInputs) {
                const value = input.value.trim();
                if (value) {
                    fargoLeagueUrl = value;
                    console.log('✅ Found URL in update input (fallback):', value.substring(0, 50) + '...');
                    break;
                }
            }
        }
    }
    
    console.log('Final fargoLeagueUrl length (fetchSelectedDivisionTeams):', fargoLeagueUrl.length);
    
    // If URL is empty, try to fall back to the last successfully parsed import IDs.
    // This prevents the "Missing URL" warning when data was already extracted.
    let urlParams;
    if (!fargoLeagueUrl) {
        const cached = window.__lastFargoImport || {};
        if (cached.leagueId) {
            urlParams = new URLSearchParams();
            urlParams.set('leagueId', cached.leagueId);
            if (cached.divisionIdFromUrl) urlParams.set('divisionId', cached.divisionIdFromUrl);
        } else {
            console.error('❌ No URL found in fetchSelectedDivisionTeams and no cached leagueId');
            showAlertModal('Please enter the Fargo Rate League Reports URL', 'warning', 'Missing URL');
            return;
        }
    }
    
    // Extract League ID and Division ID from the URL (if we didn't already build urlParams from cache)
    if (!urlParams) {
        try {
            urlParams = new URLSearchParams(new URL(fargoLeagueUrl).search);
        } catch (e) {
            console.error('❌ Invalid URL format:', e);
            showAlertModal('Invalid URL format. Please enter a valid Fargo Rate URL.', 'error', 'Invalid URL');
            return;
        }
    }
    
    const leagueId = urlParams.get('leagueId');
    const divisionIdFromUrl = urlParams.get('divisionId');

    // Keep cache up to date for subsequent steps
    window.__lastFargoImport = window.__lastFargoImport || {};
    window.__lastFargoImport.leagueId = leagueId || window.__lastFargoImport.leagueId || '';
    window.__lastFargoImport.divisionIdFromUrl = divisionIdFromUrl || window.__lastFargoImport.divisionIdFromUrl || '';
    
    console.log('📋 Extracted from URL - leagueId:', leagueId, 'divisionId:', divisionIdFromUrl);
    
    if (!leagueId) {
        showAlertModal('Could not extract League ID from the URL. Please make sure the URL is correct.', 'error', 'Invalid URL');
        return;
    }
    
    // Use division ID from URL first, then manual input, then selected division
    const divisionId = divisionIdFromUrl || manualDivisionId || selectedDivisionId;
    
    console.log('📋 Using divisionId:', divisionId, '(from URL:', !!divisionIdFromUrl, 'manual:', !!manualDivisionId, 'selected:', !!selectedDivisionId, ')');
    
    if (!divisionId || divisionId === 'manual') {
        showAlertModal('Please select a division, enter a division ID manually, or use a Fargo Rate URL that includes the divisionId parameter.', 'warning', 'Missing Division');
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
    
    // Show loading indicator (already shown in fetchFargoDivisions, but ensure it's visible)
    const loadingSpinners = document.querySelectorAll('#fargoLoading');
    loadingSpinners.forEach(spinner => {
        spinner.classList.remove('d-none');
    });
    
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
                console.log('✅ Teams fetched successfully, updateMode:', updateMode);
                console.log('📊 About to show preview first, then settings, fargoTeamData length:', fargoTeamData.length);
                if (updateMode === 'update') {
                    // Show Fargo Rate teams preview first
                    console.log('📋 Showing Fargo teams preview (update mode)');
                    showFargoTeamsPreview();
                } else {
                    // Show preview first, then division settings
                    console.log('📋 Showing preview first (create mode)');
                    showPreviewSection();
                    // After preview is shown, show division settings
                    setTimeout(() => {
                        showDivisionSettingsSection();
                        // Update stats after settings are shown - additional delay to ensure fields are ready
                        setTimeout(() => {
                            updateDivisionStats();
                        }, 150);
                    }, 100);
                }
            } else {
                showAlertModal('No teams found for the selected division.', 'warning', 'No Teams Found');
            }
        } else if (response.status === 404) {
            // Endpoint doesn't exist - show helpful message
            showAlertModal('The Fargo Rate scraper endpoint is not available. Please contact support to enable this feature, or use the manual division creation option.', 'warning', 'Feature Unavailable');
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
            showAlertModal(`Error fetching Fargo Rate data: ${errorMessage}${debugInfo}\n\nPlease check the browser console for more details.`, 'error', 'Fargo Rate Error');
        }
    } catch (error) {
        console.error('Error fetching Fargo Rate data:', error);
            showAlertModal('Error fetching Fargo Rate data. Please make sure the URL is correct and try again.', 'error', 'Fargo Rate Error');
    } finally {
        // Hide all loading spinners and re-enable buttons
        const loadingSpinners = document.querySelectorAll('#fargoLoading');
        const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
        
        loadingSpinners.forEach(spinner => {
            spinner.classList.add('d-none');
            spinner.style.display = 'none';
            spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
        });
        
        importButtons.forEach(btn => {
            btn.disabled = false;
            if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        });
        
        hideLoadingMessage();
    }
    console.log('✅ fetchSelectedDivisionTeams() COMPLETED');
}

function showPreviewSection() {
    console.log('🔍 showPreviewSection() called');
    
    // Find the visible preview section (could be in smartBuilderModal or divisionManagementModal)
    const previewSections = document.querySelectorAll('#previewSection');
    const createSections = document.querySelectorAll('#createSection');
    const teamsPreviews = document.querySelectorAll('#teamsPreview');
    
    console.log('Found preview sections:', previewSections.length);
    console.log('Found create sections:', createSections.length);
    console.log('Found teams previews:', teamsPreviews.length);
    
    // Find which modal is currently visible/open
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    const divisionModal = document.getElementById('divisionManagementModal');
    
    let activePreviewSection = null;
    let activeCreateSection = null;
    let activeTeamsPreview = null;
    
    // Check if divisionManagementModal is open and visible (LMS/CSI tab)
    const isDivisionModalOpen = divisionModal && (
        divisionModal.classList.contains('show') || 
        window.getComputedStyle(divisionModal).display !== 'none' ||
        divisionModal.offsetParent !== null
    );
    
    if (isDivisionModalOpen) {
        console.log('✅ Division Management Modal is open');
        // Find preview section within divisionManagementModal (LMS/CSI tab content)
        const lmsTabPane = document.getElementById('lms-csi-pane');
        if (lmsTabPane) {
            console.log('✅ Found LMS/CSI tab pane, active:', lmsTabPane.classList.contains('active'));
            // Check if LMS tab is active (Bootstrap uses 'active' class on tab-pane)
            if (lmsTabPane.classList.contains('active') || lmsTabPane.classList.contains('show')) {
                activePreviewSection = lmsTabPane.querySelector('#previewSection');
                activeCreateSection = lmsTabPane.querySelector('#createSection');
                activeTeamsPreview = lmsTabPane.querySelector('#teamsPreview');
                console.log('Found preview in LMS tab:', !!activePreviewSection);
                console.log('Found create in LMS tab:', !!activeCreateSection);
                console.log('Found teams preview in LMS tab:', !!activeTeamsPreview);
            } else {
                console.log('⚠️ LMS tab pane exists but is not active');
            }
        } else {
            console.log('⚠️ Could not find lms-csi-pane element');
        }
    }
    // Check if smartBuilderModal is open and visible
    else if (smartBuilderModal && (smartBuilderModal.classList.contains('show') || smartBuilderModal.style.display !== 'none')) {
        console.log('✅ Smart Builder Modal is open');
        // Find preview section within smartBuilderModal
        activePreviewSection = smartBuilderModal.querySelector('#previewSection');
        activeCreateSection = smartBuilderModal.querySelector('#createSection');
        activeTeamsPreview = smartBuilderModal.querySelector('#teamsPreview');
    }
    
    // Fallback: search within any visible modal
    if (!activePreviewSection || !activeTeamsPreview) {
        console.log('⚠️ Trying fallback: searching within visible modals');
        // Try to find elements within the divisionManagementModal regardless of tab state
        if (divisionModal) {
            const fallbackPreview = divisionModal.querySelector('#previewSection');
            const fallbackCreate = divisionModal.querySelector('#createSection');
            const fallbackTeams = divisionModal.querySelector('#teamsPreview');
            if (fallbackPreview && !activePreviewSection) {
                console.log('✅ Found preview section in division modal (fallback)');
                activePreviewSection = fallbackPreview;
            }
            if (fallbackCreate && !activeCreateSection) {
                activeCreateSection = fallbackCreate;
            }
            if (fallbackTeams && !activeTeamsPreview) {
                console.log('✅ Found teams preview in division modal (fallback)');
                activeTeamsPreview = fallbackTeams;
            }
        }
    }
    
    // Final fallback: use first available if we still couldn't find the active one
    if (!activePreviewSection && previewSections.length > 0) {
        console.log('⚠️ Using final fallback: first preview section');
        activePreviewSection = previewSections[0];
    }
    if (!activeCreateSection && createSections.length > 0) {
        activeCreateSection = createSections[0];
    }
    if (!activeTeamsPreview && teamsPreviews.length > 0) {
        console.log('⚠️ Using final fallback: first teams preview');
        activeTeamsPreview = teamsPreviews[0];
    }
    
    if (activePreviewSection) {
        console.log('✅ Showing preview section');
        activePreviewSection.style.display = 'block';
    } else {
        console.error('❌ Could not find preview section');
    }
    if (activeCreateSection) {
        console.log('✅ Showing create section');
        activeCreateSection.style.display = 'block';
    } else {
        console.error('❌ Could not find create section');
    }
    
    // Populate the teams preview table
    if (!activeTeamsPreview) {
        console.error('❌ Could not find teamsPreview element');
        return;
    }
    
    console.log('✅ Found teams preview, populating with', fargoTeamData.length, 'teams');
    const tbody = activeTeamsPreview;
    tbody.innerHTML = '';
    
    // Find the active modal to get the correct field instances (same pattern as createTeamsAndDivision)
    const activeModal = document.querySelector('.modal.show');
    const searchContainer = activeModal || document;
    
    // Get duesPerPlayer from active modal (same pattern as createTeamsAndDivision)
    const duesPerPlayerField = searchContainer.querySelector('#duesPerPlayer') ||
                               document.getElementById('duesPerPlayer');
    const duesPerPlayer = parseInt(duesPerPlayerField?.value || '8') || 8;
    
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
            
            // Show additional players if available (compact format)
            let playersInfo = '';
            if (team.players && team.players.length > 1) {
                // Show first 3 players, then count
                const displayPlayers = team.players.slice(0, 3);
                const remainingCount = team.players.length - 3;
                if (remainingCount > 0) {
                    playersInfo = `${displayPlayers.join(', ')} +${remainingCount} more`;
                } else {
                    playersInfo = displayPlayers.join(', ');
                }
            } else {
                playersInfo = 'No additional players';
            }
            
            const captainName = team.captain || 'Unknown Captain';
            const escapedCaptainName = captainName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            row.innerHTML = `
                <td style="width: 40px;">
                    <input type="checkbox" class="team-checkbox" value="${index}" checked data-team-index="${index}" onchange="updateSelectedCount(); updateDivisionStats();">
                </td>
                <td style="width: 25%;"><strong>${(team.name || 'Unknown Team').replace(/</g, '&lt;')}</strong></td>
                <td style="width: 20%;">
                    <span id="captain-display-${index}">${escapedCaptainName}</span>
                    <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${index})" title="Edit Captain" style="font-size: 0.85rem;">
                        <i class="fas fa-edit text-primary"></i>
                    </button>
                </td>
                <td style="width: 30%;"><small class="text-muted">${playersInfo}</small></td>
                <td style="width: 10%; text-align: center;">
                    <span class="badge bg-info me-1">${playerCount}</span>
                    <strong>$${totalDues}</strong>
                </td>
            `;
            tbody.appendChild(row);
        });
    
    // Update counts and division name when preview is shown
    updateSelectedCount();
    
    // Also set up listeners for division name fields in case they weren't set up yet
    setupDivisionNameListeners();
    
    // Set up listener for dues field changes to update preview
    setupDuesFieldListener();
    
    // Show the import button (reuse smartBuilderModal variable declared earlier in function)
    let createTeamsBtn = null;
    
    if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
        createTeamsBtn = smartBuilderModal.querySelector('#createTeamsBtn');
    }
    
    // Fallback: search globally
    if (!createTeamsBtn) {
        createTeamsBtn = document.getElementById('createTeamsBtn');
    }
    
    if (createTeamsBtn) {
        createTeamsBtn.style.display = 'inline-block';
        console.log('✅ Import button shown in showPreviewSection');
    } else {
        console.warn('⚠️ createTeamsBtn not found in showPreviewSection');
    }
    
    // Update division stats in footer after preview is shown
    updateDivisionStats();
}

// Function to set up event listener for dues field changes
function setupDuesFieldListener() {
    // Only set up once to avoid duplicate listeners
    if (duesFieldListenerSetup) {
        return;
    }
    
    // Use event delegation to catch changes to dues field
    // This will update the preview when dues are changed
    document.addEventListener('change', function(e) {
        if (e.target.id === 'duesPerPlayer' && fargoTeamData && fargoTeamData.length > 0) {
            // Re-render the preview with updated dues
            const activeModal = document.querySelector('.modal.show');
            if (activeModal) {
                const activeTeamsPreview = activeModal.querySelector('#teamsPreview');
                if (activeTeamsPreview && activeTeamsPreview.offsetParent !== null) {
                    // Preview is visible, update it
                    showPreviewSection();
                }
            }
        }
    }, { once: false });
    
    duesFieldListenerSetup = true;
}

function toggleAllTeams() {
    const selectAll = document.getElementById('selectAllTeams');
    const checkboxes = document.querySelectorAll('.team-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedCount();
    updateDivisionStats();
}

// Function to set up event listeners for division name and game type fields
function setupDivisionNameListeners() {
    // Only set up once to avoid duplicate listeners
    if (divisionNameListenersSetup) {
        return;
    }
    
    // Use event delegation on the document to catch all changes
    // This works even if elements are added/removed dynamically
    document.addEventListener('input', function(e) {
        if (e.target.matches('#smartBuilderDivisionName, #smartBuilderDivisionName2, #smartBuilderDivision2Name, #divisionName')) {
            updateSelectedCount();
        }
    });
    
    document.addEventListener('change', function(e) {
        if (e.target.matches('#smartBuilderDivisionName, #smartBuilderDivisionName2, #smartBuilderDivision2Name, #divisionName, #firstGameType, #smartBuilderFirstGameType, #smartBuilderSecondGameType, #smartBuilderIsDoublePlay, #smartBuilderGameType, #smartBuilderStartDate, #smartBuilderTotalWeeks, #smartBuilderWeeklyDues, #smartBuilderPlayersPerWeek, #smartBuilderMatchesPerWeek')) {
            updateSelectedCount();
            // Small delay to ensure value is set
            setTimeout(() => {
                updateDivisionStats();
            }, 50);
        }
    });
    
    // Also listen for input events on date and weeks fields
    document.addEventListener('input', function(e) {
        if (e.target.matches('#smartBuilderStartDate, #smartBuilderTotalWeeks, #smartBuilderWeeklyDues, #smartBuilderPlayersPerWeek, #smartBuilderMatchesPerWeek')) {
            // Small delay to ensure value is set
            setTimeout(() => {
                updateDivisionStats();
            }, 50);
        }
    });
    
    // Listen for team checkbox changes to update stats
    document.addEventListener('change', function(e) {
        if (e.target.matches('.team-checkbox')) {
            updateDivisionStats();
        }
    });
    
    divisionNameListenersSetup = true;
}

// Function to set up date picker handlers - make date inputs open picker when clicked
function setupDatePickerHandlers() {
    // Only set up once to avoid duplicate listeners
    if (datePickerListenersSetup) {
        return;
    }
    
    // Most modern browsers already open the date picker when clicking anywhere on a date input.
    // This handler only adds showPicker() support for browsers that support it but don't auto-open.
    // We use a very simple approach that doesn't interfere with native behavior.
    
    document.addEventListener('click', function(e) {
        // Only handle direct clicks on the date input element itself
        if (e.target.type === 'date' && !e.target.readOnly && e.target === e.target) {
            // Check if browser supports showPicker and if picker isn't already open
            if (e.target.showPicker && typeof e.target.showPicker === 'function') {
                // Use requestAnimationFrame to ensure this runs after native handlers
                requestAnimationFrame(() => {
                    try {
                        // Only call if input is still focused (user actually clicked it)
                        if (document.activeElement === e.target) {
                            e.target.showPicker();
                        }
                    } catch (err) {
                        // Silently fail - native behavior will handle it
                    }
                });
            }
        }
    });
    
    datePickerListenersSetup = true;
}

async function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    const selectedCount = selectedCheckboxes.length;
    
    // Calculate total players from selected teams and collect player names
    let totalPlayers = 0;
    const selectedPlayerNames = new Set();
    
    selectedCheckboxes.forEach(checkbox => {
        const teamIndex = parseInt(checkbox.value);
        if (fargoTeamData && fargoTeamData[teamIndex]) {
            const team = fargoTeamData[teamIndex];
            // Use playerCount if available (most reliable)
            if (team.playerCount) {
                totalPlayers += team.playerCount;
            } else if (team.players && Array.isArray(team.players)) {
                // Count unique players (captain might be in the array)
                const uniquePlayers = new Set();
                if (team.captain) uniquePlayers.add(team.captain);
                team.players.forEach(player => {
                    if (player) uniquePlayers.add(player);
                });
                totalPlayers += uniquePlayers.size;
            } else {
                // Fallback: at least 1 (the captain)
                totalPlayers += 1;
            }
            
            // Collect all player names for duplicate checking
            if (team.captain) selectedPlayerNames.add(team.captain);
            if (team.players && Array.isArray(team.players)) {
                team.players.forEach(player => {
                    if (player) selectedPlayerNames.add(player);
                });
            }
        }
    });
    
    // Update display elements (handle multiple instances)
    const selectedTeamsCountElements = document.querySelectorAll('#selectedTeamsCount');
    const selectedPlayersCountElements = document.querySelectorAll('#selectedPlayersCount');
    const selectedDivisionNameElements = document.querySelectorAll('#selectedDivisionName');
    
    selectedTeamsCountElements.forEach(el => el.textContent = selectedCount);
    selectedPlayersCountElements.forEach(el => el.textContent = totalPlayers);
    
    // Calculate the actual division name that will be created.
    // This must match the logic in createTeamsAndDivision() exactly!
    // createTeamsAndDivision() uses:
    // - For regular: smartBuilderDivisionName + firstGameType
    // - For double play: smartBuilderDivisionName (Division 1) + smartBuilderDivision2Name (Division 2) + firstGameType + smartBuilderSecondGameType
    // NOTE: Preview section has smartBuilderDivisionName2 and smartBuilderFirstGameType, but
    // createTeamsAndDivision() uses smartBuilderDivisionName and firstGameType, so we need to check both!
    let divisionName = 'New Division';

    const activeModal = document.querySelector('.modal.show');
    const activeContainer = activeModal || document;

    // Check for double play checkbox (same logic as createTeamsAndDivision)
    const isDoublePlay = !!(activeContainer.querySelector('#smartBuilderIsDoublePlay')?.checked);

    if (isDoublePlay) {
        // Double play: use smartBuilderDivisionName (Division 1) + smartBuilderDivision2Name (Division 2) + game types
        const division1NameField = activeContainer.querySelector('#smartBuilderDivisionName');
        const division1Name = (division1NameField?.value || '').trim();
        const division2NameField = activeContainer.querySelector('#smartBuilderDivision2Name');
        const division2Name = (division2NameField?.value || '').trim();
        // Check both firstGameType and smartBuilderFirstGameType (preview section uses the latter)
        const firstGameType = (activeContainer.querySelector('#smartBuilderGameType')?.value ||
                             activeContainer.querySelector('#firstGameType')?.value || 
                             activeContainer.querySelector('#smartBuilderFirstGameType')?.value || '').trim();
        const secondGameType = (activeContainer.querySelector('#smartBuilderSecondGameType')?.value || '').trim();
        
        if (division1Name && division2Name && firstGameType && secondGameType) {
            // Format: "Division 1 Name - Game Type 1 / Division 2 Name - Game Type 2"
            divisionName = `${division1Name} - ${firstGameType} / ${division2Name} - ${secondGameType}`;
        } else if (division1Name && division2Name) {
            divisionName = `${division1Name} / ${division2Name}`;
        } else if (division1Name) {
            divisionName = division1Name;
        } else if (division2Name) {
            divisionName = division2Name;
        }
    } else {
        // Regular division: use smartBuilderDivisionName + firstGameType
        // (same as createTeamsAndDivision line 8134-8142)
        // Check both smartBuilderDivisionName and smartBuilderDivisionName2 (preview section uses the latter)
        const baseName = (activeContainer.querySelector('#smartBuilderDivisionName')?.value || 
                         activeContainer.querySelector('#smartBuilderDivisionName2')?.value || '').trim();
        // Check both firstGameType and smartBuilderFirstGameType (preview section uses the latter)
        const gameType = (activeContainer.querySelector('#firstGameType')?.value || 
                         activeContainer.querySelector('#smartBuilderFirstGameType')?.value || '').trim();
        
        if (baseName && gameType) {
            divisionName = `${baseName} - ${gameType}`;
        } else if (baseName) {
            divisionName = baseName;
        } else if (gameType) {
            divisionName = `New Division - ${gameType}`;
        }
    }

    selectedDivisionNameElements.forEach(el => el.textContent = divisionName);
    
    // Check for duplicate players in other divisions
    await checkForDuplicatePlayers(Array.from(selectedPlayerNames));
    
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
    
    // Update division stats in footer
    updateDivisionStats();
}

// Update division statistics in the footer
function updateDivisionStats() {
    const statsFooter = document.getElementById('divisionStatsFooter');
    if (!statsFooter) return;
    
    // Only show stats if we're in the Smart Builder modal and have teams loaded
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    if (!smartBuilderModal || !smartBuilderModal.classList.contains('show')) {
        statsFooter.style.display = 'none';
        return;
    }
    
    if (!fargoTeamData || fargoTeamData.length === 0) {
        statsFooter.style.display = 'none';
        return;
    }
    
    // Get division name - search in Smart Builder modal specifically (reuse smartBuilderModal from above)
    const searchContainer = smartBuilderModal || document;
    const isDoublePlay = !!(searchContainer.querySelector('#smartBuilderIsDoublePlay')?.checked);
    
    let divisionName = '-';
    if (isDoublePlay) {
        // Try to find fields in multiple ways
        let division1NameField = searchContainer.querySelector('#smartBuilderDivisionName');
        let division2NameField = searchContainer.querySelector('#smartBuilderDivision2Name');
        let division1GameTypeField = searchContainer.querySelector('#smartBuilderGameType');
        let division2GameTypeField = searchContainer.querySelector('#smartBuilderSecondGameType');
        
        // Fallback to document.getElementById if not found in container
        if (!division1NameField) division1NameField = document.getElementById('smartBuilderDivisionName');
        if (!division2NameField) division2NameField = document.getElementById('smartBuilderDivision2Name');
        if (!division1GameTypeField) division1GameTypeField = document.getElementById('smartBuilderGameType');
        if (!division2GameTypeField) division2GameTypeField = document.getElementById('smartBuilderSecondGameType');
        
        const division1Name = (division1NameField?.value || '').trim();
        const division2Name = (division2NameField?.value || '').trim();
        const division1GameType = (division1GameTypeField?.value || '').trim();
        const division2GameType = (division2GameTypeField?.value || '').trim();
        
        if (division1Name && division2Name && division1GameType && division2GameType) {
            divisionName = `${division1Name} - ${division1GameType} / ${division2Name} - ${division2GameType}`;
        } else if (division1Name && division2Name) {
            divisionName = `${division1Name} / ${division2Name}`;
        } else if (division1Name) {
            divisionName = division1Name || '-';
        }
    } else {
        // Try to find fields in multiple ways
        let nameField = searchContainer.querySelector('#smartBuilderDivisionName');
        let gameTypeField = searchContainer.querySelector('#smartBuilderGameType');
        
        // Fallback to document.getElementById if not found in container
        if (!nameField) nameField = document.getElementById('smartBuilderDivisionName');
        if (!gameTypeField) gameTypeField = document.getElementById('smartBuilderGameType');
        
        const name = (nameField?.value || '').trim();
        const gameType = (gameTypeField?.value || '').trim();
        
        if (name && gameType) {
            divisionName = `${name} - ${gameType}`;
        } else if (name) {
            divisionName = name;
        } else {
            divisionName = '-';
        }
    }
    
    // Get day of play from start date - try multiple ways to find the field
    let startDateField = searchContainer.querySelector('#smartBuilderStartDate');
    if (!startDateField) {
        startDateField = document.getElementById('smartBuilderStartDate');
    }
    let dayOfPlay = '-';
    if (startDateField && startDateField.value) {
        try {
            const dateValue = startDateField.value;
            if (dateValue && dateValue.includes('-')) {
                const [year, month, day] = dateValue.split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                if (!isNaN(startDate.getTime())) {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    dayOfPlay = dayNames[startDate.getDay()];
                }
            }
        } catch (e) {
            console.error('Error calculating day of play:', e);
            dayOfPlay = '-';
        }
    }
    
    // Get total weeks from select dropdown - try multiple ways to find the field
    let totalWeeksField = searchContainer.querySelector('#smartBuilderTotalWeeks');
    if (!totalWeeksField) {
        totalWeeksField = document.getElementById('smartBuilderTotalWeeks');
    }
    let totalWeeks = '-';
    if (totalWeeksField) {
        const weeksValue = totalWeeksField.value;
        if (weeksValue && weeksValue !== '') {
            totalWeeks = `${weeksValue} weeks`;
        }
    }
    
    // Calculate weekly dues per team per division
    let weeklyDuesPerTeam = '-';
    try {
        // Get dues per player per match
        let weeklyDuesField = searchContainer.querySelector('#smartBuilderWeeklyDues');
        if (!weeklyDuesField) {
            weeklyDuesField = document.getElementById('smartBuilderWeeklyDues');
        }
        
        // Get players per week
        let playersPerWeekField = searchContainer.querySelector('#smartBuilderPlayersPerWeek');
        if (!playersPerWeekField) {
            playersPerWeekField = document.getElementById('smartBuilderPlayersPerWeek');
        }
        
        const duesPerPlayerPerMatch = parseFloat(weeklyDuesField?.value || '0') || 0;
        const playersPerWeek = parseInt(playersPerWeekField?.value || '5') || 5;
        
        if (duesPerPlayerPerMatch > 0 && playersPerWeek > 0) {
            // Calculate weekly dues per team per division (NOT multiplied by double play)
            // This is the amount for ONE division
            // Formula: (dues per player per match) × (players per week)
            const weeklyDuesPerDivision = duesPerPlayerPerMatch * playersPerWeek;
            
            if (isDoublePlay) {
                // For double play: show per division and total
                // Example: $10 × 5 players = $50 per division, $50 × 2 = $100 total
                const totalWeeklyDues = weeklyDuesPerDivision * 2;
                weeklyDuesPerTeam = `$${weeklyDuesPerDivision.toFixed(2)} per division ($${totalWeeklyDues.toFixed(2)} total)`;
            } else {
                // For single play: just show the amount
                weeklyDuesPerTeam = `$${weeklyDuesPerDivision.toFixed(2)}`;
            }
        }
    } catch (e) {
        console.error('Error calculating weekly dues per team:', e);
        weeklyDuesPerTeam = '-';
    }
    
    // Count selected teams (if any are selected, use that count; otherwise show total available)
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    const totalCheckboxes = document.querySelectorAll('.team-checkbox');
    // If teams are selected, show selected count; otherwise show total available
    const teamCount = selectedCheckboxes.length > 0 ? selectedCheckboxes.length : (totalCheckboxes.length > 0 ? totalCheckboxes.length : (fargoTeamData ? fargoTeamData.length : 0));
    
    // Count total players from selected teams
    let playerCount = 0;
    
    if (selectedCheckboxes.length > 0) {
        // Count players from selected teams only
        selectedCheckboxes.forEach(checkbox => {
            const teamIndex = parseInt(checkbox.dataset.teamIndex || checkbox.value);
            if (!isNaN(teamIndex) && fargoTeamData && fargoTeamData[teamIndex]) {
                const team = fargoTeamData[teamIndex];
                // Count players: captain + team members
                let teamPlayerCount = 1; // Captain
                if (team.players && Array.isArray(team.players)) {
                    teamPlayerCount += team.players.length;
                } else if (team.playerCount) {
                    teamPlayerCount = team.playerCount;
                }
                playerCount += teamPlayerCount;
            }
        });
    } else {
        // If no teams selected, count all available teams
        if (fargoTeamData && fargoTeamData.length > 0) {
            fargoTeamData.forEach(team => {
                let teamPlayerCount = 1; // Captain
                if (team.players && Array.isArray(team.players)) {
                    teamPlayerCount += team.players.length;
                } else if (team.playerCount) {
                    teamPlayerCount = team.playerCount;
                }
                playerCount += teamPlayerCount;
            });
        }
    }
    
    // Update the stats display
    const statsDivisionNameEl = document.getElementById('statsDivisionName');
    const statsDayOfPlayEl = document.getElementById('statsDayOfPlay');
    const statsTotalWeeksEl = document.getElementById('statsTotalWeeks');
    const statsTeamCountEl = document.getElementById('statsTeamCount');
    const statsPlayerCountEl = document.getElementById('statsPlayerCount');
    const statsWeeklyDuesPerTeamEl = document.getElementById('statsWeeklyDuesPerTeam');
    
    console.log('📊 Updating division stats:', {
        divisionName,
        dayOfPlay,
        totalWeeks,
        teamCount,
        playerCount,
        weeklyDuesPerTeam,
        isDoublePlay
    });
    
    // Update division name
    if (statsDivisionNameEl) {
        statsDivisionNameEl.textContent = divisionName;
        console.log('✅ Updated division name:', divisionName);
    } else {
        console.warn('⚠️ statsDivisionNameEl not found');
    }
    
    // Update day of play
    if (statsDayOfPlayEl) {
        statsDayOfPlayEl.textContent = dayOfPlay;
        console.log('✅ Updated day of play:', dayOfPlay);
    } else {
        console.warn('⚠️ statsDayOfPlayEl not found');
    }
    
    // Update total weeks
    if (statsTotalWeeksEl) {
        statsTotalWeeksEl.textContent = totalWeeks;
        console.log('✅ Updated total weeks:', totalWeeks);
    } else {
        console.warn('⚠️ statsTotalWeeksEl not found');
    }
    
    // Update team count
    if (statsTeamCountEl) {
        statsTeamCountEl.textContent = teamCount;
    }
    
    // Update player count
    if (statsPlayerCountEl) {
        statsPlayerCountEl.textContent = playerCount || '-';
    }
    
    // Update weekly dues per team
    if (statsWeeklyDuesPerTeamEl) {
        statsWeeklyDuesPerTeamEl.textContent = weeklyDuesPerTeam;
        console.log('✅ Updated weekly dues per team:', weeklyDuesPerTeam);
    } else {
        console.warn('⚠️ statsWeeklyDuesPerTeamEl not found');
    }
    
    // Show the stats footer
    statsFooter.style.display = 'flex';
    console.log('✅ Stats footer displayed');
}

// Function to check for duplicate players across divisions
async function checkForDuplicatePlayers(playerNames) {
    if (playerNames.length === 0) {
        // Hide duplicate alert if no players selected
        const duplicateAlerts = document.querySelectorAll('#duplicatePlayersAlert');
        duplicateAlerts.forEach(alert => alert.style.display = 'none');
        return;
    }
    
    try {
        // Fetch all existing teams
        const response = await apiCall('/teams');
        if (!response.ok) {
            console.error('Failed to fetch teams for duplicate check');
            return;
        }
        
        const responseData = await response.json();
        // Handle both array response and object with teams property (pagination response)
        let allTeams = [];
        if (Array.isArray(responseData)) {
            allTeams = responseData;
        } else if (responseData.teams && Array.isArray(responseData.teams)) {
            allTeams = responseData.teams;
        } else {
            console.error('Unexpected response format from /teams endpoint:', responseData);
            return;
        }
        
        const duplicateMap = new Map(); // playerName -> [{division, teamName}]
        
        // Check each selected player against existing teams
        playerNames.forEach(playerName => {
            allTeams.forEach(team => {
                // Check if player is in this team (captain or team member)
                const isInTeam = 
                    (team.captainName && team.captainName.toLowerCase() === playerName.toLowerCase()) ||
                    (team.teamMembers && team.teamMembers.some(member => 
                        member.name && member.name.toLowerCase() === playerName.toLowerCase()
                    ));
                
                if (isInTeam) {
                    if (!duplicateMap.has(playerName)) {
                        duplicateMap.set(playerName, []);
                    }
                    duplicateMap.get(playerName).push({
                        division: team.division,
                        teamName: team.teamName
                    });
                }
            });
        });
        
        // Display duplicate information
        const duplicateAlerts = document.querySelectorAll('#duplicatePlayersAlert');
        const duplicateLists = document.querySelectorAll('#duplicatePlayersList');
        
        if (duplicateMap.size > 0) {
            // Show alerts and populate with duplicate information
            duplicateAlerts.forEach(alert => alert.style.display = 'block');
            duplicateLists.forEach(list => {
                let html = '<ul class="mb-0">';
                duplicateMap.forEach((teams, playerName) => {
                    html += `<li><strong>${playerName}</strong> is already on: `;
                    const teamList = teams.map(t => `${t.teamName} (${t.division})`).join(', ');
                    html += teamList;
                    html += '</li>';
                });
                html += '</ul>';
                list.innerHTML = html;
            });
        } else {
            // Hide alerts if no duplicates
            duplicateAlerts.forEach(alert => alert.style.display = 'none');
        }
    } catch (error) {
        console.error('Error checking for duplicate players:', error);
        // Don't show error to user, just log it
    }
}

// Show Fargo Rate teams preview
// Show division settings section (Step 3)
function showDivisionSettingsSection() {
    console.log('📋 showDivisionSettingsSection called');
    
    // Show the division settings section (reuse variable from outer scope if needed, or get it fresh)
    const divisionSettingsSection = document.getElementById('divisionSettingsSection');
    if (divisionSettingsSection) {
        divisionSettingsSection.style.display = 'block';
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
            matchesPerWeekSelect.value = '1';
        }
        
        const playersPerWeekSelect = document.getElementById('smartBuilderPlayersPerWeek');
        if (playersPerWeekSelect && !playersPerWeekSelect.value) {
            playersPerWeekSelect.value = '5';
        }
        
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

// This function is no longer needed since preview is shown first
// Keeping it for backwards compatibility but it won't be called
function addContinueToPreviewButton() {
    // Preview is now shown first, so this button is not needed
    console.log('addContinueToPreviewButton called but not needed (preview shows first)');
}

function showFargoTeamsPreview() {
    console.log('📋 showFargoTeamsPreview called, teams:', fargoTeamData?.length || 0);
    
    // Show the preview section (Step 4) - use showPreviewSection to handle all the logic
    showPreviewSection();
    
    // Show the teams preview table body - try both possible locations
    let tbody = document.getElementById('fargoTeamsPreviewBody');
    if (!tbody) {
        tbody = document.getElementById('teamsPreviewBody');
    }
    
    if (tbody) {
        displayTeamsInPreview(tbody);
    } else {
        console.error('❌ Neither fargoTeamsPreviewBody nor teamsPreviewBody found');
        // Still try to show the button even if table not found
    }
    
    // Show the import button - find it in the active modal
    const smartBuilderModalForBtn = document.getElementById('smartBuilderModal');
    let createTeamsBtn = null;
    
    if (smartBuilderModalForBtn && smartBuilderModalForBtn.classList.contains('show')) {
        createTeamsBtn = smartBuilderModalForBtn.querySelector('#createTeamsBtn');
    }
    
    // Fallback: search globally
    if (!createTeamsBtn) {
        createTeamsBtn = document.getElementById('createTeamsBtn');
    }
    
    if (createTeamsBtn) {
        createTeamsBtn.style.display = 'inline-block';
        console.log('✅ Import button shown');
    } else {
        console.warn('⚠️ createTeamsBtn not found');
    }
}

function displayTeamsInPreview(tbody) {
    tbody.innerHTML = '';
    
    if (!fargoTeamData || fargoTeamData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No teams loaded</td></tr>';
        return;
    }
    
    fargoTeamData.forEach((team, index) => {
        const row = document.createElement('tr');
        const playerCount = team.playerCount || (team.players ? team.players.length : 1);
        
        // Show first few players (compact format)
        let playersInfo = '';
        if (team.players && team.players.length > 0) {
            const playerNames = team.players.slice(0, 3).join(', ');
            if (team.players.length > 3) {
                playersInfo = `${playerNames} +${team.players.length - 3} more`;
            } else {
                playersInfo = playerNames;
            }
        } else {
            playersInfo = 'No players listed';
        }
        
        const captainName = team.captain || 'Unknown Captain';
        const escapedCaptainName = captainName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const teamName = (team.name || 'Unknown Team').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Get dues rate from form or default
        const duesRateInput = document.getElementById('smartBuilderWeeklyDues') || document.getElementById('duesPerPlayer');
        const duesRate = duesRateInput ? (parseFloat(duesRateInput.value) || 0) : 0;
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input team-checkbox" checked data-team-index="${index}" onchange="updateSelectedCount(); updateDivisionStats();" style="margin-right: 8px;">
            </td>
            <td><strong>${teamName}</strong></td>
            <td>
                <span id="fargo-captain-display-${index}">${escapedCaptainName}</span>
                <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${index}, true)" title="Edit Captain" style="font-size: 0.85rem;">
                    <i class="fas fa-edit text-primary"></i>
                </button>
            </td>
            <td><small>${playersInfo}</small></td>
            <td style="text-align: center;">
                <span class="badge bg-primary">${playerCount}</span>
            </td>
            <td style="text-align: right;">
                <span class="badge bg-info">$${duesRate.toFixed(2)}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Displayed ${fargoTeamData.length} teams in preview`);
    
    // Update stats after displaying teams
    updateDivisionStats();
}

// Function to edit captain name in preview
function editCaptain(teamIndex, isFargoPreview = false) {
    const team = fargoTeamData[teamIndex];
    if (!team) {
        showAlertModal('Team not found', 'error', 'Error');
        return;
    }
    
    const currentCaptain = team.captain || '';
    const displayId = isFargoPreview ? `fargo-captain-display-${teamIndex}` : `captain-display-${teamIndex}`;
    
    // Get all players from the team
    const allPlayers = [];
    if (team.players && Array.isArray(team.players)) {
        allPlayers.push(...team.players);
    }
    
    // Add current captain if not already in the list
    if (currentCaptain && !allPlayers.includes(currentCaptain)) {
        allPlayers.unshift(currentCaptain); // Add to beginning
    }
    
    // If no players found, show error
    if (allPlayers.length === 0) {
        showAlertModal('No players found for this team', 'warning', 'No Players');
        return;
    }
    
    // Create a dropdown/select field to replace the display
    const displayElement = document.getElementById(displayId);
    if (!displayElement) {
        showAlertModal('Could not find captain display element', 'error', 'Error');
        return;
    }
    
    // Create select dropdown
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm d-inline-block';
    select.style.width = '180px';
    select.id = `captain-edit-${teamIndex}`;
    
    // Populate dropdown with player names
    allPlayers.forEach(playerName => {
        const option = document.createElement('option');
        option.value = playerName;
        option.textContent = playerName;
        if (playerName === currentCaptain) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Create save and cancel buttons
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-sm btn-success ms-1';
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
    saveBtn.onclick = () => saveCaptainEdit(teamIndex, isFargoPreview);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sm btn-secondary ms-1';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
    cancelBtn.onclick = () => cancelCaptainEdit(teamIndex, isFargoPreview);
    
    // Replace display with select and buttons
    const container = displayElement.parentElement;
    container.innerHTML = '';
    container.appendChild(select);
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);
    
    // Focus the select
    select.focus();
    
    // Handle Enter key on select
    select.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveCaptainEdit(teamIndex, isFargoPreview);
        } else if (e.key === 'Escape') {
            cancelCaptainEdit(teamIndex, isFargoPreview);
        }
    });
}

// Function to save captain edit
function saveCaptainEdit(teamIndex, isFargoPreview = false) {
    const select = document.getElementById(`captain-edit-${teamIndex}`);
    if (!select) return;
    
    const newCaptain = select.value.trim();
    const team = fargoTeamData[teamIndex];
    
    if (team) {
        // Store the original captain before changing it
        const originalCaptain = team.captain;
        
        // Update captain to the new one
        team.captain = newCaptain || 'Unknown Captain';
        
        // IMPORTANT: If the original captain exists and is different from the new captain,
        // add the original captain to the players array so they don't get lost when creating the team
        if (originalCaptain && originalCaptain !== newCaptain) {
            // Ensure team.players array exists
            if (!team.players) {
                team.players = [];
            }
            // Add original captain to players array if not already there
            if (!team.players.includes(originalCaptain)) {
                team.players.push(originalCaptain);
                console.log(`✅ Added original captain "${originalCaptain}" to players array for team ${teamIndex}`);
            }
        }
        
        // Update the display with the edit button still available
        const displayId = isFargoPreview ? `fargo-captain-display-${teamIndex}` : `captain-display-${teamIndex}`;
        const container = select.parentElement;
        const escapedCaptainName = (team.captain || 'Unknown Captain').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        container.innerHTML = `
            <span id="${displayId}">${escapedCaptainName}</span>
            <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${teamIndex}, ${isFargoPreview})" title="Edit Captain" style="font-size: 0.85rem;">
                <i class="fas fa-edit text-primary"></i>
            </button>
        `;
        
        console.log(`✅ Updated captain for team ${teamIndex}:`, team.captain, `(original: ${originalCaptain})`);
    }
}

// Function to cancel captain edit
function cancelCaptainEdit(teamIndex, isFargoPreview = false) {
    const select = document.getElementById(`captain-edit-${teamIndex}`);
    if (!select) return;
    
    const team = fargoTeamData[teamIndex];
    const displayId = isFargoPreview ? `fargo-captain-display-${teamIndex}` : `captain-display-${teamIndex}`;
    const container = select.parentElement;
    
    if (team) {
        const escapedCaptainName = (team.captain || 'Unknown Captain').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        container.innerHTML = `
            <span id="${displayId}">${escapedCaptainName}</span>
            <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${teamIndex}, ${isFargoPreview})" title="Edit Captain" style="font-size: 0.85rem;">
                <i class="fas fa-edit text-primary"></i>
            </button>
        `;
    }
}

// Show division selection after Fargo Rate preview
function showDivisionSelection() {
    document.getElementById('existingDivisionSection').style.display = 'block';
}

// Load existing divisions for update mode
async function loadExistingDivisions() {
    try {
        const select = document.getElementById('existingDivisionSelect');
        if (!select) {
            // This element doesn't exist in Smart Builder modal, which is fine
            console.log('existingDivisionSelect not found - skipping (this is normal for Smart Builder modal)');
            return;
        }
        
        const response = await apiCall('/divisions');
        const divisions = await response.json();
        
        select.innerHTML = '<option value="">Select a division to update...</option>';
        
        if (divisions && Array.isArray(divisions)) {
            divisions.forEach(division => {
                const option = document.createElement('option');
                option.value = division._id || division.id;
                option.textContent = division.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading divisions:', error);
        const select = document.getElementById('existingDivisionSelect');
        if (select) {
            select.innerHTML = '<option value="">Error loading divisions</option>';
        }
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
        showAlertModal('No Fargo Rate data available. Please fetch Fargo Rate data first.', 'warning', 'No Data Available');
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
        // Find which modal is actually open (could be smartBuilderModal or divisionManagementModal)
        const smartBuilderModal = document.getElementById('smartBuilderModal');
        const divisionManagementModal = document.getElementById('divisionManagementModal');
        
        let modalToClose = null;
        if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
            modalToClose = bootstrap.Modal.getInstance(smartBuilderModal);
        } else if (divisionManagementModal && divisionManagementModal.classList.contains('show')) {
            modalToClose = bootstrap.Modal.getInstance(divisionManagementModal);
        }
        
        if (modalToClose) {
            modalToClose.hide();
        } else {
            // Fallback: try to get instance from either modal
            const modalInstance = bootstrap.Modal.getInstance(smartBuilderModal) || 
                                 bootstrap.Modal.getInstance(divisionManagementModal);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
        console.log('Refreshing data after merge...');
        await loadData();
        console.log('Data refresh completed');
        
        showAlertModal(`Successfully updated "${divisionName}" with Fargo Rate roster data!`, 'success', 'Success');
        
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
                <input type="checkbox" class="team-checkbox" value="${index}" checked data-team-index="${index}" onchange="updateSelectedCount(); updateDivisionStats();">
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
    const updateModeRadio = document.querySelector('input[name="updateMode"]:checked');
    if (!updateModeRadio) {
        // Default to 'create' mode if no radio button is found (Smart Builder modal doesn't have update mode)
        console.log('No updateMode radio found, defaulting to create mode');
        var updateMode = 'create';
    } else {
        var updateMode = updateModeRadio.value;
    }
    
    // Find the active modal to get the correct field instances
    const activeModal = document.querySelector('.modal.show');
    const searchContainer = activeModal || document;
    
    // Get duesPerPlayer from active modal - check Smart Builder field first, then fallback
    const duesPerPlayerField = searchContainer.querySelector('#smartBuilderWeeklyDues') ||
                               searchContainer.querySelector('#duesPerPlayer') ||
                               document.getElementById('smartBuilderWeeklyDues') ||
                               document.getElementById('duesPerPlayer');
    const duesPerPlayer = parseFloat(duesPerPlayerField?.value || '8') || 8;
    
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlertModal('Please select at least one team to process', 'warning', 'No Teams Selected');
        return;
    }
    
    try {
        if (updateMode === 'create') {
            // Create new division mode - use same fields as editor
            // searchContainer is already defined above
            
            const isDoublePlayCheckbox = searchContainer.querySelector('#smartBuilderIsDoublePlay') || 
                                       document.getElementById('smartBuilderIsDoublePlay');
            const isDoublePlay = !!(isDoublePlayCheckbox?.checked);
            console.log('🔍 Double Play Checkbox:', {
                found: !!isDoublePlayCheckbox,
                checked: isDoublePlayCheckbox?.checked,
                isDoublePlay: isDoublePlay
            });
            let divisionName = '';
            
            // Format division name for double play
            if (isDoublePlay) {
                // Get Division 1 name from the regular division name field (it becomes Division 1 when double play is enabled)
                const division1NameField = searchContainer.querySelector('#smartBuilderDivisionName') ||
                                          document.getElementById('smartBuilderDivisionName');
                const division1Name = division1NameField ? division1NameField.value.trim() : '';
                
                // Get Division 2 name from the separate Division 2 name field
                const division2NameField = searchContainer.querySelector('#smartBuilderDivision2Name') ||
                                          document.getElementById('smartBuilderDivision2Name');
                const division2Name = division2NameField ? division2NameField.value.trim() : '';
                
                // Check all possible IDs for Division 1 game type (Smart Builder uses smartBuilderGameType)
                const division1GameTypeField = searchContainer.querySelector('#smartBuilderGameType') ||
                                             searchContainer.querySelector('#firstGameType') || 
                                             searchContainer.querySelector('#smartBuilderFirstGameType') ||
                                             document.getElementById('smartBuilderGameType') ||
                                             document.getElementById('firstGameType') || 
                                             document.getElementById('smartBuilderFirstGameType');
                const division1GameType = division1GameTypeField ? division1GameTypeField.value.trim() : '';
                const division2GameTypeField = searchContainer.querySelector('#smartBuilderSecondGameType') ||
                                             document.getElementById('smartBuilderSecondGameType');
                const division2GameType = division2GameTypeField ? division2GameTypeField.value.trim() : '';
                
                if (!division1Name) {
                    showAlertModal('Please enter Division 1 name for double play', 'warning', 'Missing Division 1 Name');
                    return;
                }
                if (!division2Name) {
                    showAlertModal('Please enter Division 2 name for double play', 'warning', 'Missing Division 2 Name');
                    return;
                }
                if (!division1GameType) {
                    showAlertModal('Please select Division 1 game type for double play', 'warning', 'Missing Division 1 Game Type');
                    return;
                }
                if (!division2GameType) {
                    showAlertModal('Please select Division 2 game type for double play', 'warning', 'Missing Division 2 Game Type');
                    return;
                }
                
                // Format: "Division 1 Name - Game Type 1 / Division 2 Name - Game Type 2"
                divisionName = `${division1Name} - ${division1GameType} / ${division2Name} - ${division2GameType}`;
            } else {
                // Regular division - combine name and game type
                // Check both smartBuilderDivisionName and smartBuilderDivisionName2 (preview section uses the latter)
                const baseNameField = searchContainer.querySelector('#smartBuilderDivisionName') || 
                                     searchContainer.querySelector('#smartBuilderDivisionName2') ||
                                     document.getElementById('smartBuilderDivisionName') || 
                                     document.getElementById('smartBuilderDivisionName2');
                const baseName = baseNameField ? baseNameField.value.trim() : '';
                // Check all possible IDs for game type (Smart Builder uses smartBuilderGameType)
                const gameTypeField = searchContainer.querySelector('#smartBuilderGameType') ||
                                    searchContainer.querySelector('#firstGameType') || 
                                    searchContainer.querySelector('#smartBuilderFirstGameType') ||
                                    document.getElementById('smartBuilderGameType') ||
                                    document.getElementById('firstGameType') || 
                                    document.getElementById('smartBuilderFirstGameType');
                const gameType = gameTypeField ? gameTypeField.value.trim() : '';
                
                if (!baseName || !gameType) {
                    showAlertModal('Please enter a division name and select a game type', 'warning', 'Missing Fields');
                    return;
                }
                
                divisionName = `${baseName} - ${gameType}`;
            }
            
            // Get all division settings from Smart Builder form (same as editor)
            // Use the same searchContainer pattern to find fields in active modal
            const playersPerWeekField = searchContainer.querySelector('#smartBuilderPlayersPerWeek') ||
                                       document.getElementById('smartBuilderPlayersPerWeek');
            const smartBuilderPlayersPerWeek = parseInt(playersPerWeekField?.value || '5') || 5;
            
            const totalWeeksField = searchContainer.querySelector('#smartBuilderTotalWeeks') ||
                                   document.getElementById('smartBuilderTotalWeeks');
            const smartBuilderTotalWeeks = parseInt(totalWeeksField?.value || '20') || 20;
            
            const startDateField = searchContainer.querySelector('#smartBuilderStartDate') ||
                                  document.getElementById('smartBuilderStartDate');
            const startDate = startDateField?.value || '';
            
            const endDateField = searchContainer.querySelector('#smartBuilderEndDate') ||
                                document.getElementById('smartBuilderEndDate');
            const endDate = endDateField?.value || '';
            
            if (!startDate) {
                showAlertModal('Please select a season start date', 'warning', 'Missing Start Date');
                return;
            }
            
            // Calculate number of teams from selected teams
            const numberOfTeams = selectedCheckboxes.length;
            
            // Get matches per week from Smart Builder form
            const matchesPerWeekField = searchContainer.querySelector('#smartBuilderMatchesPerWeek') ||
                                      document.getElementById('smartBuilderMatchesPerWeek');
            const matchesPerWeek = parseInt(matchesPerWeekField?.value || '1') || 1;
            
            // For double play, matches per week is per division (so both divisions get the same value)
            // For regular divisions, it's just the single value
            const divisionData = {
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
            };
            
            console.log('📤 Creating division with data:', {
                name: divisionName,
                isDoublePlay: isDoublePlay,
                duesPerPlayerPerMatch: duesPerPlayer,
                playersPerWeek: smartBuilderPlayersPerWeek,
                division1Name: isDoublePlay ? (searchContainer.querySelector('#smartBuilderDivisionName')?.value || '') : '',
                division2Name: isDoublePlay ? (searchContainer.querySelector('#smartBuilderDivision2Name')?.value || '') : '',
                fullData: divisionData
            });
            
            // Set matches per week based on double play status
            if (isDoublePlay) {
                // Double play: matches per week is per division, so both get the same value
                divisionData.firstMatchesPerWeek = matchesPerWeek;
                divisionData.secondMatchesPerWeek = matchesPerWeek;
            } else {
                // Regular division: single matches per week value
                divisionData.matchesPerWeek = matchesPerWeek;
            }
            
            // Create the division with all fields from Smart Builder (same as editor)
            const divisionResponse = await apiCall('/divisions', {
                method: 'POST',
                body: JSON.stringify(divisionData)
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
            // Find which modal is actually open (could be smartBuilderModal or divisionManagementModal)
            const smartBuilderModal = document.getElementById('smartBuilderModal');
            const divisionManagementModal = document.getElementById('divisionManagementModal');
            
            let modalToClose = null;
            if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
                modalToClose = bootstrap.Modal.getInstance(smartBuilderModal);
            } else if (divisionManagementModal && divisionManagementModal.classList.contains('show')) {
                modalToClose = bootstrap.Modal.getInstance(divisionManagementModal);
            }
            
            if (modalToClose) {
                modalToClose.hide();
            } else {
                // Fallback: try to get instance from either modal
                const modalInstance = bootstrap.Modal.getInstance(smartBuilderModal) || 
                                     bootstrap.Modal.getInstance(divisionManagementModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            
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
            // Find which modal is actually open (could be smartBuilderModal or divisionManagementModal)
            const smartBuilderModal = document.getElementById('smartBuilderModal');
            const divisionManagementModal = document.getElementById('divisionManagementModal');
            
            let modalToClose = null;
            if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
                modalToClose = bootstrap.Modal.getInstance(smartBuilderModal);
            } else if (divisionManagementModal && divisionManagementModal.classList.contains('show')) {
                modalToClose = bootstrap.Modal.getInstance(divisionManagementModal);
            }
            
            if (modalToClose) {
                modalToClose.hide();
            } else {
                // Fallback: try to get instance from either modal
                const modalInstance = bootstrap.Modal.getInstance(smartBuilderModal) || 
                                     bootstrap.Modal.getInstance(divisionManagementModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
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
    const selectedAmount = parseFloat(document.getElementById('weeklyPaymentAmount').value) || 0;
    validatePaymentAmount();
}

// Function to validate payment amount matches selected sanction fee players
function validatePaymentAmount() {
    const selectedAmount = parseFloat(document.getElementById('weeklyPaymentAmount').value) || 0;
    const weeklyTeamDues = currentWeeklyTeamDues || 0;
    
    // Get selected sanction fee players
    const selectedSanctionPlayers = document.querySelectorAll('input[name="bcaSanctionPlayer"]:checked');
    const selectedPlayerCount = selectedSanctionPlayers.length;
    
    // Hide any existing validation message
    const existingMessage = document.getElementById('paymentAmountValidationMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Only validate if amount is greater than weekly dues (meaning sanction fees are included)
    if (selectedAmount > weeklyTeamDues && sanctionFeesEnabled && sanctionFeeAmount > 0) {
        const extraAmount = selectedAmount - weeklyTeamDues;
        const expectedPlayerCount = Math.round(extraAmount / sanctionFeeAmount);
        
        // Allow small rounding differences (within $0.50)
        const amountDifference = Math.abs(extraAmount - (expectedPlayerCount * sanctionFeeAmount));
        
        if (amountDifference > 0.50) {
            // Amount doesn't match expected player count - show warning
            const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
            const validationMessage = document.createElement('div');
            validationMessage.id = 'paymentAmountValidationMessage';
            validationMessage.className = 'alert alert-warning mt-2';
            validationMessage.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Amount Mismatch:</strong> The selected amount (${formatCurrency(selectedAmount)}) includes ${formatCurrency(extraAmount)} in ${sanctionFeeName}, 
                which suggests <strong>${expectedPlayerCount} player${expectedPlayerCount !== 1 ? 's' : ''}</strong> should be selected for sanction fees. 
                Currently <strong>${selectedPlayerCount} player${selectedPlayerCount !== 1 ? 's are' : ' is'}</strong> selected.
            `;
            // Insert after the amount select field
            paymentAmountSelect.parentElement.insertBefore(validationMessage, paymentAmountSelect.nextSibling);
        } else if (selectedPlayerCount !== expectedPlayerCount) {
            // Amount matches but player count doesn't - show warning
            const paymentAmountSelect = document.getElementById('weeklyPaymentAmount');
            const validationMessage = document.createElement('div');
            validationMessage.id = 'paymentAmountValidationMessage';
            validationMessage.className = 'alert alert-warning mt-2';
            validationMessage.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Player Count Mismatch:</strong> The selected amount (${formatCurrency(selectedAmount)}) includes ${formatCurrency(extraAmount)} in ${sanctionFeeName}, 
                which suggests <strong>${expectedPlayerCount} player${expectedPlayerCount !== 1 ? 's' : ''}</strong> should be selected for sanction fees. 
                Currently <strong>${selectedPlayerCount} player${selectedPlayerCount !== 1 ? 's are' : ' is'}</strong> selected.
            `;
            // Insert after the amount select field
            paymentAmountSelect.parentElement.insertBefore(validationMessage, paymentAmountSelect.nextSibling);
        }
    }
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
                const checkboxId = `bcaPlayer${index}`;
                checkboxDiv.innerHTML = `
                    <input class="form-check-input" type="checkbox" name="bcaSanctionPlayer" value="${member.name}" id="${checkboxId}" onchange="validatePaymentAmount()">
                    <label class="form-check-label" for="${checkboxId}">
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
    try {
        console.log('showPlayersView called');
        populatePlayersModal();
        
        // Auto-select the current division in the players modal (if filter exists)
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
                    if (typeof filterPlayersTable === 'function') {
                        filterPlayersTable();
                    }
                }
            }
        }
        
        const playersModal = document.getElementById('playersModal');
        if (!playersModal) {
            console.error('playersModal element not found!');
            showAlertModal('Players modal not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        
        console.log('Showing players modal');
        new bootstrap.Modal(playersModal).show();
    } catch (error) {
        console.error('Error in showPlayersView:', error);
        showAlertModal('Error opening players view. Please try again.', 'error', 'Error');
    }
}

function populatePlayersModal() {
    try {
        // Populate division filter (if it exists)
        const divisionFilter = document.getElementById('playersDivisionFilter');
        if (divisionFilter) {
            divisionFilter.innerHTML = '<option value="all">All Divisions</option>';
            if (divisions && divisions.length > 0) {
                divisions.forEach(division => {
                    const option = document.createElement('option');
                    option.value = division.name;
                    option.textContent = division.name;
                    divisionFilter.appendChild(option);
                });
            }
        } else {
            console.log('playersDivisionFilter not found - division filter may not be in the modal');
        }
        
        // Populate players table
        populatePlayersTable();
    } catch (error) {
        console.error('Error in populatePlayersModal:', error);
        throw error; // Re-throw so showPlayersView can catch it
    }
}

function normStr(s) {
    return (s || '').trim().toLowerCase();
}

function populatePlayersTable() {
    const tbody = document.getElementById('playersTableBody');
    if (!tbody) {
        console.error('playersTableBody element not found!');
        return;
    }
    tbody.innerHTML = '';
    
    allPlayersData = [];
    const byPlayer = new Map();
    
    function addPlayer(team, player, isCaptain) {
        const rawName = (player.name || '').trim();
        if (!rawName) return;
        const key = normStr(player.name);
        const teamName = (team.teamName || team.name || '').trim();
        const teamId = team._id;
        let isSanctionPaid = !!player.bcaSanctionPaid;
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (isPaid && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) &&
                    payment.bcaSanctionPlayers.some(p => normStr(p) === key)) {
                    isSanctionPaid = true;
                }
            });
        }
        const entry = {
            teamId,
            team,
            teamName,
            division: (team.division || '').trim(),
            isCaptain,
            isSanctionPaid,
            previouslySanctioned: !!player.previouslySanctioned,
            teamPlayerName: (player.name || rawName).trim() || rawName,
            sanctionStartDate: player.sanctionStartDate || null,
            sanctionEndDate: player.sanctionEndDate || null
        };
        if (!byPlayer.has(key)) {
            byPlayer.set(key, {
                player: { name: rawName, email: player.email || '', phone: player.phone || '', isCaptain, previouslySanctioned: !!player.previouslySanctioned },
                playerName: rawName,
                teams: [teamName],
                divisions: team.division ? [team.division.trim()] : [],
                entries: [entry],
                isSanctionPaid,
                previouslySanctioned: !!player.previouslySanctioned,
                email: (player.email || '').trim() || '',
                phone: (player.phone || '').trim() || ''
            });
        } else {
            const rec = byPlayer.get(key);
            if (rec.entries.some(e => e.teamId === teamId)) return;
            rec.player.isCaptain = rec.player.isCaptain || isCaptain;
            rec.previouslySanctioned = rec.previouslySanctioned || !!player.previouslySanctioned;
            if (teamName && !rec.teams.includes(teamName)) rec.teams.push(teamName);
            if (team.division) {
                const d = (team.division || '').trim();
                if (d && !rec.divisions.includes(d)) rec.divisions.push(d);
            }
            rec.entries.push(entry);
            // Use global status - if player is paid on any team, they're paid globally
            // The backend merges global player status, so use the highest status (paid > pending)
            rec.isSanctionPaid = rec.isSanctionPaid || isSanctionPaid;
            // Previously sanctioned is also global - if marked on any team, it's global
            rec.previouslySanctioned = rec.previouslySanctioned || !!player.previouslySanctioned;
        }
    }
    
    console.log('populatePlayersTable: Processing', teams.length, 'teams');
    const capNorm = (t) => normStr(t.captainName);
    teams.forEach(team => {
        if (team.captainName) {
            const captainMember = team.teamMembers?.find(m => normStr(m.name) === capNorm(team));
            addPlayer(team, {
                name: team.captainName,
                email: team.captainEmail || '',
                phone: team.captainPhone || '',
                bcaSanctionPaid: captainMember ? captainMember.bcaSanctionPaid : false,
                previouslySanctioned: !!(captainMember ? captainMember.previouslySanctioned : team.captainPreviouslySanctioned)
            }, true);
        }
        if (team.teamMembers) {
            team.teamMembers.forEach(member => {
                if (normStr(member.name) === capNorm(team)) return;
                addPlayer(team, { ...member, previouslySanctioned: !!member.previouslySanctioned }, false);
            });
        }
    });
    
    byPlayer.forEach((rec) => {
        allPlayersData.push({
            player: rec.player,
            playerName: rec.playerName,
            teams: rec.teams,
            divisions: rec.divisions,
            entries: rec.entries,
            teamName: rec.teams[0] || '',
            division: rec.divisions[0] || '',
            isSanctionPaid: rec.isSanctionPaid,
            previouslySanctioned: rec.previouslySanctioned,
            email: rec.email,
            phone: rec.phone
        });
    });
    
    console.log('populatePlayersTable: Collected', allPlayersData.length, 'unique players');
    
    if (currentPlayersSortColumn) {
        sortPlayersTable(currentPlayersSortColumn, false);
    } else {
        renderPlayersTable(allPlayersData);
        updatePlayersSummaryCards(allPlayersData);
    }
}

function renderPlayersTable(playersToRender) {
    try {
        const tbody = document.getElementById('playersTableBody');
        if (!tbody) {
            console.error('playersTableBody element not found in renderPlayersTable!');
            return;
        }
        tbody.innerHTML = '';
        
        console.log('Rendering players table with', playersToRender.length, 'players');
        
        if (!playersToRender || playersToRender.length === 0) {
            console.warn('No players data to render');
            return;
        }
        
        playersToRender.forEach(playerData => {
        const { player, teams, divisions, entries, isSanctionPaid, previouslySanctioned } = playerData;
        const teamsDisplay = (teams && teams.length) ? teams.join(', ') : '-';
        const divisionsDisplay = (divisions && divisions.length) ? divisions.join(', ') : '-';
        
        // Use global player status (not team-specific) - status applies to player across all teams
        const globalSanctionPaid = isSanctionPaid;
        const globalPreviouslySanctioned = previouslySanctioned;
        
        // Show only ONE set of buttons per player (not per team)
        // Status is global - applies to player across all teams
        // Use the first team entry for the button data (any team will work since status is global)
        const firstEntry = entries && entries.length > 0 ? entries[0] : null;
        if (!firstEntry) {
            return; // Skip if no entries
        }
        
        const playerDisplayName = (firstEntry.teamPlayerName || player.name || '').replace(/"/g, '&quot;');
        const tooltipText = entries.length > 1 
            ? ` (Applies to all ${entries.length} teams)` 
            : '';
        
        // Escape player name for onclick handler
        const escapedPlayerName = (firstEntry.teamPlayerName || player.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedEmail = (playerData.email || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedPhone = (playerData.phone || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        // Get sanction dates from first entry (they're global per player)
        const sanctionStartDate = firstEntry.sanctionStartDate || null;
        const sanctionEndDate = firstEntry.sanctionEndDate || null;
        const startDateStr = sanctionStartDate ? `'${sanctionStartDate}'` : 'null';
        const endDateStr = sanctionEndDate ? `'${sanctionEndDate}'` : 'null';
        
        const actionsHtml = `
            <button class="btn btn-sm btn-primary edit-player-btn"
                    data-player-name="${playerDisplayName}"
                    data-player-email="${(playerData.email || '').replace(/"/g, '&quot;')}"
                    data-player-phone="${(playerData.phone || '').replace(/"/g, '&quot;')}"
                    data-is-sanction-paid="${globalSanctionPaid}"
                    data-previously-sanctioned="${globalPreviouslySanctioned}"
                    title="Edit player information and sanction status"
                    onclick="editPlayer('${escapedPlayerName}', '${escapedEmail}', '${escapedPhone}', ${globalSanctionPaid}, ${globalPreviouslySanctioned}, ${startDateStr}, ${endDateStr})">
                <i class="fas fa-edit"></i> Edit
            </button>`;
        
        console.log('Generated actionsHtml for player:', player.name, 'Length:', actionsHtml.length);
        
        const row = document.createElement('tr');
        const teamCountBadge = entries && entries.length > 1 
            ? `<br><span class="badge bg-secondary" title="On ${entries.length} teams">${entries.length} teams</span>` 
            : '';
        row.innerHTML = `
            <td><strong>${(player.name || '').replace(/</g, '&lt;')}${player.isCaptain ? ' (Captain)' : ''}</strong>${teamCountBadge}</td>
            <td>${(teamsDisplay || '-').replace(/</g, '&lt;')}</td>
            <td>${(divisionsDisplay || '-').replace(/</g, '&lt;')}</td>
            <td>
                <span class="badge ${isSanctionPaid ? 'bg-success' : (previouslySanctioned ? 'bg-info' : 'bg-warning')}">
                    ${isSanctionPaid ? 'Paid' : (previouslySanctioned ? 'Previously Sanctioned' : 'Pending')}
                </span>
            </td>
            <td>
                <span class="badge ${previouslySanctioned ? 'bg-info' : 'bg-secondary'}" title="${previouslySanctioned ? 'Paid elsewhere/earlier for current year (not counted in app totals)' : 'Not previously sanctioned'}">
                    ${previouslySanctioned ? 'Yes' : 'No'}
                </span>
            </td>
            <td>
                <div class="d-flex flex-wrap gap-1">${actionsHtml}</div>
            </td>
        `;
            tbody.appendChild(row);
        });
        
        console.log('Successfully rendered', playersToRender.length, 'player rows');
        
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
    } catch (error) {
        console.error('Error in renderPlayersTable:', error);
        throw error;
    }
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
        if (divisionFilter !== 'all') {
            const divs = playerData.divisions || (playerData.division ? [playerData.division] : []);
            if (!divs.length || !divs.includes(divisionFilter)) return false;
        }
        if (statusFilter !== 'all') {
            if (statusFilter === 'paid' && !playerData.isSanctionPaid) return false;
            if (statusFilter === 'pending' && (playerData.isSanctionPaid || playerData.previouslySanctioned)) return false;
            if (statusFilter === 'previously' && !playerData.previouslySanctioned) return false;
        }
        if (searchTerm && !(playerData.playerName || '').toLowerCase().includes(searchTerm)) return false;
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
                aValue = (a.teams && a.teams.length) ? a.teams.join(', ') : (a.teamName || '');
                bValue = (b.teams && b.teams.length) ? b.teams.join(', ') : (b.teamName || '');
                break;
            case 'division':
                aValue = (a.divisions && a.divisions.length) ? a.divisions.join(', ') : (a.division || '');
                bValue = (b.divisions && b.divisions.length) ? b.divisions.join(', ') : (b.division || '');
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
            if (divisionFilter !== 'all') {
                const divs = playerData.divisions || (playerData.division ? [playerData.division] : []);
                if (!divs.length || !divs.includes(divisionFilter)) return false;
            }
            if (statusFilter !== 'all') {
                if (statusFilter === 'paid' && !playerData.isSanctionPaid) return false;
                if (statusFilter === 'pending' && (playerData.isSanctionPaid || playerData.previouslySanctioned)) return false;
                if (statusFilter === 'previously' && !playerData.previouslySanctioned) return false;
            }
            if (searchTerm && !(playerData.playerName || '').toLowerCase().includes(searchTerm)) return false;
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
        // "Previously Sanctioned" = paid elsewhere/earlier for current year (exempt from app totals)
        if (playerData.previouslySanctioned) {
            previouslySanctioned++;
            // Don't count in totals - they paid elsewhere/earlier
        } else if (playerData.isSanctionPaid) {
            // "Paid" = paid through this app/system (counts in totals)
            sanctionPaid++;
            totalCollected += sanctionFeeAmount;
        } else {
            // Neither paid nor previously sanctioned = pending
            sanctionPending++;
        }
    });
    
    // Update summary cards (if they exist)
    const totalPlayersCountEl = document.getElementById('totalPlayersCount');
    const sanctionPaidCountEl = document.getElementById('sanctionPaidCount');
    const sanctionPendingCountEl = document.getElementById('sanctionPendingCount');
    const previouslySanctionedCountEl = document.getElementById('previouslySanctionedCount');
    const sanctionFeesCollectedEl = document.getElementById('sanctionFeesCollected');
    
    if (totalPlayersCountEl) totalPlayersCountEl.textContent = totalPlayers;
    if (sanctionPaidCountEl) sanctionPaidCountEl.textContent = sanctionPaid;
    if (sanctionPendingCountEl) sanctionPendingCountEl.textContent = sanctionPending;
    if (previouslySanctionedCountEl) previouslySanctionedCountEl.textContent = previouslySanctioned;
    if (sanctionFeesCollectedEl) sanctionFeesCollectedEl.textContent = formatCurrency(totalCollected);
}

// Player Editor Functions
let currentEditingPlayerName = null;

function editPlayer(playerName, email = '', phone = '', isSanctionPaid = false, previouslySanctioned = false, sanctionStartDate = null, sanctionEndDate = null) {
    try {
        // Decode HTML entities if any
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = playerName;
        const decodedPlayerName = tempDiv.textContent || tempDiv.innerText || playerName;
        
        currentEditingPlayerName = decodedPlayerName;
        
        // Populate the form
        const nameEl = document.getElementById('editPlayerName');
        const emailEl = document.getElementById('editPlayerEmail');
        const phoneEl = document.getElementById('editPlayerPhone');
        const sanctionPaidEl = document.getElementById('editPlayerSanctionPaid');
        const previouslySanctionedEl = document.getElementById('editPlayerPreviouslySanctioned');
        const sanctionDatesContainer = document.getElementById('editPlayerSanctionDatesContainer');
        const sanctionStartDateEl = document.getElementById('editPlayerSanctionStartDate');
        const sanctionEndDateEl = document.getElementById('editPlayerSanctionEndDate');
        const sanctionExpiredEl = document.getElementById('editPlayerSanctionExpired');
        
        if (!nameEl || !emailEl || !phoneEl || !sanctionPaidEl || !previouslySanctionedEl) {
            console.error('Edit player form elements not found!');
            showAlertModal('Player editor form not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        
        nameEl.value = decodedPlayerName;
        emailEl.value = email || '';
        phoneEl.value = phone || '';
        sanctionPaidEl.checked = isSanctionPaid;
        previouslySanctionedEl.checked = previouslySanctioned;
        
        // Show/hide and populate sanction date fields
        if (sanctionDatesContainer && sanctionStartDateEl && sanctionEndDateEl && sanctionExpiredEl) {
            if (isSanctionPaid) {
                sanctionDatesContainer.style.display = 'block';
                
                // Populate dates if available, otherwise set default to current calendar year
                if (sanctionStartDate && sanctionEndDate) {
                    const startDate = new Date(sanctionStartDate);
                    const endDate = new Date(sanctionEndDate);
                    const now = new Date();
                    const isExpired = now > endDate;
                    
                    // Format dates for input fields (YYYY-MM-DD)
                    sanctionStartDateEl.value = startDate.toISOString().split('T')[0];
                    sanctionEndDateEl.value = endDate.toISOString().split('T')[0];
                    sanctionExpiredEl.style.display = isExpired ? 'block' : 'none';
                } else {
                    // Set default to current calendar year (or next year if Oct-Dec)
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    let sanctionYear = now.getFullYear();
                    if (currentMonth >= 9) {
                        sanctionYear = now.getFullYear() + 1;
                    }
                    sanctionStartDateEl.value = `${sanctionYear}-01-01`;
                    sanctionEndDateEl.value = `${sanctionYear}-12-31`;
                    sanctionExpiredEl.style.display = 'none';
                }
            } else {
                sanctionDatesContainer.style.display = 'none';
                sanctionStartDateEl.value = '';
                sanctionEndDateEl.value = '';
                sanctionExpiredEl.style.display = 'none';
            }
        }
        
        // Add event listener to show/hide date fields when sanction paid checkbox changes
        const updateDateFieldsVisibility = () => {
            if (sanctionDatesContainer) {
                sanctionDatesContainer.style.display = sanctionPaidEl.checked ? 'block' : 'none';
                if (sanctionPaidEl.checked && sanctionStartDateEl && !sanctionStartDateEl.value) {
                    // Set default dates if none exist
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    let sanctionYear = now.getFullYear();
                    if (currentMonth >= 9) {
                        sanctionYear = now.getFullYear() + 1;
                    }
                    sanctionStartDateEl.value = `${sanctionYear}-01-01`;
                    sanctionEndDateEl.value = `${sanctionYear}-12-31`;
                }
            }
        };
        
        // Remove existing event listeners by cloning and replacing
        const newSanctionPaidEl = sanctionPaidEl.cloneNode(true);
        sanctionPaidEl.parentNode.replaceChild(newSanctionPaidEl, sanctionPaidEl);
        
        // Add event listeners for sanction paid checkbox
        const updatedSanctionPaidEl = document.getElementById('editPlayerSanctionPaid');
        updatedSanctionPaidEl.addEventListener('change', () => {
            handleSanctionPaidChange();
            updateDateFieldsVisibility();
        });
        
        // Show the modal
        const modal = document.getElementById('editPlayerModal');
        if (modal) {
            new bootstrap.Modal(modal).show();
        } else {
            console.error('editPlayerModal not found!');
            showAlertModal('Player editor modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error opening player editor:', error);
        showAlertModal('Error opening player editor. Please try again.', 'error', 'Error');
    }
}

// Handle change event for "Sanction Fee Paid" checkbox
async function handleSanctionPaidChange(event) {
    const checkbox = event.target;
    const previouslySanctionedEl = document.getElementById('editPlayerPreviouslySanctioned');
    
    if (!previouslySanctionedEl) {
        console.error('Previously sanctioned checkbox not found');
        return;
    }
    
    // If being checked, show confirmation modal
    if (checkbox.checked) {
        // Temporarily uncheck to prevent accidental submission
        checkbox.checked = false;
        
        // Get player name and fee amount
        const playerName = document.getElementById('editPlayerName')?.value || currentEditingPlayerName || 'this player';
        const feeAmount = formatCurrency(sanctionFeeAmount);
        
        // Populate confirmation modal
        document.getElementById('confirmSanctionFeeAmount').textContent = feeAmount;
        document.getElementById('confirmSanctionPlayerName').textContent = playerName;
        
        // Show the confirmation modal
        const confirmModal = document.getElementById('sanctionFeeConfirmModal');
        if (!confirmModal) {
            console.error('Sanction fee confirmation modal not found');
            // Fallback to simple confirm
            const addToTotals = confirm(`Add ${feeAmount} sanction fee for "${playerName}" to the total sanction fees collected?`);
            if (addToTotals) {
                checkbox.checked = true;
                previouslySanctionedEl.checked = false;
            }
            return;
        }
        
        const modal = new bootstrap.Modal(confirmModal);
        
        // Remove existing event listeners by cloning buttons
        const addToTotalsBtn = document.getElementById('sanctionConfirmAddToTotalsBtn');
        const paidElsewhereBtn = document.getElementById('sanctionConfirmPaidElsewhereBtn');
        const cancelBtn = document.getElementById('sanctionConfirmCancelBtn');
        
        const newAddToTotalsBtn = addToTotalsBtn.cloneNode(true);
        addToTotalsBtn.parentNode.replaceChild(newAddToTotalsBtn, addToTotalsBtn);
        
        const newPaidElsewhereBtn = paidElsewhereBtn.cloneNode(true);
        paidElsewhereBtn.parentNode.replaceChild(newPaidElsewhereBtn, paidElsewhereBtn);
        
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Add new event listeners
        document.getElementById('sanctionConfirmAddToTotalsBtn').addEventListener('click', () => {
            modal.hide();
            checkbox.checked = true;
            previouslySanctionedEl.checked = false;
        });
        
        document.getElementById('sanctionConfirmPaidElsewhereBtn').addEventListener('click', () => {
            modal.hide();
            checkbox.checked = false;
            previouslySanctionedEl.checked = true;
        });
        
        document.getElementById('sanctionConfirmCancelBtn').addEventListener('click', () => {
            modal.hide();
            checkbox.checked = false;
            previouslySanctionedEl.checked = false;
        });
        
        modal.show();
    } else {
        // Being unchecked - if "Previously Sanctioned" is also checked, ask what to do
        if (previouslySanctionedEl.checked) {
            // Both are being unchecked - that's fine, just let it happen
            // (user might want to clear both statuses)
        }
    }
}

async function savePlayerChanges() {
    if (!currentEditingPlayerName) {
        showAlertModal('No player selected for editing.', 'error', 'Error');
        return;
    }
    
    try {
        const email = document.getElementById('editPlayerEmail').value.trim();
        const phone = document.getElementById('editPlayerPhone').value.trim();
        const isSanctionPaid = document.getElementById('editPlayerSanctionPaid').checked;
        const previouslySanctioned = document.getElementById('editPlayerPreviouslySanctioned').checked;
        const sanctionStartDateEl = document.getElementById('editPlayerSanctionStartDate');
        const sanctionEndDateEl = document.getElementById('editPlayerSanctionEndDate');
        
        // Build update object
        const updates = {
            email: email || null,
            phone: phone || null,
            bcaSanctionPaid: isSanctionPaid,
            previouslySanctioned: previouslySanctioned
        };
        
        // Add sanction dates if provided
        if (isSanctionPaid && sanctionStartDateEl && sanctionEndDateEl) {
            const startDate = sanctionStartDateEl.value;
            const endDate = sanctionEndDateEl.value;
            if (startDate && endDate) {
                updates.sanctionStartDate = startDate;
                updates.sanctionEndDate = endDate;
            }
        }
        
        // Make API call to update player
        const response = await apiCall(`/players/${encodeURIComponent(currentEditingPlayerName)}/status`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        
        if (response.ok) {
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('editPlayerModal')).hide();
            
            // Reload data to reflect changes
            await loadData();
            
            // Refresh players modal if it's open
            if (document.getElementById('playersModal') && document.getElementById('playersModal').classList.contains('show')) {
                populatePlayersModal();
            }
            
            showAlertModal('Player updated successfully!', 'success', 'Success');
        } else {
            const error = await response.json();
            showAlertModal(error.message || 'Error updating player', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error saving player changes:', error);
        showAlertModal('Error saving player changes. Please try again.', 'error', 'Error');
    }
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
        
        // If marking as paid, show popup asking if it should be added to totals
        if (newStatus) {
            // Store the update data for use in the modal callbacks
            window.pendingSanctionUpdate = {
                playerName: normalizedPlayerName,
                teamId: teamId,
                isCaptain: isCaptain,
                captainEmail: isCaptain ? (team.captainEmail || '') : undefined,
                captainPhone: isCaptain ? (team.captainPhone || '') : undefined
            };
            
            // Show the confirmation modal
            document.getElementById('confirmPlayerName').textContent = normalizedPlayerName;
            document.getElementById('confirmFeeAmount').textContent = formatCurrency(sanctionFeeAmount);
            const modal = new bootstrap.Modal(document.getElementById('sanctionPaymentConfirmModal'));
            modal.show();
            
            // Set up modal button handlers (remove old ones first)
            const addToTotalsBtn = document.getElementById('confirmAddToTotalsBtn');
            const paidElsewhereBtn = document.getElementById('confirmPaidElsewhereBtn');
            
            // Remove existing event listeners by cloning and replacing
            const newAddToTotalsBtn = addToTotalsBtn.cloneNode(true);
            addToTotalsBtn.parentNode.replaceChild(newAddToTotalsBtn, addToTotalsBtn);
            
            const newPaidElsewhereBtn = paidElsewhereBtn.cloneNode(true);
            paidElsewhereBtn.parentNode.replaceChild(newPaidElsewhereBtn, paidElsewhereBtn);
            
            // Add new event listeners
            newAddToTotalsBtn.addEventListener('click', async () => {
                modal.hide();
                await processSanctionPayment(true);
            });
            
            newPaidElsewhereBtn.addEventListener('click', async () => {
                modal.hide();
                await processSanctionPayment(false);
            });
            
            // Return early - the modal handlers will continue the process
            return;
        } else {
            // Marking as unpaid - clear both statuses
            const updates = {
                bcaSanctionPaid: false,
                previouslySanctioned: false,
                email: isCaptain ? (team.captainEmail || '') : undefined,
                phone: isCaptain ? (team.captainPhone || '') : undefined
            };
            
            const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(normalizedPlayerName)}/status`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            if (!globalUpdateResponse.ok) {
                const errorData = await globalUpdateResponse.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Failed to update global player status:', errorData);
                alert(`Failed to update sanction status: ${errorData.message || 'Unknown error'}`);
                return;
            }
            
            // Continue with reload and refresh
            await refreshPlayersTableAfterUpdate();
        }
        
        console.log('Global player status updated successfully - status will sync to all teams');
        
        // Continue with reload and refresh
        await refreshPlayersTableAfterUpdate();
    } catch (error) {
        console.error('Error updating sanction status:', error);
        alert('Error updating sanction status');
    }
}

// Helper function to process sanction payment based on user's choice
async function processSanctionPayment(addToTotals) {
    if (!window.pendingSanctionUpdate) {
        console.error('No pending sanction update found');
        return;
    }
    
    const { playerName, isCaptain, captainEmail, captainPhone } = window.pendingSanctionUpdate;
    delete window.pendingSanctionUpdate;
    
    try {
        if (addToTotals) {
            // Mark as paid and it will count in totals
            const updates = {
                bcaSanctionPaid: true,
                previouslySanctioned: false, // Clear previously sanctioned if marking as paid
                email: captainEmail,
                phone: captainPhone
            };
            
            const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(playerName)}/status`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            if (!globalUpdateResponse.ok) {
                const errorData = await globalUpdateResponse.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Failed to update global player status:', errorData);
                alert(`Failed to update sanction status: ${errorData.message || 'Unknown error'}`);
                return;
            }
        } else {
            // User chose "Paid Elsewhere" - mark as previously sanctioned (paid elsewhere/earlier)
            const updates = {
                bcaSanctionPaid: false, // Don't show as paid
                previouslySanctioned: true, // Mark as previously sanctioned (paid elsewhere)
                email: captainEmail,
                phone: captainPhone
            };
            
            const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(playerName)}/status`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            if (!globalUpdateResponse.ok) {
                const errorData = await globalUpdateResponse.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Failed to update global player status:', errorData);
                alert(`Failed to update sanction status: ${errorData.message || 'Unknown error'}`);
                return;
            }
        }
        
        console.log('Global player status updated successfully - status will sync to all teams');
        
        // Continue with reload and refresh
        await refreshPlayersTableAfterUpdate();
    } catch (error) {
        console.error('Error processing sanction payment:', error);
        alert('Error updating sanction status');
    }
}

// Helper function to refresh players table after status update
async function refreshPlayersTableAfterUpdate() {
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
}

async function togglePreviouslySanctioned(teamId, playerName, currentStatus, isCaptain) {
    // Normalize the player name (trim whitespace, handle HTML entities)
    const normalizedPlayerName = playerName.trim();
    const newStatus = !currentStatus;
    
    console.log('togglePreviouslySanctioned called:', { teamId, playerName: normalizedPlayerName, currentStatus, isCaptain });
    
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found:', teamId);
            alert('Team not found');
            return;
        }
        
        // "Previously Sanctioned" = paid elsewhere/earlier for current year
        // Should NOT show as "Paid" and should NOT add to totals
        const updates = {
            previouslySanctioned: newStatus,
            bcaSanctionPaid: false, // Always clear "Paid" when marking as previously sanctioned
            email: isCaptain ? (team.captainEmail || '') : undefined,
            phone: isCaptain ? (team.captainPhone || '') : undefined
        };
        
        // Update player status globally (across all teams) using the new API endpoint
        const globalUpdateResponse = await apiCall(`/players/${encodeURIComponent(normalizedPlayerName)}/status`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        
        if (!globalUpdateResponse.ok) {
            const errorData = await globalUpdateResponse.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Failed to update global player status:', errorData);
            alert(`Failed to update previously sanctioned status: ${errorData.message || 'Unknown error'}`);
            return;
        }
        
        console.log('Global player status updated successfully - status will sync to all teams');
        
        // Continue with reload and refresh
        await refreshPlayersTableAfterUpdate();
    } catch (error) {
        console.error('Error updating previously sanctioned status:', error);
        alert('Error updating previously sanctioned status');
    }
}

function showPaymentHistory(teamId) {
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found for payment history:', teamId);
            showAlertModal('Team not found.', 'error', 'Error');
            return;
        }
        
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) {
            console.error('Division not found for team:', team.division);
            showAlertModal('Division not found for this team.', 'error', 'Error');
            return;
        }
        
        // Populate team info (with null checks)
        const teamNameEl = document.getElementById('paymentHistoryTeamName');
        const divisionEl = document.getElementById('paymentHistoryDivision');
        const duesRateEl = document.getElementById('paymentHistoryDuesRate');
        const totalWeeksEl = document.getElementById('paymentHistoryTotalWeeks');
        const weeklyDuesEl = document.getElementById('paymentHistoryWeeklyDues');
        
        if (teamNameEl) teamNameEl.textContent = team.teamName;
        if (divisionEl) divisionEl.textContent = team.division;
        if (duesRateEl) duesRateEl.textContent = team.divisionDuesRate;
        if (totalWeeksEl) totalWeeksEl.textContent = teamDivision.totalWeeks;
        
        // Calculate weekly dues using playersPerWeek from division settings
        // Formula: dues per player × players per week × (single play = 5, double play = 2 multiplier)
        // Parse as integer to ensure correct calculation
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5; // Parse as integer, default to 5 if not set
        // Single play: dues × players × 1, Double play: dues × players × 2
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const weeklyDues = (parseFloat(team.divisionDuesRate) || 0) * playersPerWeek * doublePlayMultiplier;
        if (weeklyDuesEl) weeklyDuesEl.textContent = formatCurrency(weeklyDues);
        
        // Update modal title with team name
        const modalTitle = document.querySelector('#paymentHistoryModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Payment History - ${team.teamName}`;
        }
        
        // Populate payment history table
        const tbody = document.getElementById('paymentHistoryTableBody');
        if (!tbody) {
            console.error('Payment history table body not found!');
            showAlertModal('Payment history table not found. Please refresh the page.', 'error', 'Error');
            return;
        }
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
    
        // Update summary (with null checks)
        const totalPaidEl = document.getElementById('paymentHistoryTotalPaid');
        const weeksPaidEl = document.getElementById('paymentHistoryWeeksPaid');
        if (totalPaidEl) totalPaidEl.textContent = formatCurrency(totalPaid);
        if (weeksPaidEl) weeksPaidEl.textContent = weeksPaid;
        
        // Calculate status (optional - only if element exists)
        const statusBadge = document.getElementById('paymentHistoryStatus');
        if (statusBadge) {
            let isCurrent = true;
            for (let week = 1; week <= actualCurrentWeek; week++) {
                const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
                    isCurrent = false;
                    break;
                }
            }
            statusBadge.textContent = isCurrent ? 'Current' : 'Behind';
            statusBadge.className = `badge bg-${isCurrent ? 'success' : 'danger'}`;
        }
        
        // Show the modal
        const modal = document.getElementById('paymentHistoryModal');
        if (modal) {
            new bootstrap.Modal(modal).show();
        } else {
            console.error('Payment history modal not found!');
            showAlertModal('Payment history modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error showing payment history:', error);
        showAlertModal('Error loading payment history. Please try again.', 'error', 'Error');
    }
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
            // Since they're paying through weekly payment, mark as "Paid" (counts in totals)
            // This is different from the players modal where we ask - weekly payment = they're paying now
            if (paid === 'true' && selectedBCAPlayers && selectedBCAPlayers.length > 0) {
                for (const playerName of selectedBCAPlayers) {
                    try {
                        const normalizedName = playerName.trim();
                        // Mark as paid and clear previously sanctioned (since they're paying through weekly payment)
                        await apiCall(`/players/${encodeURIComponent(normalizedName)}/status`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                bcaSanctionPaid: true,
                                previouslySanctioned: false // Clear if they were marked as previously sanctioned
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

/** Manual tab switch for Profile & Settings modal (avoids Bootstrap tab visibility issues). */
let _profileModalData = null;
let _profileTabListenersSetup = false;

// Function to aggressively clean subscription content from non-subscription tabs
function cleanSubscriptionContentFromOtherTabs() {
    const subscriptionPane = document.getElementById('subscription-pane');
    const nonSubscriptionTabs = ['profile-pane', 'financial-pane', 'sanction-pane'];
    
    // FIRST: Ensure subscription-pane is the ONLY place with subscription content
    // Remove subscriptionInfo and availablePlans from ANYWHERE except subscription-pane
    const allSubscriptionInfo = document.querySelectorAll('#subscriptionInfo');
    const allAvailablePlans = document.querySelectorAll('#availablePlans');
    
    allSubscriptionInfo.forEach(el => {
        if (!subscriptionPane || !subscriptionPane.contains(el)) {
            console.warn(`🧹 Removing subscriptionInfo from wrong location:`, el.parentElement?.id || 'unknown');
            el.remove();
        }
    });
    
    allAvailablePlans.forEach(el => {
        if (!subscriptionPane || !subscriptionPane.contains(el)) {
            console.warn(`🧹 Removing availablePlans from wrong location:`, el.parentElement?.id || 'unknown');
            el.remove();
        }
    });
    
    // Now clean each non-subscription tab - ONLY remove subscription-specific elements
    nonSubscriptionTabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (!tab) return;
        
        // DON'T hide tabs here - that's handled by the tab switching logic
        // Only remove subscription-specific content
        
        // Remove subscriptionInfo div (should never be in other tabs)
        const subscriptionInfo = tab.querySelector('#subscriptionInfo');
        if (subscriptionInfo) {
            console.warn(`🧹 Removing subscriptionInfo from ${tabId}`);
            subscriptionInfo.remove();
        }
        
        // Remove availablePlans div (should never be in other tabs)
        const availablePlans = tab.querySelector('#availablePlans');
        if (availablePlans) {
            console.warn(`🧹 Removing availablePlans from ${tabId}`);
            availablePlans.remove();
        }
        
        // Remove subscription cards - but be VERY specific to avoid removing legitimate cards
        const allCards = tab.querySelectorAll('.card');
        allCards.forEach(card => {
            // Skip if card is in subscription-pane (shouldn't happen, but double-check)
            if (subscriptionPane && subscriptionPane.contains(card)) {
                return;
            }
            
            // Only remove if it has VERY specific subscription indicators
            const hasSubscriptionHeader = card.querySelector('.subscription-plan-header');
            const hasAvailablePlansDiv = card.querySelector('#availablePlans');
            const hasSubscriptionInfoDiv = card.querySelector('#subscriptionInfo');
            
            // Check text content for subscription-specific phrases (be very specific)
            const cardText = card.textContent || '';
            const hasUsageLimits = cardText.includes('Usage & Limits') && cardText.includes('teams') && cardText.includes('divisions');
            const hasUpgradePlans = cardText.includes('Available Upgrade Plans') || cardText.includes('Upgrade Your Plan');
            const hasTrialInfo = cardText.includes('Trial Active') || cardText.includes('14-Day Enterprise Trial');
            
            // Only remove if it's clearly a subscription card
            if (hasSubscriptionHeader || hasAvailablePlansDiv || hasSubscriptionInfoDiv || 
                (hasUsageLimits && hasUpgradePlans) || hasTrialInfo) {
                console.warn(`🧹 Removing subscription card from ${tabId}`);
                card.remove();
            }
        });
        
        // Remove subscription-plan-header divs
        const subscriptionDivs = tab.querySelectorAll('.subscription-plan-header');
        subscriptionDivs.forEach(div => {
            if (!subscriptionPane || !subscriptionPane.contains(div)) {
                console.warn(`🧹 Removing subscription div from ${tabId}`);
                div.remove();
            }
        });
    });
}

function switchProfileSettingsTab(paneId) {
    console.log('switchProfileSettingsTab called with paneId:', paneId);
    
    // FIRST: Always clean subscription content from all non-subscription tabs
    cleanSubscriptionContentFromOtherTabs();
    
    // Also ensure subscriptionInfo is ONLY in subscription-pane
    const subscriptionInfoDiv = document.getElementById('subscriptionInfo');
    const subscriptionPane = document.getElementById('subscription-pane');
    if (subscriptionInfoDiv && subscriptionPane) {
        if (!subscriptionPane.contains(subscriptionInfoDiv)) {
            console.warn('⚠️ subscriptionInfo found outside subscription-pane during tab switch! Moving it...');
            subscriptionInfoDiv.remove();
            subscriptionPane.appendChild(subscriptionInfoDiv);
        }
    }
    
    const content = document.getElementById('profileTabContent');
    if (!content) {
        console.error('profileTabContent not found');
        return;
    }
    
    const panes = content.querySelectorAll('.tab-pane');
    const tabButtons = document.querySelectorAll('#profileTabs [role="tab"]');
    const paneMap = { 
        'profile-pane': 'profile-tab', 
        'sanction-pane': 'sanction-tab', 
        'financial-pane': 'financial-tab', 
        'subscription-pane': 'subscription-tab' 
    };

    // Debug: Log all panes found
    console.log('🔍 Found panes:', Array.from(panes).map(p => p.id));
    console.log('🔍 Looking for paneId:', paneId);

    // Hide all panes and show the selected one
    panes.forEach(p => {
        const show = p.id === paneId;
        console.log(`🔍 Checking pane ${p.id}: show=${show}, matches=${p.id === paneId}`);
        if (show) {
            p.classList.add('show', 'active');
            p.style.display = 'block';
            p.style.visibility = 'visible';
            p.removeAttribute('aria-hidden');
            console.log(`✅ Showing pane: ${p.id}, classes: ${p.className}, display: ${p.style.display}`);
            
            // CRITICAL: If showing a non-subscription tab, ensure no subscription content is visible
            if (p.id !== 'subscription-pane') {
                // Immediate cleanup when tab becomes visible
                const subscriptionInfo = p.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    console.warn(`🧹 Removing subscriptionInfo from ${p.id}`);
                    subscriptionInfo.remove();
                }
                const availablePlans = p.querySelector('#availablePlans');
                if (availablePlans) {
                    console.warn(`🧹 Removing availablePlans from ${p.id}`);
                    availablePlans.remove();
                }
                // Remove subscription cards immediately - but be VERY specific
                p.querySelectorAll('.card').forEach(card => {
                    // Only remove if it has VERY specific subscription indicators
                    const hasSubscriptionHeader = card.querySelector('.subscription-plan-header');
                    const hasAvailablePlansDiv = card.querySelector('#availablePlans');
                    const hasSubscriptionInfoDiv = card.querySelector('#subscriptionInfo');
                    
                    // Check text content for subscription-specific phrases (be very specific)
                    const cardText = card.textContent || '';
                    const hasUsageLimits = cardText.includes('Usage & Limits') && (cardText.includes('teams') || cardText.includes('divisions'));
                    const hasUpgradePlans = cardText.includes('Available Upgrade Plans') || cardText.includes('Upgrade Your Plan');
                    const hasTrialInfo = cardText.includes('Trial Active') || cardText.includes('14-Day Enterprise Trial');
                    
                    // Only remove if it's clearly a subscription card
                    if (hasSubscriptionHeader || hasAvailablePlansDiv || hasSubscriptionInfoDiv || 
                        (hasUsageLimits && hasUpgradePlans) || hasTrialInfo) {
                        console.warn(`🧹 Removing subscription card from ${p.id}`);
                        card.remove();
                    }
                });
                // Also run full cleanup
                setTimeout(() => {
                    cleanSubscriptionContentFromOtherTabs();
                }, 10);
            }
            
            // Verify data is still in fields when pane becomes visible
            if (p.id === 'financial-pane') {
                setTimeout(() => {
                    const prizeFundName = document.getElementById('profilePrizeFundName');
                    const prizeFundPercent = document.getElementById('profilePrizeFundPercentage');
                    if (prizeFundName) console.log('Financial pane - prizeFundName value:', prizeFundName.value);
                    if (prizeFundPercent) console.log('Financial pane - prizeFundPercent value:', prizeFundPercent.value);
                }, 50);
            }
            if (p.id === 'sanction-pane') {
                setTimeout(() => {
                    const sanctionFeeName = document.getElementById('profileSanctionFeeName');
                    const sanctionFeeAmount = document.getElementById('profileSanctionFeeAmount');
                    if (sanctionFeeName) console.log('Sanction pane - sanctionFeeName value:', sanctionFeeName.value);
                    if (sanctionFeeAmount) console.log('Sanction pane - sanctionFeeAmount value:', sanctionFeeAmount.value);
                }, 50);
            }
            } else {
                p.classList.remove('show', 'active');
                p.style.display = 'none';
                p.style.visibility = 'hidden';
                p.setAttribute('aria-hidden', 'true');
                
                // Clean up subscription content from hidden tabs (but don't break other content)
                if (p.id !== 'subscription-pane') {
                    // Only remove subscription-specific elements
                    const subscriptionInfo = p.querySelector('#subscriptionInfo');
                    if (subscriptionInfo) {
                        console.warn(`🧹 Removing subscriptionInfo from hidden tab: ${p.id}`);
                        subscriptionInfo.remove();
                    }
                    const availablePlans = p.querySelector('#availablePlans');
                    if (availablePlans) {
                        console.warn(`🧹 Removing availablePlans from hidden tab: ${p.id}`);
                        availablePlans.remove();
                    }
                } else {
                    // If hiding subscription-pane, DON'T clear content - just hide it
                    // Clearing would break the subscription tab when you switch back
                }
            }
    });
    
    // Update tab button states
    const targetTabId = paneMap[paneId];
    if (targetTabId) {
        tabButtons.forEach(btn => {
            const isActive = btn.id === targetTabId;
            if (isActive) {
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            }
        });
    }
    
    // Scroll modal dialog to top
    const dialog = content.closest('.modal-dialog');
    if (dialog) dialog.scrollTop = 0;
    
    // Re-populate fields when switching tabs to ensure data is visible
    if (_profileModalData && _profileModalData.operator) {
        const operator = _profileModalData.operator;
        console.log('Re-populating fields for tab:', paneId);
        
        // Always re-populate all fields when switching tabs to ensure they're visible
        setTimeout(() => {
            // Profile fields
            const nameEl = document.getElementById('profileName');
            const emailEl = document.getElementById('profileEmail');
            const orgNameEl = document.getElementById('profileOrganizationName');
            const phoneEl = document.getElementById('profilePhone');
            if (nameEl) nameEl.value = operator.name || '';
            if (emailEl) emailEl.value = operator.email || '';
            if (orgNameEl) orgNameEl.value = operator.organization_name || '';
            if (phoneEl) phoneEl.value = operator.phone || '';
            
            // Financial fields
            // Default Dues field
            const defaultDuesEl = document.getElementById('profileDefaultDues');
            if (defaultDuesEl) {
                defaultDuesEl.value = operator.default_dues_per_player_per_match || operator.defaultDuesPerPlayerPerMatch || '';
            }
            
            // Calculation method - SIMPLE: just read from database
            let useDollarAmountsValue = false;
            if (operator.use_dollar_amounts !== undefined && operator.use_dollar_amounts !== null) {
                useDollarAmountsValue = operator.use_dollar_amounts === true || operator.use_dollar_amounts === 'true' || operator.use_dollar_amounts === 1;
            } else if (operator.useDollarAmounts !== undefined && operator.useDollarAmounts !== null) {
                useDollarAmountsValue = operator.useDollarAmounts === true || operator.useDollarAmounts === 'true' || operator.useDollarAmounts === 1;
            }
            
            console.log('Tab switch: Setting calculation method, useDollarAmountsValue:', useDollarAmountsValue, 'from operator.use_dollar_amounts:', operator.use_dollar_amounts);
            
            // CRITICAL: Set the saved value FIRST so toggleCalculationMethod knows what the saved state is
            _savedUseDollarAmounts = useDollarAmountsValue;
            
            const methodPercentageRadio = document.getElementById('methodPercentage');
            const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
            if (methodPercentageRadio && methodDollarAmountRadio) {
                if (useDollarAmountsValue) {
                    methodDollarAmountRadio.checked = true;
                    console.log('Tab switch: Set method to: Dollar amount-based');
                } else {
                    methodPercentageRadio.checked = true;
                    console.log('Tab switch: Set method to: Percentage-based');
                }
                // Trigger toggle to show/hide the correct inputs
                if (typeof toggleCalculationMethod === 'function') {
                    console.log('Tab switch: Calling toggleCalculationMethod()');
                    toggleCalculationMethod();
                } else {
                    console.error('Tab switch: toggleCalculationMethod function not found!');
                }
            } else {
                console.error('Tab switch: Radio buttons not found!');
            }
            
            const prizeFundNameEl = document.getElementById('profilePrizeFundName');
            const prizeFundPercentEl = document.getElementById('profilePrizeFundPercentage');
            const prizeFundAmountEl = document.getElementById('profilePrizeFundAmount');
            if (prizeFundNameEl) prizeFundNameEl.value = operator.prize_fund_name || operator.prizeFundName || 'Prize Fund';
            if (prizeFundPercentEl) prizeFundPercentEl.value = operator.prize_fund_percentage || operator.prizeFundPercentage || 50.0;
            if (prizeFundAmountEl) prizeFundAmountEl.value = operator.prize_fund_amount || operator.prizeFundAmount || '';
            
            // Prize Fund Amount Type
            const prizeFundPerTeamRadio = document.getElementById('prizeFundPerTeam');
            const prizeFundPerPlayerRadio = document.getElementById('prizeFundPerPlayer');
            const prizeFundAmountType = operator.prize_fund_amount_type || operator.prizeFundAmountType || 'perTeam';
            if (prizeFundAmountType === 'perPlayer' && prizeFundPerPlayerRadio) {
                prizeFundPerPlayerRadio.checked = true;
            } else if (prizeFundPerTeamRadio) {
                prizeFundPerTeamRadio.checked = true;
            }
            
            const firstOrgNameEl = document.getElementById('profileFirstOrganizationName');
            const firstOrgNameDollarEl = document.getElementById('profileFirstOrganizationNameDollar');
            const firstOrgPercentEl = document.getElementById('profileFirstOrganizationPercentage');
            const firstOrgAmountEl = document.getElementById('profileFirstOrganizationAmount');
            const firstOrgNameValue = operator.first_organization_name || operator.firstOrganizationName || operator.league_manager_name || 'League Manager';
            if (firstOrgNameEl) firstOrgNameEl.value = firstOrgNameValue;
            if (firstOrgNameDollarEl) firstOrgNameDollarEl.value = firstOrgNameValue;
            if (firstOrgPercentEl) firstOrgPercentEl.value = operator.first_organization_percentage || operator.league_manager_percentage || operator.leagueManagerPercentage || 60.0;
            if (firstOrgAmountEl) firstOrgAmountEl.value = operator.first_organization_amount || operator.firstOrganizationAmount || '';
            
            // First Organization Amount Type
            const firstOrgPerTeamRadio = document.getElementById('firstOrgPerTeam');
            const firstOrgPerPlayerRadio = document.getElementById('firstOrgPerPlayer');
            const firstOrgAmountType = operator.first_organization_amount_type || operator.firstOrganizationAmountType || 'perTeam';
            if (firstOrgAmountType === 'perPlayer' && firstOrgPerPlayerRadio) {
                firstOrgPerPlayerRadio.checked = true;
            } else if (firstOrgPerTeamRadio) {
                firstOrgPerTeamRadio.checked = true;
            }
            
            const secondOrgNameEl = document.getElementById('profileSecondOrganizationName');
            const secondOrgNameDollarEl = document.getElementById('profileSecondOrganizationNameDollar');
            const secondOrgPercentEl = document.getElementById('profileSecondOrganizationPercentage');
            const secondOrgAmountEl = document.getElementById('profileSecondOrganizationAmount');
            const secondOrgNameValue = operator.second_organization_name || operator.secondOrganizationName || operator.usa_pool_league_name || 'Parent/National Organization';
            if (secondOrgNameEl) secondOrgNameEl.value = secondOrgNameValue;
            if (secondOrgNameDollarEl) secondOrgNameDollarEl.value = secondOrgNameValue;
            if (secondOrgPercentEl) secondOrgPercentEl.value = operator.second_organization_percentage || operator.usa_pool_league_percentage || operator.usaPoolLeaguePercentage || 40.0;
            if (secondOrgAmountEl) secondOrgAmountEl.value = operator.second_organization_amount || operator.secondOrganizationAmount || '';
            
            // Second Organization Amount Type
            const secondOrgPerTeamRadio = document.getElementById('secondOrgPerTeam');
            const secondOrgPerPlayerRadio = document.getElementById('secondOrgPerPlayer');
            const secondOrgAmountType = operator.second_organization_amount_type || operator.secondOrganizationAmountType || 'perTeam';
            if (secondOrgAmountType === 'perPlayer' && secondOrgPerPlayerRadio) {
                secondOrgPerPlayerRadio.checked = true;
            } else if (secondOrgPerTeamRadio) {
                secondOrgPerTeamRadio.checked = true;
            }
            
            // Sanction fields
            const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
            const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
            const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
            if (sanctionFeeNameEl) sanctionFeeNameEl.value = operator.sanction_fee_name || 'Sanction Fee';
            if (sanctionFeeAmountEl) sanctionFeeAmountEl.value = operator.sanction_fee_amount || 25.00;
            if (sanctionFeePayoutAmountEl) sanctionFeePayoutAmountEl.value = operator.sanction_fee_payout_amount || 20.00;
        }, 50);
    }
    
    // Clean up subscription content from other tabs when switching (already done above, but do it again for safety)
    if (paneId !== 'subscription-pane') {
        cleanSubscriptionContentFromOtherTabs();
    }
    
    // Load subscription info if switching to subscription pane
    if (paneId === 'subscription-pane') {
        console.log('📋 Switching to subscription-pane');
        
        // FIRST: Aggressively clean subscription content from ALL other tabs
        cleanSubscriptionContentFromOtherTabs();
        
        // THEN: Ensure subscription-pane has show and active classes
        const subscriptionPane = document.getElementById('subscription-pane');
        if (subscriptionPane) {
            subscriptionPane.classList.add('show', 'active');
            subscriptionPane.style.display = 'block';
            subscriptionPane.style.visibility = 'visible';
            subscriptionPane.removeAttribute('aria-hidden');
            console.log('✅ Forced subscription-pane to show, classes:', subscriptionPane.className);
        }
        
        // Ensure other tabs are hidden
        const otherTabs = ['profile-pane', 'financial-pane', 'sanction-pane'];
        otherTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) {
                tab.classList.remove('show', 'active');
                tab.style.display = 'none';
                tab.style.visibility = 'hidden';
                tab.setAttribute('aria-hidden', 'true');
            }
        });
        
        // Clean again after ensuring visibility
        setTimeout(() => cleanSubscriptionContentFromOtherTabs(), 50);
        
        const sub = document.getElementById('subscriptionInfo');
        
        console.log('📋 subscriptionInfo exists:', !!sub);
        console.log('📋 subscriptionPane exists:', !!subscriptionPane);
        
        // Ensure subscriptionInfo is in subscription-pane
        if (sub && subscriptionPane && !subscriptionPane.contains(sub)) {
            console.warn('⚠️ subscriptionInfo not in subscription-pane! Moving it...');
            sub.remove();
            subscriptionPane.appendChild(sub);
        }
        
        const hasContent = sub && sub.innerHTML && sub.innerHTML.length > 200 && !sub.innerHTML.includes('Loading subscription information');
        console.log('📋 Has subscription content:', hasContent, 'Content length:', sub?.innerHTML?.length || 0);
        
        // ALWAYS load subscription info when subscription tab is clicked (don't rely on pending HTML)
        if (!hasContent) {
            console.log('📦 Loading subscription info for subscription tab');
            // Show loading spinner
            if (sub) {
                sub.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-muted mt-3">Loading subscription information...</p>
                    </div>
                `;
            }
            // Load subscription info
            if (_profileModalData) {
                loadSubscriptionInfo(_profileModalData).catch(e => console.error('Failed to load subscription info:', e));
            } else if (currentOperator) {
                loadSubscriptionInfo({ operator: currentOperator }).catch(e => console.error('Failed to load subscription info:', e));
            }
        } else {
            console.log('📋 Has content, verifying plans');
            // Has content, but verify plans are loaded
            setTimeout(() => {
                const plansDiv = document.getElementById('availablePlans');
                console.log('📋 Plans div check:', !!plansDiv, 'Length:', plansDiv?.innerHTML?.length || 0);
                if (plansDiv && (plansDiv.innerHTML.length < 100 || plansDiv.innerHTML.includes('Loading'))) {
                    // Plans div exists but is empty or just has spinner, try to load
                    const subscriptionStatus = window._pendingSubscriptionStatus || {};
                    const actualTier = subscriptionStatus.tier || 'free';
                    console.log('📦 Plans div exists but empty, loading plans for tier:', actualTier);
                    loadAvailablePlans(actualTier).catch(e => console.error('Failed to load plans:', e));
                }
            }, 200);
        }
    }
}

async function showProfileModal() {
    console.log('showProfileModal called');
    const modalElement = document.getElementById('profileModal');
    if (!modalElement) {
        console.error('profileModal element not found');
        return;
    }
    
    try {
        // Load current profile data
        const response = await apiCall('/profile');
        if (!response.ok) {
            throw new Error('Failed to load profile');
        }
        
        const data = await response.json();
        console.log('Profile API response:', data);
        const operator = data.operator || currentOperator;
        
        if (!operator) {
            console.error('No operator data found in response');
            return;
        }
        
        console.log('Loading operator data:', operator);
        console.log('Operator fields:', {
            name: operator.name,
            email: operator.email,
            organization_name: operator.organization_name,
            phone: operator.phone,
            prize_fund_name: operator.prize_fund_name,
            prize_fund_percentage: operator.prize_fund_percentage,
            prize_fund_amount: operator.prize_fund_amount,
            default_dues_per_player_per_match: operator.default_dues_per_player_per_match,
            use_dollar_amounts: operator.use_dollar_amounts,
            first_organization_name: operator.first_organization_name,
            first_organization_percentage: operator.first_organization_percentage,
            first_organization_amount: operator.first_organization_amount,
            second_organization_name: operator.second_organization_name,
            second_organization_percentage: operator.second_organization_percentage,
            second_organization_amount: operator.second_organization_amount,
            sanction_fee_name: operator.sanction_fee_name,
            sanction_fee_amount: operator.sanction_fee_amount
        });
        
        if (operator) {
            // Populate form fields
            const nameEl = document.getElementById('profileName');
            const emailEl = document.getElementById('profileEmail');
            const orgNameEl = document.getElementById('profileOrganizationName');
            const phoneEl = document.getElementById('profilePhone');
            
            if (nameEl) {
                nameEl.value = operator.name || '';
                console.log('Set profileName to:', nameEl.value);
            } else {
                console.error('profileName element not found');
            }
            
            if (emailEl) {
                emailEl.value = operator.email || '';
                console.log('Set profileEmail to:', emailEl.value);
            } else {
                console.error('profileEmail element not found');
            }
            
            if (orgNameEl) {
                orgNameEl.value = operator.organization_name || '';
                console.log('Set profileOrganizationName to:', orgNameEl.value);
            } else {
                console.error('profileOrganizationName element not found');
            }
            
            if (phoneEl) {
                phoneEl.value = operator.phone || '';
                console.log('Set profilePhone to:', phoneEl.value);
            } else {
                console.warn('profilePhone element not found (may be optional)');
            }
            
            // Populate default dues field
            const defaultDuesInput = document.getElementById('profileDefaultDues');
            if (defaultDuesInput) {
                const defaultDuesValue = operator.default_dues_per_player_per_match || operator.defaultDuesPerPlayerPerMatch || '';
                defaultDuesInput.value = defaultDuesValue;
                console.log('Set profileDefaultDues to:', defaultDuesValue, 'from operator:', operator.default_dues_per_player_per_match);
            } else {
                console.error('profileDefaultDues element not found');
            }

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
            
            console.log('Populating sanction fee fields...');
            const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
            const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
            const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
            
            const sanctionFeeNameValue = operator.sanction_fee_name || 'Sanction Fee';
            const sanctionFeeAmountValue = operator.sanction_fee_amount || 25.00;
            const sanctionFeePayoutAmountValue = operator.sanction_fee_payout_amount || 20.00;
            
            if (sanctionFeeNameEl) {
                sanctionFeeNameEl.value = sanctionFeeNameValue;
                console.log('Set profileSanctionFeeName to:', sanctionFeeNameValue);
            } else {
                console.error('profileSanctionFeeName element not found');
            }
            
            if (sanctionFeeAmountEl) {
                sanctionFeeAmountEl.value = sanctionFeeAmountValue;
                console.log('Set profileSanctionFeeAmount to:', sanctionFeeAmountValue);
            } else {
                console.error('profileSanctionFeeAmount element not found');
            }
            
            if (sanctionFeePayoutAmountEl) {
                sanctionFeePayoutAmountEl.value = sanctionFeePayoutAmountValue;
                console.log('Set profileSanctionFeePayoutAmount to:', sanctionFeePayoutAmountValue);
            } else {
                console.error('profileSanctionFeePayoutAmount element not found');
            }
            
            // Set calculation method (percentage or dollar amount) - SIMPLE: just read from database
            let useDollarAmountsValue = false;
            if (operator.use_dollar_amounts !== undefined && operator.use_dollar_amounts !== null) {
                useDollarAmountsValue = operator.use_dollar_amounts === true || operator.use_dollar_amounts === 'true' || operator.use_dollar_amounts === 1;
            } else if (operator.useDollarAmounts !== undefined && operator.useDollarAmounts !== null) {
                useDollarAmountsValue = operator.useDollarAmounts === true || operator.useDollarAmounts === 'true' || operator.useDollarAmounts === 1;
            }
            
            console.log('Loading calculation method from database:', {
                use_dollar_amounts: operator.use_dollar_amounts,
                resolved: useDollarAmountsValue
            });
            
            _savedUseDollarAmounts = useDollarAmountsValue;
            const methodPercentageRadio = document.getElementById('methodPercentage');
            const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
            if (methodPercentageRadio && methodDollarAmountRadio) {
                if (useDollarAmountsValue) {
                    methodDollarAmountRadio.checked = true;
                    console.log('Set radio to: Dollar amount-based');
                } else {
                    methodPercentageRadio.checked = true;
                    console.log('Set radio to: Percentage-based');
                }
                // CRITICAL: Call toggleCalculationMethod AFTER setting radio and _savedUseDollarAmounts
                toggleCalculationMethod(); // Show/hide inputs, update Active format & "Save to change" message
            } else {
                console.error('Radio buttons not found for calculation method!');
            }
            
            // Populate financial breakdown fields (with backward compatibility)
            console.log('Populating financial breakdown fields...');
            const prizeFundNameEl = document.getElementById('profilePrizeFundName');
            const prizeFundPercentEl = document.getElementById('profilePrizeFundPercentage');
            const prizeFundAmountEl = document.getElementById('profilePrizeFundAmount');
            
            if (!prizeFundNameEl) console.error('profilePrizeFundName element not found');
            if (!prizeFundPercentEl) console.error('profilePrizeFundPercentage element not found');
            if (!prizeFundAmountEl) console.error('profilePrizeFundAmount element not found');
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
            const prizeFundNameValue = operator.prize_fund_name || operator.prizeFundName || 'Prize Fund';
            const prizeFundPercentValue = operator.prize_fund_percentage || operator.prizeFundPercentage || 50.0;
            const prizeFundAmountValue = operator.prize_fund_amount || operator.prizeFundAmount || '';
            
            console.log('Financial fields from operator:', {
                prize_fund_name: operator.prize_fund_name,
                prize_fund_percentage: operator.prize_fund_percentage,
                prize_fund_amount: operator.prize_fund_amount,
                first_organization_amount: operator.first_organization_amount,
                second_organization_amount: operator.second_organization_amount,
                use_dollar_amounts: operator.use_dollar_amounts,
                prizeFundName: operator.prizeFundName,
                prizeFundPercentage: operator.prizeFundPercentage,
                prizeFundAmount: operator.prizeFundAmount,
                firstOrganizationAmount: operator.firstOrganizationAmount,
                secondOrganizationAmount: operator.secondOrganizationAmount,
                useDollarAmounts: operator.useDollarAmounts
            });
            console.log('Full operator object keys:', Object.keys(operator));
            
            if (prizeFundNameEl) {
                prizeFundNameEl.value = prizeFundNameValue;
                console.log('Set profilePrizeFundName to:', prizeFundNameValue);
            } else {
                console.error('profilePrizeFundName element not found');
            }
            if (prizeFundPercentEl) {
                prizeFundPercentEl.value = prizeFundPercentValue;
                console.log('Set profilePrizeFundPercentage to:', prizeFundPercentValue);
            } else {
                console.error('profilePrizeFundPercentage element not found');
            }
            if (prizeFundAmountEl) {
                prizeFundAmountEl.value = prizeFundAmountValue;
                console.log('Set profilePrizeFundAmount to:', prizeFundAmountValue, '(raw operator value:', operator.prize_fund_amount, operator.prizeFundAmount, ')');
            } else {
                console.error('profilePrizeFundAmount element not found');
            }
            const prizeFundAmountType = operator.prize_fund_amount_type || operator.prizeFundAmountType || 'perTeam';
            if (prizeFundAmountType === 'perPlayer' && prizeFundPerPlayerRadio) {
                prizeFundPerPlayerRadio.checked = true;
            } else if (prizeFundPerTeamRadio) {
                prizeFundPerTeamRadio.checked = true;
            }
            
            const firstOrgNameValue = operator.first_organization_name || operator.firstOrganizationName || 
                                      operator.league_manager_name || 'League Manager';
            if (firstOrgNameEl) {
                firstOrgNameEl.value = firstOrgNameValue;
                console.log('Set profileFirstOrganizationName to:', firstOrgNameValue);
            } else {
                console.error('profileFirstOrganizationName element not found');
            }
            if (firstOrgNameDollarEl) {
                firstOrgNameDollarEl.value = firstOrgNameValue;
                console.log('Set profileFirstOrganizationNameDollar to:', firstOrgNameValue);
            } else {
                console.warn('profileFirstOrganizationNameDollar element not found (may be optional)');
            }
            
            const firstOrgPercentValue = operator.first_organization_percentage || 
                                        operator.league_manager_percentage || operator.leagueManagerPercentage || 60.0;
            if (firstOrgPercentEl) {
                firstOrgPercentEl.value = firstOrgPercentValue;
                console.log('Set profileFirstOrganizationPercentage to:', firstOrgPercentValue);
            } else {
                console.error('profileFirstOrganizationPercentage element not found');
            }
            
            const firstOrgAmountValue = operator.first_organization_amount || operator.firstOrganizationAmount || '';
            if (firstOrgAmountEl) {
                firstOrgAmountEl.value = firstOrgAmountValue;
                console.log('Set profileFirstOrganizationAmount to:', firstOrgAmountValue);
            } else {
                console.warn('profileFirstOrganizationAmount element not found (may be optional)');
            }
            const firstOrgAmountType = operator.first_organization_amount_type || operator.firstOrganizationAmountType || 'perTeam';
            if (firstOrgAmountType === 'perPlayer' && firstOrgPerPlayerRadio) {
                firstOrgPerPlayerRadio.checked = true;
            } else if (firstOrgPerTeamRadio) {
                firstOrgPerTeamRadio.checked = true;
            }
            
            const secondOrgNameValue = operator.second_organization_name || operator.secondOrganizationName || 
                                      operator.usa_pool_league_name || 'Parent/National Organization';
            if (secondOrgNameEl) {
                secondOrgNameEl.value = secondOrgNameValue;
                console.log('Set profileSecondOrganizationName to:', secondOrgNameValue);
            } else {
                console.error('profileSecondOrganizationName element not found');
            }
            if (secondOrgNameDollarEl) {
                secondOrgNameDollarEl.value = secondOrgNameValue;
                console.log('Set profileSecondOrganizationNameDollar to:', secondOrgNameValue);
            } else {
                console.warn('profileSecondOrganizationNameDollar element not found (may be optional)');
            }
            
            const secondOrgPercentValue = operator.second_organization_percentage || 
                                         operator.usa_pool_league_percentage || operator.usaPoolLeaguePercentage || 40.0;
            if (secondOrgPercentEl) {
                secondOrgPercentEl.value = secondOrgPercentValue;
                console.log('Set profileSecondOrganizationPercentage to:', secondOrgPercentValue);
            } else {
                console.error('profileSecondOrganizationPercentage element not found');
            }
            
            const secondOrgAmountValue = operator.second_organization_amount || operator.secondOrganizationAmount || '';
            if (secondOrgAmountEl) {
                secondOrgAmountEl.value = secondOrgAmountValue;
                console.log('Set profileSecondOrganizationAmount to:', secondOrgAmountValue);
            } else {
                console.warn('profileSecondOrganizationAmount element not found (may be optional)');
            }
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
        
        // DON'T load subscription info here - only load when subscription tab is clicked
        // This prevents subscription content from appearing in other tabs
        console.log('📦 Subscription info will load when subscription tab is clicked');
        
        _profileModalData = data;
        // Ensure listeners are set up (will no-op if already done)
        try {
            if (typeof setupProfileSettingsTabListeners === 'function') {
                setupProfileSettingsTabListeners();
            }
            // Set initial tab to profile-pane
            if (typeof switchProfileSettingsTab === 'function') {
                switchProfileSettingsTab('profile-pane');
            }
        } catch (e) {
            console.warn('Error setting up profile modal listeners:', e);
        }
        
        // Initialize tooltips before showing modal
        initializeProfileTooltips();
        
        // Show modal first, then ensure data is visible
        console.log('Attempting to show profileModal');
        showModal(modalElement);
        
        // Start periodic cleanup when modal opens
        startSubscriptionCleanup();
        
        // Stop cleanup when modal closes
        modalElement.addEventListener('hidden.bs.modal', function() {
            stopSubscriptionCleanup();
        }, { once: true });
        
        // Setup tab listeners after modal is shown (in case DOM wasn't ready)
        setTimeout(() => {
            // Event delegation is already set up on document level
            // Just ensure button is clickable (CSS should handle this, but double-check)
            const saveProfileButton = document.getElementById('saveProfileButton');
            if (saveProfileButton) {
                const computedStyle = window.getComputedStyle(saveProfileButton);
                // CRITICAL FIX: Force pointer-events to auto if it's none
                if (computedStyle.pointerEvents === 'none') {
                    saveProfileButton.style.pointerEvents = 'auto';
                }
                // Ensure button is not disabled
                if (saveProfileButton.disabled) {
                    saveProfileButton.disabled = false;
                }
            }
            
            // Initialize tooltips after modal is shown
            initializeProfileTooltips();
            
            if (typeof setupProfileSettingsTabListeners === 'function') {
                setupProfileSettingsTabListeners();
            }
            // Re-populate ALL fields after modal is shown to ensure they're visible
            // This ensures data persists even if modal was reset
            if (operator) {
                console.log('Re-populating ALL fields after modal shown...');
                
                // Profile fields
                const nameEl = document.getElementById('profileName');
                const emailEl = document.getElementById('profileEmail');
                const orgNameEl = document.getElementById('profileOrganizationName');
                const phoneEl = document.getElementById('profilePhone');
                if (nameEl) nameEl.value = operator.name || '';
                if (emailEl) emailEl.value = operator.email || '';
                if (orgNameEl) orgNameEl.value = operator.organization_name || '';
                if (phoneEl) phoneEl.value = operator.phone || '';
                
                // Financial breakdown fields - ALL of them
                // Default Dues field
                const defaultDuesEl = document.getElementById('profileDefaultDues');
                if (defaultDuesEl) {
                    const defaultDuesValue = operator.default_dues_per_player_per_match || operator.defaultDuesPerPlayerPerMatch || '';
                    defaultDuesEl.value = defaultDuesValue;
                    console.log('Re-populating profileDefaultDues to:', defaultDuesValue);
                } else {
                    console.error('profileDefaultDues element not found during re-population');
                }
                
                // Update calculation method FIRST (before populating fields) - SIMPLE: just read from database
                let useDollarAmountsValue = false;
                if (operator.use_dollar_amounts !== undefined && operator.use_dollar_amounts !== null) {
                    useDollarAmountsValue = operator.use_dollar_amounts === true || operator.use_dollar_amounts === 'true' || operator.use_dollar_amounts === 1;
                } else if (operator.useDollarAmounts !== undefined && operator.useDollarAmounts !== null) {
                    useDollarAmountsValue = operator.useDollarAmounts === true || operator.useDollarAmounts === 'true' || operator.useDollarAmounts === 1;
                }
                
                console.log('Re-populating: Setting calculation method, useDollarAmountsValue:', useDollarAmountsValue, 'from operator.use_dollar_amounts:', operator.use_dollar_amounts);
                
                // CRITICAL: Set the saved value FIRST so toggleCalculationMethod knows what the saved state is
                _savedUseDollarAmounts = useDollarAmountsValue;
                
                const methodPercentageRadio = document.getElementById('methodPercentage');
                const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
                if (methodPercentageRadio && methodDollarAmountRadio) {
                    if (useDollarAmountsValue) {
                        methodDollarAmountRadio.checked = true;
                        console.log('Set method to: Dollar amount-based');
                    } else {
                        methodPercentageRadio.checked = true;
                        console.log('Set method to: Percentage-based');
                    }
                    // Trigger toggle to show/hide the correct inputs
                    if (typeof toggleCalculationMethod === 'function') {
                        console.log('Calling toggleCalculationMethod()');
                        toggleCalculationMethod();
                    } else {
                        console.error('toggleCalculationMethod function not found!');
                    }
                } else {
                    console.error('Radio buttons not found! methodPercentageRadio:', !!methodPercentageRadio, 'methodDollarAmountRadio:', !!methodDollarAmountRadio);
                }
                
                console.log('Re-populating financial fields, operator data:', {
                    prize_fund_name: operator.prize_fund_name,
                    prize_fund_percentage: operator.prize_fund_percentage,
                    prize_fund_amount: operator.prize_fund_amount,
                    use_dollar_amounts: operator.use_dollar_amounts
                });
                
                const prizeFundNameEl = document.getElementById('profilePrizeFundName');
                const prizeFundPercentEl = document.getElementById('profilePrizeFundPercentage');
                const prizeFundAmountEl = document.getElementById('profilePrizeFundAmount');
                if (prizeFundNameEl) {
                    prizeFundNameEl.value = operator.prize_fund_name || operator.prizeFundName || 'Prize Fund';
                    console.log('Re-populated profilePrizeFundName to:', prizeFundNameEl.value);
                } else {
                    console.error('profilePrizeFundName element not found during re-population');
                }
                if (prizeFundPercentEl) {
                    prizeFundPercentEl.value = operator.prize_fund_percentage || operator.prizeFundPercentage || 50.0;
                    console.log('Re-populated profilePrizeFundPercentage to:', prizeFundPercentEl.value);
                } else {
                    console.error('profilePrizeFundPercentage element not found during re-population');
                }
                if (prizeFundAmountEl) {
                    const prizeFundAmountValue = operator.prize_fund_amount || operator.prizeFundAmount || '';
                    prizeFundAmountEl.value = prizeFundAmountValue;
                    console.log('Re-populated profilePrizeFundAmount to:', prizeFundAmountValue, '(raw operator:', operator.prize_fund_amount, operator.prizeFundAmount, ')');
                } else {
                    console.error('profilePrizeFundAmount element not found during re-population');
                }
                
                // Prize Fund Amount Type
                const prizeFundPerTeamRadio = document.getElementById('prizeFundPerTeam');
                const prizeFundPerPlayerRadio = document.getElementById('prizeFundPerPlayer');
                const prizeFundAmountType = operator.prize_fund_amount_type || operator.prizeFundAmountType || 'perTeam';
                if (prizeFundAmountType === 'perPlayer' && prizeFundPerPlayerRadio) {
                    prizeFundPerPlayerRadio.checked = true;
                } else if (prizeFundPerTeamRadio) {
                    prizeFundPerTeamRadio.checked = true;
                }
                
                const firstOrgNameEl = document.getElementById('profileFirstOrganizationName');
                const firstOrgNameDollarEl = document.getElementById('profileFirstOrganizationNameDollar');
                const firstOrgPercentEl = document.getElementById('profileFirstOrganizationPercentage');
                const firstOrgAmountEl = document.getElementById('profileFirstOrganizationAmount');
                const firstOrgNameValue = operator.first_organization_name || operator.firstOrganizationName || operator.league_manager_name || 'League Manager';
                if (firstOrgNameEl) firstOrgNameEl.value = firstOrgNameValue;
                if (firstOrgNameDollarEl) firstOrgNameDollarEl.value = firstOrgNameValue;
                if (firstOrgPercentEl) firstOrgPercentEl.value = operator.first_organization_percentage || operator.league_manager_percentage || operator.leagueManagerPercentage || 60.0;
                if (firstOrgAmountEl) firstOrgAmountEl.value = operator.first_organization_amount || operator.firstOrganizationAmount || '';
                
                // First Organization Amount Type
                const firstOrgPerTeamRadio = document.getElementById('firstOrgPerTeam');
                const firstOrgPerPlayerRadio = document.getElementById('firstOrgPerPlayer');
                const firstOrgAmountType = operator.first_organization_amount_type || operator.firstOrganizationAmountType || 'perTeam';
                if (firstOrgAmountType === 'perPlayer' && firstOrgPerPlayerRadio) {
                    firstOrgPerPlayerRadio.checked = true;
                } else if (firstOrgPerTeamRadio) {
                    firstOrgPerTeamRadio.checked = true;
                }
                
                const secondOrgNameEl = document.getElementById('profileSecondOrganizationName');
                const secondOrgNameDollarEl = document.getElementById('profileSecondOrganizationNameDollar');
                const secondOrgPercentEl = document.getElementById('profileSecondOrganizationPercentage');
                const secondOrgAmountEl = document.getElementById('profileSecondOrganizationAmount');
                const secondOrgNameValue = operator.second_organization_name || operator.secondOrganizationName || operator.usa_pool_league_name || 'Parent/National Organization';
                if (secondOrgNameEl) secondOrgNameEl.value = secondOrgNameValue;
                if (secondOrgNameDollarEl) secondOrgNameDollarEl.value = secondOrgNameValue;
                if (secondOrgPercentEl) secondOrgPercentEl.value = operator.second_organization_percentage || operator.usa_pool_league_percentage || operator.usaPoolLeaguePercentage || 40.0;
                if (secondOrgAmountEl) secondOrgAmountEl.value = operator.second_organization_amount || operator.secondOrganizationAmount || '';
                
                // Second Organization Amount Type
                const secondOrgPerTeamRadio = document.getElementById('secondOrgPerTeam');
                const secondOrgPerPlayerRadio = document.getElementById('secondOrgPerPlayer');
                const secondOrgAmountType = operator.second_organization_amount_type || operator.secondOrganizationAmountType || 'perTeam';
                if (secondOrgAmountType === 'perPlayer' && secondOrgPerPlayerRadio) {
                    secondOrgPerPlayerRadio.checked = true;
                } else if (secondOrgPerTeamRadio) {
                    secondOrgPerTeamRadio.checked = true;
                }
                
                // Sanction fee fields
                const sanctionFeeNameEl = document.getElementById('profileSanctionFeeName');
                const sanctionFeeAmountEl = document.getElementById('profileSanctionFeeAmount');
                const sanctionFeePayoutAmountEl = document.getElementById('profileSanctionFeePayoutAmount');
                if (sanctionFeeNameEl) sanctionFeeNameEl.value = operator.sanction_fee_name || 'Sanction Fee';
                if (sanctionFeeAmountEl) sanctionFeeAmountEl.value = operator.sanction_fee_amount || 25.00;
                if (sanctionFeePayoutAmountEl) sanctionFeePayoutAmountEl.value = operator.sanction_fee_payout_amount || 20.00;
                
                console.log('✅ All fields re-populated');
            }
        }, 200);
    } catch (error) {
        console.error('Error loading profile:', error);
        // Still show modal, but with current data if available
        console.log('Showing profile modal despite error');
        
        // Setup tab listeners
        try {
            if (typeof setupProfileSettingsTabListeners === 'function') {
                setupProfileSettingsTabListeners();
            }
            if (typeof switchProfileSettingsTab === 'function') {
                switchProfileSettingsTab('profile-pane');
            }
        } catch (e) {
            console.warn('Error setting up profile modal listeners in catch block:', e);
        }
        
        showModal(modalElement);
        
        // Setup tab listeners after modal is shown
        setTimeout(() => {
            if (typeof setupProfileSettingsTabListeners === 'function') {
                setupProfileSettingsTabListeners();
            }
        }, 100);
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
        
        // Check export access after profile is loaded
        checkExportAccess();
        
        _profileModalData = { operator: currentOperator };
        // Ensure listeners are set up (will no-op if already done)
        setupProfileSettingsTabListeners();
        switchProfileSettingsTab('profile-pane');
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('profileModal'));
        modal.show();
    }
}

function setupProfileSettingsTabListeners() {
    if (_profileTabListenersSetup) return;
    const tabList = document.getElementById('profileTabs');
    if (!tabList) {
        console.error('profileTabs not found');
        return;
    }
    _profileTabListenersSetup = true;

    const map = {
        'profile-tab': 'profile-pane',
        'sanction-tab': 'sanction-pane',
        'financial-tab': 'financial-pane',
        'subscription-tab': 'subscription-pane'
    };

    const buttons = tabList.querySelectorAll('[role="tab"]');
    if (buttons.length === 0) return;
    
    buttons.forEach(btn => {
        if (!btn.id) return;
        console.log('Setting up tab listener for:', btn.id);
        // Remove any existing Bootstrap tab data attributes that might interfere
        btn.removeAttribute('data-bs-toggle');
        btn.removeAttribute('data-bs-target');
        // Remove any existing click handlers by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const updatedBtn = document.getElementById(btn.id);
        if (updatedBtn) {
            updatedBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Tab clicked:', this.id);
                const paneId = map[this.id];
                console.log('Switching to pane:', paneId);
                if (paneId) {
                    switchProfileSettingsTab(paneId);
                } else {
                    console.warn('No pane mapping found for tab:', this.id);
                }
            });
        }
    });
    console.log('Tab listeners setup complete');
}

// Load and display subscription information
// Function to add/update trial status indicator in other tabs (only when in trial mode)
function updateTrialStatusInTabs(subscriptionStatus) {
    const isInTrial = subscriptionStatus?.isInTrial === true;
    const trialEndDate = subscriptionStatus?.trialEndDate;
    
    // Remove any subscription info or plans that might have been accidentally added to other tabs
    const tabsToClean = ['profile-pane', 'financial-pane', 'sanction-pane'];
    tabsToClean.forEach(tabId => {
        const tabPane = document.getElementById(tabId);
        if (tabPane) {
            // Remove any subscription info divs
            const subscriptionInfo = tabPane.querySelector('#subscriptionInfo');
            if (subscriptionInfo) {
                subscriptionInfo.remove();
            }
            // Remove any availablePlans divs
            const availablePlans = tabPane.querySelector('#availablePlans');
            if (availablePlans) {
                availablePlans.remove();
            }
            // Remove any subscription-related cards
            const subscriptionCards = tabPane.querySelectorAll('.subscription-plan-header, .card.border-0.shadow-sm');
            subscriptionCards.forEach(card => {
                // Only remove if it's subscription-related (has subscription-plan-header or contains subscription info)
                if (card.querySelector('.subscription-plan-header') || card.textContent.includes('Usage & Limits') || card.textContent.includes('Available Upgrade Plans')) {
                    card.remove();
                }
            });
        }
    });
    
    // Only show trial status if actually in trial
    if (!isInTrial || !trialEndDate) {
        // Remove trial status from all tabs if not in trial
        const trialIndicators = document.querySelectorAll('.trial-status-indicator');
        trialIndicators.forEach(el => el.remove());
        return;
    }
    
    // Calculate days remaining
    const endDate = new Date(trialEndDate);
    const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    
    // Create trial status HTML
    const trialStatusHTML = `
        <div class="trial-status-indicator alert alert-info mt-4 mb-0" style="background-color: #0dcaf0 !important; color: #000000 !important; border-color: #0dcaf0 !important;">
            <i class="fas fa-gift me-2" style="color: #000000 !important;"></i>
            <strong style="color: #000000 !important;">14-Day Enterprise Trial Active</strong>
            <span style="color: #000000 !important;">- ${daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Ending soon'}</span>
            <br><small style="color: #000000 !important;">You have unlimited access to all Enterprise features until ${endDate.toLocaleDateString()}. <a href="#" onclick="switchProfileSettingsTab('subscription-pane'); return false;" style="color: #000000 !important; text-decoration: underline;">View subscription details</a></small>
        </div>
    `;
    
    // Add to profile-pane, financial-pane, and sanction-pane (but not subscription-pane)
    tabsToClean.forEach(tabId => {
        const tabPane = document.getElementById(tabId);
        if (tabPane) {
            // Remove existing trial indicator if any
            const existing = tabPane.querySelector('.trial-status-indicator');
            if (existing) {
                existing.remove();
            }
            // Add new trial indicator at the end
            tabPane.insertAdjacentHTML('beforeend', trialStatusHTML);
        }
    });
}

async function loadSubscriptionInfo(profileData) {
    const subscriptionInfoDiv = document.getElementById('subscriptionInfo');
    if (!subscriptionInfoDiv) return;
    
    // Ensure subscription info is only in the subscription-pane
    const subscriptionPane = document.getElementById('subscription-pane');
    if (!subscriptionPane || !subscriptionPane.contains(subscriptionInfoDiv)) {
        console.error('⚠️ subscriptionInfo div is not in subscription-pane! Moving it...');
        // If it's in the wrong place, move it to the subscription pane
        if (subscriptionPane && subscriptionInfoDiv.parentElement !== subscriptionPane) {
            subscriptionPane.appendChild(subscriptionInfoDiv);
        }
    }
    
    // Preserve existing plans HTML if it exists and has content (not just loading spinner)
    const existingPlansDiv = document.getElementById('availablePlans');
    let preservedPlansHTML = null;
    if (existingPlansDiv && existingPlansDiv.innerHTML) {
        const htmlLength = existingPlansDiv.innerHTML.length;
        const hasSpinner = existingPlansDiv.innerHTML.includes('spinner-border');
        const hasPlansContent = existingPlansDiv.innerHTML.includes('Available Upgrade Plans') || 
                               existingPlansDiv.innerHTML.includes('Upgrade to');
        
        // Only preserve if it's actual content (has plans or is substantial content, not just a loading spinner)
        if (hasPlansContent || (htmlLength > 1000 && !hasSpinner)) {
            preservedPlansHTML = existingPlansDiv.innerHTML;
            console.log('💾 Preserving existing plans HTML, length:', preservedPlansHTML.length, 'hasPlansContent:', hasPlansContent);
        } else {
            console.log('⏭️ Not preserving - HTML length:', htmlLength, 'hasSpinner:', hasSpinner, 'hasPlansContent:', hasPlansContent);
        }
    }
    
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
        const effectiveTier = subscriptionStatus.effectiveTier || plan.tier || 'free';
        const trialEndDate = subscriptionStatus.trialEndDate;
        
        // Update trial status indicator in other tabs (only if in trial)
        updateTrialStatusInTabs(subscriptionStatus);
        
        // Check export access after subscription info is loaded
        checkExportAccess();
        
        console.log('Subscription status:', {
            isInTrial,
            effectiveTier,
            actualTier: subscriptionStatus.tier || plan.tier,
            planTier: plan.tier
        });
        
        // Build subscription info HTML
        const planBadgeColor = effectiveTier === 'free' ? 'secondary' : 
                              effectiveTier === 'basic' ? 'primary' : 
                              effectiveTier === 'pro' ? 'warning' : 'success';
        
        // Get background color for header (Bootstrap colors)
        const bgColorMap = {
            'secondary': '#6c757d',
            'primary': '#0d6efd',
            'warning': '#ffc107',
            'success': '#198754'
        };
        const headerBgColor = bgColorMap[planBadgeColor] || '#6c757d';
        const headerTextColor = planBadgeColor === 'warning' ? '#000000' : '#ffffff'; // Warning is yellow, needs dark text
        
        // Format trial end date
        let trialInfo = '';
        if (isInTrial && trialEndDate) {
            const endDate = new Date(trialEndDate);
            const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
            trialInfo = `
                <div class="alert alert-info mb-0 mt-2" style="background-color: #0dcaf0 !important; color: #000000 !important; border-color: #0dcaf0 !important;">
                    <i class="fas fa-gift me-2" style="color: #000000 !important;"></i>
                    <strong style="color: #000000 !important;">14-Day Enterprise Trial Active!</strong>
                    <span style="color: #000000 !important;">${daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Ending soon'}</span>
                    <br><small style="color: #000000 !important;">You have unlimited access to all Enterprise features until ${endDate.toLocaleDateString()}</small>
                </div>
            `;
        }
        
        const subscriptionHTML = `
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header subscription-plan-header" style="background-color: ${headerBgColor} !important; border-color: ${headerBgColor} !important;">
                    <div class="d-flex justify-content-between align-items-center" style="color: ${headerTextColor} !important;">
                        <div>
                            <h5 class="mb-0" style="color: ${headerTextColor} !important; font-weight: 600;">
                                <i class="fas fa-${isInTrial ? 'gift' : 'crown'} me-2" style="color: ${headerTextColor} !important;"></i>
                                ${isInTrial ? 'Enterprise (Trial)' : (plan.name || 'Free')} Plan
                            </h5>
                            <small style="color: ${headerTextColor} !important; display: block; margin-top: 4px; font-weight: 500; opacity: 1 !important;">${isInTrial ? 'Unlimited access during 14-day trial' : (plan.description || 'Basic plan for getting started')}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${isInTrial ? '<span class="badge fs-6" style="background-color: #0dcaf0 !important; color: #000000 !important;">TRIAL</span>' : ''}
                            <span class="badge fs-6" style="background-color: #f8f9fa !important; color: #212529 !important;">${effectiveTier.toUpperCase()}</span>
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
                                        ${divisionsUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${divisionsUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.divisions)}</small>
                                    ${totalDivisions > 0 ? `<br><small style="color: #adb5bd !important;"><i class="fas fa-info-circle me-1"></i>${divisionBreakdownText}<br><em>Double play = 2 slots</em></small>` : ''}
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
                                        ${teamsUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${teamsUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.teams)}</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-user-friends text-info me-2"></i>
                                            <strong>Players</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${membersUsage.colorClass}">${membersUsage.text}</span>
                                        ${membersUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${membersUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.teamMembers)}</small>
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
        
        // CRITICAL: Ensure subscription info is ONLY in subscription-pane before setting HTML
        const subscriptionPane = document.getElementById('subscription-pane');
        if (!subscriptionPane || !subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfo is not in subscription-pane! Moving it...');
            if (subscriptionPane) {
                // Remove from wherever it is
                if (subscriptionInfoDiv.parentElement) {
                    subscriptionInfoDiv.parentElement.removeChild(subscriptionInfoDiv);
                }
                // Add to subscription pane
                subscriptionPane.appendChild(subscriptionInfoDiv);
            }
        }
        
        // Remove any duplicate subscription info from other tabs BEFORE setting new content
        const allTabs = ['profile-pane', 'financial-pane', 'sanction-pane'];
        allTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) {
                // Remove any subscriptionInfo divs (shouldn't exist, but just in case)
                const duplicateSubscriptionInfo = tab.querySelector('#subscriptionInfo');
                if (duplicateSubscriptionInfo && duplicateSubscriptionInfo !== subscriptionInfoDiv) {
                    console.warn(`⚠️ Removing duplicate subscriptionInfo from ${tabId}`);
                    duplicateSubscriptionInfo.remove();
                }
                // Remove any availablePlans divs
                const duplicatePlans = tab.querySelector('#availablePlans');
                if (duplicatePlans) {
                    console.warn(`⚠️ Removing duplicate availablePlans from ${tabId}`);
                    duplicatePlans.remove();
                }
                // Remove subscription cards
                const subscriptionCards = tab.querySelectorAll('.card.border-0.shadow-sm');
                subscriptionCards.forEach(card => {
                    if (card.querySelector('.subscription-plan-header') || 
                        card.textContent.includes('Usage & Limits') || 
                        card.textContent.includes('Available Upgrade Plans')) {
                        console.warn(`⚠️ Removing subscription card from ${tabId}`);
                        card.remove();
                    }
                });
            }
        });
        
        // CRITICAL: Ensure subscriptionInfoDiv is ONLY in subscription-pane
        // First, remove it from anywhere else it might be
        if (subscriptionInfoDiv.parentElement && subscriptionInfoDiv.parentElement.id !== 'subscription-pane') {
            console.error('⚠️ subscriptionInfoDiv is in wrong parent! Moving it...');
            subscriptionInfoDiv.remove();
        }
        
        // Now ensure it's in subscription-pane
        if (!subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfoDiv is NOT in subscription-pane! Moving it...');
            if (subscriptionInfoDiv.parentElement) {
                subscriptionInfoDiv.parentElement.removeChild(subscriptionInfoDiv);
            }
            subscriptionPane.appendChild(subscriptionInfoDiv);
        }
        
        // BEFORE setting HTML, remove ALL subscription content from other tabs (but NOT from subscription-pane)
        cleanSubscriptionContentFromOtherTabs();
        
        // ALWAYS set the subscription HTML in subscription-pane (regardless of which tab is active)
        // Bootstrap tabs will hide it if subscription tab is not active
        subscriptionInfoDiv.innerHTML = subscriptionHTML;
        console.log('✅ Subscription HTML set in subscription-pane, length:', subscriptionHTML.length);
        console.log('✅ subscriptionInfoDiv parent:', subscriptionInfoDiv.parentElement?.id);
        console.log('✅ subscriptionPane contains subscriptionInfoDiv:', subscriptionPane.contains(subscriptionInfoDiv));
        
        // Verify it's still in the right place after setting HTML
        if (!subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfoDiv moved after setting HTML! Moving back...');
            subscriptionInfoDiv.remove();
            subscriptionPane.appendChild(subscriptionInfoDiv);
            // Re-set HTML since we moved it
            subscriptionInfoDiv.innerHTML = subscriptionHTML;
        }
        
        // DON'T store as pending - only set when subscription tab is active
        // window._pendingSubscriptionHTML = subscriptionHTML;
        window._pendingSubscriptionStatus = subscriptionStatus;
        
        // IMMEDIATELY clean up any subscription content from other tabs again (double-check)
        // But make sure we don't remove from subscription-pane
        setTimeout(() => {
            cleanSubscriptionContentFromOtherTabs();
            // Also verify availablePlans is in the right place
            const plansDiv = document.getElementById('availablePlans');
            if (plansDiv) {
                if (!subscriptionPane.contains(plansDiv)) {
                    console.error('⚠️ availablePlans is in wrong place! Moving to subscription-pane...');
                    plansDiv.remove();
                    subscriptionInfoDiv.appendChild(plansDiv);
                }
            }
            // Final verification that subscription content is visible in subscription-pane
            const finalCheck = document.getElementById('subscriptionInfo');
            if (finalCheck && subscriptionPane.contains(finalCheck)) {
                console.log('✅ Final check: subscriptionInfo is in subscription-pane, content length:', finalCheck.innerHTML.length);
            } else {
                console.error('❌ Final check FAILED: subscriptionInfo is NOT in subscription-pane!');
            }
        }, 100);
        
        // Update trial status in other tabs (only if in trial mode)
        updateTrialStatusInTabs(subscriptionStatus);
        
        // Verify the availablePlans div was created
        const verifyPlansDiv = document.getElementById('availablePlans');
        console.log('availablePlans div exists after setting HTML:', !!verifyPlansDiv);
        
        // Final verification: ensure plans div is ONLY in subscription-pane
        if (verifyPlansDiv) {
            const plansParent = verifyPlansDiv.closest('.tab-pane');
            if (plansParent && plansParent.id !== 'subscription-pane') {
                console.error('⚠️ availablePlans is in wrong tab! Moving to subscription-pane...');
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(verifyPlansDiv);
                }
            }
        }
        
        // If we preserved plans HTML, restore it now
        if (preservedPlansHTML && verifyPlansDiv) {
            console.log('🔄 Restoring preserved plans HTML, length:', preservedPlansHTML.length);
            
            // Force a re-render by toggling display (helps with Bootstrap tab visibility)
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane) {
                // Ensure the tab pane is visible (Bootstrap 5 uses 'show' and 'active' classes)
                subscriptionPane.classList.add('show', 'active');
                // Also ensure it's not hidden
                subscriptionPane.style.display = '';
                console.log('✅ Subscription pane classes:', subscriptionPane.className);
                console.log('✅ Subscription pane display:', window.getComputedStyle(subscriptionPane).display);
            }
            
            // Restore the HTML
            verifyPlansDiv.innerHTML = preservedPlansHTML;
            console.log('✅ Plans HTML restored, length:', verifyPlansDiv.innerHTML.length);
            
            // Force a reflow to ensure rendering
            verifyPlansDiv.offsetHeight;
            
            // Verify the plans are actually visible
            setTimeout(() => {
                const restoredDiv = document.getElementById('availablePlans');
                if (restoredDiv) {
                    console.log('✅ Verification - restored div innerHTML length:', restoredDiv.innerHTML.length);
                    console.log('✅ Verification - div is visible:', restoredDiv.offsetParent !== null);
                    console.log('✅ Verification - subscription pane is visible:', subscriptionPane?.offsetParent !== null);
                    console.log('✅ Verification - subscription pane display:', subscriptionPane ? window.getComputedStyle(subscriptionPane).display : 'N/A');
                    
                    // If still not visible, try to force it
                    if (restoredDiv.offsetParent === null && subscriptionPane) {
                        console.log('⚠️ Plans div not visible, forcing visibility...');
                        subscriptionPane.style.display = 'block';
                        subscriptionPane.style.visibility = 'visible';
                        subscriptionPane.style.opacity = '1';
                    }
                }
            }, 100);
            
            // Don't reload plans if we restored them
            return; // Exit early since plans are already loaded
        } else {
            // Load available plans (always show plans except for actual paid enterprise users)
            // For trial users (isInTrial = true), we still want to show plans so they can upgrade
            const actualTier = subscriptionStatus.tier || plan.tier || 'free'; // Their actual subscription tier (not trial)
            const shouldShowPlans = !isInTrial || actualTier !== 'enterprise'; // Show plans if in trial OR not on enterprise
            
            console.log('Subscription plan loading logic:', {
                actualTier,
                isInTrial,
                shouldShowPlans,
                effectiveTier,
                subscriptionStatus,
                plan,
                hasPlansDiv: !!verifyPlansDiv,
                preservedPlans: !!preservedPlansHTML
            });
            
            // Always try to load plans if not on enterprise (including trial users)
            // For free tier users (including those in trial), show upgrade plans
            if (actualTier !== 'enterprise' || isInTrial) {
                console.log('📦 Loading subscription plans for tier:', actualTier, 'isInTrial:', isInTrial);
                
                // Use a more reliable approach: wait for the div to exist, then load plans
                const loadPlansWhenReady = async () => {
                    let attempts = 0;
                    const maxAttempts = 15; // Increased attempts
                    
                    while (attempts < maxAttempts) {
                        // Make sure we're looking in the subscription-pane
                        const subscriptionPane = document.getElementById('subscription-pane');
                        const plansDiv = subscriptionPane ? subscriptionPane.querySelector('#availablePlans') : document.getElementById('availablePlans');
                        
                        if (plansDiv && subscriptionPane && subscriptionPane.contains(plansDiv)) {
                            console.log(`✅ Found availablePlans div in subscription-pane on attempt ${attempts + 1}`);
                            try {
                                await loadAvailablePlans(actualTier);
                                return; // Success, exit
                            } catch (err) {
                                console.error('❌ Error in loadAvailablePlans:', err);
                                return;
                            }
                        }
                        attempts++;
                        if (attempts % 3 === 0) {
                            console.log(`⏳ Waiting for availablePlans div in subscription-pane (attempt ${attempts}/${maxAttempts})...`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    
                    console.error('❌ availablePlans div not found in subscription-pane after', maxAttempts, 'attempts');
                    // Try one more time with loadAvailablePlans which has its own retry logic
                    try {
                        await loadAvailablePlans(actualTier);
                    } catch (err) {
                        console.error('❌ Final attempt to load plans failed:', err);
                    }
                };
                
                // Start loading plans after a short delay to ensure DOM is updated
                setTimeout(loadPlansWhenReady, 200);
            } else {
                console.log('⏭️ Skipping plan load - user is on enterprise tier and not in trial');
            }
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
    console.log('loadAvailablePlans called with tier:', currentTier);
    
    // Helper function to find the element with retries
    const findAvailablePlansDiv = async (maxRetries = 10, delay = 200) => {
        for (let i = 0; i < maxRetries; i++) {
            const div = document.getElementById('availablePlans');
            if (div) {
                console.log(`✅ Found availablePlans div on attempt ${i + 1}`);
                // Check if it's actually in the DOM and accessible
                const isInDOM = div.offsetParent !== null || div.closest('#subscription-pane') !== null;
                console.log('Div is in DOM:', isInDOM, 'Parent:', div.parentElement?.id);
                return div;
            }
            if (i < maxRetries - 1) {
                console.log(`⏳ availablePlans div not found, waiting ${delay}ms (attempt ${i + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return null;
    };
    
    // Try to find the element - MUST be in subscription-pane
    const subscriptionPane = document.getElementById('subscription-pane');
    let availablePlansDiv = null;
    
    // First, try to find it in subscription-pane specifically
    if (subscriptionPane) {
        availablePlansDiv = subscriptionPane.querySelector('#availablePlans');
        if (availablePlansDiv) {
            console.log('✅ Found availablePlans in subscription-pane');
        }
    }
    
    // If not found, try the general find function
    if (!availablePlansDiv) {
        availablePlansDiv = await findAvailablePlansDiv();
    }
    
    // If still not found, check if it's in the wrong place
    if (!availablePlansDiv) {
        console.error('❌ availablePlans div not found after all retries');
        console.error('Subscription pane exists:', !!subscriptionPane);
        console.error('Subscription pane visible:', subscriptionPane?.offsetParent !== null);
        console.error('Subscription pane innerHTML length:', subscriptionPane?.innerHTML?.length || 0);
        
        // Try multiple strategies to find it
        if (subscriptionPane) {
            // Strategy 1: Query within subscription pane
            const foundInPane = subscriptionPane.querySelector('#availablePlans');
            console.log('Found in subscription pane query:', !!foundInPane);
            if (foundInPane) {
                availablePlansDiv = foundInPane;
                console.log('✅ Using found element from querySelector');
            } else {
                // Strategy 2: Check subscriptionInfo
                const subscriptionInfo = subscriptionPane.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    const foundInInfo = subscriptionInfo.querySelector('#availablePlans');
                    console.log('Found in subscriptionInfo:', !!foundInInfo);
                    if (foundInInfo) {
                        availablePlansDiv = foundInInfo;
                        console.log('✅ Using found element from subscriptionInfo');
                    } else {
                        // Strategy 3: Check if subscriptionInfo has the HTML but div isn't created yet
                        console.log('SubscriptionInfo innerHTML length:', subscriptionInfo.innerHTML.length);
                        console.log('SubscriptionInfo contains "availablePlans":', subscriptionInfo.innerHTML.includes('availablePlans'));
                        
                        // If subscriptionInfo exists but availablePlans doesn't, the HTML might not have been set yet
                        // Wait a bit more and try again
                        console.log('⏳ Waiting for subscription HTML to be set...');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const retryDiv = document.getElementById('availablePlans');
                        if (retryDiv) {
                            availablePlansDiv = retryDiv;
                            console.log('✅ Found after additional wait');
                        }
                    }
                }
            }
        }
        
        if (!availablePlansDiv) {
            console.error('❌ Still cannot find availablePlans div after all strategies');
            console.error('Available IDs in subscription pane:', Array.from(subscriptionPane?.querySelectorAll('[id]') || []).map(el => el.id));
            return;
        }
    }
    
    console.log('✅ Using availablePlans div:', availablePlansDiv);
    console.log('Div parent:', availablePlansDiv.parentElement?.id || 'none');
    console.log('Div is in DOM:', availablePlansDiv.offsetParent !== null || availablePlansDiv.closest('#subscription-pane') !== null);
    
    // CRITICAL: If div has no parent, it's detached - reattach it
    if (!availablePlansDiv.parentElement) {
        console.error('⚠️ availablePlansDiv has no parent! Reattaching...');
        const subscriptionInfo = subscriptionPane?.querySelector('#subscriptionInfo');
        if (subscriptionInfo) {
            subscriptionInfo.appendChild(availablePlansDiv);
            console.log('✅ Reattached availablePlansDiv to subscriptionInfo');
        } else if (subscriptionPane) {
            subscriptionPane.appendChild(availablePlansDiv);
            console.log('✅ Reattached availablePlansDiv to subscriptionPane');
        }
    }
    
    // Ensure subscription pane is visible
    if (subscriptionPane) {
        subscriptionPane.classList.add('show', 'active');
        subscriptionPane.style.display = 'block';
        subscriptionPane.style.visibility = 'visible';
        console.log('✅ Ensured subscription-pane is visible, classes:', subscriptionPane.className);
    }
    
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
        console.log('availablePlansDiv element:', availablePlansDiv);
        
        if (upgradePlans.length === 0) {
            console.log('No upgrade plans, showing message');
            availablePlansDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No upgrade plans available at this time.
                </div>
            `;
            return;
        }
        
        // Build plans display
        console.log('Building plans HTML for', upgradePlans.length, 'plans');
        console.log('Plans data:', upgradePlans);
        
        let plansHTML = '';
        try {
            plansHTML = `
                <h6 class="mb-3 mt-4">
                    <i class="fas fa-arrow-up me-2"></i>Available Upgrade Plans
                </h6>
                <div class="row g-3">
                    ${upgradePlans.map((plan, index) => {
                        try {
                            const tier = plan.tier || plan.subscription_tier || 'unknown';
                            
                            // Generate features based on actual plan limits (not from database)
                            const maxDivisions = plan.max_divisions;
                            const maxTeams = plan.max_teams;
                            const maxTeamMembers = plan.max_team_members;
                            
                            // All plans include the same features - only limits differ
                            // Estimate visual width for sorting (wide chars like W, M count more; narrow like i, l count less)
                            function estimateVisualWidth(text) {
                                let width = 0;
                                const wideChars = 'WMmw@';
                                const narrowChars = 'il1|![]{}()';
                                for (let char of text) {
                                    if (wideChars.includes(char)) {
                                        width += 1.3; // Wide characters
                                    } else if (narrowChars.includes(char)) {
                                        width += 0.6; // Narrow characters
                                    } else if (char === ' ') {
                                        width += 0.4; // Spaces
                                    } else {
                                        width += 1.0; // Normal characters
                                    }
                                }
                                return width;
                            }
                            
                            // Sort common features by visual width (shortest to longest)
                            // Manual override: "Payment management" should come after "Sanction fee tracking"
                            const commonFeatures = [
                                'Full dues tracking',
                                'Payment management',
                                'Sanction fee tracking',
                                'Team roster management',
                                'Financial breakdowns',
                                'Projection mode',
                                'Weekly payment tracking',
                                'Makeup match payments',
                                'Player status management'
                            ].sort((a, b) => {
                                // Manual ordering: Payment management after Sanction fee tracking
                                if (a === 'Payment management' && b === 'Sanction fee tracking') {
                                    return 1; // Payment management comes after
                                }
                                if (a === 'Sanction fee tracking' && b === 'Payment management') {
                                    return -1; // Sanction fee tracking comes before
                                }
                                
                                const widthA = estimateVisualWidth(a);
                                const widthB = estimateVisualWidth(b);
                                if (widthA !== widthB) {
                                    return widthA - widthB;
                                }
                                // If widths are equal, sort alphabetically
                                return a.localeCompare(b);
                            });
                            
                            // Features only include the common features (limits are shown separately)
                            let features = [...commonFeatures];
                            
                            // Add export/reporting feature for Pro and Enterprise plans only
                            if (tier === 'pro' || tier === 'enterprise') {
                                features.push('Data export & reporting');
                            }
                            
                            // Sort features again after adding export (to maintain visual width sorting)
                            features.sort((a, b) => {
                                // Keep export at the end
                                if (a === 'Data export & reporting') return 1;
                                if (b === 'Data export & reporting') return -1;
                                
                                // Manual ordering: Payment management after Sanction fee tracking
                                if (a === 'Payment management' && b === 'Sanction fee tracking') {
                                    return 1;
                                }
                                if (a === 'Sanction fee tracking' && b === 'Payment management') {
                                    return -1;
                                }
                                
                                const widthA = estimateVisualWidth(a);
                                const widthB = estimateVisualWidth(b);
                                if (widthA !== widthB) {
                                    return widthA - widthB;
                                }
                                return a.localeCompare(b);
                            });
                            const price = plan.price_monthly || plan.price || 0;
                            const badgeColor = tier === 'basic' ? 'primary' : 
                                             tier === 'pro' ? 'warning' : 'success';
                            const planName = plan.name || (tier.charAt(0).toUpperCase() + tier.slice(1));
                            const colSize = upgradePlans.length === 1 ? '12' : upgradePlans.length === 2 ? '6' : '4';
                            
                            return `
                                <div class="col-md-${colSize}">
                                    <div class="card h-100 border-2 ${tier === 'pro' ? 'border-warning shadow-sm' : ''}">
                                        <div class="card-header bg-${badgeColor} text-white">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <h6 class="mb-0">
                                                    <i class="fas fa-star me-2"></i>${planName}
                                                </h6>
                                                <span class="badge bg-light text-dark">${formatCurrency(price)}/mo</span>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            ${(() => {
                                                // Use simple short descriptions based on tier
                                                let shortDesc = '';
                                                if (tier === 'basic' || tier === 'free') {
                                                    shortDesc = 'Great for small leagues';
                                                } else if (tier === 'pro') {
                                                    shortDesc = 'Best for growing leagues';
                                                } else if (tier === 'enterprise') {
                                                    shortDesc = 'Excellent for large & established leagues';
                                                }
                                                return shortDesc ? `<p class="text-muted small mb-3">${shortDesc}</p>` : '';
                                            })()}
                                            
                                            ${tier !== 'enterprise' ? `
                                            <div class="mb-3">
                                                <strong>Limits:</strong>
                                                <ul class="list-unstyled mt-2 mb-0 small">
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        ${plan.max_divisions === null || plan.max_divisions === undefined ? 'Unlimited' : plan.max_divisions} division${plan.max_divisions !== 1 ? 's' : ''}<br><span style="margin-left: 1.5rem;">(or ${Math.floor((plan.max_divisions || 0)/2)} double play)</span>
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Up to ${plan.max_teams === null || plan.max_teams === undefined ? 'Unlimited' : plan.max_teams} teams
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Up to ${plan.max_team_members === null || plan.max_team_members === undefined ? 'Unlimited' : plan.max_team_members} players
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        16 teams per division max
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        8 players per team roster
                                                    </li>
                                                </ul>
                                            </div>
                                            ` : `
                                            <div class="mb-3">
                                                <ul class="list-unstyled mt-2 mb-0 small">
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited divisions
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited teams
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited players
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited teams per division
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited rosters
                                                    </li>
                                                </ul>
                                            </div>
                                            `}
                                            
                                            ${features.length > 0 ? `
                                                <div class="mb-3">
                                                    <strong>Features:</strong>
                                                    <ul class="list-unstyled mt-2 mb-0 small">
                                                        ${features.map(feature => `
                                                            <li><i class="fas fa-check text-success me-2"></i>${typeof feature === 'string' ? feature : JSON.stringify(feature)}</li>
                                                        `).join('')}
                                                    </ul>
                                                </div>
                                            ` : ''}
                                            
                                            <button class="btn btn-${badgeColor} w-100 mt-auto" onclick="upgradeToPlan('${tier}', '${planName.replace(/'/g, "\\'")}', this)">
                                                <i class="fas fa-arrow-up me-2"></i>Upgrade to ${planName}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        } catch (planError) {
                            console.error(`Error building HTML for plan ${index}:`, planError, plan);
                            return `<div class="col-12"><div class="alert alert-warning">Error displaying plan: ${planError.message}</div></div>`;
                        }
                    }).join('')}
                </div>
            `;
            
            console.log('Plans HTML generated, length:', plansHTML.length);
            console.log('Setting plans HTML, element exists:', !!availablePlansDiv);
            console.log('Plans HTML preview (first 500 chars):', plansHTML.substring(0, 500));
            
        } catch (htmlError) {
            console.error('Error generating plans HTML:', htmlError);
            plansHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Error displaying plans</strong>
                    <p class="mb-0 mt-2">${htmlError.message}</p>
                </div>
            `;
        }
        
        // Set the HTML (outside try/catch so it always runs)
        if (availablePlansDiv && plansHTML) {
            console.log('📝 Setting plans HTML, div exists:', !!availablePlansDiv, 'HTML length:', plansHTML.length);
            
            // CRITICAL: Ensure availablePlansDiv is in subscription-pane before setting HTML
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane && !subscriptionPane.contains(availablePlansDiv)) {
                console.error('⚠️ availablePlansDiv is NOT in subscription-pane! Moving it...');
                availablePlansDiv.remove();
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                } else if (subscriptionPane) {
                    subscriptionPane.appendChild(availablePlansDiv);
                }
            }
            
            // Set the plans HTML
            availablePlansDiv.innerHTML = plansHTML;
            console.log('✅ Plans HTML set successfully');
            
            // CRITICAL: Verify plans div is still in subscription-pane after setting HTML
            if (subscriptionPane && !subscriptionPane.contains(availablePlansDiv)) {
                console.error('⚠️ availablePlansDiv moved after setting HTML! Moving back...');
                availablePlansDiv.remove();
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                } else {
                    subscriptionPane.appendChild(availablePlansDiv);
                }
                // Re-set HTML since we moved it
                availablePlansDiv.innerHTML = plansHTML;
            }
            
            // CRITICAL: If div has no parent after setting HTML, reattach it
            if (!availablePlansDiv.parentElement) {
                console.error('⚠️ availablePlansDiv has no parent after setting HTML! Reattaching...');
                const subscriptionInfo = subscriptionPane?.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                    // Re-set HTML after reattaching
                    availablePlansDiv.innerHTML = plansHTML;
                } else if (subscriptionPane) {
                    subscriptionPane.appendChild(availablePlansDiv);
                    availablePlansDiv.innerHTML = plansHTML;
                }
            }
            
            // Verify plans HTML was actually set
            if (availablePlansDiv.innerHTML.length < 100) {
                console.error('⚠️ Plans HTML too short after setting! Re-setting...');
                availablePlansDiv.innerHTML = plansHTML;
            }
            
            // Ensure subscription pane is visible
            if (subscriptionPane) {
                subscriptionPane.classList.add('show', 'active');
                subscriptionPane.style.display = 'block';
                subscriptionPane.style.visibility = 'visible';
                console.log('✅ Final: subscription-pane classes:', subscriptionPane.className, 'display:', subscriptionPane.style.display);
            }
            
            // Immediately clean up any subscription content from other tabs (multiple times)
            cleanSubscriptionContentFromOtherTabs();
            setTimeout(() => {
                cleanSubscriptionContentFromOtherTabs();
                // Final verification
                const finalPlansDiv = document.getElementById('availablePlans');
                if (finalPlansDiv) {
                    console.log('✅ Final plans check - in subscription-pane:', subscriptionPane?.contains(finalPlansDiv), 'HTML length:', finalPlansDiv.innerHTML.length);
                }
            }, 50);
            setTimeout(() => cleanSubscriptionContentFromOtherTabs(), 200);
            
            // Force a reflow to ensure rendering
            availablePlansDiv.offsetHeight;
            
            // Immediately verify it was set
            const immediateCheck = document.getElementById('availablePlans');
            if (immediateCheck) {
                console.log('✅ Immediate verification - innerHTML length:', immediateCheck.innerHTML.length);
                console.log('✅ Immediate verification - div visible:', immediateCheck.offsetParent !== null);
                // Verify it's in subscription-pane
                const checkParent = immediateCheck.closest('.tab-pane');
                if (checkParent && checkParent.id !== 'subscription-pane') {
                    console.error('⚠️ availablePlans is in wrong tab!', checkParent.id);
                    immediateCheck.remove();
                    const subscriptionInfo = document.getElementById('subscriptionInfo');
                    if (subscriptionInfo) {
                        subscriptionInfo.appendChild(immediateCheck);
                    }
                }
                if (immediateCheck.innerHTML.length < 100) {
                    console.error('⚠️ Plans HTML too short, retrying...');
                    immediateCheck.innerHTML = plansHTML;
                }
            }
            
            // Also verify after a delay
            setTimeout(() => {
                const verifyDiv = document.getElementById('availablePlans');
                if (verifyDiv) {
                    console.log('✅ Delayed verification - innerHTML length:', verifyDiv.innerHTML.length);
                    console.log('✅ Delayed verification - div visible:', verifyDiv.offsetParent !== null);
                    // Final cleanup check
                    cleanSubscriptionContentFromOtherTabs();
                    if (verifyDiv.innerHTML.length < 100) {
                        console.error('⚠️ Plans HTML was not set correctly after delay! Retrying...');
                        verifyDiv.innerHTML = plansHTML;
                    }
                    
                    // Check if subscription pane is visible
                    const pane = document.getElementById('subscription-pane');
                    if (pane) {
                        console.log('✅ Subscription pane classes:', pane.className);
                        console.log('✅ Subscription pane visible:', pane.offsetParent !== null);
                        console.log('✅ Subscription pane display:', window.getComputedStyle(pane).display);
                    }
                } else {
                    console.error('❌ availablePlans div disappeared!');
                }
            }, 200);
            } else {
                console.error('❌ Cannot set plans HTML');
                console.error('  - availablePlansDiv exists:', !!availablePlansDiv);
                console.error('  - plansHTML length:', plansHTML ? plansHTML.length : 0);
                
                // Try multiple strategies to find or create the div
                let targetDiv = availablePlansDiv;
                
                if (!targetDiv) {
                    // Strategy 1: Find it in subscription pane
                    const subscriptionPane = document.getElementById('subscription-pane');
                    if (subscriptionPane) {
                        targetDiv = subscriptionPane.querySelector('#availablePlans');
                        console.log('Found via querySelector:', !!targetDiv);
                    }
                }
                
                if (!targetDiv) {
                    // Strategy 2: Find subscriptionInfo and check for availablePlans
                    const subscriptionInfo = document.getElementById('subscriptionInfo');
                    if (subscriptionInfo) {
                        targetDiv = subscriptionInfo.querySelector('#availablePlans');
                        console.log('Found in subscriptionInfo:', !!targetDiv);
                        
                        // If still not found, create it
                        if (!targetDiv && plansHTML) {
                            console.log('⚠️ Creating availablePlans div manually');
                            targetDiv = document.createElement('div');
                            targetDiv.id = 'availablePlans';
                            subscriptionInfo.appendChild(targetDiv);
                            console.log('✅ Created availablePlans div');
                        }
                    }
                }
                
                if (targetDiv && plansHTML) {
                    targetDiv.innerHTML = plansHTML;
                    console.log('✅ Set plans HTML in fallback location');
                } else {
                    console.error('❌ Could not find or create availablePlans div');
                    console.error('Subscription pane:', !!document.getElementById('subscription-pane'));
                    console.error('Subscription info:', !!document.getElementById('subscriptionInfo'));
                }
            }
        
    } catch (error) {
        console.error('❌ Error loading available plans:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            currentTier: currentTier,
            availablePlansDivExists: !!availablePlansDiv
        });
        
        // Try to show error in the div if it exists
        if (availablePlansDiv) {
            availablePlansDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Unable to load upgrade plans</strong>
                    <p class="mb-0 mt-2">${error.message || 'An error occurred while loading subscription plans.'}</p>
                    <small class="text-muted">Please check the browser console for more details or try refreshing the page.</small>
                </div>
            `;
        } else {
            // Try to find or create the div
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane) {
                const subscriptionInfo = subscriptionPane.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    let errorDiv = document.getElementById('availablePlans');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.id = 'availablePlans';
                        subscriptionInfo.appendChild(errorDiv);
                    }
                    errorDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Unable to load upgrade plans</strong>
                            <p class="mb-0 mt-2">${error.message || 'An error occurred while loading subscription plans.'}</p>
                        </div>
                    `;
                }
            }
        }
    }
}

// Function to handle plan upgrade
async function upgradeToPlan(planTier, planName, buttonElement) {
    const button = buttonElement || (window.event ? window.event.target.closest('button') : null);
    let originalText = '';
    if (button) {
        originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    }

    function restoreButton() {
        if (button) {
            button.disabled = false;
            const text = originalText || `<i class="fas fa-arrow-up me-2"></i>Upgrade to ${planName}`;
            button.innerHTML = text.replace('Processing...', `<i class="fas fa-arrow-up me-2"></i>Upgrade to ${planName}`);
        }
    }

    try {
        // Create checkout session
        const response = await apiCall('/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ planTier })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: null }));
            const msg = errorData?.message || `Request failed (${response.status}). Please try again or contact support.`;

            if (msg.includes('not available')) {
                showAlertModal('Payment processing is not available yet. Please contact support to upgrade your plan.', 'warning', 'Payment Unavailable');
                restoreButton();
                return;
            }

            throw new Error(msg);
        }

        const data = await response.json().catch(() => null);
        if (!data) {
            throw new Error('Invalid response from server. Please try again.');
        }

        if (data.url) {
            window.location.href = data.url;
        } else if (data.sessionId) {
            window.location.href = `${window.location.origin}/dues-tracker?session_id=${data.sessionId}`;
        } else {
            throw new Error('No checkout URL or session ID received');
        }
    } catch (error) {
        console.error('Upgrade error:', error);
        showAlertModal(`Failed to start upgrade: ${error.message || 'Unknown error'}. Please try again or contact support.`, 'error', 'Upgrade Failed');
        restoreButton();
    }
}

// Make upgradeToPlan available globally
window.upgradeToPlan = upgradeToPlan;

async function saveProfile() {
    const errorDiv = document.getElementById('profileError');
    const successDiv = document.getElementById('profileSuccess');
    
    if (!errorDiv || !successDiv) {
        console.error('❌ ERROR: Error or success div not found!');
        alert('Error: Could not find error/success message elements');
        return;
    }
    
    // Hide previous messages
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    try {
        const name = document.getElementById('profileName').value.trim();
        const organizationName = document.getElementById('profileOrganizationName').value.trim();
        const phone = document.getElementById('profilePhone').value.trim();
        const defaultDuesInput = document.getElementById('profileDefaultDues');
        const defaultDues = defaultDuesInput && defaultDuesInput.value ? parseFloat(defaultDuesInput.value) : null;
        const sanctionFeesEnabledInput = document.getElementById('profileSanctionFeesEnabled');
        const sanctionFeesEnabled = sanctionFeesEnabledInput ? sanctionFeesEnabledInput.checked : false;
        
        const sanctionFeeNameInput = document.getElementById('profileSanctionFeeName');
        const sanctionFeeAmountInput = document.getElementById('profileSanctionFeeAmount');
        const sanctionFeePayoutAmountInput = document.getElementById('profileSanctionFeePayoutAmount');
        const sanctionStartDateInput = document.getElementById('profileSanctionStartDate');
        const sanctionEndDateInput = document.getElementById('profileSanctionEndDate');
        
        const sanctionFeeName = sanctionFeeNameInput ? sanctionFeeNameInput.value.trim() : '';
        const sanctionFeeAmountValue = sanctionFeeAmountInput ? sanctionFeeAmountInput.value.trim() : '';
        const sanctionFeeAmount = sanctionFeeAmountValue ? parseFloat(sanctionFeeAmountValue) : null;
        const sanctionFeePayoutAmountValue = sanctionFeePayoutAmountInput ? sanctionFeePayoutAmountInput.value.trim() : '';
        const sanctionFeePayoutAmount = sanctionFeePayoutAmountValue ? parseFloat(sanctionFeePayoutAmountValue) : null;
        const sanctionStartDate = sanctionStartDateInput ? sanctionStartDateInput.value : null;
        const sanctionEndDate = sanctionEndDateInput ? sanctionEndDateInput.value : null;
        
        // Get calculation method
        const methodPercentageRadio = document.getElementById('methodPercentage');
        const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
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
        const prizeFundPercentValue = prizeFundPercentInput ? prizeFundPercentInput.value.trim() : '';
        const prizeFundPercent = prizeFundPercentValue ? parseFloat(prizeFundPercentValue) : null;
        const prizeFundAmountValue = prizeFundAmountInput ? prizeFundAmountInput.value.trim() : '';
        const prizeFundAmount = prizeFundAmountValue ? parseFloat(prizeFundAmountValue) : null;
        const prizeFundAmountType = prizeFundAmountTypeInput ? prizeFundAmountTypeInput.value : 'perTeam';
        
        const firstOrgName = firstOrgNameInput ? firstOrgNameInput.value.trim() : null;
        const firstOrgPercentValue = firstOrgPercentInput ? firstOrgPercentInput.value.trim() : '';
        const firstOrgPercent = firstOrgPercentValue ? parseFloat(firstOrgPercentValue) : null;
        const firstOrgAmountValue = firstOrgAmountInput ? firstOrgAmountInput.value.trim() : '';
        const firstOrgAmount = firstOrgAmountValue ? parseFloat(firstOrgAmountValue) : null;
        const firstOrgAmountType = firstOrgAmountTypeInput ? firstOrgAmountTypeInput.value : 'perTeam';
        
        const secondOrgName = secondOrgNameInput ? secondOrgNameInput.value.trim() : null;
        const secondOrgPercentValue = secondOrgPercentInput ? secondOrgPercentInput.value.trim() : '';
        const secondOrgPercent = secondOrgPercentValue ? parseFloat(secondOrgPercentValue) : null;
        const secondOrgAmountValue = secondOrgAmountInput ? secondOrgAmountInput.value.trim() : '';
        const secondOrgAmount = secondOrgAmountValue ? parseFloat(secondOrgAmountValue) : null;
        const secondOrgAmountType = secondOrgAmountTypeInput ? secondOrgAmountTypeInput.value : 'perTeam';
        
        
        if (!name) {
            throw new Error('Name is required');
        }
        
        // Build request body
        const requestBody = {
            name: name,
            organization_name: organizationName || null,
            phone: phone || null,
            defaultDuesPerPlayerPerMatch: defaultDues,
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
            if (sanctionFeePayoutAmountValue && !isNaN(sanctionFeePayoutAmount) && sanctionFeePayoutAmount >= 0) {
                requestBody.sanctionFeePayoutAmount = sanctionFeePayoutAmount;
            }
            // Add sanction start/end dates if provided
            if (sanctionStartDate) {
                requestBody.sanctionStartDate = sanctionStartDate;
            }
            if (sanctionEndDate) {
                requestBody.sanctionEndDate = sanctionEndDate;
            }
        } else if (sanctionFeeName || sanctionFeeAmountValue) {
            // If only one field is provided, it's invalid
            if (isNaN(sanctionFeeAmount) || sanctionFeeAmount < 0) {
                throw new Error('Sanction fee amount must be a valid positive number');
            }
            requestBody.sanctionFeeName = sanctionFeeName;
            requestBody.sanctionFeeAmount = sanctionFeeAmount;
            
            // Add payout amount if provided (optional, defaults to 0 if not set)
            if (sanctionFeePayoutAmountValue && !isNaN(sanctionFeePayoutAmount) && sanctionFeePayoutAmount >= 0) {
                requestBody.sanctionFeePayoutAmount = sanctionFeePayoutAmount;
            }
            // Add sanction start/end dates if provided
            if (sanctionStartDate) {
                requestBody.sanctionStartDate = sanctionStartDate;
            }
            if (sanctionEndDate) {
                requestBody.sanctionEndDate = sanctionEndDate;
            }
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
        
        // Add calculation method - SIMPLE: just send what user selected
        requestBody.useDollarAmounts = useDollarAmountsValue === true;
        
        // ALWAYS save prize fund name
        if (prizeFundNameInput && prizeFundName) {
            requestBody.prizeFundName = prizeFundName;
        }
        
        if (useDollarAmountsValue) {
            // Save dollar amount settings
            if (prizeFundAmountInput && prizeFundAmount !== null && prizeFundAmount !== undefined && !isNaN(prizeFundAmount) && prizeFundAmount >= 0) {
                requestBody.prizeFundAmount = prizeFundAmount;
                requestBody.prizeFundAmountType = prizeFundAmountType;
            }
            if (firstOrgNameInput && firstOrgName) {
                requestBody.firstOrganizationName = firstOrgName;
            }
            if (firstOrgAmountInput && firstOrgAmount !== null && firstOrgAmount !== undefined && !isNaN(firstOrgAmount) && firstOrgAmount >= 0) {
                requestBody.firstOrganizationAmount = firstOrgAmount;
                requestBody.firstOrganizationAmountType = firstOrgAmountType;
            }
            if (secondOrgNameInput && secondOrgName) {
                requestBody.secondOrganizationName = secondOrgName;
            }
            if (secondOrgAmountInput && secondOrgAmount !== null && secondOrgAmount !== undefined && !isNaN(secondOrgAmount) && secondOrgAmount >= 0) {
                requestBody.secondOrganizationAmount = secondOrgAmount;
                requestBody.secondOrganizationAmountType = secondOrgAmountType;
            }
        } else {
            // Save percentage settings
            if (prizeFundPercentInput && prizeFundPercent !== null && prizeFundPercent !== undefined && !isNaN(prizeFundPercent)) {
                if (prizeFundPercent < 0 || prizeFundPercent > 100) {
                    throw new Error('Prize fund percentage must be between 0 and 100');
                }
                requestBody.prizeFundPercentage = prizeFundPercent;
            }
            if (firstOrgNameInput && firstOrgName) {
                requestBody.firstOrganizationName = firstOrgName;
            }
            if (firstOrgPercentInput && firstOrgPercent !== null && firstOrgPercent !== undefined && !isNaN(firstOrgPercent)) {
                if (firstOrgPercent < 0 || firstOrgPercent > 100) {
                    throw new Error('First organization percentage must be between 0 and 100');
                }
                requestBody.firstOrganizationPercentage = firstOrgPercent;
            }
            if (secondOrgNameInput && secondOrgName) {
                requestBody.secondOrganizationName = secondOrgName;
            }
            if (secondOrgPercentInput && secondOrgPercent !== null && secondOrgPercent !== undefined && !isNaN(secondOrgPercent)) {
                if (secondOrgPercent < 0 || secondOrgPercent > 100) {
                    throw new Error('Second organization percentage must be between 0 and 100');
                }
                requestBody.secondOrganizationPercentage = secondOrgPercent;
            }
        }
        
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
            
            // CRITICAL: Update _savedUseDollarAmounts from the response
            const savedValue = data.operator.use_dollar_amounts === true || data.operator.use_dollar_amounts === 'true' || data.operator.use_dollar_amounts === 1;
            _savedUseDollarAmounts = savedValue;
            
            // Update branding with new organization name
            updateAppBranding(data.operator.organization_name || data.operator.name || 'Dues Tracker');
            
            // Update sanction fee settings and financial breakdown settings
            updateSanctionFeeSettings();
            updateFinancialBreakdownSettings();
            
            // CRITICAL: Update the radio button to match what was JUST SAVED (from response)
            const methodPercentageRadio = document.getElementById('methodPercentage');
            const methodDollarAmountRadio = document.getElementById('methodDollarAmount');
            if (methodPercentageRadio && methodDollarAmountRadio) {
                if (savedValue) {
                    methodDollarAmountRadio.checked = true;
                } else {
                    methodPercentageRadio.checked = true;
                }
            }
            
            toggleCalculationMethod(); // Refresh Active format indicator and hide "Save to change" if modal open

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
                stopSubscriptionCleanup();
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        errorDiv.textContent = error.message || 'Failed to update profile. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

// Periodic cleanup to ensure subscription content stays only in subscription tab
let subscriptionCleanupInterval = null;
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
    
    if (typeof showExportModal === 'function') {
        window.showExportModal = showExportModal;
        console.log('  ✓ showExportModal attached');
    }
    
    if (typeof executeExport === 'function') {
        window.executeExport = executeExport;
        console.log('  ✓ executeExport attached');
    }
    
    if (typeof deleteDivision === 'function') {
        window.deleteDivision = deleteDivision;
        console.log('  ✓ deleteDivision attached');
    }
    
    if (typeof showSmartBuilderModal === 'function') {
        window.showSmartBuilderModal = showSmartBuilderModal;
        console.log('  ✓ showSmartBuilderModal attached');
    }
    
    if (typeof openSmartBuilderFromAddDivision === 'function') {
        window.openSmartBuilderFromAddDivision = openSmartBuilderFromAddDivision;
        console.log('  ✓ openSmartBuilderFromAddDivision attached');
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
