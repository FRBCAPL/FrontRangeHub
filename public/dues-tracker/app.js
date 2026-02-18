/**
 * Duezy – League dues, sorted.
 * Owned by Front Range Pool League. © 2026. All rights reserved.
 */
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
// Free period through end of March 2026 (national tournament; LOs need time to use). Plans launch April 1.
const PLANS_LAUNCH_DATE = '2026-04-01';
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

// Sync plan price displays when Monthly/Yearly billing toggle changes (modules/syncplanpricesfrombillingtoggle.js)


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
window.currentOperator = currentOperator; // Expose for modules (e.g. Total Dues period, combined payment)

// Preserve client-only operator fields (e.g. combine_prize_and_national_check, custom_payment_methods) when API doesn't return them
function mergePreservedOperatorFields(operator) {
    if (!operator) return;
    try {
        const stored = JSON.parse(localStorage.getItem('currentOperator') || 'null');
        if (!stored) return;
        const hasCombine = operator.combine_prize_and_national_check !== undefined || operator.combinePrizeAndNationalCheck !== undefined;
        if (!hasCombine && (stored.combine_prize_and_national_check !== undefined || stored.combinePrizeAndNationalCheck !== undefined)) {
            const value = stored.combine_prize_and_national_check ?? stored.combinePrizeAndNationalCheck;
            operator.combine_prize_and_national_check = value;
        }
        const hasCustomMethods = operator.custom_payment_methods !== undefined && Array.isArray(operator.custom_payment_methods);
        if (!hasCustomMethods && stored.custom_payment_methods && Array.isArray(stored.custom_payment_methods)) {
            operator.custom_payment_methods = stored.custom_payment_methods;
        }
        const hasPeriodType = operator.combined_payment_period_type !== undefined || operator.combinedPaymentPeriodType !== undefined;
        if (!hasPeriodType && (stored.combined_payment_period_type !== undefined || stored.combinedPaymentPeriodType !== undefined)) {
            operator.combined_payment_period_type = stored.combined_payment_period_type ?? stored.combinedPaymentPeriodType;
        }
        const hasPeriodAnchor = operator.combined_payment_anchor !== undefined || operator.combinedPaymentAnchor !== undefined;
        if (!hasPeriodAnchor && (stored.combined_payment_anchor !== undefined || stored.combinedPaymentAnchor !== undefined)) {
            operator.combined_payment_anchor = stored.combined_payment_anchor ?? stored.combinedPaymentAnchor;
        }
        const hasPeriodAnchorDate = operator.combined_payment_anchor_date !== undefined || operator.combinedPaymentAnchorDate !== undefined;
        if (!hasPeriodAnchorDate && (stored.combined_payment_anchor_date !== undefined || stored.combinedPaymentAnchorDate !== undefined)) {
            operator.combined_payment_anchor_date = stored.combined_payment_anchor_date ?? stored.combinedPaymentAnchorDate;
        }
    } catch (e) { /* ignore */ }
}

let currentTeamId = null;
let divisions = [];
let teams = []; // Initialize teams array (current page for display)
let teamsForSummary = []; // All teams for card totals (not paginated)
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

// Local-first data settings (Duezy only)
const LOCAL_DATA_CONSENT_KEY = 'duezyLocalDataConsent';
const LOCAL_DATA_PROMPTED_KEY = 'duezyLocalDataPrompted';
const LOCAL_CACHE_PREFIX = 'duezyCache:';
const LOCAL_SNAPSHOT_KEY = 'duezySnapshot:v1';
const LOCAL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes per endpoint cache
const LOCAL_SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours snapshot

function isLocalDataEnabled() {
    return localStorage.getItem(LOCAL_DATA_CONSENT_KEY) === 'granted';
}

function clearDuezyLocalCache() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key.startsWith(LOCAL_CACHE_PREFIX) || key === LOCAL_SNAPSHOT_KEY) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (e) {
        console.warn('⚠️ Failed clearing local cache:', e);
    }
}

