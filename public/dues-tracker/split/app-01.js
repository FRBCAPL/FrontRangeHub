// Configuration
// Use local backend for development, production backend for deployed app
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080/api' 
  : 'https://atlasbackend-bnng.onrender.com/api';

// Sentry frontend DSN. Use your Sentry project DSN (same as backend or separate browser project).
// Leave empty to disable. Get from Sentry: Settings → Projects → [project] → Client Keys (DSN).
const SENTRY_DSN_FRONTEND = window.location.hostname === 'localhost' ? '' : 'https://ab097d19605c76d319ab8806b8c84333@o4510785556185088.ingest.us.sentry.io/4510785561624576';

// Set to true to hide Square upgrade buttons and show "Contact us to upgrade" instead.
const UPGRADES_DISABLED = false; // Set to true to hide upgrade buttons

// Trial donations (Cash App / Venmo). Set your handles; leave empty to hide donation UI during trial.
const DONATION_CASHAPP = '$frusapl';
const DONATION_VENMO = '@duesfrusapl';

// Subscription plans visibility: Hide plans until launch (USAPL try & donate period).
// Before launch: all features/limits unlocked, Donate visible, plan info coming soon.
// PLANS_LAUNCH_DATE: when plans become available (YYYY-MM-DD). Plans hidden before that.
// Set PLANS_HIDE_DAYS = 0 to show plans immediately; plan code unchanged, only hidden.
const PLANS_LAUNCH_DATE = '2026-03-01';
const PLANS_HIDE_DAYS = 30;

function isPlansComingSoon() {
    if (typeof PLANS_LAUNCH_DATE === 'undefined' || !PLANS_LAUNCH_DATE ||
        typeof PLANS_HIDE_DAYS === 'undefined' || PLANS_HIDE_DAYS <= 0) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = PLANS_LAUNCH_DATE.split('-').map(Number);
    const launch = new Date(y, m - 1, d);
    launch.setHours(0, 0, 0, 0);
    return today.getTime() < launch.getTime();
}

// Sentry: init when DSN set (may be missing if blocked by ad-blocker)
if (typeof window.Sentry !== 'undefined' && SENTRY_DSN_FRONTEND) {
  window.Sentry.init({
    dsn: SENTRY_DSN_FRONTEND,
    environment: window.location.hostname === 'localhost' ? 'development' : 'production',
    tracesSampleRate: 0,
  });
}

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
    if (!modal || !modalMessage) return;

    // Set message
    modalMessage.textContent = message;

    // Set title and icon based on type
    let iconClass = 'fas fa-info-circle';
    let headerClass = 'modal-header';

    switch (type) {
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

    // Use single Modal instance to avoid duplicate backdrops (e.g. Verifying -> Success)
    const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
    bsModal.show();
}

// One-time setup: clear grey overlay when alert modal is dismissed
(function setupAlertModalBackdropCleanup() {
    const modal = document.getElementById('alertModal');
    if (!modal) return;
    function cleanupBackdrop() {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(function (b) { b.remove(); });
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
    modal.addEventListener('hidden.bs.modal', function onHidden() {
        setTimeout(cleanupBackdrop, 50);
    }, { passive: true });
})();

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

// Sync plan price displays when Monthly/Yearly billing toggle changes
function syncPlanPricesFromBillingToggle() {
  const billing = document.querySelector('input[name="dues-tracker-billing"]:checked');
  const period = billing ? billing.value : 'monthly';
  document.querySelectorAll('.plan-price-display').forEach(function (span) {
    const m = span.getAttribute('data-monthly');
    const y = span.getAttribute('data-yearly');
    const monthly = (m !== null && m !== '') ? parseFloat(m) : 0;
    const yearly = (y !== null && y !== '') ? parseFloat(y) : null;
    if (period === 'yearly' && yearly != null && !isNaN(yearly)) {
      span.textContent = formatCurrency(yearly) + '/yr';
    } else {
      span.textContent = formatCurrency(monthly) + '/mo';
    }
  });
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
let originalPaymentAmount = null; // Store original payment amount when editing
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

let pendingApprovalsIntervalId = null; // refresh pending-approvals count for admins

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
