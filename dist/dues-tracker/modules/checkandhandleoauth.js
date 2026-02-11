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
