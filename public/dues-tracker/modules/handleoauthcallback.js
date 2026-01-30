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