function updateLocalStorageUiState() {
    const isEnabled = isLocalDataEnabled();
    const statusBtn = document.getElementById('localStorageSettingsBtn');
    const statusText = document.getElementById('localStorageStatusText');
    const lastSyncText = document.getElementById('localStorageLastSyncText');
    const allowBtn = document.getElementById('localStorageAllowBtn');
    const denyBtn = document.getElementById('localStorageDenyBtn');

    if (statusBtn) {
        statusBtn.classList.remove('btn-outline-success', 'btn-outline-warning');
        statusBtn.classList.add(isEnabled ? 'btn-outline-success' : 'btn-outline-warning');
        statusBtn.title = isEnabled
            ? 'Local storage enabled (faster + offline cache). Click to manage.'
            : 'Local storage disabled. Click to manage.';
        statusBtn.innerHTML = isEnabled
            ? '<i class="fas fa-database me-1"></i>Local'
            : '<i class="fas fa-database me-1"></i>Local Off';
    }

    if (statusText) {
        statusText.innerHTML = isEnabled
            ? '<strong class="text-success">Status:</strong> Local storage is enabled on this device.'
            : '<strong class="text-warning">Status:</strong> Local storage is disabled on this device.';
    }

    if (lastSyncText) {
        try {
            const raw = localStorage.getItem(LOCAL_SNAPSHOT_KEY);
            if (!raw) {
                lastSyncText.textContent = 'No local snapshot saved yet.';
            } else {
                const parsed = JSON.parse(raw);
                const when = parsed?.savedAt ? new Date(parsed.savedAt).toLocaleString() : null;
                lastSyncText.textContent = when ? `Last local snapshot: ${when}` : 'No local snapshot saved yet.';
            }
        } catch (_) {
            lastSyncText.textContent = 'No local snapshot saved yet.';
        }
    }

    if (allowBtn) allowBtn.disabled = isEnabled;
    if (denyBtn) denyBtn.disabled = !isEnabled;
}

function setLocalDataConsentChoice(granted) {
    localStorage.setItem(LOCAL_DATA_PROMPTED_KEY, 'true');
    localStorage.setItem(LOCAL_DATA_CONSENT_KEY, granted ? 'granted' : 'denied');
    if (!granted) clearDuezyLocalCache();
    updateLocalStorageUiState();
}

function wireLocalStorageModalActions() {
    const allowBtn = document.getElementById('localStorageAllowBtn');
    const denyBtn = document.getElementById('localStorageDenyBtn');
    const clearBtn = document.getElementById('localStorageClearBtn');
    if (allowBtn && !allowBtn.dataset.bound) {
        allowBtn.dataset.bound = 'true';
        allowBtn.addEventListener('click', function() {
            setLocalDataConsentChoice(true);
            const modalEl = document.getElementById('localStorageSettingsModal');
            if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        });
    }
    if (denyBtn && !denyBtn.dataset.bound) {
        denyBtn.dataset.bound = 'true';
        denyBtn.addEventListener('click', function() {
            setLocalDataConsentChoice(false);
            const modalEl = document.getElementById('localStorageSettingsModal');
            if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        });
    }
    if (clearBtn && !clearBtn.dataset.bound) {
        clearBtn.dataset.bound = 'true';
        clearBtn.addEventListener('click', function() {
            clearDuezyLocalCache();
            updateLocalStorageUiState();
            showAlertModal('Local cache cleared on this device.', 'success', 'Local Cache');
        });
    }
}

function showLocalStorageSettingsModal(forcePrompt = false) {
    const modalEl = document.getElementById('localStorageSettingsModal');
    if (!modalEl) return;
    updateLocalStorageUiState();
    if (typeof initializeModalTooltips === 'function') {
        initializeModalTooltips(modalEl);
    } else if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        modalEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
            bootstrap.Tooltip.getOrCreateInstance(el);
        });
    }
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: forcePrompt ? 'static' : true,
        keyboard: !forcePrompt
    });
    modal.show();
}
window.showLocalStorageSettingsModal = showLocalStorageSettingsModal;

