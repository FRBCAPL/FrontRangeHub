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

// Open Settings modal on Subscription/Donate tab (used by Donate nav button)
function showDonateModal() {
    showProfileModal();
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    const once = function () {
        modal.removeEventListener('shown.bs.modal', once);
        if (typeof switchProfileSettingsTab === 'function') {
            switchProfileSettingsTab('subscription-pane');
        }
    };
    modal.addEventListener('shown.bs.modal', once);
}

// Show Donate nav button only during "plans coming soon" period
function updateDonateNavVisibility() {
    const btn = document.getElementById('donateNavBtn');
    if (!btn) return;
    btn.style.display = typeof isPlansComingSoon === 'function' && isPlansComingSoon() ? 'inline-block' : 'none';
}

function logout() {
    if (pendingApprovalsIntervalId) {
        clearInterval(pendingApprovalsIntervalId);
        pendingApprovalsIntervalId = null;
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentOperator');
    authToken = null;
    currentOperator = null;
    showLoginScreen();
}

// Update app branding based on organization name
function updateAppBranding(organizationName) {
    const displayName = organizationName || 'Duezy';
    const fullTitle = organizationName ? `Duezy for ${organizationName}` : 'Duezy – League dues, sorted.';
    
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
        loginTitle.textContent = 'Duezy';
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
                            updateAppBranding(data.operator.organization_name || data.operator.name || 'Duezy');
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
            updateAppBranding(data.operator.organization_name || data.operator.name || 'Duezy');
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
                updateAppBranding(data.operator.organization_name || data.operator.name || 'Duezy');
                updateSanctionFeeSettings(); // This also calls updateSanctionFeeLabels()
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
