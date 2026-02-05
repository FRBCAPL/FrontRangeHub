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
            window.currentOperator = currentOperator;
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