function ensureLocalDataConsent() {
    if (localStorage.getItem(LOCAL_DATA_PROMPTED_KEY) === 'true') {
        updateLocalStorageUiState();
        return;
    }
    showLocalStorageSettingsModal(true);
}

function getLocalCacheNamespace() {
    const operatorId = currentOperator?._id || currentOperator?.id || 'anon';
    return `${LOCAL_CACHE_PREFIX}${operatorId}:`;
}

function writeLocalCache(cacheKey, data) {
    if (!isLocalDataEnabled()) return;
    try {
        localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (e) {
        console.warn('⚠️ Failed writing local cache:', e);
    }
}

function readLocalCache(cacheKey, ttlMs = LOCAL_CACHE_TTL_MS) {
    if (!isLocalDataEnabled()) return null;
    try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.savedAt) return null;
        if (Date.now() - parsed.savedAt > ttlMs) return null;
        return parsed.data;
    } catch (_) {
        return null;
    }
}

function saveDuezyLocalSnapshot() {
    if (!isLocalDataEnabled()) return;
    try {
        const snapshot = {
            savedAt: Date.now(),
            divisions: Array.isArray(divisions) ? divisions : [],
            teams: Array.isArray(teams) ? teams : [],
            teamsForSummary: Array.isArray(teamsForSummary) ? teamsForSummary : [],
            filteredTeams: Array.isArray(filteredTeams) ? filteredTeams : [],
            currentOperator: currentOperator || null
        };
        localStorage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (e) {
        console.warn('⚠️ Failed saving local snapshot:', e);
    }
}

function hydrateDuezyFromLocalSnapshot() {
    if (!isLocalDataEnabled()) return false;
    try {
        const raw = localStorage.getItem(LOCAL_SNAPSHOT_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.savedAt) return false;
        if (Date.now() - parsed.savedAt > LOCAL_SNAPSHOT_TTL_MS) return false;
        divisions = Array.isArray(parsed.divisions) ? parsed.divisions : [];
        teams = Array.isArray(parsed.teams) ? parsed.teams : [];
        teamsForSummary = Array.isArray(parsed.teamsForSummary) ? parsed.teamsForSummary : [];
        filteredTeams = Array.isArray(parsed.filteredTeams) ? parsed.filteredTeams : [];
        if (parsed.currentOperator && !currentOperator) {
            currentOperator = parsed.currentOperator;
            window.currentOperator = currentOperator;
        }
        return true;
    } catch (_) {
        return false;
    }
}

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
                window.currentOperator = currentOperator;
                mergePreservedOperatorFields(currentOperator);
                localStorage.setItem('currentOperator', JSON.stringify(currentOperator));
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


// Sanction fee settings (configurable per league operator)
let sanctionFeesEnabled = false; // Default - Whether sanction fees are enabled
let sanctionFeeName = 'Sanction Fee'; // Default
let sanctionFeeAmount = 25.00; // Default - Collection amount (what you charge players)
let sanctionFeePayoutAmount = 20.00; // Default - Payout amount (what you pay out for each sanction)

// Green fee settings (table/room fees per team per week - optional)
let greenFeesEnabled = false;
let greenFeeName = 'Green Fee';
let greenFeeAmount = 0;
let greenFeePayoutAmount = 0; // What you pay to the venue per team per week

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
    const divisionPrizeFundPercentEl = document.getElementById('divisionPrizeFundPercentage');
    const divisionFirstOrgPercentEl = document.getElementById('divisionFirstOrgPercentage');
    const divisionSecondOrgPercentEl = document.getElementById('divisionSecondOrgPercentage');
    const divisionPrizeFundAmountEl = document.getElementById('divisionPrizeFundAmount');
    const divisionFirstOrgAmountEl = document.getElementById('divisionFirstOrganizationAmount');
    const divisionSecondOrgAmountEl = document.getElementById('divisionSecondOrganizationAmount');
    
    const divisionMethodPercentage = document.getElementById('divisionMethodPercentage');
    const divisionMethodDollarAmount = document.getElementById('divisionMethodDollarAmount');
    const operatorUsesDollarAmounts = currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts || false;
    
    const methodNeedsSave = operatorUsesDollarAmounts !== _savedDivisionUseDollarAmounts;
    const hasFieldValues = 
        (divisionPrizeFundPercentEl && divisionPrizeFundPercentEl.value.trim()) ||
        (divisionFirstOrgPercentEl && divisionFirstOrgPercentEl.value.trim()) ||
        (divisionSecondOrgPercentEl && divisionSecondOrgPercentEl.value.trim()) ||
        (divisionPrizeFundAmountEl && divisionPrizeFundAmountEl.value.trim()) ||
        (divisionFirstOrgAmountEl && divisionFirstOrgAmountEl.value.trim()) ||
        (divisionSecondOrgAmountEl && divisionSecondOrgAmountEl.value.trim());
    const needsSave = methodNeedsSave || hasFieldValues;
    
    if (divisionPrizeFundPercentEl) divisionPrizeFundPercentEl.value = '';
    if (divisionFirstOrgPercentEl) divisionFirstOrgPercentEl.value = '';
    if (divisionSecondOrgPercentEl) divisionSecondOrgPercentEl.value = '';
    if (divisionPrizeFundAmountEl) divisionPrizeFundAmountEl.value = '';
    if (divisionFirstOrgAmountEl) divisionFirstOrgAmountEl.value = '';
    if (divisionSecondOrgAmountEl) divisionSecondOrgAmountEl.value = '';
    
    // Set the radio buttons to match operator default
    if (operatorUsesDollarAmounts) {
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = true;
        if (divisionMethodPercentage) divisionMethodPercentage.checked = false;
    } else {
        if (divisionMethodPercentage) divisionMethodPercentage.checked = true;
        if (divisionMethodDollarAmount) divisionMethodDollarAmount.checked = false;
    }
    
    toggleDivisionCalculationMethod();
    const saveToChangeMsg = document.getElementById('divisionSaveToChangeFormatMsg');
    if (saveToChangeMsg) saveToChangeMsg.style.display = needsSave ? 'block' : 'none';
    if (typeof updateDivisionFinancialDefaultIndicator === 'function') updateDivisionFinancialDefaultIndicator(typeof currentDivisionId !== 'undefined' ? (divisions && divisions.find(d => d._id === currentDivisionId)) : null);
    showAlertModal('Distribution cleared. Division will use your default settings from Profile & Settings.', 'success', 'Defaults Restored');
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

function updateDivisionFinancialLabels() {
    const pf = (typeof prizeFundName !== 'undefined' ? prizeFundName : 'Prize Fund') || 'Prize Fund';
    const o1 = (typeof firstOrganizationName !== 'undefined' ? firstOrganizationName : 'League Manager') || 'League Manager';
    const o2 = (typeof secondOrganizationName !== 'undefined' ? secondOrganizationName : 'Parent/National Org') || 'Parent/National Org';
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('divisionPrizeFundPctLabel', pf + ' %');
    set('divisionFirstOrgPctLabel', o1 + ' %');
    set('divisionSecondOrgPctLabel', o2 + ' %');
    set('divisionPrizeFundDollarLabel', pf + ' $');
    set('divisionFirstOrgDollarLabel', o1 + ' $');
    set('divisionSecondOrgDollarLabel', o2 + ' $');
    set('smartBuilderFirstOrgLabel', o1);
    set('smartBuilderSecondOrgLabel', o2);
    set('smartBuilderFirstOrgDollarLabel', o1);
    set('smartBuilderSecondOrgDollarLabel', o2);
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
    // Update first org card label on main page (Your organization / League)
    const firstOrgCardLabel = document.getElementById('firstOrgCardLabel');
    if (firstOrgCardLabel) {
        firstOrgCardLabel.textContent = firstOrganizationName || 'League Income';
    }

    // Update second organization label in financial breakdown card (Parent / National org)
    const secondOrgCardLabel = document.getElementById('secondOrgCardLabel');
    if (secondOrgCardLabel) {
        secondOrgCardLabel.textContent = secondOrganizationName || 'Parent/National Organization';
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
        const hexSpan = document.getElementById('divisionColorHex');
        if (hexSpan) hexSpan.textContent = colorInput.value;
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

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    wireLocalStorageModalActions();
    updateLocalStorageUiState();
    ensureLocalDataConsent();
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
        if (typeof checkProjectionAccess === 'function') checkProjectionAccess();
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
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    // Update branding when showing main app
    if (currentOperator) {
        updateAppBranding(currentOperator.organization_name || currentOperator.name || 'Duezy');
    }
    // Show/hide admin button based on admin status
    updateAdminButton();
    // Show Donate nav button only during "plans coming soon" period
    updateDonateNavVisibility();
    // Check pending approvals (show alert if admin with pending; hide if not admin)
    checkPendingApprovals();
    // Make sure clock is initialized when main app is shown
    updateLocalClock();
    // Auto-show Help guide on sign-in (unless "Don't show again" was checked)
    if (typeof shouldShowHelpOnSignIn === 'function' && shouldShowHelpOnSignIn() && typeof showHelpModal === 'function') {
        showHelpModal();
    }
}

// Base-path-aware URL for admin page (fixes 404 on live when app is under subpath)
function getAdminPageUrl() {
    const p = window.location.pathname;
    let base = p.replace(/\/index\.html$/i, '').replace(/\/?$/, '') || '/dues-tracker';
    if (!base.includes('dues-tracker')) base = '/dues-tracker';
    return window.location.origin + base + '/admin.html';
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

// Fetch count of league operators awaiting approval (admin-only)
async function fetchPendingApprovalsCount() {
    if (!currentOperator || currentOperator.is_admin !== true) return 0;
    try {
        const res = await apiCall('/admin/pending-accounts');
        if (!res.ok) return 0;
        const list = await res.json();
        return Array.isArray(list) ? list.length : 0;
    } catch (e) {
        console.warn('Failed to fetch pending approvals count:', e);
        return 0;
    }
}

// Show/hide pending-approvals alert and update count
function updatePendingApprovalsAlert(count) {
    const el = document.getElementById('pendingApprovalsAlert');
    const countEl = document.getElementById('pendingApprovalsCount');
    if (!el || !countEl) return;
    if (count > 0) {
        countEl.textContent = count;
        el.classList.remove('d-none');
    } else {
        el.classList.add('d-none');
    }
}

// Check pending approvals and update alert (call when admin is logged in)
async function checkPendingApprovals() {
    if (!currentOperator || currentOperator.is_admin !== true) {
        updatePendingApprovalsAlert(0);
        if (pendingApprovalsIntervalId) {
            clearInterval(pendingApprovalsIntervalId);
            pendingApprovalsIntervalId = null;
        }
        return;
    }
    const count = await fetchPendingApprovalsCount();
    updatePendingApprovalsAlert(count);
    if (!pendingApprovalsIntervalId) {
        pendingApprovalsIntervalId = setInterval(checkPendingApprovals, 90000); // refresh every 90s
    }
}

// Show/hide Donate nav button during "plans coming soon" period only
function updateDonateNavVisibility() {
    const btn = document.getElementById('donateNavBtn');
    if (!btn) return;
    btn.style.display = typeof isPlansComingSoon === 'function' && isPlansComingSoon() ? 'inline-block' : 'none';
}

// Helper: set loading state on form submit button
function setFormSubmitLoading(formId, loading, loadingText = 'Processing...') {
    const form = document.getElementById(formId);
    const btn = form ? form.querySelector('button[type="submit"]') : null;
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>${loadingText}`;
    } else {
        btn.disabled = false;
        if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
}

// Login form handler - supports both new multi-tenant login and legacy admin login
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.classList.add('hidden'); // Hide previous errors
    setFormSubmitLoading('loginForm', true, 'Logging in...');
    
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
            setFormSubmitLoading('loginForm', false);
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
                setFormSubmitLoading('loginForm', false);
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
                window.currentOperator = currentOperator;
                mergePreservedOperatorFields(currentOperator);
                localStorage.setItem('currentOperator', JSON.stringify(currentOperator));
                updateAppBranding(data.operator.organization_name || data.operator.name || 'Duezy');
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
    } finally {
        setFormSubmitLoading('loginForm', false);
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
            
            setFormSubmitLoading('registerForm', true, 'Creating account...');
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
                            window.currentOperator = currentOperator;
                            mergePreservedOperatorFields(currentOperator);
                            localStorage.setItem('currentOperator', JSON.stringify(currentOperator));
                            updateAppBranding(data.operator.organization_name || data.operator.name || 'Duezy');
                            updateSanctionFeeSettings();
                            if (typeof updateGreenFeeSettings === 'function') updateGreenFeeSettings();
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
            } finally {
                setFormSubmitLoading('registerForm', false);
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
            
            setFormSubmitLoading('forgotPasswordForm', true, 'Sending...');
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
            } finally {
                setFormSubmitLoading('forgotPasswordForm', false);
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
            
            setFormSubmitLoading('resetPasswordForm', true, 'Resetting...');
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
            } finally {
                setFormSubmitLoading('resetPasswordForm', false);
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

// Google OAuth Sign Up (same as sign in for OAuth)
async function signUpWithGoogle() {
    await signInWithGoogle(); // OAuth sign up and sign in are the same
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
    const method = (options.method || 'GET').toUpperCase();
    const canUseLocalCache = method === 'GET' && isLocalDataEnabled();
    const cacheKey = `${getLocalCacheNamespace()}${fullEndpoint}`;
    
    // Debug logging for API calls
    console.log(`API Call: ${fullEndpoint}`, {
        method: options.method || 'GET',
        hasAuth: !!authToken,
        headers: defaultOptions.headers
    });
    
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${fullEndpoint}`, {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers }
        });
    } catch (networkError) {
        if (canUseLocalCache) {
            const cachedData = readLocalCache(cacheKey);
            if (cachedData !== null) {
                console.warn(`⚠️ Using local cached response for ${fullEndpoint}`);
                return new Response(JSON.stringify(cachedData), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Duezy-Local-Cache': 'HIT'
                    }
                });
            }
        }
        throw networkError;
    }
    
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

    if (canUseLocalCache && response.ok) {
        try {
            const cloned = response.clone();
            const data = await cloned.json();
            writeLocalCache(cacheKey, data);
        } catch (_) {
            // Ignore non-JSON responses for local cache.
        }
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
                window.currentOperator = currentOperator;
                mergePreservedOperatorFields(currentOperator);
                localStorage.setItem('currentOperator', JSON.stringify(currentOperator));
                updateAppBranding(data.operator.organization_name || data.operator.name || 'Duezy');
                updateSanctionFeeSettings(); // This also calls updateSanctionFeeLabels()
                if (typeof updateGreenFeeSettings === 'function') updateGreenFeeSettings();
                updateFinancialBreakdownSettings();
                updateAdminButton(); // Update admin button visibility
                if (data.operator.is_admin === true) {
                    checkPendingApprovals();
                }

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
            if (typeof updateDivisionSpecificSummary === 'function') updateDivisionSpecificSummary(null);
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
        divisions = divisions || [];
        if (typeof updateDivisionSpecificSummary === 'function') updateDivisionSpecificSummary(null);
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

